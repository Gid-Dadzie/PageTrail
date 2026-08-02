import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCard } from '@/components/book-card';
import { BookCover } from '@/components/book-cover';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StarRating } from '@/components/ui/star-rating';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { Book, fetchBookById, fetchRelatedBooks } from '@/services/books';
import { findReadableEdition } from '@/services/reading';
import { discountSummary, purchaseOptions } from '@/services/commerce';
import { createPost } from '@/services/feed';
import { COIN_REWARDS, earnCoins, spendCoins } from '@/services/pagecoins';
import {
  addOrUpdateShelfEntry,
  rateShelfEntry,
  removeShelfEntry,
  SHELF_LABELS,
  ShelfEntry,
  ShelfStatus,
  subscribeToShelf,
  updateProgress,
} from '@/services/shelves';

const SHELVES: ShelfStatus[] = ['wantToRead', 'reading', 'read'];

export default function BookDetailScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();

  const book = useAsync((signal) => fetchBookById(id, signal), [id]);
  const related = useAsync(
    (signal) => (book.data ? fetchRelatedBooks(book.data, signal) : Promise.resolve([])),
    [book.data?.id]
  );
  // Whether a free public-domain edition exists, gating the "Read now" button.
  const readable = useAsync(
    (signal) => (book.data ? findReadableEdition(book.data, signal) : Promise.resolve(null)),
    [book.data?.id]
  );

  const [entry, setEntry] = useState<ShelfEntry | null>(null);
  const [pageInput, setPageInput] = useState('');
  const [seededFor, setSeededFor] = useState('');
  const [busy, setBusy] = useState(false);
  const [voucher, setVoucher] = useState('');

  useEffect(() => {
    if (!user) return;
    return subscribeToShelf(user.uid, (entries) => {
      setEntry(entries.find((e) => e.bookId === id) ?? null);
    });
  }, [user, id]);

  // Seed the page field from the shelf entry the first time it arrives for this
  // book. Adjusting during render rather than in an effect keeps the reader's
  // own typing from being overwritten by each incoming snapshot.
  if (entry && seededFor !== entry.bookId) {
    setSeededFor(entry.bookId);
    setPageInput(String(entry.progress));
  }

  if (book.loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader />
        <ActivityIndicator color={theme.primary} style={styles.pad} />
      </SafeAreaView>
    );
  }

  if (book.error || !book.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.padded}>
          <ScreenHeader />
          <ThemedText type="small" themeColor="textSecondary" style={styles.pad}>
            {book.error || 'That book could not be found.'}
          </ThemedText>
          <Button label="Go back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const data = book.data;
  const displayName = profile?.fullName || profile?.username || 'A reader';

  const setShelf = async (status: ShelfStatus) => {
    if (!user) return;
    setBusy(true);

    try {
      // Tapping the current shelf again removes the book from the shelves.
      if (entry?.status === status) {
        await removeShelfEntry(user.uid, data.id);
        return;
      }

      await addOrUpdateShelfEntry(user.uid, {
        bookId: data.id,
        title: data.title,
        authors: data.authors,
        coverUrl: data.coverUrl,
        isbn: data.isbn,
        status,
        progress: entry?.progress ?? 0,
        totalPages: data.pageCount,
        rating: entry?.rating ?? 0,
        review: entry?.review ?? '',
        categories: data.categories,
      });

      if (status === 'read') {
        // dedupeKey keeps re-shelving a book from minting coins twice.
        await earnCoins(user.uid, 'finishedBook', data.title, `finished:${data.id}`);
        await createPost({
          authorId: user.uid,
          authorName: displayName,
          authorAvatar: profile?.avatarUrl ?? '',
          kind: 'finished',
          text: `Finished ${data.title}.`,
          bookId: data.id,
          bookTitle: data.title,
          bookCover: data.coverUrl,
          rating: entry?.rating ?? 0,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveProgress = async () => {
    if (!user || !entry) return;
    const pages = parseInt(pageInput, 10);
    if (Number.isNaN(pages)) return;

    setBusy(true);
    try {
      const { finished } = await updateProgress(user.uid, data.id, pages, data.pageCount);
      if (finished) {
        await earnCoins(user.uid, 'finishedBook', data.title, `finished:${data.id}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const rate = async (rating: number) => {
    if (!user || !entry) return;
    await rateShelfEntry(user.uid, data.id, rating, entry.review);
    await earnCoins(user.uid, 'wroteReview', data.title, `review:${data.id}`);
  };

  const openBuyLink = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  /**
   * Redeems coins for a discount voucher.
   *
   * Real payment processing is out of scope per the proposal, so this issues a
   * simulated voucher code and records the spend in the ledger rather than
   * altering a retailer's checkout.
   */
  const redeemDiscount = async () => {
    if (!user || voucher) return;
    setBusy(true);
    try {
      const ok = await spendCoins(user.uid, 'purchaseDiscount', data.title);
      if (ok) setVoucher(`PT${discount.percent}-${data.id.slice(-4).toUpperCase()}`);
    } finally {
      setBusy(false);
    }
  };

  const discount = discountSummary(profile?.coins ?? 0);
  const pct = entry && data.pageCount > 0 ? entry.progress / data.pageCount : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader />

        <View style={styles.hero}>
          <BookCover uri={data.coverUrl} title={data.title} width={128} />
          <View style={styles.heroMeta}>
            <ThemedText type="defaultBold">{data.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {data.authors.join(', ')}
            </ThemedText>
            {data.averageRating > 0 ? (
              <View style={styles.ratingRow}>
                <StarRating value={data.averageRating} size={13} />
                <ThemedText type="caption" themeColor="textTertiary">
                  {data.averageRating.toFixed(1)} ({data.ratingsCount})
                </ThemedText>
              </View>
            ) : null}
            <ThemedText type="caption" themeColor="textTertiary">
              {[data.publishedYear || null, data.pageCount ? `${data.pageCount} pages` : null]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          </View>
        </View>

        <View style={styles.shelfRow}>
          {SHELVES.map((status) => (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityState={{ selected: entry?.status === status }}
              disabled={busy}
              onPress={() => setShelf(status)}
              style={[styles.shelfButton, entry?.status === status && styles.shelfButtonActive]}>
              <ThemedText
                type="caption"
                themeColor={entry?.status === status ? 'onPrimary' : 'text'}
                numberOfLines={2}
                style={styles.shelfLabel}>
                {SHELF_LABELS[status]}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {readable.data ? (
          <Button
            label="Read now · Free"
            onPress={() => router.push({ pathname: '/read/[id]', params: { id: data.id } })}
          />
        ) : null}

        {entry?.status === 'reading' ? (
          <View style={styles.card}>
            <ThemedText type="smallBold">Your progress</ThemedText>
            <ProgressBar value={pct} />
            <ThemedText type="caption" themeColor="textTertiary">
              {entry.progress} of {data.pageCount || '?'} pages · {Math.round(pct * 100)}%
            </ThemedText>
            <View style={styles.progressInput}>
              <View style={styles.flex}>
                <TextField
                  label="Pages read"
                  value={pageInput}
                  onChangeText={setPageInput}
                  keyboardType="number-pad"
                />
              </View>
              <Button label="Save" onPress={saveProgress} loading={busy} />
            </View>
          </View>
        ) : null}

        {entry ? (
          <View style={styles.card}>
            <ThemedText type="smallBold">Your rating</ThemedText>
            <StarRating value={entry.rating} size={26} onChange={rate} />
            <ThemedText type="caption" themeColor="textTertiary">
              Rating a book earns you {COIN_REWARDS.wroteReview} PageCoins the first time.
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <ThemedText type="smallBold">Buy this book</ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              Affiliate links
            </ThemedText>
          </View>

          {purchaseOptions(data).map((option) => (
            <Pressable
              key={option.retailer.id}
              accessibilityRole="link"
              onPress={() => openBuyLink(option.url)}
              style={({ pressed }) => [styles.retailerRow, pressed && styles.pressed]}>
              <Ionicons name="cart-outline" size={18} color={theme.primary} />
              <ThemedText type="small" style={styles.flex}>
                {option.retailer.name}
              </ThemedText>
              <Ionicons name="open-outline" size={15} color={theme.textTertiary} />
            </Pressable>
          ))}

          {voucher ? (
            <View style={styles.discountRow}>
              <ThemedText type="captionBold" themeColor="success">
                {discount.percent}% voucher: {voucher}
              </ThemedText>
              <ThemedText type="caption" themeColor="textTertiary">
                Simulated for this prototype — real checkout integration is future work.
              </ThemedText>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={!discount.affordable || busy}
              onPress={redeemDiscount}
              style={[styles.discountRow, !discount.affordable && styles.disabled]}>
              <ThemedText
                type="caption"
                themeColor={discount.affordable ? 'primary' : 'textTertiary'}>
                {discount.affordable
                  ? `Redeem ${discount.cost} 🪙 for ${discount.percent}% off`
                  : `${discount.shortBy} more 🪙 for a ${discount.percent}% discount`}
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <ThemedText type="smallBold">Own a physical copy?</ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            List it for exchange and PageTrail mints a Book Passport so the next reader inherits
            your notes.
          </ThemedText>
          <Button
            label="List for exchange"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/exchange', params: { bookId: data.id } })
            }
          />
        </View>

        {data.description ? (
          <View style={styles.section}>
            <ThemedText type="defaultBold">About this book</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {data.description}
            </ThemedText>
          </View>
        ) : null}

        {data.categories.length ? (
          <View style={styles.section}>
            <ThemedText type="defaultBold">Subjects</ThemedText>
            <View style={styles.tagWrap}>
              {data.categories.map((category) => (
                <View key={category} style={styles.tag}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {category}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {related.data?.length ? (
          <View style={styles.section}>
            <ThemedText type="defaultBold">Readers also liked</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}>
              {related.data.map((item: Book) => (
                <BookCard key={item.id} book={item} width={104} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
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
    padded: {
      padding: Spacing.four,
      gap: Spacing.three,
    },
    hero: {
      flexDirection: 'row',
      gap: Spacing.three,
    },
    heroMeta: {
      flex: 1,
      gap: Spacing.one,
      justifyContent: 'center',
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.one,
    },
    shelfRow: {
      flexDirection: 'row',
      gap: Spacing.two,
      // Every pill matches the tallest, so the group keeps a flat baseline when
      // a longer label ("Currently Reading") wraps to two lines.
      alignItems: 'stretch',
    },
    shelfButton: {
      // Equal thirds regardless of label length, and `basis: 0` so the widths
      // are driven by the row rather than by the text each one happens to hold.
      flex: 1,
      flexBasis: 0,
      alignItems: 'center',
      justifyContent: 'center',
      // Keeps a single-line pill from collapsing below the 44pt tap target.
      minHeight: 44,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.two,
      borderRadius: Radius.pill,
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
    },
    shelfLabel: {
      // `alignItems` only centres the text *box*, which fills the pill once the
      // label wraps — the lines themselves need this to sit centred.
      textAlign: 'center',
    },
    shelfButtonActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
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
      justifyContent: 'space-between',
    },
    progressInput: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.two,
    },
    flex: {
      flex: 1,
    },
    retailerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingVertical: Spacing.two,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    discountRow: {
      alignItems: 'center',
      paddingTop: Spacing.two,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    disabled: {
      opacity: 0.6,
    },
    section: {
      gap: Spacing.two,
    },
    tagWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.one,
    },
    tag: {
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
      borderRadius: Radius.pill,
      backgroundColor: c.background,
    },
    rail: {
      gap: Spacing.three,
    },
    pad: {
      padding: Spacing.four,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.75,
    },
  });
