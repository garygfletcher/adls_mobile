import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { Link } from 'expo-router';
import { useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function LinkCard({
  href,
  title,
  summary,
  image,
}: {
  href:
    | '/history/our-history'
    | '/history/committee'
    | '/history/about-dunkirk'
    | '/history/identifying-dls'
    | '/history/books'
    | '/history/current-members'
    | '/history/all-known-ships'
    | '/history/lost-missing';
  title: string;
  summary: string;
  image: any;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.card}>
        <Image source={image} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSummary}>{summary}</Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Read more</Text>
            <Ionicons name="chevron-forward" size={16} color="#0E4A72" />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export default function HistoryScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
      <Text style={styles.title}>ADLS History Collection</Text>
      <Text style={styles.subTitle}>
        Explore key background pages in a mobile-friendly format with curated links and archive imagery.
      </Text>

      <LinkCard
        href="/history/our-history"
        title="Our History"
        summary="How the Association was formed, how the fleet evolved, and how Dynamo remembrance continues."
        image={require('../../../assets/images/history/our-history.jpg')}
      />

      <LinkCard
        href="/history/committee"
        title="Committee"
        summary="Meet the committee team and understand how ADLS governance and member support are organised."
        image={require('../../../assets/images/history/committee.jpg')}
      />

      <LinkCard
        href="/history/about-dunkirk"
        title="About Dunkirk"
        summary="A concise mobile overview of Operation Dynamo and why the Little Ships story still matters."
        image={require('../../../assets/images/history/about-dunkirk.jpg')}
      />

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>The Ships</Text>
        <Text style={styles.sectionSummary}>
          Browse vessel-focused sections, from today&apos;s member fleet to the wider historical record.
        </Text>

        <LinkCard
          href="/history/current-members"
          title="Our Current Members"
          summary="A snapshot of active ADLS member vessels currently in the Association fleet."
          image={require('../../../assets/images/history/current-members.jpg')}
        />

        <LinkCard
          href="/history/all-known-ships"
          title="All Known Ships"
          summary="A broad reference list of known Little Ships linked to Operation Dynamo and ADLS records."
          image={require('../../../assets/images/history/all-known-ships.jpg')}
        />

        <LinkCard
          href="/history/lost-missing"
          title="Lost & Missing"
          summary="A remembrance-focused section for vessels known lost, sunk, or with uncertain outcomes."
          image={require('../../../assets/images/history/lost-missing.jpg')}
        />
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Books</Text>
        <Text style={styles.sectionSummary}>
          Reference book list from ADLS, including cover images and publication details.
        </Text>
        <LinkCard
          href="/history/books"
          title="Books"
          summary="Browse the complete ADLS book collection with images and publication details."
          image={{ uri: 'https://static.wixstatic.com/media/5c7040_acc0eae2ba9e4bcf96d38ca6ba4eeb49~mv2.jpg' }}
        />
      </View>

      <LinkCard
        href="/history/identifying-dls"
        title="Identifying DLS"
        summary="ADLS archivist guidance on researching whether a vessel took part in Operation Dynamo."
        image={{ uri: 'https://static.wixstatic.com/media/5c7040_efb0f881ac724534adfed3ebcf538073~mv2.jpg' }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F8FB',
    padding: 16,
    gap: 12,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 26,
    fontWeight: '700',
  },
  subTitle: {
    color: '#3F6077',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    color: '#0E2E4A',
    fontSize: 21,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionSummary: {
    color: '#3F6077',
    lineHeight: 20,
    marginBottom: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    color: '#123C5C',
    fontSize: 17,
    fontWeight: '700',
  },
  cardSummary: {
    marginTop: 6,
    color: '#355A74',
    lineHeight: 20,
  },
  linkRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    color: '#0E4A72',
    fontWeight: '700',
  },
});
