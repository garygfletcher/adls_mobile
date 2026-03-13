import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { ApiDashboardSectionResponse, ApiDashboardDocumentGroup, fetchDashboardAssociationDocuments } from '@/services/dashboardApi';

export default function DashboardAssociationDocumentsScreen() {
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [data, setData] = useState<ApiDashboardSectionResponse<ApiDashboardDocumentGroup> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    (async () => {
      try {
        const payload = await fetchDashboardAssociationDocuments(authToken);
        if (!mounted) return;
        setData(payload);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load documents.');
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
      {data?.items.map((group, index) => (
        <View key={`${group.meeting.id}-${index}`} style={styles.card}>
          <Text style={styles.title}>{group.meeting.name}</Text>
          <Text style={styles.meta}>{group.meeting.start_at_display}</Text>
          {group.documents.map((document) => (
            <Pressable
              key={document.id}
              style={styles.docRow}
              onPress={() => {
                const target = document.api_download_url || document.download_url;
                if (!target) return;
                void Linking.openURL(target);
              }}>
              <Text style={styles.docName}>{document.name}</Text>
              <Ionicons name="download-outline" size={16} color="#0E4A72" />
            </Pressable>
          ))}
        </View>
      ))}
      {!error && data?.items.length === 0 ? <Text style={styles.emptyText}>{data?.empty_state || 'No documents are currently available.'}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16, gap: 12 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 16, padding: 14, gap: 10 },
  title: { color: '#173F5F', fontSize: 17, fontWeight: '700' },
  meta: { color: '#4E6A81' },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#E3EAF1', paddingTop: 10 },
  docName: { color: '#355A74', flex: 1 },
  emptyText: { color: '#4A647B' },
  errorText: { color: '#B00020' },
});
