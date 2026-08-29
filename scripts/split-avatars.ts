/**
 * Moves profile pictures out of the documents that reference them.
 *
 *     npm run split:avatars -- --dry-run   # print the plan, touch nothing
 *     npm run split:avatars                # write it
 *
 * WHY
 *
 * Spark has no Cloud Storage, so an uploaded picture is a base64 data URL kept
 * inside Firestore. Stored on the profile, that is ~35 KB sitting in a
 * collection the app reads *whole* on every page load (`fetchUsers()`), and
 * copied again onto every tour, review and booking the person appears on —
 * collections that are also read whole.
 *
 * After this runs, the picture lives once in `avatars/{uid}` and everything
 * else holds a ~50-byte `avatar:<uid>:<version>` reference. The app resolves
 * those lazily and caches them per device: one read the first time a visitor
 * sees a given host, none afterwards.
 *
 * Idempotent. A document already holding a reference or an `https://` link is
 * left alone, so it is safe to re-run after new uploads.
 *
 * COST: none. This is the Admin SDK, a library rather than a service, and its
 * writes come out of the ordinary Spark free quota.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import 'dotenv/config';

const DRY_RUN = process.argv.includes('--dry-run');

/* ------------------------------------------------------------------ */
/* Credentials                                                         */
/* ------------------------------------------------------------------ */

const KEY_CANDIDATES = [
  process.env.FIREBASE_SERVICE_ACCOUNT,
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  'serviceAccount.json',
  'service-account.json',
].filter((p): p is string => typeof p === 'string' && p.length > 0);

interface ServiceAccountKey {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function loadServiceAccount(): { path: string; key: ServiceAccountKey } {
  for (const candidate of KEY_CANDIDATES) {
    const full = resolve(process.cwd(), candidate);
    if (!existsSync(full)) continue;
    const key = JSON.parse(readFileSync(full, 'utf8')) as ServiceAccountKey;
    if (!key.project_id || !key.client_email || !key.private_key) {
      throw new Error(`${full} is not a Firebase service account key.`);
    }
    return { path: full, key };
  }
  throw new Error(
    `No service account key found. Looked in: ${KEY_CANDIDATES.join(', ')}\n` +
      'See scripts/seed-firestore.ts for how to generate one (it is free).',
  );
}

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

const isInline = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:');
const makeRef = (uid: string, version: string): string => `avatar:${uid}:${version}`;

/**
 * Where a picture can be found besides the profile.
 *
 * `owner` is the field naming the account the face belongs to — that is what
 * makes the reference resolvable, and a copy whose owner cannot be identified
 * has to be left in place rather than pointed at the wrong person.
 */
const DENORMALISED: ReadonlyArray<{ collection: string; field: string; owner: string }> = [
  { collection: 'tours', field: 'hostAvatar', owner: 'hostId' },
  { collection: 'bookings', field: 'hostAvatar', owner: 'hostId' },
  { collection: 'reviews', field: 'userAvatar', owner: 'userId' },
];

const bytes = (n: number): string => `${(n / 1024).toFixed(1)} KB`;

async function main(): Promise<void> {
  const { path, key } = loadServiceAccount();
  const { cert, initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  initializeApp({ credential: cert(key as Record<string, string>) });
  const db = getFirestore();

  console.log(`Project : ${key.project_id}`);
  console.log(`Key     : ${path}`);
  console.log(DRY_RUN ? 'Mode    : DRY RUN — nothing will be written\n' : 'Mode    : WRITING\n');

  /* 1. The pictures themselves, from the profiles that hold them. ---- */

  // uid -> the version now stored in avatars/{uid}, so the sweep below can
  // build a reference without re-reading the collection.
  const versions = new Map<string, string>();
  let saved = 0;

  const profiles = await db.collection('profiles').get();
  for (const snap of profiles.docs) {
    const avatar: unknown = snap.get('avatar');

    // Already split by an earlier run, or by the app.
    if (typeof avatar === 'string' && avatar.startsWith('avatar:')) {
      const [uid, version = ''] = avatar.slice('avatar:'.length).split(':');
      if (uid) versions.set(uid, version);
      continue;
    }
    if (!isInline(avatar)) continue;

    const version = Date.now().toString(36);
    versions.set(snap.id, version);
    saved += avatar.length;

    console.log(`profiles/${snap.id}  ${bytes(avatar.length)} -> avatars/${snap.id}`);
    if (!DRY_RUN) {
      await db.collection('avatars').doc(snap.id).set({ id: snap.id, dataUrl: avatar, version });
      await db.collection('profiles').doc(snap.id).update({ avatar: makeRef(snap.id, version) });
    }
  }

  /* 2. The copies scattered across the other collections. ------------ */

  for (const { collection, field, owner } of DENORMALISED) {
    const rows = await db.collection(collection).get();
    for (const snap of rows.docs) {
      const value: unknown = snap.get(field);
      if (!isInline(value)) continue;

      const uid = snap.get(owner) as unknown;
      if (typeof uid !== 'string' || !uid) {
        console.warn(`SKIP ${collection}/${snap.id}: ${field} is inline but ${owner} is missing`);
        continue;
      }

      let version = versions.get(uid);
      if (!version) {
        // The copy outlived the profile it came from — keep the picture rather
        // than throw it away, and make it the canonical one for that uid.
        version = Date.now().toString(36);
        versions.set(uid, version);
        console.log(`${collection}/${snap.id}  ${bytes(value.length)} -> avatars/${uid} (recovered)`);
        if (!DRY_RUN) {
          await db.collection('avatars').doc(uid).set({ id: uid, dataUrl: value, version });
        }
      } else {
        console.log(`${collection}/${snap.id}  ${bytes(value.length)} -> reference`);
      }

      saved += value.length;
      if (!DRY_RUN) await db.collection(collection).doc(snap.id).update({ [field]: makeRef(uid, version) });
    }
  }

  console.log(
    `\n${versions.size} picture(s) in avatars/. About ${bytes(saved)} no longer travels with the ` +
      'documents the app reads whole.',
  );
  if (DRY_RUN) console.log('Nothing was written. Re-run without --dry-run to apply.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
