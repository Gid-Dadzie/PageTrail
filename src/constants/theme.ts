/**
 * PageTrail design tokens.
 *
 * Colours come in a light/dark pair with identical keys, so components only
 * ever name a role (`backgroundElement`, `textSecondary`) and never a literal.
 * `useTheme()` returns whichever palette is active; `useThemedStyles()` rebuilds
 * a stylesheet when it changes.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Every colour role in the app. Both palettes implement it in full. */
export type Palette = {
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  border: string;
  primary: string;
  primaryPressed: string;
  primarySubtle: string;
  onPrimary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  star: string;
  success: string;
  danger: string;
};

export const DarkColors: Palette = {
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
};

/**
 * Light counterpart. The brand amber is deepened from `#F5A524` so it still
 * passes contrast when used as text or an icon on a white surface — the same
 * hue, a darker tone.
 */
export const LightColors: Palette = {
  background: '#F7F7FA',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#ECECF2',
  border: '#E3E3EA',

  primary: '#A15703',
  primaryPressed: '#834602',
  primarySubtle: '#FCEFD9',
  onPrimary: '#FFFFFF',

  text: '#15151A',
  textSecondary: '#5C5C68',
  textTertiary: '#757581',

  star: '#C08400',
  success: '#12855A',
  danger: '#D22F35',
};

export type ThemeColor = keyof Palette;

export const Palettes = { light: LightColors, dark: DarkColors } as const;

export type ColorSchemeName = keyof typeof Palettes;

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
