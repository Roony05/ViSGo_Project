/**
 * Firestore data layer.
 *
 * Mirrors the shape of the localStorage `Storage` API so `storage.ts` can pick
 * a backend at runtime without components knowing which one is live.
 *
 * TWO RULES SHAPE EVERYTHING BELOW.
 *
 * 1. SECURITY RULES FILTER QUERIES, NOT RESULTS. A rule that lets a booking be
 *    read by its owner does not make `getDocs(collection('bookings'))` return
 *    the owner's subset — it rejects the whole read, because that query is not
 *    provably restricted to rows the caller may see. Private collections must
 *    therefore be asked for *by owner*, and writes must be narrowed to rows the
 *    caller actually owns; a batch containing one foreign row fails entirely.
 *
 * 2. QUOTA DISCIPLINE. The Spark plan allows 50,000 document reads and 20,000
 *    writes per day. A naive implementation that re-fetches on every render, or
 *    rewrites a whole collection on every save, burns that in minutes — and on
 *    Spark exceeding it means the app *stops working* (it never means a
 *    surprise bill, which is the point of staying on Spark). So reads go
 *    through a short-lived cache and writes push only rows that changed.
 */

import { getFirebase } from '../config/firebase';
import type { Booking, HostKycApplication, LocalVideo, Tour, TourReview, User, UserRole } from '../types';

const COLLECTIONS = {
  profiles: 'profiles',
  tours: 'tours',
  bookings: 'bookings',
  reviews: 'reviews',
  kyc: 'kyc',
  videos: 'videos',
} as const;

type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * Who is asking. Reads and writes of private collections are scoped to this;
 * `null` means signed out, which can see public data and write nothing.
 */
export interface CloudIdentity {
  uid: string;
  role: UserRole;
}

/** How long a collection snapshot is reused before Firestore is asked again. */
const CACHE_TTL_MS = 30_000;

interface CacheEntry<T> {
  data: T[];
  fetchedAt: number;
}

/**
 * Keyed by collection *and* scope: a host's booking list and an admin's are
 * different reads of the same collection, and serving one for the other would
 * leak rows in one direction and hide them in the other.
 */
const cache = new Map<string, CacheEntry<unknown>>();
const keyOf = (name: CollectionName, scope: string): string => `${name}|${scope}`;

/** Drops cached snapshots so the next read is authoritative. */
export function invalidate(name?: CollectionName): void {
  if (!name) {
    cache.clear();
    return;
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${name}|`)) cache.delete(key);
  }
}

/**
 * Firestore rejects `undefined` field values outright. Our types use optional
 * fields liberally, so strip them before every write rather than auditing each
 * call site.
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = stripUndefined(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/**
 * A stable fingerprint of a row, used to tell a real edit from a re-save.
 *
 * Key order has to be normalised: a row that came back from Firestore and the
 * same row rebuilt locally hold identical data in different order, and a plain
 * JSON.stringify would call every row changed and push the whole collection.
 */
function fingerprint(row: unknown): string {
  return JSON.stringify(row, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value as Record<string, unknown>)
            .sort()
            .map((k) => [k, (value as Record<string, unknown>)[k]]),
        )
      : value,
  );
}

/** Last state pushed (or pulled) per row, so a save can send only the deltas. */
const lastKnown = new Map<CollectionName, Map<string, string>>();

function baseline(name: CollectionName): Map<string, string> {
  let map = lastKnown.get(name);
  if (!map) {
    map = new Map();
    lastKnown.set(name, map);
  }
  return map;
}

function remember<T extends { id: string }>(name: CollectionName, rows: T[]): void {
  const base = baseline(name);
  for (const row of rows) base.set(row.id, fingerprint(row));
}

async function cached<T extends { id: string }>(
  name: CollectionName,
  scope: string,
  run: (db: Awaited<ReturnType<typeof getFirebase>>) => Promise<T[]>,
): Promise<T[] | null> {
  const entry = cache.get(keyOf(name, scope)) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.fetchedAt <= CACHE_TTL_MS) return entry.data;

  const fb = await getFirebase();
  if (!fb) return null;

  const rows = await run(fb);
  cache.set(keyOf(name, scope), { data: rows, fetchedAt: Date.now() });
  remember(name, rows);
  return rows;
}

/** A collection the rules make world-readable: read it whole. */
async function fetchPublic<T extends { id: string }>(name: CollectionName): Promise<T[] | null> {
  return cached<T>(name, 'public', async (fb) => {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(fb!.db, name));
    return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
  });
}

/**
 * A private collection, read by ownership.
 *
 * `ownerFields` are the fields that may carry the caller's uid — a booking is
 * visible to both its traveller (`customerId`) and its host (`hostId`), which is
 * two queries, because Firestore has no OR across different fields that rules
 * will accept. An admin is allowed the unscoped read: the rule passes for every
 * document, so the query as a whole is permitted.
 */
async function fetchOwned<T extends { id: string }>(
  name: CollectionName,
  identity: CloudIdentity | null,
  ownerFields: string[],
): Promise<T[] | null> {
  // null, not []: signed out means "we did not look", and the caller treats an
  // empty array as an authoritative answer that would clear what is on the
  // device. A visitor browsing before signing in must keep their local data.
  if (!identity) return null;

  if (identity.role === 'admin') return fetchPublic<T>(name);

  return cached<T>(name, identity.uid, async (fb) => {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const col = collection(fb!.db, name);
    const snaps = await Promise.all(
      ownerFields.map((field) => getDocs(query(col, where(field, '==', identity.uid)))),
    );
    // The two queries overlap when a host books their own tour; dedupe by id.
    const byId = new Map<string, T>();
    for (const snap of snaps) {
      for (const d of snap.docs) byId.set(d.id, { ...(d.data() as T), id: d.id });
    }
    return [...byId.values()];
  });
}

/**
 * Which rows of a collection this caller is allowed to write.
 *
 * This mirrors firestore.rules deliberately. The rules remain the authority —
 * the point of checking here is that a batch is all-or-nothing, so one foreign
 * row in the array would sink the caller's own edits along with it.
 */
const OWNED_BY: Record<CollectionName, (row: Record<string, unknown>, uid: string) => boolean> = {
  profiles: (row, uid) => row.id === uid,
  tours: (row, uid) => row.hostId === uid,
  bookings: (row, uid) => row.customerId === uid || row.hostId === uid,
  reviews: (row, uid) => row.userId === uid,
  kyc: (row, uid) => row.hostId === uid,
  // Nobody but an administrator, and `upsertAll` lets an admin past this check
  // entirely — so returning false here is the whole rule for everyone else.
  videos: () => false,
};

/**
 * Writes the caller's own rows that actually changed.
 *
 * The previous version wrote every row of the collection on every save. That
 * failed for two independent reasons: rows belonging to other people are denied
 * by the rules and take the whole batch down with them, and re-writing an
 * unchanged catalogue on each edit spends the daily write quota on nothing.
 */
async function upsertAll<T extends { id: string }>(
  name: CollectionName,
  rows: T[],
  identity: CloudIdentity | null,
): Promise<boolean> {
  if (!identity) return false;

  const fb = await getFirebase();
  if (!fb) return false;

  const writable =
    identity.role === 'admin'
      ? rows
      : rows.filter((row) => OWNED_BY[name](row as unknown as Record<string, unknown>, identity.uid));

  const base = baseline(name);
  const changed = writable.filter((row) => base.get(row.id) !== fingerprint(row));
  if (changed.length === 0) return true;

  const { collection, doc, writeBatch } = await import('firebase/firestore');
  const col = collection(fb.db, name);

  // Firestore caps a batch at 500 operations, so chunk larger saves.
  for (let i = 0; i < changed.length; i += 450) {
    const batch = writeBatch(fb.db);
    for (const row of changed.slice(i, i + 450)) {
      batch.set(doc(col, row.id), stripUndefined(row as unknown as Record<string, unknown>), { merge: true });
    }
    await batch.commit();
  }

  remember(name, changed);
  invalidate(name);
  return true;
}

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

export async function readProfile(uid: string): Promise<User | null> {
  const fb = await getFirebase();
  if (!fb) return null;

  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(fb.db, COLLECTIONS.profiles, uid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as User), id: snap.id };
}

export async function writeProfile(user: User): Promise<boolean> {
  const fb = await getFirebase();
  if (!fb) return false;

  const { doc, setDoc } = await import('firebase/firestore');
  // Profile documents are world-readable — that is what makes a host card
  // render for a visitor who is not signed in. Nothing secret may be written
  // here: Firebase Auth holds the credential, and the phone number and email
  // that used to travel with the demo fixtures are the account holder's own.
  await setDoc(
    doc(fb.db, COLLECTIONS.profiles, user.id),
    stripUndefined(user as unknown as Record<string, unknown>),
    { merge: true },
  );
  invalidate(COLLECTIONS.profiles);
  return true;
}

export const fetchUsers = () => fetchPublic<User>(COLLECTIONS.profiles);

/* ------------------------------------------------------------------ */
/* Avatars                                                             */
/* ------------------------------------------------------------------ */

/**
 * Profile pictures live in their own collection, one document per account.
 *
 * They are deliberately NOT part of `COLLECTIONS` above: that machinery exists
 * for collections read whole and written in batches, and an avatar is the one
 * thing that must never be read whole. Spark has no Cloud Storage, so an
 * uploaded photo is ~35 KB of base64 — three hundred times a profile's other
 * fields put together. Keeping it inside the profile meant every visitor
 * downloading every host's photograph on every page load, because `fetchUsers`
 * pulls the whole collection in one query; and because the app denormalises the
 * avatar onto each tour, review and booking, that same 35 KB was copied into
 * the catalogue too.
 *
 * So a picture is stored once, here, under the owner's uid, and everything else
 * carries a ~30-byte `avatar:<uid>:<version>` reference to it. See
 * `src/utils/avatarStore.ts` for the reference format and the client cache.
 */
const AVATARS = 'avatars';

export interface AvatarDoc {
  dataUrl: string;
  /** Bumped on every upload so a cached copy knows it is stale. */
  version: string;
}

export async function readAvatarDoc(uid: string): Promise<AvatarDoc | null> {
  const fb = await getFirebase();
  if (!fb) return null;

  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(fb.db, AVATARS, uid));
  if (!snap.exists()) return null;

  const data = snap.data() as Partial<AvatarDoc>;
  if (typeof data.dataUrl !== 'string' || !data.dataUrl) return null;
  return { dataUrl: data.dataUrl, version: String(data.version ?? '') };
}

export async function writeAvatarDoc(uid: string, avatar: AvatarDoc): Promise<boolean> {
  const fb = await getFirebase();
  if (!fb) return false;

  const { doc, setDoc } = await import('firebase/firestore');
  // Not merged: an avatar document is one picture, and replacing it wholesale
  // is what keeps a stale field from an older shape hanging around inside it.
  await setDoc(doc(fb.db, AVATARS, uid), { id: uid, ...avatar });
  return true;
}

// There is no bulk profile writer on purpose. A profile may only be written by
// the account it belongs to, so a batch of them would be denied on every row
// but one; `writeProfile` above is the only way in, one document at a time.

/* ------------------------------------------------------------------ */
/* Tours / Bookings / Reviews / KYC                                    */
/* ------------------------------------------------------------------ */

// Tours and reviews are world-readable by design: the catalogue has to render
// for a visitor who has not signed in.
export const fetchTours = () => fetchPublic<Tour>(COLLECTIONS.tours);
export const saveTours = (rows: Tour[], identity: CloudIdentity | null) =>
  upsertAll(COLLECTIONS.tours, rows, identity);

export const fetchReviews = () => fetchPublic<TourReview>(COLLECTIONS.reviews);
export const saveReviews = (rows: TourReview[], identity: CloudIdentity | null) =>
  upsertAll(COLLECTIONS.reviews, rows, identity);

// Bookings and identity documents are private, so they are read by owner.
export const fetchBookings = (identity: CloudIdentity | null) =>
  fetchOwned<Booking>(COLLECTIONS.bookings, identity, ['customerId', 'hostId']);
export const saveBookings = (rows: Booking[], identity: CloudIdentity | null) =>
  upsertAll(COLLECTIONS.bookings, rows, identity);

// The Explore page shows these to anyone, signed in or not, so the read is
// public; the rules make the write admin-only.
export const fetchLocalVideos = () => fetchPublic<LocalVideo>(COLLECTIONS.videos);
export const saveLocalVideos = (rows: LocalVideo[], identity: CloudIdentity | null) =>
  upsertAll(COLLECTIONS.videos, rows, identity);

/**
 * Removes a video for good.
 *
 * `upsertAll` only ever writes, so without this a deleted video would vanish
 * from the admin's screen and come back on the next page load.
 */
export async function deleteLocalVideo(id: string): Promise<boolean> {
  const fb = await getFirebase();
  if (!fb) return false;
  const { deleteDoc, doc } = await import('firebase/firestore');
  await deleteDoc(doc(fb.db, COLLECTIONS.videos, id));
  invalidate(COLLECTIONS.videos);
  return true;
}

export const fetchKyc = (identity: CloudIdentity | null) =>
  fetchOwned<HostKycApplication>(COLLECTIONS.kyc, identity, ['hostId']);
export const saveKyc = (rows: HostKycApplication[], identity: CloudIdentity | null) =>
  upsertAll(COLLECTIONS.kyc, rows, identity);

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

// There is none, on purpose. The demo dataset is loaded by
// `scripts/seed-firestore.ts`, which runs on your machine with the Firebase
// Admin SDK — the only caller allowed to choose a uid, write a review on behalf
// of a traveller who has no account, or hand a host the `verified` badge that
// these rules rightly refuse to let anyone grant themselves.
//
// Seeding from the browser was tried and removed: it could only ever run as an
// admin who happened to be signed in at the right moment, which made "does the
// catalogue exist" depend on who opened the app first.
