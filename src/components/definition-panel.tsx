import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { lookupWord } from '@/services/dictionary';
import { savedWordFrom, type WordSource } from '@/services/vocabulary';

export type DefinitionPanelProps = {
  /** The word to define. Looked up whenever it changes. */
  word: string;
  /** Where the word was met, carried onto the saved entry. */
  source?: WordSource;
  /** Renders a close affordance in the header when given. */
  onClose?: () => void;
};

/**
 * Everything about one word: pronunciation, senses, the sentence it came from,
 * and a save toggle onto the reader's word list.
 *
 * Shared by the reader's lookup sheet and the Words tab so the two can never
 * disagree about how a definition reads — the reader wraps it in a modal, the
 * tab renders it inline.
 */
export function DefinitionPanel({ word, source, onClose }: DefinitionPanelProps) {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const vocabulary = useVocabulary();

  const lookup = useAsync((signal) => lookupWord(word, signal), [word]);
  const entry = lookup.data;
  const saved = vocabulary.isSaved(entry?.word ?? word);

  const toggleSave = () => {
    if (!entry) return;
    if (saved) void vocabulary.remove(entry.word);
    else void vocabulary.save(savedWordFrom(entry, source));
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headword}>
          <ThemedText type="heading" numberOfLines={2}>
            {entry?.word ?? word}
          </ThemedText>
          {entry?.phonetic ? (
            <ThemedText type="small" themeColor="textSecondary">
              {entry.phonetic}
            </ThemedText>
          ) : null}
        </View>

        {entry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${entry.word} from your words` : `Save ${entry.word} to your words`}
            accessibilityState={{ selected: saved }}
            hitSlop={Spacing.two}
            onPress={toggleSave}
            style={({ pressed }) => [
              styles.iconButton,
              saved && styles.iconButtonActive,
              pressed && styles.pressed,
            ]}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={saved ? theme.onPrimary : theme.textSecondary}
            />
          </Pressable>
        ) : null}

        {onClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close definition"
            hitSlop={Spacing.two}
            onPress={onClose}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {entry?.matchedFrom ? (
        <ThemedText type="caption" themeColor="textTertiary">
          You highlighted “{entry.matchedFrom}” — showing the entry for “{entry.word}”.
        </ThemedText>
      ) : null}

      {source?.context ? (
        <View style={styles.context}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.contextText}>
            “{source.context}”
          </ThemedText>
          {source.bookTitle ? (
            <ThemedText type="caption" themeColor="textTertiary" numberOfLines={1}>
              {source.bookTitle}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {lookup.loading ? (
        <View style={styles.state}>
          <ActivityIndicator />
        </View>
      ) : lookup.error ? (
        <View style={styles.state}>
          <ThemedText type="small" themeColor="danger" style={styles.centered}>
            {lookup.error}
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={lookup.reload}>
            <ThemedText type="smallBold" themeColor="primary">
              Try again
            </ThemedText>
          </Pressable>
        </View>
      ) : !entry ? (
        <View style={styles.state}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            No dictionary entry for “{word}”. It may be a name, a place, or an older spelling.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.senses}
          contentContainerStyle={styles.sensesContent}
          showsVerticalScrollIndicator={false}>
          {entry.senses.map((sense, index) => (
            <View key={`${sense.partOfSpeech}-${index}`} style={styles.sense}>
              <View style={styles.senseHead}>
                <ThemedText type="captionBold" themeColor="primary">
                  {index + 1}
                </ThemedText>
                {sense.partOfSpeech ? (
                  <ThemedText type="caption" themeColor="textTertiary" style={styles.pos}>
                    {sense.partOfSpeech}
                  </ThemedText>
                ) : null}
              </View>

              <ThemedText type="small">{sense.definition}</ThemedText>

              {sense.example ? (
                <ThemedText type="caption" themeColor="textSecondary" style={styles.example}>
                  “{sense.example}”
                </ThemedText>
              ) : null}

              {sense.synonyms.length ? (
                <ThemedText type="caption" themeColor="textTertiary">
                  Similar: {sense.synonyms.join(', ')}
                </ThemedText>
              ) : null}
            </View>
          ))}

          <Pressable
            accessibilityRole="link"
            onPress={() => void WebBrowser.openBrowserAsync(entry.sourceUrl)}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="caption" themeColor="textTertiary">
              Definitions from Wiktionary, CC BY-SA. Read the full entry →
            </ThemedText>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    root: {
      gap: Spacing.two,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.two,
    },
    headword: {
      flex: 1,
      gap: Spacing.half,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    iconButtonActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    context: {
      gap: Spacing.half,
      paddingLeft: Spacing.two,
      borderLeftWidth: 2,
      borderLeftColor: c.border,
    },
    contextText: {
      fontStyle: 'italic',
    },
    state: {
      alignItems: 'center',
      gap: Spacing.two,
      paddingVertical: Spacing.four,
    },
    centered: {
      textAlign: 'center',
    },
    senses: {
      // Bounded so a word with ten senses can't push the sheet past the screen;
      // the list scrolls inside instead.
      maxHeight: 360,
    },
    sensesContent: {
      gap: Spacing.three,
      paddingTop: Spacing.one,
      paddingBottom: Spacing.two,
    },
    sense: {
      gap: Spacing.half,
    },
    senseHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    pos: {
      fontStyle: 'italic',
    },
    example: {
      fontStyle: 'italic',
    },
    pressed: {
      opacity: 0.7,
    },
  });
