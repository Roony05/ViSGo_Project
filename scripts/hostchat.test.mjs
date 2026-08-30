/**
 * Every tour has a real host account, and that host can be messaged.
 *
 *     npm run test:hostchat
 *
 * The catalogue used to name six hosts but own only two accounts: four tours
 * carried a `hostName` belonging to nobody, on a `hostId` pointing at a
 * different person entirely. A traveller messaging "Lê Văn Hoàng" reached
 * Tommy, and Hoàng could neither sign in nor answer nor edit the listing with
 * his name on it.
 *
 * So this checks the whole chain per tour: the host id is a real Auth account,
 * that account's profile name matches the name on the listing, the host has an
 * identity declaration on file (publishing requires one), and the two parties
 * of a booking can actually hold a conversation.
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const STAMP = Date.now();
let pass = 0, fail = 0;
const created = [];

const ok = async (n, f) => { try { await f(); console.log('  PASS  ' + n); pass++; }
  catch (e) { console.log('  FAIL  ' + n + '\n          -> ' + String(e?.message || e).slice(0, 170)); fail++; } };
const eq = (a, b, w) => { if (a !== b) throw new Error(`${w}: ky vong ${JSON.stringify(b)}, nhan ${JSON.stringify(a)}`); };

const ctx = (n) => { const app = initializeApp(cfg, n); return { auth: getAuth(app), db: getFirestore(app) }; };
const CUST = ctx('cust'), HOST = ctx('host');

console.log('\n=== moi tour mot host that ===\n');

const KEY = ['serviceAccount.json', 'service-account.json'].find((p) => existsSync(p));
const { cert, initializeApp: initAdmin } = await import('firebase-admin/app');
const { getFirestore: adb } = await import('firebase-admin/firestore');
const { getAuth: aauth } = await import('firebase-admin/auth');
initAdmin({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) });

const tours = (await adb().collection('tours').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const profiles = new Map((await adb().collection('profiles').get()).docs.map((d) => [d.id, d.data()]));
const kyc = (await adb().collection('kyc').get()).docs.map((d) => d.data());

for (const tour of tours) {
  await ok(`${tour.id.padEnd(12)} host "${tour.hostName}" co tai khoan that`, async () => {
    const authUser = await aauth().getUser(tour.hostId);
    if (!authUser.email) throw new Error('tai khoan khong co email');
    const profile = profiles.get(tour.hostId);
    if (!profile) throw new Error('khong co ho so trong profiles');
    eq(profile.name, tour.hostName, 'ten tren the tour vs ho so');
    eq(profile.role, 'host', 'role');
    const declared = kyc.find((k) => k.hostId === tour.hostId);
    if (!declared) throw new Error('host chua khai danh tinh ma van dang duoc bai');
    if (!/^[0-9]{12}$/.test(declared.cccdNumber)) throw new Error('CCCD khong du 12 so');
    if (!declared.address?.trim()) throw new Error('thieu dia chi');
    if (!declared.dateOfBirth?.trim()) throw new Error('thieu ngay sinh');
  });
}

await ok('khong con tour nao tro toi host khong ton tai', async () => {
  const orphans = tours.filter((t) => !profiles.has(t.hostId));
  eq(orphans.length, 0, 'so tour mo coi');
});

await ok('khong con ho so xac minh nao tro toi tai khoan khong ton tai', async () => {
  const ghosts = kyc.filter((k) => !profiles.has(k.hostId));
  eq(ghosts.length, 0, 'so ho so ma');
});

console.log('\n=== khach nhan tin duoc voi host cua tour ===\n');

const TOUR = tours.find((t) => t.hostId === 'user_host_3');   // Lê Văn Hoàng, Đà Nẵng
const BOOKING = `e2e_bk_${STAMP}`;
let custUid;

await ok('KHACH dat tour cua Le Van Hoang', async () => {
  const c = await signInWithEmailAndPassword(CUST.auth, 'customer@visgo.vn', process.env.SEED_PASSWORD);
  custUid = c.user.uid;
  await setDoc(doc(CUST.db, 'bookings', BOOKING), {
    id: BOOKING, tourId: TOUR.id, tourTitle: TOUR.title, tourTitleVi: TOUR.titleVi,
    tourImage: TOUR.coverImage, city: TOUR.city,
    hostId: TOUR.hostId, hostName: TOUR.hostName, hostPhone: TOUR.hostPhone, hostAvatar: TOUR.hostAvatar,
    customerId: custUid, customerName: 'Sarah Jenkins', customerEmail: 'customer@visgo.vn',
    customerPhone: '+84 901 234 567', bookingDate: '2026-09-05', bookingTime: '16:00',
    guestsCount: 2, totalPriceVND: 1100000, totalPriceUSD: 44, platformFeeVND: 165000,
    status: 'pending', createdAt: '2026-08-28', meetingPoint: TOUR.meetingPoint,
  });
  created.push(['bookings', BOOKING]);
  eq((await getDoc(doc(CUST.db, 'bookings', BOOKING))).data().hostId, 'user_host_3', 'hostId');
});

await ok('KHACH mo duoc hoi thoai voi dung host do', async () => {
  // `tourId` is required by the rules: it is what proves the host on the
  // participant list really owns the tour being discussed, which is what lets
  // a traveller open a thread before any booking exists.
  await setDoc(doc(CUST.db, 'conversations', BOOKING), {
    participants: [custUid, TOUR.hostId], bookingId: BOOKING, tourId: TOUR.id,
    tourTitle: TOUR.title, city: TOUR.city,
    customerId: custUid, hostId: TOUR.hostId,
    customerName: 'Sarah Jenkins', hostName: TOUR.hostName,
    lastMessage: '', updatedAt: serverTimestamp(),
  });
  created.push(['conversations', BOOKING]);
  await addDoc(collection(CUST.db, 'conversations', BOOKING, 'messages'), {
    senderId: custUid, text: 'Chào anh Hoàng, chiều mai mình gặp ở đâu ạ?', createdAt: serverTimestamp(),
  });
});

await ok('HOST that dang nhap duoc va doc duoc tin', async () => {
  await signInWithEmailAndPassword(HOST.auth, 'hoang.host@visgo.vn', process.env.SEED_PASSWORD);
  const snap = await getDocs(query(collection(HOST.db, 'conversations', BOOKING, 'messages'), orderBy('createdAt')));
  eq(snap.size, 1, 'so tin nhan');
  eq(snap.docs[0].data().text, 'Chào anh Hoàng, chiều mai mình gặp ở đâu ạ?', 'noi dung');
});

await ok('HOST tra loi duoc, KHACH doc duoc', async () => {
  await addDoc(collection(HOST.db, 'conversations', BOOKING, 'messages'), {
    senderId: HOST.auth.currentUser.uid, text: 'Chào bạn, mình đón ở chân Cầu Rồng lúc 16h nhé.', createdAt: serverTimestamp(),
  });
  const snap = await getDocs(query(collection(CUST.db, 'conversations', BOOKING, 'messages'), orderBy('createdAt')));
  eq(snap.size, 2, 'so tin nhan');
  eq(snap.docs[1].data().senderId, 'user_host_3', 'nguoi gui tin thu hai');
});

for (const [c, id] of created) {
  if (c === 'conversations') {
    for (const m of (await adb().collection('conversations').doc(id).collection('messages').get()).docs) await m.ref.delete();
  }
  await adb().collection(c).doc(id).delete();
}
console.log(`\nda don ${created.length} document.`);
console.log(`\n================  ${pass} PASS / ${fail} FAIL  ================\n`);
process.exit(fail ? 1 : 0);
