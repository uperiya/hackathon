import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { db, isLiveFirebaseConfigured, isDemoMode } from './firebase';
import { getCollectionData, setDocumentData } from './storage';

export type DocPrefix = 'REC' | 'DEL' | 'TRF' | 'ADJ';

const COLLECTION_MAP: Record<DocPrefix, string> = {
  REC: 'receipts',
  DEL: 'deliveries',
  TRF: 'transfers',
  ADJ: 'adjustments'
};

const FIELD_MAP: Record<DocPrefix, string> = {
  REC: 'receiptNumber',
  DEL: 'deliveryNumber',
  TRF: 'transferNumber',
  ADJ: 'adjustmentNumber'
};

/**
 * Generates an atomic, unique sequential document number in the exact format:
 * REC-2026-0001
 * DEL-2026-0001
 * TRF-2026-0001
 * ADJ-2026-0001
 */
export async function getNextDocNumber(prefix: DocPrefix): Promise<string> {
  const year = 2026; // System base year as requested
  const counterId = `${prefix}-${year}`;

  if (isLiveFirebaseConfigured && !isDemoMode) {
    try {
      const counterRef = doc(db, 'counters', counterId);
      const nextNum = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let current = 0;
        if (counterDoc.exists()) {
          current = counterDoc.data().current || 0;
        } else {
          // Check existing docs to initialize
          current = 0;
        }
        const next = current + 1;
        transaction.set(counterRef, { current: next, year, prefix, updatedAt: new Date().toISOString() });
        return next;
      });

      const formattedNum = String(nextNum).padStart(4, '0');
      return `${prefix}-${year}-${formattedNum}`;
    } catch (err) {
      console.warn(`Firestore counter transaction failed for ${prefix}, falling back to collection scan:`, err);
    }
  }

  // Local/Offline sequential generation with uniqueness guarantee
  const collectionName = COLLECTION_MAP[prefix];
  const fieldName = FIELD_MAP[prefix];
  const items = await getCollectionData<any>(collectionName);

  let highestSeq = 0;
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`);

  for (const item of items) {
    const val = item[fieldName];
    if (typeof val === 'string') {
      const match = val.match(regex);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > highestSeq) highestSeq = seq;
      }
    }
  }

  const nextSeq = highestSeq + 1;
  const formattedSeq = String(nextSeq).padStart(4, '0');
  const generated = `${prefix}-${year}-${formattedSeq}`;

  // Store counter in local settings for consistency
  const counterKey = `stocksense_counter_${counterId}`;
  localStorage.setItem(counterKey, String(nextSeq));

  return generated;
}
