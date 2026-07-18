import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { computeStats, ShelfEntry, subscribeToShelf } from '@/services/shelves';
import { monthLabel, plural } from '@/utils/format';

export default function StatsScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ShelfEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToShelf(user.uid, setEntries);
  }, [user]);

  const stats = computeStats(entries);

  const months = Object.entries(stats.byMonth).sort(([a], [b]) => a.localeCompare(b));
  const genres = Object.entries(stats.byGenre).sort(([, a], [, b]) => b - a).slice(0, 6);

  const monthPeak = Math.max(1, ...months.map(([, n]) => n));
  const genrePeak = Math.max(1, ...genres.map(([, n]) => n));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Reading Stats" />

        <View style={styles.tiles}>
          <Tile value={String(stats.booksFinished)} label={plural(stats.booksFinished, 'book')} caption="finished" />
          <Tile value={stats.pagesRead.toLocaleString()} label="pages" caption="read" />
          <Tile
            value={stats.averageRating ? stats.averageRating.toFixed(1) : '—'}
            label="avg rating"
            caption="you gave"
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultBold">Books per month</ThemedText>
          {months.length ? (
            months.map(([key, count]) => (
              <View key={key} style={styles.barRow}>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.barLabel}>
                  {monthLabel(key)}
                </ThemedText>
                <View style={styles.barTrack}>
                  <ProgressBar value={count / monthPeak} height={8} />
                </View>
                <ThemedText type="caption" themeColor="textTertiary" style={styles.barValue}>
                  {count}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText type="caption" themeColor="textTertiary">
              Finish a book to start building your reading history.
            </ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultBold">Genre breakdown</ThemedText>
          {genres.length ? (
            genres.map(([genre, count]) => (
              <View key={genre} style={styles.barRow}>
                <ThemedText
                  type="caption"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={styles.barLabel}>
                  {genre}
                </ThemedText>
                <View style={styles.barTrack}>
                  <ProgressBar value={count / genrePeak} height={8} />
                </View>
                <ThemedText type="caption" themeColor="textTertiary" style={styles.barValue}>
                  {count}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText type="caption" themeColor="textTertiary">
              Your genre mix appears once you finish a few books.
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ value, label, caption }: { value: string; label: string; caption: string }) {
  return (
    <View style={styles.tile}>
      <ThemedText type="subtitle" themeColor="primary">
        {value}
      </ThemedText>
      <ThemedText type="caption">{label}</ThemedText>
      <ThemedText type="caption" themeColor="textTertiary">
        {caption}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
  },
  section: {
    gap: Spacing.two,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  barLabel: {
    width: 84,
  },
  barTrack: {
    flex: 1,
  },
  barValue: {
    width: 24,
    textAlign: 'right',
  },
});
