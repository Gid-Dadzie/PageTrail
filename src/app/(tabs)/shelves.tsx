import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StarRating } from '@/components/ui/star-rating';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { SHELF_LABELS, ShelfEntry, ShelfStatus, subscribeToShelf } from '@/services/shelves';

const TABS: ShelfStatus[] = ['reading', 'read', 'wantToRead'];

export default function ShelvesScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ShelfEntry[]>([]);
  const [active, setActive] = useState<ShelfStatus>('reading');

  useEffect(() => {
    if (!user) return;
    return subscribeToShelf(user.uid, setEntries);
  }, [user]);

  const counts = useMemo(
    () =>
      TABS.reduce<Record<string, number>>(
        (acc, status) => ({ ...acc, [status]: entries.filter((e) => e.status === status).length }),
        {}
      ),
    [entries]
  );

  const visible = entries.filter((e) => e.status === active);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="heading">Your Shelves</ThemedText>
          <Link href="/stats" asChild>
            <Pressable accessibilityRole="button">
              <ThemedText type="caption" themeColor="primary">
                View stats
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        <View style={styles.tabs}>
          {TABS.map((status) => {
            const isActive = active === status;
            return (
              <Pressable
                key={status}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActive(status)}
                style={[styles.tab, isActive && styles.tabActive]}>
                <ThemedText
                  type="caption"
                  themeColor={isActive ? 'onPrimary' : 'textSecondary'}>
                  {SHELF_LABELS[status]} ({counts[status] ?? 0})
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyShelf status={active} />}
          renderItem={({ item }) => <ShelfRow entry={item} />}
        />
      </View>
    </SafeAreaView>
  );
}

function ShelfRow({ entry }: { entry: ShelfEntry }) {
  const pct = entry.totalPages > 0 ? entry.progress / entry.totalPages : 0;

  return (
    <Link href={{ pathname: '/book/[id]', params: { id: entry.bookId } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <BookCover uri={entry.coverUrl} title={entry.title} width={56} />

        <View style={styles.rowMeta}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {entry.title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {entry.authors.join(', ')}
          </ThemedText>

          {entry.status === 'reading' ? (
            <View style={styles.progressWrap}>
              <ProgressBar value={pct} height={4} />
              <ThemedText type="caption" themeColor="textTertiary">
                {entry.totalPages > 0
                  ? `${entry.progress} / ${entry.totalPages} pages · ${Math.round(pct * 100)}%`
                  : `${entry.progress} pages read`}
              </ThemedText>
            </View>
          ) : null}

          {entry.rating > 0 ? <StarRating value={entry.rating} size={12} /> : null}
        </View>
      </Pressable>
    </Link>
  );
}

function EmptyShelf({ status }: { status: ShelfStatus }) {
  const copy: Record<ShelfStatus, string> = {
    reading: 'Nothing on the go. Start a book from Discover and it will show up here.',
    read: 'No finished books yet. Books you complete land here — and earn PageCoins.',
    wantToRead: 'Your wishlist is empty. Add books you want to read next from Discover.',
  };

  return (
    <View style={styles.empty}>
      <ThemedText type="small" themeColor="textTertiary" style={styles.emptyText}>
        {copy[status]}
      </ThemedText>
      <Link href="/discover" asChild>
        <Pressable accessibilityRole="button">
          <ThemedText type="smallBold" themeColor="primary">
            Browse books
          </ThemedText>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: Spacing.three,
    paddingTop: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  tab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundElement,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
  },
  rowMeta: {
    flex: 1,
    gap: Spacing.one,
    justifyContent: 'center',
  },
  progressWrap: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
