/**
 * PageTrail design tokens.
 *
 * The product design is dark-only, so there is a single palette rather than a
 * light/dark pair. `useTheme()` returns this object.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  /** App canvas. */
  background: '#101014',
  /** Cards, inputs, and other raised surfaces. */
  backgroundElement: '#1B1B21',
  /** Pressed/selected state for raised surfaces. */
  backgroundSelected: '#26262E',
  /** Hairline dividers and input outlines. */
  border: '#2E2E38',

  /** Brand accent: primary actions, active states, progress. */
  primary: '#F5A524',
  /** Pressed state for primary actions. */
  primaryPressed: '#D2891A',
  /** Tinted primary wash for chips and badges. */
  primarySubtle: '#3A2A0E',
  /** Text/icons rendered on top of `primary`. */
  onPrimary: '#1A1206',

  text: '#FFFFFF',
  textSecondary: '#9B9BA6',
  /** De-emphasised text: placeholders, disabled labels. */
  textTertiary: '#63636E',

  star: '#FFC02D',
  success: '#3DD68C',
  danger: '#F5565B',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  /** Fully rounded pills and chips. */
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
