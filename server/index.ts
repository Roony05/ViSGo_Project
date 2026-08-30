/**
 * ViS-Go production server.
 *
 * Serves the built SPA from ./dist and exposes the same /api endpoints the
 * Vite dev server provides, so the Gemini features keep working after
 * `npm run build`. The Gemini API key stays on this process and is never
 * shipped to the browser bundle.
 *
 *   npm run build && npm start
 */

import 'dotenv/config';
import compression from 'compression';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ragChatEndpoint,
  translateEndpoint,
  statusEndpoint,
  hostAssistEndpoint,
  isGeminiConfigured,
} from './gemini.js';
import { panoramaEndpoint } from './panorama.js';
import { bookingDeliveryEndpoint } from './workspace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const servesStatic = fs.existsSync(path.join(distDir, 'index.html'));

const app = express();
const port = Number(process.env.PORT) || 3000;

/*
  Compress before sending.

  On Cloud Run this is the single largest cost lever the app has. Outbound
  internet transfer is free for only 1 GiB a month (and that allowance is
  counted in North America), while a Vite bundle gzips to roughly a third of
  its size. One line, and the egress bill divides by three.

  It sits above the API routes as well as the static files: a RAG answer with
  the catalogue quoted back is several KB of text, which compresses just as well
  as JavaScript does.
*/
app.use(compression());

// The endpoints parse their own body, so no express.json() here.
app.post('/api/rag-chat', ragChatEndpoint);
app.post('/api/translate', translateEndpoint);
app.post('/api/host-assist', hostAssistEndpoint);
app.post('/api/booking-delivery', bookingDeliveryEndpoint);
app.get('/api/status', statusEndpoint);
app.get('/api/panorama', panoramaEndpoint);

if (servesStatic) {
  /*
    Vite fingerprints every filename under assets/, so a year of caching is
    safe there — a new build changes the name and busts it by itself.
    index.html is the exact opposite: caching it is the reliable way to serve
    a visitor the previous deploy's asset list forever.

    Besides being faster, this is money. A judge who opens the page a second
    time does not download the bundle a second time.
  */
  app.use(
    express.static(distDir, {
      maxAge: '1y',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.status(404).json({ error: 'This deployment serves /api only.' });
  });
}

app.listen(port, () => {
  console.log(`\n  ViS-Go  ➜  http://localhost:${port}`);
  console.log(`  Mode    ➜  ${servesStatic ? 'SPA + API' : 'API only'}`);
  console.log(
    `  Gemini  ➜  ${
      isGeminiConfigured()
        ? 'configured ✓'
        : 'NOT configured — AI falls back to the local RAG engine. Set GEMINI_API_KEY in .env'
    }\n`
  );
});
