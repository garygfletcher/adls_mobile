import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export function LoginGate({ area }: { area: 'Shop' | 'My Ship' }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const versionText = `Version: ${Updates.updateId ?? 'embedded'}`;
  const lastUpdatedText = `Last Updated: ${
    Updates.createdAt
      ? new Date(Updates.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : 'embedded'
  }`;

  const handleLogin = async () => {
    const ok = await login(username, password);
    if (!ok) {
      setError('Invalid username or password');
      return;
    }
    setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{area} Login</Text>
        <Text style={styles.subTitle}>Sign in to access {area.toLowerCase()}.</Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Username"
          style={styles.input}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={() => void handleLogin()}>
          <Text style={styles.buttonText}>Log In</Text>
        </Pressable>

        <Text style={styles.versionText}>{versionText}</Text>
        <Text style={styles.versionText}>{lastUpdatedText}</Text>
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
    padding: 16,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 24,
    fontWeight: '700',
  },
  subTitle: {
    color: '#46627A',
    marginTop: 4,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C9D6E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  error: {
    color: '#B00020',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#0E4A72',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  versionText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#8A95A1',
    fontSize: 12,
  },
});
