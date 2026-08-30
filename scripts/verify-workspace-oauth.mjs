/** Verify the local Workspace refresh token without printing or using it to write data. */
import 'dotenv/config';

const required = [
  'GOOGLE_WORKSPACE_CLIENT_ID',
  'GOOGLE_WORKSPACE_CLIENT_SECRET',
  'GOOGLE_WORKSPACE_REFRESH_TOKEN',
];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`${key} is missing.`);
}

const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_WORKSPACE_CLIENT_ID.trim(),
    client_secret: process.env.GOOGLE_WORKSPACE_CLIENT_SECRET.trim(),
    refresh_token: process.env.GOOGLE_WORKSPACE_REFRESH_TOKEN.trim(),
    grant_type: 'refresh_token',
  }),
});
if (!tokenResponse.ok) throw new Error(`Google rejected the refresh token (HTTP ${tokenResponse.status}).`);
const token = await tokenResponse.json();
if (!token.access_token) throw new Error('Google returned no access token.');

const infoResponse = await fetch(
  `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token.access_token)}`,
);
if (!infoResponse.ok) throw new Error(`Google token inspection failed (HTTP ${infoResponse.status}).`);
const info = await infoResponse.json();
const scopes = new Set(String(info.scope ?? '').split(/\s+/).filter(Boolean));
const expected = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
];
const missing = expected.filter((scope) => !scopes.has(scope));
if (missing.length) throw new Error(`Refresh token is missing required scopes: ${missing.join(', ')}`);

console.log('Workspace OAuth is valid.');
console.log('Confirmed scope: gmail.send');
console.log('Confirmed scope: calendar.events');
console.log(`Access token lifetime reported by Google: ${Number(token.expires_in ?? 0)} seconds.`);
console.log('No email was sent and no calendar event was created.');
