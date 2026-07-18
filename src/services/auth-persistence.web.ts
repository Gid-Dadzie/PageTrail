import { browserLocalPersistence, type Persistence } from 'firebase/auth';

/** Keeps the signed-in session across reloads via localStorage. */
export const authPersistence: Persistence = browserLocalPersistence;
