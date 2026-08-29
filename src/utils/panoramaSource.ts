/**
 * Real 360° photography — resolved through our server, or straight from
 * Mapillary when there is no server.
 *
 * Mapillary's coverage is street-level, so a city landmark usually resolves and
 * a bay, cave or mountainside usually does not. The viewer therefore treats a
 * real photo as an upgrade, never a requirement.
 */

export interface RealPanorama {
  url: string;
  id: string;
  capturedAt: string | null;
  attribution: string;
  distanceMeters: number;
}

export type PanoramaLookup =
  | { status: 'found'; panorama: RealPanorama }
  | {
      status: 'none';
      /**
       * TOKEN_NO_READ_SCOPE is separate from NO_COVERAGE on purpose: Mapillary
       * answers a scope-less token with an empty list rather than a 403, so the
       * two are indistinguishable from one request and only the second reads as
       * something the operator can fix.
       */
      reason: 'NOT_CONFIGURED' | 'NO_COVERAGE' | 'TOKEN_NO_READ_SCOPE' | 'LOOKUP_FAILED' | 'OFFLINE';
    };

/**
 * Direct-to-Mapillary mode, for static hosting.
 *
 * Measured against the live API, graph.mapillary.com answers both the preflight
 * and the request with `access-control-allow-origin: *`, so the browser can
 * call it itself. The price is that the token ships in the bundle — which is
 * acceptable only because this is a Mapillary *client* token: it reads public
 * photography and nothing else. It cannot touch the account, cannot upload, and
 * cannot spend money. Mapillary's own JS library embeds these the same way.
 *
 * Leave VITE_MAPILLARY_TOKEN unset to keep the token server-side instead; the
 * /api route below is then the only path. Never put the Gemini key here — that
 * one buys compute, and a stolen one costs the account real quota or money.
 */
const PUBLIC_TOKEN = ((): string => {
  const v = (import.meta.env.VITE_MAPILLARY_TOKEN ?? '').trim();
  return v.startsWith('MLY|') ? v : '';
})();

const GRAPH = 'https://graph.mapillary.com/images';

const memo = new Map<string, PanoramaLookup>();

/**
 * A transient failure must not become the answer for the rest of the session.
 * "This place has no coverage" is stable and worth remembering; "the request
 * did not go through" is not, and caching it means a single network blip keeps
 * a landmark on its illustration until the tab is reloaded.
 */
const TRANSIENT = new Set(['LOOKUP_FAILED', 'OFFLINE']);

/**
 * 1200 m rather than the tighter radius this used to ask for: the server now
 * tiles the search, and measured coverage around Hoi An only starts about
 * 900 m out. A landmark with coverage nearby still answers on the first tile.
 */
export async function lookupPanorama(lat: number, lng: number, radius = 1200): Promise<PanoramaLookup> {
  const key = `${lat},${lng},${radius}`;
  const cached = memo.get(key);
  if (cached) return cached;

  let result: PanoramaLookup;
  try {
    if (PUBLIC_TOKEN) {
      result = await searchDirect(lat, lng);
      if (result.status === 'found' || result.reason !== 'LOOKUP_FAILED') memo.set(key, result);
      return result;
    }

    const res = await fetch(`/api/panorama?lat=${lat}&lng=${lng}&radius=${radius}`);
    const body = (await res.json()) as {
      ok?: boolean;
      panorama?: RealPanorama;
      reason?: 'NOT_CONFIGURED' | 'NO_COVERAGE' | 'TOKEN_NO_READ_SCOPE' | 'LOOKUP_FAILED' | 'BAD_REQUEST';
    };
    result =
      body.ok && body.panorama
        ? { status: 'found', panorama: body.panorama }
        : { status: 'none', reason: body.reason === 'BAD_REQUEST' ? 'LOOKUP_FAILED' : body.reason ?? 'LOOKUP_FAILED' };
  } catch {
    result = { status: 'none', reason: 'OFFLINE' };
  }

  if (result.status === 'found' || !TRANSIENT.has(result.reason)) memo.set(key, result);
  return result;
}

/* ------------------------------------------------------------------ */
/* Pinned panoramas                                                    */
/* ------------------------------------------------------------------ */

export interface PinnedPanorama {
  id: string;
  url: string;
  previewUrl: string;
  capturedAt: string | null;
  attribution: string;
}

/**
 * Resolves the panoramas pinned to the VR landmarks.
 *
 * One request for the whole gallery, because Mapillary CDN links expire and
 * cannot be baked into the data — only the image ids can. Resolving them
 * together is what lets the cards show the real photograph immediately instead
 * of a placeholder that has to be searched for per landmark.
 */
export async function resolvePins(ids: string[]): Promise<Record<string, PinnedPanorama>> {
  const wanted = ids.filter((id) => !pinMemo.has(id));

  if (wanted.length > 0) {
    try {
      const resolved = PUBLIC_TOKEN
        ? await resolveDirect(wanted)
        : await resolveViaServer(wanted);
      for (const [id, pin] of Object.entries(resolved)) pinMemo.set(id, pin);
    } catch {
      // Leave the memo untouched: a failed resolve must stay retryable, and
      // the caller renders its "photo unavailable" state meanwhile.
    }
  }

  const out: Record<string, PinnedPanorama> = {};
  for (const id of ids) {
    const pin = pinMemo.get(id);
    if (pin) out[id] = pin;
  }
  return out;
}

const pinMemo = new Map<string, PinnedPanorama>();

/** Metres per degree of latitude; longitude is scaled by cos(lat). */
const M_PER_DEG_LAT = 111_320;

/**
 * Best-effort nearest-photo search, in the browser.
 *
 * One small box, not the tiled sweep the server does. Mapillary refuses a box
 * holding too many images (see server/panorama.ts), and 130 m is the largest
 * half-size that answered everywhere we tested in Vietnam — so this finds a
 * photo when one is right there and gives up otherwise, rather than firing
 * dozens of requests from someone's phone. Every landmark in the gallery has a
 * pinned image anyway; this only runs when one fails to resolve.
 */
async function searchDirect(lat: number, lng: number): Promise<PanoramaLookup> {
  const half = 130;
  const dLat = half / M_PER_DEG_LAT;
  const dLng = half / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(',');

  const res = await fetch(
    `${GRAPH}?access_token=${encodeURIComponent(PUBLIC_TOKEN)}` +
      `&fields=id,is_pano,captured_at,geometry,computed_geometry,thumb_2048_url,creator` +
      `&bbox=${bbox}&limit=50`,
  );
  const body = (await res.json()) as {
    data?: Array<{
      id: string;
      is_pano?: boolean;
      captured_at?: number;
      thumb_2048_url?: string;
      creator?: { username?: string };
      geometry?: { coordinates?: [number, number] };
      computed_geometry?: { coordinates?: [number, number] };
    }>;
  };
  if (!Array.isArray(body.data)) return { status: 'none', reason: 'LOOKUP_FAILED' };

  let best: RealPanorama | null = null;
  for (const img of body.data) {
    if (!img.is_pano || !img.thumb_2048_url) continue;
    const coords = img.computed_geometry?.coordinates ?? img.geometry?.coordinates;
    if (!coords) continue;
    const dx = (coords[1] - lat) * M_PER_DEG_LAT;
    const dy = (coords[0] - lng) * M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
    const distanceMeters = Math.round(Math.hypot(dx, dy));
    if (!best || distanceMeters < best.distanceMeters) {
      best = {
        url: img.thumb_2048_url,
        id: img.id,
        capturedAt: img.captured_at ? new Date(img.captured_at).toISOString().slice(0, 10) : null,
        attribution: `© ${img.creator?.username ?? 'Mapillary contributor'} / Mapillary (CC BY-SA)`,
        distanceMeters,
      };
    }
  }

  return best ? { status: 'found', panorama: best } : { status: 'none', reason: 'NO_COVERAGE' };
}

async function resolveViaServer(ids: string[]): Promise<Record<string, PinnedPanorama>> {
  const res = await fetch(`/api/panorama?ids=${ids.join(',')}`);
  const body = (await res.json()) as { ok?: boolean; panoramas?: Record<string, PinnedPanorama> };
  return body.ok && body.panoramas ? body.panoramas : {};
}

/**
 * The same resolve, done in the browser. One Graph call for the whole gallery,
 * exactly as the server route does it — see server/panorama.ts for why ids are
 * pinned rather than URLs.
 */
async function resolveDirect(ids: string[]): Promise<Record<string, PinnedPanorama>> {
  const url =
    `${GRAPH}?access_token=${encodeURIComponent(PUBLIC_TOKEN)}` +
    `&image_ids=${ids.join(',')}` +
    `&fields=id,is_pano,captured_at,thumb_2048_url,thumb_1024_url,creator`;

  const res = await fetch(url);
  const body = (await res.json()) as {
    data?: Array<{
      id: string;
      is_pano?: boolean;
      captured_at?: number;
      thumb_2048_url?: string;
      thumb_1024_url?: string;
      creator?: { username?: string };
    }>;
  };
  if (!Array.isArray(body.data)) return {};

  const out: Record<string, PinnedPanorama> = {};
  for (const img of body.data) {
    // A pinned id that stopped being a panorama would put a flat photo on the
    // inside of a sphere, which looks broken rather than merely wrong.
    if (!img.is_pano || !img.thumb_2048_url) continue;
    out[img.id] = {
      id: img.id,
      url: img.thumb_2048_url,
      previewUrl: img.thumb_1024_url ?? img.thumb_2048_url,
      capturedAt: img.captured_at ? new Date(img.captured_at).toISOString().slice(0, 10) : null,
      attribution: `© ${img.creator?.username ?? 'Mapillary contributor'} / Mapillary (CC BY-SA)`,
    };
  }
  return out;
}
