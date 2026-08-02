import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCard } from '@/components/book-card';
import { ThemedText } from '@/components/themed-text';
import { GENRES } from '@/constants/genres';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { Book, fetchTopCharts, searchBooks } from '@/services/books';

export default function DiscoverScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  // Open Library is rate-limited per client; debouncing keeps a fast typist
  // from firing a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 350);
    return () => clearTimeout(id);
  }, [term]);

  const results = useAsync<Book[]>(
    (signal) => (debounced.trim() ? searchBooks(debounced, signal) : Promise.resolve([])),
    [debounced]
  );
  const charts = useAsync((signal) => fetchTopCharts(15, signal), []);

  const searching = !!debounced.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.searchWrap}>
          {searching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={Spacing.two}
              onPress={() => {
                setTerm('');
                setDebounced('');
              }}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
          ) : (
            <Ionicons name="search" size={18} color={theme.textTertiary} />
          )}
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder="Search books or authors"
            placeholderTextColor={theme.textTertiary}
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search books"
          />
          {term ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={Spacing.two}
              onPress={() => setTerm('')}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        {searching ? (
          <SearchResults state={results} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.browse}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show all free-to-read books"
              onPress={() => router.push('/free')}
              style={({ pressed }) => [styles.freeBanner, pressed && styles.pressed]}>
              <View style={styles.freeBannerText}>
                <ThemedText type="smallBold" themeColor="onPrimary">
                  📖 Free to read
                </ThemedText>
                <ThemedText type="caption" themeColor="onPrimary">
                  Browse public-domain classics you can read right in the app
                </ThemedText>
              </View>
              <Ionicons name="arrow-forward" size={18} color={theme.onPrimary} />
            </Pressable>

            <View style={styles.section}>
              <ThemedText type="defaultBold" style={styles.sectionTitle}>
                Explore by Genre
              </ThemedText>
              <View style={styles.genreGrid}>
                {GENRES.map((genre) => (
                  <Link
                    key={genre.slug}
                    href={{ pathname: '/genre/[slug]', params: { slug: genre.slug } }}
                    asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.genreCard, pressed && styles.pressed]}>
                      <ThemedText type="smallBold" numberOfLines={2}>
                        {genre.label}
                      </ThemedText>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="defaultBold" style={styles.sectionTitle}>
                Top Charts
              </ThemedText>
              {charts.loading ? (
                <ActivityIndicator color={theme.primary} style={styles.pad} />
              ) : charts.data?.length ? (
                <FlatList
                  horizontal
                  data={charts.data}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rail}
                  renderItem={({ item, index }) => (
                    <View style={styles.chartItem}>
                      <ThemedText type="heading" themeColor="textTertiary" style={styles.rank}>
                        {index + 1}
                      </ThemedText>
                      <BookCard book={item} width={104} />
                    </View>
                  )}
                />
              ) : (
                <ThemedText type="caption" themeColor="textTertiary" style={styles.pad}>
                  Could not load charts right now.
                </ThemedText>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function SearchResults({ state }: { state: ReturnType<typeof useAsync<Book[]>> }) {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  if (state.loading) {
    return <ActivityIndicator color={theme.primary} style={styles.pad} />;
  }

  if (state.error) {
    return (
      <ThemedText type="small" themeColor="danger" style={styles.pad}>
        {state.error}
      </ThemedText>
    );
  }

  if (!state.data?.length) {
    return (
      <ThemedText type="small" themeColor="textTertiary" style={styles.pad}>
        No books matched that search.
      </ThemedText>
    );
  }

  return (
    <FlatList
      data={state.data}
      keyExtractor={(item) => item.id}
      numColumns={3}
      columnWrapperStyle={styles.resultRow}
      contentContainerStyle={styles.resultGrid}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => <BookCard book={item} width={104} />}
    />
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
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      marginHorizontal: Spacing.four,
      paddingHorizontal: Spacing.three,
      height: 46,
      borderRadius: Radius.pill,
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: {
      flex: 1,
      color: c.text,
      fontSize: 15,
      height: '100%',
    },
    browse: {
      gap: Spacing.four,
      paddingBottom: Spacing.four,
    },
    freeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      marginHorizontal: Spacing.four,
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.primary,
    },
    freeBannerText: {
      flex: 1,
      gap: 2,
    },
    section: {
      gap: Spacing.two,
    },
    sectionTitle: {
      paddingHorizontal: Spacing.four,
    },
    genreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.two,
      paddingHorizontal: Spacing.four,
    },
    genreCard: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
    },
    rail: {
      gap: Spacing.three,
      paddingHorizontal: Spacing.four,
    },
    chartItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.one,
    },
    rank: {
      width: 22,
    },
    resultGrid: {
      paddingHorizontal: Spacing.four,
      paddingBottom: Spacing.four,
      gap: Spacing.three,
    },
    resultRow: {
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
