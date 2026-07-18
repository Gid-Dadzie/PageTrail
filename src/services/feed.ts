/**
 * Social feed — posts, likes, and comments.
 *
 * Firestore listeners back the feed directly, which the proposal's architecture
 * calls for so social updates arrive without polling the API layer.
 */

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  limit as fbLimit,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { logSnapshotError } from './errors';
import { db } from './firebase';

export type PostKind = 'review' | 'progress' | 'finished' | 'listing';

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  kind: PostKind;
  text: string;
  /** Book the post is about; empty for a plain status update. */
  bookId: string;
  bookTitle: string;
  bookCover: string;
  rating: number;
  likedBy: string[];
  commentCount: number;
  createdAt: Date | null;
};

export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date | null;
};

export type PostInput = Omit<
  Post,
  'id' | 'createdAt' | 'likedBy' | 'commentCount'
>;

function postsCollection() {
  return collection(db, 'posts');
}

function commentsCollection(postId: string) {
  return collection(db, 'posts', postId, 'comments');
}

export async function createPost(input: PostInput): Promise<string> {
  const ref = await addDoc(postsCollection(), {
    ...input,
    likedBy: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

/**
 * Toggles a like.
 *
 * The liker set is stored on the post so a like needs one write and the feed
 * can render like state without a per-post subcollection read.
 */
export async function toggleLike(postId: string, uid: string, liked: boolean): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function addComment(
  postId: string,
  comment: { authorId: string; authorName: string; text: string }
): Promise<void> {
  await addDoc(commentsCollection(postId), { ...comment, createdAt: serverTimestamp() });
  // Denormalised so the feed can show a count without reading every comment.
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
}

function mapPost(id: string, data: Record<string, any>): Post {
  return {
    id,
    authorId: data.authorId,
    authorName: data.authorName ?? 'A reader',
    authorAvatar: data.authorAvatar ?? '',
    kind: data.kind ?? 'review',
    text: data.text ?? '',
    bookId: data.bookId ?? '',
    bookTitle: data.bookTitle ?? '',
    bookCover: data.bookCover ?? '',
    rating: data.rating ?? 0,
    likedBy: data.likedBy ?? [],
    commentCount: data.commentCount ?? 0,
    createdAt: data.createdAt?.toDate?.() ?? null,
  };
}

export function subscribeToFeed(onChange: (posts: Post[]) => void, max = 50) {
  const q = query(postsCollection(), orderBy('createdAt', 'desc'), fbLimit(max));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapPost(d.id, d.data()))),
    (error) => {
      logSnapshotError('feed')(error);
      onChange([]);
    }
  );
}

export function subscribeToComments(postId: string, onChange: (comments: Comment[]) => void) {
  const q = query(commentsCollection(postId), orderBy('createdAt', 'asc'));
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
      logSnapshotError('comments')(error);
      onChange([]);
    }
  );
}
