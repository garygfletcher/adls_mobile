import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { ApiMerchandiseItem, fetchMerchandise, submitShopCheckout, toAbsoluteAssetUrl } from '@/services/publicApi';

type Product = {
  id: string;
  name: string;
  price: number;
  sizes?: string[];
  colors?: string[];
  note?: string;
  category?: string;
  imageUrl?: string;
  accessLevel?: string;
  sortOrder?: number;
};

type CartItem = {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  size?: string;
  color?: string;
};

const buildItemKey = (productId: string, size?: string, color?: string) => `${productId}|${size ?? ''}|${color ?? ''}`;
const isMembersOnlyProduct = (product: Product) => product.accessLevel === 'member';
const hasOwnerMemberShopAccess = (userType?: string | null) => {
  const normalized = userType?.trim().toLowerCase();
  if (!normalized) return true;
  return !['associate', 'associate_member', 'associate-member'].includes(normalized);
};
const GUEST_SESSION_STORAGE_KEY = 'adls.shop.guest_session_id';
const CHECKOUT_CART_STORAGE_KEY = 'adls.shop.checkout_cart';

function buildMissingCheckoutFieldsMessage(fields: string[]) {
  if (fields.length === 1) {
    return `Please complete the ${fields[0]} field.`;
  }

  if (fields.length === 2) {
    return `Please complete these checkout fields: ${fields[0]} and ${fields[1]}.`;
  }

  return `Please complete these checkout fields: ${fields.slice(0, -1).join(', ')}, and ${fields[fields.length - 1]}.`;
}

function parseOptionList(description: string | null | undefined, label: 'size' | 'sizes' | 'colour' | 'colours' | 'color' | 'colors') {
  if (!description) return [] as string[];
  const normalized = description.replace(/[’']/g, "'");
  const regex = new RegExp(`${label}\\s*:\\s*([^\\.]+)`, 'i');
  const match = normalized.match(regex);
  if (!match?.[1]) return [] as string[];

  return match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseProductOptions(description: string | null | undefined) {
  const sizes = parseOptionList(description, 'sizes');
  const colours = parseOptionList(description, 'colours');
  const colors = parseOptionList(description, 'colors');
  const colour = parseOptionList(description, 'colour');
  const color = parseOptionList(description, 'color');

  const mergedColors = [...colours, ...colors, ...colour, ...color];

  return {
    sizes: sizes.length > 0 ? [...new Set(sizes)] : undefined,
    colors: mergedColors.length > 0 ? [...new Set(mergedColors)] : undefined,
  };
}

function ShopCard({
  product,
  canPurchase,
  onAdd,
  onPreviewImage,
}: {
  product: Product;
  canPurchase: boolean;
  onAdd: (product: Product, quantity: number, size?: string, color?: string) => void;
  onPreviewImage: (imageUrl?: string) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]);

  const lineTotal = useMemo(() => quantity * product.price, [quantity, product.price]);

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onPreviewImage(product.imageUrl)}>
        <Image
          source={product.imageUrl ? { uri: product.imageUrl } : require('../../assets/images/shop-placeholder.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </Pressable>
      <View style={styles.itemHeader}>
        <Ionicons name="bag-handle" size={18} color="#153D5D" />
        <Text style={styles.itemName}>{product.name}</Text>
      </View>
      <Text style={styles.price}>{product.price > 0 ? `£${product.price.toFixed(2)}` : 'Price on request'}</Text>
      {product.note ? <Text style={styles.productNote}>{product.note}</Text> : null}
      {product.category ? <Text style={styles.productCategory}>{product.category}</Text> : null}

      {canPurchase && product.price > 0 && product.sizes ? (
        <View style={styles.optionRow}>
          {product.sizes.map((size) => (
            <Pressable
              key={size}
              style={[styles.optionChip, selectedSize === size && styles.optionChipActive]}
              onPress={() => setSelectedSize(size)}>
              <Text style={[styles.optionText, selectedSize === size && styles.optionTextActive]}>{size}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {canPurchase && product.price > 0 && product.colors ? (
        <View style={styles.optionRow}>
          {product.colors.map((color) => (
            <Pressable
              key={color}
              style={[styles.optionChip, selectedColor === color && styles.optionChipActive]}
              onPress={() => setSelectedColor(color)}>
              <Text style={[styles.optionText, selectedColor === color && styles.optionTextActive]}>
                {color}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {canPurchase && product.price > 0 ? (
        <View style={styles.quantityRow}>
          <Pressable style={styles.qtyButton} onPress={() => setQuantity((value) => Math.max(1, value - 1))}>
            <Text style={styles.qtyText}>-</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <Pressable style={styles.qtyButton} onPress={() => setQuantity((value) => value + 1)}>
            <Text style={styles.qtyText}>+</Text>
          </Pressable>
        </View>
      ) : null}

      {canPurchase && product.price > 0 ? (
        <Pressable
          style={styles.addButton}
          onPress={() => onAdd(product, quantity, selectedSize, selectedColor)}>
          <Text style={styles.addButtonText}>Add to cart (£{lineTotal.toFixed(2)})</Text>
        </Pressable>
      ) : null}
      {!canPurchase ? (
        <Text style={styles.memberRestrictedText}>This item is only for members. Please sign in with an eligible account.</Text>
      ) : null}
    </View>
  );
}

export default function ShopScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const listRef = useRef<FlatList<Product>>(null);
  useScrollToTop(listRef);
  const { authLoading, isAuthenticated, authUser, authToken, logout } = useAuth();
  const canAccessRestrictedProducts = isAuthenticated && hasOwnerMemberShopAccess(authUser?.user_type);
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;
  const numColumns = isTablet ? 2 : 1;

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showAddedModal, setShowAddedModal] = useState(false);
  const [addedMessage, setAddedMessage] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPostcode, setDeliveryPostcode] = useState('');
  const [postage, setPostage] = useState<'small' | 'large' | 'included'>('small');
  const [agreement, setAgreement] = useState(false);

  useEffect(() => {
    if (!showCheckoutForm || !isAuthenticated) return;
    if (!contactName.trim() && authUser?.name) {
      setContactName(authUser.name);
    }
    if (!contactEmail.trim() && authUser?.email) {
      setContactEmail(authUser.email);
    }
  }, [showCheckoutForm, isAuthenticated, authUser, contactName, contactEmail]);

  const cartCount = useMemo(
    () => cartItems.reduce((runningCount, item) => runningCount + item.quantity, 0),
    [cartItems],
  );

  const cartTotal = useMemo(
    () => cartItems.reduce((runningTotal, item) => runningTotal + item.unitPrice * item.quantity, 0),
    [cartItems],
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHECKOUT_CART_STORAGE_KEY);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as CartItem[];
        if (!Array.isArray(parsed)) return;
        const normalized = parsed.filter((item) => {
          if (!item || typeof item !== 'object') return false;
          if (!item.key || typeof item.key !== 'string') return false;
          if (!item.productId || typeof item.productId !== 'string') return false;
          if (!item.name || typeof item.name !== 'string') return false;
          if (typeof item.unitPrice !== 'number') return false;
          if (typeof item.quantity !== 'number' || item.quantity <= 0) return false;
          return true;
        });
        setCartItems(normalized);
      } catch {
        // Ignore invalid persisted cart payloads.
      } finally {
        if (mounted) setCartHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    AsyncStorage.setItem(CHECKOUT_CART_STORAGE_KEY, JSON.stringify(cartItems)).catch(() => {
      // Keep shopping usable if local persistence fails.
    });
  }, [cartHydrated, cartItems]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setProductsLoading(true);
      setProductsError(null);

      (async () => {
        try {
          const response = await fetchMerchandise();
          if (!mounted) return;

          const mapped = response.map((item: ApiMerchandiseItem) => ({
            ...parseProductOptions(item.description),
            id: String(item.id),
            name: item.name,
            price: Number(item.price ?? 0),
            note: item.description ?? undefined,
            category: item.category,
            imageUrl: toAbsoluteAssetUrl(item.image_path) ?? undefined,
            accessLevel: item.access_level,
            sortOrder: item.sort_order,
          }));
          const accessSortValue = (value?: string) => {
            if (value === 'member') return 0;
            if (value === 'all') return 1;
            return 2;
          };

          mapped.sort((a, b) => {
            const byAccess = accessSortValue(a.accessLevel) - accessSortValue(b.accessLevel);
            if (byAccess !== 0) return byAccess;
            const bySort = (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);
            if (bySort !== 0) return bySort;
            return a.name.localeCompare(b.name);
          });

          setProducts(mapped);
        } catch {
          if (!mounted) return;
          setProductsError('Unable to load merchandise .');
        } finally {
          if (mounted) setProductsLoading(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, []),
  );

  const addToCart = (product: Product, quantity: number, size?: string, color?: string) => {
    const key = buildItemKey(product.id, size, color);

    setCartItems((current) => {
      const existing = current.find((item) => item.key === key);

      if (!existing) {
        return [
          ...current,
          {
            key,
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            quantity,
            size,
            color,
          },
        ];
      }

      return current.map((item) =>
        item.key === key ? { ...item, quantity: item.quantity + quantity } : item,
      );
    });

    const attributes = [size ? `Size ${size}` : null, color ? `Color ${color}` : null]
      .filter(Boolean)
      .join(' • ');
    const details = attributes ? `\n${attributes}` : '';
    setAddedMessage(`${quantity} x ${product.name}${details}`);
    setShowAddedModal(true);
  };

  const incrementItem = (key: string) => {
    setCartItems((current) =>
      current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  };

  const decrementItem = (key: string) => {
    setCartItems((current) =>
      current
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => setCartItems([]);

  const proceedToCheckout = (reference?: string) => {
    setShowCheckoutForm(false);
    clearCart();
    setTimeout(() => {
      if (reference) {
        router.push({ pathname: '/checkout', params: { reference } });
        return;
      }
      router.push('/checkout');
    }, 250);
  };

  const getOrCreateGuestSessionId = async () => {
    const existing = await AsyncStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (existing) return existing;

    const generated = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(GUEST_SESSION_STORAGE_KEY, generated);
    return generated;
  };

  const checkout = async () => {
    if (cartItems.length === 0) return;
    if (authLoading) return;
    setShowCart(false);
    setTimeout(() => {
      router.push('/shop-checkout');
    }, 200);
  };

  const previewImage = (imageUrl?: string) => {
    if (!imageUrl) return;
    setPreviewImageUrl(imageUrl);
  };

  const submitCheckout = async () => {
    const missingFields = [
      !contactName.trim() ? 'contact name' : null,
      !contactPhone.trim() ? 'contact phone' : null,
      !contactEmail.trim() ? 'contact email' : null,
      !deliveryAddress.trim() ? 'delivery address' : null,
      !deliveryPostcode.trim() ? 'delivery postcode' : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      const message = buildMissingCheckoutFieldsMessage(missingFields);
      setCheckoutError(message);
      Alert.alert('Checkout', message);
      return;
    }
    if (!agreement) {
      const message = 'Please confirm agreement before submitting.';
      setCheckoutError(message);
      Alert.alert('Checkout', message);
      return;
    }

    setCheckoutSubmitting(true);
    setCheckoutError(null);

    try {
      const guestSessionId = isAuthenticated ? null : await getOrCreateGuestSessionId();
      const response = await submitShopCheckout({
        bearerToken: isAuthenticated ? authToken : null,
        guestSessionId,
        payload: {
          guest_session_id: guestSessionId ?? undefined,
          postage,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          delivery_address: deliveryAddress.trim(),
          delivery_postcode: deliveryPostcode.trim(),
          agreement,
        },
      });

      proceedToCheckout(response.data.reference);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit checkout.';
      if (message.toLowerCase().includes('basket is empty')) {
        const basketMessage = 'Unable to submit order: your server basket is empty.';
        setCheckoutError(basketMessage);
        Alert.alert('Checkout', basketMessage);
      } else {
        setCheckoutError(message);
        Alert.alert('Checkout', message);
      }
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable style={styles.headerButton} onPress={() => setShowCart(true)}>
            <Ionicons name="cart-outline" size={21} color="#0E4A72" />
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
          {isAuthenticated ? (
            <Pressable style={styles.headerButton} onPress={() => void logout()}>
              <Ionicons name="log-out-outline" size={21} color="#0E4A72" />
            </Pressable>
          ) : null}
        </View>
      ),
    });
  }, [navigation, cartCount, isAuthenticated, logout]);

  return (
    <>
      <FlatList
        ref={listRef}
        data={products}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={numColumns > 1 ? styles.columns : undefined}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ShopCard
              product={item}
              canPurchase={!isMembersOnlyProduct(item) || canAccessRestrictedProducts}
              onAdd={addToCart}
              onPreviewImage={previewImage}
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ADLS Shop</Text>
            <Text style={styles.headerSub}>Merchandise loaded from the ADLS source.</Text>
            {productsLoading ? <Text style={styles.statusText}>Loading products...</Text> : null}
            {productsError ? <Text style={styles.errorText}>{productsError}</Text> : null}
          </View>
        }
      />

      <View style={styles.bottomCheckoutBar}>
        <Pressable
          style={[styles.bottomCheckoutButton, cartItems.length === 0 && styles.checkoutButtonDisabled]}
          onPress={() => setShowCart(true)}
          disabled={cartItems.length === 0 || authLoading}>
          <Text style={styles.bottomCheckoutText}>
            {cartItems.length > 0 ? `Checkout (${cartCount})` : 'Checkout'}
          </Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        visible={Boolean(previewImageUrl)}
        onRequestClose={() => setPreviewImageUrl(null)}
        transparent>
        <View style={styles.previewOverlay}>
          <Pressable style={styles.previewBackdrop} onPress={() => setPreviewImageUrl(null)} />
          <View style={styles.previewCard}>
            <Pressable style={styles.previewClose} onPress={() => setPreviewImageUrl(null)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            {previewImageUrl ? (
              <Image source={{ uri: previewImageUrl }} style={styles.previewImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" visible={showCart} onRequestClose={() => setShowCart(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cart</Text>
            <Pressable onPress={() => setShowCart(false)}>
              <Ionicons name="close" size={24} color="#0E2E4A" />
            </Pressable>
          </View>

          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.cartList}
            renderItem={({ item }) => (
              <View style={styles.cartItemCard}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemMeta}>
                  {item.size ? `Size: ${item.size}  ` : ''}
                  {item.color ? `Color: ${item.color}` : ''}
                </Text>
                <Text style={styles.cartItemPrice}>£{(item.unitPrice * item.quantity).toFixed(2)}</Text>

                <View style={styles.cartQtyRow}>
                  <Pressable style={styles.qtyButton} onPress={() => decrementItem(item.key)}>
                    <Text style={styles.qtyText}>-</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <Pressable style={styles.qtyButton} onPress={() => incrementItem(item.key)}>
                    <Text style={styles.qtyText}>+</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyCart}>Your cart is empty.</Text>}
          />

          <View style={styles.modalFooter}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>£{cartTotal.toFixed(2)}</Text>
            <View style={styles.footerButtons}>
              <Pressable style={styles.clearButton} onPress={clearCart}>
                <Text style={styles.clearText}>Clear Cart</Text>
              </Pressable>
              <Pressable
                style={[styles.checkoutButton, cartItems.length === 0 && styles.checkoutButtonDisabled]}
                onPress={checkout}
                disabled={cartItems.length === 0}>
                <Text style={styles.checkoutText}>Checkout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        visible={showCheckoutForm}
        onRequestClose={() => setShowCheckoutForm(false)}
        transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}>
          <View style={styles.loginOverlay}>
            <View style={styles.loginCard}>
              <Text style={styles.loginTitle}>Checkout Details</Text>
              <Text style={styles.loginSubTitle}>
                {isAuthenticated ? 'Submitting as member account.' : 'Submitting as guest checkout.'}
              </Text>

              <ScrollView style={styles.checkoutFormScroll} contentContainerStyle={styles.checkoutFormContent} keyboardShouldPersistTaps="handled">
                <TextInput
                  value={contactName}
                  onChangeText={setContactName}
                  autoCapitalize="words"
                  placeholder="Contact name"
                  style={styles.input}
                />
                <TextInput
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                  placeholder="Contact phone"
                  style={styles.input}
                />
                <TextInput
                  value={contactEmail}
                  onChangeText={setContactEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Contact email"
                  style={styles.input}
                />
                <TextInput
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Delivery address"
                  multiline
                  style={[styles.input, styles.addressInput]}
                />
                <TextInput
                  value={deliveryPostcode}
                  onChangeText={setDeliveryPostcode}
                  autoCapitalize="characters"
                  placeholder="Delivery postcode"
                  style={styles.input}
                />

                <Text style={styles.formLabel}>Postage</Text>
                <View style={styles.optionRow}>
                  {(['small', 'large', 'included'] as const).map((value) => (
                    <Pressable
                      key={value}
                      style={[styles.optionChip, postage === value && styles.optionChipActive]}
                      onPress={() => setPostage(value)}>
                      <Text style={[styles.optionText, postage === value && styles.optionTextActive]}>
                        {value.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable style={styles.agreementRow} onPress={() => setAgreement((current) => !current)}>
                  <View style={[styles.checkbox, agreement && styles.checkboxChecked]} />
                  <Text style={styles.agreementText}>I have read and agree to the Terms and Conditions for service.</Text>
                </Pressable>

                {checkoutError ? <Text style={styles.loginError}>{checkoutError}</Text> : null}
              </ScrollView>

              <View style={styles.loginButtons}>
                <Pressable style={styles.cancelButton} onPress={() => setShowCheckoutForm(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.loginButton, checkoutSubmitting && styles.loginButtonDisabled]}
                  onPress={() => void submitCheckout()}
                  disabled={checkoutSubmitting}>
                  <Text style={styles.loginButtonText}>{checkoutSubmitting ? 'Submitting...' : 'Submit Order'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        visible={showAddedModal}
        onRequestClose={() => setShowAddedModal(false)}
        transparent>
        <View style={styles.loginOverlay}>
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Added to Cart</Text>
            <Text style={styles.loginSubTitle}>{addedMessage}</Text>
            <Pressable style={styles.loginButtonSingle} onPress={() => setShowAddedModal(false)}>
              <Text style={styles.loginButtonText}>Continue Shopping</Text>
            </Pressable>
            <Pressable
              style={styles.checkoutNowButton}
              onPress={() => {
                setShowAddedModal(false);
                setTimeout(() => {
                  setShowCart(true);
                }, 100);
              }}>
              <Text style={styles.checkoutNowText}>Checkout</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    backgroundColor: '#F4F8FB',
    padding: 16,
    paddingBottom: 96,
    gap: 14,
  },
  columns: {
    gap: 14,
  },
  cardWrap: {
    flex: 1,
    marginBottom: 14,
  },
  header: {
    marginBottom: 4,
  },
  headerTitle: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  headerSub: {
    marginTop: 5,
    color: '#46627A',
    fontSize: 14,
    lineHeight: 20,
  },
  statusText: {
    marginTop: 6,
    color: '#0E4A72',
    fontSize: 13,
  },
  errorText: {
    marginTop: 6,
    color: '#B00020',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 14,
  },
  image: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#F6FAFD',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemName: {
    color: '#153D5D',
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
  },
  price: {
    marginTop: 4,
    color: '#1A557F',
    fontWeight: '700',
    fontSize: 16,
  },
  productNote: {
    marginTop: 4,
    color: '#45657D',
    fontSize: 13,
    lineHeight: 18,
  },
  productCategory: {
    marginTop: 6,
    color: '#244F6D',
    fontSize: 12,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#B9CAD9',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  optionChipActive: {
    backgroundColor: '#0E4A72',
    borderColor: '#0E4A72',
  },
  optionText: {
    color: '#2D4F66',
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFF',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E8F0F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: '#0E4A72',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  },
  qtyValue: {
    color: '#1A425F',
    fontWeight: '700',
    fontSize: 16,
  },
  addButton: {
    marginTop: 12,
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  memberRestrictedText: {
    marginTop: 10,
    color: '#A12727',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 12,
  },
  headerButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F4F8FB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 58,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D8E2EC',
  },
  modalTitle: {
    color: '#0E2E4A',
    fontSize: 22,
    fontWeight: '700',
  },
  cartList: {
    padding: 16,
    gap: 10,
  },
  cartItemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8E2EC',
  },
  cartItemName: {
    color: '#143A5A',
    fontWeight: '700',
    fontSize: 15,
  },
  cartItemMeta: {
    marginTop: 4,
    color: '#5D7388',
    fontSize: 13,
  },
  cartItemPrice: {
    marginTop: 6,
    color: '#0F517A',
    fontWeight: '700',
    fontSize: 15,
  },
  cartQtyRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCart: {
    color: '#5A7388',
    textAlign: 'center',
    marginTop: 14,
  },
  modalFooter: {
    marginTop: 'auto',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#D8E2EC',
    padding: 16,
  },
  totalLabel: {
    color: '#355A74',
    fontSize: 14,
  },
  totalValue: {
    marginTop: 2,
    color: '#0D3E60',
    fontSize: 24,
    fontWeight: '700',
  },
  footerButtons: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#E8F0F7',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  clearText: {
    color: '#1A425F',
    fontWeight: '700',
  },
  checkoutButton: {
    flex: 1,
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#8EA6BA',
  },
  checkoutText: {
    color: '#FFF',
    fontWeight: '700',
  },
  loginOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  keyboardWrap: {
    flex: 1,
  },
  loginCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderColor: '#D8E2EC',
    borderWidth: 1,
    maxHeight: '88%',
  },
  loginTitle: {
    color: '#0E2E4A',
    fontSize: 20,
    fontWeight: '700',
  },
  loginSubTitle: {
    marginTop: 4,
    marginBottom: 12,
    color: '#46627A',
  },
  checkoutFormScroll: {
    flexGrow: 0,
  },
  checkoutFormContent: {
    paddingBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C9D6E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  addressInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  formLabel: {
    color: '#46627A',
    fontWeight: '700',
    marginBottom: 8,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#7A93A8',
    borderRadius: 4,
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#0E4A72',
    borderColor: '#0E4A72',
  },
  agreementText: {
    flex: 1,
    color: '#46627A',
    fontSize: 12,
    lineHeight: 18,
  },
  loginError: {
    color: '#B00020',
    marginBottom: 8,
  },
  loginButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E8F0F7',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: '#1A425F',
    fontWeight: '700',
  },
  loginButton: {
    flex: 1,
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#8EA6BA',
  },
  loginButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  loginButtonSingle: {
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkoutNowButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0E4A72',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  checkoutNowText: {
    color: '#0E4A72',
    fontWeight: '700',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewCard: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
  },
  previewClose: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 420,
    borderRadius: 12,
    backgroundColor: '#0A0A0A',
  },
  bottomCheckoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#D8E2EC',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bottomCheckoutButton: {
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  bottomCheckoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
