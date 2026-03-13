import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import * as Calendar from 'expo-calendar';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ApiEventItem, fetchEvents, toAbsoluteAssetUrl, toAbsoluteSiteUrl } from '@/services/publicApi';

const MONTH_TO_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

type EventDates = {
  startDate: Date;
  endDate: Date;
};

function dateAtMidday(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function parseIsoDate(raw: string | null | undefined) {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) return null;
  return dateAtMidday(year, monthIndex, day);
}

function parseDisplayDate(displayDate: string | null | undefined) {
  if (!displayDate) return null;
  const cleaned = displayDate
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/(\d+)(st|nd|rd|th)/g, '$1');

  if (!cleaned || cleaned.includes('tbc')) return null;

  const singleMatch = cleaned.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (singleMatch) {
    const day = Number(singleMatch[1]);
    const monthIndex = MONTH_TO_INDEX[singleMatch[2]];
    const year = Number(singleMatch[3]);
    if (Number.isInteger(day) && Number.isInteger(monthIndex) && Number.isInteger(year)) {
      return { start: dateAtMidday(year, monthIndex, day), endInclusive: dateAtMidday(year, monthIndex, day) };
    }
  }

  const rangeSameMonthMatch = cleaned.match(/^(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (rangeSameMonthMatch) {
    const startDay = Number(rangeSameMonthMatch[1]);
    const endDay = Number(rangeSameMonthMatch[2]);
    const monthIndex = MONTH_TO_INDEX[rangeSameMonthMatch[3]];
    const year = Number(rangeSameMonthMatch[4]);
    if (
      Number.isInteger(startDay) &&
      Number.isInteger(endDay) &&
      Number.isInteger(monthIndex) &&
      Number.isInteger(year)
    ) {
      return {
        start: dateAtMidday(year, monthIndex, startDay),
        endInclusive: dateAtMidday(year, monthIndex, endDay),
      };
    }
  }

  return null;
}

function resolveEventDates(item: ApiEventItem): EventDates | null {
  const rawStart = item.from_date ?? item.date_from ?? null;
  const rawEnd = item.to_date ?? item.date_to ?? null;
  const parsedStart = parseIsoDate(rawStart);
  const parsedEnd = parseIsoDate(rawEnd);

  if (parsedStart) {
    const inclusiveEnd = parsedEnd ?? parsedStart;
    const exclusiveEnd = new Date(inclusiveEnd);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
    return { startDate: parsedStart, endDate: exclusiveEnd };
  }

  const parsedDisplay = parseDisplayDate(item.display_date);
  if (!parsedDisplay) return null;
  const exclusiveEnd = new Date(parsedDisplay.endInclusive);
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
  return { startDate: parsedDisplay.start, endDate: exclusiveEnd };
}

async function findCalendarId() {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const editable = calendars.find((calendar) => calendar.allowsModifications);
  return editable?.id ?? calendars[0]?.id ?? null;
}

export default function EventsScreen() {
  const listRef = useRef<FlatList<ApiEventItem>>(null);
  useScrollToTop(listRef);
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;
  const numColumns = isTablet ? 2 : 1;

  const [events, setEvents] = useState<ApiEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addEventToNativeCalendar = useCallback(async (item: ApiEventItem) => {
    if (Platform.OS === 'web') {
      Alert.alert('Calendar', 'Native calendar is only available on iOS and Android.');
      return;
    }

    const range = resolveEventDates(item);
    if (!range) {
      Alert.alert('Calendar', 'This event does not have a valid date range to add.');
      return;
    }

    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Calendar', 'Calendar permission is required to add this event.');
      return;
    }

    const calendarId = await findCalendarId();
    if (!calendarId) {
      Alert.alert('Calendar', 'No editable calendar is available on this device.');
      return;
    }

    await Calendar.createEventAsync(calendarId, {
      title: item.title,
      notes: item.detail ?? undefined,
      startDate: range.startDate,
      endDate: range.endDate,
      allDay: true,
      timeZone: 'UTC',
    });

    Alert.alert('Calendar', 'Event added to your calendar.');
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setIsLoading(true);
      setError(null);

      (async () => {
        try {
          const response = await fetchEvents();
          if (!mounted) return;
          setEvents(response);
        } catch {
          if (!mounted) return;
          setError('Unable to load events .');
        } finally {
          if (mounted) setIsLoading(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <FlatList
      ref={listRef}
      data={events}
      key={numColumns}
      numColumns={numColumns}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContainer}
      columnWrapperStyle={numColumns > 1 ? styles.columns : undefined}
      renderItem={({ item }) => {
        const imageUrl = toAbsoluteAssetUrl(item.image_path);
        const link = toAbsoluteSiteUrl(item.link);

        return (
          <View style={styles.cardWrap}>
            <View style={styles.card}>
              {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : null}
              <View style={styles.titleRow}>
                <Ionicons name="calendar-clear" size={20} color="#123B5B" />
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              {item.detail ? <Text style={styles.cardDescription}>{item.detail}</Text> : null}
              {item.display_date ? <Text style={styles.cardDate}>{item.display_date}</Text> : null}
              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={() => void addEventToNativeCalendar(item)}>
                  <Ionicons name="calendar-outline" size={14} color="#0E4A72" />
                  <Text style={styles.secondaryButtonText}>Add to Calendar</Text>
                </Pressable>
                {link ? (
                  <Pressable style={styles.button} onPress={() => Linking.openURL(link)}>
                    <Text style={styles.buttonText}>View More</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        );
      }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Events</Text>
          <Text style={styles.headerSub}>Public ADLS events.</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          {isLoading ? <ActivityIndicator size="small" color="#0E4A72" /> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {!isLoading && !error ? <Text style={styles.emptyText}>No events available.</Text> : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    backgroundColor: '#F4F8FB',
    gap: 14,
  },
  columns: {
    gap: 14,
  },
  cardWrap: {
    flex: 1,
    marginBottom: 14,
  },
  header: {
    marginBottom: 8,
  },
  headerTitle: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  headerSub: {
    marginTop: 6,
    color: '#46627A',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 14,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#123B5B',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDescription: {
    marginTop: 6,
    color: '#3D5A70',
    fontSize: 14,
    lineHeight: 20,
  },
  cardDate: {
    marginTop: 8,
    color: '#0E4A72',
    fontSize: 18,
    fontWeight: '700',
  },
  button: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#0E4A72',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0E4A72',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#0E4A72',
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  emptyText: {
    color: '#4A647B',
  },
  errorText: {
    color: '#B00020',
    textAlign: 'center',
  },
});
