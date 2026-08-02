import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCard } from '@/components/book-card';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { genreBySlug } from '@/constants/genres';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { fetchBooksByGenre } from '@/services/books';

export default function GenreScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const genre = genreBySlug(slug);

  const books = useAsync(
    (signal) => (genre ? fetchBooksByGenre(genre.subject, 30, signal) : Promise.resolve([])),
    [genre?.subject]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ScreenHeader title={genre?.label ?? 'Genre'} />
        </View>

        {books.loading ? (
          <ActivityIndicator color={theme.primary} style={styles.pad} />
        ) : books.error ? (
          <ThemedText type="small" themeColor="danger" style={styles.pad}>
            {books.error}
          </ThemedText>
        ) : (
          <FlatList
            data={books.data ?? []}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textTertiary" style={styles.pad}>
                No books found in {genre?.label ?? 'this genre'}.
              </ThemedText>
            }
            renderItem={({ item }) => <BookCard book={item} width={104} />}
          />
        )}
      </View>
    </SafeAreaView>
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
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    header: {
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
    },
    grid: {
      paddingHorizontal: Spacing.four,
      paddingBottom: Spacing.four,
      gap: Spacing.three,
    },
    row: {
      gap: Spacing.three,
    },
    pad: {
      padding: Spacing.four,
      textAlign: 'center',
    },
  });
