import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { createThread, FORUM_CATEGORIES, ForumCategory } from '@/services/forum';
import { COIN_REWARDS, earnCoins } from '@/services/pagecoins';

export default function NewThreadScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ForumCategory>('general');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!user) return;
    if (title.trim().length < 5) return setError('Give your discussion a clear title.');

    setError('');
    setBusy(true);

    try {
      const id = await createThread({
        title: title.trim(),
        body: body.trim(),
        authorId: user.uid,
        authorName: profile?.fullName || profile?.username || 'A reader',
        category,
      });
      // Starting a discussion feeds the engagement loop, so it earns coins.
      await earnCoins(user.uid, 'startedDiscussion', title.trim());
      // Replace so Back from the thread returns to the forum list, not here.
      router.replace({ pathname: '/forum/[id]', params: { id } });
    } catch {
      setError('Could not post your discussion. Try again.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="New Discussion" fallbackHref="/forum" />

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Category
            </ThemedText>
            <View style={styles.categories}>
              {FORUM_CATEGORIES.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  selected={category === c.value}
                  onPress={() => setCategory(c.value)}
                />
              ))}
            </View>
          </View>

          <TextField
            label="Title"
            placeholder="What do you want to discuss?"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Details (optional)
            </ThemedText>
            <View style={styles.bodyBox}>
              <TextField
                placeholder="Add context, a question, or your take…"
                value={body}
                onChangeText={setBody}
                multiline
                style={styles.bodyInput}
              />
            </View>
          </View>

          {error ? (
            <ThemedText type="caption" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.spacer} />

          <ThemedText type="caption" themeColor="textTertiary" style={styles.reward}>
            Starting a discussion earns you {COIN_REWARDS.startedDiscussion} PageCoins.
          </ThemedText>
          <Button label="Post Discussion" loading={busy} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  field: {
    gap: Spacing.two,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  bodyBox: {
    minHeight: 120,
  },
  bodyInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  spacer: {
    flex: 1,
  },
  reward: {
    textAlign: 'center',
  },
});
