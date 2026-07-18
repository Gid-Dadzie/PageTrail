import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

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

const styles = StyleSheet.create({
  image: {
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundElement,
  },
  fallback: {
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.two,
    justifyContent: 'flex-end',
  },
});
