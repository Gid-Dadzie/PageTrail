import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

export type BookCoverProps = {
  uri: string;
  title: string;
  width: number;
  /** Standard trade paperback proportions. */
  aspectRatio?: number;
};

/** Cover art with a readable fallback when the catalogue has no image. */
export function BookCover({ uri, title, width, aspectRatio = 2 / 3 }: BookCoverProps) {
  const height = width / aspectRatio;
  const styles = useThemedStyles(stylesheet);

  if (!uri) {
    return (
      <View style={[styles.fallback, { width, height }]}>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={4}>
          {title}
        </ThemedText>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { width, height }]}
      contentFit="cover"
      transition={180}
      accessibilityLabel={`Cover of ${title}`}
    />
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    image: {
      borderRadius: Radius.sm,
      backgroundColor: c.backgroundElement,
    },
    fallback: {
      borderRadius: Radius.sm,
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.two,
      justifyContent: 'flex-end',
    },
  });
