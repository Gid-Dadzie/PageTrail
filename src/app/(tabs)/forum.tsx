import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  categoryLabel,
  FORUM_CATEGORIES,
  ForumCategory,
  subscribeToThreads,
  Thread,
} from '@/services/forum';
import { relativeTime } from '@/utils/format';

type Filter = ForumCategory | 'all';

export default function ForumScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    return subscribeToThreads((next) => {
      setThreads(next);
      setLoading(false);
    });
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? threads : threads.filter((t) => t.category === filter)),
    [threads, filter]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="heading">Discussions</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a discussion"
            onPress={() => router.push('/forum/new')}
            style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}>
            <Ionicons name="add" size={18} color={Colors.onPrimary} />
            <ThemedText type="captionBold" themeColor="onPrimary">
              New
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}>
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {FORUM_CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              selected={filter === c.value}
              onPress={() => setFilter(c.value)}
            />
          ))}
        </ScrollView>

        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyBadge}>
                  <Ionicons name="chatbubbles-outline" size={32} color={Colors.textTertiary} />
                </View>
                <ThemedText type="defaultBold">No discussions yet</ThemedText>
                <ThemedText type="small" themeColor="textTertiary" style={styles.centered}>
                  {filter === 'all'
                    ? 'Start the first one — ask a question, share a recommendation, or open a debate.'
                    : 'Nothing in this category yet. Start a discussion to get it going.'}
                </ThemedText>
                <Pressable accessibilityRole="button" onPress={() => router.push('/forum/new')}>
                  <ThemedText type="smallBold" themeColor="primary">
                    Start a discussion
                  </ThemedText>
                </Pressable>
              </View>
            )
          }
          renderItem={({ item }) => <ThreadRow thread={item} />}
        />
      </View>
    </SafeAreaView>
  );
}

function ThreadRow({ thread }: { thread: Thread }) {
  return (
    <Link href={{ pathname: '/forum/[id]', params: { id: thread.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.rowTop}>
          <View style={styles.categoryTag}>
            <ThemedText type="caption" themeColor="primary">
              {categoryLabel(thread.category)}
            </ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textTertiary">
            {relativeTime(thread.lastReplyAt)}
          </ThemedText>
        </View>

        <ThemedText type="smallBold" numberOfLines={2}>
          {thread.title}
        </ThemedText>
        {thread.body ? (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
            {thread.body}
          </ThemedText>
        ) : null}

        <View style={styles.rowBottom}>
          <ThemedText type="caption" themeColor="textTertiary">
            {thread.authorName}
          </ThemedText>
          <View style={styles.replyCount}>
            <Ionicons name="chatbubble-outline" size={12} color={Colors.textTertiary} />
            <ThemedText type="caption" themeColor="textTertiary">
              {thread.replyCount}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    </Link>
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
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  filtersScroll: {
    // Keep the chip row at its natural height instead of stretching to fill
    // the column, which would inflate the chips into tall pills.
    flexGrow: 0,
  },
  filters: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  row: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySubtle,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  replyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyBadge: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
