/**
 * Moves the ViS-Go demo dataset out of `src/data/mockData.ts` and into the real
 * Firebase project: Authentication accounts you can actually sign in to, plus
 * the tours, reviews, bookings and verification applications behind them.
 *
 * Run it once after `firebase deploy`, and again any time the fixtures change.
 * It is idempotent — every write is a merge keyed by document id, and accounts
 * that already exist are updated rather than duplicated.
 *
 *     npm run seed -- --dry-run     # print the plan, touch nothing
 *     npm run seed                  # write it
 *
 * WHY THE ADMIN SDK, AND NOT THE ORDINARY WEB SDK
 *
 * Two things only a privileged caller can do, and both are needed here:
 *
 *   1. CHOOSE THE UID. `createUser({ uid })` lets a seeded account keep the id
 *      the fixtures already use, so `tour.hostId === 'user_host_1'` stays true
 *      once it is in Firestore. Signing up through the web SDK would mint a
 *      random uid and every cross-reference in the dataset would have to be
 *      rewritten — a migration step that can silently half-apply.
 *
 *   2. WRITE ROWS NOBODY OWNS. firestore.rules deliberately refuse a review
 *      written on someone else's behalf, a verification application that starts out
 *      already approved, and a profile that hands itself the `verified` badge
 *      or the `admin` role. Those refusals are correct for the app; the seeder
 *      is the one legitimate exception, and the Admin SDK is how Firebase
 *      expresses "this caller is the project, not a user".
 *
 * COST: none. `firebase-admin` is a library, not a service. Everything it
 * writes here counts against the ordinary Spark free quota (20k writes/day);
 * this seed spends about 30 of them. No billing account is involved.
 *
 * The service account key is a real secret — it bypasses every security rule.
 * It stays out of git (see .gitignore), out of `.env`, and out of the bundle:
 * nothing under `src/` may ever import this file.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import 'dotenv/config';

import {
  INITIAL_BOOKINGS,
  INITIAL_HOST_KYC,
  INITIAL_LOCAL_VIDEOS,
  INITIAL_REVIEWS,
  INITIAL_TOURS,
  INITIAL_USERS,
} from '../seed/fixtures.js';
import type { User } from '../src/types/index.js';

const DRY_RUN = process.argv.includes('--dry-run');
const PRUNE = process.argv.includes('--prune');

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
      throw new Error(`${full} is not a Firebase service account key (missing project_id/client_email/private_key).`);
    }
    return { path: full, key };
  }

  throw new Error(
    [
      'No service account key found.',
      '',
      'Firebase Console -> the gear icon -> Project settings -> Service accounts',
      '  -> "Generate new private key" -> Generate key',
      '',
      'Save the downloaded file as serviceAccount.json in the project root.',
      'It is already in .gitignore. Generating it is free and does not require',
      'a billing account.',
      '',
      `Looked in: ${KEY_CANDIDATES.join(', ')}`,
    ].join('\n'),
  );
}

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

/**
 * Passwords come from the environment, never from the fixtures.
 *
 * `mockData.ts` does carry a `password` on each demo user, but that file is
 * imported by the app and therefore ends up in the JavaScript bundle every
 * visitor downloads. Using those strings here would publish the credentials of
 * the live admin account. So the seeder insists on its own, out of `.env` —
 * which is git-ignored, has no VITE_ prefix, and so never reaches the browser.
 */
function passwordFor(role: User['role']): string {
  const raw = role === 'admin' ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_PASSWORD;
  const value = (raw ?? '').trim();
  if (value.length < 6) {
    throw new Error(
      [
        `Missing or too-short ${role === 'admin' ? 'SEED_ADMIN_PASSWORD' : 'SEED_PASSWORD'} in .env (Firebase Auth requires 6+ characters).`,
        '',
        'Add both, using values that appear nowhere in the source:',
        '  SEED_PASSWORD=...          # customer and host demo accounts',
        '  SEED_ADMIN_PASSWORD=...    # the admin account, keep this one separate',
      ].join('\n'),
    );
  }
  return value;
}

const seedAccounts = INITIAL_USERS.map((user) => ({
  uid: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  profile: user as unknown as Record<string, unknown>,
}));

const collections: Array<{ name: string; rows: Array<{ id: string }> }> = [
  { name: 'profiles', rows: seedAccounts.map((a) => ({ ...a.profile, id: a.uid }) as { id: string }) },
  { name: 'tours', rows: INITIAL_TOURS },
  { name: 'reviews', rows: INITIAL_REVIEWS },
  { name: 'bookings', rows: INITIAL_BOOKINGS },
  { name: 'kyc', rows: INITIAL_HOST_KYC },
  { name: 'videos', rows: INITIAL_LOCAL_VIDEOS },
];

function reportPlan(): void {
  console.log('Accounts');
  for (const a of seedAccounts) {
    let source = 'SEED_PASSWORD';
    try {
      passwordFor(a.role);
      source = a.role === 'admin' ? 'SEED_ADMIN_PASSWORD ok' : 'SEED_PASSWORD ok';
    } catch {
      source = a.role === 'admin' ? 'SEED_ADMIN_PASSWORD MISSING' : 'SEED_PASSWORD MISSING';
    }
    console.log(`  ${a.role.padEnd(8)} ${a.email.padEnd(24)} uid=${a.uid.padEnd(14)} ${source}`);
  }
  console.log('\nCollections');
  for (const c of collections) {
    console.log(`  ${c.name.padEnd(10)} ${String(c.rows.length).padStart(3)} documents`);
  }
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

async function seed(): Promise<void> {
  const { path: keyPath, key } = loadServiceAccount();

  // A key for the wrong project would seed a stranger's database and leave this
  // one empty, which is confusing rather than loud. Refuse instead.
  const expected = (process.env.VITE_FIREBASE_PROJECT_ID ?? '').trim();
  if (expected && key.project_id !== expected) {
    throw new Error(
      `Service account is for project "${key.project_id}", but .env points the app at "${expected}". Refusing to seed the wrong project.`,
    );
  }

  const { cert, initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');

  const app = initializeApp({ credential: cert(keyPath), projectId: key.project_id });
  const auth = getAuth(app);
  const db = getFirestore(app);
  // Our types use optional fields liberally and Firestore rejects `undefined`
  // outright; dropping those keys is what the app's own writer does too.
  db.settings({ ignoreUndefinedProperties: true });

  console.log(`Project : ${key.project_id}`);
  console.log(`Key     : ${keyPath}\n`);

  let created = 0;
  let updated = 0;

  for (const account of seedAccounts) {
    const password = passwordFor(account.role);

    try {
      await auth.getUser(account.uid);
      await auth.updateUser(account.uid, {
        email: account.email,
        password,
        displayName: account.name,
      });
      updated += 1;
      console.log(`  updated  ${account.email}`);
    } catch (err) {
      if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
      await auth.createUser({
        uid: account.uid,
        email: account.email,
        password,
        displayName: account.name,
        emailVerified: true,
      });
      created += 1;
      console.log(`  created  ${account.email}`);
    }
  }

  console.log('');

  for (const collection of collections) {
    // merge:true so a re-run refreshes the fixtures without discarding fields
    // real usage has since added to a document.
    const batch = db.batch();
    for (const row of collection.rows) {
      batch.set(db.collection(collection.name).doc(row.id), row, { merge: true });
    }
    await batch.commit();
    console.log(`  ${collection.name.padEnd(10)} ${String(collection.rows.length).padStart(3)} documents written`);
  }

  if (PRUNE) await pruneOrphanProfiles(auth, db);

  console.log(`\nDone. ${created} account(s) created, ${updated} updated.`);
  console.log('Sign in at the app with any of the emails above.');
}

/**
 * Deletes profile documents that no longer have an account behind them.
 *
 * Signing in creates a profile on first sight; deleting the account afterwards
 * — a test account, someone who asked to be removed — leaves that document
 * behind, because firestore.rules only let an admin delete a profile and there
 * is no admin in the browser doing housekeeping. So the sweep lives here.
 *
 * It keys off Firebase Auth, not off the fixtures: a profile is orphaned only
 * when `listUsers` has no account with that uid. Real travellers and hosts who
 * registered through the app are therefore never touched.
 */
async function pruneOrphanProfiles(
  auth: { listUsers(max: number, pageToken?: string): Promise<{ users: Array<{ uid: string }>; pageToken?: string }> },
  db: { collection(name: string): { get(): Promise<{ docs: Array<{ id: string; ref: unknown }> }>; doc(id: string): { delete(): Promise<unknown> } } },
): Promise<void> {
  const live = new Set<string>();
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) live.add(u.uid);
    pageToken = page.pageToken;
  } while (pageToken);

  const snap = await db.collection('profiles').get();
  const orphans = snap.docs.filter((d) => !live.has(d.id));

  if (orphans.length === 0) {
    console.log('\n  no orphaned profiles');
    return;
  }

  for (const orphan of orphans) {
    await db.collection('profiles').doc(orphan.id).delete();
    console.log(`  pruned   profiles/${orphan.id}`);
  }
}

/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  console.log(`ViS-Go seeder${DRY_RUN ? ' (dry run — nothing will be written)' : ''}\n`);
  reportPlan();
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run complete. Re-run without --dry-run to write.');
    return;
  }

  await seed();
}

main().catch((err: unknown) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
