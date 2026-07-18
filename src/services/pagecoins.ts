/**
 * PageCoins — the loyalty economy described in the proposal.
 *
 * Coins are earned by reading and engaging, and spent on purchase discounts,
 * exchange priority, and early Book Passport unlocks. Balance and ledger are
 * written together so the balance is always explainable from its history.
 */

import {
  addDoc,
  collection,
  getDocs,
  increment,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { logSnapshotError } from './errors';
import { db } from './firebase';
import { profileRef } from './profile';

export type CoinReason =
  | 'finishedBook'
  | 'wroteReview'
  | 'completedChallenge'
  | 'dailyStreak'
  | 'passportNote'
  | 'listedForExchange'
  | 'startedDiscussion'
  | 'purchaseDiscount'
  | 'exchangePriority'
  | 'passportUnlock';

/** Coins granted per earning action. */
export const COIN_REWARDS: Record<string, number> = {
  finishedBook: 50,
  wroteReview: 20,
  completedChallenge: 100,
  dailyStreak: 5,
  passportNote: 15,
  listedForExchange: 25,
  startedDiscussion: 10,
};

/** Coins charged per redemption. */
export const COIN_COSTS: Record<string, number> = {
  purchaseDiscount: 200,
  exchangePriority: 75,
  passportUnlock: 40,
};

export type CoinEntry = {
  id: string;
  amount: number;
  reason: CoinReason;
  note: string;
  createdAt: Date | null;
};

function ledgerCollection(uid: string) {
  return collection(db, 'users', uid, 'coinLedger');
}

/**
 * Credits coins and appends a ledger entry.
 *
 * Earning is idempotent per `dedupeKey` when supplied, so re-finishing a book
 * or re-opening a review screen cannot farm coins.
 */
export async function earnCoins(
  uid: string,
  reason: keyof typeof COIN_REWARDS,
  note = '',
  dedupeKey?: string
): Promise<number> {
  const amount = COIN_REWARDS[reason];
  if (!amount) throw new Error(`Unknown earn reason: ${reason}`);

  if (dedupeKey) {
    const already = await hasEarned(uid, dedupeKey);
    if (already) return 0;
  }

  await addDoc(ledgerCollection(uid), {
    amount,
    reason,
    note,
    dedupeKey: dedupeKey ?? null,
    createdAt: serverTimestamp(),
  });

  // increment() is atomic server-side, so crediting needs no transaction.
  await updateDoc(profileRef(uid), { coins: increment(amount) });

  return amount;
}

/**
 * Debits coins for a redemption.
 *
 * Runs in a transaction so a balance can never go negative under concurrent
 * redemptions. Returns false when the user cannot afford the item.
 */
export async function spendCoins(
  uid: string,
  reason: keyof typeof COIN_COSTS,
  note = ''
): Promise<boolean> {
  const cost = COIN_COSTS[reason];
  if (!cost) throw new Error(`Unknown spend reason: ${reason}`);

  const ok = await runTransaction(db, async (tx) => {
    const snap = await tx.get(profileRef(uid));
    const balance: number = snap.get('coins') ?? 0;
    if (balance < cost) return false;

    tx.update(profileRef(uid), { coins: increment(-cost) });
    return true;
  });

  if (ok) {
    await addDoc(ledgerCollection(uid), {
      amount: -cost,
      reason,
      note,
      dedupeKey: null,
      createdAt: serverTimestamp(),
    });
  }

  return ok;
}

async function hasEarned(uid: string, dedupeKey: string): Promise<boolean> {
  const q = query(ledgerCollection(uid), where('dedupeKey', '==', dedupeKey), fbLimit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

export function subscribeToLedger(
  uid: string,
  onChange: (entries: CoinEntry[]) => void,
  max = 50
) {
  const q = query(ledgerCollection(uid), orderBy('createdAt', 'desc'), fbLimit(max));
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            amount: data.amount ?? 0,
            reason: data.reason,
            note: data.note ?? '',
            createdAt: data.createdAt?.toDate?.() ?? null,
          };
        })
      );
    },
    (error) => {
      logSnapshotError('coin ledger')(error);
      onChange([]);
    }
  );
}
