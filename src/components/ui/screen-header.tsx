import { Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Colors, Spacing } from '@/constants/theme';

export type ScreenHeaderProps = {
  title?: string;
  /** Shows an onboarding progress bar beside the back arrow when set (0..1). */
  progress?: number;
  /** Rendered on the trailing edge, e.g. a search or settings button. */
  right?: React.ReactNode;
  onBack?: () => void;
  /**
   * Where the back button goes when there is nothing to pop — a deep link, a
   * reload, or landing here right after the auth guard swapped stacks. Defaults
   * to the home tab so the button is never a dead end.
   */
  fallbackHref?: Href;
};

export function ScreenHeader({
  title,
  progress,
  right,
  onBack,
  fallbackHref = '/',
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={Spacing.three}
        onPress={handleBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <ThemedText type="defaultBold">←</ThemedText>
      </Pressable>

      {progress === undefined ? (
        <ThemedText type="defaultBold" numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
      ) : (
        <View style={styles.progressWrap}>
          <ProgressBar value={progress} />
        </View>
      )}

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 44,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
  },
  progressWrap: {
    flex: 1,
  },
  right: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
});
