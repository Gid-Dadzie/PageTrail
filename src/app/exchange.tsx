import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  boostListing,
  createListing,
  Listing,
  ListingKind,
  subscribeToOpenListings,
} from '@/services/exchange';
import { COIN_COSTS, COIN_REWARDS, earnCoins, spendCoins } from '@/services/pagecoins';
import { createPassport } from '@/services/passport';
import { ShelfEntry, subscribeToShelf } from '@/services/shelves';
import { relativeTime } from '@/utils/format';

const KINDS: { value: ListingKind; label: string }[] = [
  { value: 'exchange', label: 'Swap' },
  { value: 'resale', label: 'Sell' },
  { value: 'giveaway', label: 'Give away' },
];

export default function ExchangeScreen() {
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  const { user, profile } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [composing, setComposing] = useState(!!bookId);

  useEffect(() => subscribeToOpenListings(setListings), []);

  useEffect(() => {
    if (!user) return;
    return subscribeToShelf(user.uid, setShelf);
  }, [user]);

  const seed = bookId ? shelf.find((e) => e.bookId === bookId) : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ScreenHeader
            title="Exchange"
            right={
              <Pressable
                accessibilityRole="button"
                onPress={() => setComposing((c) => !c)}
                hitSlop={Spacing.two}>
                <ThemedText type="caption" themeColor="primary">
                  {composing ? 'Close' : 'List a book'}
                </ThemedText>
              </Pressable>
            }
          />
        </View>

        {composing ? (
          <ComposeListing
            shelf={shelf}
            initialBookId={bookId}
            seed={seed}
            onDone={() => setComposing(false)}
          />
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <ThemedText type="caption" themeColor="textTertiary" style={styles.intro}>
                Copies other readers are passing on. Every copy carries a Book Passport with the
                notes its previous owners left.
              </ThemedText>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <ThemedText type="small" themeColor="textTertiary" style={styles.centered}>
                  No open listings yet. List a book you have finished and earn{' '}
                  {COIN_REWARDS.listedForExchange} PageCoins.
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <ListingRow listing={item} viewerId={user?.uid ?? ''} coins={profile?.coins ?? 0} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function ComposeListing({
  shelf,
  initialBookId,
  seed,
  onDone,
}: {
  shelf: ShelfEntry[];
  initialBookId?: string;
  seed?: ShelfEntry;
  onDone: () => void;
}) {
  const { user, profile } = useAuth();
  const [selectedId, setSelectedId] = useState(initialBookId ?? '');
  const [kind, setKind] = useState<ListingKind>('exchange');
  const [city, setCity] = useState(profile?.country ?? '');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('Good');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  const book = shelf.find((e) => e.bookId === selectedId) ?? seed;

  const submit = async () => {
    if (!user || !book) return setError('Pick a book from your shelves first.');
    if (!city.trim()) return setError('Add a city so nearby readers can find it.');

    setError('');
    setBusy(true);

    try {
      const displayName = profile?.fullName || profile?.username || 'A reader';

      // The passport is minted with the listing so the copy carries its
      // provenance from the moment it enters circulation.
      const code = await createPassport({
        bookId: book.bookId,
        isbn: book.isbn,
        title: book.title,
        coverUrl: book.coverUrl,
        ownerId: user.uid,
        ownerName: displayName,
      });

      await createListing({
        bookId: book.bookId,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        isbn: book.isbn,
        ownerId: user.uid,
        ownerName: displayName,
        city: city.trim(),
        kind,
        price: kind === 'resale' ? Number(price) || 0 : 0,
        condition,
        passportCode: code,
      });

      await earnCoins(user.uid, 'listedForExchange', book.title, `listed:${book.bookId}`);
      setCreatedCode(code);
    } catch {
      setError('Could not create the listing. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (createdCode) {
    return (
      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.successCard}>
          <ThemedText type="defaultBold" themeColor="success">
            Listed, and a passport was minted
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Write this code inside the front cover so the next reader can open its trail:
          </ThemedText>
          <ThemedText type="heading" themeColor="primary">
            {createdCode}
          </ThemedText>
          <Link href={{ pathname: '/passport/[code]', params: { code: createdCode } }} asChild>
            <Pressable accessibilityRole="button">
              <ThemedText type="smallBold" themeColor="primary">
                Open the passport
              </ThemedText>
            </Pressable>
          </Link>
        </View>
        <Button label="Done" onPress={onDone} />
      </ScrollView>
    );
  }

  const candidates = shelf.filter((e) => e.status === 'read' || e.bookId === initialBookId);

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <ThemedText type="smallBold">Which copy?</ThemedText>
      {candidates.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {candidates.map((entry) => (
            <Pressable
              key={entry.bookId}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedId === entry.bookId }}
              onPress={() => setSelectedId(entry.bookId)}
              style={[styles.candidate, selectedId === entry.bookId && styles.candidateActive]}>
              <BookCover uri={entry.coverUrl} title={entry.title} width={64} />
              <ThemedText type="caption" numberOfLines={2} style={styles.candidateTitle}>
                {entry.title}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <ThemedText type="caption" themeColor="textTertiary">
          Finish a book first — books on your Finished shelf can be listed.
        </ThemedText>
      )}

      <ThemedText type="smallBold">How are you passing it on?</ThemedText>
      <View style={styles.kindRow}>
        {KINDS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={kind === option.value}
            onPress={() => setKind(option.value)}
          />
        ))}
      </View>

      <TextField label="City" placeholder="Accra" value={city} onChangeText={setCity} />
      <TextField
        label="Condition"
        placeholder="Good"
        value={condition}
        onChangeText={setCondition}
      />
      {kind === 'resale' ? (
        <TextField
          label="Price"
          placeholder="25"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
      ) : null}

      {error ? (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button label="Create listing" loading={busy} disabled={!book} onPress={submit} />
    </ScrollView>
  );
}

function ListingRow({
  listing,
  viewerId,
  coins,
}: {
  listing: Listing;
  viewerId: string;
  coins: number;
}) {
  const mine = listing.ownerId === viewerId;
  const canBoost = mine && !listing.boosted && coins >= COIN_COSTS.exchangePriority;

  const boost = async () => {
    const ok = await spendCoins(viewerId, 'exchangePriority', listing.title);
    if (ok) await boostListing(listing.id);
  };

  return (
    <View style={[styles.listingRow, listing.boosted && styles.listingBoosted]}>
      <BookCover uri={listing.coverUrl} title={listing.title} width={52} />

      <View style={styles.listingMeta}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {listing.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {listing.kind === 'resale' ? `${listing.price} · ` : ''}
          {listing.condition} · {listing.city}
        </ThemedText>
        <ThemedText type="caption" themeColor="textTertiary">
          {mine ? 'Your listing' : listing.ownerName} · {relativeTime(listing.createdAt)}
        </ThemedText>

        <View style={styles.listingActions}>
          <Link href={{ pathname: '/passport/[code]', params: { code: listing.passportCode } }} asChild>
            <Pressable accessibilityRole="button" hitSlop={Spacing.one}>
              <ThemedText type="caption" themeColor="primary">
                View passport
              </ThemedText>
            </Pressable>
          </Link>

          {canBoost ? (
            <Pressable accessibilityRole="button" onPress={boost} hitSlop={Spacing.one}>
              <ThemedText type="caption" themeColor="primary">
                Boost ({COIN_COSTS.exchangePriority} 🪙)
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {listing.boosted ? (
        <View style={styles.boostTag}>
          <ThemedText type="caption" themeColor="onPrimary">
            Boosted
          </ThemedText>
        </View>
      ) : null}
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
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  intro: {
    paddingBottom: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  form: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  rail: {
    gap: Spacing.two,
  },
  candidate: {
    width: 76,
    padding: Spacing.one,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: Spacing.one,
  },
  candidateActive: {
    borderColor: Colors.primary,
  },
  candidateTitle: {
    textAlign: 'center',
  },
  kindRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  successCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.success,
    alignItems: 'center',
  },
  listingRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
  },
  listingBoosted: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  listingMeta: {
    flex: 1,
    gap: 2,
  },
  listingActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  boostTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centered: {
    textAlign: 'center',
  },
});
