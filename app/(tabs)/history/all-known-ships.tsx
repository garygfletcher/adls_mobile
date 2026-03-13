import { useEffect, useMemo, useRef, useState } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ApiShipListItem, fetchKnownShips, toAbsoluteAssetUrl } from '@/services/publicApi';

type SectionData = {
  title: string;
  data: ApiShipListItem[];
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function shipDetails(item: ApiShipListItem) {
  const parts = [item.ship_type, item.operations_used, item.return_status].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : '-';
}

function shipTextColor(item: ApiShipListItem) {
  if (item.return_status && item.return_status.trim().length > 0) return '#A12727';
  if (item.is_adls_member) return '#1B6B35';
  return '#133D5D';
}

export default function AllKnownShipsScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  useScrollToTop(scrollRef);
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  const [letters, setLetters] = useState<string[]>([]);
  const [grouped, setGrouped] = useState<Record<string, ApiShipListItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await fetchKnownShips();
        if (!mounted) return;
        setLetters(response.letters);
        setGrouped(response.grouped);
      } catch {
        if (!mounted) return;
        setError('Unable to load known ships .');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const sections = useMemo<SectionData[]>(() => {
    return letters
      .filter((letter) => LETTERS.includes(letter))
      .map((letter) => ({
        title: letter,
        data: grouped[letter] ?? [],
      }))
      .filter((section) => section.data.length > 0);
  }, [letters, grouped]);

  const jumpToLetter = (letter: string) => {
    const targetSection =
      sections.find((section) => section.title === letter) ??
      sections.find((section) => section.title.localeCompare(letter) > 0);

    if (!targetSection) {
      return;
    }

    const y = sectionOffsetsRef.current[targetSection.title];
    if (typeof y !== 'number') return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
        <Text style={styles.title}>All Known Ships</Text>
        <Text style={styles.body}>Full A-Z registry from the ADLS source.</Text>

        {isLoading ? <ActivityIndicator size="small" color="#0E4A72" /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.headerName]}>Name</Text>
          <Text style={styles.headerCell}>Details / Registry Notes</Text>
        </View>

        {sections.map((section) => (
          <View
            key={section.title}
            style={styles.sectionBlock}
            onLayout={(event) => {
              sectionOffsetsRef.current[section.title] = event.nativeEvent.layout.y;
            }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>

            <View style={styles.table}>
              {section.data.map((item, index) => {
                const textColor = shipTextColor(item);
                const canOpenProfile = Boolean(item.slug && item.has_narrative === true);
                return (
                  <Pressable
                    key={`${item.adls_id}-${item.slug ?? item.ship_name}`}
                    disabled={!canOpenProfile}
                    onPress={() => {
                      if (!canOpenProfile || !item.slug) return;
                      router.push(`/history/little-ship/${item.slug}`);
                    }}
                    style={[
                      styles.row,
                      isTablet && styles.rowTablet,
                      index % 2 === 1 && styles.rowAlt,
                      index === 0 && styles.rowFirst,
                      index === section.data.length - 1 && styles.rowLast,
                      !canOpenProfile && styles.rowDisabled,
                    ]}>
                    <View style={styles.nameCell}>
                      <View style={styles.nameCellContent}>
                        {item.first_image ? (
                          <Image source={{ uri: toAbsoluteAssetUrl(item.first_image) ?? item.first_image }} style={styles.nameIcon} />
                        ) : (
                          <View style={styles.nameIconSpacer} />
                        )}
                        <Text style={[styles.name, { color: textColor }]}>{item.display_name || item.ship_name}</Text>
                      </View>
                    </View>
                    <Text style={[styles.details, { color: textColor }]}>{shipDetails(item)}</Text>
                    {canOpenProfile ? <Ionicons name="chevron-forward" size={14} color="#0E4A72" style={styles.openIcon} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {!isLoading && !error && sections.length === 0 ? <Text style={styles.emptyText}>No ships available.</Text> : null}
      </ScrollView>

      <View style={styles.letterRail}>
        {LETTERS.map((letter) => (
          <Pressable key={letter} onPress={() => jumpToLetter(letter)} style={styles.letterButton}>
            <Text style={styles.letterButtonText}>{letter}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F8FB',
  },
  container: {
    padding: 16,
    paddingRight: 36,
    gap: 10,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    color: '#355A74',
    lineHeight: 21,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#DDE9F3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerCell: {
    color: '#123C5C',
    fontSize: 12,
    fontWeight: '700',
  },
  headerName: {
    width: '40%',
  },
  sectionHeader: {
    backgroundColor: '#0E2E4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionBlock: {
    marginTop: 10,
    gap: 4,
  },
  table: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E3EAF1',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rowTablet: {
    paddingVertical: 10,
  },
  rowAlt: {
    backgroundColor: '#F8FBFE',
  },
  rowFirst: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  rowLast: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  rowDisabled: {
    opacity: 0.75,
  },
  nameCell: {
    width: '40%',
  },
  nameCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E9F0',
  },
  nameIconSpacer: {
    width: 24,
    height: 24,
  },
  name: {
    color: '#133D5D',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },
  details: {
    flex: 1,
    color: '#4E6A81',
    fontSize: 12,
    lineHeight: 18,
  },
  openIcon: {
    marginLeft: 8,
    alignSelf: 'center',
  },
  letterRail: {
    position: 'absolute',
    right: 4,
    top: 120,
    bottom: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    width: 24,
    backgroundColor: 'rgba(14,46,74,0.08)',
    borderRadius: 12,
  },
  letterButton: {
    width: 20,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterButtonText: {
    color: '#0E2E4A',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyText: {
    color: '#4A647B',
  },
  errorText: {
    color: '#B00020',
  },
});
