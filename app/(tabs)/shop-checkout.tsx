import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { fetchDashboardSummary, readCachedDashboardSummary } from '@/services/dashboardApi';
import { fetchMerchandise, submitShopCheckout } from '@/services/publicApi';

const CHECKOUT_CART_STORAGE_KEY = 'adls.shop.checkout_cart';
const CHECKOUT_FORM_STORAGE_KEY = 'adls.shop.checkout_form';

type CheckoutCartItem = {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  size?: string;
  color?: string;
};

type PersistedCheckoutForm = {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  deliveryAddress: string;
  deliveryPostcode: string;
  postage: 'small' | 'large' | 'included';
  agreement: boolean;
};

type MemberCheckoutDetails = {
  phone: string;
  email: string;
  address: string;
  postcode: string;
};

function hasOwnerMemberShopAccess(userType?: string | null) {
  const normalized = userType?.trim().toLowerCase();
  if (!normalized) return true;
  return !['associate', 'associate_member', 'associate-member'].includes(normalized);
}

function readStringRecordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function extractMemberCheckoutDetails(source: unknown): MemberCheckoutDetails | null {
  if (!source || typeof source !== 'object') return null;
  const record = source as Record<string, unknown>;

  const phone = readStringRecordValue(record, ['contact_phone', 'phone', 'phone_number', 'telephone', 'mobile']);
  const email = readStringRecordValue(record, ['contact_email', 'email']);
  const postcode = readStringRecordValue(record, ['delivery_postcode', 'postcode', 'post_code', 'zip']);
  const address = readStringRecordValue(record, [
    'delivery_address',
    'address',
    'postal_address',
    'full_address',
    'address_line_1',
  ]);

  const addressLine1 = readStringRecordValue(record, ['address_line_1', 'line_1']);
  const addressLine2 = readStringRecordValue(record, ['address_line_2', 'line_2']);
  const city = readStringRecordValue(record, ['city', 'town']);
  const county = readStringRecordValue(record, ['county', 'state']);
  const composedAddress = [addressLine1, addressLine2, city, county].filter(Boolean).join(', ');

  const normalized = {
    phone,
    email,
    address: address || composedAddress,
    postcode,
  };

  if (!normalized.phone && !normalized.email && !normalized.address && !normalized.postcode) {
    return null;
  }

  return normalized;
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

function productRequiresSize(description: string | null | undefined) {
  const sizes = parseOptionList(description, 'sizes');
  return sizes.length > 0;
}

function productRequiresColor(description: string | null | undefined) {
  const colours = parseOptionList(description, 'colours');
  const colors = parseOptionList(description, 'colors');
  const colour = parseOptionList(description, 'colour');
  const color = parseOptionList(description, 'color');
  return [...colours, ...colors, ...colour, ...color].length > 0;
}

function isValidPhoneNumber(value: string) {
  const digitsOnly = value.replace(/\D/g, '');
  return digitsOnly.length >= 10;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildMissingCheckoutFieldsMessage(fields: string[]) {
  if (fields.length === 1) {
    return `Please complete the ${fields[0]} field.`;
  }

  if (fields.length === 2) {
    return `Please complete these checkout fields: ${fields[0]} and ${fields[1]}.`;
  }

  return `Please complete these checkout fields: ${fields.slice(0, -1).join(', ')}, and ${fields[fields.length - 1]}.`;
}

function resolveCheckoutField(primary: string | null | undefined, fallback: string) {
  return primary?.trim() ? primary : fallback;
}

export default function ShopCheckoutScreen() {
  const router = useRouter();
  const { isAuthenticated, authUser, authToken } = useAuth();
  const canAccessRestrictedProducts = isAuthenticated && hasOwnerMemberShopAccess(authUser?.user_type);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPostcode, setDeliveryPostcode] = useState('');
  const [postage, setPostage] = useState<'small' | 'large' | 'included'>('small');
  const [agreement, setAgreement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CheckoutCartItem[]>([]);
  const [formHydrated, setFormHydrated] = useState(false);
  const [memberCheckoutDetails, setMemberCheckoutDetails] = useState<MemberCheckoutDetails | null>(null);

  const loadPersistedCheckoutForm = async () => {
    const raw = await AsyncStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
    if (!raw) return null as PersistedCheckoutForm | null;

    try {
      const parsed = JSON.parse(raw) as Partial<PersistedCheckoutForm>;
      const normalizedPostage =
        parsed.postage === 'small' || parsed.postage === 'large' || parsed.postage === 'included'
          ? parsed.postage
          : 'small';

      return {
        contactName: typeof parsed.contactName === 'string' ? parsed.contactName : '',
        contactPhone: typeof parsed.contactPhone === 'string' ? parsed.contactPhone : '',
        contactEmail: typeof parsed.contactEmail === 'string' ? parsed.contactEmail : '',
        deliveryAddress: typeof parsed.deliveryAddress === 'string' ? parsed.deliveryAddress : '',
        deliveryPostcode: typeof parsed.deliveryPostcode === 'string' ? parsed.deliveryPostcode : '',
        postage: normalizedPostage,
        agreement: Boolean(parsed.agreement),
      };
    } catch {
      return null as PersistedCheckoutForm | null;
    }
  };

  const normalizeCartItems = (raw: unknown) => {
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is CheckoutCartItem => {
      if (!item || typeof item !== 'object') return false;
      const maybeItem = item as Partial<CheckoutCartItem>;
      if (!maybeItem.productId || typeof maybeItem.productId !== 'string') return false;
      if (typeof maybeItem.quantity !== 'number' || maybeItem.quantity <= 0) return false;
      return true;
    });
  };

  const loadCartItemsFromStorage = async () => {
    const raw = await AsyncStorage.getItem(CHECKOUT_CART_STORAGE_KEY);
    if (!raw) return [] as CheckoutCartItem[];
    try {
      return normalizeCartItems(JSON.parse(raw));
    } catch {
      return [] as CheckoutCartItem[];
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!contactName.trim() && authUser?.name) setContactName(authUser.name);
    if (!memberCheckoutDetails?.email && !contactEmail.trim() && authUser?.email) setContactEmail(authUser.email);
  }, [isAuthenticated, authUser, contactName, contactEmail]);

  useEffect(() => {
    if (!isAuthenticated || !authToken) return;

    let mounted = true;

    const applyMemberDetails = (details: MemberCheckoutDetails | null) => {
      if (!mounted || !details) return;
      setMemberCheckoutDetails(details);
      if (details.phone.trim()) setContactPhone(details.phone);
      if (details.email.trim()) setContactEmail(details.email);
      if (details.address.trim()) setDeliveryAddress(details.address);
      if (details.postcode.trim()) setDeliveryPostcode(details.postcode);
    };

    (async () => {
      const cached = await readCachedDashboardSummary();
      if (cached) {
        applyMemberDetails(extractMemberCheckoutDetails(cached.user));
      }

      try {
        const summary = await fetchDashboardSummary(authToken);
        applyMemberDetails(extractMemberCheckoutDetails(summary.user));
      } catch {
        // Checkout remains usable with cached or manually entered values if the member refresh fails.
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, authToken]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const loaded = await loadCartItemsFromStorage();
      if (!mounted) return;
      setCartItems(loaded);

      const persistedForm = await loadPersistedCheckoutForm();
      if (!mounted) return;
      if (!persistedForm) {
        setFormHydrated(true);
        return;
      }

      if (!contactName.trim() && persistedForm.contactName) setContactName(persistedForm.contactName);
      if (!isAuthenticated && !contactPhone.trim() && persistedForm.contactPhone) setContactPhone(persistedForm.contactPhone);
      if (!isAuthenticated && !contactEmail.trim() && persistedForm.contactEmail) setContactEmail(persistedForm.contactEmail);
      if (!isAuthenticated && !deliveryAddress.trim() && persistedForm.deliveryAddress) setDeliveryAddress(persistedForm.deliveryAddress);
      if (!isAuthenticated && !deliveryPostcode.trim() && persistedForm.deliveryPostcode) setDeliveryPostcode(persistedForm.deliveryPostcode);
      setPostage(persistedForm.postage);
      setAgreement(persistedForm.agreement);
      setFormHydrated(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!formHydrated) return;
    const payload: PersistedCheckoutForm = {
      contactName,
      contactPhone: isAuthenticated ? resolveCheckoutField(memberCheckoutDetails?.phone, contactPhone) : contactPhone,
      contactEmail: isAuthenticated ? resolveCheckoutField(memberCheckoutDetails?.email, contactEmail) : contactEmail,
      deliveryAddress: isAuthenticated ? resolveCheckoutField(memberCheckoutDetails?.address, deliveryAddress) : deliveryAddress,
      deliveryPostcode: isAuthenticated
        ? resolveCheckoutField(memberCheckoutDetails?.postcode, deliveryPostcode)
        : deliveryPostcode,
      postage,
      agreement,
    };

    AsyncStorage.setItem(CHECKOUT_FORM_STORAGE_KEY, JSON.stringify(payload)).catch(() => {
      // Keep checkout usable if form persistence fails.
    });
  }, [formHydrated, contactName, contactPhone, contactEmail, deliveryAddress, deliveryPostcode, postage, agreement]);

  const submit = async () => {
    const liveCartItems = cartItems.length > 0 ? cartItems : await loadCartItemsFromStorage();
    if (liveCartItems.length === 0) {
      const message = 'Your basket is empty. Please add items before checkout.';
      setError(message);
      Alert.alert('Checkout', message);
      return;
    }
    if (liveCartItems !== cartItems) {
      setCartItems(liveCartItems);
    }

    const resolvedContactPhone = isAuthenticated
      ? resolveCheckoutField(memberCheckoutDetails?.phone, contactPhone)
      : contactPhone;
    const resolvedContactEmail = isAuthenticated
      ? resolveCheckoutField(memberCheckoutDetails?.email, contactEmail)
      : contactEmail;
    const resolvedDeliveryAddress = isAuthenticated
      ? resolveCheckoutField(memberCheckoutDetails?.address, deliveryAddress)
      : deliveryAddress;
    const resolvedDeliveryPostcode = isAuthenticated
      ? resolveCheckoutField(memberCheckoutDetails?.postcode, deliveryPostcode)
      : deliveryPostcode;

    const missingFields = [
      !contactName.trim() ? 'contact name' : null,
      !resolvedContactPhone.trim() ? 'contact phone' : null,
      !resolvedContactEmail.trim() ? 'contact email' : null,
      !resolvedDeliveryAddress.trim() ? 'delivery address' : null,
      !resolvedDeliveryPostcode.trim() ? 'delivery postcode' : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      const message = buildMissingCheckoutFieldsMessage(missingFields);
      setError(message);
      Alert.alert('Checkout', message);
      return;
    }
    if (!isValidPhoneNumber(resolvedContactPhone)) {
      const message = 'Please enter a valid phone number.';
      setError(message);
      Alert.alert('Checkout', message);
      return;
    }
    if (!isValidEmail(resolvedContactEmail)) {
      const message = 'Please enter a valid email address.';
      setError(message);
      Alert.alert('Checkout', message);
      return;
    }
    if (!agreement) {
      const message = 'Please confirm agreement before submitting.';
      setError(message);
      Alert.alert('Checkout', message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const merchandise = await fetchMerchandise();
      const merchandiseById = new Map(merchandise.map((item) => [String(item.id), item]));
      const restrictedProductIds = new Set<string>();
      let removedForMissingOptions = false;

      const sanitizedCartItems = liveCartItems.filter((item) => {
        const product = merchandiseById.get(item.productId);
        if (!product) return false;
        if (product.access_level === 'member' && !canAccessRestrictedProducts) {
          restrictedProductIds.add(item.productId);
          return false;
        }
        const priceValue = Number(product.price ?? 0);
        if (!Number.isFinite(priceValue) || priceValue <= 0) return false;
        if (product.is_bespoke) return false;
        if (productRequiresSize(product.description) && !item.size) {
          removedForMissingOptions = true;
          return false;
        }
        if (productRequiresColor(product.description) && !item.color) {
          removedForMissingOptions = true;
          return false;
        }
        return true;
      });

      if (sanitizedCartItems.length !== liveCartItems.length) {
        setCartItems(sanitizedCartItems);
        await AsyncStorage.setItem(CHECKOUT_CART_STORAGE_KEY, JSON.stringify(sanitizedCartItems));
      }

      if (restrictedProductIds.size > 0) {
        const message =
          'Some items are restricted to members and were removed from your basket. Please review your basket and submit again.';
        setError(message);
        Alert.alert('Checkout', message);
        return;
      }
      if (removedForMissingOptions) {
        const message =
          'Some items were removed because required size or color options were missing. Please re-add them from the shop.';
        setError(message);
        Alert.alert('Checkout', message);
        return;
      }

      const checkoutSource = sanitizedCartItems;
      const checkoutItems = checkoutSource
        .map((item) => ({
          merchandise_id: Number(item.productId),
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        }))
        .filter((item) => Number.isFinite(item.merchandise_id) && item.quantity > 0);

      if (checkoutItems.length === 0) {
        const message = 'Your basket is empty. Please add items before checkout.';
        setError(message);
        Alert.alert('Checkout', message);
        return;
      }

      const response = await submitShopCheckout({
        bearerToken: isAuthenticated ? authToken : null,
        payload: {
          postage,
          contact_name: contactName.trim(),
          contact_phone: resolvedContactPhone.trim(),
          contact_email: resolvedContactEmail.trim(),
          delivery_address: resolvedDeliveryAddress.trim(),
          delivery_postcode: resolvedDeliveryPostcode.trim(),
          agreement,
          items: checkoutItems,
        },
      });

      await AsyncStorage.removeItem(CHECKOUT_CART_STORAGE_KEY);
      router.replace({ pathname: '/checkout', params: { reference: response.data.reference } });
    } catch (submitError) {
      console.error('Checkout submit failed:', submitError);
      const message = submitError instanceof Error ? submitError.message : 'Unable to submit checkout.';
      setError(message);
      Alert.alert('Checkout', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Checkout Details</Text>
        <Text style={styles.subTitle}>
          {canAccessRestrictedProducts
            ? isAuthenticated
              ? 'Submitting as member account.'
              : 'Submitting as guest checkout.'
            : 'Submitting as signed-in account without owner-member shop access.'}
        </Text>
        <Text style={styles.subTitle}>Basket items: {cartItems.reduce((sum, item) => sum + item.quantity, 0)}</Text>

        <TextInput value={contactName} onChangeText={setContactName} autoCapitalize="words" placeholder="Contact name" style={styles.input} />
        <TextInput value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="Contact phone" style={styles.input} />
        <TextInput value={contactEmail} onChangeText={setContactEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Contact email" style={styles.input} />
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
              <Text style={[styles.optionText, postage === value && styles.optionTextActive]}>{value.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.agreementRow} onPress={() => setAgreement((current) => !current)}>
          <View style={[styles.checkbox, agreement && styles.checkboxChecked]} />
          <Text style={styles.agreementText}>I have read and agree to the Terms and Conditions for service.</Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.buttonRow}>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={() => void submit()}
            disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitText}>Submit Order</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F8FB',
  },
  container: {
    padding: 16,
    gap: 10,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  subTitle: {
    color: '#46627A',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C9D6E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  addressInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  formLabel: {
    color: '#46627A',
    fontWeight: '700',
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
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
  errorText: {
    color: '#B00020',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E8F0F7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: '#1A425F',
    fontWeight: '700',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#8EA6BA',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
