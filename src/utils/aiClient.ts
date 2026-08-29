/**
 * Client for the ViS-Go AI features.
 *
 * Two routes to Gemini, tried in order:
 *
 *   1. Firebase AI Logic, which needs no server of ours at all.
 *   2. The /api routes, served by vite.config.ts in dev and preview and by
 *      server/index.ts or a Netlify Function in production.
 *
 * Nothing here touches a credential either way: the key lives on Firebase's
 * proxy or on our own server. Every call reports whether the AI actually
 * answered, so the UI can tell the truth instead of passing off a canned
 * string as a model's work.
 */

import { HAS_FIREBASE_AI, translateListing } from './firebaseAi';
import type { ListingDraft } from '../components/HostAiAssistant';

export interface TranslationFields {
  title: string;
  tagline: string;
  description: string;
  included: string;
  meetingPoint: string;
}

/**
 * What the studio wants back. See ComposeMode in server/gemini.ts for why
 * 'both' is one call and not two.
 */
export type ComposeMode = 'en' | 'vi' | 'both' | 'polish-en' | 'translate-vi';

/** One itinerary stop, in whichever language was asked for. */
export interface StopFields {
  title: string;
  description: string;
}

export interface StopsOutcome {
  ok: boolean;
  /** One entry per stop sent, in the same order. */
  stops?: StopFields[];
  reason?: TranslateOutcome['reason'];
}

export interface TranslateOutcome {
  ok: boolean;
  /** English fields. Absent when mode is 'vi'. */
  data?: TranslationFields;
  /** Polished Vietnamese. Absent when mode is 'en'. */
  vi?: TranslationFields;
  /** Why the AI path was not used — surfaced to the host in the UI. */
  reason?:
    | 'NO_API_KEY'
    | 'GENERATION_ERROR'
    | 'OFFLINE'
    | 'BAD_REQUEST'
    // Refused by our own spend guard in server/gemini.ts, not by Google.
    | 'RATE_LIMITED'
    | 'DAILY_CAP';
}

export interface HostAssistOutcome {
  ok: boolean;
  reply?: string;
  patch?: Partial<ListingDraft>;
  reason?: TranslateOutcome['reason'];
}

export { fetchWithTimeout };

export interface BackendStatus {
  gemini: boolean;
  model: string;
}

let statusCache: BackendStatus | null = null;

/**
 * `fetch` that always comes back.
 *
 * Every AI call in this file used a bare `fetch`, which has no timeout at all:
 * a request that is accepted and then never answered leaves the promise
 * pending forever. That is not hypothetical — an upstream Gemini call with no
 * deadline of its own hung `/api/rag-chat`, and the assistant sat on "Đang tra
 * cứu dữ liệu tour…" indefinitely with no error and no way out but a reload.
 *
 * A slow answer that never arrives and no answer at all are the same thing to
 * whoever is waiting, so this turns the first into the second, promptly, and
 * every caller already has a fallback for it.
 */
async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  ms = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether an `/api` backend exists at all, asked once per session.
 *
 * On static hosting there is no server, and every path rewrites to index.html —
 * so a POST to /api/rag-chat would come back as HTML (or 404) on every single
 * message, each one a red line in the console for something that is working as
 * designed. One cheap GET settles it instead.
 */
let apiBackend: Promise<boolean> | null = null;

export function hasApiBackend(): Promise<boolean> {
  if (!apiBackend) {
    // Short: this only asks whether a server exists, and the answer is
    // "no" for every static deployment.
    apiBackend = fetchWithTimeout('/api/status', {}, 6_000)
      .then(async (res) => {
        if (!res.ok) return false;
        // A rewritten index.html parses as neither JSON nor a status object.
        const body = (await res.json()) as Partial<BackendStatus>;
        return typeof body.gemini === 'boolean';
      })
      .catch(() => false);
  }
  return apiBackend;
}

/** Whether an AI path exists at all. Cached per session. */
export async function fetchBackendStatus(): Promise<BackendStatus> {
  if (statusCache) return statusCache;

  // Firebase AI Logic needs no status call: if a template is configured the
  // path exists, and whether it answers is decided per request.
  if (HAS_FIREBASE_AI) {
    statusCache = { gemini: true, model: 'gemini (Firebase AI Logic)' };
    return statusCache;
  }

  try {
    const response = await fetchWithTimeout('/api/status', {}, 6_000);
    if (response.ok) {
      statusCache = (await response.json()) as BackendStatus;
      return statusCache;
    }
  } catch {
    // Static hosting with no backend — treat as "AI unavailable".
  }

  statusCache = { gemini: false, model: 'unavailable' };
  return statusCache;
}

/** Translates a Vietnamese tour listing into publish-ready English. */
export async function translateTourListing(input: {
  title: string;
  tagline: string;
  description: string;
  included: string;
  meetingPoint: string;
  city: string;
  category: string;
  mode?: ComposeMode;
}): Promise<TranslateOutcome> {
  const mode: ComposeMode = input.mode ?? 'en';

  // The Firebase AI Logic template is a translate-only template, so it can
  // serve mode 'en' and nothing else. The other two modes go straight to the
  // /api route rather than burning a call that will come back in the wrong
  // shape. Adding a second template to the console lifts this — see DEPLOY.md.
  if (HAS_FIREBASE_AI && mode === 'en') {
    const data = await translateListing(input);
    if (data) return { ok: true, data };
    // No answer from Firebase is not the end: a deployment may have both paths.
  }

  try {
    const response = await fetchWithTimeout('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, mode }),
    });

    if (!response.ok) {
      return { ok: false, reason: 'OFFLINE' };
    }

    const result = (await response.json()) as {
      ok?: boolean;
      data?: TranslationFields;
      vi?: TranslationFields;
      fallbackReason?: TranslateOutcome['reason'];
    };

    if (result.ok && (result.data || result.vi)) {
      return { ok: true, data: result.data, vi: result.vi };
    }

    return { ok: false, reason: result.fallbackReason ?? 'GENERATION_ERROR' };
  } catch {
    return { ok: false, reason: 'OFFLINE' };
  }
}

/**
 * The same two jobs, for the itinerary.
 *
 * Every stop travels in one request. Per stop the text is two short lines, so
 * sending them separately would pay for the system prompt five times over to
 * translate about a paragraph.
 *
 * The Firebase AI Logic shortcut is skipped deliberately: that console template
 * is shaped for a listing, and handing it an itinerary returns the wrong object.
 */
export async function composeTourStops(input: {
  stops: Array<{ time?: string; title?: string; description?: string; locationName?: string }>;
  city: string;
  mode: 'vi' | 'en' | 'polish-en' | 'translate-vi';
}): Promise<StopsOutcome> {
  try {
    const response = await fetchWithTimeout('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) return { ok: false, reason: 'OFFLINE' };

    const result = (await response.json()) as {
      ok?: boolean;
      stops?: StopFields[];
      fallbackReason?: TranslateOutcome['reason'];
    };

    if (result.ok && Array.isArray(result.stops)) {
      return { ok: true, stops: result.stops };
    }

    return { ok: false, reason: result.fallbackReason ?? 'GENERATION_ERROR' };
  } catch {
    return { ok: false, reason: 'OFFLINE' };
  }
}

/** Talks to the server-only writing assistant; no fabricated offline rewrite. */
export async function hostAssist(input: {
  message: string;
  draft: ListingDraft;
  tourLanguages: string[];
  history: Array<{ role: string; text: string }>;
  uiLanguage: 'vi' | 'en';
}): Promise<HostAssistOutcome> {
  try {
    const response = await fetchWithTimeout('/api/host-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) return { ok: false, reason: 'OFFLINE' };

    const result = (await response.json()) as {
      ok?: boolean;
      reply?: string;
      patch?: Partial<ListingDraft>;
      fallbackReason?: TranslateOutcome['reason'];
    };
    if (result.ok && typeof result.reply === 'string') {
      return { ok: true, reply: result.reply, patch: result.patch };
    }
    return { ok: false, reason: result.fallbackReason ?? 'GENERATION_ERROR' };
  } catch {
    return { ok: false, reason: 'OFFLINE' };
  }
}
