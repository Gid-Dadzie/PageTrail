import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Filled glyph when active, outline when not — matches the mockup's tab bar. */
function icon(active: IconName, inactive: IconName) {
  function TabBarIcon({
    color,
    focused,
    size,
  }: {
    color: ColorValue;
    focused: boolean;
    size: number;
  }) {
    return <Ionicons name={focused ? active : inactive} color={color} size={size} />;
  }

  return TabBarIcon;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          // Add the real bottom inset so the bar clears the system navigation
          // bar under Android edge-to-edge (enabled by default in SDK 54);
          // hardcoding the height hid it behind the gesture bar.
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover', tabBarIcon: icon('compass', 'compass-outline') }}
      />
      <Tabs.Screen
        name="shelves"
        options={{ title: 'Shelves', tabBarIcon: icon('library', 'library-outline') }}
      />
      <Tabs.Screen
        name="feed"
        options={{ title: 'Feed', tabBarIcon: icon('newspaper', 'newspaper-outline') }}
      />
      <Tabs.Screen
        name="forum"
        options={{ title: 'Forum', tabBarIcon: icon('chatbubbles', 'chatbubbles-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: icon('person-circle', 'person-circle-outline') }}
      />
    </Tabs>
  );
}
