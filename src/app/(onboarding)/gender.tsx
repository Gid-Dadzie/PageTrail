import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useThemedStyles } from '@/hooks/use-theme';
import { Gender, updateProfile } from '@/services/profile';

const OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'I am male' },
  { value: 'female', label: 'I am female' },
  { value: 'unspecified', label: 'Rather not say' },
];

export default function GenderScreen() {
  const styles = useThemedStyles(stylesheet);
  const router = useRouter();
  const { user, profile } = useAuth();
  const [selected, setSelected] = useState<Gender | ''>(profile?.gender ?? '');
  const [busy, setBusy] = useState(false);

  const handleContinue = async () => {
    if (!user || !selected) return;
    setBusy(true);
    try {
      await updateProfile(user.uid, { gender: selected });
      router.push('/(onboarding)/age');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <ScreenHeader progress={0.25} />

        <View style={styles.header}>
          <ThemedText type="heading">What is your gender?</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Select gender for better content recommendations. You can skip this.
          </ThemedText>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((option) => {
            const active = selected === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setSelected(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  active && styles.optionActive,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="default">{option.label}</ThemedText>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button
            label="Skip"
            variant="ghost"
            onPress={() => router.push('/(onboarding)/age')}
          />
          <Button
            label="Continue"
            loading={busy}
            disabled={!selected}
            onPress={handleContinue}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
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
    options: {
      gap: Spacing.two,
      flex: 1,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.three,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundElement,
    },
    optionActive: {
      borderColor: c.primary,
    },
    pressed: {
      opacity: 0.75,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.textTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: {
      borderColor: c.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
    },
    actions: {
      gap: Spacing.two,
    },
  });
