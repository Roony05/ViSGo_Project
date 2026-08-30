import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, setDoc, getDoc, addDoc, collection, updateDoc, deleteDoc,
  serverTimestamp, Timestamp, getDocs, query, orderBy, limit, where,
  writeBatch,
  deleteField,
} from 'firebase/firestore';

const CUST='uid_customer', HOST='uid_host', OTHER='uid_stranger', ADMIN='uid_admin';
const BID='VIS-TEST-1';

const env = await initializeTestEnvironment({
  projectId: 'demo-visgo',
  firestore: { rules: readFileSync('firestore.rules','utf8'), host:'127.0.0.1', port:8399 },
});

// seed the admin's profile: isAdmin() reads profiles/{uid}.role
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db,'profiles',ADMIN), { id:ADMIN, name:'Ops', email:'a@b.c', role:'admin', verified:true });
  await setDoc(doc(db,'profiles',CUST),  { id:CUST,  name:'Cust', email:'c@b.c', role:'customer', verified:false });
  await setDoc(doc(db,'profiles',HOST),  { id:HOST,  name:'Host', email:'h@b.c', role:'host', verified:true });
  await setDoc(doc(db,'profiles',OTHER), { id:OTHER, name:'New Host', email:'n@b.c', role:'host', verified:false });
  await setDoc(doc(db,'bookings',BID), {
    id:BID, customerId:CUST, hostId:HOST, hostAvatar:'', status:'confirmed',
  });
  await setDoc(doc(db,'tours','tour-reserve-ok'), {
    id:'tour-reserve-ok', hostId:HOST, status:'active', coverImage:'', hostAvatar:'', videoUrl:'',
  });
  await setDoc(doc(db,'tours','tour-reserve-fake'), {
    id:'tour-reserve-fake', hostId:HOST, status:'active', coverImage:'', hostAvatar:'', videoUrl:'',
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

let pass=0, fail=0;
const check = async (name, fn) => {
  try { await fn(); console.log('  PASS  ' + name); pass++; }
  catch (e) { console.log('  FAIL  ' + name + '  -> ' + (e?.message||e).toString().slice(0,110)); fail++; }
};

console.log('\n--- admin duyet host truoc khi dang tour ---');
const listing = (hostId) => ({
  id:`tour-${hostId}`, hostId, status:'active', coverImage:'', hostAvatar:'', videoUrl:'',
});
await check('host da duyet dang tour duoc', () =>
  assertSucceeds(setDoc(doc(as(HOST),'tours','tour-verified-host'), listing(HOST))));
await check('host chua duyet KHONG dang tour duoc', () =>
  assertFails(setDoc(doc(as(OTHER),'tours','tour-unverified-host'), listing(OTHER))));
const convo = (db) => doc(db,'conversations',BID);
const msgs  = (db) => collection(db,'conversations',BID,'messages');
const NEW = { bookingId:BID, participants:[CUST,HOST], tourTitle:'T', city:'Hà Nội',
              tourId:'tour-reserve-ok',
              lastMessage:'', lastSenderId:'', lastMessageAt:serverTimestamp(), lastReadAt:{}, createdAt:serverTimestamp() };

console.log('\n--- mo hoi thoai ---');
await check('doc chua ton tai khong bi tu choi (bay resource==null)', () => assertSucceeds(getDoc(convo(as(CUST)))));
await check('khach tao duoc hoi thoai cua chuyen minh',              () => assertSucceeds(setDoc(convo(as(CUST)), NEW)));
await check('nguoi la KHONG tao duoc hoi thoai cua nguoi khac',      () => assertFails(setDoc(doc(as(OTHER),'conversations','VIS-TEST-2'), NEW)));

console.log('\n--- doc hoi thoai ---');
await check('khach doc duoc',            () => assertSucceeds(getDoc(convo(as(CUST)))));
await check('host doc duoc',             () => assertSucceeds(getDoc(convo(as(HOST)))));
await check('admin doc duoc',            () => assertSucceeds(getDoc(convo(as(ADMIN)))));
await check('nguoi la KHONG doc duoc',   () => assertFails(getDoc(convo(as(OTHER)))));
await check('chua dang nhap KHONG doc',  () => assertFails(getDoc(convo(anon()))));

// Lien he truoc khi dat cho: khong co booking nao dung sau, va host phai thay
// duoc no trong hop thu bang truy van array-contains.
console.log('\n--- hoi thoai truoc khi dat cho ---');
const CONTACT = 'contact_tour-reserve-ok_' + CUST;
const ENQUIRY = {
  bookingId: CONTACT, tourId: 'tour-reserve-ok', participants: [CUST, HOST],
  tourTitle: 'T', city: 'Hà Nội', customerId: CUST, hostId: HOST,
  customerName: 'Cust', hostName: 'Host', hostAvatar: '', hostPhone: '',
  bookingDate: '2026-09-02', bookingTime: '18:00',
  lastMessage: '', lastSenderId: '', lastMessageAt: serverTimestamp(), lastReadAt: {},
  createdAt: serverTimestamp(),
};
await check('khach mo duoc hoi thoai truoc khi dat cho', () =>
  assertSucceeds(setDoc(doc(as(CUST), 'conversations', CONTACT), ENQUIRY)));
await check('KHONG mo duoc hoi thoai voi tour khong ton tai', () =>
  assertFails(setDoc(doc(as(CUST), 'conversations', 'contact_tour-missing_' + CUST),
    { ...ENQUIRY, tourId: 'tour-khong-co' })));
await check('host liet ke duoc hop thu cua minh', () =>
  assertSucceeds(getDocs(query(collection(as(HOST), 'conversations'),
    where('participants', 'array-contains', HOST)))));
await check('nguoi la KHONG liet ke duoc hop thu cua host', () =>
  assertFails(getDocs(query(collection(as(OTHER), 'conversations'),
    where('participants', 'array-contains', HOST)))));

console.log('\n--- gui tin nhan ---');
const good = (uid,name,role) => ({ senderId:uid, senderName:name, senderRole:role, text:'xin chao', createdAt:serverTimestamp() });
await check('khach gui duoc',                       () => assertSucceeds(addDoc(msgs(as(CUST)), good(CUST,'Cust','customer'))));
await check('host gui duoc',                        () => assertSucceeds(addDoc(msgs(as(HOST)), good(HOST,'Host','host'))));
await check('nguoi la KHONG gui duoc',              () => assertFails(addDoc(msgs(as(OTHER)), good(OTHER,'X','customer'))));
await check('admin KHONG gui duoc (chi doc)',       () => assertFails(addDoc(msgs(as(ADMIN)), good(ADMIN,'Ops','admin'))));
await check('KHONG gia mao duoc nguoi gui',         () => assertFails(addDoc(msgs(as(CUST)), good(HOST,'Host','host'))));
await check('KHONG dat duoc gio thu cong (backdate)',() => assertFails(addDoc(msgs(as(CUST)),
      { ...good(CUST,'Cust','customer'), createdAt: Timestamp.fromDate(new Date('2020-01-01')) })));
await check('tin rong bi tu choi',                  () => assertFails(addDoc(msgs(as(CUST)), { ...good(CUST,'Cust','customer'), text:'' })));
await check('tin >2000 ky tu bi tu choi',           () => assertFails(addDoc(msgs(as(CUST)), { ...good(CUST,'Cust','customer'), text:'x'.repeat(2001) })));

console.log('\n--- doc tin nhan ---');
await check('khach doc duoc thread',        () => assertSucceeds(getDocs(query(msgs(as(CUST)), orderBy('createdAt','desc'), limit(30)))));
await check('admin doc duoc thread',        () => assertSucceeds(getDocs(query(msgs(as(ADMIN)), orderBy('createdAt','desc'), limit(30)))));
await check('nguoi la KHONG doc duoc thread',() => assertFails(getDocs(query(msgs(as(OTHER)), orderBy('createdAt','desc'), limit(30)))));

console.log('\n--- chi ghi them, khong sua ---');
let mid;
await env.withSecurityRulesDisabled(async (ctx) => {
  const r = await addDoc(collection(ctx.firestore(),'conversations',BID,'messages'),
    { senderId:CUST, senderName:'Cust', senderRole:'customer', text:'goc', createdAt: Timestamp.now() });
  mid = r.id;
});
await check('nguoi gui KHONG sua duoc tin cua chinh minh', () => assertFails(updateDoc(doc(as(CUST),'conversations',BID,'messages',mid), { text:'da sua' })));
await check('admin KHONG sua duoc tin',                    () => assertFails(updateDoc(doc(as(ADMIN),'conversations',BID,'messages',mid), { text:'da sua' })));
await check('khach KHONG xoa duoc tin',                    () => assertFails(deleteDoc(doc(as(CUST),'conversations',BID,'messages',mid))));
await check('admin xoa duoc tin (go noi dung vi pham)',    () => assertSucceeds(deleteDoc(doc(as(ADMIN),'conversations',BID,'messages',mid))));

console.log('\n--- cap nhat hoi thoai ---');
await check('khach danh dau da doc',            () => assertSucceeds(updateDoc(convo(as(CUST)), { [`lastReadAt.${CUST}`]: serverTimestamp() })));
await check('khach cap nhat duoc lastMessage',  () => assertSucceeds(updateDoc(convo(as(CUST)), { lastMessage:'moi', lastSenderId:CUST, lastMessageAt:serverTimestamp() })));
await check('KHONG doi duoc danh sach thanh vien', () => assertFails(updateDoc(convo(as(CUST)), { participants:[CUST,HOST,OTHER] })));
await check('nguoi la KHONG cap nhat duoc',     () => assertFails(updateDoc(convo(as(OTHER)), { lastMessage:'hack' })));
await check('nguoi la KHONG xoa duoc hoi thoai',() => assertFails(deleteDoc(convo(as(OTHER)))));

console.log('\n--- dat booking va khoa tour nguyen tu ---');
await check('khach tao booking + khoa dung tour trong mot batch', async () => {
  const db = as(CUST);
  const batch = writeBatch(db);
  batch.set(doc(db,'bookings','VIS-RESERVE-OK'), {
    id:'VIS-RESERVE-OK', customerId:CUST, hostId:HOST, hostAvatar:'',
    tourId:'tour-reserve-ok', status:'pending',
  });
  batch.update(doc(db,'tours','tour-reserve-ok'), {
    status:'booked', reservedByBookingId:'VIS-RESERVE-OK',
  });
  await assertSucceeds(batch.commit());
});
await check('khach KHONG khoa tour neu khong co booking di kem', () =>
  assertFails(updateDoc(doc(as(CUST),'tours','tour-reserve-fake'), {
    status:'booked', reservedByBookingId:'VIS-NOT-THERE',
  })));
await check('nguoi la KHONG dung booking cua khach de khoa tour', () =>
  assertFails(updateDoc(doc(as(OTHER),'tours','tour-reserve-fake'), {
    status:'booked', reservedByBookingId:'VIS-RESERVE-OK',
  })));

console.log('\n--- vong doi booking ---');
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const now = Date.now();
  await setDoc(doc(db,'bookings','BK-FUTURE'), {
    id:'BK-FUTURE', customerId:CUST, hostId:HOST, hostAvatar:'', status:'pending',
    tourId:'tour-reserve-ok',
    tourEndsAtEpochMs: now + 3_600_000,
  });
  await setDoc(doc(db,'bookings','BK-ENDED'), {
    id:'BK-ENDED', customerId:CUST, hostId:HOST, hostAvatar:'', status:'confirmed',
    tourId:'tour-reserve-ok',
    tourEndsAtEpochMs: now - 60_000,
  });
  await setDoc(doc(db,'bookings','BK-CANCEL'), {
    id:'BK-CANCEL', customerId:CUST, hostId:HOST, hostAvatar:'', status:'pending',
    tourId:'tour-cancel',
  });
  await setDoc(doc(db,'tours','tour-cancel'), {
    id:'tour-cancel', hostId:HOST, status:'booked', reservedByBookingId:'BK-CANCEL', coverImage:'', hostAvatar:'', videoUrl:'',
  });
});
await check('host chap nhan booking pending', () =>
  assertSucceeds(updateDoc(doc(as(HOST),'bookings','BK-FUTURE'), { status:'confirmed' })));
await check('host KHONG tu choi booking', () =>
  assertFails(updateDoc(doc(as(HOST),'bookings','BK-FUTURE'), { status:'cancelled' })));
await check('host KHONG hoan thanh truoc gio ket thuc', () =>
  assertFails(updateDoc(doc(as(HOST),'bookings','BK-FUTURE'), { status:'completed' })));
await check('khach KHONG huy sau khi host da xac nhan', () =>
  assertFails(updateDoc(doc(as(CUST),'bookings','BK-FUTURE'), { status:'cancelled' })));
await check('host KHONG tu hoan thanh chuyen', () =>
  assertFails(updateDoc(doc(as(HOST),'bookings','BK-ENDED'), { status:'completed' })));
await check('khach xac nhan hoan thanh chuyen da confirmed', () =>
  assertSucceeds(updateDoc(doc(as(CUST),'bookings','BK-ENDED'), { status:'completed' })));
await check('khach huy pending va mo lai tour trong cung batch', async () => {
  const db = as(CUST);
  const batch = writeBatch(db);
  batch.update(doc(db,'bookings','BK-CANCEL'), { status:'cancelled' });
  batch.update(doc(db,'tours','tour-cancel'), { status:'active', reservedByBookingId:deleteField() });
  await assertSucceeds(batch.commit());
});
await check('nguoi la KHONG doi trang thai booking', () =>
  assertFails(updateDoc(doc(as(OTHER),'bookings','BK-ENDED'), { status:'cancelled' })));

console.log('\n--- SOS chi gui toi admin ---');
const sos = (reporterId=CUST) => ({
  bookingId:BID, reporterId, reporterName:'Cust', reporterRole:'customer',
  customerId:CUST, hostId:HOST, latitude:10.7724, longitude:106.6983,
  accuracyMeters:12, createdAt:serverTimestamp(), status:'active',
});
let sosId;
await check('khach trong booking gui duoc SOS', async () => {
  const ref = await assertSucceeds(addDoc(collection(as(CUST),'sosAlerts'), sos()));
  sosId = ref.id;
});
await check('nguoi la KHONG gia mao SOS', () => assertFails(addDoc(collection(as(OTHER),'sosAlerts'), sos(OTHER))));
await check('KHONG gui duoc toa do ngoai pham vi', () => assertFails(addDoc(collection(as(CUST),'sosAlerts'), { ...sos(), latitude:200 })));
await check('khach KHONG doc duoc hang doi SOS', () => assertFails(getDocs(collection(as(CUST),'sosAlerts'))));
await check('admin doc duoc hang doi SOS', () => assertSucceeds(getDocs(collection(as(ADMIN),'sosAlerts'))));
await check('khach KHONG tu tat SOS', () => assertFails(updateDoc(doc(as(CUST),'sosAlerts',sosId), { status:'cancelled' })));
await check('khach KHONG tu danh dau resolved', async () => {
  const id = 'sos-customer-cannot-resolve';
  await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(),'sosAlerts',id), {
    ...sos(), createdAt:Timestamp.now(),
  }));
  await assertFails(updateDoc(doc(as(CUST),'sosAlerts',id), { status:'resolved' }));
});
await check('admin danh dau resolved', async () => {
  const id = 'sos-admin-can-resolve';
  await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(),'sosAlerts',id), {
    ...sos(), createdAt:Timestamp.now(),
  }));
  await assertSucceeds(updateDoc(doc(as(ADMIN),'sosAlerts',id), { status:'resolved' }));
});

console.log('\n--- danh gia chi sau khi hoan thanh ---');
const review = (bookingId, id=`review_${bookingId}`) => ({
  id, bookingId, tourId:'tour-reserve-ok', userId:CUST, userName:'Cust', userAvatar:'',
  userCountry:'VN', rating:5, date:'2026-08-30', comment:'', tags:[],
});
await check('khach danh gia booking da hoan thanh', () =>
  assertSucceeds(setDoc(doc(as(CUST),'reviews','review_BK-ENDED'), review('BK-ENDED'))));
await check('khach KHONG danh gia booking pending', () =>
  assertFails(setDoc(doc(as(CUST),'reviews','review_BK-FUTURE'), review('BK-FUTURE'))));
await check('khach KHONG tao review thu hai bang id khac', () =>
  assertFails(setDoc(doc(as(CUST),'reviews','review_fake'), review('BK-ENDED','review_fake'))));

console.log(`\n${pass} pass, ${fail} fail`);
await env.cleanup();
process.exit(fail ? 1 : 0);
