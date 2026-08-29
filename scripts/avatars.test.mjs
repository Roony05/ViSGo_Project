/**
 * Proves the avatar split against the REAL project: pictures live in
 * `avatars/{uid}`, everything else may only carry a reference to one, and the
 * rules refuse to let an image creep back into a collection the app reads
 * whole.
 *
 *     node scripts/avatars.test.mjs
 *
 * Same trade as scripts/e2e-live.mjs — the Firestore emulator needs a JVM this
 * machine does not have, so this runs live through the web SDK. It creates two
 * throwaway @visgo-test.dev accounts and deletes everything it wrote.
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const STAMP = Date.now();
const PW = 'visgo-e2e-' + STAMP;
let pass = 0, fail = 0;
const created = { uids: [], docs: [] };

const ok = async (name, fn) => {
  try { await fn(); console.log('  PASS  ' + name); pass++; }
  catch (e) { console.log('  FAIL  ' + name + '\n          -> ' + String(e?.message || e).slice(0, 180)); fail++; }
};
const denied = async (name, fn) => {
  try { await fn(); console.log('  FAIL  ' + name + '\n          -> khong bi tu choi (LO HONG)'); fail++; }
  catch (e) {
    const c = e?.code || '';
    if (c.includes('permission-denied')) { console.log('  PASS  ' + name); pass++; }
    else { console.log('  FAIL  ' + name + '\n          -> tu choi vi ly do khac: ' + c); fail++; }
  }
};
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: ky vong ${b}, nhan ${a}`); };

const ctx = (name) => { const app = initializeApp(cfg, name); return { auth: getAuth(app), db: getFirestore(app) }; };
const A = ctx('a'), B = ctx('b'), ANON = ctx('anon');

/** A 1x1 JPEG, then padded to the size of a real uploaded photo. */
const TINY_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
const BIG_IMAGE = TINY_JPEG + 'A'.repeat(34_000);

console.log('\n=== avatars: tach anh ra khoi ho so ===\n');

const emailA = `e2e.av.a.${STAMP}@visgo-test.dev`;
const emailB = `e2e.av.b.${STAMP}@visgo-test.dev`;
let uidA, uidB;

await ok('tao hai tai khoan thu nghiem', async () => {
  const a = await createUserWithEmailAndPassword(A.auth, emailA, PW);
  const b = await createUserWithEmailAndPassword(B.auth, emailB, PW);
  uidA = a.user.uid; uidB = b.user.uid;
  created.uids.push(uidA, uidB);
  const base = (uid, email) => ({
    id: uid, name: 'E2E Avatar', email, role: 'customer', phone: '',
    avatar: '', verified: false, rating: 0, reviewCount: 0,
    totalEarnings: 0, completedTours: 0, isAcceptingGuests: false,
  });
  await setDoc(doc(A.db, 'profiles', uidA), base(uidA, emailA));
  await setDoc(doc(B.db, 'profiles', uidB), base(uidB, emailB));
  created.docs.push(['profiles', uidA], ['profiles', uidB]);
});

await ok('chu tai khoan luu duoc anh vao avatars/{uid}', async () => {
  await setDoc(doc(A.db, 'avatars', uidA), { id: uidA, dataUrl: BIG_IMAGE, version: 'v1' });
  created.docs.push(['avatars', uidA]);
  const snap = await getDoc(doc(A.db, 'avatars', uidA));
  eq(snap.data().dataUrl.length, BIG_IMAGE.length, 'do dai anh');
});

await ok('ho so chi giu tham chieu ~50 byte', async () => {
  const ref = `avatar:${uidA}:v1`;
  await updateDoc(doc(A.db, 'profiles', uidA), { avatar: ref });
  const snap = await getDoc(doc(A.db, 'profiles', uidA));
  eq(snap.data().avatar, ref, 'truong avatar');
  if (JSON.stringify(snap.data()).length > 1000) throw new Error('ho so van con nang');
});

await ok('KHACH VANG LAI (chua dang nhap) doc duoc anh', async () => {
  const snap = await getDoc(doc(ANON.db, 'avatars', uidA));
  if (!snap.exists()) throw new Error('khong doc duoc');
  eq(snap.data().version, 'v1', 'version');
});

await denied('NGUOI KHAC khong ghi de duoc anh cua nguoi ta', async () => {
  await setDoc(doc(B.db, 'avatars', uidA), { id: uidA, dataUrl: TINY_JPEG, version: 'hack' });
});

await denied('KHACH VANG LAI khong ghi duoc anh', async () => {
  await setDoc(doc(ANON.db, 'avatars', uidA), { id: uidA, dataUrl: TINY_JPEG, version: 'hack' });
});

await denied('KHONG nhet duoc anh 34 KB tro lai vao ho so', async () => {
  await updateDoc(doc(A.db, 'profiles', uidA), { avatar: BIG_IMAGE });
});

await denied('KHONG nhet duoc anh vao hostAvatar cua tour', async () => {
  await setDoc(doc(A.db, 'tours', `e2e_av_${STAMP}`), {
    id: `e2e_av_${STAMP}`, hostId: uidA, hostName: 'E2E', hostAvatar: BIG_IMAGE,
    title: 'E2E test tour', city: 'Hà Nội', status: 'draft',
  });
});

await ok('van dang duoc tour khi hostAvatar la tham chieu', async () => {
  const id = `e2e_av_ok_${STAMP}`;
  await setDoc(doc(A.db, 'tours', id), {
    id, hostId: uidA, hostName: 'E2E', hostAvatar: `avatar:${uidA}:v1`,
    title: 'E2E test tour', city: 'Hà Nội', status: 'draft',
  });
  created.docs.push(['tours', id]);
  const snap = await getDoc(doc(A.db, 'tours', id));
  eq(snap.data().hostAvatar, `avatar:${uidA}:v1`, 'hostAvatar');
});

await ok('anh URL http binh thuong van luu duoc vao ho so', async () => {
  const url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  await updateDoc(doc(A.db, 'profiles', uidA), { avatar: url });
  eq((await getDoc(doc(A.db, 'profiles', uidA))).data().avatar, url, 'avatar URL');
});

/* ---- cleanup ---------------------------------------------------- */
const KEY = ['serviceAccount.json', 'service-account.json'].find((p) => existsSync(p));
if (KEY) {
  const { cert, initializeApp: initAdmin } = await import('firebase-admin/app');
  const { getFirestore: adminDb } = await import('firebase-admin/firestore');
  const { getAuth: adminAuth } = await import('firebase-admin/auth');
  initAdmin({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) });
  for (const [c, id] of created.docs) await adminDb().collection(c).doc(id).delete();
  for (const uid of created.uids) await adminAuth().deleteUser(uid).catch(() => {});
  console.log(`\nda don ${created.docs.length} document va ${created.uids.length} tai khoan.`);
} else {
  console.log('\nKHONG co serviceAccount.json — con lai rac test trong project.');
}

console.log(`\n================  ${pass} PASS / ${fail} FAIL  ================\n`);
process.exit(fail ? 1 : 0);
