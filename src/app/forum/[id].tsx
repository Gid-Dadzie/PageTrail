import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/hooks/use-async';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import {
  addReply,
  categoryLabel,
  fetchThread,
  Reply,
  subscribeToReplies,
} from '@/services/forum';
import { relativeTime } from '@/utils/format';

export default function ThreadScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  const thread = useAsync(() => fetchThread(id), [id]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => subscribeToReplies(id, setReplies), [id]);

  const send = async () => {
    const trimmed = text.trim();
    if (!user || !trimmed) return;

    setSending(true);
    try {
      await addReply(id, {
        authorId: user.uid,
        authorName: profile?.fullName || profile?.username || 'A reader',
        text: trimmed,
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenHeader title="Discussion" fallbackHref="/forum" />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <FlatList
          data={replies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            thread.loading ? (
              <ActivityIndicator color={theme.primary} style={styles.pad} />
            ) : thread.data ? (
              <View style={styles.op}>
                <View style={styles.opTop}>
                  <View style={styles.categoryTag}>
                    <ThemedText type="caption" themeColor="primary">
                      {categoryLabel(thread.data.category)}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" themeColor="textTertiary">
                    {relativeTime(thread.data.createdAt)}
                  </ThemedText>
                </View>
                <ThemedText type="defaultBold">{thread.data.title}</ThemedText>
                {thread.data.body ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {thread.data.body}
                  </ThemedText>
                ) : null}
                <ThemedText type="caption" themeColor="textTertiary">
                  Started by {thread.data.authorName}
                </ThemedText>
                <View style={styles.divider} />
                <ThemedText type="smallBold">
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" style={styles.pad}>
                This discussion could not be found.
              </ThemedText>
            )
          }
          ListEmptyComponent={
            thread.data && !thread.loading ? (
              <ThemedText type="caption" themeColor="textTertiary" style={styles.noReplies}>
                No replies yet. Be the first to weigh in.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.authorId === user?.uid;
            return (
              <View style={styles.reply}>
                <View style={styles.avatar}>
                  <ThemedText type="captionBold" themeColor="primary">
                    {item.authorName.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.replyBody}>
                  <View style={styles.replyHead}>
                    <ThemedText type="captionBold">
                      {mine ? 'You' : item.authorName}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textTertiary">
                      {relativeTime(item.createdAt)}
                    </ThemedText>
                  </View>
                  <ThemedText type="small">{item.text}</ThemedText>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a reply…"
            placeholderTextColor={theme.textTertiary}
            style={styles.input}
            multiline
            accessibilityLabel="Reply"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            disabled={!text.trim() || sending}
            onPress={send}
            style={({ pressed }) => [
              styles.send,
              (!text.trim() || sending) && styles.sendDisabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText type="captionBold" themeColor="onPrimary">
              Send
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    header: {
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    list: {
      gap: Spacing.three,
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      flexGrow: 1,
    },
    op: {
      gap: Spacing.two,
      padding: Spacing.three,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
    },
    opTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryTag: {
      paddingHorizontal: Spacing.two,
      paddingVertical: 2,
      borderRadius: Radius.pill,
      backgroundColor: c.primarySubtle,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: Spacing.one,
    },
    noReplies: {
      paddingVertical: Spacing.three,
    },
    reply: {
      flexDirection: 'row',
      gap: Spacing.two,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: Radius.pill,
      backgroundColor: c.primarySubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    replyBody: {
      flex: 1,
      gap: 2,
      padding: Spacing.two,
      borderRadius: Radius.md,
      backgroundColor: c.backgroundElement,
    },
    replyHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.two,
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
      paddingBottom: Spacing.two,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.background,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    input: {
      flex: 1,
      color: c.text,
      fontSize: 15,
      maxHeight: 120,
      minHeight: 40,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      backgroundColor: c.backgroundElement,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    send: {
      height: 40,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.pill,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: {
      opacity: 0.5,
    },
    pad: {
      padding: Spacing.four,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.75,
    },
  });
