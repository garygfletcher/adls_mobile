import { Linking, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';

const LINKS = [
  { label: 'UK Ship Register (Transcript of Registry)', url: 'http://www.mcga.gov.uk/c4mca/ukr-home/pleasurecraft-smallships/fees-pleasure.htm' },
  { label: 'Naval History', url: 'http://www.naval-history.net/' },
  { label: 'Dunkirk List at Royal Museums Greenwich', url: 'https://www.rmg.co.uk/discover/researchers/research-guides/research-guide-e2-world-war-two-guide-dunkirk-list' },
  { label: 'National Maritime Museum Royal Navy Sources', url: 'http://www.rmg.co.uk/researchers/library/research-guides/the-royal-navy/research-guide-b3-the-royal-navy-sources-for-enquiries' },
  { label: 'National Historic Ships Register', url: 'http://www.nationalhistoricships.org.uk/' },
  { label: 'National Maritime Museum Cornwall Databases', url: 'https://nmmc.co.uk/explore/databases/' },
  { label: 'British Newspaper Archive', url: 'http://www.britishnewspaperarchive.co.uk/' },
  { label: 'Beken of Cowes Archive', url: 'http://www.beken.co.uk/archive.htm' },
  { label: 'Simplon Postcards', url: 'http://www.simplonpc.co.uk/' },
  { label: 'Thames Passenger Boats and Dynamo', url: 'https://thameshighway.wordpress.com/2017/06/03/thames-passenger-boats-operation-dynamo-dunkirk-1940/' },
  { label: 'Thames Tugs at Dunkirk', url: 'http://thamestugs.co.uk/DUNKIRK.php' },
  { label: 'RNLI Dunkirk Timeline', url: 'https://rnli.org/about-us/our-history/timeline/1940-dunkirk-little-ships' },
  { label: 'Grimsby Fishing Heritage Centre', url: 'https://www.nelincs.gov.uk/culture-events-and-tourism/grimsby-fishing-heritage-centre/' },
  { label: 'Thames Sailing Barge Trust Dunkirk Page', url: 'http://www.bargetrust.org/dunkirk' },
  { label: 'William Osborne Owners Club', url: 'http://www.williamosborneownersclub.co.uk/' },
  { label: 'Rampart Owners Club', url: 'http://rampartownersclub.com/' },
  { label: 'Silvers Marine History', url: 'http://www.silversmarine.co.uk/history.htm' },
  { label: 'Little Ship Club Dunkirk History', url: 'https://littleshipclub.co.uk/news/how-lsc-got-involved-dunkirk-little-ships' },
  { label: 'Royal Motor Yacht Club History', url: 'https://www.rmyc.club/rmyc/history/' },
  { label: 'Dunkirk Revisited', url: 'http://www.dunkirk-revisited.co.uk/' },
  { label: 'To Rescue Our Soldiers (PDF)', url: 'https://www.dropbox.com/s/f3tn9vj4aia19q5/To_Rescue_Our_Soldiers-Dunkirk_Evac._Paper_v.%234.9.pdf?dl=0' },
  { label: 'The Dunkirk Project', url: 'https://thedunkirkproject.wordpress.com/' },
  { label: 'The Tigris of Dunkirk', url: 'https://m.facebook.com/The-Tigris-of-Dunkirk-109078799604859/' },
  { label: 'The Dunkirk Evacuation in 100 Objects', url: 'https://www.pen-and-sword.co.uk/The-Dunkirk-Evacuation-in-100-Objects-Hardback/p/13931' },
];

function ExternalLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={styles.linkChip}>
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.linkUrl}>{url}</Text>
    </Pressable>
  );
}

export default function IdentifyingDlsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: 'https://static.wixstatic.com/media/5c7040_efb0f881ac724534adfed3ebcf538073~mv2.jpg' }} style={styles.heroImage} />

      <Text style={styles.title}>Was My Boat at Dunkirk?</Text>
      <Text style={styles.subtitle}>Archivist Advice</Text>
      <Text style={styles.body}>
        The ADLS has a comprehensive archive of material relating to Operation Dynamo and the role of the
        Little Ships. In order for any boat to be accorded the privilege of wearing the "Dunkirk 1940"
        plaque and flying the House Flag, that vessel must be proven to have taken part in Operation Dynamo.
      </Text>
      <Text style={styles.body}>
        The Honorary Archivist is always pleased to hear from anyone who believes their vessel participated
        in Operation Dynamo. Please send as much information as possible to substantiate any claim to:
        {' '}
        <Text style={styles.inlineLink} onPress={() => Linking.openURL('mailto:info@adls.org.uk')}>
          info@adls.org.uk
        </Text>
        .
      </Text>
      <Text style={styles.body}>
        Please note: the ADLS Archivist is unable to research the provenance of an individual vessel. The
        Archivist&apos;s role is to evaluate the veracity of evidence provided in support of a claim that a vessel
        took part in Operation Dynamo.
      </Text>
      <Text style={styles.body}>
        I&apos;m often asked for advice on researching individual boats, so this guide sets out the sources
        available. Many sources are online, while others require visits to specific institutions. A simple
        starting point is to search for the boat name together with the word &quot;boat&quot;; this can sometimes
        reveal old sales details or published references.
      </Text>

      <Text style={styles.sectionTitle}>I Think My Boat Took Part in Operation Dynamo</Text>

      <View style={styles.sectionCard}>
        <Image source={{ uri: 'https://static.wixstatic.com/media/5c7040_7f0a03ac142042b3bdb9a0208cce3d91~mv2.jpg' }} style={styles.imageTall} />
        <Text style={styles.sectionHeading}>Ships Registry Document</Text>
        <Text style={styles.body}>
          All commercial vessels and most pre-war pleasure boats were registered and had a six-figure
          official number. This was often carved on a deck beam, usually in the saloon. Using this number,
          you can contact the UK Ship Register to purchase a copy of the Part 1 registration transcript. The
          registry shows the boat&apos;s name, builder, date of build, dimensions, engines and owner details, and
          it should have been updated with changes of ownership and name.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Image source={{ uri: 'https://static.wixstatic.com/media/5c7040_1e5db40aacac42bd9a40a0953cdeff24~mv2.jpg' }} style={styles.imageWide} />
        <Text style={styles.sectionHeading}>Lloyd&apos;s Register</Text>
        <Text style={styles.body}>
          Lloyd&apos;s Register of Ships was first published in 1764 and provides detailed vessel data including
          previous names, official number, rig, tonnage, dimensions, machinery, builder, owners, and port of
          registry. Lloyd&apos;s Register of Yachts ran from 1879 to 1939, and again from 1947 to 1980. Copies
          can be inspected at the National Maritime Museum, Greenwich.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sideBySide}>
          <Image source={{ uri: 'https://static.wixstatic.com/media/5c7040_71d1d2ee336f477b9701cf3d25e23200~mv2.jpeg' }} style={styles.sideImage} />
          <Image source={{ uri: 'https://static.wixstatic.com/media/5c7040_e576536c85b94a05a539c4bee016a78a~mv2.jpeg' }} style={styles.sideImage} />
        </View>
        <Text style={styles.sectionHeading}>Ministry of War Transport List</Text>
        <Text style={styles.body}>
          Vessels commandeered during the war were recorded on the Ministry of War Transport list. The ADLS
          copy includes vessel and owner names, type, build year, tonnage, usage and key service dates,
          including payment details.
        </Text>
        <Text style={styles.body}>
          The Admiralty only allowed one vessel under a given name at a time, so duplicate names were often
          changed. The Admiralty did not continue civilian registration details in the same way, so
          ex-commandeered vessels were sometimes later listed in Lloyd&apos;s without official numbers. This list
          is a useful reference, though it does not always describe exactly where each vessel was used.
          Vessels built by the Admiralty may have a number carved into the side of the stem post.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Usefull Resources</Text>
      <Text style={styles.body}>
        There is a website called www.naval-history.net which lists where naval vessels were stationed in
        January 1942 and includes pages on Operations Dynamo, Aerial and Cycle. The site search can help
        locate individual vessels, although results are not always complete.
      </Text>
      <Text style={styles.body}>
        In 1947 Lt Col. Orde compiled &quot;The Dunkirk List&quot; using logs from many of the larger vessels that
        were at Dunkirk. This is an important source. Copies are held at the National Maritime Museum library
        and at the Guildhall Library in London.
      </Text>
      <Text style={styles.body}>
        Other institutions worth contacting about commandeered vessels include the Imperial War Museum and
        the Naval Historical Branch in Portsmouth. The National Maritime Museum also maintains helpful
        research guides for Royal Navy enquiries.
      </Text>
      <Text style={styles.body}>
        The National Historic Ships Register is a useful reference. The National Maritime Museum Cornwall has
        archives of older yachting magazines, and their databases can sometimes reveal references to
        individual vessels.
      </Text>
      <Text style={styles.body}>
        Newspapers are another key source. The British Newspaper Archive has been used to confirm vessel
        involvement in the evacuation. Beken of Cowes also holds an extensive vessel photograph archive.
      </Text>
      <Text style={styles.body}>
        Several specialist online resources cover commercial vessels in the evacuation, including Thames
        passenger boats, Thames tugs, RNLI lifeboats and Thames sailing barges. For fishing vessels, ADLS
        notes that regional heritage centres may be able to help.
      </Text>
      <Text style={styles.body}>
        While many original builders no longer exist in their former form, some owners clubs and history
        sites preserve records and context that can support provenance research.
      </Text>
      <Text style={styles.body}>
        Using Lloyd&apos;s owner details can also help infer likely moorings. For example, if an owner address
        and yacht club are known from period records, a probable home port can often be identified.
      </Text>
      <Text style={styles.body}>
        Additional online references and lesser-known books include work by John Richard, Julian Wilson,
        The Dunkirk Project, Steve Hastings, and Martin Mace&apos;s &quot;The Dunkirk Evacuation in 100 Objects&quot;.
      </Text>

      <View style={styles.linksWrap}>
        {LINKS.map((item) => (
          <ExternalLink key={item.url} label={item.label} url={item.url} />
        ))}
      </View>

      <Text style={styles.body}>
        Other contacts mentioned in the ADLS material include Imperial War Museum enquiries
        (mail@iwm.org.uk), and the Naval Historical Branch, No. 24 Store, PP20, Main Road, HM Naval Base,
        Portsmouth, PO1 3LU (Tel: 02392 725 187).
      </Text>
      <Text style={styles.body}>John Tough - Honorary Archivist, June 2018.</Text>
      <Text style={styles.body}>Good Luck.</Text>

      <Image source={{ uri: 'https://static.wixstatic.com/media/5c7040_906706184a104545988534b0892e0aaf~mv2.jpg' }} style={styles.footerImage} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F8FB',
    padding: 16,
    gap: 12,
  },
  heroImage: {
    width: '100%',
    height: 210,
    borderRadius: 12,
  },
  footerImage: {
    width: '100%',
    height: 190,
    borderRadius: 12,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#355A74',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 8,
    color: '#0E2E4A',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeading: {
    color: '#123C5C',
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: '#355A74',
    lineHeight: 21,
  },
  inlineLink: {
    color: '#0E4A72',
    textDecorationLine: 'underline',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    overflow: 'hidden',
    padding: 12,
    gap: 10,
  },
  imageTall: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  imageWide: {
    width: '100%',
    height: 190,
    borderRadius: 10,
  },
  sideBySide: {
    flexDirection: 'row',
    gap: 8,
  },
  sideImage: {
    width: '49%',
    height: 170,
    borderRadius: 10,
  },
  linksWrap: {
    gap: 8,
  },
  linkChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 10,
    gap: 4,
  },
  linkLabel: {
    color: '#123C5C',
    fontWeight: '700',
  },
  linkUrl: {
    color: '#0E4A72',
    fontSize: 12,
  },
});
