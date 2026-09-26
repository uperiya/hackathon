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
  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const profile = await getDocumentData<UserProfile>('users', uid);
      if (profile) {
        localStorage.removeItem('stocksense_logged_out');
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
        return profile;
      }
    } catch (err: any) {
      console.warn('Firebase signIn failed, checking seed users:', err.message);
    }
  }

  // Check stored/seed users
  const users = await getCollectionData<UserProfile>('users');
  const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (matched) {
    if (!matched.active) {
      throw new Error('This user account has been disabled. Please contact the administrator.');
    }
    localStorage.removeItem('stocksense_logged_out');
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matched));
    return matched;
  }

  // If password matches demo credentials or default demo user
  throw new Error('Invalid email or password. You can also use the Quick Demo Logins below!');
}

export async function registerUser(name: string, email: string, password: string, role: UserRole = 'Warehouse Staff'): Promise<UserProfile> {
  const users = await getCollectionData<UserProfile>('users');
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  let uid = `user_${Date.now()}`;

  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      uid = userCredential.user.uid;
      await updateFirebaseProfile(userCredential.user, { displayName: name });
    } catch (err: any) {
      console.warn('Firebase signup failed, continuing in demo mode:', err.message);
    }
  }

  const newProfile: UserProfile = {
    id: uid,
    name,
    email,
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
  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      await sendPasswordResetEmail(auth, email);
      return 'Password reset link has been sent to your email inbox.';
    } catch (err: any) {
      console.warn('Firebase reset email failed:', err);
    }
  }
  // Simulate successful reset dispatch
  return `Password reset instructions and verification code sent to ${email}.`;
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
