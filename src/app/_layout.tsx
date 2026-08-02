import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoadingScreen } from '@/components/loading-screen';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ThemeProvider, useThemeMode } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, profile, loading } = useAuth();
  const { scheme, hydrated } = useThemeMode();
  const theme = useTheme();

  // PageTrail's palette applied to the navigator's own chrome, so pushed
  // screens and the card background match the active theme rather than
  // flashing the navigator default mid-transition.
  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.background,
        card: theme.background,
        text: theme.text,
        primary: theme.primary,
        border: theme.border,
      },
    };
  }, [scheme, theme]);

  // Hold the splash until the saved theme is known too — otherwise the first
  // frame paints in the default scheme and then snaps to the stored one.
  const ready = !loading && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // While auth and the profile resolve, show a branded loader rather than a
  // blank screen. This covers both the initial session restore and the brief
  // window after sign-in before the profile snapshot arrives.
  if (!ready) return <LoadingScreen />;

  const signedIn = !!user;
  const onboarded = !!profile?.onboardingComplete;

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
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
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Outermost so every screen, the loader, and the navigator chrome all
          read the same palette. */}
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
