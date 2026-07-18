import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { CoinEntry, subscribeToLedger } from '@/services/pagecoins';
import { Post, subscribeToFeed } from '@/services/feed';
import { relativeTime } from '@/utils/format';

type Notification = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  at: Date | null;
};

/**
 * Notifications are derived from activity the app already syncs — coin events
 * and likes on your posts. Push delivery (FCM) is listed in the proposal but
 * needs a server to send from, so this is the in-app inbox only.
 */
export default function NotificationsScreen() {
  const { user } = useAuth();
  const [ledger, setLedger] = useState<CoinEntry[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToLedger(user.uid, setLedger, 25);
  }, [user]);

  useEffect(() => subscribeToFeed(setPosts, 50), []);

  const notifications = useMemo<Notification[]>(() => {
    const fromCoins: Notification[] = ledger.map((entry) => ({
      id: `coin-${entry.id}`,
      icon: entry.amount >= 0 ? 'trophy-outline' : 'pricetag-outline',
      title: entry.amount >= 0 ? `You earned ${entry.amount} PageCoins` : `You spent ${-entry.amount} PageCoins`,
      body: entry.note || 'PageCoins activity',
      at: entry.createdAt,
    }));

    const fromLikes: Notification[] = posts
      .filter((post) => post.authorId === user?.uid && post.likedBy.length > 0)
      .map((post) => ({
        id: `like-${post.id}`,
        icon: 'heart-outline' as const,
        title: `${post.likedBy.length} ${post.likedBy.length === 1 ? 'reader likes' : 'readers like'} your post`,
        body: post.bookTitle || post.text,
        at: post.createdAt,
      }));

    return [...fromCoins, ...fromLikes].sort(
      (a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0)
    );
  }, [ledger, posts, user]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ScreenHeader title="Notifications" />
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Ionicons name="notifications-off-outline" size={34} color={Colors.textTertiary} />
              </View>
              <ThemedText type="defaultBold">Empty</ThemedText>
              <ThemedText type="small" themeColor="textTertiary" style={styles.centered}>
                You don&apos;t have any notifications at this time.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name={item.icon} size={18} color={Colors.primary} />
              </View>
              <View style={styles.rowMeta}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.title}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                  {item.body}
                </ThemedText>
                <ThemedText type="caption" themeColor="textTertiary">
                  {relativeTime(item.at)}
                </ThemedText>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
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
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
    gap: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyBadge: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
});
