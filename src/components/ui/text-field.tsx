import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Renders a show/hide toggle and masks input by default. */
  secure?: boolean;
};

export function TextField({ label, error, secure = false, style, ...rest }: TextFieldProps) {
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}>
        <TextInput
          placeholderTextColor={theme.textTertiary}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, style]}
          {...rest}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={Spacing.two}
            onPress={() => setHidden((h) => !h)}>
            <ThemedText type="caption" themeColor="primary">
              {hidden ? 'Show' : 'Hide'}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    wrapper: {
      gap: Spacing.one,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      backgroundColor: c.backgroundElement,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: Spacing.three,
      height: 52,
    },
    fieldFocused: {
      borderColor: c.primary,
    },
    fieldError: {
      borderColor: c.danger,
    },
    input: {
      flex: 1,
      color: c.text,
      fontSize: 15,
      height: '100%',
    },
  });
