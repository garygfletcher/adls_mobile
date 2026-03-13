import { HeaderBackButton } from '@react-navigation/elements';
import { Stack, useRouter } from 'expo-router';

export default function DashboardLayout() {
  const router = useRouter();
  const backToDashboard = () => {
    router.push('/(tabs)/account');
  };

  return (
    <Stack screenOptions={{ headerTitleAlign: 'center', headerBackTitle: 'Back' }}>
      <Stack.Screen
        name="meetings"
        options={{
          title: 'Members Meetings',
          headerBackTitle: 'Back',
          headerLeft: (props) => <HeaderBackButton {...props} label="Back" onPress={backToDashboard} />,
        }}
      />
      <Stack.Screen
        name="events"
        options={{
          title: 'Events',
          headerBackTitle: 'Back',
          headerLeft: (props) => <HeaderBackButton {...props} label="Back" onPress={backToDashboard} />,
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          title: 'My Orders',
          headerBackTitle: 'Back',
          headerLeft: (props) => <HeaderBackButton {...props} label="Back" onPress={backToDashboard} />,
        }}
      />
      <Stack.Screen
        name="subscription"
        options={{
          title: 'Subscription',
          headerBackTitle: 'Back',
          headerLeft: (props) => <HeaderBackButton {...props} label="Back" onPress={backToDashboard} />,
        }}
      />
      <Stack.Screen
        name="associates"
        options={{
          title: 'My Associates',
          headerBackTitle: 'Back',
          headerLeft: (props) => <HeaderBackButton {...props} label="Back" onPress={backToDashboard} />,
        }}
      />
      <Stack.Screen
        name="ships"
        options={{
          title: 'My Ships',
          headerBackTitle: 'Back',
          headerLeft: (props) => <HeaderBackButton {...props} label="Back" onPress={backToDashboard} />,
        }}
      />
      <Stack.Screen name="ships/[ship]" options={{ title: 'Ship Detail' }} />
      <Stack.Screen
        name="association-documents"
        options={{
          title: 'Association Documents',
          headerBackTitle: 'Back',
          headerLeft: (props) => <HeaderBackButton {...props} label="Back" onPress={backToDashboard} />,
        }}
      />
      <Stack.Screen
        name="publications"
        options={{
          title: 'Publications',
          headerBackTitle: 'Back',
          headerLeft: (props) => <HeaderBackButton {...props} label="Back" onPress={backToDashboard} />,
        }}
      />
    </Stack>
  );
}
