import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  addOrUpdateShelfEntry,
  removeShelfEntry,
  ShelfEntry,
  subscribeToShelf,
} from '@/services/shelves';

export default function ShelvesScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ShelfEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToShelf(user.uid, setEntries);
    return unsub;
  }, [user]);

  const handleAddTestBook = async () => {
    if (!user) return;
    await addOrUpdateShelfEntry(user.uid, {
      bookId: 'test-book-1',
      title: 'The Midnight Library',
      authors: ['Matt Haig'],
      coverUrl: '',
      status: 'wantToRead',
      progress: 0,
      totalPages: 288,
      rating: 0,
    });
  };

  const handleRemove = async (bookId: string) => {
    if (!user) return;
    await removeShelfEntry(user.uid, bookId);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Your Shelves</ThemedText>

        <Pressable onPress={handleAddTestBook} style={styles.addButton}>
          <ThemedView type="backgroundElement" style={styles.addButtonInner}>
            <ThemedText type="link">+ Add test book</ThemedText>
          </ThemedView>
        </Pressable>

        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary">
              No books yet. Tap &quot;Add test book&quot; above to try it out.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.bookRow}>
              <ThemedView style={styles.bookInfo}>
                <ThemedText type="smallBold">{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.authors.join(', ')} · {item.status}
                </ThemedText>
              </ThemedView>
              <Pressable onPress={() => handleRemove(item.bookId)}>
                <ThemedText type="link">Remove</ThemedText>
              </Pressable>
            </ThemedView>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  addButtonInner: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  bookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  bookInfo: {
    gap: Spacing.one,
  },
});