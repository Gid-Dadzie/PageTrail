import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { authErrorMessage } from '@/utils/auth-errors';

/**
 * Password reset.
 *
 * The mockups show a 4-digit emailed OTP. Firebase Auth issues a signed reset
 * *link* instead, and verifying a numeric code would need a backend to mint and
 * check it — outside this prototype's Firebase-only scope. This uses the real
 * reset email so the flow actually works end to end.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) return setError('Enter your email address.');

    setError('');
    setBusy(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <ScreenHeader />
          <View style={styles.successBody}>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeGlyph}>📧</ThemedText>
            </View>
            <ThemedText type="heading" style={styles.centered}>
              You&apos;ve Got Mail
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              We sent a password reset link to {email.trim()}. Open it to choose a new password,
              then come back and sign in.
            </ThemedText>
          </View>
          <Button label="Back to Sign In" onPress={() => setSent(false)} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader />

          <View style={styles.header}>
            <ThemedText type="heading">Forgot Password 🔑</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Enter your email address. We&apos;ll send you a link to set a new password.
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
              error={error}
            />
          </View>

          <Button label="Send Reset Link" loading={busy} onPress={handleSend} />
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
    flex: 1,
  },
  header: {
    gap: Spacing.two,
  },
  form: {
    gap: Spacing.three,
    flex: 1,
  },
  successBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlyph: {
    fontSize: 44,
  },
  centered: {
    textAlign: 'center',
  },
});
