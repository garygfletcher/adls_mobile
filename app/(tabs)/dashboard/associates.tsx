import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { ApiDashboardAssociatesResponse, fetchDashboardAssociates } from '@/services/dashboardApi';

function currency(value: number | null) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

export default function DashboardAssociatesScreen() {
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [data, setData] = useState<ApiDashboardAssociatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    (async () => {
      try {
        const payload = await fetchDashboardAssociates(authToken);
        if (!mounted) return;
        setData(payload);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load associates.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authToken]);

  if (authLoading || loading) return <View style={styles.center}><ActivityIndicator size="small" color="#0E4A72" /></View>;
  if (!isAuthenticated) return <LoginGate area="My Ship" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.feeCard}>
        <Text style={styles.feeLabel}>Associate Fee</Text>
        <Text style={styles.feeValue}>{currency(data?.associate_fee ?? null)}</Text>
      </View>
      {data?.items.map((associate) => (
        <View key={associate.id} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{associate.name}</Text>
            <Text style={styles.badge}>{associate.status_label}</Text>
          </View>
          {associate.email ? <Text style={styles.meta}>{associate.email}</Text> : null}
          <Text style={styles.meta}>{`Due: ${associate.due_date_display}`}</Text>
          {associate.pay_url ? (
            <Pressable style={styles.button} onPress={() => void Linking.openURL(associate.pay_url || '')}>
              <Text style={styles.buttonText}>Pay associate subscription</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {!error && data?.items.length === 0 ? <Text style={styles.emptyText}>{data.empty_state || 'No associate members are listed for your ship.'}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16, gap: 12 },
  feeCard: { backgroundColor: '#E8F0F7', borderRadius: 16, padding: 14 },
  feeLabel: { color: '#567087', fontSize: 12, fontWeight: '700' },
  feeValue: { color: '#173F5F', fontSize: 26, fontWeight: '700', marginTop: 4 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 16, padding: 14, gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { color: '#173F5F', fontSize: 17, fontWeight: '700', flex: 1 },
  badge: { color: '#0E4A72', fontWeight: '700' },
  meta: { color: '#4E6A81' },
  button: { marginTop: 4, backgroundColor: '#0E4A72', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: '#4A647B' },
  errorText: { color: '#B00020' },
});
