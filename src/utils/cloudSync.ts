/**
 * Bridges the synchronous localStorage store to Firestore.
 *
 * Firestore holds the data — accounts, tours, bookings, reviews and verification
 * applications all live there, put in place by `npm run seed` and then edited
 * by the app. localStorage is not a second database; it is the render cache the
 * component tree reads synchronously (`Storage.getTours()` and friends), and
 * the offline copy that keeps the app usable when the network is not:
 *
 *   boot   → hydrateFromCloud() pulls Firestore into localStorage
 *   render → components read localStorage, synchronously, as before
 *   write  → Storage.save*() writes localStorage, then mirrors to Firestore
 *
 * Mirroring is deliberately fire-and-forget. A booking must not fail because
 * the network blipped: the local write already succeeded, and the next boot
 * re-syncs. Failures are surfaced through `setSyncListener` so the UI can say
 * so honestly instead of pretending everything saved.
 */

import { getFirebase, HAS_FIREBASE } from '../config/firebase';
import {
  fetchBookings,
  fetchKyc,
  fetchReviews,
  fetchTours,
  fetchUsers,
  fetchLocalVideos,
  saveBookings as pushBookings,
  saveKyc as pushKyc,
  saveLocalVideos as pushVideos,
  saveReviews as pushReviews,
  saveTours as pushTours,
  type CloudIdentity,
} from './firestoreDb';
import type { Booking, HostKycApplication, LocalVideo, Tour, TourReview, User } from '../types';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export type SyncCollection = 'tours' | 'bookings' | 'reviews' | 'kyc' | 'videos';

let listener: ((state: SyncState, detail?: string) => void) | null = null;
let lastState: SyncState = 'idle';

export function setSyncListener(cb: ((state: SyncState, detail?: string) => void) | null): void {
  listener = cb;
  // Replay the current state so a listener mounting late is not stuck on 'idle'.
  if (cb) cb(lastState);
}

function emit(state: SyncState, detail?: string): void {
  lastState = state;
  listener?.(state, detail);
}

export const cloudEnabled = (): boolean => HAS_FIREBASE;

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

/**
 * Who Firestore reads and writes are performed as.
 *
 * Firestore rules reject a query they cannot prove is restricted to rows the
 * caller may see, so both directions need the uid, and the role decides whether
 * the unscoped read is permitted at all. `storage.ts` calls `mirror()` from
 * synchronous code with no idea who is signed in, so the app keeps this in step
 * instead (see the identity effect in App.tsx).
 */
let identity: CloudIdentity | null = null;

/**
 * The id is checked against the live Firebase session on purpose. The app also
 * supports signing in to the offline demo accounts, whose ids are not uids and
 * match no rule, so mirroring their edits would only produce denied writes and
 * a red sync badge for something that saved perfectly well locally.
 */
export async function setCloudIdentity(user: User | null): Promise<void> {
  if (!user) {
    identity = null;
    return;
  }
  const fb = await getFirebase();
  identity = fb?.auth.currentUser?.uid === user.id ? { uid: user.id, role: user.role } : null;
}

export const currentCloudIdentity = (): CloudIdentity | null => identity;

/* ------------------------------------------------------------------ */
/* Push                                                                */
/* ------------------------------------------------------------------ */

type Pusher = (rows: never[], who: CloudIdentity | null) => Promise<boolean>;

const pushers: Record<SyncCollection, Pusher> = {
  tours: pushTours as Pusher,
  bookings: pushBookings as Pusher,
  reviews: pushReviews as Pusher,
  kyc: pushKyc as Pusher,
  videos: pushVideos as Pusher,
};

/**
 * Coalesces rapid successive saves of the same collection.
 *
 * A single booking flow calls saveBookings() several times as status moves
 * pending -> confirmed. Without this, each keystroke-speed update is its own
 * batch commit, and the Spark plan only allows 20,000 writes a day.
 */
const pending = new Map<SyncCollection, number>();
const FLUSH_DELAY_MS = 800;

export function mirror<T>(collection: SyncCollection, rows: T[]): void {
  if (!HAS_FIREBASE) return;
  // Signed out there is nothing the rules would accept, and saying 'offline'
  // for it would be a lie: local storage took the write and kept it.
  if (!identity) return;

  const existing = pending.get(collection);
  if (existing !== undefined) window.clearTimeout(existing);

  const handle = window.setTimeout(() => {
    pending.delete(collection);
    emit('syncing');
    pushers[collection](rows as never[], identity)
      .then((ok) => emit(ok ? 'synced' : 'offline'))
      .catch((err: unknown) => {
        console.warn(`[ViS-Go sync] Could not mirror ${collection} to Firestore:`, err);
        emit('error', err instanceof Error ? err.message : String(err));
      });
  }, FLUSH_DELAY_MS);

  pending.set(collection, handle);
}

/* ------------------------------------------------------------------ */
/* Pull                                                                */
/* ------------------------------------------------------------------ */

export interface HydrateResult {
  status: 'disabled' | 'pulled' | 'failed';
  users?: User[];
  tours?: Tour[];
  bookings?: Booking[];
  reviews?: TourReview[];
  kyc?: HostKycApplication[];
  videos?: LocalVideo[];
  detail?: string;
}

/**
 * Pulls the collections that only exist for a signed-in account.
 *
 * Boot hydration runs once, before anyone has signed in, and the security rules
 * correctly refuse `bookings` and `kyc` to an anonymous visitor. Nothing then
 * re-fetched them when a session began, so signing in on a fresh device showed
 * an empty "My Trips" — and, since a conversation hangs off a booking, no chat
 * either — until the page was reloaded by hand.
 *
 * The 30-second read cache in firestoreDb.ts means calling this right after
 * boot costs nothing when the rows were already fetched.
 */
export async function hydrateOwned(user: User | null): Promise<{
  bookings?: Booking[];
  kyc?: HostKycApplication[];
}> {
  if (!HAS_FIREBASE || !user) return {};

  await setCloudIdentity(user);
  if (!identity) return {};

  const [bookings, kyc] = await Promise.allSettled([fetchBookings(identity), fetchKyc(identity)]);

  const value = <T,>(r: PromiseSettledResult<T | null>): T | undefined =>
    r.status === 'fulfilled' && r.value !== null ? r.value : undefined;

  return { bookings: value(bookings), kyc: value(kyc) };
}

/**
 * Pulls every collection from Firestore at boot.
 *
 * This is where the app gets its data. The fixtures in `src/data/mockData.ts`
 * are no longer a runtime fallback once Firebase is configured — they are the
 * input to `npm run seed`, which puts them in Firestore once, and everything
 * afterwards reads from here.
 *
 * Each collection is settled independently. They used to share one Promise.all,
 * which meant the private collections — denied outright for a signed-out
 * visitor — threw away the public catalogue that had already loaded beside
 * them, and the app fell back to demo data for no visible reason.
 */
export async function hydrateFromCloud(user: User | null): Promise<HydrateResult> {
  if (!HAS_FIREBASE) return { status: 'disabled' };

  await setCloudIdentity(user);
  emit('syncing');

  const [users, tours, bookings, reviews, kyc, videos] = await Promise.allSettled([
    fetchUsers(),
    fetchTours(),
    fetchBookings(identity),
    fetchReviews(),
    fetchKyc(identity),
    fetchLocalVideos(),
  ]);

  const failures = [users, tours, bookings, reviews, kyc, videos]
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

  const value = <T,>(r: PromiseSettledResult<T | null>): T | undefined =>
    r.status === 'fulfilled' && r.value !== null ? r.value : undefined;

  if (failures.length) {
    // Common and benign: the rules deny private collections until sign-in.
    // Whatever did load is still returned rather than discarded.
    console.warn('[ViS-Go sync] Some Firestore reads were refused:', failures.join(' | '));
    emit('error', failures[0]);
  } else {
    emit('synced');
  }

  const anyLoaded = [users, tours, bookings, reviews, kyc, videos].some(
    (r) => r.status === 'fulfilled' && r.value !== null,
  );

  return {
    status: anyLoaded ? 'pulled' : 'failed',
    users: value(users),
    tours: value(tours),
    bookings: value(bookings),
    reviews: value(reviews),
    kyc: value(kyc),
    videos: value(videos),
    detail: failures[0],
  };
}
