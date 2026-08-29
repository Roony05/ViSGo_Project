/**
 * YouTube links, turned into something safe to embed.
 *
 * Two jobs, and the second is the one that matters.
 *
 * PARSING. A host pastes whatever their phone gave them — a watch URL, a
 * youtu.be short link, a Shorts link, one with a `?t=90` on the end, one with a
 * playlist attached. All of them carry the same eleven-character id, and
 * everything else on the URL is either irrelevant or a tracking parameter we
 * have no reason to pass on.
 *
 * REFUSING EVERYTHING ELSE. The id is the only thing that ever reaches an
 * `<iframe src>`, and it is rebuilt from `[A-Za-z0-9_-]{11}` rather than
 * substituted into a template. A host is a member of the public typing into a
 * text box; if the raw string were passed through, `javascript:` and a crafted
 * `youtube.com...#` would both be a script running on a page where somebody
 * else is signed in.
 */

/** YouTube video ids are exactly eleven URL-safe base64 characters. */
const ID = /^[A-Za-z0-9_-]{11}$/;

const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
]);

/**
 * The video id in a pasted link, or null if there is not one.
 *
 * A bare id is accepted too: people copy those out of other embeds.
 */
export function youTubeId(input: string | undefined | null): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw;

  let url: URL;
  try {
    // Hosts are typed without a scheme more often than not.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  // youtu.be/<id> and /shorts/<id>, /embed/<id>, /v/<id>, /live/<id>
  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  if (url.hostname.toLowerCase().endsWith('youtu.be') && ID.test(last)) return last;
  if (['shorts', 'embed', 'v', 'live'].includes(segments[0] ?? '') && ID.test(last)) return last;

  const v = url.searchParams.get('v');
  return v && ID.test(v) ? v : null;
}

export const isYouTubeLink = (input: string | undefined | null): boolean => youTubeId(input) !== null;

/**
 * The player URL.
 *
 * `youtube-nocookie.com` is YouTube's own privacy-enhanced host: it sets no
 * tracking cookie until somebody actually presses play. It costs nothing and
 * is the correct default for a page that embeds a video the visitor did not
 * ask for. `rel=0` keeps the end-screen suggestions inside the same channel
 * rather than sending a traveller off into whatever YouTube feels like next.
 */
export function youTubeEmbedUrl(id: string, autoplay = false): string {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
  if (autoplay) params.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/** Still frame, used as the click-to-play facade. */
export function youTubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** The canonical watch page, for an explicit "open on YouTube" link. */
export const youTubeWatchUrl = (id: string): string => `https://www.youtube.com/watch?v=${id}`;

/**
 * Does this video actually exist?
 *
 * There is no free, key-less, CORS-enabled way to ask YouTube directly:
 * `/oembed` answers correctly but sends no `Access-Control-Allow-Origin`, so a
 * browser cannot read the reply.
 *
 * The thumbnail can, though. `i.ytimg.com/vi/<id>/hqdefault.jpg` returns
 * 480x360 for a real video and a **120x90 grey placeholder** for one that does
 * not exist — and an <img> exposes `naturalWidth` without any CORS header at
 * all. Measuring the picture is therefore the whole check.
 *
 * This exists because eight fabricated video ids once shipped as the site's
 * default content. Every one of them rendered a play button that did nothing,
 * and the failure looked like a copyright block rather than a made-up id.
 */
export type VideoProbe = 'ok' | 'missing' | 'unknown';

const PLACEHOLDER_MAX_WIDTH = 121;

export function probeYouTubeVideo(id: string, timeoutMs = 6000): Promise<VideoProbe> {
  return new Promise((resolve) => {
    if (!ID.test(id)) {
      resolve('missing');
      return;
    }

    const img = new Image();
    let settled = false;
    const finish = (result: VideoProbe) => {
      if (settled) return;
      settled = true;
      img.onload = null;
      img.onerror = null;
      resolve(result);
    };

    // A slow network is not an answer, and blocking a save on one would stop an
    // administrator adding a perfectly good video from a bad connection.
    const timer = window.setTimeout(() => finish('unknown'), timeoutMs);

    img.onload = () => {
      window.clearTimeout(timer);
      finish(img.naturalWidth > PLACEHOLDER_MAX_WIDTH ? 'ok' : 'missing');
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish('unknown');
    };

    img.src = youTubeThumbnail(id);
  });
}
