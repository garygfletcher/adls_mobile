import { ScrollView, StyleSheet, Text, View, Image } from 'react-native';

export default function AboutDunkirkScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../../../assets/images/history/about-dunkirk.jpg')} style={styles.imageLarge} />
      <Image source={require('../../../assets/images/history/about-dunkirk-2.jpg')} style={styles.imageTall} />
      <Text style={styles.title}>About Dunkirk</Text>
      <Text style={styles.body}>
        Operation Dynamo took place between late May and early June 1940, when Allied forces were
        surrounded in northern France and evacuation from Dunkirk became an urgent necessity.
      </Text>
      <Text style={styles.body}>
        The operation combined Royal Navy command, military organisation, and the contribution of many
        civilian and small craft. Those boats, later known collectively as the Little Ships, helped bridge
        the critical gap between beaches, harbour points, and larger evacuation vessels.
      </Text>
      <Text style={styles.body}>
        Dunkirk remains significant not only for the number of lives saved, but for the example it set in
        collective effort under extreme pressure. ADLS preserves that maritime dimension by sustaining boats
        and stories directly connected to the event.
      </Text>

      <View style={styles.keyFactsCard}>
        <Text style={styles.keyFactsTitle}>Key Themes</Text>
        <Text style={styles.keyFact}>• Civilian and naval cooperation under wartime conditions</Text>
        <Text style={styles.keyFact}>• Preservation of vessel-based historical evidence</Text>
        <Text style={styles.keyFact}>• Ongoing remembrance through active heritage participation</Text>
      </View>
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
  imageTall: {
    width: '100%',
    height: 270,
    borderRadius: 12,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: '#355A74',
    lineHeight: 21,
  },
  keyFactsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 12,
    gap: 8,
  },
  keyFactsTitle: {
    color: '#123C5C',
    fontSize: 16,
    fontWeight: '700',
  },
  keyFact: {
    color: '#355A74',
    lineHeight: 20,
  },
});
