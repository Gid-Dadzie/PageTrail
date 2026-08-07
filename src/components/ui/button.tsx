import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  /** The action is running: the label gives way to a spinner. */
  loading?: boolean;
  /**
   * The action exists but isn't ready yet.
   *
   * Unlike `loading`, the label stays put — dimmed, with a spinner beside it —
   * so a button that is about to become available announces itself instead of
   * popping into the layout once its check finishes.
   */
  pending?: boolean;
};

/** Full-width action button. `primary` is the orange brand action. */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  pending = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading || pending;
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
        // `pending` dims less than `disabled`, so the label and spinner stay
        // readable while the reader waits on them.
        pending ? styles.pending : isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.onPrimary : theme.text} />
      ) : (
        <>
          <ThemedText
            type="defaultBold"
            themeColor={variant === 'primary' ? 'onPrimary' : 'text'}>
            {label}
          </ThemedText>
          {pending ? (
            <ActivityIndicator
              size="small"
              color={variant === 'primary' ? theme.onPrimary : theme.text}
            />
          ) : null}
        </>
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
    pending: {
      opacity: 0.65,
    },
  });
