import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Updates from 'expo-updates';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { LoginGate } from '@/components/LoginGate';
import { orderStatusColors } from '@/components/orderStatusStyles';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import {
  ApiDashboardSummary,
  deleteDashboardProfileImage,
  fetchDashboardSummary,
  readCachedDashboardSummary,
  updateDashboardProfileImagePreference,
  uploadDashboardProfileImage,
} from '@/services/dashboardApi';

type DashboardWidgetRoute = {
  key: string;
  label: string;
  value: string;
  meta: string;
  route: string;
};

function currency(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

function firstName(value: string | null | undefined) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'Member';
  return trimmed.split(/\s+/)[0] || 'Member';
}

const MAX_CLIENT_UPLOAD_BYTES = 16 * 1024 * 1024;

async function prepareProfileImage(asset: ImagePicker.ImagePickerAsset) {
  if ((asset.fileSize ?? 0) <= MAX_CLIENT_UPLOAD_BYTES && asset.mimeType && asset.mimeType.startsWith('image/')) {
    return {
      uri: asset.uri,
      name: asset.fileName || `profile-${Date.now()}.jpg`,
      type: asset.mimeType,
    };
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width || 1600, 1600) } }],
    {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return {
    uri: manipulated.uri,
    name: `profile-${Date.now()}.jpg`,
    type: 'image/jpeg',
  };
}

export default function MyShipScreen() {
  const router = useRouter();
  const { authLoading, isAuthenticated, authUser, authToken, logout } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<ApiDashboardSummary | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [profileBusyAction, setProfileBusyAction] = useState<'upload' | 'delete' | 'preference' | null>(null);
  const versionText = `Version: ${Updates.updateId ?? 'embedded'}`;
  const lastUpdatedText = `Last Updated: ${
    Updates.createdAt
      ? new Date(Updates.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : 'embedded'
  }`;

  const checkForUpdates = async () => {
    if (isUpdating) return;

    if (__DEV__ || !Updates.isEnabled) {
      setUpdateStatus('Updates are only available in installed app builds.');
      return;
    }

    setIsUpdating(true);
    setUpdateStatus('Checking for updates...');

    try {
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) {
        setUpdateStatus('App is up to date.');
        return;
      }

      setUpdateStatus('Downloading update...');
      await Updates.fetchUpdateAsync();
      setUpdateStatus('Applying update...');
      await Updates.reloadAsync();
    } catch {
      setUpdateStatus('Update check failed. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !authToken) return;

    let mounted = true;

    (async () => {
      const cached = await readCachedDashboardSummary();
      if (mounted && cached) {
        setDashboard(cached);
        setLoadingDashboard(false);
      }

      try {
        const summary = await fetchDashboardSummary(authToken);
        if (!mounted) return;
        setDashboard(summary);
        setDashboardError(null);
      } catch (error) {
        if (!mounted) return;
        const message =
          error instanceof ApiRequestError ? error.message : 'Unable to load dashboard data. Please try again.';
        setDashboardError(message);
      } finally {
        if (mounted) setLoadingDashboard(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [authToken, isAuthenticated]);

  const refreshDashboard = async () => {
    if (!authToken) return;
    setRefreshingDashboard(true);
    try {
      const summary = await fetchDashboardSummary(authToken);
      setDashboard(summary);
      setDashboardError(null);
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : 'Unable to refresh dashboard data. Please try again.';
      setDashboardError(message);
    } finally {
      setRefreshingDashboard(false);
    }
  };

  const handleToggleProfilePreference = async (value: boolean) => {
    if (!authToken || !dashboard) return;
    const previous = dashboard.user.display_image_on_ship_profile ?? false;

    setDashboard({
      ...dashboard,
      user: {
        ...dashboard.user,
        display_image_on_ship_profile: value,
      },
    });
    setProfileBusyAction('preference');

    try {
      await updateDashboardProfileImagePreference(value, authToken);
    } catch (toggleError) {
      setDashboard({
        ...dashboard,
        user: {
          ...dashboard.user,
          display_image_on_ship_profile: previous,
        },
      });
      Alert.alert(
        'Update failed',
        toggleError instanceof ApiRequestError ? toggleError.message : 'Unable to update profile image preference.',
      );
    } finally {
      setProfileBusyAction(null);
    }
  };

  const handleUploadProfileImage = async () => {
    if (!authToken) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access required', 'Please allow photo library access to upload your profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setProfileBusyAction('upload');

    try {
      const file = await prepareProfileImage(result.assets[0]);
      const response = await uploadDashboardProfileImage(file, authToken);
      setDashboard((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                resolved_profile_image_path: response.data.profile_image_path,
                profile_image_path: response.data.profile_image_path,
              },
            }
          : current,
      );
    } catch (uploadError) {
      Alert.alert(
        'Upload failed',
        uploadError instanceof ApiRequestError ? uploadError.message : 'Unable to upload your profile image.',
      );
    } finally {
      setProfileBusyAction(null);
    }
  };

  const confirmDeleteProfileImage = () => {
    Alert.alert('Delete profile image', 'Remove your current profile image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!authToken) return;
          setProfileBusyAction('delete');

          try {
            await deleteDashboardProfileImage(authToken);
            setDashboard((current) =>
              current
                ? {
                    ...current,
                    user: {
                      ...current.user,
                      resolved_profile_image_path: null,
                      profile_image_path: null,
                    },
                  }
                : current,
            );
          } catch (deleteError) {
            Alert.alert(
              'Delete failed',
              deleteError instanceof ApiRequestError ? deleteError.message : 'Unable to delete your profile image.',
            );
          } finally {
            setProfileBusyAction(null);
          }
        },
      },
    ]);
  };

  const dashboardUser = dashboard?.user ?? authUser;
  const widgetOrders = dashboard?.widgets.orders;
  const widgetSubscription = dashboard?.widgets.subscription;
  const previewMeetings = dashboard?.meetings ?? [];
  const previewEvents = dashboard?.events ?? [];
  const previewOrders = dashboard?.orders ?? [];
  const shortcutUrl = dashboard?.shortcuts.journal_entry_url ?? null;
  const dashboardUserShipName = dashboard?.user.ship_name ?? null;
  const singleShip = dashboard?.ships.length === 1 ? dashboard.ships[0] : null;
  const widgetRoutes = useMemo<DashboardWidgetRoute[]>(
    () => [
      {
        key: 'orders',
        label: 'Orders',
        value: String(
          (widgetOrders?.payment_pending ?? 0) + (widgetOrders?.pending_shipment ?? 0) + (widgetOrders?.completed ?? 0),
        ),
        meta: `Pending: ${widgetOrders?.payment_pending ?? 0}`,
        route: '/dashboard/orders',
      },
      {
        key: 'subscription',
        label: 'Subscription',
        value: widgetSubscription?.status?.is_overdue ? 'Due' : 'OK',
        meta: widgetSubscription?.status?.due_date_display ?? 'Not applicable',
        route: '/dashboard/subscription',
      },
      {
        key: 'meetings',
        label: 'Meetings',
        value: String(dashboard?.widgets.upcoming_meetings_count ?? 0),
        meta: 'Upcoming',
        route: '/dashboard/meetings',
      },
      {
        key: 'events',
        label: 'Events',
        value: String(dashboard?.widgets.upcoming_events_count ?? 0),
        meta: 'Upcoming',
        route: '/dashboard/events',
      },
      {
        key: 'associates',
        label: 'Associates',
        value: String(dashboard?.widgets.my_associates_count ?? 0),
        meta: 'On my ship',
        route: '/dashboard/associates',
      },
      {
        key: 'ships',
        label: 'Ships',
        value: String(dashboard?.widgets.my_ships_count ?? 0),
        meta: 'Assigned',
        route: '/dashboard/ships',
      },
    ],
    [
      dashboard?.widgets.my_associates_count,
      dashboard?.widgets.my_ships_count,
      dashboard?.widgets.upcoming_events_count,
      dashboard?.widgets.upcoming_meetings_count,
      widgetOrders?.completed,
      widgetOrders?.payment_pending,
      widgetOrders?.pending_shipment,
      widgetSubscription?.status?.due_date_display,
      widgetSubscription?.status?.is_overdue,
    ],
  );

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0E4A72" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginGate area="My Ship" />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshingDashboard} onRefresh={() => void refreshDashboard()} />}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <Ionicons name="boat" size={34} color="#0E4A72" />
          <View style={styles.heroCopy}>
            <Text style={styles.title}>My Ship</Text>
            <Text style={styles.greeting}>{`Hello ${firstName(dashboardUser?.name)}`}</Text>
            <Text style={styles.subTitle}>{dashboardUser?.email || 'Member dashboard'}</Text>
          </View>
        </View>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaItem}>
            <Text style={styles.heroMetaLabel}>Membership Number</Text>
            <Text style={styles.heroMetaValue}>{dashboardUser?.id ? String(dashboardUser.id) : 'Not set'}</Text>
          </View>
          <View style={styles.heroMetaItem}>
            <Text style={styles.heroMetaLabel}>Ship</Text>
            <Text style={styles.heroMetaValue}>{dashboardUserShipName || 'Not set'}</Text>
          </View>
        </View>
      </View>

      {loadingDashboard && !dashboard ? <ActivityIndicator size="small" color="#0E4A72" /> : null}
      {dashboardError ? <Text style={styles.errorText}>{dashboardError}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Shortcuts</Text>
        <Pressable
          style={[styles.shortcutButton, !shortcutUrl ? styles.disabledButton : null]}
          disabled={!shortcutUrl}
          onPress={() => {
            if (!shortcutUrl) return;
            void Linking.openURL(shortcutUrl);
          }}>
          <Ionicons name="create-outline" size={18} color={shortcutUrl ? '#0E4A72' : '#7B8B99'} />
          <Text style={[styles.shortcutText, !shortcutUrl ? styles.disabledText : null]}>Add a Journal Entry</Text>
        </Pressable>
        {singleShip ? (
          <Pressable style={styles.shortcutButton} onPress={() => router.push(`/dashboard/ships/${singleShip.adls_id}` as never)}>
            <Ionicons name="boat" size={18} color="#0E4A72" />
            <Text style={styles.shortcutText}>Edit Ship</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.widgetGrid}>
          {widgetRoutes.map((widget) => (
            <Pressable key={widget.key} style={styles.widgetTile} onPress={() => router.push(widget.route as never)}>
              <Text style={styles.widgetLabel}>{widget.label}</Text>
              {widget.key === 'subscription' ? (
                <View
                  style={[
                    styles.widgetStatusBadge,
                    widget.value === 'Due' ? styles.widgetStatusBadgeDue : styles.widgetStatusBadgeOk,
                  ]}>
                  <Text
                    style={[
                      styles.widgetStatusBadgeText,
                      widget.value === 'Due' ? styles.widgetStatusBadgeTextDue : styles.widgetStatusBadgeTextOk,
                    ]}>
                    {widget.value}
                  </Text>
                </View>
              ) : (
                <Text style={styles.widgetValue}>{widget.value}</Text>
              )}
              <Text style={styles.widgetMeta}>{widget.meta}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Next Meetings</Text>
          <Pressable onPress={() => router.push('/dashboard/meetings')}>
            <Text style={styles.inlineAction}>View all</Text>
          </Pressable>
        </View>
        {previewMeetings.length > 0 ? (
          previewMeetings.slice(0, 3).map((meeting) => (
            <View key={meeting.id} style={styles.listItem}>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>{meeting.name}</Text>
                <Text style={styles.badgeText}>{meeting.meeting_type_label}</Text>
              </View>
              <Text style={styles.listItemMeta}>{meeting.start_at_display}</Text>
              {meeting.invited_types_label ? <Text style={styles.listItemBody}>{meeting.invited_types_label}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No upcoming meetings.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Next Events</Text>
          <Pressable onPress={() => router.push('/dashboard/events')}>
            <Text style={styles.inlineAction}>View all</Text>
          </Pressable>
        </View>
        {previewEvents.length > 0 ? (
          previewEvents.slice(0, 3).map((event) => (
            <View key={event.id} style={styles.listItem}>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>{event.title}</Text>
                <Text style={styles.badgeText}>
                  {typeof event.days_until === 'number' ? `${event.days_until} days` : event.display_date || ''}
                </Text>
              </View>
              {event.display_date ? <Text style={styles.listItemMeta}>{event.display_date}</Text> : null}
              {event.detail ? <Text style={styles.listItemBody}>{event.detail}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No upcoming events.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Pressable onPress={() => router.push('/dashboard/orders')}>
            <Text style={styles.inlineAction}>View all</Text>
          </Pressable>
        </View>
        {previewOrders.length > 0 ? (
          previewOrders.slice(0, 3).map((order) => (
            <View key={order.id} style={styles.listItem}>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>{order.reference}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: orderStatusColors(order.status).backgroundColor },
                  ]}>
                  <Text style={[styles.statusBadgeText, { color: orderStatusColors(order.status).textColor }]}>
                    {order.status_label}
                  </Text>
                </View>
              </View>
              <Text style={styles.listItemMeta}>{order.created_at_display}</Text>
              <Text style={styles.listItemBody}>
                {order.items_count} items • {currency(order.order_total)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No orders yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resources</Text>
        <View style={styles.resourceGrid}>
          <Pressable style={styles.resourceItem} onPress={() => router.push('/dashboard/publications')}>
            <Ionicons name="library-outline" size={18} color="#0E4A72" />
            <Text style={styles.resourceItemText}>Publications</Text>
          </Pressable>
          <Pressable style={styles.resourceItem} onPress={() => router.push('/dashboard/association-documents')}>
            <Ionicons name="document-text-outline" size={18} color="#0E4A72" />
            <Text style={styles.resourceItemText}>Association Documents</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile Picture</Text>
        <Pressable
          accessibilityRole="button"
          disabled={profileBusyAction !== null}
          onPress={handleUploadProfileImage}
          style={styles.profileImageButton}>
          {dashboard?.user.resolved_profile_image_path ? (
            <Image source={{ uri: dashboard.user.resolved_profile_image_path }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.profilePlaceholder]}>
              <Text style={styles.profilePlaceholderLabel}>No Image</Text>
            </View>
          )}
          <View style={styles.profileImageBadge}>
            <Text style={styles.profileImageBadgeLabel}>{dashboard?.user.resolved_profile_image_path ? 'Edit' : 'Add'}</Text>
          </View>
        </Pressable>
        <Text style={styles.profileBody}>
          By uploading this image, you consent to the Association using it across its digital services, including
          publishing your name with the corresponding image publicly.
        </Text>
        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Display my image on my ship&apos;s profile</Text>
          <Switch
            disabled={profileBusyAction === 'preference' || !dashboard}
            onValueChange={handleToggleProfilePreference}
            trackColor={{ false: '#C5D3E0', true: '#7EB2D9' }}
            thumbColor={dashboard?.user.display_image_on_ship_profile ? '#0E4A72' : '#FFFFFF'}
            value={dashboard?.user.display_image_on_ship_profile ?? false}
          />
        </View>
        <Text style={styles.profileHint}>
          Max server upload is 16MB. Larger images are automatically compressed before upload.
        </Text>
        <View style={styles.profileActions}>
          <Pressable
            accessibilityRole="button"
            disabled={profileBusyAction !== null}
            onPress={handleUploadProfileImage}
            style={[styles.primaryButton, profileBusyAction !== null ? styles.buttonDisabled : null]}>
            <Text style={styles.primaryButtonLabel}>
              {profileBusyAction === 'upload'
                ? 'Uploading...'
                : dashboard?.user.resolved_profile_image_path
                  ? 'Edit Image'
                  : 'Upload Image'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={profileBusyAction !== null || !dashboard?.user.resolved_profile_image_path}
            onPress={confirmDeleteProfileImage}
            style={[
              styles.secondaryButton,
              (profileBusyAction !== null || !dashboard?.user.resolved_profile_image_path) ? styles.buttonDisabled : null,
            ]}>
            <Text style={styles.secondaryButtonLabel}>
              {profileBusyAction === 'delete' ? 'Deleting...' : 'Delete'}
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.updateButton} onPress={() => void checkForUpdates()} disabled={isUpdating}>
        <Text style={styles.updateButtonText}>{isUpdating ? 'Updating...' : 'Check for Updates'}</Text>
      </Pressable>
      {updateStatus ? <Text style={styles.updateStatusText}>{updateStatus}</Text> : null}

      <Pressable style={styles.logoutButton} onPress={() => void logout()}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      <Text style={styles.versionText}>{versionText}</Text>
      <Text style={styles.versionText}>{lastUpdatedText}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F4F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#F4F8FB',
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E2EC',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  subTitle: {
    marginTop: 4,
    color: '#46627A',
    fontSize: 14,
  },
  greeting: {
    marginTop: 4,
    color: '#1B6B35',
    fontSize: 18,
    fontWeight: '700',
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroMetaItem: {
    flex: 1,
  },
  heroMetaLabel: {
    color: '#5A7388',
    fontSize: 12,
  },
  heroMetaValue: {
    color: '#173F5F',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E2EC',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#0E2E4A',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inlineAction: {
    color: '#0E4A72',
    fontWeight: '700',
    fontSize: 13,
  },
  shortcutButton: {
    backgroundColor: '#E8F0F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shortcutText: {
    color: '#173F5F',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#F1F4F7',
  },
  disabledText: {
    color: '#7B8B99',
  },
  widgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  widgetTile: {
    width: '48%',
    backgroundColor: '#E8F0F7',
    borderRadius: 12,
    padding: 12,
  },
  widgetLabel: {
    color: '#567087',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  widgetValue: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  widgetMeta: {
    color: '#46627A',
    fontSize: 12,
    marginTop: 4,
  },
  widgetStatusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
  },
  widgetStatusBadgeDue: {
    backgroundColor: '#F7E3EB',
  },
  widgetStatusBadgeOk: {
    backgroundColor: '#E3F3E7',
  },
  widgetStatusBadgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  widgetStatusBadgeTextDue: {
    color: '#A03C62',
  },
  widgetStatusBadgeTextOk: {
    color: '#2F7A46',
  },
  listItem: {
    borderTopWidth: 1,
    borderTopColor: '#E3EAF1',
    paddingTop: 12,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  listItemTitle: {
    color: '#173F5F',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  badgeText: {
    color: '#0E4A72',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listItemMeta: {
    color: '#4E6A81',
    fontSize: 13,
    marginTop: 4,
  },
  listItemBody: {
    color: '#355A74',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  emptyText: {
    color: '#4A647B',
  },
  logoutButton: {
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutText: {
    color: '#FFF',
    fontWeight: '700',
  },
  resourceGrid: {
    gap: 10,
  },
  resourceItem: {
    backgroundColor: '#E8F0F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resourceItemText: {
    color: '#173F5F',
    fontSize: 15,
    fontWeight: '600',
  },
  profileImageButton: {
    alignSelf: 'flex-start',
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: '#E2E9F0',
  },
  profilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePlaceholderLabel: {
    color: '#6A8297',
    fontWeight: '700',
  },
  profileImageBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    borderRadius: 999,
    backgroundColor: '#0E4A72',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  profileImageBadgeLabel: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  profileBody: {
    color: '#4E6A81',
    lineHeight: 20,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  preferenceLabel: {
    color: '#173F5F',
    fontWeight: '600',
    flex: 1,
  },
  profileHint: {
    color: '#4E6A81',
    fontSize: 12,
    lineHeight: 18,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#0E4A72',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 132,
  },
  primaryButtonLabel: {
    color: '#FFF',
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6809A',
    backgroundColor: '#FFF6F8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  secondaryButtonLabel: {
    color: '#A43E60',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  updateButton: {
    backgroundColor: '#E8F0F7',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  updateButtonText: {
    color: '#1A425F',
    fontWeight: '700',
  },
  updateStatusText: {
    color: '#5A7388',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },
  versionText: {
    textAlign: 'center',
    color: '#8A95A1',
    fontSize: 12,
    marginTop: -2,
  },
  errorText: {
    color: '#B00020',
  },
});
