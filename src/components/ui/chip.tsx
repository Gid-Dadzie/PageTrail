import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Selectable pill used for genres, age ranges, and filters. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const styles = useThemedStyles(stylesheet);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipIdle,
        pressed && styles.pressed,
      ]}>
      <ThemedText type="small" themeColor={selected ? 'onPrimary' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    chip: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Radius.pill,
      borderWidth: 1,
    },
    chipIdle: {
      backgroundColor: 'transparent',
      borderColor: c.primary,
    },
    chipSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    pressed: {
      opacity: 0.7,
    },
  });
