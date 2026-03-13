import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ApiGalleryImageItem, fetchGalleryImages } from '@/services/publicApi';

export default function ShipsGalleryScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [items, setItems] = useState<ApiGalleryImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await fetchGalleryImages();
        if (!mounted) return;
        setItems(response);
      } catch {
        if (!mounted) return;
        setError('Unable to load ship gallery .');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      ) : null}

      {error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!isLoading && !error ? (
        <FlatList
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.ship_name}-${index}`}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width, height }]}>
              <Image source={{ uri: item.image_url }} style={styles.slideImage} resizeMode="contain" />

              <View style={styles.captionWrap}>
                <Text style={styles.captionLead}>Here are some curated collections from uploaded images.</Text>
                {item.slug ? (
                  <Pressable
                    onPress={() => router.push(`/(tabs)/history/little-ship/${item.slug}`)}
                    style={styles.shipLinkButton}>
                    <Text style={styles.shipLinkText}>{item.ship_name}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                  </Pressable>
                ) : (
                  <Text style={styles.shipNameOnly}>{item.ship_name}</Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={[styles.centerState, { width, height }]}>
              <Text style={styles.errorText}>No gallery images available.</Text>
            </View>
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020B14',
  },
  backButton: {
    position: 'absolute',
    zIndex: 5,
    top: 48,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020B14',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  captionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: 'rgba(0,0,0,0.64)',
    gap: 8,
  },
  captionLead: {
    color: '#D6E6F4',
    fontSize: 13,
  },
  shipLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  shipLinkText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  shipNameOnly: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
