/**
 * Peer-to-peer exchange — the C2C half of the proposal's revenue model.
 *
 * Users list copies they own; other readers nearby can request them. Each
 * listing mints a Book Passport so the copy carries its provenance across the
 * handover.
 */

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { logSnapshotError } from './errors';
import { db } from './firebase';

export type ListingKind = 'exchange' | 'resale' | 'giveaway';
export type ListingStatus = 'open' | 'reserved' | 'completed';

export type Listing = {
  id: string;
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string;
  isbn: string;
  ownerId: string;
  ownerName: string;
  /** Free-text location; the proposal scopes real geo-matching to future work. */
  city: string;
  kind: ListingKind;
  /** Asking price for `resale`, otherwise 0. */
  price: number;
  condition: string;
  passportCode: string;
  status: ListingStatus;
  /** Set when the owner spends PageCoins to surface the listing first. */
  boosted: boolean;
  createdAt: Date | null;
};

export type ListingInput = Omit<Listing, 'id' | 'createdAt' | 'status' | 'boosted'>;

function listingsCollection() {
  return collection(db, 'listings');
}

export async function createListing(input: ListingInput): Promise<string> {
  const ref = await addDoc(listingsCollection(), {
    ...input,
    status: 'open' satisfies ListingStatus,
    boosted: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setListingStatus(id: string, status: ListingStatus): Promise<void> {
  await updateDoc(doc(db, 'listings', id), { status });
}

/** Redeeming `exchangePriority` pins a listing above unboosted ones. */
export async function boostListing(id: string): Promise<void> {
  await updateDoc(doc(db, 'listings', id), { boosted: true });
}

function mapListing(id: string, data: Record<string, any>): Listing {
  return {
    id,
    bookId: data.bookId,
    title: data.title ?? '',
    authors: data.authors ?? [],
    coverUrl: data.coverUrl ?? '',
    isbn: data.isbn ?? '',
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? 'A reader',
    city: data.city ?? '',
    kind: data.kind ?? 'exchange',
    price: data.price ?? 0,
    condition: data.condition ?? '',
    passportCode: data.passportCode ?? '',
    status: data.status ?? 'open',
    boosted: !!data.boosted,
    createdAt: data.createdAt?.toDate?.() ?? null,
  };
}

/**
 * Open listings, boosted first.
 *
 * Ordering is done client-side: Firestore would need a composite index for
 * `boosted desc, createdAt desc` alongside the status filter, and the result
 * set here is small.
 */
export function subscribeToOpenListings(onChange: (listings: Listing[]) => void) {
  const q = query(listingsCollection(), where('status', '==', 'open'));

  return onSnapshot(
    q,
    (snap) => {
      const listings = snap.docs.map((d) => mapListing(d.id, d.data()));
      listings.sort((a, b) => {
        if (a.boosted !== b.boosted) return a.boosted ? -1 : 1;
        return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
      });
      onChange(listings);
    },
    (error) => {
      logSnapshotError('open listings')(error);
      onChange([]);
    }
  );
}

export function subscribeToMyListings(uid: string, onChange: (listings: Listing[]) => void) {
  const q = query(listingsCollection(), where('ownerId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapListing(d.id, d.data()))),
    (error) => {
      logSnapshotError('my listings')(error);
      onChange([]);
    }
  );
}
