import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ApiShipListItem, fetchAdlsMembers, toAbsoluteAssetUrl } from '@/services/publicApi';

function buildSpec(member: ApiShipListItem) {
  const parts = [member.ship_type, member.operations_used].filter(Boolean);
  return parts.join(' | ');
}

function canOpenShipProfile(member: ApiShipListItem) {
  return Boolean(member.slug && member.has_narrative === true);
}

export default function CurrentMembersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  const [grouped, setGrouped] = useState<Record<string, ApiShipListItem[]>>({});
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await fetchAdlsMembers();
        if (!mounted) return;
        setGrouped(response.grouped);
        setTotal(response.total_current_member_boats);
      } catch {
        if (!mounted) return;
        setError('Unable to load current member ships .');
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
        .map(([letter, members]) => ({
          letter,
          members: members.slice().sort((a, b) => (a.display_name || a.ship_name).localeCompare(b.display_name || b.ship_name)),
        })),
    [grouped],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Our Current Members</Text>
      <Text style={styles.body}>
        A-Z list of current ADLS member vessels {typeof total === 'number' ? ` (${total} boats)` : ''}.
      </Text>

      {isLoading ? <ActivityIndicator size="small" color="#0E4A72" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {sections.map((section) => (
        <View key={section.letter} style={styles.section}>
          <Text style={styles.letter}>{section.letter}</Text>
          <View style={styles.table}>
            {section.members.map((member, index) => {
              const canOpenProfile = canOpenShipProfile(member);
              const imageUrl = toAbsoluteAssetUrl(member.first_image);

              return (
                <View
                  key={`${member.adls_id}-${member.slug ?? member.ship_name}`}
                  style={[styles.row, isTablet && styles.rowTablet, index % 2 === 1 && styles.rowAlt]}>
                  <Image source={{ uri: imageUrl ?? undefined }} style={styles.icon} />
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{member.display_name || member.ship_name}</Text>
                    {buildSpec(member) ? <Text style={styles.spec}>{buildSpec(member)}</Text> : null}
                  </View>
                  {canOpenProfile ? (
                    <Pressable
                      style={styles.profileButton}
                      onPress={() => {
                        if (!canOpenShipProfile(member) || !member.slug) return;
                        router.push(`/history/little-ship/${member.slug}`);
                      }}>
                      <Text style={styles.profileButtonText}>Profile</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {!isLoading && !error && sections.length === 0 ? <Text style={styles.emptyText}>No member ships available.</Text> : null}
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
    color: '#1B6B35',
    fontWeight: '700',
    fontSize: 14,
  },
  spec: {
    marginTop: 2,
    color: '#4E6A81',
    fontSize: 12,
  },
  profileButton: {
    backgroundColor: '#0E4A72',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyText: {
    color: '#4A647B',
  },
  errorText: {
    color: '#B00020',
  },
});
