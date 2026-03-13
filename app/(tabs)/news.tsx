import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ApiNewsItem, fetchNews } from '@/services/publicApi';
import { useAuth } from '@/context/AuthContext';

type NewsListItem = {
  id: string;
  title: string;
  summary: string;
  date: string;
  imageUri?: string;
  fullStory?: string;
  membersOnlyRestricted: boolean;
};

function formatNewsDate(item: ApiNewsItem) {
  if (item.display_date && item.display_date.trim().length > 0) return item.display_date;
  if (item.date && item.date.trim().length > 0) return item.date;
  if (!item.published_at) return '';
  const parsed = new Date(item.published_at);
  if (Number.isNaN(parsed.getTime())) return item.published_at;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function NewsCardImage({ imageUri }: { imageUri?: string }) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [imageUri]);

  return (
    <Image
      source={imageUri && !hasFailed ? { uri: imageUri } : require('../../assets/images/icon.png')}
      style={styles.image}
      onError={() => setHasFailed(true)}
    />
  );
}

function parseBooleanValue(value: ApiNewsItem['members_only']) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return null;
}

export default function NewsScreen() {
  const { isAuthenticated } = useAuth();
  const listRef = useRef<FlatList<NewsListItem>>(null);
  useScrollToTop(listRef);
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;
  const numColumns = isTablet ? 2 : 1;
  const [items, setItems] = useState<NewsListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<NewsListItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setIsLoading(true);
      setError(null);

      (async () => {
        try {
          const response = await fetchNews();
          if (!mounted) return;
          const mapped = response.map((item) => ({
            id: String(item.id),
            title: item.title,
            summary: item.summary || item.detail || item.body || '-',
            date: formatNewsDate(item),
            imageUri: item.image_path ?? undefined,
            fullStory: item.full_story || item.full_news_story || item.editorial || item.body || undefined,
            membersOnlyRestricted: parseBooleanValue(item.members_only) === false,
          }));
          setItems(mapped);
        } catch {
          if (!mounted) return;
          setError('Unable to load news stories .');
          setItems([]);
        } finally {
          if (mounted) setIsLoading(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <>
      <FlatList
        ref={listRef}
        data={items}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={numColumns > 1 ? styles.columns : undefined}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <NewsCardImage imageUri={item.imageUri} />
              <View style={styles.titleRow}>
                <Ionicons name="newspaper" size={20} color="#123B5B" />
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Text style={styles.cardSummary}>{item.summary}</Text>
              {item.date ? <Text style={styles.cardDate}>{item.date}</Text> : null}
              {item.membersOnlyRestricted && !isAuthenticated ? (
                <Text style={styles.membersOnlyText}>
                  This story is for association members only, please login to view
                </Text>
              ) : item.fullStory ? (
                <Pressable style={styles.readMoreButton} onPress={() => setSelectedStory(item)}>
                  <Text style={styles.readMoreButtonText}>Read Full Story</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>News</Text>
            <Text style={styles.headerSub}>Latest ADLS announcements and member updates.</Text>
            {isLoading ? <ActivityIndicator size="small" color="#0E4A72" style={styles.loading} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <Text style={styles.emptyText}>No news stories available.</Text> : null}
      />
      <Modal
        animationType="slide"
        visible={Boolean(selectedStory)}
        onRequestClose={() => setSelectedStory(null)}
        transparent>
        <View style={styles.storyModalOverlay}>
          <View style={styles.storyModalCard}>
            <View style={styles.storyModalHeader}>
              <Text style={styles.storyModalTitle}>{selectedStory?.title ?? 'News Story'}</Text>
              <Pressable onPress={() => setSelectedStory(null)} style={styles.storyModalClose}>
                <Ionicons name="close" size={20} color="#0E2E4A" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.storyModalBody}>
              {selectedStory?.date ? <Text style={styles.storyModalDate}>{selectedStory.date}</Text> : null}
              <Text style={styles.storyModalText}>{selectedStory?.fullStory ?? ''}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    backgroundColor: '#F4F8FB',
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
    marginBottom: 8,
  },
  headerTitle: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  headerSub: {
    marginTop: 6,
    color: '#46627A',
    fontSize: 14,
    lineHeight: 20,
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
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: '#123B5B',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  cardSummary: {
    marginTop: 6,
    color: '#3D5A70',
    fontSize: 14,
    lineHeight: 20,
  },
  cardDate: {
    marginTop: 8,
    color: '#0E4A72',
    fontSize: 18,
    fontWeight: '700',
  },
  readMoreButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#0E4A72',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readMoreButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  membersOnlyText: {
    marginTop: 10,
    color: '#A12727',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  loading: {
    marginTop: 8,
  },
  errorText: {
    marginTop: 8,
    color: '#B00020',
  },
  emptyText: {
    color: '#4A647B',
  },
  storyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  storyModalCard: {
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2EC',
  },
  storyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E1EAF2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  storyModalTitle: {
    flex: 1,
    color: '#0E2E4A',
    fontSize: 18,
    fontWeight: '700',
  },
  storyModalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF4F9',
  },
  storyModalBody: {
    padding: 14,
    gap: 8,
  },
  storyModalDate: {
    color: '#0E4A72',
    fontWeight: '700',
    fontSize: 14,
  },
  storyModalText: {
    color: '#355A74',
    lineHeight: 21,
    fontSize: 14,
  },
});
