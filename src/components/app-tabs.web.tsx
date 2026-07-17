import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isExplore = pathname === '/explore';

  return (
    <View style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          PageTrail
        </ThemedText>

        <Link href="/" asChild>
          <Pressable style={({ pressed }) => [pressed && styles.pressed]}>
            <ThemedView
              type={isHome ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.tabButtonView}>
              <ThemedText type="small" themeColor={isHome ? 'text' : 'textSecondary'}>
                Home
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Link>

        <Link href="/explore" asChild>
          <Pressable style={({ pressed }) => [pressed && styles.pressed]}>
            <ThemedView
              type={isExplore ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.tabButtonView}>
              <ThemedText type="small" themeColor={isExplore ? 'text' : 'textSecondary'}>
                Explore
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Link>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});