import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { logSnapshotError } from './errors';
import { db } from './firebase';

export type Gender = 'male' | 'female' | 'unspecified';

export type UserProfile = {
  uid: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  country: string;
  avatarUrl: string;
  gender: Gender | '';
  ageRange: string;
  favouriteGenres: string[];
  /** PageCoins balance; see `services/pagecoins`. */
  coins: number;
  /** Gates the onboarding route group once the profile step is done. */
  onboardingComplete: boolean;
};

export const EMPTY_PROFILE: Omit<UserProfile, 'uid'> = {
  username: '',
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  country: '',
  avatarUrl: '',
  gender: '',
  ageRange: '',
  favouriteGenres: [],
  coins: 0,
  onboardingComplete: false,
};

export function profileRef(uid: string) {
  return doc(db, 'users', uid);
}

export async function createProfileIfMissing(
  uid: string,
  seed: Partial<UserProfile>
): Promise<void> {
  const ref = profileRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    ...EMPTY_PROFILE,
    ...seed,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  await setDoc(profileRef(uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

export function subscribeToProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void
) {
  return onSnapshot(
    profileRef(uid),
    (snap) => {
      if (!snap.exists()) return onChange(null);
      onChange({ ...EMPTY_PROFILE, ...(snap.data() as UserProfile), uid });
    },
    // A permissions error or dropped connection should not wedge the UI on a
    // loading spinner; treat it as "no profile yet".
    (error) => {
      logSnapshotError('profile')(error);
      onChange(null);
    }
  );
}
