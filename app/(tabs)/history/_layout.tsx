import { Stack } from 'expo-router';

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerBackTitle: 'Collection',
      }}>
      <Stack.Screen name="index" options={{ title: 'ADLS Collection' }} />
      <Stack.Screen name="our-history" options={{ title: 'Our History' }} />
      <Stack.Screen name="committee" options={{ title: 'Committee' }} />
      <Stack.Screen name="about-dunkirk" options={{ title: 'About Dunkirk' }} />
      <Stack.Screen name="identifying-dls" options={{ title: 'Identifying DLS' }} />
      <Stack.Screen name="books" options={{ title: 'Books' }} />
      <Stack.Screen name="current-members" options={{ title: 'Current Members' }} />
      <Stack.Screen name="all-known-ships" options={{ title: 'All Known Ships' }} />
      <Stack.Screen name="ships-gallery" options={{ title: 'Ships Gallery', headerShown: false }} />
      <Stack.Screen name="lost-missing" options={{ title: 'Lost & Missing' }} />
      <Stack.Screen name="little-ship/[ship]" options={{ title: 'Little Ship' }} />
    </Stack>
  );
}
