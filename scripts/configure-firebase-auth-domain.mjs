/**
 * Safely append the production hostname to Firebase Auth authorized domains.
 * Read-only by default; pass --apply to persist the one-field update.
 */
import { existsSync, readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const TARGET_DOMAIN = 'vis-go-ai-riser.netlify.app';
const keyPath = ['serviceAccount.json', 'service-account.json'].find(existsSync);

if (!keyPath) {
  throw new Error('Missing serviceAccount.json; no Firebase configuration was changed.');
}

const credentials = JSON.parse(readFileSync(keyPath, 'utf8'));
const projectId = credentials.project_id;
if (projectId !== 'visgo-project') {
  throw new Error(`Refusing to update unexpected Firebase project: ${projectId || '(missing)'}`);
}

const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
const current = await client.request({ url });
const domains = Array.isArray(current.data.authorizedDomains)
  ? current.data.authorizedDomains
  : [];

if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ projectId, authorizedDomains: domains, changed: false }, null, 2));
  process.exit(0);
}

if (domains.includes(TARGET_DOMAIN)) {
  console.log(JSON.stringify({ projectId, authorizedDomains: domains, changed: false }, null, 2));
  process.exit(0);
}

const next = [...domains, TARGET_DOMAIN];
const updated = await client.request({
  url: `${url}?updateMask=authorizedDomains`,
  method: 'PATCH',
  data: { authorizedDomains: next },
});

console.log(JSON.stringify({
  projectId,
  authorizedDomains: updated.data.authorizedDomains,
  changed: true,
}, null, 2));
