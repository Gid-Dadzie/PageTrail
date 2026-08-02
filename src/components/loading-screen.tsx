import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

/**
 * Full-screen branded loader.
 *
 * Shown while auth and the user's profile are still resolving. Rendering this
 * instead of `null` keeps the app from flashing a blank screen during the
 * short window after sign-in before the profile snapshot arrives.
 */
export function LoadingScreen({ message }: { message?: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(stylesheet);

  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/images/logo-glow.png')}
        style={styles.logo}
        contentFit="contain"
      />
      <ThemedText type="heading" themeColor="primary">
        PageTrail
      </ThemedText>
      <ActivityIndicator color={theme.primary} style={styles.spinner} />
      {message ? (
        <ThemedText type="caption" themeColor="textTertiary">
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
      gap: Spacing.three,
    },
    logo: {
      width: 96,
      height: 96,
    },
    spinner: {
      marginTop: Spacing.two,
    },
  });
