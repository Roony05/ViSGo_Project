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
 *   5. The traveller may stop routine location sharing with one explicit tap.
 *      SOS is separate: once submitted it remains in the admin queue until an
 *      administrator marks it resolved.
 */

import { Booking } from '../types';

const GRANTS_KEY = 'visgo_location_grants_v1';

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
 * Grants sharing for one booking after the traveller accepts the consent copy.
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
 * Revokes one booking's routine GPS grant. This never changes an SOS alert;
 * only an administrator can close that separate Firestore record.
 */
export function revokeSharing(bookingId: string): { status: 'ok' } {
  writeGrants(prune(Date.now()).filter((g) => g.bookingId !== bookingId));
  return { status: 'ok' };
}

/** Revokes every routine GPS grant on this device. */
export function revokeAllSharing(): { status: 'ok' } {
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
