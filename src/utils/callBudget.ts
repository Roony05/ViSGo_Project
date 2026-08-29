/**
 * The spend guard for in-app calling.
 *
 * WHAT THIS DOES NOT DO. It does not record calls. There is no call log, no
 * participant list, no room history, no duration per call, nothing that could
 * later answer "who spoke to whom, and when". That was asked for explicitly and
 * it is also the cheapest possible answer to Nghị định 13/2023/NĐ-CP: data you
 * never wrote cannot leak, cannot be subpoenaed and does not have to be
 * deleted on request.
 *
 * What it keeps is three counters — minutes used this month, calls started
 * today, and the period each belongs to — in this browser's localStorage. They
 * carry no identifiers of any kind, and they exist for one purpose: to refuse
 * the next call once the free allowance is gone.
 *
 * WHY LOCAL, AND WHAT THAT MEANS. A shared server-side counter would need a
 * document per platform that every anonymous visitor may increment, which is a
 * write endpoint open to the world and a new thing to store. The provider this
 * points at by default (public Jitsi) has no billing relationship at all, so
 * the real risk being managed here is a *swap* to a metered provider later —
 * and for that, a per-browser ceiling plus a per-call ceiling is the guard that
 * actually matters, because a runaway bill comes from one tab left open, not
 * from a thousand people each making one call.
 */

import { CALL_LIMITS } from '../config/env';

const KEY = 'visgo_call_budget_v1';

interface Ledger {
  /** `YYYY-MM` — the month `minutesUsed` belongs to. */
  month: string;
  minutesUsed: number;
  /** `YYYY-MM-DD` — the day `callsToday` belongs to. */
  day: string;
  callsToday: number;
}

const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const dayKey = (d: Date): string => `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;

const empty = (now: Date): Ledger => ({
  month: monthKey(now),
  minutesUsed: 0,
  day: dayKey(now),
  callsToday: 0,
});

/** Reads the ledger, rolling over a counter whose period has passed. */
function read(now = new Date()): Ledger {
  let stored: Partial<Ledger> | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    stored = raw ? (JSON.parse(raw) as Partial<Ledger>) : null;
  } catch {
    // Private mode, a cleared profile, or a value from an older shape. A
    // missing ledger means "nothing spent", which is the safe direction only
    // because the per-call cap below is what bounds a single session.
    stored = null;
  }

  const fresh = empty(now);
  if (!stored) return fresh;

  return {
    month: fresh.month,
    minutesUsed: stored.month === fresh.month ? Number(stored.minutesUsed) || 0 : 0,
    day: fresh.day,
    callsToday: stored.day === fresh.day ? Number(stored.callsToday) || 0 : 0,
  };
}

function write(ledger: Ledger): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ledger));
  } catch {
    // Nothing to do and nothing worth telling the user: the per-call cap still
    // holds, since it is a timer inside the running call rather than a stored
    // number.
  }
}

export type CallBlockReason = 'MONTHLY_CAP' | 'DAILY_CAP';

export interface CallAllowance {
  allowed: boolean;
  reason?: CallBlockReason;
  /** Whole minutes left in this month's allowance. */
  minutesLeft: number;
  /** How long the call about to start may run, in minutes. */
  minutesThisCall: number;
  callsLeftToday: number;
}

/**
 * Whether another call may start, and how long it may run.
 *
 * A call is never allowed to begin with less allowance than it could spend, so
 * the per-call ceiling is trimmed to whatever is actually left. That is what
 * makes "stop at the limit" true rather than approximate.
 */
export function checkAllowance(now = new Date()): CallAllowance {
  const ledger = read(now);
  const minutesLeft = Math.max(0, Math.floor(CALL_LIMITS.minutesPerMonth - ledger.minutesUsed));
  const callsLeftToday = Math.max(0, CALL_LIMITS.callsPerDay - ledger.callsToday);

  if (minutesLeft <= 0) {
    return { allowed: false, reason: 'MONTHLY_CAP', minutesLeft: 0, minutesThisCall: 0, callsLeftToday };
  }
  if (callsLeftToday <= 0) {
    return { allowed: false, reason: 'DAILY_CAP', minutesLeft, minutesThisCall: 0, callsLeftToday: 0 };
  }

  return {
    allowed: true,
    minutesLeft,
    minutesThisCall: Math.min(CALL_LIMITS.minutesPerCall, minutesLeft),
    callsLeftToday,
  };
}

/** Counts one started call against today's allowance. */
export function noteCallStarted(now = new Date()): void {
  const ledger = read(now);
  write({ ...ledger, callsToday: ledger.callsToday + 1 });
}

/**
 * Adds the minutes a finished call actually ran.
 *
 * Rounded up, because a partial minute is a minute a metered provider would
 * charge for, and this counter exists to be pessimistic rather than accurate.
 */
export function noteCallEnded(seconds: number, now = new Date()): void {
  const ledger = read(now);
  write({ ...ledger, minutesUsed: ledger.minutesUsed + Math.ceil(Math.max(0, seconds) / 60) });
}

/**
 * The room two people meet in.
 *
 * A public room is open to whoever types its name, so the name has to be
 * unguessable: `visgo-<bookingId>` would put a stranger who tried sequential
 * ids straight into a traveller's call. Hashing the id with a deployment salt
 * gives both parties the same name without either of them storing it, which is
 * the whole point — no room record exists anywhere.
 */
export async function roomNameFor(bookingId: string, salt: string): Promise<string> {
  const input = `${salt}:${bookingId}`;

  // `crypto.subtle` exists only in a secure context, so it is missing when the
  // app is opened over plain http on a LAN address — which is exactly how a
  // phone joins a laptop's dev server. Throwing there would take the call down
  // rather than degrade it, so fall back to a plain string hash: weaker, still
  // not derivable from a booking id by eye, and only ever reached in a setting
  // that has no transport security to speak of anyway.
  if (!globalThis.crypto?.subtle) {
    let a = 0x811c9dc5;
    let b = 0x01000193;
    for (let i = 0; i < input.length; i += 1) {
      a = Math.imul(a ^ input.charCodeAt(i), 0x01000193) >>> 0;
      b = Math.imul(b + input.charCodeAt(i) * (i + 1), 0x85ebca6b) >>> 0;
    }
    return `visgo-${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
  }

  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `visgo-${hex.slice(0, 32)}`;
}
