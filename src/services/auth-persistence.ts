import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Persistence } from 'firebase/auth';
// getReactNativePersistence is only shipped in @firebase/auth's `react-native`
// export condition, which its published types (auth-public.d.ts) don't describe.
// @ts-expect-error -- resolved by Metro on native; absent from the web build.
import { getReactNativePersistence } from 'firebase/auth';

/** Keeps the signed-in session across app restarts via AsyncStorage. */
export const authPersistence: Persistence = getReactNativePersistence(AsyncStorage);
