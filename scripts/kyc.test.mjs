/**
 * Proves the host verification form's rules against the REAL project.
 *
 *     npm run test:kyc
 *
 * The form is five typed fields and a human reviewer. What must hold at the
 * database, regardless of what any client sends:
 *
 *   - a citizen ID number is exactly twelve digits;
 *   - a host may only file an application in their own name;
 *   - a host may correct and re-send a rejected one, but may never approve it;
 *   - only an administrator approves;
 *   - nobody else can read it.
 *
 * Same trade as scripts/e2e-live.mjs: the Firestore emulator needs a JVM this
 * machine does not have, so this runs live. It cleans up after itself.
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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

const ctx = (n) => { const app = initializeApp(cfg, n); return { auth: getAuth(app), db: getFirestore(app) }; };
const HOST = ctx('host'), OTHER = ctx('other'), ADMIN = ctx('admin'), ANON = ctx('anon');

const application = (hostId, over = {}) => ({
  id: `e2e_kyc_${STAMP}`,
  hostId,
  fullName: 'Phạm Đức Duy',
  cccdNumber: '001090012345',
  dateOfBirth: '1990-04-12',
  nationality: 'Việt Nam',
  address: 'Số 27, ngõ 12 phố Hàng Bún, phường Ba Đình, Hà Nội',
  submittedDate: '2026-08-28',
  status: 'pending',
  ...over,
});

console.log('\n=== kyc: form khai bao danh tinh ===\n');

const hostEmail = `e2e.kyc.host.${STAMP}@visgo-test.dev`;
const otherEmail = `e2e.kyc.other.${STAMP}@visgo-test.dev`;
let hostUid, otherUid;
const APP_ID = `e2e_kyc_${STAMP}`;

await ok('tao tai khoan host va nguoi la', async () => {
  const h = await createUserWithEmailAndPassword(HOST.auth, hostEmail, PW);
  const o = await createUserWithEmailAndPassword(OTHER.auth, otherEmail, PW);
  hostUid = h.user.uid; otherUid = o.user.uid;
  created.uids.push(hostUid, otherUid);
  const profile = (uid, email) => ({
    id: uid, name: 'E2E KYC', email, role: 'host', phone: '', avatar: '',
    verified: false, rating: 0, reviewCount: 0, totalEarnings: 0,
    completedTours: 0, isAcceptingGuests: true,
  });
  await setDoc(doc(HOST.db, 'profiles', hostUid), profile(hostUid, hostEmail));
  await setDoc(doc(OTHER.db, 'profiles', otherUid), profile(otherUid, otherEmail));
  created.docs.push(['profiles', hostUid], ['profiles', otherUid]);
});

await ok('dang nhap ADMIN da seed', async () => {
  const c = await signInWithEmailAndPassword(ADMIN.auth, 'admin@visgo.vn', process.env.SEED_ADMIN_PASSWORD);
  if (!c.user.uid) throw new Error('khong co uid');
});

/* ---- so cccd phai du 12 chu so --------------------------------- */

await denied('CCCD 11 chu so bi tu choi', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid, { cccdNumber: '00109001234' }));
});

await denied('CCCD 13 chu so bi tu choi', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid, { cccdNumber: '0010900123456' }));
});

await denied('CCCD co chu cai bi tu choi', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid, { cccdNumber: '00109001234A' }));
});

await denied('CCCD la so (khong phai chuoi) bi tu choi', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid, { cccdNumber: 1090012345 }));
});

await denied('ho ten rong bi tu choi', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid, { fullName: '' }));
});

await denied('dia chi rong bi tu choi', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid, { address: '' }));
});

await denied('quoc tich rong bi tu choi', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid, { nationality: '' }));
});

/* ---- ai duoc nop ------------------------------------------------ */

await denied('KHONG nop ho duoc cho nguoi khac', async () => {
  await setDoc(doc(OTHER.db, 'kyc', APP_ID), application(hostUid));
});

await denied('KHONG tu duyet duoc ngay luc nop', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid, { status: 'approved' }));
});

await ok('HOST nop duoc ho so cua chinh minh', async () => {
  await setDoc(doc(HOST.db, 'kyc', APP_ID), application(hostUid));
  created.docs.push(['kyc', APP_ID]);
  const snap = await getDoc(doc(HOST.db, 'kyc', APP_ID));
  eq(snap.data().cccdNumber, '001090012345', 'cccdNumber');
  eq(snap.data().status, 'pending', 'status');
});

/* ---- ai duoc doc ------------------------------------------------ */

await denied('NGUOI LA khong doc duoc ho so', async () => {
  await getDoc(doc(OTHER.db, 'kyc', APP_ID));
});

await denied('KHACH VANG LAI khong doc duoc ho so', async () => {
  await getDoc(doc(ANON.db, 'kyc', APP_ID));
});

await ok('ADMIN doc duoc ho so', async () => {
  const snap = await getDoc(doc(ADMIN.db, 'kyc', APP_ID));
  eq(snap.data().fullName, 'Phạm Đức Duy', 'fullName');
});

/* ---- sua lai va duyet ------------------------------------------- */

await ok('HOST sua lai duoc ho so cua minh (van pending)', async () => {
  await updateDoc(doc(HOST.db, 'kyc', APP_ID), { ...application(hostUid), address: 'Địa chỉ mới, Hà Nội' });
  eq((await getDoc(doc(HOST.db, 'kyc', APP_ID))).data().address, 'Địa chỉ mới, Hà Nội', 'address');
});

await denied('HOST KHONG tu duyet duoc ho so cua minh', async () => {
  await updateDoc(doc(HOST.db, 'kyc', APP_ID), { ...application(hostUid), status: 'approved' });
});

await denied('NGUOI LA khong sua duoc ho so cua nguoi ta', async () => {
  await updateDoc(doc(OTHER.db, 'kyc', APP_ID), { ...application(hostUid), fullName: 'Nguoi La' });
});

await ok('ADMIN duyet duoc', async () => {
  await updateDoc(doc(ADMIN.db, 'kyc', APP_ID), { status: 'approved' });
  eq((await getDoc(doc(ADMIN.db, 'kyc', APP_ID))).data().status, 'approved', 'status');
});

/* ---- cleanup ---------------------------------------------------- */
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
