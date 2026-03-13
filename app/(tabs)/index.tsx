import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';

import { currentMembers } from '@/data/currentMembers';
import { historyBooks } from '@/data/historyBooks';

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
      <View style={styles.headerWrap}>
        <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Association of Dunkirk Little Ships</Text>
          <Text style={styles.subtitle}>Official ADLS mobile app</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome aboard</Text>
        <Text style={styles.cardText}>
          Use the tabs below to browse ADLS Events and News, shop official items, and manage your cart
          from My Account.
        </Text>
      </View>

      <View style={styles.grid}>
        <Pressable style={styles.statTile} onPress={() => router.push('/(tabs)/events')}>
          <View style={styles.statHeader}>
            <Ionicons name="calendar" size={18} color="#0C3D60" />
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <Text style={styles.statValue}>8</Text>
        </Pressable>
        <Pressable style={styles.statTile} onPress={() => router.push('/(tabs)/shop')}>
          <View style={styles.statHeader}>
            <Ionicons name="bag" size={18} color="#0C3D60" />
            <Text style={styles.statLabel}>Shop items</Text>
          </View>
          <Text style={styles.statValue}>14</Text>
        </Pressable>
        <Pressable style={styles.statTile} onPress={() => router.push('/(tabs)/history')}>
          <View style={styles.statHeader}>
            <Ionicons name="book" size={18} color="#0C3D60" />
            <Text style={styles.statLabel}>Recommended books</Text>
          </View>
          <Text style={styles.statValue}>{historyBooks.length}</Text>
        </Pressable>
        <Pressable style={styles.statTile} onPress={() => router.push('/history/current-members')}>
          <View style={styles.statHeader}>
            <Ionicons name="people" size={18} color="#0C3D60" />
            <Text style={styles.statLabel}>Current members</Text>
          </View>
          <Text style={styles.statValue}>{currentMembers.length}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.historyCard} onPress={() => router.push('/(tabs)/history')}>
        <Text style={styles.historyTitle}>ADLS History Collection</Text>
        <Text style={styles.historyText}>
          Read about the history of Dunkirk and Operation Dynamo, and get to know more about our
          Association.
        </Text>
        <View style={styles.readMoreButton}>
          <Text style={styles.readMoreText}>Read more</Text>
        </View>
      </Pressable>

      <Pressable style={styles.historyCard} onPress={() => router.push('/history/all-known-ships')}>
        <Text style={styles.historyTitle}>All Known Ships</Text>
        <Text style={styles.historyText}>
          See the full list of known ships that took part in Operation Dynamo.
        </Text>
        <View style={styles.readMoreButton}>
          <Text style={styles.readMoreText}>Read more</Text>
        </View>
      </Pressable>

      <Pressable style={styles.galleryCard} onPress={() => router.push('/ships-gallery')}>
        <View style={styles.galleryIconWrap}>
          <Ionicons name="images-outline" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.galleryCopyWrap}>
          <Text style={styles.galleryTitle}>Launch Gallery</Text>
          <Text style={styles.galleryBlurb}>Here are some curated collections from uploaded images.</Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F8FB',
    padding: 20,
    paddingBottom: 28,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 16,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: '#3E5D76',
    fontSize: 16,
  },
  card: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D8E2EC',
  },
  cardTitle: {
    color: '#103B5B',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    color: '#2E4C64',
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statTile: {
    width: '48%',
    backgroundColor: '#E6EFF7',
    borderRadius: 14,
    padding: 14,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    marginTop: 6,
    color: '#0C3D60',
    fontWeight: '700',
    fontSize: 22,
  },
  statLabel: {
    color: '#355E7D',
    fontSize: 13,
    fontWeight: '600',
  },
  historyCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 14,
  },
  historyTitle: {
    color: '#103B5B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  historyText: {
    color: '#2E4C64',
    fontSize: 14,
    lineHeight: 20,
  },
  galleryCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  galleryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E5A84',
  },
  galleryCopyWrap: {
    flex: 1,
  },
  galleryTitle: {
    color: '#103B5B',
    fontSize: 16,
    fontWeight: '700',
  },
  galleryBlurb: {
    marginTop: 2,
    color: '#355A74',
    fontSize: 13,
    lineHeight: 18,
  },
  readMoreButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#0E4A72',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readMoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
