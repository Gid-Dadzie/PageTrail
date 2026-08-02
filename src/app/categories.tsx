import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GENRES } from '@/constants/genres';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** A glyph per genre so the tiles read as a designed set, not a text list. */
const GENRE_ICONS: Record<string, IconName> = {
  romance: 'heart',
  fantasy: 'sparkles',
  'sci-fi': 'planet',
  horror: 'skull',
  mystery: 'search',
  thriller: 'flash',
  psychology: 'bulb',
  inspiration: 'star',
  comedy: 'happy',
  action: 'flame',
  adventure: 'compass',
  cartoon: 'color-palette',
  childrens: 'balloon',
  'art-photography': 'camera',
  'food-drink': 'restaurant',
  biography: 'person',
  'science-technology': 'flask',
  'guide-how-to': 'construct',
  travel: 'airplane',
};

/**
 * The browse screen reached from Home's "See all": the "Free to read" shortcut
 * plus the full genre grid. A pushed stack screen so it carries a back button —
 * unlike the Discover tab, which "See all" used to jump to laterally and strand
 * the user with no way back.
 */
export default function CategoriesScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenHeader title="Browse" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show all free-to-read books"
          onPress={() => router.push('/free')}
          style={({ pressed }) => [styles.freeBanner, pressed && styles.pressed]}>
          <View style={styles.freeIcon}>
            <Ionicons name="book" size={20} color={theme.onPrimary} />
          </View>
          <View style={styles.freeBannerText}>
            <ThemedText type="smallBold" themeColor="onPrimary">
              Free to read
            </ThemedText>
            <ThemedText type="caption" themeColor="onPrimary">
              Public-domain classics you can read right in the app
            </ThemedText>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.onPrimary} />
        </Pressable>

        <ThemedText type="defaultBold" style={styles.sectionTitle}>
          Explore by Genre
        </ThemedText>

        <View style={styles.grid}>
          {GENRES.map((genre) => (
            <Pressable
              key={genre.slug}
              accessibilityRole="button"
              accessibilityLabel={genre.label}
              // Pressable (not Link asChild): on web an <a> is inline and drops
              // the tile's width/height, collapsing the grid.
              onPress={() => router.push({ pathname: '/genre/[slug]', params: { slug: genre.slug } })}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <View style={styles.tileIcon}>
                <Ionicons
                  name={GENRE_ICONS[genre.slug] ?? 'book'}
                  size={18}
                  color={theme.primary}
                />
              </View>
              <ThemedText type="smallBold" numberOfLines={2} style={styles.tileLabel}>
                {genre.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
    },
    header: {
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
    },
    content: {
      padding: Spacing.four,
      gap: Spacing.three,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    freeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      padding: Spacing.three,
      borderRadius: Radius.lg,
      backgroundColor: c.primary,
    },
    freeIcon: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(26, 18, 6, 0.18)',
    },
    freeBannerText: {
      flex: 1,
      gap: 2,
    },
    sectionTitle: {
      marginTop: Spacing.one,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      // space-between provides the column gutter; rowGap spaces the rows.
      rowGap: Spacing.three,
    },
    tile: {
      width: '48%',
      height: 96,
      padding: Spacing.three,
      borderRadius: Radius.lg,
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'space-between',
    },
    tileIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySubtle,
    },
    tileLabel: {
      marginTop: Spacing.one,
    },
    pressed: {
      opacity: 0.75,
    },
  });
