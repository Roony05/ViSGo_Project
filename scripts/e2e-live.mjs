/**
 * End-to-end test of accounts, roles, tour publishing, reviews and chat —
 * against the REAL Firebase project, through the same web SDK the browser uses.
 *
 *     npm run test:e2e
 *
 * WHY NOT THE EMULATOR. `npm run test:rules` is the emulator suite and is the
 * better tool when it runs, but the Firestore emulator needs a JVM and this
 * machine has none. This file trades that for a live round trip, which also
 * covers things the emulator cannot: that Email/Password sign-in is actually
 * enabled in the console, that the seeded admin account really exists, and that
 * `onSnapshot` delivers a message from one client to another over the network.
 *
 * WHAT IT COSTS. About 90 reads and writes against the Spark free tier (50,000
 * reads and 20,000 writes a day), plus five throwaway Auth accounts. No billing
 * account is involved, so there is nothing here that can be charged for.
 *
 * WHAT IT LEAVES BEHIND. Nothing. Every account it creates uses an
 * @visgo-test.dev address and every document id starts with `e2e_`; the cleanup
 * at the bottom runs from a `finally`, so an assertion failure still tidies up.
 * It needs serviceAccount.json for that — the same key `npm run seed` uses.
 *
 * WHAT IT NEEDS IN .env: the four VITE_FIREBASE_* values, plus SEED_PASSWORD
 * and SEED_ADMIN_PASSWORD for the seeded demo accounts.
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, updateProfile,
} from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, onSnapshot,
  orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc,
} from 'firebase/firestore';

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const STAMP = Date.now();
const PW = 'visgo-e2e-' + STAMP;

let pass = 0, fail = 0;
const created = { uids: [], tours: [], reviews: [], convos: [] };

const ok = async (name, fn) => {
  try { await fn(); console.log('  PASS  ' + name); pass++; }
  catch (e) { console.log('  FAIL  ' + name + '\n          -> ' + String(e?.message || e).slice(0, 160)); fail++; }
};
const denied = async (name, fn) => {
  try { await fn(); console.log('  FAIL  ' + name + '\n          -> khong bi tu choi (LO HONG)'); fail++; }
  catch (e) {
    const c = e?.code || '';
    if (c.includes('permission-denied') || c.includes('auth/')) { console.log('  PASS  ' + name); pass++; }
    else { console.log('  FAIL  ' + name + '\n          -> tu choi vi ly do khac: ' + c + ' ' + String(e?.message).slice(0,100)); fail++; }
  }
};
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: ky vong ${b}, nhan ${a}`); };

/** One isolated Firebase app per identity, so several can be signed in at once. */
const ctx = (name) => {
  const app = initializeApp(cfg, name);
  return { auth: getAuth(app), db: getFirestore(app) };
};

const CUST = ctx('cust'), HOST = ctx('host'), ADMIN = ctx('admin'), ANON = ctx('anon');

/* ================================================================== */
console.log('\n=== 1. DANG KY (task 1 + 3) ===');
/* ================================================================== */

const custEmail = `e2e.cust.${STAMP}@visgo-test.dev`;
const hostEmail = `e2e.host.${STAMP}@visgo-test.dev`;
let custUid, hostUid;

await ok('dang ky KHACH bang email + mat khau', async () => {
  const c = await createUserWithEmailAndPassword(CUST.auth, custEmail, PW);
  custUid = c.user.uid; created.uids.push(custUid);
  await updateProfile(c.user, { displayName: 'E2E Khach' });
  await setDoc(doc(CUST.db, 'profiles', custUid), {
    id: custUid, name: 'E2E Khach', email: custEmail, role: 'customer',
    phone: '', avatar: 'https://example.com/a.png', verified: false,
    rating: 0, reviewCount: 0, totalEarnings: 0, completedTours: 0, isAcceptingGuests: false,
  });
  const snap = await getDoc(doc(CUST.db, 'profiles', custUid));
  eq(snap.data().role, 'customer', 'role');
});

await ok('dang ky HOST bang email + mat khau', async () => {
  const c = await createUserWithEmailAndPassword(HOST.auth, hostEmail, PW);
  hostUid = c.user.uid; created.uids.push(hostUid);
  await setDoc(doc(HOST.db, 'profiles', hostUid), {
    id: hostUid, name: 'E2E Host', email: hostEmail, role: 'host',
    phone: '', avatar: 'https://example.com/b.png', verified: false, city: 'Hà Nội',
    rating: 0, reviewCount: 0, totalEarnings: 0, completedTours: 0, isAcceptingGuests: true,
  });
  const snap = await getDoc(doc(HOST.db, 'profiles', hostUid));
  eq(snap.data().role, 'host', 'role');
});

await denied('KHONG the tu dang ky lam ADMIN', async () => {
  const email = `e2e.fake.admin.${STAMP}@visgo-test.dev`;
  const tmp = ctx('fakeadmin');
  const c = await createUserWithEmailAndPassword(tmp.auth, email, PW);
  created.uids.push(c.user.uid);
  await setDoc(doc(tmp.db, 'profiles', c.user.uid), {
    id: c.user.uid, name: 'Ke gia mao', email, role: 'admin', phone: '', avatar: '',
  });
});

await denied('KHONG the tu dat verified = true', async () => {
  const email = `e2e.fake.verified.${STAMP}@visgo-test.dev`;
  const tmp = ctx('fakeverified');
  const c = await createUserWithEmailAndPassword(tmp.auth, email, PW);
  created.uids.push(c.user.uid);
  await setDoc(doc(tmp.db, 'profiles', c.user.uid), {
    id: c.user.uid, name: 'Tu phong', email, role: 'host', phone: '', avatar: '', verified: true,
  });
});

await denied('KHONG the tu nang minh len admin sau khi da dang ky', () =>
  updateDoc(doc(CUST.db, 'profiles', custUid), { role: 'admin' }));

await denied('trung email thi bi tu choi', () =>
  createUserWithEmailAndPassword(ctx('dup').auth, custEmail, PW));

/* ================================================================== */
console.log('\n=== 2. DANG NHAP 3 VAI TRO (task 3) ===');
/* ================================================================== */

await ok('dang nhap KHACH -> role customer', async () => {
  const c = await signInWithEmailAndPassword(ctx('login1').auth, custEmail, PW);
  const snap = await getDoc(doc(CUST.db, 'profiles', c.user.uid));
  eq(snap.data().role, 'customer', 'role');
});

await ok('dang nhap HOST -> role host', async () => {
  const c = await signInWithEmailAndPassword(ctx('login2').auth, hostEmail, PW);
  const snap = await getDoc(doc(HOST.db, 'profiles', c.user.uid));
  eq(snap.data().role, 'host', 'role');
});

await ok('dang nhap ADMIN (tai khoan seed) -> role admin', async () => {
  const c = await signInWithEmailAndPassword(ADMIN.auth, 'admin@visgo.vn', process.env.SEED_ADMIN_PASSWORD);
  const snap = await getDoc(doc(ADMIN.db, 'profiles', c.user.uid));
  eq(snap.data().role, 'admin', 'role');
  eq(c.user.uid, 'user_admin_1', 'uid');
});

await denied('sai mat khau bi tu choi', () =>
  signInWithEmailAndPassword(ctx('badpw').auth, custEmail, 'sai-mat-khau-hoan-toan'));

await denied('email chua dang ky bi tu choi', () =>
  signInWithEmailAndPassword(ctx('nouser').auth, `khong.ton.tai.${STAMP}@visgo-test.dev`, PW));

/* ================================================================== */
console.log('\n=== 3. CHI ADMIN MOI CAP DUOC QUYEN ADMIN (task 1) ===');
/* ================================================================== */

await denied('HOST khong nang duoc nguoi khac len admin', () =>
  updateDoc(doc(HOST.db, 'profiles', custUid), { role: 'admin' }));

await denied('KHACH khong nang duoc nguoi khac len admin', () =>
  updateDoc(doc(CUST.db, 'profiles', hostUid), { role: 'admin' }));

await ok('ADMIN nang duoc nguoi khac len admin', async () => {
  await updateDoc(doc(ADMIN.db, 'profiles', custUid), { role: 'admin' });
  const snap = await getDoc(doc(ADMIN.db, 'profiles', custUid));
  eq(snap.data().role, 'admin', 'role sau khi nang');
});

await ok('ADMIN thu hoi duoc quyen', async () => {
  await updateDoc(doc(ADMIN.db, 'profiles', custUid), { role: 'customer' });
  const snap = await getDoc(doc(ADMIN.db, 'profiles', custUid));
  eq(snap.data().role, 'customer', 'role sau khi thu hoi');
});

/* ================================================================== */
console.log('\n=== 4. HOST DANG BAI + KHACH DANH GIA (task 4) ===');
/* ================================================================== */

const tourId = `e2e_tour_${STAMP}`;
created.tours.push(tourId);
const tourDoc = {
  id: tourId, hostId: hostUid, hostName: 'E2E Host', hostAvatar: 'https://example.com/b.png',
  hostPhone: '', hostRating: 5, hostReviewCount: 0,
  title: 'E2E test tour', titleVi: 'Tour kiem thu E2E',
  description: 'x', descriptionVi: 'x', city: 'Hà Nội', priceVND: 500000, priceUSD: 20,
  durationHours: 3, maxGuests: 4, category: 'food', coverImage: 'https://example.com/c.jpg',
  included: [], includedVi: [], stops: [], meetingPoint: 'A', meetingPointVi: 'A',
  languages: ['Tiếng Việt'], featured: false,
};

await ok('HOST dang duoc tour cua chinh minh', async () => {
  await setDoc(doc(HOST.db, 'tours', tourId), tourDoc);
  const snap = await getDoc(doc(HOST.db, 'tours', tourId));
  eq(snap.data().hostId, hostUid, 'hostId');
});

await ok('HOST sua duoc tour cua chinh minh', async () => {
  await updateDoc(doc(HOST.db, 'tours', tourId), { priceVND: 600000 });
  const snap = await getDoc(doc(HOST.db, 'tours', tourId));
  eq(snap.data().priceVND, 600000, 'gia moi');
});

await denied('KHACH khong dang duoc tour dung ten host khac', () =>
  setDoc(doc(CUST.db, 'tours', `e2e_gia_mao_${STAMP}`), { ...tourDoc, id: `e2e_gia_mao_${STAMP}` }));

await denied('KHACH khong sua duoc tour cua host', () =>
  updateDoc(doc(CUST.db, 'tours', tourId), { priceVND: 1 }));

await denied('KHACH khong xoa duoc tour cua host', () =>
  deleteDoc(doc(CUST.db, 'tours', tourId)));

await ok('khach vang lai (chua dang nhap) doc duoc danh muc tour', async () => {
  const snap = await getDoc(doc(ANON.db, 'tours', tourId));
  if (!snap.exists()) throw new Error('khong doc duoc');
});

const reviewId = `e2e_review_${STAMP}`;
created.reviews.push(reviewId);

await ok('KHACH viet duoc danh gia cho tour cua host', async () => {
  await setDoc(doc(CUST.db, 'reviews', reviewId), {
    id: reviewId, tourId, userId: custUid, userName: 'E2E Khach',
    userAvatar: 'https://example.com/a.png', userCountry: 'VN',
    rating: 5, date: new Date().toISOString().slice(0, 10),
    comment: 'Chuyen di rat vui, host nhiet tinh.', tags: ['friendly'],
  });
  const snap = await getDoc(doc(CUST.db, 'reviews', reviewId));
  eq(snap.data().rating, 5, 'rating');
});

await ok('KHACH sua duoc danh gia cua chinh minh', () =>
  updateDoc(doc(CUST.db, 'reviews', reviewId), { comment: 'Da sua lai nhan xet.' }));

await denied('KHONG gia mao duoc nguoi viet danh gia', () =>
  setDoc(doc(CUST.db, 'reviews', `e2e_gm_${STAMP}`), {
    id: `e2e_gm_${STAMP}`, tourId, userId: hostUid, userName: 'Gia mao',
    userAvatar: '', userCountry: 'VN', rating: 5, date: '2026-08-26', comment: 'x',
  }));

await denied('rating 6 sao bi tu choi', () =>
  setDoc(doc(CUST.db, 'reviews', `e2e_r6_${STAMP}`), {
    id: `e2e_r6_${STAMP}`, tourId, userId: custUid, userName: 'x',
    userAvatar: '', userCountry: 'VN', rating: 6, date: '2026-08-26', comment: 'x',
  }));

await denied('rating 0 sao bi tu choi', () =>
  setDoc(doc(CUST.db, 'reviews', `e2e_r0_${STAMP}`), {
    id: `e2e_r0_${STAMP}`, tourId, userId: custUid, userName: 'x',
    userAvatar: '', userCountry: 'VN', rating: 0, date: '2026-08-26', comment: 'x',
  }));

await denied('HOST khong tu danh gia duoc tour cua chinh minh', () =>
  setDoc(doc(HOST.db, 'reviews', `e2e_self_${STAMP}`), {
    id: `e2e_self_${STAMP}`, tourId, userId: hostUid, userName: 'E2E Host',
    userAvatar: '', userCountry: 'VN', rating: 5, date: '2026-08-26',
    comment: 'Tour cua toi tuyet voi nhat.',
  }));

await denied('HOST khong sua duoc danh gia ve chinh minh', () =>
  updateDoc(doc(HOST.db, 'reviews', reviewId), { rating: 5, comment: 'Tu khen' }));

await denied('HOST khong xoa duoc danh gia xau ve minh', () =>
  deleteDoc(doc(HOST.db, 'reviews', reviewId)));

await ok('khach vang lai doc duoc danh gia', async () => {
  const snap = await getDocs(query(collection(ANON.db, 'reviews'), limit(5)));
  if (snap.empty) throw new Error('khong doc duoc danh gia nao');
});

/* ================================================================== */
console.log('\n=== 5. CHAT KHACH <-> HOST (task 5) ===');
/* ================================================================== */

const BID = `e2e_booking_${STAMP}`;
created.convos.push(BID);
const convoRef = (c) => doc(c.db, 'conversations', BID);
const msgsRef = (c) => collection(c.db, 'conversations', BID, 'messages');

await ok('mo hoi thoai truoc khi ton tai khong bi tu choi', () => getDoc(convoRef(CUST)));

await ok('KHACH mo duoc hoi thoai cua chuyen di minh dat', () =>
  setDoc(convoRef(CUST), {
    bookingId: BID, participants: [custUid, hostUid], tourTitle: 'E2E', city: 'Hà Nội',
    lastMessage: '', lastSenderId: '', lastMessageAt: serverTimestamp(),
    lastReadAt: {}, createdAt: serverTimestamp(),
  }));

// A third real account: a signed-in user who is on neither side of the trip.
const STRANGER = ctx('stranger');
const strangerEmail = `e2e.stranger.${STAMP}@visgo-test.dev`;
{
  const c = await createUserWithEmailAndPassword(STRANGER.auth, strangerEmail, PW);
  created.uids.push(c.user.uid);
  await setDoc(doc(STRANGER.db, 'profiles', c.user.uid), {
    id: c.user.uid, name: 'Nguoi la', email: strangerEmail, role: 'customer', phone: '', avatar: '',
  });
}

await denied('NGUOI LA khong doc duoc hoi thoai', () => getDoc(convoRef(STRANGER)));
await denied('NGUOI LA khong gui duoc tin nhan', () =>
  addDoc(msgsRef(STRANGER), { senderId: STRANGER.auth.currentUser.uid, senderName: 'Nguoi la', senderRole: 'customer', text: 'hello', createdAt: serverTimestamp() }));
await denied('NGUOI LA khong doc duoc thread', () =>
  getDocs(query(msgsRef(STRANGER), orderBy('createdAt', 'desc'), limit(30))));

await ok('HOST doc duoc hoi thoai', () => getDoc(convoRef(HOST)));
await ok('ADMIN doc duoc hoi thoai', () => getDoc(convoRef(ADMIN)));

const msg = (uid, name, role, text) => ({
  senderId: uid, senderName: name, senderRole: role, text, createdAt: serverTimestamp(),
});

await ok('KHACH gui duoc tin nhan', () => addDoc(msgsRef(CUST), msg(custUid, 'E2E Khach', 'customer', 'Chao anh, may gio minh gap?')));
await ok('HOST tra loi duoc', () => addDoc(msgsRef(HOST), msg(hostUid, 'E2E Host', 'host', '18h o Ho Guom nhe.')));

await ok('ca hai doc duoc ca thread, dung thu tu', async () => {
  const snap = await getDocs(query(msgsRef(HOST), orderBy('createdAt', 'desc'), limit(30)));
  eq(snap.docs.length, 2, 'so tin nhan');
  const texts = snap.docs.map((d) => d.data().text).reverse();
  eq(texts[0].startsWith('Chao anh'), true, 'tin dau');
  eq(texts[1].startsWith('18h'), true, 'tin sau');
});

await ok('cap nhat duoc dong tom tat cua hoi thoai', () =>
  updateDoc(convoRef(HOST), { lastMessage: '18h o Ho Guom nhe.', lastSenderId: hostUid, lastMessageAt: serverTimestamp() }));

await ok('danh dau da doc duoc', () =>
  updateDoc(convoRef(CUST), { [`lastReadAt.${custUid}`]: serverTimestamp() }));

await denied('KHONG doi duoc danh sach nguoi tham gia', () =>
  updateDoc(convoRef(CUST), { participants: [custUid, hostUid, 'ke_thu_ba'] }));

await denied('KHONG gia mao duoc nguoi gui', () =>
  addDoc(msgsRef(CUST), msg(hostUid, 'E2E Host', 'host', 'Toi la host day')));

await denied('KHONG lui duoc gio tin nhan (backdate)', () =>
  addDoc(msgsRef(CUST), { ...msg(custUid, 'E2E Khach', 'customer', 'x'), createdAt: Timestamp.fromDate(new Date('2020-01-01')) }));

await denied('tin nhan rong bi tu choi', () => addDoc(msgsRef(CUST), msg(custUid, 'x', 'customer', '')));
await denied('tin nhan > 2000 ky tu bi tu choi', () => addDoc(msgsRef(CUST), msg(custUid, 'x', 'customer', 'x'.repeat(2001))));
await denied('ADMIN doc duoc nhung KHONG gui duoc', () => addDoc(msgsRef(ADMIN), msg('user_admin_1', 'Ops', 'admin', 'xen vao')));

await ok('ADMIN doc duoc thread (giai quyet tranh chap)', async () => {
  const snap = await getDocs(query(msgsRef(ADMIN), orderBy('createdAt', 'desc'), limit(30)));
  if (snap.docs.length < 2) throw new Error('doc thieu tin nhan');
});

/* --- realtime: chinh cai lam chat "tron tru" --- */
await ok('onSnapshot day tin nhan moi sang may ben kia trong 8s', async () => {
  const seen = [];
  const unsub = onSnapshot(
    query(msgsRef(CUST), orderBy('createdAt', 'desc'), limit(30)),
    (snap) => seen.push(snap.docs.length),
  );
  // cho lan phat dau tien
  await new Promise((r) => setTimeout(r, 1500));
  const before = seen[seen.length - 1];
  await addDoc(msgsRef(HOST), msg(hostUid, 'E2E Host', 'host', 'Minh dang tren duong den.'));
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline && (seen[seen.length - 1] ?? 0) <= before) {
    await new Promise((r) => setTimeout(r, 200));
  }
  unsub();
  if ((seen[seen.length - 1] ?? 0) <= before) throw new Error('listener khong nhan duoc tin moi');
});

await denied('KHONG sua duoc tin nhan da gui (chi ghi them)', async () => {
  const snap = await getDocs(query(msgsRef(CUST), orderBy('createdAt', 'desc'), limit(1)));
  await updateDoc(snap.docs[0].ref, { text: 'da bi sua' });
});


/* ------------------------------------------------------------------ */
/* Cleanup — runs whether the assertions passed or not                 */
/* ------------------------------------------------------------------ */

async function cleanup() {
  const { readFileSync, existsSync } = await import('node:fs');
  const keyPath = new URL('../serviceAccount.json', import.meta.url);
  if (!existsSync(keyPath)) {
    console.log('\nCHU Y: khong co serviceAccount.json nen KHONG don duoc du lieu test.');
    console.log('       Cac tai khoan @visgo-test.dev va document e2e_* van con tren project.');
    return;
  }
  const { cert, initializeApp: initAdmin } = await import('firebase-admin/app');
  const { getAuth: adminAuth } = await import('firebase-admin/auth');
  const { getFirestore: adminDb } = await import('firebase-admin/firestore');

  const key = JSON.parse(readFileSync(keyPath, 'utf8'));
  initAdmin({ credential: cert(key), projectId: key.project_id });
  const db = adminDb(), auth = adminAuth();

  let n = 0;
  const page = await auth.listUsers(1000);
  for (const u of page.users) {
    if (!u.email?.endsWith('@visgo-test.dev')) continue;
    await auth.deleteUser(u.uid);
    await db.doc(`profiles/${u.uid}`).delete();
    n++;
  }
  for (const col of ['tours', 'reviews']) {
    for (const d of (await db.collection(col).get()).docs) {
      if (d.id.startsWith('e2e_')) { await d.ref.delete(); n++; }
    }
  }
  for (const c of (await db.collection('conversations').get()).docs) {
    if (!c.id.startsWith('e2e_')) continue;
    for (const m of (await c.ref.collection('messages').get()).docs) await m.ref.delete();
    await c.ref.delete();
    n++;
  }
  console.log(`\nda don ${n} muc test.`);
}

try {
  await cleanup();
} catch (err) {
  console.error('don du lieu test that bai:', err?.message || err);
}

console.log(`\n================  ${pass} PASS / ${fail} FAIL  ================\n`);
process.exit(fail ? 1 : 0);
