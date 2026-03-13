import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { ApiDashboardSubscriptionResponse, fetchDashboardSubscription } from '@/services/dashboardApi';

function currency(value: number | null) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

export default function DashboardSubscriptionScreen() {
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [data, setData] = useState<ApiDashboardSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    (async () => {
      try {
        const payload = await fetchDashboardSubscription(authToken);
        if (!mounted) return;
        setData(payload);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load subscription.');
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
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Status</Text>
        <Text style={styles.heroValue}>{data?.status?.is_overdue ? 'Payment due' : 'Up to date'}</Text>
        <Text style={styles.heroSub}>{data?.current_fee_label || 'Membership'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.row}><Text style={styles.label}>Due date: </Text>{data?.status?.due_date_display || '-'}</Text>
        <Text style={styles.row}><Text style={styles.label}>Last payment: </Text>{data?.status?.last_paid_at_display || '-'}</Text>
        <Text style={styles.row}><Text style={styles.label}>Fee: </Text>{currency(data?.current_fee ?? null)}</Text>
        {data?.pay_url ? (
          <Pressable style={styles.button} onPress={() => void Linking.openURL(data.pay_url || '')}>
            <Text style={styles.buttonText}>Pay now</Text>
          </Pressable>
        ) : null}
      </View>
      {!error && !data?.status ? <Text style={styles.emptyText}>{data?.empty_state || 'Subscription status is not applicable for your account.'}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16, gap: 12 },
  hero: { backgroundColor: '#0E4A72', borderRadius: 16, padding: 16 },
  heroLabel: { color: '#DDE9F3', fontSize: 12, fontWeight: '700' },
  heroValue: { color: '#FFF', fontSize: 28, fontWeight: '700', marginTop: 4 },
  heroSub: { color: '#DDE9F3', marginTop: 4 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 16, padding: 14, gap: 10 },
  row: { color: '#355A74' },
  label: { color: '#173F5F', fontWeight: '700' },
  button: { marginTop: 4, backgroundColor: '#0E4A72', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: '#4A647B' },
  errorText: { color: '#B00020' },
});
