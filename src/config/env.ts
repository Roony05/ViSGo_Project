/**
 * Client-side feature configuration.
 *
 * Every Google integration in ViS-Go degrades gracefully: if a key is absent,
 * the feature switches to a free, no-credentials path rather than breaking.
 * This module is the single place that decides which path is active.
 */

const clean = (value: string | undefined): string => {
  const v = (value ?? '').trim();
  // Ignore the placeholders shipped in .env.example.
  if (!v || v.startsWith('your_') || v.startsWith('MY_')) return '';
  return v;
};

/** OAuth 2.0 Web client ID. Public by design — safe in the browser bundle. */
export const GOOGLE_CLIENT_ID = clean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

/**
 * Explicit consent to use Google APIs that can bill.
 *
 * Google Maps is the only integration in ViS-Go that requires a credit card:
 * since 1 March 2025 there is no monthly credit, and a billing account is
 * mandatory to issue a Maps key at all. Everything else here — Gemini, Gmail,
 * Calendar, Firebase Spark — is free with no card.
 *
 * So a Maps key on its own is NOT enough to turn Maps on. `VITE_ALLOW_PAID_APIS`
 * must also be set to "true". This exists so that pasting a key found in a
 * tutorial, or copying someone else's .env, cannot quietly start metering
 * against a card.
 */
export const ALLOW_PAID_APIS = clean(import.meta.env.VITE_ALLOW_PAID_APIS).toLowerCase() === 'true';

/**
 * Maps JavaScript API key. Empty means Leaflet + OpenStreetMap.
 *
 * The gate is enforced in `vite.config.ts`, not here: Vite inlines
 * `import.meta.env.VITE_*` as string literals at build time, so a key filtered
 * only at runtime would still be sitting in the shipped bundle for anyone to
 * lift. The build blanks it outright, which is why this reads as empty whenever
 * paid APIs are disabled — there is nothing left to check for.
 */
export const GOOGLE_MAPS_API_KEY = clean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

/**
 * True when real Gmail sending / Calendar event creation is available.
 * When false, the UI falls back to Gmail compose links and Calendar
 * TEMPLATE links, which need no credentials at all.
 */
export const HAS_GOOGLE_OAUTH = GOOGLE_CLIENT_ID.length > 0;

/** True when the GPS radar should render with Google Maps instead of Leaflet. */
export const HAS_GOOGLE_MAPS = GOOGLE_MAPS_API_KEY.length > 0;

/** OAuth scopes requested incrementally, only when the user triggers a feature. */
export const GOOGLE_SCOPES = {
  gmailSend: 'https://www.googleapis.com/auth/gmail.send',
  calendarEvents: 'https://www.googleapis.com/auth/calendar.events',
} as const;

/* ------------------------------------------------------------------ */
/* In-app calling                                                      */
/* ------------------------------------------------------------------ */

/**
 * Where a call is hosted.
 *
 * The default is the public Jitsi Meet service, which is the reason this
 * feature cannot cost anything: there is no account, no API key and no card on
 * file, so there is nothing for anyone to bill. A self-hosted or paid instance
 * can be substituted here, and the budget below is what keeps that swap from
 * quietly turning into a bill.
 */
export const CALL_DOMAIN = clean(import.meta.env.VITE_CALL_DOMAIN) || 'meet.jit.si';

/** Turns calling off entirely. Set to "false" to hide every call button. */
export const CALL_ENABLED = clean(import.meta.env.VITE_CALL_ENABLED).toLowerCase() !== 'false';

/**
 * Mixed into the room name so that a room cannot be guessed from a booking id.
 *
 * A public Jitsi room is open to whoever types its name, so the name is the
 * only thing standing between a traveller and a stranger walking into their
 * call. Deployments should set their own; the default keeps the feature
 * working out of the box and is documented as replaceable in .env.example.
 */
export const CALL_ROOM_SALT = clean(import.meta.env.VITE_CALL_ROOM_SALT) || 'vis-go-default-room-salt';

/**
 * The free allowance, and the three caps that keep spending inside it.
 *
 * These are deliberately conservative and enforced before a call starts, not
 * after: the point is that reaching the limit STOPS the feature rather than
 * carrying on into paid usage. 10,000 participant-minutes a month is the size
 * of the free tier at the metered providers this could be pointed at, so the
 * defaults stay meaningful after such a swap.
 */
const positive = (raw: string, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const CALL_LIMITS = {
  /** Total call minutes this browser may spend in a calendar month. */
  minutesPerMonth: positive(clean(import.meta.env.VITE_CALL_MINUTES_PER_MONTH), 10_000),
  /** A single call hangs up on its own here, so a forgotten tab cannot run all night. */
  minutesPerCall: positive(clean(import.meta.env.VITE_CALL_MINUTES_PER_CALL), 30),
  /** Calls that may be started in one day. */
  callsPerDay: positive(clean(import.meta.env.VITE_CALL_CALLS_PER_DAY), 20),
} as const;

/** Vietnam is UTC+7 year-round with no DST, so a fixed offset is correct here. */
export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
