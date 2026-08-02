import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { ColorSchemeName, Palette, Palettes } from '@/constants/theme';

/** What the user picked. `system` defers to the OS appearance setting. */
export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'pagetrail.themeMode';

const isMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

type ThemeContextType = {
  /** The stored preference, including `system`. */
  mode: ThemeMode;
  /** The preference resolved against the OS — always a concrete scheme. */
  scheme: ColorSchemeName;
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
  /** Flips between light and dark, pinning the result (never leaves it on `system`). */
  toggle: () => void;
  /** False until the stored preference has been read back. */
  hydrated: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  scheme: 'dark',
  colors: Palettes.dark,
  setMode: () => {},
  toggle: () => {},
  hydrated: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);

  // Restore the saved preference once on mount. A failed read is not worth
  // surfacing — it just means the app opens on the system appearance.
  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (isMode(stored)) setModeState(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    // Update immediately and persist in the background so the tap never waits
    // on disk; if the write fails the choice still applies for this session.
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme: ColorSchemeName =
    mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const toggle = useCallback(
    () => setMode(scheme === 'dark' ? 'light' : 'dark'),
    [scheme, setMode]
  );

  const value = useMemo(
    () => ({ mode, scheme, colors: Palettes[scheme], setMode, toggle, hydrated }),
    [mode, scheme, setMode, toggle, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Full theme control: the mode, the resolved scheme, and the setters. */
export const useThemeMode = () => useContext(ThemeContext);
