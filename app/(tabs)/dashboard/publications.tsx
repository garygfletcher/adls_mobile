import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { fetchDashboardPublications } from '@/services/dashboardApi';

export default function DashboardPublicationsScreen() {
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [emptyState, setEmptyState] = useState<string>('No publications are currently available.');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    (async () => {
      try {
        const payload = await fetchDashboardPublications(authToken);
        if (!mounted) return;
        setEmptyState(payload.data.empty_state || 'No publications are currently available.');
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load publications.');
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
      {!error ? <Text style={styles.emptyText}>{emptyState}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16 },
  emptyText: { color: '#4A647B' },
  errorText: { color: '#B00020' },
});
