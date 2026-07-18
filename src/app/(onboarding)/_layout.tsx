import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: 'gender',
};

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
