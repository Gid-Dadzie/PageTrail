import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type StarRatingProps = {
  /** Current rating, 0..max. */
  value: number;
  max?: number;
  size?: number;
  /** Omit to render read-only. */
  onChange?: (value: number) => void;
};

export function StarRating({ value, max = 5, size = 16, onChange }: StarRatingProps) {
  const readOnly = !onChange;

  return (
    <View
      style={styles.row}
      accessibilityRole={readOnly ? 'text' : 'adjustable'}
      accessibilityLabel={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        const star = (
          <ThemedText
            style={{ fontSize: size }}
            themeColor={filled ? 'star' : 'textTertiary'}>
            {filled ? '★' : '☆'}
          </ThemedText>
        );

        if (readOnly) return <View key={i}>{star}</View>;

        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${i + 1} star${i === 0 ? '' : 's'}`}
            hitSlop={Spacing.one}
            onPress={() => onChange(i + 1)}>
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.half,
    alignItems: 'center',
  },
});
