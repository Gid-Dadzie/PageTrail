import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DefinitionPanel } from '@/components/definition-panel';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useVocabulary } from '@/hooks/use-vocabulary';
import type { SavedWord } from '@/services/vocabulary';

type Filter = 'all' | 'learning' | 'learned';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  learning: 'Learning',
  learned: 'Learned',
};

/**
 * The reader's own dictionary: every word they looked up while reading, plus a
 * search box for the ones they meet away from a book.
 *
 * The lookup surface itself is `DefinitionPanel`, the same component the reader's
 * highlight sheet uses, so a word saved here and a word saved mid-chapter are
 * the same record.
 */
export default function WordsScreen() {
  const styles = useThemedStyles(stylesheet);
  const theme = useTheme();
  const { words, remove, setLearned } = useVocabulary();

  const [draft, setDraft] = useState('');
  // Committed separately from `draft` so a lookup fires on submit rather than
  // on every keystroke.
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(
    () => ({
      all: words.length,
      learning: words.filter((w) => !w.learned).length,
      learned: words.filter((w) => w.learned).length,
    }),
    [words]
  );

  const visible = words.filter((word) =>
    filter === 'all' ? true : filter === 'learned' ? word.learned : !word.learned
  );

  const open = (word: string) => {
    setDraft(word);
    setQuery(word);
  };

  const close = () => {
    setDraft('');
    setQuery('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="heading">Words</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {counts.all === 0
              ? 'Nothing collected yet'
              : `${counts.all} collected · ${counts.learned} learned`}
          </ThemedText>
        </View>

        <View style={styles.search}>
          <TextField
            placeholder="Look up a word"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => setQuery(draft.trim())}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Look up a word"
          />
        </View>

        {query ? (
          <View style={styles.result}>
            <DefinitionPanel word={query} onClose={close} />
          </View>
        ) : null}

        <View style={styles.filters}>
          {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(key)}
                style={[styles.filter, active && styles.filterActive]}>
                <ThemedText type="caption" themeColor={active ? 'onPrimary' : 'textSecondary'}>
                  {FILTER_LABELS[key]} ({counts[key]})
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
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyWords filter={filter} hasAny={counts.all > 0} />}
          renderItem={({ item }) => (
            <WordRow
              word={item}
              onOpen={() => open(item.word)}
              onToggleLearned={() => void setLearned(item.word, !item.learned)}
              onRemove={() => void remove(item.word)}
              learnedColor={theme.success}
              mutedColor={theme.textTertiary}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function WordRow({
  word,
  onOpen,
  onToggleLearned,
  onRemove,
  learnedColor,
  mutedColor,
}: {
  word: SavedWord;
  onOpen: () => void;
  onToggleLearned: () => void;
  onRemove: () => void;
  learnedColor: string;
  mutedColor: string;
}) {
  const styles = useThemedStyles(stylesheet);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show the definition of ${word.word}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowMain}>
        <View style={styles.rowHead}>
          <ThemedText type="defaultBold" numberOfLines={1} style={styles.rowWord}>
            {word.word}
          </ThemedText>
          {word.partOfSpeech ? (
            <ThemedText type="caption" themeColor="textTertiary" style={styles.pos}>
              {word.partOfSpeech}
            </ThemedText>
          ) : null}
        </View>

        {word.definition ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {word.definition}
          </ThemedText>
        ) : null}

        {word.bookTitle ? (
          <ThemedText type="caption" themeColor="textTertiary" numberOfLines={1}>
            From {word.bookTitle}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.rowActions}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Mark ${word.word} as ${word.learned ? 'still learning' : 'learned'}`}
          accessibilityState={{ checked: word.learned }}
          hitSlop={Spacing.two}
          onPress={onToggleLearned}
          style={({ pressed }) => pressed && styles.pressed}>
          <Ionicons
            name={word.learned ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={word.learned ? learnedColor : mutedColor}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${word.word} from your words`}
          hitSlop={Spacing.two}
          onPress={onRemove}
          style={({ pressed }) => pressed && styles.pressed}>
          <Ionicons name="trash-outline" size={18} color={mutedColor} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function EmptyWords({ filter, hasAny }: { filter: Filter; hasAny: boolean }) {
  const styles = useThemedStyles(stylesheet);
  const theme = useTheme();

  const copy: Record<Filter, string> = {
    all: 'Highlight any word while you read and its meaning appears — save the ones worth keeping and they collect here.',
    learning: 'Nothing left to learn. Every word on your list is marked learned.',
    learned: 'No words marked learned yet. Tap the circle beside a word once you know it.',
  };

  return (
    <View style={styles.empty}>
      <Ionicons name="language-outline" size={32} color={theme.textTertiary} />
      <ThemedText type="small" themeColor="textTertiary" style={styles.emptyText}>
        {hasAny ? copy[filter] : copy.all}
      </ThemedText>
      {hasAny ? null : (
        <Link href="/free" asChild>
          <Pressable accessibilityRole="button">
            <ThemedText type="smallBold" themeColor="primary">
              Find a book to read
            </ThemedText>
          </Pressable>
        </Link>
      )}
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
      gap: Spacing.half,
      paddingHorizontal: Spacing.four,
    },
    search: {
      paddingHorizontal: Spacing.four,
    },
    result: {
      marginHorizontal: Spacing.four,
      padding: Spacing.three,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundElement,
    },
    filters: {
      flexDirection: 'row',
      gap: Spacing.two,
      paddingHorizontal: Spacing.four,
    },
    filter: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.pill,
      backgroundColor: c.backgroundElement,
    },
    filterActive: {
      backgroundColor: c.primary,
    },
    list: {
      gap: Spacing.two,
      paddingHorizontal: Spacing.four,
      paddingBottom: Spacing.four,
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.three,
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
    },
    rowMain: {
      flex: 1,
      gap: Spacing.half,
    },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.two,
    },
    rowWord: {
      flexShrink: 1,
    },
    pos: {
      fontStyle: 'italic',
    },
    rowActions: {
      alignItems: 'center',
      gap: Spacing.three,
      paddingTop: Spacing.half,
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
