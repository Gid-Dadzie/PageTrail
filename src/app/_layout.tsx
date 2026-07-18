import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoadingScreen } from '@/components/loading-screen';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync();

/** PageTrail's palette applied to the navigator's own chrome. */
const NavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    primary: Colors.primary,
    border: Colors.border,
  },
};

function RootNavigator() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // While auth and the profile resolve, show a branded loader rather than a
  // blank screen. This covers both the initial session restore and the brief
  // window after sign-in before the profile snapshot arrives.
  if (loading) return <LoadingScreen />;

  const signedIn = !!user;
  const onboarded = !!profile?.onboardingComplete;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="book/[id]" />
        <Stack.Screen name="read/[id]" />
        <Stack.Screen name="genre/[slug]" />
        <Stack.Screen name="passport/[code]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="exchange" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="free" />
        <Stack.Screen name="forum/new" />
        <Stack.Screen name="forum/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={NavTheme}>
        <StatusBar style="light" />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
