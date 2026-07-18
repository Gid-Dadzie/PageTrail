import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Full-screen branded loader.
 *
 * Shown while auth and the user's profile are still resolving. Rendering this
 * instead of `null` keeps the app from flashing a blank screen during the
 * short window after sign-in before the profile snapshot arrives.
 */
export function LoadingScreen({ message }: { message?: string }) {
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
      <ActivityIndicator color={Colors.primary} style={styles.spinner} />
      {message ? (
        <ThemedText type="caption" themeColor="textTertiary">
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
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
