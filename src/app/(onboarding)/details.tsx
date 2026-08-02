import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useThemedStyles } from '@/hooks/use-theme';
import { updateProfile } from '@/services/profile';

export default function CompleteProfileScreen() {
  const styles = useThemedStyles(stylesheet);
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const initial = (fullName || profile?.username || '?').trim().charAt(0).toUpperCase();

  const finish = async (skip: boolean) => {
    if (!user) return;
    if (!skip && !fullName.trim()) return setError('Enter your full name.');

    setError('');
    setBusy(true);

    try {
      await updateProfile(user.uid, {
        ...(skip
          ? {}
          : {
              fullName: fullName.trim(),
              phone: phone.trim(),
              dateOfBirth: dateOfBirth.trim(),
              country: country.trim(),
            }),
        // Flips the root guard from the onboarding group to the app.
        onboardingComplete: true,
      });
    } catch {
      setError('Could not save your profile. Try again.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader progress={1} />

          <View style={styles.header}>
            <ThemedText type="heading">Complete Your Profile 📋</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Don&apos;t worry, only you can see your personal data. No one else will be able to see it.
            </ThemedText>
          </View>

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <ThemedText type="subtitle" themeColor="primary">
                {initial}
              </ThemedText>
            </View>
          </View>

          <View style={styles.form}>
            <TextField
              label="Full Name"
              placeholder="Andrew Ainsley"
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
            />
            <TextField
              label="Phone Number"
              placeholder="+1-300-555-0399"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TextField
              label="Date of Birth"
              placeholder="YYYY-MM-DD"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />
            <TextField
              label="Country"
              placeholder="Ghana"
              value={country}
              onChangeText={setCountry}
              error={error}
            />
          </View>

          <View style={styles.actions}>
            <Button label="Skip for now" variant="ghost" onPress={() => finish(true)} />
            <Button label="Continue" loading={busy} onPress={() => finish(false)} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
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
    avatarWrap: {
      alignItems: 'center',
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: Radius.pill,
      backgroundColor: c.backgroundElement,
      borderWidth: 2,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    form: {
      gap: Spacing.three,
      flex: 1,
    },
    actions: {
      gap: Spacing.two,
    },
  });
