/**
 * Discussion forum — threaded conversations between readers.
 *
 * Distinct from the social feed (a one-way activity stream): here a reader opens
 * a thread on a topic and others reply, so threads are ordered by their most
 * recent reply to keep active discussions on top.
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { logSnapshotError } from './errors';
import { db } from './firebase';

export type ForumCategory =
  | 'general'
  | 'recommendations'
  | 'reviews'
  | 'challenges'
  | 'off-topic';

export const FORUM_CATEGORIES: { value: ForumCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'reviews', label: 'Reviews & Spoilers' },
  { value: 'challenges', label: 'Challenges' },
  { value: 'off-topic', label: 'Off-topic' },
];

export function categoryLabel(value: string): string {
  return FORUM_CATEGORIES.find((c) => c.value === value)?.label ?? 'General';
}

export type Thread = {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  category: ForumCategory;
  replyCount: number;
  createdAt: Date | null;
  /** When the last reply landed; drives the "active discussions first" order. */
  lastReplyAt: Date | null;
};

export type Reply = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date | null;
};

export type ThreadInput = {
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  category: ForumCategory;
};

function threadsCollection() {
  return collection(db, 'forumThreads');
}

function repliesCollection(threadId: string) {
  return collection(db, 'forumThreads', threadId, 'replies');
}

export async function createThread(input: ThreadInput): Promise<string> {
  const ref = await addDoc(threadsCollection(), {
    ...input,
    replyCount: 0,
    createdAt: serverTimestamp(),
    // Seed lastReplyAt with creation time so a reply-less thread still sorts.
    lastReplyAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fetchThread(id: string): Promise<Thread | null> {
  const snap = await getDoc(doc(db, 'forumThreads', id));
  if (!snap.exists()) return null;
  return mapThread(snap.id, snap.data());
}

/**
 * Posts a reply and bumps the thread.
 *
 * `replyCount` and `lastReplyAt` are denormalised onto the thread so the list
 * can show counts and order by activity without reading every reply.
 */
export async function addReply(
  threadId: string,
  reply: { authorId: string; authorName: string; text: string }
): Promise<void> {
  await addDoc(repliesCollection(threadId), { ...reply, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'forumThreads', threadId), {
    replyCount: increment(1),
    lastReplyAt: serverTimestamp(),
  });
}

function mapThread(id: string, data: Record<string, any>): Thread {
  return {
    id,
    title: data.title ?? '',
    body: data.body ?? '',
    authorId: data.authorId,
    authorName: data.authorName ?? 'A reader',
    category: data.category ?? 'general',
    replyCount: data.replyCount ?? 0,
    createdAt: data.createdAt?.toDate?.() ?? null,
    lastReplyAt: data.lastReplyAt?.toDate?.() ?? null,
  };
}

/**
 * Live thread list, most recently active first.
 *
 * A category filter would need a composite index alongside the `lastReplyAt`
 * order, so filtering is applied client-side over this small result set.
 */
export function subscribeToThreads(onChange: (threads: Thread[]) => void, max = 50) {
  const q = query(threadsCollection(), orderBy('lastReplyAt', 'desc'), fbLimit(max));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapThread(d.id, d.data()))),
    (error) => {
      logSnapshotError('forum threads')(error);
      onChange([]);
    }
  );
}

export function subscribeToReplies(threadId: string, onChange: (replies: Reply[]) => void) {
  const q = query(repliesCollection(threadId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorId: data.authorId,
            authorName: data.authorName ?? 'A reader',
            text: data.text ?? '',
            createdAt: data.createdAt?.toDate?.() ?? null,
          };
        })
      ),
    (error) => {
      logSnapshotError('forum replies')(error);
      onChange([]);
    }
  );
}