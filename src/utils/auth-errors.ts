/**
 * Firebase surfaces errors like `auth/invalid-credential`, which is not
 * something to show a reader. This maps the codes we can actually hit to plain
 * language, and falls back to a generic line rather than leaking a raw code.
 */

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'That email is already registered. Try signing in instead.',
  'auth/invalid-email': 'That email address does not look right.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account found with those details.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network problem — check your connection and try again.',
  'auth/requires-recent-login': 'Please sign in again to make this change.',
  'auth/missing-password': 'Enter your password.',
};

export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}
