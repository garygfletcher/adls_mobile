import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reference?: string | string[] }>();
  const referenceParam = Array.isArray(params.reference) ? params.reference[0] : params.reference;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="checkmark-circle" size={56} color="#0E7A3E" />
        <Text style={styles.title}>Order Submitted</Text>
        <Text style={styles.message}>
          Thank you for your order. Your request has been sent to the Shop Officer, and we will be in
          touch shortly to process your order.
        </Text>
        {referenceParam ? <Text style={styles.reference}>Reference: {referenceParam}</Text> : null}

        <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/shop')}>
          <Text style={styles.buttonText}>Back to Shop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FB',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderColor: '#D8E2EC',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    marginTop: 10,
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  message: {
    marginTop: 10,
    color: '#3E5D76',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  reference: {
    marginTop: 10,
    color: '#0E4A72',
    fontWeight: '700',
    fontSize: 14,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
