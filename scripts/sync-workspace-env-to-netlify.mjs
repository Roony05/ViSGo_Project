/**
 * Upload only the five allowlisted Workspace delivery variables from .env.
 * Values are never printed and every variable is marked as a production secret.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const keys = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_WEB_API_KEY',
  'GOOGLE_WORKSPACE_CLIENT_ID',
  'GOOGLE_WORKSPACE_CLIENT_SECRET',
  'GOOGLE_WORKSPACE_REFRESH_TOKEN',
];

const values = new Map();
for (const key of keys) {
  const value = process.env[key]?.trim() ?? '';
  if (!value || value.startsWith('your_') || value.includes('giá_trị_')) {
    throw new Error(`${key} is missing or still contains a placeholder; nothing was uploaded.`);
  }
  values.set(key, value);
}

if (values.get('FIREBASE_PROJECT_ID') !== 'visgo-project') {
  throw new Error('FIREBASE_PROJECT_ID must be visgo-project; nothing was uploaded.');
}

for (const [key, value] of values) {
  const netlifyCli = process.env.NETLIFY_CLI_ENTRY?.trim();
  const result = spawnSync(
    netlifyCli ? process.execPath : 'npx',
    netlifyCli
      ? [netlifyCli, 'env:set', key, value, '--secret', '--context', 'production']
      : ['--yes', 'netlify', 'env:set', key, value, '--secret', '--context', 'production'],
    { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (result.status !== 0) {
    throw new Error(`Netlify rejected ${key}; its value was not printed.`);
  }
  console.log(`Uploaded ${key} as a production secret.`);
}

console.log(`Uploaded ${keys.length} allowlisted variables. No other .env values were read or uploaded.`);
