import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { authPersistence } from './auth-persistence';

const firebaseConfig = {
  apiKey: 'AIzaSyAdmC6alSrY9aU966bHphWY-2cVcIH0MTQ',
  authDomain: 'pagetrail-94808.firebaseapp.com',
  projectId: 'pagetrail-94808',
  storageBucket: 'pagetrail-94808.firebasestorage.app',
  messagingSenderId: '280142880783',
  appId: '1:280142880783:web:e64a02d5310235c77f837a',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: authPersistence,
});

export const db = getFirestore(app);