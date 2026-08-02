import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemeModeSelector, ThemeToggleButton } from '@/components/ui/theme-toggle';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { genreBySlug } from '@/constants/genres';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { CoinEntry, subscribeToLedger } from '@/services/pagecoins';
import { computeStats, ShelfEntry, subscribeToShelf } from '@/services/shelves';
import { relativeTime } from '@/utils/format';

const REASON_COPY: Record<string, string> = {
  finishedBook: 'Finished a book',
  wroteReview: 'Wrote a review',
  completedChallenge: 'Completed a challenge',
  dailyStreak: 'Daily streak',
  passportNote: 'Left a passport note',
  listedForExchange: 'Listed a book',
  startedDiscussion: 'Started a discussion',
  purchaseDiscount: 'Purchase discount',
  exchangePriority: 'Boosted a listing',
  passportUnlock: 'Unlocked a passport early',
};

export default function ProfileScreen() {
  const styles = useThemedStyles(stylesheet);
  const { user, profile, signOut } = useAuth();
  const [entries, setEntries] = useState<ShelfEntry[]>([]);
  const [ledger, setLedger] = useState<CoinEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToShelf(user.uid, setEntries);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToLedger(user.uid, setLedger, 10);
  }, [user]);

  const stats = computeStats(entries);
  const name = profile?.fullName || profile?.username || 'Reader';

  const confirmSignOut = () => {
    // Alert has no effect on web, so sign out directly there.
    if (Platform.OS === 'web') return void signOut();

    Alert.alert('Sign out', 'Sign out of PageTrail?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        {/* One-tap light/dark next to the title; the full three-way control
            (including "System") lives in the Appearance section below. */}
        <ScreenHeader title="Profile" right={<ThemeToggleButton />} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <ThemedText type="subtitle" themeColor="primary">
              {name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="heading">{name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile?.email || user?.email}
          </ThemedText>
        </View>

        <View style={styles.walletCard}>
          <View>
            <ThemedText type="caption" themeColor="textSecondary">
              PageCoins balance
            </ThemedText>
            <ThemedText type="subtitle" themeColor="primary">
              🪙 {profile?.coins ?? 0}
            </ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textTertiary" style={styles.walletHint}>
            Earn by finishing books and reviewing. Spend on discounts, listing boosts, and early
            passport unlocks.
          </ThemedText>
        </View>

        <View style={styles.statRow}>
          <Stat label="Finished" value={String(stats.booksFinished)} />
          <Stat label="Reading" value={String(stats.currentlyReading)} />
          <Stat label="Wishlist" value={String(stats.wantToRead)} />
        </View>

        <View style={styles.links}>
          <RowLink href="/stats" icon="stats-chart-outline" label="Reading stats" />
          <RowLink href="/exchange" icon="swap-horizontal-outline" label="Exchange & listings" />
          <RowLink href="/notifications" icon="notifications-outline" label="Notifications" />
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultBold">Appearance</ThemedText>
          <ThemeModeSelector />
        </View>

        {profile?.favouriteGenres?.length ? (
          <View style={styles.section}>
            <ThemedText type="defaultBold">Your genres</ThemedText>
            <View style={styles.genreWrap}>
              {profile.favouriteGenres.map((slug) => (
                <View key={slug} style={styles.genreTag}>
                  <ThemedText type="caption" themeColor="primary">
                    {genreBySlug(slug)?.label ?? slug}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="defaultBold">Recent PageCoins activity</ThemedText>
          {ledger.length ? (
            ledger.map((entry) => (
              <View key={entry.id} style={styles.ledgerRow}>
                <View style={styles.ledgerMeta}>
                  <ThemedText type="small">{REASON_COPY[entry.reason] ?? entry.reason}</ThemedText>
                  <ThemedText type="caption" themeColor="textTertiary">
                    {relativeTime(entry.createdAt)}
                  </ThemedText>
                </View>
                <ThemedText
                  type="smallBold"
                  themeColor={entry.amount >= 0 ? 'success' : 'danger'}>
                  {entry.amount >= 0 ? '+' : ''}
                  {entry.amount}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText type="caption" themeColor="textTertiary">
              No activity yet. Finish a book to earn your first coins.
            </ThemedText>
          )}
        </View>

        <Button label="Sign Out" variant="secondary" onPress={confirmSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(stylesheet);
  return (
    <View style={styles.stat}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function RowLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.rowLink, pressed && styles.pressed]}>
        <Ionicons name={icon} size={20} color={theme.primary} />
        <ThemedText type="small" style={styles.rowLinkLabel}>
          {label}
        </ThemedText>
        <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
      </Pressable>
    </Link>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
    },
    headerBar: {
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    content: {
      padding: Spacing.four,
      gap: Spacing.four,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    identity: {
      alignItems: 'center',
      gap: Spacing.one,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: Radius.pill,
      backgroundColor: c.backgroundElement,
      borderWidth: 2,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.two,
    },
    walletCard: {
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.primary,
      gap: Spacing.two,
    },
    walletHint: {
      lineHeight: 16,
    },
    statRow: {
      flexDirection: 'row',
      gap: Spacing.two,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
    },
    links: {
      gap: Spacing.two,
    },
    rowLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
    },
    rowLinkLabel: {
      flex: 1,
    },
    section: {
      gap: Spacing.two,
    },
    genreWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.one,
    },
    genreTag: {
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
      borderRadius: Radius.pill,
      backgroundColor: c.primarySubtle,
    },
    ledgerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.two,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    ledgerMeta: {
      gap: 2,
    },
    pressed: {
      opacity: 0.75,
    },
  });
