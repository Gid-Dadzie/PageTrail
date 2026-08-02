import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ThemeToggleButton } from '@/components/ui/theme-toggle';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const styles = useThemedStyles(stylesheet);

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        {/* The only pre-sign-in appearance control — Profile is unreachable
            until the user has an account. */}
        <SafeAreaView edges={['top']} style={styles.heroToggle}>
          <ThemeToggleButton />
        </SafeAreaView>

        <Image
          source={require('@/assets/images/logo-glow.png')}
          style={styles.heroGlow}
          contentFit="contain"
        />
      </View>

      <SafeAreaView edges={['bottom']} style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <ThemedText type="heading" style={styles.centered}>
            Welcome to <ThemedText type="heading" themeColor="primary">PageTrail</ThemedText> 👋
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            Track every book you read, share the journey with friends, and pass your copies on.
          </ThemedText>

          <View style={styles.actions}>
            <Button
              label="Get Started"
              onPress={() => router.push('/(auth)/sign-up')}
            />
            <Button
              label="I Already Have an Account"
              variant="secondary"
              onPress={() => router.push('/(auth)/sign-in')}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const stylesheet = (c: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.backgroundElement,
    },
    heroToggle: {
      position: 'absolute',
      top: 0,
      right: 0,
      padding: Spacing.three,
    },
    heroGlow: {
      width: 180,
      height: 180,
    },
    sheetWrap: {
      backgroundColor: c.background,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      marginTop: -Radius.xl,
    },
    sheet: {
      padding: Spacing.four,
      gap: Spacing.three,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    centered: {
      textAlign: 'center',
    },
    actions: {
      gap: Spacing.two,
      marginTop: Spacing.two,
    },
  });
