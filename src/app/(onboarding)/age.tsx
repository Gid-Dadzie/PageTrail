import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { updateProfile } from '@/services/profile';

const AGE_RANGES = ['14-17', '18-24', '25-34', '35-44', '45-49', '50+'];

export default function AgeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [selected, setSelected] = useState(profile?.ageRange ?? '');
  const [busy, setBusy] = useState(false);

  const handleContinue = async () => {
    if (!user || !selected) return;
    setBusy(true);
    try {
      await updateProfile(user.uid, { ageRange: selected });
      router.push('/(onboarding)/genres');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <ScreenHeader progress={0.5} />

        <View style={styles.header}>
          <ThemedText type="heading">Choose Your Age 🎂</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Select an age range for better recommendations.
          </ThemedText>
        </View>

        <View style={styles.grid}>
          {AGE_RANGES.map((range) => (
            <View key={range} style={styles.gridItem}>
              <Chip
                label={range}
                selected={selected === range}
                onPress={() => setSelected(range)}
              />
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            label="Skip"
            variant="ghost"
            onPress={() => router.push('/(onboarding)/genres')}
          />
          <Button label="Continue" loading={busy} disabled={!selected} onPress={handleContinue} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    flex: 1,
    alignContent: 'flex-start',
  },
  gridItem: {
    // Two columns, accounting for the row gap between them.
    width: '48%',
    alignItems: 'stretch',
  },
  actions: {
    gap: Spacing.two,
  },
});
