import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCard } from '@/components/book-card';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { fetchFreeToRead } from '@/services/books';

/**
 * Free-to-read public-domain books. A pushed stack screen, so it carries a back
 * button — reached from Home's "See all" browse screen and the Discover tab.
 */
export default function FreeToReadScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const books = useAsync((signal) => fetchFreeToRead(30, signal), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenHeader title="Free to Read" />
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
          ListHeaderComponent={
            <ThemedText type="caption" themeColor="textTertiary" style={styles.hint}>
              Public-domain titles. Open one and tap “Read now” to read it free in the app.
            </ThemedText>
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textTertiary" style={styles.pad}>
              Could not load free books right now.
            </ThemedText>
          }
          renderItem={({ item }) => <BookCard book={item} width={104} />}
        />
      )}
    </SafeAreaView>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
    },
    header: {
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
      paddingBottom: Spacing.three,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    grid: {
      paddingHorizontal: Spacing.four,
      paddingBottom: Spacing.four,
      gap: Spacing.three,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    row: {
      gap: Spacing.three,
    },
    hint: {
      paddingBottom: Spacing.three,
    },
    pad: {
      padding: Spacing.four,
      textAlign: 'center',
    },
  });
