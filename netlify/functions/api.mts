/**
 * The /api surface, as a Netlify Function.
 *
 * The handlers in `server/` are deliberately framework-agnostic: they take a
 * Node-shaped request and response and never touch Express. That is what makes
 * them reusable in four places — the Vite dev server, `vite preview`, the
 * Express production server, and here.
 *
 * Netlify's v2 runtime speaks the Web platform (`Request`/`Response`), so the
 * only thing missing is a shim in each direction. Everything below is that
 * shim; no endpoint logic lives here, and no secret does either — the keys are
 * read from the environment by the handlers themselves.
 */

import {
  ragChatEndpoint,
  translateEndpoint,
  statusEndpoint,
  hostAssistEndpoint,
} from '../../server/gemini';
import { panoramaEndpoint } from '../../server/panorama';

/** Netlify routes these paths straight to this function. */
export const config = { path: '/api/*' };

type Handler = (req: NodeishReq, res: NodeishRes) => void | Promise<void>;

interface NodeishReq {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  on(event: 'data', cb: (chunk: Buffer | string) => void): void;
  on(event: 'end', cb: () => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
}

interface NodeishRes {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

const ROUTES: Record<string, Handler> = {
  '/api/rag-chat': ragChatEndpoint as Handler,
  '/api/translate': translateEndpoint as Handler,
  '/api/host-assist': hostAssistEndpoint as Handler,
  '/api/status': statusEndpoint as Handler,
  '/api/panorama': panoramaEndpoint as Handler,
};

/**
 * Presents an already-read body as the `data`/`end` stream the handlers expect.
 *
 * The body is read to a string first because a Netlify request cannot be
 * consumed lazily the way an incoming Node socket can, and the handlers cap
 * their own payload size while reading — a cap that still applies, since it is
 * enforced on the chunk they receive.
 */
function toNodeishReq(request: Request, body: string): NodeishReq {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    method: request.method,
    // The handlers parse this with `new URL(url, 'http://localhost')`, so a
    // path plus query is all they need — and all they should be given.
    url: new URL(request.url).pathname + new URL(request.url).search,
    headers,
    socket: {
      // Netlify terminates TLS upstream, so the caller's address only survives
      // in this header. The rate limiter buckets by it.
      remoteAddress: headers['x-nf-client-connection-ip'] ?? headers['x-forwarded-for']?.split(',')[0]?.trim(),
    },
    on(event: string, cb: (arg?: never) => void) {
      // 'error' never fires: there is no stream left to fail by this point.
      if (event === 'data' && body) (cb as (chunk: string) => void)(body);
      if (event === 'end') (cb as () => void)();
    },
  } as NodeishReq;
}

export default async (request: Request): Promise<Response> => {
  const path = new URL(request.url).pathname;
  const handler = ROUTES[path];

  if (!handler) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = request.method === 'POST' ? await request.text() : '';

  // The handlers call end() exactly once, so the promise settles on that call.
  return new Promise<Response>((resolve) => {
    const headers: Record<string, string> = {};
    let settled = false;

    const res: NodeishRes = {
      statusCode: 200,
      setHeader(name, value) {
        headers[name] = value;
      },
      end(chunk) {
        if (settled) return;
        settled = true;
        resolve(new Response(chunk ?? '', { status: res.statusCode, headers }));
      },
    };

    Promise.resolve(handler(toNodeishReq(request, body), res)).catch((err: unknown) => {
      if (settled) return;
      settled = true;
      // 200 on purpose, matching the handlers' own error contract: the client
      // degrades to its offline engine rather than showing a network failure.
      resolve(
        new Response(
          JSON.stringify({
            ok: false,
            text: null,
            fallbackReason: 'GENERATION_ERROR',
            error: err instanceof Error ? err.message : String(err),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
  });
};
