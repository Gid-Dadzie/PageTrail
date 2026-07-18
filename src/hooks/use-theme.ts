import { Colors } from '@/constants/theme';

/** PageTrail is dark-only by design, so this returns the single palette. */
export function useTheme() {
  return Colors;
}
