import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { ApiDashboardEvent, fetchDashboardEvents } from '@/services/dashboardApi';

export default function DashboardEventsScreen() {
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [items, setItems] = useState<ApiDashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    (async () => {
      try {
        const payload = await fetchDashboardEvents(authToken);
        if (!mounted) return;
        setItems(payload.items);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load events.');
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
      {items.map((event) => (
        <View key={event.id} style={styles.card}>
          {event.image_path ? <Image source={{ uri: event.image_path }} style={styles.image} /> : null}
          <Text style={styles.title}>{event.title}</Text>
          {event.display_date ? <Text style={styles.date}>{event.display_date}</Text> : null}
          {typeof event.days_until === 'number' ? <Text style={styles.days}>{`${event.days_until} days away`}</Text> : null}
          {event.detail ? <Text style={styles.body}>{event.detail}</Text> : null}
          {event.link ? (
            <Pressable style={styles.button} onPress={() => void Linking.openURL(event.link || '')}>
              <Text style={styles.buttonText}>Open event</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {!error && items.length === 0 ? <Text style={styles.emptyText}>No upcoming public events.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16, gap: 12 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 16, padding: 14, gap: 8 },
  image: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#E2E9F0' },
  title: { color: '#173F5F', fontSize: 17, fontWeight: '700' },
  date: { color: '#0E4A72', fontWeight: '700' },
  days: { color: '#1B6B35', fontWeight: '700' },
  body: { color: '#355A74', lineHeight: 20 },
  button: { marginTop: 4, backgroundColor: '#0E4A72', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: '#4A647B' },
  errorText: { color: '#B00020' },
});
