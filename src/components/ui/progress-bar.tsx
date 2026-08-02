import { StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

export type ProgressBarProps = {
  /** Completion from 0 to 1; values outside the range are clamped. */
  value: number;
  height?: number;
};

export function ProgressBar({ value, height = 6 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const styles = useThemedStyles(stylesheet);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    track: {
      backgroundColor: c.backgroundSelected,
      borderRadius: Radius.pill,
      overflow: 'hidden',
      width: '100%',
    },
    fill: {
      height: '100%',
      backgroundColor: c.primary,
      borderRadius: Radius.pill,
    },
  });
