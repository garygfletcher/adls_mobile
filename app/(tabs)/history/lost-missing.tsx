import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ApiShipListItem, fetchLostShips, toAbsoluteAssetUrl } from '@/services/publicApi';

function buildStatus(ship: ApiShipListItem) {
  const status = ship.return_status ? ship.return_status.toUpperCase() : null;
  return [status, ship.ship_type].filter(Boolean).join(' | ');
}

export default function LostMissingScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  const [grouped, setGrouped] = useState<Record<string, ApiShipListItem[]>>({});
  const [totals, setTotals] = useState<{ totalLost: number; totalSunk: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await fetchLostShips();
        if (!mounted) return;
        setGrouped(response.grouped);
        setTotals({
          totalLost: response.total_lost,
          totalSunk: response.total_sunk,
        });
      } catch {
        if (!mounted) return;
        setError('Unable to load lost and sunk ships .');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const sections = useMemo(
    () =>
      Object.entries(grouped)
        .filter(([letter]) => /^[A-Z]$/.test(letter))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([letter, ships]) => ({
          letter,
          ships: ships.slice().sort((a, b) => (a.display_name || a.ship_name).localeCompare(b.display_name || b.ship_name)),
        })),
    [grouped],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Lost & Missing</Text>
      <Text style={styles.body}>
        Full A-Z list from the ADLS source.
        {totals ? ` Lost: ${totals.totalLost}, Sunk: ${totals.totalSunk}.` : ''}
      </Text>

      {isLoading ? <ActivityIndicator size="small" color="#0E4A72" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {sections.map((section) => (
        <View key={section.letter} style={styles.section}>
          <Text style={styles.letter}>{section.letter}</Text>
          <View style={styles.table}>
            {section.ships.map((ship, index) => {
              const imageUrl = toAbsoluteAssetUrl(ship.first_image);

              return (
                <View
                  key={`${ship.adls_id}-${ship.slug ?? ship.ship_name}`}
                  style={[styles.row, isTablet && styles.rowTablet, index % 2 === 1 && styles.rowAlt]}>
                  <Image source={{ uri: imageUrl ?? undefined }} style={styles.icon} />
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{ship.display_name || ship.ship_name}</Text>
                    <Text style={styles.spec}>{buildStatus(ship) || '-'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {!isLoading && !error && sections.length === 0 ? <Text style={styles.emptyText}>No lost or sunk ships available.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F8FB',
    padding: 16,
    gap: 12,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: '#355A74',
    lineHeight: 21,
  },
  section: {
    marginTop: 6,
  },
  letter: {
    color: '#123C5C',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E3EAF1',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rowTablet: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowAlt: {
    backgroundColor: '#F8FBFE',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#D8E2EC',
  },
  rowText: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    color: '#A12727',
    fontWeight: '700',
    fontSize: 14,
  },
  spec: {
    marginTop: 2,
    color: '#4E6A81',
    fontSize: 12,
  },
  emptyText: {
    color: '#4A647B',
  },
  errorText: {
    color: '#B00020',
  },
});
