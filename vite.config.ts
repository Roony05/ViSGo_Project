import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import {
  ragChatEndpoint,
  translateEndpoint,
  statusEndpoint,
  hostAssistEndpoint,
  isGeminiConfigured,
} from './server/gemini';
import { panoramaEndpoint } from './server/panorama';
import { bookingDeliveryEndpoint } from './server/workspace';

/**
 * Mounts the ViS-Go AI endpoints on both the dev server and the preview server.
 *
 * The previous version only registered `configureServer`, so every Gemini
 * feature silently died as soon as the app was built and served for real.
 */
function visGoApiPlugin(): Plugin {
  const mount = (server: { middlewares: { use: (path: string, fn: never) => void } }) => {
    server.middlewares.use('/api/rag-chat', ragChatEndpoint as never);
    server.middlewares.use('/api/translate', translateEndpoint as never);
    server.middlewares.use('/api/host-assist', hostAssistEndpoint as never);
    server.middlewares.use('/api/booking-delivery', bookingDeliveryEndpoint as never);
    server.middlewares.use('/api/status', statusEndpoint as never);
    server.middlewares.use('/api/panorama', panoramaEndpoint as never);
  };

  return {
    name: 'visgo-api',
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_-prefixed vars to the client. The server-side
  // handlers read process.env directly, so load the full .env into it here —
  // without this, GEMINI_API_KEY was never visible and the AI always fell back.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  /*
   * Cost gate, enforced at BUILD time rather than at runtime.
   *
   * Vite inlines `import.meta.env.VITE_*` as string literals during the build,
   * so a Maps key checked only in application code still ends up baked into the
   * shipped JavaScript. Anyone could then lift it out of the bundle and spend
   * against the card behind it. Blanking it here means the key never reaches
   * the output at all unless paid APIs were explicitly enabled.
   */
  const allowPaidApis = (env.VITE_ALLOW_PAID_APIS ?? '').trim().toLowerCase() === 'true';
  const mapsKey = (env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

  if (mapsKey && !allowPaidApis) {
    console.warn(
      '\n  [ViS-Go] A Google Maps API key was found but VITE_ALLOW_PAID_APIS is not\n' +
        '           "true", so it has been stripped from the bundle. The map runs on\n' +
        '           free Leaflet + OpenStreetMap. Google Maps billing requires a\n' +
        '           credit card — set the flag only if you accept that.\n'
    );
  }

  if (!isGeminiConfigured()) {
    console.warn(
      '\n  [ViS-Go] GEMINI_API_KEY is not set — the AI assistant and Smart Translate\n' +
        '           will use the offline fallback engine. Copy .env.example to .env\n' +
        '           and paste a free key from https://aistudio.google.com/apikey\n'
    );
  }

  return {
    plugins: [react(), tailwindcss(), visGoApiPlugin()],
    define: {
      // Overrides Vite's own env inlining, so the literal never appears in dist/.
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(allowPaidApis ? mapsKey : ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Leaflet, jsPDF and the Google SDKs are heavy and rarely change; keeping
      // them out of the app chunk stops the 1MB single-bundle warning.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            maps: ['leaflet'],
            pdf: ['jspdf'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
