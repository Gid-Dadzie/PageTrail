import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { ThemeMode, useThemeMode } from '@/context/theme-context';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

/**
 * Compact sun/moon button. Sized to sit in a `ScreenHeader`'s `right` slot, and
 * flips straight between light and dark without going through `system`.
 */
export function ThemeToggleButton() {
  const { scheme, toggle } = useThemeMode();
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);

  const goingTo = scheme === 'dark' ? 'light' : 'dark';

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: scheme === 'dark' }}
      accessibilityLabel={`Switch to ${goingTo} mode`}
      hitSlop={Spacing.two}
      onPress={toggle}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons
        name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
        size={20}
        color={theme.primary}
      />
    </Pressable>
  );
}

const OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

/**
 * Three-way appearance control. Unlike the button this exposes `system`, so the
 * app can follow the OS — the reason it lives on the settings-style screen
 * rather than in a header.
 */
export function ThemeModeSelector() {
  const { mode, setMode } = useThemeMode();
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);

  return (
    <View accessibilityRole="radiogroup" style={styles.segmented}>
      {OPTIONS.map((option) => {
        const selected = mode === option.mode;

        return (
          <Pressable
            key={option.mode}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label} appearance`}
            onPress={() => setMode(option.mode)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && styles.pressed,
            ]}>
            <Ionicons
              name={option.icon}
              size={16}
              color={selected ? theme.onPrimary : theme.textSecondary}
            />
            <ThemedText type="captionBold" themeColor={selected ? 'onPrimary' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmented: {
      flexDirection: 'row',
      gap: Spacing.one,
      padding: Spacing.one,
      borderRadius: Radius.pill,
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.one,
      paddingVertical: Spacing.two,
      borderRadius: Radius.pill,
    },
    segmentSelected: {
      backgroundColor: c.primary,
    },
    pressed: {
      opacity: 0.7,
    },
  });
