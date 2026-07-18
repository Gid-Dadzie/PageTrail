import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { createProfileIfMissing } from '@/services/profile';
import { authErrorMessage } from '@/utils/auth-errors';

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const validate = (): string => {
    if (!username.trim()) return 'Pick a username.';
    if (!email.trim()) return 'Enter your email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return '';
  };

  const handleSignUp = async () => {
    const problem = validate();
    if (problem) return setError(problem);

    setError('');
    setBusy(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateAuthProfile(cred.user, { displayName: username.trim() });
      await createProfileIfMissing(cred.user.uid, {
        username: username.trim(),
        email: email.trim(),
      });
      // The root layout's guards move to onboarding once the profile exists.
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <ScreenHeader />

          <View style={styles.header}>
            <ThemedText type="heading">Create an Account 🔐</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Enter your username, email and password. If you forget it, you&apos;ll have to reset it.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Username"
              placeholder="andrew_ainsley"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
            />
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
              autoComplete="new-password"
            />
            <TextField
              label="Confirm Password"
              placeholder="••••••••"
              value={confirm}
              onChangeText={setConfirm}
              secure
              autoComplete="new-password"
              error={error}
            />
          </View>

          <Button label="Sign Up" loading={busy} onPress={handleSignUp} />
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
  },
  header: {
    gap: Spacing.two,
  },
  form: {
    gap: Spacing.three,
    flex: 1,
  },
});
