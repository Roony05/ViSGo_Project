/**
 * Location-sharing policy for the Live Radar.
 *
 * Before this existed, opening the radar started `watchPosition` immediately,
 * for as long as the modal stayed open, with an off switch that was a plain
 * component boolean — remount the component and tracking was back on. There was
 * no consent step, no expiry, and nothing tying a fix to the booking it was for.
 *
 * The rules enforced here:
 *
 *   1. Sharing is granted per booking, never globally. One tour's grant tells
 *      you nothing about the next.
 *   2. It is time-boxed. The window opens an hour before the meeting time and
 *      closes half an hour after the tour should end, with an 8-hour hard cap
 *      from the moment it was granted — so a grant can never outlive its reason
 *      even if the tour data is wrong.
 *   3. Only the host on that booking is the audience. The grant records which
 *      host it names, and a mismatch is treated as no grant at all.
 *   4. Nothing but the grant is persisted. No coordinate is ever written to
 *      storage, so there is no location history to leak, subpoena, or sync.
 *   5. Turning it off requires the traveller's PIN. Anyone who picks up an
 *      unlocked phone can otherwise silently disable the safety feature the
 *      traveller is relying on — or, just as bad, quietly turn it on.
 *
 * On the PIN: it is hashed with PBKDF2-SHA256 and a per-device random salt, and
 * the plaintext is never stored. Be clear-eyed about what that buys — this is a
 * local device lock that stops someone grabbing the phone, not server-side
 * authentication. A determined attacker with the device and developer tools can
 * clear localStorage and start over; what they cannot do is read the PIN or
 * flip sharing behind the traveller's back in the normal UI.
 */

import { Booking } from '../types';

const GRANTS_KEY = 'visgo_location_grants_v1';
const PIN_KEY = 'visgo_location_pin_v1';

/** Window opens this long before the meeting time. */
const LEAD_MS = 60 * 60 * 1000;
/** Grace after the tour should have ended. */
const GRACE_MS = 30 * 60 * 1000;
/** Absolute ceiling from the moment of granting, whatever the tour data says. */
const HARD_CAP_MS = 8 * 60 * 60 * 1000;
/** Used when the booking carries no tour duration. */
const DEFAULT_TOUR_HOURS = 4;

export interface LocationGrant {
  bookingId: string;
  /** The only account allowed to see these fixes. */
  hostId: string;
  hostName: string;
  grantedAt: number;
  /** Tracking must not start before this. */
  opensAt: number;
  /** Tracking must stop at this, no exceptions. */
  expiresAt: number;
}

/**
 * String-tagged rather than a boolean union: `strict` is off in this project's
 * tsconfig, so a `{ ok: true } | { ok: false; reason }` shape does not narrow
 * and every access to `.reason` becomes a type error.
 */
export type ShareVerdict =
  | { state: 'none' }
  | { state: 'scheduled'; grant: LocationGrant; opensInMs: number }
  | { state: 'active'; grant: LocationGrant; endsInMs: number }
  | { state: 'expired'; grant: LocationGrant };

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

function readGrants(): LocationGrant[] {
  try {
    const raw = window.localStorage.getItem(GRANTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt or unreadable storage means no grant, which is the safe answer:
    // it fails closed, into not sharing.
    return [];
  }
}

function writeGrants(grants: LocationGrant[]): void {
  try {
    window.localStorage.setItem(GRANTS_KEY, JSON.stringify(grants));
  } catch {
    /* Private browsing: the grant then lasts only for this page. Also safe. */
  }
}

/** Drops anything already past its expiry. Called on every read. */
function prune(now: number): LocationGrant[] {
  const live = readGrants().filter((g) => g.expiresAt > now);
  if (live.length !== readGrants().length) writeGrants(live);
  return live;
}

/* ------------------------------------------------------------------ */
/* PIN                                                                 */
/* ------------------------------------------------------------------ */

interface StoredPin {
  salt: string;
  hash: string;
  iterations: number;
}

const PIN_ITERATIONS = 150_000;

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toB64(bits);
}

export function hasPin(): boolean {
  try {
    return Boolean(window.localStorage.getItem(PIN_KEY));
  } catch {
    return false;
  }
}

/** Sets the device PIN. Rejects anything too short to be worth checking. */
export async function setPin(pin: string): Promise<{ status: 'ok' } | { status: 'too-short' }> {
  if (!/^\d{4,8}$/.test(pin)) return { status: 'too-short' };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, PIN_ITERATIONS);
  const stored: StoredPin = { salt: toB64(salt.buffer), hash, iterations: PIN_ITERATIONS };
  try {
    window.localStorage.setItem(PIN_KEY, JSON.stringify(stored));
  } catch {
    return { status: 'too-short' };
  }
  return { status: 'ok' };
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const raw = window.localStorage.getItem(PIN_KEY);
    if (!raw) return false;
    const stored: StoredPin = JSON.parse(raw);
    const candidate = await derive(pin, fromB64(stored.salt), stored.iterations || PIN_ITERATIONS);
    // Both values are our own base64 of a fixed-length digest, so a plain
    // comparison leaks only length, which is constant.
    return candidate === stored.hash;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Grants                                                              */
/* ------------------------------------------------------------------ */

/** Meeting time as an epoch, or null when the booking's date/time is unusable. */
export function meetingTimeOf(booking: Booking): number | null {
  const stamp = Date.parse(`${booking.bookingDate}T${booking.bookingTime || '00:00'}:00`);
  return Number.isFinite(stamp) ? stamp : null;
}

/**
 * The window a grant for this booking would occupy, whether or not one exists.
 *
 * Exported so the consent screen can say "this tour already ended" instead of
 * offering a button that writes a grant which is expired the instant it is
 * written — which is what a past booking did on the first cut, leaving the
 * consent gate reappearing forever with no explanation.
 */
export function shareWindow(
  booking: Booking,
  tourDurationHours?: number,
  now = Date.now(),
): { opensAt: number; closesAt: number; alreadyClosed: boolean } {
  const meet = meetingTimeOf(booking) ?? now;
  const hours = tourDurationHours && tourDurationHours > 0 ? tourDurationHours : DEFAULT_TOUR_HOURS;
  const closesAt = meet + hours * 60 * 60 * 1000 + GRACE_MS;
  return { opensAt: meet - LEAD_MS, closesAt, alreadyClosed: now >= closesAt };
}

/**
 * Grants sharing for one booking. The caller must have already established the
 * PIN — this does not prompt, so that the consent copy and the PIN entry can
 * live together in one screen rather than as two disconnected dialogs.
 */
export function grantSharing(
  booking: Booking,
  tourDurationHours?: number,
  now = Date.now(),
): { status: 'ok'; grant: LocationGrant } | { status: 'window-closed' } {
  const win = shareWindow(booking, tourDurationHours, now);
  if (win.alreadyClosed) return { status: 'window-closed' };

  const grant: LocationGrant = {
    bookingId: booking.id,
    hostId: booking.hostId,
    hostName: booking.hostName,
    grantedAt: now,
    // The window's own opening time, not `now`. Clamping this to `now` was
    // meant to let a late grant start immediately — but shareVerdict already
    // does that by comparing against the clock, and the clamp also dragged
    // every *future* booking's start back to the moment of consent, so
    // agreeing to share for tomorrow's tour began tracking today.
    opensAt: win.opensAt,
    expiresAt: Math.min(win.closesAt, now + HARD_CAP_MS),
  };

  writeGrants([...prune(now).filter((g) => g.bookingId !== booking.id), grant]);
  return { status: 'ok', grant };
}

/**
 * Revokes one booking's grant. Requires the PIN — this is the traveller's stop
 * button, and it must not be usable by whoever happens to be holding the phone.
 */
export async function revokeSharing(
  bookingId: string,
  pin: string,
): Promise<{ status: 'ok' } | { status: 'bad-pin' }> {
  if (!(await verifyPin(pin))) return { status: 'bad-pin' };
  writeGrants(prune(Date.now()).filter((g) => g.bookingId !== bookingId));
  return { status: 'ok' };
}

/** Revokes every grant on this device. Same PIN requirement. */
export async function revokeAllSharing(pin: string): Promise<{ status: 'ok' } | { status: 'bad-pin' }> {
  if (!(await verifyPin(pin))) return { status: 'bad-pin' };
  writeGrants([]);
  return { status: 'ok' };
}

/**
 * The current verdict for a booking. Everything downstream — whether to call
 * watchPosition, what the banner says, when to auto-stop — reads from this, so
 * there is exactly one place the policy is decided.
 */
export function shareVerdict(booking: Booking | null | undefined, now = Date.now()): ShareVerdict {
  if (!booking) return { state: 'none' };

  const grant = prune(now).find((g) => g.bookingId === booking.id);
  if (!grant) return { state: 'none' };

  // A grant naming a different host is not this booking's grant. Rebooking the
  // same slot with someone else must not inherit the old consent.
  if (grant.hostId !== booking.hostId) return { state: 'none' };

  if (now < grant.opensAt) return { state: 'scheduled', grant, opensInMs: grant.opensAt - now };
  if (now >= grant.expiresAt) return { state: 'expired', grant };
  return { state: 'active', grant, endsInMs: grant.expiresAt - now };
}

/** "1 giờ 20 phút" / "1h 20m", for the countdown in the sharing banner. */
export function formatRemaining(ms: number, isVi: boolean): string {
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return isVi ? `${h} giờ ${m} phút` : `${h}h ${m}m`;
  return isVi ? `${m} phút` : `${m}m`;
}
