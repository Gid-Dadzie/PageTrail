import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/book-cover';
import { ThemedText } from '@/components/themed-text';
import { StarRating } from '@/components/ui/star-rating';
import { Spacing } from '@/constants/theme';
import type { Book } from '@/services/books';

export type BookCardProps = {
  book: Book;
  width?: number;
};

/**
 * Poster-style card used in the Home rails and grids.
 *
 * Navigates via `router.push` rather than `<Link asChild>` on purpose: on web,
 * Link renders an inline `<a>`, which ignores the card's `width` and lets long
 * titles overflow the column. A Pressable renders a block element that honours
 * the width, so titles clamp correctly.
 */
export function BookCard({ book, width = 116 }: BookCardProps) {
  const router = useRouter();

  return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={book.title}
        onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}
        style={({ pressed }) => [{ width }, pressed && styles.pressed]}>
        <BookCover uri={book.coverUrl} title={book.title} width={width} />

        <View style={styles.meta}>
          {/* Fixed two-line height so short and long titles yield equal-height
              cards — otherwise grid rows misalign. */}
          <ThemedText type="captionBold" numberOfLines={2} style={styles.title}>
            {book.title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {book.authors[0]}
          </ThemedText>
          {/* Always reserve the rating row's height so cards without a rating
              stay aligned with those that have one. */}
          <View style={styles.rating}>
            {book.averageRating > 0 ? (
              <>
                <StarRating value={book.averageRating} size={11} />
                <ThemedText type="caption" themeColor="textTertiary">
                  {book.averageRating.toFixed(1)}
                </ThemedText>
              </>
            ) : null}
          </View>
        </View>
      </Pressable>
  );
}

/** caption/captionBold line height is 16px (see themed-text). */
const LINE = 16;

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
  meta: {
    gap: 2,
    paddingTop: Spacing.two,
  },
  title: {
    height: LINE * 2,
  },
  rating: {
    height: LINE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
