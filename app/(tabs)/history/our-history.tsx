import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

type Founder = {
  name: string;
  image: number;
};

const FOUNDERS: Founder[] = [
  {
    name: 'Raymond Baxter OBE',
    image: require('../../../assets/images/history/founders/raymond-baxter.jpg'),
  },
  {
    name: 'Charles Lamb',
    image: require('../../../assets/images/history/founders/charles-lamb.jpg'),
  },
  {
    name: 'John Knight',
    image: require('../../../assets/images/history/founders/john-knight.jpg'),
  },
];

export default function OurHistoryScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../../../assets/images/history/our-history.jpg')} style={styles.imageLarge} />
      <Text style={styles.title}>Our History</Text>
      <Text style={styles.body}>THE ASSOCIATION OF DUNKIRK LITTLE SHIPS - How it all started</Text>
      <Text style={styles.body}>
        In spring 1964, Raymond Baxter acquired one of the Little Ships. After flying over Dunkirk the
        same year, a simple family question about marking the 25th anniversary of 1940 helped trigger the
        idea of taking a Little Ship back across the Channel. That initiative became the foundation of ADLS.
      </Text>

      <Text style={styles.sectionTitle}>Founder Members</Text>
      <View style={[styles.foundersRow, isTablet && styles.foundersRowTablet]}>
        {FOUNDERS.map((founder) => (
          <View key={founder.name} style={[styles.founderCard, isTablet && styles.founderCardTablet]}>
            <Image source={founder.image} style={styles.founderImage} />
            <Text style={styles.founderName}>{founder.name}</Text>
          </View>
        ))}
      </View>

      <Image
        source={require('../../../assets/images/history/founders/scan116.jpg')}
        style={styles.archiveImage}
        resizeMode="contain"
      />

      <Text style={styles.sectionTitle}>Association Object</Text>
      <Text style={styles.body}>
        The object of the Association is to keep alive and preserve for posterity the memory and identity
        of those 'Little Ships' that went to the aid of the British Expeditionary Force in 1940 and took
        part in Operations Dynamo, Cycle and Aerial and to preserve the "Spirit of Dunkirk" by forming a
        registered Association of their present day owners and of those closely associated. Vessels from all
        three Operations are included within the ADLS and are collectively known as 'Dunkirk Little Ships'.
      </Text>
      <Text style={styles.body}>
        Qualification for full membership is simple; the current ownership of a proven Dunkirk Little Ship.
        Membership wins the right for that vessel to wear the Association's warranted House Flag, the Cross
        of St George (the flag of the Admiralty) defaced with the Arms of Dunkirk.
      </Text>
      <Text style={styles.body}>Little Ships are also entitled to display a plaque marked 'DUNKIRK 1940'.</Text>
      <Text style={styles.body}>
        The Association organises several meetings 'on the water' each year where the Little Ships may be
        seen and appreciated by the public. Every 5 years the Little Ships, supported by the Royal Navy,
        return under their own power to Dunkirk. Considering the youngest Little Ship is now over 80 years
        old, this is no small undertaking.
      </Text>
      <Text style={styles.body}>
        In 2008 the Association was privileged to have HRH Prince Michael of Kent GCVO accept the invitation
        to become the Association's Honorary Admiral.
      </Text>

      <Image source={require('../../../assets/images/history/founders/adls-flag.jpg')} style={styles.imageLarge} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F8FB',
    padding: 16,
    gap: 12,
  },
  imageLarge: {
    width: '100%',
    height: 210,
    borderRadius: 12,
  },
  archiveImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 4,
    color: '#0E2E4A',
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    color: '#355A74',
    lineHeight: 21,
  },
  foundersRow: {
    gap: 10,
  },
  foundersRowTablet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  founderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 10,
    alignItems: 'center',
  },
  founderCardTablet: {
    width: '32%',
  },
  founderImage: {
    width: 124,
    height: 124,
    borderRadius: 62,
  },
  founderName: {
    marginTop: 8,
    color: '#123C5C',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
