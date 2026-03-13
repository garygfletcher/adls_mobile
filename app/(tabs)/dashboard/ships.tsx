import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { ApiDashboardShipsResponse, fetchDashboardShips } from '@/services/dashboardApi';

export default function DashboardShipsScreen() {
  const router = useRouter();
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [data, setData] = useState<ApiDashboardShipsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShips = async (showSpinner = false) => {
    if (!authToken) return;
    if (showSpinner) setLoading(true);

    try {
      const payload = await fetchDashboardShips(authToken);
      setData(payload);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load ships.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!authToken) return;

    (async () => {
      try {
        const payload = await fetchDashboardShips(authToken);
        if (!mounted) return;
        setData(payload);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load ships.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [authToken]);

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#0E4A72" />
      </View>
    );
  }

  if (!isAuthenticated) return <LoginGate area="My Ship" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {data?.items.map((ship) => (
        <Pressable key={ship.adls_id} style={styles.card} onPress={() => router.push(`/dashboard/ships/${ship.adls_id}` as never)}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{ship.ship_name}</Text>
            <Text style={styles.badge}>{ship.ship_type || 'Ship'}</Text>
          </View>
          <Text style={styles.meta}>{[ship.builder, ship.build_year, ship.length].filter(Boolean).join(' • ') || 'No summary available'}</Text>
          <Text style={styles.meta}>{`${ship.images.length} images • ${ship.associated_users.length} associated users`}</Text>
        </Pressable>
      ))}

      {!error && data?.items.length === 0 ? <Text style={styles.emptyText}>{data.empty_state || 'No ship is currently assigned to your membership.'}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16, gap: 12 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 16, padding: 14, gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { color: '#173F5F', fontSize: 17, fontWeight: '700', flex: 1 },
  badge: { color: '#0E4A72', fontWeight: '700' },
  meta: { color: '#4E6A81' },
  emptyText: { color: '#4A647B' },
  errorText: { color: '#B00020' },
});
