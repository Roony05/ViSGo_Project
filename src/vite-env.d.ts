/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Must be "true" before any billable Google API is used. See config/env.ts. */
  readonly VITE_ALLOW_PAID_APIS?: string;
  // Firebase web config. All four are required together — see config/firebase.ts.
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
