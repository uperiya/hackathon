import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as Record<string, string>);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyD8yP2d8yIeHH8T7gk2l9PrFpsO1LWfnNE",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "odoo-hackathon-772dd.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "odoo-hackathon-772dd",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "odoo-hackathon-772dd.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "405475347985",
  appId: env.VITE_FIREBASE_APP_ID || "1:405475347985:web:b9f87e7d756652aaf42bb0",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-BYVKG9V9MW"
};

// Check if credentials are real or placeholder
export const isLiveFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  !firebaseConfig.apiKey.includes('DemoKey') &&
  firebaseConfig.projectId !== 'your-project-id' &&
  firebaseConfig.projectId !== 'demo-project'
);

export const isDemoMode = env.VITE_DEMO_MODE === 'true';

// Initialize Firebase App safely
export const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Safe Analytics initialization for browser environments
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
