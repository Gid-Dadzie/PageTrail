import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

/** Full-width action button. `primary` is the orange brand action. */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.onPrimary : theme.text} />
      ) : (
        <ThemedText
          type="defaultBold"
          themeColor={variant === 'primary' ? 'onPrimary' : 'text'}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    base: {
      height: 54,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.four,
      flexDirection: 'row',
      gap: Spacing.two,
    },
    primary: {
      backgroundColor: c.primary,
    },
    secondary: {
      backgroundColor: c.backgroundElement,
      borderWidth: 1,
      borderColor: c.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    pressed: {
      opacity: 0.75,
    },
    disabled: {
      opacity: 0.45,
    },
  });
