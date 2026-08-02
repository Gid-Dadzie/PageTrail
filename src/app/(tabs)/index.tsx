import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCard } from '@/components/book-card';
import { BookCover } from '@/components/book-cover';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GENRES, genreBySlug } from '@/constants/genres';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { fetchBooksByGenre, fetchTopCharts } from '@/services/books';
import { ShelfEntry, subscribeToShelf } from '@/services/shelves';

export default function HomeScreen() {
  const styles = useThemedStyles(stylesheet);
  const { user, profile } = useAuth();
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToShelf(user.uid, setShelf);
  }, [user]);

  // Recommend from a genre the reader picked in onboarding, falling back to a
  // general chart for readers who skipped that step.
  const pickedGenre = profile?.favouriteGenres?.[0];
  const recommendSubject = pickedGenre ? genreBySlug(pickedGenre)?.subject : undefined;

  const trending = useAsync((signal) => fetchTopCharts(12, signal), []);
  const recommended = useAsync(
    (signal) =>
      recommendSubject
        ? fetchBooksByGenre(recommendSubject, 12, signal)
        : fetchTopCharts(12, signal),
    [recommendSubject]
  );

  const reading = shelf.filter((e) => e.status === 'reading');
  const firstName = (profile?.fullName || profile?.username || 'reader').split(' ')[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <ThemedText type="heading" themeColor="primary">
              PageTrail
            </ThemedText>
            <View style={styles.headerActions}>
              <CoinPill coins={profile?.coins ?? 0} />
              <IconButton name="notifications-outline" href="/notifications" label="Notifications" />
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Welcome back, {firstName}.
          </ThemedText>
        </View>

        {reading.length > 0 ? (
          <Section title="Continue Reading">
            <FlatList
              horizontal
              data={reading}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => <ContinueCard entry={item} />}
            />
          </Section>
        ) : null}

        <Section title="Explore by Genre" actionLabel="See all" actionHref="/categories">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}>
            {GENRES.slice(0, 8).map((genre) => (
              <Link
                key={genre.slug}
                href={{ pathname: '/genre/[slug]', params: { slug: genre.slug } }}
                asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.genrePill, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">{genre.label}</ThemedText>
                </Pressable>
              </Link>
            ))}
          </ScrollView>
        </Section>

        <Section title="Trending Now">
          <BookRail state={trending} />
        </Section>

        <Section
          title={recommendSubject ? `Because you like ${genreBySlug(pickedGenre!)?.label}` : 'Recommended For You'}>
          <BookRail state={recommended} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function CoinPill({ coins }: { coins: number }) {
  const styles = useThemedStyles(stylesheet);
  return (
    <Link href="/(tabs)/profile" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${coins} PageCoins`}
        style={({ pressed }) => [styles.coinPill, pressed && styles.pressed]}>
        <ThemedText type="captionBold" themeColor="primary">
          🪙 {coins}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

function IconButton({
  name,
  href,
  label,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  href: string;
  label: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={name} size={20} color={theme.text} />
    </Pressable>
  );
}

function Section({
  title,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(stylesheet);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedText type="defaultBold">{title}</ThemedText>
        {actionLabel && actionHref ? (
          <Link href={actionHref as never} asChild>
            <Pressable accessibilityRole="button">
              <ThemedText type="caption" themeColor="primary">
                {actionLabel}
              </ThemedText>
            </Pressable>
          </Link>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function BookRail({ state }: { state: ReturnType<typeof useAsync<Awaited<ReturnType<typeof fetchTopCharts>>>> }) {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  if (state.loading) {
    return (
      <View style={styles.railPlaceholder}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (state.error || !state.data?.length) {
    return (
      <View style={styles.railPlaceholder}>
        <ThemedText type="caption" themeColor="textTertiary">
          {state.error ? 'Could not load books right now.' : 'Nothing to show yet.'}
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={state.data}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      renderItem={({ item }) => <BookCard book={item} />}
    />
  );
}

function ContinueCard({ entry }: { entry: ShelfEntry }) {
  const styles = useThemedStyles(stylesheet);
  const pct = entry.totalPages > 0 ? entry.progress / entry.totalPages : 0;

  return (
    <Link href={{ pathname: '/book/[id]', params: { id: entry.bookId } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.continueCard, pressed && styles.pressed]}>
        <BookCover uri={entry.coverUrl} title={entry.title} width={54} />
        <View style={styles.continueMeta}>
          <ThemedText type="captionBold" numberOfLines={2}>
            {entry.title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            {entry.totalPages > 0
              ? `${entry.progress} / ${entry.totalPages} pages`
              : `${entry.progress} pages`}
          </ThemedText>
          <ProgressBar value={pct} height={4} />
        </View>
      </Pressable>
    </Link>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
    },
    content: {
      gap: Spacing.four,
      paddingVertical: Spacing.three,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    header: {
      paddingHorizontal: Spacing.four,
      gap: Spacing.one,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    coinPill: {
      backgroundColor: c.primarySubtle,
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
      borderRadius: Radius.pill,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: Radius.pill,
      backgroundColor: c.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      gap: Spacing.two,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.four,
    },
    rail: {
      gap: Spacing.three,
      paddingHorizontal: Spacing.four,
    },
    railPlaceholder: {
      height: 90,
      alignItems: 'center',
      justifyContent: 'center',
    },
    genrePill: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.pill,
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
    },
    continueCard: {
      flexDirection: 'row',
      gap: Spacing.two,
      width: 240,
      padding: Spacing.two,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
    },
    continueMeta: {
      flex: 1,
      gap: Spacing.one,
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.75,
    },
  });
