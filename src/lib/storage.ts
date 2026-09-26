import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, isLiveFirebaseConfigured, isDemoMode } from './firebase';
import {
  SEED_USERS,
  SEED_CATEGORIES,
  SEED_WAREHOUSES,
  SEED_LOCATIONS,
  SEED_PRODUCTS,
  SEED_STOCK_BALANCES,
  SEED_RECEIPTS,
  SEED_DELIVERIES,
  SEED_TRANSFERS,
  SEED_ADJUSTMENTS,
  SEED_LEDGER,
  SEED_SETTINGS,
  SEED_REORDERING_RULES
} from './seedData';

const LOCAL_STORAGE_PREFIX = 'stocksense_';

// Initial local seed loader
export function initLocalData() {
  if (typeof window === 'undefined') return;

  const collections = [
    { key: 'users', data: SEED_USERS },
    { key: 'categories', data: SEED_CATEGORIES },
    { key: 'warehouses', data: SEED_WAREHOUSES },
    { key: 'locations', data: SEED_LOCATIONS },
    { key: 'products', data: SEED_PRODUCTS },
    { key: 'stockBalances', data: SEED_STOCK_BALANCES },
    { key: 'receipts', data: SEED_RECEIPTS },
    { key: 'deliveries', data: SEED_DELIVERIES },
    { key: 'transfers', data: SEED_TRANSFERS },
    { key: 'adjustments', data: SEED_ADJUSTMENTS },
    { key: 'stockLedger', data: SEED_LEDGER },
    { key: 'reorderingRules', data: SEED_REORDERING_RULES },
    { key: 'settings', data: [SEED_SETTINGS] },
    { key: 'notifications', data: [] }
  ];

  for (const item of collections) {
    const key = LOCAL_STORAGE_PREFIX + item.key;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(item.data));
    }
  }
}

// Ensure local store is initialized
initLocalData();

export function resetDatabaseToSeed() {
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'users', JSON.stringify(SEED_USERS));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'categories', JSON.stringify(SEED_CATEGORIES));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'warehouses', JSON.stringify(SEED_WAREHOUSES));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'locations', JSON.stringify(SEED_LOCATIONS));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'products', JSON.stringify(SEED_PRODUCTS));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'stockBalances', JSON.stringify(SEED_STOCK_BALANCES));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'receipts', JSON.stringify(SEED_RECEIPTS));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'deliveries', JSON.stringify(SEED_DELIVERIES));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'transfers', JSON.stringify(SEED_TRANSFERS));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'adjustments', JSON.stringify(SEED_ADJUSTMENTS));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'stockLedger', JSON.stringify(SEED_LEDGER));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'reorderingRules', JSON.stringify(SEED_REORDERING_RULES));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'settings', JSON.stringify([SEED_SETTINGS]));
  localStorage.setItem(LOCAL_STORAGE_PREFIX + 'notifications', JSON.stringify([]));

  window.dispatchEvent(new CustomEvent('stocksense_db_updated', { detail: { collection: 'all' } }));
}

function getLocalCollection<T>(collectionName: string): T[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_PREFIX + collectionName);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error(`Error reading ${collectionName} from localStorage:`, err);
    return [];
  }
}

function setLocalCollection<T>(collectionName: string, items: T[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + collectionName, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('stocksense_db_updated', { detail: { collection: collectionName } }));
  } catch (err) {
    console.error(`Error saving ${collectionName} to localStorage:`, err);
  }
}

export async function getCollectionData<T extends { id: string }>(collectionName: string): Promise<T[]> {
  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as T));
    } catch (err) {
      console.warn(`Firestore read failed for ${collectionName}, falling back to local demo storage:`, err);
    }
  }
  return getLocalCollection<T>(collectionName);
}

export async function getDocumentData<T extends { id: string }>(collectionName: string, id: string): Promise<T | null> {
  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const docRef = doc(db, collectionName, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as T;
      }
      return null;
    } catch (err) {
      console.warn(`Firestore read doc failed for ${collectionName}/${id}, falling back:`, err);
    }
  }
  const items = getLocalCollection<T>(collectionName);
  return items.find(i => i.id === id) || null;
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export async function setDocumentData<T extends { id: string }>(collectionName: string, id: string, data: T): Promise<void> {
  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, stripUndefined(data), { merge: true });
    } catch (err) {
      console.warn(`Firestore setDoc failed for ${collectionName}/${id}, saving locally:`, err);
    }
  }

  const items = getLocalCollection<T>(collectionName);
  const index = items.findIndex(i => i.id === id);
  if (index >= 0) {
    items[index] = { ...items[index], ...data };
  } else {
    items.push({ ...data, id });
  }
  setLocalCollection(collectionName, items);
}

export async function addDocumentData<T extends Record<string, any>>(collectionName: string, data: T): Promise<string> {
  const generatedId = (data as any).id || `${collectionName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const itemWithId = { ...data, id: generatedId };

  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const colRef = collection(db, collectionName);
      const docRef = await addDoc(colRef, stripUndefined(data) as any);
      itemWithId.id = docRef.id;
    } catch (err) {
      console.warn(`Firestore addDoc failed for ${collectionName}, saving locally:`, err);
    }
  }

  const items = getLocalCollection<any>(collectionName);
  items.unshift(itemWithId);
  setLocalCollection(collectionName, items);
  return itemWithId.id;
}

export async function updateDocumentData<T extends Record<string, any>>(collectionName: string, id: string, updates: Partial<T>): Promise<void> {
  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, stripUndefined(updates as any));
    } catch (err) {
      console.warn(`Firestore updateDoc failed for ${collectionName}/${id}, updating locally:`, err);
    }
  }

  const items = getLocalCollection<any>(collectionName);
  const index = items.findIndex(i => i.id === id);
  if (index >= 0) {
    items[index] = { ...items[index], ...updates };
    setLocalCollection(collectionName, items);
  }
}

export async function deleteDocumentData(collectionName: string, id: string): Promise<void> {
  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`Firestore deleteDoc failed for ${collectionName}/${id}, deleting locally:`, err);
    }
  }

  const items = getLocalCollection<any>(collectionName);
  const filtered = items.filter(i => i.id !== id);
  setLocalCollection(collectionName, filtered);
}

// Reactive subscription helper
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  callback: (items: T[]) => void
): () => void {
  let unsubFirestore: (() => void) | null = null;

  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const colRef = collection(db, collectionName);
      unsubFirestore = onSnapshot(colRef, (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
        callback(items);
      }, (err) => {
        console.warn(`onSnapshot error for ${collectionName}:`, err);
      });
    } catch (err) {
      console.warn(`Failed to attach onSnapshot to ${collectionName}:`, err);
    }
  }

  // Initial trigger from storage
  callback(getLocalCollection<T>(collectionName));

  const handleUpdate = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.collection === collectionName || customEvent.detail?.collection === 'all') {
      callback(getLocalCollection<T>(collectionName));
    }
  };

  window.addEventListener('stocksense_db_updated', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    if (unsubFirestore) unsubFirestore();
    window.removeEventListener('stocksense_db_updated', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}
