import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GENRES } from '@/constants/genres';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { updateProfile } from '@/services/profile';

export default function GenresScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [selected, setSelected] = useState<string[]>(profile?.favouriteGenres ?? []);
  const [busy, setBusy] = useState(false);

  const toggle = (slug: string) => {
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
    );
  };

  const handleContinue = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await updateProfile(user.uid, { favouriteGenres: selected });
      router.push('/(onboarding)/details');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <ScreenHeader progress={0.75} />

        <View style={styles.header}>
          <ThemedText type="heading">Choose the Book Genre You Like ❤️</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Select your preferred genres for recommendations, or skip for now.
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.chips} showsVerticalScrollIndicator={false}>
          {GENRES.map((genre) => (
            <Chip
              key={genre.slug}
              label={genre.label}
              selected={selected.includes(genre.slug)}
              onPress={() => toggle(genre.slug)}
            />
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label="Skip"
            variant="ghost"
            onPress={() => router.push('/(onboarding)/details')}
          />
          <Button
            label={selected.length ? `Continue (${selected.length})` : 'Continue'}
            loading={busy}
            disabled={!selected.length}
            onPress={handleContinue}
          />
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
  },
});
