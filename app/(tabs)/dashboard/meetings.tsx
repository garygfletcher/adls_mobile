import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { ApiDashboardMeeting, fetchDashboardMeetings } from '@/services/dashboardApi';

export default function DashboardMeetingsScreen() {
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [items, setItems] = useState<ApiDashboardMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    (async () => {
      try {
        const payload = await fetchDashboardMeetings(authToken);
        if (!mounted) return;
        setItems(payload.items);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load meetings.');
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
      {items.map((meeting) => (
        <View key={meeting.id} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{meeting.name}</Text>
            <Text style={styles.badge}>{meeting.meeting_type_label}</Text>
          </View>
          <Text style={styles.date}>{meeting.start_at_display}</Text>
          {meeting.invited_types_label ? <Text style={styles.meta}>{meeting.invited_types_label}</Text> : null}
          {meeting.description ? <Text style={styles.body}>{meeting.description}</Text> : null}
          <View style={styles.chipRow}>
            {meeting.is_online ? (
              <Pressable style={styles.chip} onPress={() => meeting.online_link && Linking.openURL(meeting.online_link)}>
                <Text style={styles.chipText}>{meeting.online_link ? 'Online' : 'Online meeting'}</Text>
              </Pressable>
            ) : null}
            {meeting.is_in_person ? <View style={styles.chip}><Text style={styles.chipText}>In person</Text></View> : null}
          </View>
          {meeting.in_person_address ? <Text style={styles.meta}>{meeting.in_person_address}</Text> : null}
        </View>
      ))}
      {!error && items.length === 0 ? <Text style={styles.emptyText}>No upcoming meetings for your member type.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16, gap: 12 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 16, padding: 14, gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, color: '#173F5F', fontSize: 17, fontWeight: '700' },
  badge: { color: '#0E4A72', fontWeight: '700', fontSize: 12 },
  date: { color: '#1B6B35', fontWeight: '700' },
  meta: { color: '#4E6A81' },
  body: { color: '#355A74', lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#E8F0F7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: '#0E4A72', fontWeight: '700', fontSize: 12 },
  emptyText: { color: '#4A647B' },
  errorText: { color: '#B00020' },
});
