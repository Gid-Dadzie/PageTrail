import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { ThemedText } from '@/components/themed-text';
import { StarRating } from '@/components/ui/star-rating';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { Post, subscribeToFeed, toggleLike } from '@/services/feed';
import { relativeTime } from '@/utils/format';

export default function FeedScreen() {
  const styles = useThemedStyles(stylesheet);
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToFeed((next) => {
      setPosts(next);
      setLoading(false);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="heading">Feed</ThemedText>
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.empty}>
                <ThemedText type="small" themeColor="textTertiary" style={styles.emptyText}>
                  No posts yet. Finish a book or write a review and it will appear here for other
                  readers.
                </ThemedText>
                <Link href="/(tabs)/shelves" asChild>
                  <Pressable accessibilityRole="button">
                    <ThemedText type="smallBold" themeColor="primary">
                      Go to your shelves
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
            )
          }
          renderItem={({ item }) => <PostCard post={item} viewerId={user?.uid ?? ''} />}
        />
      </View>
    </SafeAreaView>
  );
}

const KIND_COPY: Record<Post['kind'], string> = {
  review: 'reviewed',
  progress: 'is reading',
  finished: 'finished',
  listing: 'listed for exchange',
};

function PostCard({ post, viewerId }: { post: Post; viewerId: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const liked = post.likedBy.includes(viewerId);

  const handleLike = () => {
    if (!viewerId) return;
    // Fire and forget: the Firestore listener re-renders with the new state.
    void toggleLike(post.id, viewerId, liked);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.avatar}>
          <ThemedText type="captionBold" themeColor="primary">
            {post.authorName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.cardHeadMeta}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {post.authorName}{' '}
            <ThemedText type="small" themeColor="textSecondary">
              {KIND_COPY[post.kind]}
            </ThemedText>
          </ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            {relativeTime(post.createdAt)}
          </ThemedText>
        </View>
      </View>

      {post.bookId ? (
        <Link href={{ pathname: '/book/[id]', params: { id: post.bookId } }} asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.bookRow, pressed && styles.pressed]}>
            <BookCover uri={post.bookCover} title={post.bookTitle} width={44} />
            <View style={styles.bookMeta}>
              <ThemedText type="captionBold" numberOfLines={2}>
                {post.bookTitle}
              </ThemedText>
              {post.rating > 0 ? <StarRating value={post.rating} size={11} /> : null}
            </View>
          </Pressable>
        </Link>
      ) : null}

      {post.text ? <ThemedText type="small">{post.text}</ThemedText> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          onPress={handleLike}
          style={styles.action}
          hitSlop={Spacing.two}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? theme.danger : theme.textSecondary}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            {post.likedBy.length}
          </ThemedText>
        </Pressable>

        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="caption" themeColor="textSecondary">
            {post.commentCount}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
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
      paddingHorizontal: Spacing.four,
    },
    list: {
      gap: Spacing.two,
      paddingHorizontal: Spacing.four,
      paddingBottom: Spacing.four,
      flexGrow: 1,
    },
    card: {
      gap: Spacing.two,
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: Radius.pill,
      backgroundColor: c.primarySubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeadMeta: {
      flex: 1,
    },
    bookRow: {
      flexDirection: 'row',
      gap: Spacing.two,
      padding: Spacing.two,
      borderRadius: Radius.sm,
      backgroundColor: c.background,
    },
    bookMeta: {
      flex: 1,
      gap: Spacing.one,
      justifyContent: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.four,
      paddingTop: Spacing.one,
    },
    action: {
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
    emptyText: {
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.75,
    },
  });
