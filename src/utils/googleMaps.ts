/**
 * Google Maps integration with a free Leaflet fallback.
 *
 * The Maps JavaScript API requires a billing account with a real payment card,
 * even though 10,000 map loads/month are free. So ViS-Go treats it as opt-in:
 * set VITE_GOOGLE_MAPS_API_KEY to render Google Maps, leave it empty to render
 * Leaflet + OpenStreetMap with identical features and zero cost.
 *
 * The URL builders below need no API key at all and always point at real
 * Google Maps — they work in both modes.
 */

import { GOOGLE_MAPS_API_KEY, HAS_GOOGLE_MAPS } from '../config/env';

export { HAS_GOOGLE_MAPS };

/* ------------------------------------------------------------------ */
/* Keyless URL builders — always available                             */
/* ------------------------------------------------------------------ */

/** Google Maps search link for a named place, e.g. a tour meeting point. */
export function buildGoogleMapsPlaceUrl(placeName: string, city?: string): string {
  const query = [placeName, city, 'Vietnam'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Google Maps link for exact coordinates. */
export function buildGoogleMapsCoordUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Turn-by-turn directions from one point to another.
 * `travelMode` defaults to two-wheeler, which is how people actually move in
 * Vietnamese cities.
 */
export function buildGoogleMapsDirectionsUrl(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  travelMode: 'driving' | 'walking' | 'two-wheeler' | 'transit' = 'two-wheeler'
): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: travelMode === 'two-wheeler' ? 'driving' : travelMode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Maps JavaScript API loader — only used when a key is present        */
/* ------------------------------------------------------------------ */

/* Minimal structural typings; @types/google.maps is not a dependency. */
export interface GMapLatLng {
  lat: number;
  lng: number;
}

export interface GMap {
  setCenter(pos: GMapLatLng): void;
  setZoom(zoom: number): void;
  panTo(pos: GMapLatLng): void;
  fitBounds(bounds: unknown, padding?: number): void;
}

export interface GMarker {
  setPosition(pos: GMapLatLng): void;
  setMap(map: GMap | null): void;
}

export interface GPolyline {
  setPath(path: GMapLatLng[]): void;
  setMap(map: GMap | null): void;
}

export interface GoogleMapsApi {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
  Marker: new (opts: Record<string, unknown>) => GMarker;
  Polyline: new (opts: Record<string, unknown>) => GPolyline;
  LatLngBounds: new () => { extend(pos: GMapLatLng): void };
  InfoWindow: new (opts: Record<string, unknown>) => { open(opts: Record<string, unknown>): void };
  SymbolPath: { CIRCLE: unknown };
}

let mapsPromise: Promise<GoogleMapsApi> | null = null;

/**
 * Loads the Maps JavaScript API once. Rejects when no key is configured, which
 * is the signal for callers to render Leaflet instead.
 */
export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (!HAS_GOOGLE_MAPS) {
    return Promise.reject(new Error('NO_MAPS_KEY'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!mapsPromise) {
    mapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        mapsPromise = null;
        reject(new Error('Google Maps script timed out'));
      }, 12_000);

      window.__visgoMapsCallback = () => {
        window.clearTimeout(timeout);
        const maps = window.google?.maps;
        if (maps) {
          resolve(maps);
        } else {
          mapsPromise = null;
          reject(new Error('Google Maps loaded but window.google.maps is missing'));
        }
      };

      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: GOOGLE_MAPS_API_KEY,
        callback: '__visgoMapsCallback',
        loading: 'async',
        language: 'vi',
        region: 'VN',
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        mapsPromise = null;
        // A bad key, a referrer restriction or a disabled billing account all
        // land here. Leaflet takes over.
        reject(new Error('Failed to load Google Maps — check the API key, billing and referrer restrictions'));
      };
      document.head.appendChild(script);
    });
  }

  return mapsPromise;
}

/* ------------------------------------------------------------------ */
/* Geo helpers                                                         */
/* ------------------------------------------------------------------ */

/** Great-circle distance in kilometres. */
export function haversineKm(a: GMapLatLng, b: GMapLatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Formats a distance the way a traveller reads it: metres up close, km far. */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
}
