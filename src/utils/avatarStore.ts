/**
 * Profile pictures, kept out of the documents that point at them.
 *
 * WHY THIS EXISTS
 *
 * Spark has no Cloud Storage, so an uploaded photo is stored as a base64 data
 * URL inside Firestore. That was fine while every avatar was a 94-byte Unsplash
 * link, and stopped being fine the moment a real one was uploaded: the first
 * real profile picture in this project came to 34,867 bytes — roughly three
 * hundred times the rest of the profile document put together.
 *
 * Two things made that expensive rather than merely large:
 *
 *   1. `fetchUsers()` reads the whole `profiles` collection in one query,
 *      because the rules make it world-readable and the app wants every host
 *      card at once. So every visitor downloaded every host's photograph on
 *      every page load, whether or not a single one of them was on screen.
 *
 *   2. The avatar is denormalised onto each tour, review and booking so a card
 *      can render without a join. With a data URL, "denormalised" means a
 *      35 KB copy per tour — and `tours` is read whole too.
 *
 * Neither is a storage problem; 1 GiB holds thirty thousand of these. It is a
 * read problem, and on Spark reads are the quota that runs out first: 50,000 a
 * day, shared by everyone using the app.
 *
 * HOW IT WORKS
 *
 * The picture is written once to `avatars/{uid}`. Everything that used to hold
 * the image now holds a reference to it:
 *
 *     avatar:WHKSNTjyFASDkyr6hsAxgzz2f0p2:m0x9qk
 *            └─ owner's uid ────────────┘ └ version
 *
 * ~50 bytes instead of ~35,000. The version is bumped on every upload, which is
 * what lets a device notice that the copy it cached is out of date; it is not
 * used to address the document, so an old reference sitting on a tour published
 * last month still resolves to the host's current photograph.
 *
 * Resolution is lazy and cached in localStorage, so a host's picture costs one
 * document read the first time a device sees it and nothing at all afterwards.
 * Plain `https://` avatars and legacy inline data URLs are passed through
 * untouched — nothing has to be migrated for the app to keep working.
 */

import { HAS_FIREBASE } from '../config/firebase';
import { readAvatarDoc, writeAvatarDoc } from './firestoreDb';

const REF_PREFIX = 'avatar:';
const CACHE_PREFIX = 'visgo_avatar_v1_';
const CACHE_INDEX = 'visgo_avatar_index_v1';

/**
 * How many pictures a device keeps. localStorage is about 5 MB per origin and
 * the rest of the app lives in it too, so this is a budget of roughly 1.5 MB —
 * far more avatars than any one session looks at, and small enough to leave
 * room for the tours and bookings the app actually renders from.
 */
const MAX_CACHED = 40;

export interface AvatarRef {
  uid: string;
  version: string;
}

/* ------------------------------------------------------------------ */
/* Reference format                                                    */
/* ------------------------------------------------------------------ */

export function isAvatarRef(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith(REF_PREFIX);
}

export function parseAvatarRef(value: string | undefined | null): AvatarRef | null {
  if (!isAvatarRef(value)) return null;
  const [uid, version = ''] = (value as string).slice(REF_PREFIX.length).split(':');
  return uid ? { uid, version } : null;
}

export function makeAvatarRef(uid: string, version: string): string {
  return `${REF_PREFIX}${uid}:${version}`;
}

/** Monotonic enough for cache invalidation, and short. */
const newVersion = (): string => Date.now().toString(36);

/* ------------------------------------------------------------------ */
/* Device cache                                                        */
/* ------------------------------------------------------------------ */

interface CachedAvatar {
  dataUrl: string;
  version: string;
}

/** Resolved pictures for this page load; avoids re-parsing localStorage. */
const memory = new Map<string, CachedAvatar>();

/** In-flight fetches, so ten cards by the same host cost one read, not ten. */
const inFlight = new Map<string, Promise<string>>();

/** Uids already looked up and found to have no picture — do not ask again. */
const missing = new Set<string>();

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(CACHE_INDEX);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Records a uid as most recently used and evicts the oldest beyond the budget.
 *
 * Without the index there is no way to drop just the avatars: keys would have
 * to be swept by prefix, and a browser that throws on `localStorage.key(i)` in
 * private mode would leave the cache growing until a quota error took out a
 * booking write instead.
 */
function touchIndex(uid: string): void {
  try {
    const next = [uid, ...readIndex().filter((u) => u !== uid)];
    for (const evicted of next.slice(MAX_CACHED)) {
      localStorage.removeItem(CACHE_PREFIX + evicted);
      memory.delete(evicted);
    }
    localStorage.setItem(CACHE_INDEX, JSON.stringify(next.slice(0, MAX_CACHED)));
  } catch {
    /* a full or unavailable localStorage must not break rendering */
  }
}

function readCache(uid: string): CachedAvatar | null {
  const hit = memory.get(uid);
  if (hit) return hit;

  try {
    const raw = localStorage.getItem(CACHE_PREFIX + uid);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedAvatar>;
    if (typeof parsed.dataUrl !== 'string' || !parsed.dataUrl) return null;
    const entry: CachedAvatar = { dataUrl: parsed.dataUrl, version: String(parsed.version ?? '') };
    memory.set(uid, entry);
    return entry;
  } catch {
    return null;
  }
}

function writeCache(uid: string, entry: CachedAvatar): void {
  memory.set(uid, entry);
  try {
    localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify(entry));
    touchIndex(uid);
  } catch {
    // Out of room. Drop every cached picture rather than the caller's write:
    // the app re-fetches them, and one wasted read beats a failed booking.
    clearAvatarCache();
    try {
      localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify(entry));
      touchIndex(uid);
    } catch {
      /* keep it in memory only for this page load */
    }
  }
}

/** Drops every cached picture from this device. */
export function clearAvatarCache(): void {
  try {
    for (const uid of readIndex()) localStorage.removeItem(CACHE_PREFIX + uid);
    localStorage.removeItem(CACHE_INDEX);
  } catch {
    /* nothing to clear */
  }
  memory.clear();
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

/** Notified whenever a picture finishes resolving, so <Avatar> can re-render. */
export function subscribeAvatars(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(): void {
  for (const cb of [...listeners]) cb();
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

/**
 * What to put in an `<img src>` right now, without waiting.
 *
 * Returns '' when the picture is a reference this device has not fetched yet —
 * the caller shows initials until `loadAvatar` fills it in. Anything that is
 * already displayable (an `https://` link, or a legacy inline data URL from
 * before the split) comes straight back.
 */
export function resolveAvatar(src: string | undefined | null): string {
  if (!src) return '';
  const ref = parseAvatarRef(src);
  if (!ref) return src;
  return readCache(ref.uid)?.dataUrl ?? '';
}

/**
 * Fetches a referenced picture, once per device.
 *
 * A cached copy is used unless the reference names a newer version, which is
 * how a host changing their photograph reaches everyone who has the old one.
 */
export async function loadAvatar(src: string | undefined | null): Promise<string> {
  const ref = parseAvatarRef(src);
  if (!ref || !HAS_FIREBASE) return resolveAvatar(src);

  const cachedEntry = readCache(ref.uid);
  // An empty version on the reference means "whatever is stored" — old
  // references and the migration script both produce those.
  if (cachedEntry && (!ref.version || cachedEntry.version === ref.version)) return cachedEntry.dataUrl;
  if (missing.has(ref.uid)) return '';

  const existing = inFlight.get(ref.uid);
  if (existing) return existing;

  const pending = (async () => {
    try {
      const doc = await readAvatarDoc(ref.uid);
      if (!doc) {
        missing.add(ref.uid);
        return '';
      }
      writeCache(ref.uid, { dataUrl: doc.dataUrl, version: doc.version });
      notify();
      return doc.dataUrl;
    } catch (err) {
      console.warn('[ViS-Go] Could not load avatar for', ref.uid, err);
      // Deliberately not remembered as missing: a network blip is not an
      // answer, and the next render should be free to try again.
      return cachedEntry?.dataUrl ?? '';
    } finally {
      inFlight.delete(ref.uid);
    }
  })();

  inFlight.set(ref.uid, pending);
  return pending;
}

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

/**
 * Stores a freshly picked picture and returns the reference to save on the
 * profile.
 *
 * Falls back to the data URL itself when Firebase is not configured, so the
 * offline demo keeps working exactly as it did — the resolver passes an inline
 * data URL straight through.
 */
export async function saveAvatar(uid: string, dataUrl: string): Promise<string> {
  if (!HAS_FIREBASE) return dataUrl;

  const version = newVersion();
  const ok = await writeAvatarDoc(uid, { dataUrl, version });
  if (!ok) return dataUrl;

  writeCache(uid, { dataUrl, version });
  missing.delete(uid);
  notify();
  return makeAvatarRef(uid, version);
}

/**
 * True for a picture that still has to be uploaded before it can be saved on a
 * document — i.e. one the user just picked off their disk.
 */
export function isInlineImage(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('data:');
}

/**
 * Turns whatever an editor is holding into something safe to store on a
 * profile: an upload becomes a reference, everything else is left alone.
 */
export async function externaliseAvatar(uid: string, value: string): Promise<string> {
  return isInlineImage(value) ? saveAvatar(uid, value) : value;
}
