/**
 * Single source of truth for the `window.google` global.
 *
 * Both the Identity Services SDK (OAuth) and the Maps JavaScript API attach to
 * the same `window.google` object. Declaring it separately in each module made
 * TypeScript reject the conflicting shapes, so the augmentation lives here once
 * and both namespaces hang off it.
 */

import type { GoogleAccountsOAuth2 } from '../utils/googleAuth';
import type { GoogleMapsApi } from '../utils/googleMaps';

declare global {
  interface Window {
    google?: {
      accounts?: { oauth2?: GoogleAccountsOAuth2 };
      maps?: GoogleMapsApi;
    };
    /** Global callback name handed to the Maps loader script. */
    __visgoMapsCallback?: () => void;
  }
}

export {};
