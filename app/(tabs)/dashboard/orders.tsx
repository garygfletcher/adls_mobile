import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { orderStatusColors } from '@/components/orderStatusStyles';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { ApiDashboardOrdersResponse, fetchDashboardOrders } from '@/services/dashboardApi';

function currency(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

export default function DashboardOrdersScreen() {
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [data, setData] = useState<ApiDashboardOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    (async () => {
      try {
        const payload = await fetchDashboardOrders(authToken);
        if (!mounted) return;
        setData(payload);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load orders.');
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
      {data ? (
        <View style={styles.countRow}>
          <View
            style={[
              styles.countChip,
              { backgroundColor: orderStatusColors('waiting_payment').backgroundColor },
            ]}>
            <Text style={[styles.countLabel, { color: orderStatusColors('waiting_payment').textColor }]}>
              Payment pending
            </Text>
            <Text style={[styles.countValue, { color: orderStatusColors('waiting_payment').textColor }]}>
              {data.status_counts.payment_pending}
            </Text>
          </View>
          <View
            style={[
              styles.countChip,
              { backgroundColor: orderStatusColors('pending_shipment').backgroundColor },
            ]}>
            <Text style={[styles.countLabel, { color: orderStatusColors('pending_shipment').textColor }]}>
              Shipment
            </Text>
            <Text style={[styles.countValue, { color: orderStatusColors('pending_shipment').textColor }]}>
              {data.status_counts.pending_shipment}
            </Text>
          </View>
          <View
            style={[
              styles.countChip,
              { backgroundColor: orderStatusColors('completed').backgroundColor },
            ]}>
            <Text style={[styles.countLabel, { color: orderStatusColors('completed').textColor }]}>Completed</Text>
            <Text style={[styles.countValue, { color: orderStatusColors('completed').textColor }]}>
              {data.status_counts.completed}
            </Text>
          </View>
        </View>
      ) : null}
      {data?.items.map((order) => (
        <View key={order.id} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{order.reference}</Text>
            <View style={[styles.badge, { backgroundColor: orderStatusColors(order.status).backgroundColor }]}>
              <Text style={[styles.badgeText, { color: orderStatusColors(order.status).textColor }]}>
                {order.status_label}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>{order.created_at_display}</Text>
          <Text style={styles.meta}>{`${order.items_count} items • ${currency(order.order_total)}`}</Text>
          {order.items.map((item) => (
            <Text key={item.id} style={styles.body}>{`${item.quantity} x ${item.product_name}${item.size ? ` (${item.size})` : ''}`}</Text>
          ))}
          {order.payment_instructions ? (
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>Payment Instructions</Text>
              <Text style={styles.body}>{`Account: ${order.payment_instructions.account_name}`}</Text>
              <Text style={styles.body}>{`Sort code: ${order.payment_instructions.sort_code}`}</Text>
              <Text style={styles.body}>{`Account number: ${order.payment_instructions.account_number}`}</Text>
              <Text style={styles.body}>{`Reference: ${order.payment_instructions.reference}`}</Text>
            </View>
          ) : null}
        </View>
      ))}
      {!error && data?.items.length === 0 ? <Text style={styles.emptyText}>{data.empty_state || 'No orders yet.'}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16, gap: 12 },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countChip: { flex: 1, minWidth: '30%', borderRadius: 12, padding: 12 },
  countLabel: { fontSize: 12, fontWeight: '700' },
  countValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 16, padding: 14, gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { color: '#173F5F', fontSize: 17, fontWeight: '700', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontWeight: '700', fontSize: 12 },
  meta: { color: '#4E6A81' },
  body: { color: '#355A74', lineHeight: 20 },
  instructions: { marginTop: 6, backgroundColor: '#F8FBFE', borderRadius: 10, padding: 10, gap: 4 },
  instructionsTitle: { color: '#173F5F', fontWeight: '700' },
  emptyText: { color: '#4A647B' },
  errorText: { color: '#B00020' },
});
