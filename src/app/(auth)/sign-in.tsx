import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { createProfileIfMissing } from '@/services/profile';
import { authErrorMessage } from '@/utils/auth-errors';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      return setError('Enter your email and password.');
    }

    setError('');
    setBusy(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Accounts created before the profile document existed still need one.
      await createProfileIfMissing(cred.user.uid, {
        email: cred.user.email ?? '',
        username: cred.user.displayName ?? '',
      });
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ThemedText type="heading">Hello there 👋</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Please enter your email and password to sign in.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Email"
              placeholder="andrew.ainsley@yourdomain.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete="current-password"
              error={error}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgot}>
              <ThemedText type="small" themeColor="primary">
                Forgot Password?
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Button label="Sign In" loading={busy} onPress={handleSignIn} />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/sign-up')}
              style={styles.switch}>
              <ThemedText type="small" themeColor="textSecondary">
                Don&apos;t have an account?{' '}
                <ThemedText type="smallBold" themeColor="primary">
                  Sign up
                </ThemedText>
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    gap: Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  actions: {
    gap: Spacing.three,
  },
  switch: {
    alignItems: 'center',
  },
});
