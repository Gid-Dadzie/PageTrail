import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DefinitionPanel } from '@/components/definition-panel';
import { ReaderView } from '@/components/reader-view';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useThemeMode } from '@/context/theme-context';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { fetchBookById } from '@/services/books';
import {
  buildReaderDocument,
  fetchReadableText,
  findReadableEdition,
  READER_FONT_SIZES,
  READER_THEMES,
  ReaderThemeName,
} from '@/services/reading';
import {
  addOrUpdateShelfEntry,
  subscribeToShelf,
  updateProgress,
  type ShelfEntry,
} from '@/services/shelves';

const DEFAULT_FONT_INDEX = 2;

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // The reader keeps its own themes (it adds sepia, and readers often want the
  // page to differ from the app chrome), but it should *open* matching the app
  // rather than always dark. Switching it here is per-session, by design.
  const { scheme } = useThemeMode();
  const appTheme = useTheme();
  const [themeName, setThemeName] = useState<ReaderThemeName>(scheme);
  const [fontIndex, setFontIndex] = useState(DEFAULT_FONT_INDEX);
  const [showControls, setShowControls] = useState(false);

  // Highlighting a word offers its definition. On by default — it's the reason
  // the reader would highlight one word — but switchable, because a reader
  // copying quotations doesn't want a sheet every time.
  const [lookupOnHighlight, setLookupOnHighlight] = useState(true);
  const [lookup, setLookup] = useState<{ word: string; context: string } | null>(null);

  const theme = READER_THEMES[themeName];
  const fontPx = READER_FONT_SIZES[fontIndex];

  // Resolve the book and a readable edition. On native, download the text and
  // bake it into a book-styled document; on web, browsers block fetching
  // Gutenberg (CORS), so hand the URL to the iframe to load cross-origin.
  const reader = useAsync(async (signal) => {
    const book = await fetchBookById(id, signal);
    if (!book) throw new Error('That book could not be found.');

    const edition = await findReadableEdition(book, signal);
    if (!edition) return { book, html: '', url: '' };

    if (Platform.OS === 'web') {
      return { book, html: '', url: edition.htmlUrl || edition.textUrl };
    }

    const text = await fetchReadableText(edition, signal);
    // Built once with the theme the reader opened on, so the first paint
    // matches; later theme/font changes are pushed in live instead of rebuilt.
    const html = buildReaderDocument(text, {
      title: book.title,
      author: book.authors.join(', '),
      theme: READER_THEMES[scheme],
      fontPx: READER_FONT_SIZES[DEFAULT_FONT_INDEX],
    });
    return { book, html, url: '' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [entry, setEntry] = useState<ShelfEntry | null>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!user) return;
    return subscribeToShelf(user.uid, (entries) =>
      setEntry(entries.find((e) => e.bookId === id) ?? null)
    );
  }, [user, id]);

  const book = reader.data?.book;

  // Opening the reader means the reader is reading it, so put the book on the
  // "Currently Reading" shelf if it is not already tracked.
  useEffect(() => {
    if (!user || !book || entry) return;
    void addOrUpdateShelfEntry(user.uid, {
      bookId: book.id,
      title: book.title,
      authors: book.authors,
      coverUrl: book.coverUrl,
      isbn: book.isbn,
      status: 'reading',
      progress: 0,
      totalPages: book.pageCount,
      rating: 0,
      review: '',
      categories: book.categories,
    });
  }, [user, book, entry]);

  const handleProgress = useCallback((fraction: number) => {
    progressRef.current = fraction;
    setProgress(fraction);
  }, []);

  const handleLookup = useCallback(
    (word: string, context: string) => {
      if (!lookupOnHighlight) return;
      setLookup({ word, context });
    },
    [lookupOnHighlight]
  );

  // Persist reading position once, on the way out.
  useEffect(() => {
    return () => {
      const fraction = progressRef.current;
      const total = book?.pageCount ?? 0;
      if (!user || !book || total <= 0 || fraction <= 0) return;
      void updateProgress(user.uid, book.id, Math.round(fraction * total), total);
    };
  }, [user, book]);

  const chromeText = theme.fg;
  const readable = !!(reader.data?.html || reader.data?.url);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (book) router.replace({ pathname: '/book/[id]', params: { id: book.id } });
    else router.replace('/');
  };

  const headerButtonStyle = useMemo(
    () => [styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }],
    [theme]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.bg }}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={Spacing.two}
            onPress={goBack}
            style={({ pressed }) => [headerButtonStyle, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={20} color={chromeText} />
          </Pressable>

          <ThemedText
            type="smallBold"
            numberOfLines={1}
            style={[styles.title, { color: chromeText }]}>
            {book?.title ?? 'Reader'}
          </ThemedText>

          {readable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reading settings"
              hitSlop={Spacing.two}
              onPress={() => setShowControls((s) => !s)}
              style={({ pressed }) => [
                headerButtonStyle,
                showControls && { backgroundColor: theme.accent, borderColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: showControls ? theme.bg : chromeText }}>
                Aa
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>
      </SafeAreaView>

      {readable ? (
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.accent, width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
      ) : null}

      <View style={styles.body}>
        {reader.loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
            <ThemedText type="caption" style={{ color: theme.muted }}>
              Finding a readable edition…
            </ThemedText>
          </View>
        ) : reader.error ? (
          <View style={styles.center}>
            <ThemedText type="small" themeColor="danger" style={styles.centerText}>
              {reader.error}
            </ThemedText>
          </View>
        ) : readable ? (
          <ReaderView
            html={reader.data!.html}
            url={reader.data!.url}
            theme={theme}
            fontPx={fontPx}
            onProgress={handleProgress}
            onLookup={handleLookup}
          />
        ) : (
          <View style={styles.center}>
            <ThemedText type="defaultBold" style={{ color: chromeText }}>
              Not available to read for free
            </ThemedText>
            <ThemedText type="small" style={[styles.centerText, { color: theme.muted }]}>
              This title isn&apos;t in the public domain, so there&apos;s no free full text to read
              in the app. You can still buy or borrow it from the book&apos;s page.
            </ThemedText>
          </View>
        )}
      </View>

      {showControls && readable ? (
        <SafeAreaView
          edges={['bottom']}
          style={[styles.controls, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <View style={styles.controlsInner}>
            <View style={styles.controlRow}>
              <ThemedText type="caption" style={{ color: theme.muted }}>
                Text size
              </ThemedText>
              <View style={styles.fontButtons}>
                <FontButton
                  label="A"
                  small
                  theme={theme}
                  disabled={fontIndex === 0}
                  onPress={() => setFontIndex((i) => Math.max(0, i - 1))}
                />
                <FontButton
                  label="A"
                  theme={theme}
                  disabled={fontIndex === READER_FONT_SIZES.length - 1}
                  onPress={() =>
                    setFontIndex((i) => Math.min(READER_FONT_SIZES.length - 1, i + 1))
                  }
                />
              </View>
            </View>

            <View style={[styles.controlRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <ThemedText type="caption" style={{ color: theme.muted }}>
                Theme
              </ThemedText>
              <View style={styles.swatches}>
                {(['dark', 'sepia', 'light'] as ReaderThemeName[]).map((name) => {
                  const t = READER_THEMES[name];
                  const active = themeName === name;
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityLabel={`${name} theme`}
                      accessibilityState={{ selected: active }}
                      onPress={() => setThemeName(name)}
                      style={[
                        styles.swatch,
                        { backgroundColor: t.bg, borderColor: active ? theme.accent : t.border },
                        active && styles.swatchActive,
                      ]}>
                      <ThemedText type="captionBold" style={{ color: t.fg }}>
                        A
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.controlRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <View style={styles.controlLabel}>
                <ThemedText type="caption" style={{ color: theme.muted }}>
                  Look up on highlight
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.muted, opacity: 0.7 }}>
                  Select a word to see what it means
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Look up highlighted words"
                accessibilityState={{ checked: lookupOnHighlight }}
                onPress={() => setLookupOnHighlight((on) => !on)}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: lookupOnHighlight ? theme.accent : theme.bg,
                    borderColor: lookupOnHighlight ? theme.accent : theme.border,
                  },
                  pressed && styles.pressed,
                ]}>
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: lookupOnHighlight ? theme.bg : theme.muted,
                      alignSelf: lookupOnHighlight ? 'flex-end' : 'flex-start',
                    },
                  ]}
                />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      ) : null}

      {/* Definition sheet. Painted in app chrome rather than the page's reading
          theme, the way a system look-up panel sits above the text it explains. */}
      <Modal
        visible={!!lookup}
        transparent
        animationType="slide"
        onRequestClose={() => setLookup(null)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss definition"
          style={styles.scrim}
          onPress={() => setLookup(null)}
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: appTheme.backgroundElement, borderTopColor: appTheme.border },
          ]}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.sheetInner}>
              {lookup ? (
                <DefinitionPanel
                  word={lookup.word}
                  source={{
                    context: lookup.context,
                    bookId: book?.id ?? '',
                    bookTitle: book?.title ?? '',
                  }}
                  onClose={() => setLookup(null)}
                />
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function FontButton({
  label,
  small,
  theme,
  disabled,
  onPress,
}: {
  label: string;
  small?: boolean;
  theme: (typeof READER_THEMES)[ReaderThemeName];
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={small ? 'Smaller text' : 'Larger text'}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fontButton,
        { backgroundColor: theme.bg, borderColor: theme.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <ThemedText style={{ color: theme.fg, fontSize: small ? 13 : 20, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  body: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  controls: {
    borderTopWidth: 1,
  },
  controlsInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  controlLabel: {
    flex: 1,
    gap: Spacing.half,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: Radius.pill,
    borderWidth: 1,
    padding: 3,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  sheetInner: {
    padding: Spacing.four,
  },
  fontButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  fontButton: {
    width: 44,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatches: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderWidth: 2,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
