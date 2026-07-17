import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence exists at runtime; Firebase's TS types don't expose it yet
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);