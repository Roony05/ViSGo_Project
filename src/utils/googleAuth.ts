/**
 * Google OAuth 2.0 via Google Identity Services (GIS).
 *
 * Uses the browser-side token flow, which needs only a public Client ID —
 * no client secret, no backend, no billing. Access tokens live in memory for
 * the session and are never persisted, so a closed tab revokes local access.
 *
 * Scopes are requested *incrementally*: we only ask for Gmail permission when
 * the traveller actually clicks "send receipt", and only ask for Calendar
 * permission when they click "add to calendar". That keeps the consent screen
 * honest and minimal.
 */

import { GOOGLE_CLIENT_ID, HAS_GOOGLE_OAUTH } from '../config/env';

/* --- Minimal typings for the GIS global, which ships no bundled types --- */

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

/** Shape of `window.google.accounts.oauth2`; wired up in types/google-globals.d.ts. */
export interface GoogleAccountsOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type?: string; message?: string }) => void;
  }): TokenClient;
  revoke(token: string, done: () => void): void;
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisScriptPromise: Promise<void> | null = null;

/** Injects the GIS script once and resolves when the global is ready. */
function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  if (!gisScriptPromise) {
    gisScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
        return;
      }

      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisScriptPromise = null; // allow a retry on the next attempt
        reject(new Error('Failed to load Google Identity Services'));
      };
      document.head.appendChild(script);
    });
  }

  return gisScriptPromise;
}

/* --- In-memory token cache, keyed by scope --- */

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

/** 60s safety margin so a token can't expire mid-request. */
const EXPIRY_MARGIN_MS = 60_000;

export class GoogleAuthError extends Error {
  readonly reason: 'NOT_CONFIGURED' | 'POPUP_BLOCKED' | 'DENIED' | 'SCRIPT_FAILED' | 'UNKNOWN';

  constructor(reason: GoogleAuthError['reason'], message: string) {
    super(message);
    this.name = 'GoogleAuthError';
    this.reason = reason;
  }
}

/**
 * Returns a valid access token for `scope`, prompting the user only when a
 * cached token is missing or expired.
 *
 * Must be called directly from a user gesture (click handler) — browsers block
 * the consent popup otherwise.
 */
export async function getAccessToken(scope: string): Promise<string> {
  if (!HAS_GOOGLE_OAUTH) {
    throw new GoogleAuthError(
      'NOT_CONFIGURED',
      'VITE_GOOGLE_CLIENT_ID is not set. Add it to .env to enable real Gmail and Calendar sync.'
    );
  }

  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
    return cached.accessToken;
  }

  try {
    await loadGisScript();
  } catch {
    throw new GoogleAuthError('SCRIPT_FAILED', 'Could not reach accounts.google.com. Check your network connection.');
  }

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new GoogleAuthError('SCRIPT_FAILED', 'Google Identity Services did not initialise.');
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope,
      callback: (response) => {
        if (settled) return;
        settled = true;

        if (response.error || !response.access_token) {
          const denied = response.error === 'access_denied' || response.error === 'user_cancel';
          reject(
            new GoogleAuthError(
              denied ? 'DENIED' : 'UNKNOWN',
              response.error_description || response.error || 'Authorization failed.'
            )
          );
          return;
        }

        tokenCache.set(scope, {
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
        });
        resolve(response.access_token);
      },
      error_callback: (err) => {
        if (settled) return;
        settled = true;
        const popupBlocked = err.type === 'popup_failed_to_open' || err.type === 'popup_closed';
        reject(
          new GoogleAuthError(
            popupBlocked ? 'POPUP_BLOCKED' : 'UNKNOWN',
            err.message || 'The Google authorization window was closed or blocked.'
          )
        );
      },
    });

    // '' lets Google skip the consent screen when the user already granted
    // this scope, so repeat actions stay one-click.
    client.requestAccessToken({ prompt: cached ? '' : 'consent' });
  });
}

/** True when a live token for this scope is already cached. */
export function hasValidToken(scope: string): boolean {
  const cached = tokenCache.get(scope);
  return !!cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now();
}

/** Drops cached tokens and asks Google to revoke them. */
export function signOutGoogle(): void {
  const oauth2 = window.google?.accounts?.oauth2;
  for (const { accessToken } of tokenCache.values()) {
    try {
      oauth2?.revoke(accessToken, () => undefined);
    } catch {
      // Revocation is best-effort; clearing the local cache is what matters.
    }
  }
  tokenCache.clear();
}
