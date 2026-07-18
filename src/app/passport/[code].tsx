import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { COIN_COSTS, earnCoins, spendCoins } from '@/services/pagecoins';
import {
  addPassportNote,
  applyNoteGate,
  fetchPassport,
  PassportNote,
  subscribeToNotes,
} from '@/services/passport';
import { ShelfEntry, subscribeToShelf } from '@/services/shelves';
import { relativeTime } from '@/utils/format';

export default function PassportScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user, profile } = useAuth();

  const passport = useAsync(() => fetchPassport(code), [code]);
  const [notes, setNotes] = useState<PassportNote[]>([]);
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [earlyUnlock, setEarlyUnlock] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notePage, setNotePage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeToNotes(code, setNotes), [code]);

  useEffect(() => {
    if (!user) return;
    return subscribeToShelf(user.uid, setShelf);
  }, [user]);

  if (passport.loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.padded}>
          <ScreenHeader title="Book Passport" />
        </View>
        <ActivityIndicator color={Colors.primary} style={styles.pad} />
      </SafeAreaView>
    );
  }

  if (!passport.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.padded}>
          <ScreenHeader title="Book Passport" />
          <ThemedText type="small" themeColor="textSecondary" style={styles.pad}>
            No passport found for code {code}.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const data = passport.data;
  const entry = shelf.find((e) => e.bookId === data.bookId);
  const currentPage = entry?.progress ?? 0;

  const gated = applyNoteGate(notes, {
    currentPage,
    viewerId: user?.uid ?? '',
    earlyUnlock,
  });

  const lockedCount = gated.filter((g) => !g.unlocked).length;
  const canUnlock = (profile?.coins ?? 0) >= COIN_COSTS.passportUnlock;

  const unlockEarly = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const ok = await spendCoins(user.uid, 'passportUnlock', data.title);
      if (ok) setEarlyUnlock(true);
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async () => {
    if (!user || !noteText.trim()) return;
    const page = parseInt(notePage, 10);
    if (Number.isNaN(page)) return;

    setBusy(true);
    try {
      await addPassportNote(code, {
        authorId: user.uid,
        authorName: profile?.fullName || profile?.username || 'A reader',
        page,
        text: noteText.trim(),
      });
      await earnCoins(user.uid, 'passportNote', data.title);
      setNoteText('');
      setNotePage('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Book Passport" />

        <View style={styles.hero}>
          <BookCover uri={data.coverUrl} title={data.title} width={72} />
          <View style={styles.heroMeta}>
            <ThemedText type="defaultBold" numberOfLines={2}>
              {data.title}
            </ThemedText>
            <ThemedText type="caption" themeColor="primary">
              {data.code}
            </ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              {data.owners.length} {data.owners.length === 1 ? 'owner' : 'owners'} · {notes.length}{' '}
              {notes.length === 1 ? 'note' : 'notes'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultBold">Chain of owners</ThemedText>
          {data.owners.map((owner, index) => (
            <View key={`${owner.userId}-${owner.since}`} style={styles.ownerRow}>
              <View style={styles.ownerDot}>
                <ThemedText type="caption" themeColor="onPrimary">
                  {index + 1}
                </ThemedText>
              </View>
              <View style={styles.flex}>
                <ThemedText type="small">
                  {owner.displayName}
                  {owner.userId === data.currentOwnerId ? ' · current' : ''}
                </ThemedText>
                <ThemedText type="caption" themeColor="textTertiary">
                  since {owner.since}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <ThemedText type="defaultBold">Marginalia</ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              page {currentPage} reached
            </ThemedText>
          </View>

          {lockedCount > 0 && !earlyUnlock ? (
            <Pressable
              accessibilityRole="button"
              disabled={!canUnlock || busy}
              onPress={unlockEarly}
              style={[styles.unlockBanner, !canUnlock && styles.disabled]}>
              <Ionicons name="lock-closed" size={14} color={Colors.primary} />
              <ThemedText type="caption" themeColor={canUnlock ? 'primary' : 'textTertiary'}>
                {canUnlock
                  ? `${lockedCount} sealed until you read further — unlock now for ${COIN_COSTS.passportUnlock} 🪙`
                  : `${lockedCount} sealed until you reach their page`}
              </ThemedText>
            </Pressable>
          ) : null}

          {gated.length ? (
            gated.map(({ note, unlocked }) => (
              <View key={note.id} style={[styles.note, !unlocked && styles.noteLocked]}>
                <View style={styles.noteHead}>
                  <ThemedText type="captionBold" themeColor="primary">
                    p.{note.page}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textTertiary">
                    {note.authorName} · {relativeTime(note.createdAt)}
                  </ThemedText>
                </View>
                {unlocked ? (
                  <ThemedText type="small">{note.text}</ThemedText>
                ) : (
                  <View style={styles.sealed}>
                    <Ionicons name="lock-closed-outline" size={13} color={Colors.textTertiary} />
                    <ThemedText type="caption" themeColor="textTertiary">
                      Sealed until page {note.page}
                    </ThemedText>
                  </View>
                )}
              </View>
            ))
          ) : (
            <ThemedText type="caption" themeColor="textTertiary">
              No notes yet. Be the first to leave one for the next reader.
            </ThemedText>
          )}
        </View>

        <View style={styles.card}>
          <ThemedText type="smallBold">Leave a note</ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            Pin a thought to a page. It stays sealed for the next reader until they get there.
          </ThemedText>
          <TextField
            label="Page"
            placeholder="42"
            value={notePage}
            onChangeText={setNotePage}
            keyboardType="number-pad"
          />
          <TextField
            label="Note"
            placeholder="The twist here floored me…"
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
          <Button
            label="Add note"
            loading={busy}
            disabled={!noteText.trim() || !notePage}
            onPress={submitNote}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  padded: {
    padding: Spacing.four,
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
  section: {
    gap: Spacing.two,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ownerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  unlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySubtle,
  },
  disabled: {
    opacity: 0.7,
  },
  note: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
  },
  noteLocked: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  noteHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sealed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
  },
  pad: {
    padding: Spacing.four,
    textAlign: 'center',
  },
});
