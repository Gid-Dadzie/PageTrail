import { onAuthStateChanged, signOut as fbSignOut, User } from 'firebase/auth';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { auth } from '@/services/firebase';
import { subscribeToProfile, UserProfile } from '@/services/profile';

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  /** True until both the auth state and the first profile read have resolved. */
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

/** `null` until Firebase reports the restored session, so it is distinct from "signed out". */
type Session = { user: User | null } | null;

/** The profile is stored beside the uid it belongs to; see `profile` below. */
type ProfileFor = { uid: string; profile: UserProfile | null } | null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [profileFor, setProfileFor] = useState<ProfileFor>(null);

  useEffect(() => onAuthStateChanged(auth, (user) => setSession({ user })), []);

  const user = session?.user ?? null;

  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, (profile) =>
      setProfileFor({ uid: user.uid, profile })
    );
  }, [user]);

  // Readiness is derived from whether the loaded profile belongs to the current
  // user rather than tracked in its own state. That keeps the previous user's
  // profile from briefly showing through after a switch, and avoids resetting a
  // flag from inside an effect.
  const profileMatches = !!user && profileFor?.uid === user.uid;
  const profile = profileMatches ? (profileFor?.profile ?? null) : null;
  const loading = session === null || (!!user && !profileMatches);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setProfileFor(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, signOut }),
    [user, profile, loading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
