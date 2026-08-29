/**
 * Firebase bootstrap — deliberately constrained to the free Spark plan.
 *
 * COST SAFETY (this is a design constraint, not a preference):
 *
 * Spark is the only Firebase plan that *cannot* charge money. It has no billing
 * account attached, so when a quota is hit Firebase returns an error instead of
 * ringing up a bill. Blaze, by contrast, has generous free quotas but a real
 * card behind them, and its "budget alerts" only email you — they never stop
 * spending.
 *
 * Two Firebase products force a project onto Blaze:
 *   - Cloud Storage  (a linked billing account is required to create or keep a
 *                     bucket, as of 3 Feb 2026)
 *   - Cloud Functions
 *
 * So this app uses NEITHER. We import only `firebase/app`, `firebase/auth` and
 * `firebase/firestore`, all of which stay on Spark. Images are kept as URLs or
 * small data URLs inside Firestore documents, and the Gemini calls that would
 * normally live in a Cloud Function run on our own Express/Vite `/api` routes
 * instead. Adding a `firebase/storage` or `firebase/functions` import anywhere
 * in this codebase would silently reintroduce the card requirement.
 */

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const clean = (value: string | undefined): string => {
  const v = (value ?? '').trim();
  if (!v || v.startsWith('your_') || v.startsWith('MY_')) return '';
  return v;
};

const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID),
  // NOTE: `storageBucket` is intentionally omitted. We never touch Cloud
  // Storage, and leaving it unset makes that impossible to do by accident.
} as const;

/**
 * True when enough config is present to talk to Firebase. All four fields are
 * required: a partial config produces confusing runtime errors deep inside the
 * SDK rather than a clean "not configured" path.
 */
export const HAS_FIREBASE =
  firebaseConfig.apiKey.length > 0 &&
  firebaseConfig.authDomain.length > 0 &&
  firebaseConfig.projectId.length > 0 &&
  firebaseConfig.appId.length > 0;

/** Which config fields are missing — surfaced in the UI to aid setup. */
export function missingFirebaseKeys(): string[] {
  const labels: Record<keyof typeof firebaseConfig, string> = {
    apiKey: 'VITE_FIREBASE_API_KEY',
    authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'VITE_FIREBASE_PROJECT_ID',
    appId: 'VITE_FIREBASE_APP_ID',
  };
  return (Object.keys(labels) as (keyof typeof firebaseConfig)[])
    .filter((k) => firebaseConfig[k].length === 0)
    .map((k) => labels[k]);
}

/** reCAPTCHA v3 site key. Public by design; it only names the site. */
const APP_CHECK_SITE_KEY = clean(import.meta.env.VITE_RECAPTCHA_SITE_KEY);

/**
 * Port of a local Firestore emulator, if one should be used instead of the real
 * database.
 *
 * Left empty in `.env`, so production builds never see it. Set it while working
 * on `firestore.rules` — `npm run test:rules` proves a ruleset in isolation, and
 * this lets the actual app run against the same emulator, which is the only way
 * to find a rule that is correct but that the UI never satisfies.
 */
const EMULATOR_PORT = clean(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT);

/**
 * Turns on App Check, if a site key is configured.
 *
 * Deliberately non-fatal. An App Check failure must not stop the app booting —
 * sign-in and Firestore keep working without it, and the AI path degrades to
 * its offline engine. Enforcement lives in the Firebase console, not here.
 */
async function initAppCheck(app: FirebaseApp): Promise<void> {
  if (!APP_CHECK_SITE_KEY) return;
  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');

    /*
      Local development needs a debug token, not the reCAPTCHA key.

      A reCAPTCHA v3 key is bound to a list of domains, and `localhost` is not
      on this project's list — so every page load on a dev machine posted to
      `exchangeRecaptchaV3Token` and got a 403 back. Harmless today only
      because enforcement is still off; the moment it is switched on in the
      console, the dev machine loses Firestore and AI Logic outright, and the
      failure looks like a broken app rather than a missing token.

      The debug provider is Firebase's own answer to this and costs nothing.
      It prints a UUID on first run; paste that into Firebase Console → App
      Check → Apps → ⋮ → Manage debug tokens, and this browser is trusted.
      Nothing here ships to production: the branch is keyed on the hostname.
    */
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
    if (isLocal) {
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.info(
        '[ViS-Go] App Check is in debug mode on localhost. Register the token printed below at ' +
          'Firebase Console → App Check → Apps → ⋮ → Manage debug tokens.',
      );
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('[ViS-Go] App Check could not start; AI calls may be refused:', err);
  }
}

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let servicesPromise: Promise<FirebaseServices> | null = null;

/**
 * Loads and initialises Firebase on first use.
 *
 * The SDK is behind a dynamic import so that projects running without Firebase
 * config never download it — Vite splits it into its own chunk. Returns null
 * (rather than throwing) when unconfigured, so every caller has one obvious
 * "fall back to localStorage" branch.
 */
export async function getFirebase(): Promise<FirebaseServices | null> {
  if (!HAS_FIREBASE) return null;

  if (!servicesPromise) {
    servicesPromise = (async () => {
      const [{ initializeApp, getApps, getApp }, authMod, firestoreMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);

      // Vite HMR can re-run this module; reuse the existing app if present.
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

      // App Check before anything else uses the app: it is what stands between
      // our free Gemini quota and anyone who copies the endpoint out of the
      // network tab. reCAPTCHA v3 is the no-cost provider — the Enterprise one
      // can bill, which is why it is not used here.
      await initAppCheck(app);

      const auth = authMod.getAuth(app);
      // Keep the session in this browser only; nothing is written server-side.
      await authMod.setPersistence(auth, authMod.browserLocalPersistence);

      const db = firestoreMod.getFirestore(app);

      if (EMULATOR_PORT) {
        firestoreMod.connectFirestoreEmulator(db, '127.0.0.1', Number(EMULATOR_PORT));
        // Loud on purpose: nothing written in this session reaches the real
        // project, and finding that out later wastes an afternoon.
        console.warn(`[ViS-Go] Firestore is the LOCAL EMULATOR on port ${EMULATOR_PORT}, not production.`);
      }

      return { app, auth, db };
    })().catch((err) => {
      // Reset so a later attempt can retry rather than reusing a poisoned promise.
      servicesPromise = null;
      throw err;
    });
  }

  return servicesPromise;
}

/** Project ID, for console deep-links in the setup UI. */
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
