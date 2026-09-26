import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { auth, isLiveFirebaseConfigured, isDemoMode } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { getCollectionData, getDocumentData, setDocumentData } from '../lib/storage';
import { SEED_USERS } from '../lib/seedData';

const CURRENT_USER_KEY = 'stocksense_auth_user';

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const cleanEmail = email.trim();

  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const uid = userCredential.user.uid;
      let profile = await getDocumentData<UserProfile>('users', uid);

      if (!profile) {
        // User exists in Firebase Auth (e.g. created directly in Firebase Console)
        // Auto-provision their profile document in Firestore
        const role: UserRole = cleanEmail.toLowerCase().includes('admin')
          ? 'Admin'
          : cleanEmail.toLowerCase().includes('manager')
            ? 'Inventory Manager'
            : 'Warehouse Staff';

        profile = {
          id: uid,
          name: userCredential.user.displayName || cleanEmail.split('@')[0],
          email: userCredential.user.email || cleanEmail,
          role,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        try {
          await setDocumentData('users', uid, profile);
        } catch (saveErr) {
          console.warn('Could not persist auto-created profile to Firestore, using in memory:', saveErr);
        }
      }

      if (!profile.active) {
        throw new Error('This user account has been disabled. Please contact the administrator.');
      }

      localStorage.removeItem('stocksense_logged_out');
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      return profile;
    } catch (err: any) {
      console.warn('Firebase signIn attempt:', err.code, err.message);

      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        throw new Error('Incorrect email or password. Please verify the credentials entered in Firebase Authentication.');
      }
      if (err.code === 'auth/user-not-found') {
        throw new Error(`No account found with email "${cleanEmail}". Please check your email or create an account.`);
      }
      if (err.code === 'auth/user-disabled') {
        throw new Error('This user account has been disabled in Firebase Authentication.');
      }
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Firebase has temporarily locked this account. Please wait a few minutes or reset your password.');
      }
      if (err.code === 'auth/network-request-failed') {
        throw new Error('Network error contacting Firebase. Please check your internet connection.');
      }
      if (err.message && !err.message.includes('signInWithEmailAndPassword')) {
        throw err;
      }
    }
  }

  // Check stored/seed users
  const users = await getCollectionData<UserProfile>('users');
  const matched = users.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());

  if (matched) {
    if (!matched.active) {
      throw new Error('This user account has been disabled. Please contact the administrator.');
    }
    localStorage.removeItem('stocksense_logged_out');
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matched));
    return matched;
  }

  // If password matches demo credentials or default demo user
  throw new Error('Invalid email or password. Please verify your email and password match what was entered in Firebase Authentication.');
}

export async function registerUser(name: string, email: string, password: string, role: UserRole = 'Warehouse Staff'): Promise<UserProfile> {
  const cleanEmail = email.trim();
  const users = await getCollectionData<UserProfile>('users');
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  let uid = `user_${Date.now()}`;

  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      uid = userCredential.user.uid;
      await updateFirebaseProfile(userCredential.user, { displayName: name });
    } catch (err: any) {
      console.warn('Firebase signup error:', err.code, err.message);
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('This email address is already registered in Firebase. Please log in instead.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please provide a valid email address.');
      }
    }
  }

  const newProfile: UserProfile = {
    id: uid,
    name,
    email: cleanEmail,
    role,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDocumentData('users', uid, newProfile);
  localStorage.removeItem('stocksense_logged_out');
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newProfile));
  return newProfile;
}

export async function requestPasswordReset(email: string): Promise<string> {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    throw new Error('Please provide your registered email address.');
  }

  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return `A password reset link has been dispatched to ${cleanEmail}. Please check your Inbox and Spam/Junk folder (automated Firebase emails are often categorized as Spam).`;
    } catch (err: any) {
      console.error('Firebase reset email failed:', err.code, err.message);
      if (err.code === 'auth/user-not-found') {
        throw new Error(`No account found with email "${cleanEmail}" in Firebase Authentication. Please check spelling or register.`);
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please wait a few minutes before requesting another reset email.');
      }
      if (err.code === 'auth/unauthorized-domain') {
        throw new Error('Domain not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.');
      }
      throw new Error(`Firebase error: ${err.message || 'Failed to dispatch reset email'}`);
    }
  }
  // Simulate successful reset dispatch
  return `Password reset instructions sent to ${cleanEmail}.`;
}

export async function logoutUser(): Promise<void> {
  try {
    if (isLiveFirebaseConfigured && !isDemoMode) {
      await signOut(auth);
    }
  } catch (err) {
    console.warn('Firebase signout error:', err);
  } finally {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem('stocksense_logged_out', 'true');
  }
}

export function getCurrentStoredUser(): UserProfile | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('stocksense_logged_out') === 'true') {
      return null;
    }
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_USER_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse current user from storage', e);
  }
  // Default demo user for first-time evaluation
  return SEED_USERS[0];
}

export async function updateUserDetails(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getDocumentData<UserProfile>('users', userId);
  if (!current) throw new Error('User not found.');

  const updated: UserProfile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await setDocumentData('users', userId, updated);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
  return updated;
}
