/**
 * Local intro videos: public to read, administrators only to write.
 *
 *     npm run test:videos
 *
 * These play on the Explore page for every visitor, which is exactly why an
 * ordinary host must not be able to put one there. Runs live, same trade as
 * scripts/e2e-live.mjs, and cleans up after itself.
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { deleteDoc, doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const STAMP = Date.now();
const PW = 'visgo-e2e-' + STAMP;
const VID = `e2e_vid_${STAMP}`;
let pass = 0, fail = 0;
const created = { uids: [], docs: [] };

const ok = async (n, f) => { try { await f(); console.log('  PASS  ' + n); pass++; }
  catch (e) { console.log('  FAIL  ' + n + '\n          -> ' + String(e?.message || e).slice(0, 170)); fail++; } };
const denied = async (n, f) => { try { await f(); console.log('  FAIL  ' + n + '\n          -> khong bi tu choi (LO HONG)'); fail++; }
  catch (e) { const c = e?.code || '';
    if (c.includes('permission-denied')) { console.log('  PASS  ' + n); pass++; }
    else { console.log('  FAIL  ' + n + '\n          -> tu choi vi ly do khac: ' + c); fail++; } } };
const eq = (a, b, w) => { if (a !== b) throw new Error(`${w}: ky vong ${b}, nhan ${a}`); };

const ctx = (n) => { const app = initializeApp(cfg, n); return { auth: getAuth(app), db: getFirestore(app) }; };
const ADMIN = ctx('admin'), HOST = ctx('host'), ANON = ctx('anon');

const video = (over = {}) => ({
  id: VID, city: 'Hà Nội', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Hanoi on film', titleVi: 'Hà Nội qua ống kính',
  order: 0, active: true, createdAt: '2026-08-28', ...over,
});

console.log('\n=== videos: chi admin duoc dang ===\n');

await ok('dang nhap ADMIN da seed', async () => {
  const c = await signInWithEmailAndPassword(ADMIN.auth, 'admin@visgo.vn', process.env.SEED_ADMIN_PASSWORD);
  if (!c.user.uid) throw new Error('khong co uid');
});

await ok('tao mot HOST thuong', async () => {
  const email = `e2e.vid.host.${STAMP}@visgo-test.dev`;
  const h = await createUserWithEmailAndPassword(HOST.auth, email, PW);
  created.uids.push(h.user.uid);
  await setDoc(doc(HOST.db, 'profiles', h.user.uid), {
    id: h.user.uid, name: 'E2E Video Host', email, role: 'host', phone: '', avatar: '',
    verified: false, rating: 0, reviewCount: 0, totalEarnings: 0, completedTours: 0, isAcceptingGuests: true,
  });
  created.docs.push(['profiles', h.user.uid]);
});

await denied('HOST thuong KHONG dang duoc video', async () => {
  await setDoc(doc(HOST.db, 'videos', VID), video());
});

await denied('KHACH VANG LAI KHONG dang duoc video', async () => {
  await setDoc(doc(ANON.db, 'videos', VID), video());
});

await denied('ADMIN khong dang duoc video thieu url', async () => {
  await setDoc(doc(ADMIN.db, 'videos', VID), video({ url: '' }));
});

await ok('ADMIN dang duoc video', async () => {
  await setDoc(doc(ADMIN.db, 'videos', VID), video());
  created.docs.push(['videos', VID]);
  eq((await getDoc(doc(ADMIN.db, 'videos', VID))).data().city, 'Hà Nội', 'city');
});

await ok('KHACH VANG LAI doc duoc video', async () => {
  const snap = await getDoc(doc(ANON.db, 'videos', VID));
  if (!snap.exists()) throw new Error('khong doc duoc');
  eq(snap.data().titleVi, 'Hà Nội qua ống kính', 'titleVi');
});

await denied('HOST thuong KHONG sua duoc video', async () => {
  await updateDoc(doc(HOST.db, 'videos', VID), { titleVi: 'bi sua' });
});

await denied('HOST thuong KHONG xoa duoc video', async () => {
  await deleteDoc(doc(HOST.db, 'videos', VID));
});

await ok('ADMIN an duoc video (active=false)', async () => {
  await updateDoc(doc(ADMIN.db, 'videos', VID), { ...video(), active: false });
  eq((await getDoc(doc(ADMIN.db, 'videos', VID))).data().active, false, 'active');
});

await ok('ADMIN xoa duoc video', async () => {
  await deleteDoc(doc(ADMIN.db, 'videos', VID));
  eq((await getDoc(doc(ADMIN.db, 'videos', VID))).exists(), false, 'da xoa');
  created.docs = created.docs.filter(([c]) => c !== 'videos');
});

const KEY = ['serviceAccount.json', 'service-account.json'].find((p) => existsSync(p));
if (KEY) {
  const { cert, initializeApp: initAdmin } = await import('firebase-admin/app');
  const { getFirestore: adb } = await import('firebase-admin/firestore');
  const { getAuth: aauth } = await import('firebase-admin/auth');
  initAdmin({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) });
  for (const [c, id] of created.docs) await adb().collection(c).doc(id).delete();
  for (const uid of created.uids) await aauth().deleteUser(uid).catch(() => {});
  console.log(`\nda don ${created.docs.length} document va ${created.uids.length} tai khoan.`);
}

console.log(`\n================  ${pass} PASS / ${fail} FAIL  ================\n`);
process.exit(fail ? 1 : 0);
