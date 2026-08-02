import { useMemo } from 'react';

import { Palette } from '@/constants/theme';
import { useThemeMode } from '@/context/theme-context';

/** The active palette. Re-renders callers when the theme is switched. */
export function useTheme(): Palette {
  return useThemeMode().colors;
}

/**
 * Builds a stylesheet from the active palette, rebuilding only when the theme
 * changes. Declare the factory at module scope so it is not re-created per
 * render:
 *
 * ```tsx
 * const stylesheet = (c: Palette) => StyleSheet.create({ card: { backgroundColor: c.backgroundElement } });
 *
 * function Card() {
 *   const styles = useThemedStyles(stylesheet);
 * }
 * ```
 */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const colors = useTheme();
  return useMemo(() => resolve(factory, colors), [factory, colors]);
}

/**
 * One stylesheet per (factory, palette) pair, shared across every component
 * instance — a list of 30 rows would otherwise build 30 identical copies.
 * Keyed weakly on the factory so unmounted screens can be collected.
 */
const cache = new WeakMap<(colors: Palette) => unknown, Map<Palette, unknown>>();

function resolve<T>(factory: (colors: Palette) => T, colors: Palette): T {
  let perPalette = cache.get(factory);
  if (!perPalette) {
    perPalette = new Map();
    cache.set(factory, perPalette);
  }

  if (!perPalette.has(colors)) perPalette.set(colors, factory(colors));
  return perPalette.get(colors) as T;
}
