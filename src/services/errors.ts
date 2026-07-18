/**
 * Firestore listeners fall back to empty data so a dropped connection or a
 * rules rejection cannot wedge a screen on a spinner. Failing silently would
 * hide real setup problems though — a project without Firestore enabled, or
 * rules that reject a read, both look exactly like "no data yet" — so every
 * fallback logs why it happened.
 */
export function logSnapshotError(scope: string) {
  return (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[PageTrail] ${scope} listener failed — showing empty. ${message}`);
  };
}
