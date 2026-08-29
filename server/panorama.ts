/**
 * Real 360° imagery lookup, proxied through our own server.
 *
 * Mapillary hosts crowd-sourced street-level photography under CC-BY-SA, and
 * Vietnam has unusually good coverage: Be Group contributed roughly 9 million
 * 360° images across Hanoi and Ho Chi Minh City. Surveyed against the live API,
 * it is the only free, no-credit-card source with genuine panoramas of these
 * places at all — Wikimedia Commons has no equirectangular Vietnam category,
 * and Panoramax's Vietnamese contributions are flat phone photos.
 *
 * Two ways in:
 *
 *   ?ids=a,b,c   resolve pinned images. Each VR landmark stores the id of a
 *                panorama that was checked by hand, so opening one is a single
 *                cheap request instead of a geographic search, and the picture
 *                is the one we chose rather than whatever happens to be nearest
 *                today. One Graph call resolves the whole gallery.
 *
 *   ?lat=&lng=   search near a point, for a landmark with no pinned image.
 *
 * Why this is a server route rather than a browser fetch: the access token
 * never reaches the bundle. There is no VITE_ prefix, so Vite cannot inline it.
 *
 * CORS is *not* a reason, contrary to what this comment used to claim. Measured
 * against the live API, graph.mapillary.com answers both the preflight and the
 * request with `access-control-allow-origin: *`, so a browser could call it
 * directly — at the price of publishing the token. That trade is a deployment
 * decision, not a technical constraint; see DEPLOY.md.
 *
 * The image URLs themselves are short-lived CDN links carrying an `oe=` expiry,
 * which is why ids are pinned and URLs are resolved on demand and cached for
 * well under that lifetime. The CDN does send `access-control-allow-origin: *`,
 * so WebGL can sample the texture directly.
 */

interface NodeReq {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}
interface NodeRes {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export interface PanoramaHit {
  url: string;
  id: string;
  capturedAt: string | null;
  /** CC-BY-SA requires attribution; the viewer displays this. */
  attribution: string;
  distanceMeters: number;
}

function getToken(): string | null {
  const raw = process.env.MAPILLARY_TOKEN?.trim();
  if (!raw || raw.startsWith('your_') || raw.startsWith('MY_')) return null;
  return raw;
}

export const isPanoramaSourceConfigured = (): boolean => getToken() !== null;

/** Metres per degree of latitude; longitude is scaled by cos(lat). */
const M_PER_DEG_LAT = 111_320;

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * M_PER_DEG_LAT;
  const dLng = (bLng - aLng) * M_PER_DEG_LAT * Math.cos((aLat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Results are stable for a given place, so cache them for the process lifetime. */
const cache = new Map<string, PanoramaHit | null>();

/** Graph API code 1: "Please reduce the amount of data you're asking for". */
const TOO_MUCH_DATA = 1;

/**
 * Mapillary refuses a bounding box that contains too many images.
 *
 * Measured against the live API: a 600 m box over Hoan Kiem answers HTTP 500
 * with `error.code === 1` even at `limit=5` and two fields, while the same box
 * split into 260 m squares returns 603 images. The ceiling is image *density*,
 * not the response size we ask for — so `limit` and `fields` cannot buy room,
 * and the only thing that helps is a smaller box.
 *
 * 130 m is the largest half-size that answered everywhere we tested in Vietnam.
 * Dense European and US city centres still refuse it, so a tile that comes back
 * with code 1 is quartered until it answers or reaches MIN_TILE_HALF_M.
 */
const TILE_HALF_M = 130;
const MIN_TILE_HALF_M = 25;

/** A hung Graph API request must not hold the route open. */
const REQUEST_TIMEOUT_MS = 12_000;

type Bbox = [west: number, south: number, east: number, north: number];

interface RawImage {
  id: string;
  is_pano?: boolean;
  captured_at?: number;
  thumb_2048_url?: string;
  creator?: { username?: string };
  geometry?: { coordinates?: [number, number] };
  computed_geometry?: { coordinates?: [number, number] };
}

const FIELDS = 'id,is_pano,captured_at,computed_geometry,geometry,thumb_2048_url,creator';

/**
 * One Graph API call. Returns the rows, or null when the box was too dense —
 * the caller decides whether to subdivide. Anything else throws, because a bad
 * token or a dead network is not something splitting the box can fix.
 */
async function queryBbox(token: string, bbox: Bbox): Promise<RawImage[] | null> {
  const url =
    `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}` +
    `&fields=${FIELDS}&bbox=${bbox.join(',')}&limit=50`;

  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const body = (await res.json().catch(() => ({}))) as {
    data?: RawImage[];
    error?: { code?: number; message?: string };
  };

  if (Array.isArray(body.data)) return body.data;
  if (body.error?.code === TOO_MUCH_DATA) return null;
  throw new Error(`Mapillary ${res.status}: ${body.error?.message ?? 'unexpected response'}`);
}

/** Reads one tile, quartering it while Mapillary says it holds too much. */
async function readTile(token: string, bbox: Bbox, halfM: number): Promise<RawImage[]> {
  const rows = await queryBbox(token, bbox);
  if (rows) return rows;
  if (halfM <= MIN_TILE_HALF_M) return [];

  const [w, s, e, n] = bbox;
  const mx = (w + e) / 2;
  const my = (s + n) / 2;
  const quads: Bbox[] = [
    [w, s, mx, my],
    [mx, s, e, my],
    [w, my, mx, n],
    [mx, my, e, n],
  ];
  const parts = await Promise.all(quads.map((q) => readTile(token, q, halfM / 2)));
  return parts.flat();
}

function toHit(lat: number, lng: number, img: RawImage): PanoramaHit | null {
  const coords = img.computed_geometry?.coordinates ?? img.geometry?.coordinates;
  if (!coords || !img.thumb_2048_url) return null;
  return {
    url: img.thumb_2048_url,
    id: img.id,
    capturedAt: img.captured_at ? new Date(img.captured_at).toISOString().slice(0, 10) : null,
    attribution: `© ${img.creator?.username ?? 'Mapillary contributor'} / Mapillary (CC BY-SA)`,
    distanceMeters: Math.round(haversineMeters(lat, lng, coords[1], coords[0])),
  };
}

export async function findPanorama(lat: number, lng: number, radiusM = 600): Promise<PanoramaHit | null> {
  const token = getToken();
  if (!token) return null;

  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${radiusM}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  // Tile size in degrees, correcting longitude for latitude — at 21°N a degree
  // of longitude is only ~104 km, not 111 km.
  const dLat = TILE_HALF_M / M_PER_DEG_LAT;
  const dLng = TILE_HALF_M / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));

  // Rings of tiles, nearest first. Stopping at the first ring that yields a
  // panorama keeps the common case to a single request, and it is also the
  // right answer: the point of the feature is standing where the landmark is.
  const ringCount = Math.max(0, Math.min(4, Math.round(radiusM / (2 * TILE_HALF_M)) - 1));

  let best: PanoramaHit | null = null;

  for (let ring = 0; ring <= ringCount && !best; ring++) {
    const tiles: Bbox[] = [];
    for (let i = -ring; i <= ring; i++) {
      for (let j = -ring; j <= ring; j++) {
        // Only the perimeter: inner cells were covered by an earlier ring.
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        const cLat = lat + i * 2 * dLat;
        const cLng = lng + j * 2 * dLng;
        tiles.push([cLng - dLng, cLat - dLat, cLng + dLng, cLat + dLat]);
      }
    }

    const rows = (await Promise.all(tiles.map((t) => readTile(token, t, TILE_HALF_M)))).flat();

    for (const img of rows) {
      if (!img.is_pano) continue;
      const hit = toHit(lat, lng, img);
      if (hit && (!best || hit.distanceMeters < best.distanceMeters)) best = hit;
    }
  }

  cache.set(key, best);
  return best;
}

/**
 * A panorama chosen by hand for a landmark, addressed by its Mapillary id.
 *
 * Kept separate from PanoramaHit because "how far away is it" is a question
 * about a search result, not about a picture someone picked on purpose.
 */
export interface PinnedPanorama {
  id: string;
  /** 2048x1024 equirectangular, for the sphere. */
  url: string;
  /** 1024x512, for the gallery card. */
  previewUrl: string;
  capturedAt: string | null;
  /** CC-BY-SA requires attribution; the viewer displays this. */
  attribution: string;
}

/**
 * Resolved URLs expire. The `oe=` parameter on a Mapillary CDN link is a few
 * days out, so an hour of caching is generous headroom and still spares the
 * Graph API a request per page view.
 */
const PIN_TTL_MS = 60 * 60 * 1000;
const pinCache = new Map<string, { at: number; pin: PinnedPanorama }>();

/** Resolves pinned ids in one Graph call, skipping any already cached. */
export async function resolvePins(ids: string[]): Promise<Record<string, PinnedPanorama>> {
  const token = getToken();
  if (!token) return {};

  const now = Date.now();
  const out: Record<string, PinnedPanorama> = {};
  const missing: string[] = [];

  for (const id of ids) {
    const hit = pinCache.get(id);
    if (hit && now - hit.at < PIN_TTL_MS) out[id] = hit.pin;
    else missing.push(id);
  }
  if (missing.length === 0) return out;

  const url =
    `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}` +
    `&image_ids=${missing.join(',')}` +
    `&fields=id,is_pano,captured_at,thumb_2048_url,thumb_1024_url,creator`;

  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const body = (await res.json().catch(() => ({}))) as {
    data?: Array<RawImage & { thumb_1024_url?: string }>;
    error?: { message?: string };
  };
  if (!Array.isArray(body.data)) {
    throw new Error(`Mapillary ${res.status}: ${body.error?.message ?? 'unexpected response'}`);
  }

  for (const img of body.data) {
    // A pinned id that stopped being a panorama would put a flat photo on the
    // inside of a sphere, which looks broken rather than merely wrong.
    if (!img.is_pano || !img.thumb_2048_url) continue;
    const pin: PinnedPanorama = {
      id: img.id,
      url: img.thumb_2048_url,
      previewUrl: img.thumb_1024_url ?? img.thumb_2048_url,
      capturedAt: img.captured_at ? new Date(img.captured_at).toISOString().slice(0, 10) : null,
      attribution: `© ${img.creator?.username ?? 'Mapillary contributor'} / Mapillary (CC BY-SA)`,
    };
    pinCache.set(img.id, { at: now, pin });
    out[img.id] = pin;
  }

  return out;
}

/**
 * Distinguishes "nothing is mapped here" from "this token cannot read".
 *
 * Mapillary does not return 403 for a token whose application is missing the
 * `read` scope — it returns `{"data":[]}`, exactly like a genuinely empty
 * bounding box. So an unusable token looks identical to sparse coverage, and
 * the app quietly served illustrated fallbacks forever with nothing in any log
 * to say why.
 *
 * On the first empty result we query a tiny reference box over Dam Square in
 * Amsterdam, which is covered and — critically — sparse enough to answer. An
 * earlier version used a box roughly 700 m across; that one tripped Mapillary's
 * density ceiling on every call, so `data` was never an array and the probe
 * reported "no read scope" for a token that reads perfectly well.
 *
 * Empty there means the token, not the location. The verdict is cached for the
 * process, so this costs one extra request per server start and nothing after.
 */
const REFERENCE_BBOX = '4.89250,52.37260,4.89430,52.37340';
let tokenCanRead: boolean | null = null;

async function probeTokenCanRead(token: string): Promise<boolean> {
  if (tokenCanRead !== null) return tokenCanRead;
  try {
    const res = await fetch(
      `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}` +
        `&fields=id&bbox=${REFERENCE_BBOX}&limit=1`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    const body = (await res.json()) as { data?: unknown[]; error?: { code?: number } };
    // Only an actual list is evidence either way. An error body — including the
    // density refusal — says nothing about the token, so leave the verdict
    // unset rather than caching a guess.
    if (!Array.isArray(body.data)) return true;
    tokenCanRead = body.data.length > 0;
  } catch {
    // A network failure says nothing about the token either.
    return true;
  }
  if (!tokenCanRead) {
    console.warn(
      '[ViS-Go] MAPILLARY_TOKEN authenticates but returns no imagery anywhere, ' +
        'including reference coverage in Amsterdam. Its application is almost ' +
        'certainly missing the "read" scope — re-issue the token with READ enabled.',
    );
  }
  return tokenCanRead;
}

export const panoramaEndpoint = async (req: NodeReq, res: NodeRes): Promise<void> => {
  res.setHeader('Content-Type', 'application/json');

  if (!isPanoramaSourceConfigured()) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: false, reason: 'NOT_CONFIGURED' }));
    return;
  }

  try {
    const params = new URL(req.url ?? '', 'http://localhost').searchParams;

    const ids = (params.get('ids') ?? '')
      .split(',')
      .map((v) => v.trim())
      // Mapillary ids are digits. Filtering here keeps anything a caller
      // invents out of a URL we then sign with our own token.
      .filter((v) => /^\d{1,25}$/.test(v))
      .slice(0, 50);

    if (ids.length > 0) {
      const panoramas = await resolvePins(ids);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, panoramas }));
      return;
    }

    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    // Kept in step with the client default in src/utils/panoramaSource.ts.
    const radius = Number(params.get('radius')) || 1200;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: false, reason: 'BAD_REQUEST' }));
      return;
    }

    const hit = await findPanorama(lat, lng, radius);
    res.statusCode = 200;

    if (hit) {
      res.end(JSON.stringify({ ok: true, panorama: hit }));
      return;
    }

    const canRead = await probeTokenCanRead(getToken() as string);
    res.end(JSON.stringify({ ok: false, reason: canRead ? 'NO_COVERAGE' : 'TOKEN_NO_READ_SCOPE' }));
  } catch (err) {
    // 200 on purpose: the viewer must fall back to its illustrated scene, not
    // treat this as a broken page.
    res.statusCode = 200;
    res.end(
      JSON.stringify({ ok: false, reason: 'LOOKUP_FAILED', error: err instanceof Error ? err.message : String(err) }),
    );
  }
};
