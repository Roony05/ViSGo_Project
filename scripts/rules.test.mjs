import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, setDoc, getDoc, addDoc, collection, updateDoc, deleteDoc,
  serverTimestamp, Timestamp, getDocs, query, orderBy, limit,
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
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

let pass=0, fail=0;
const check = async (name, fn) => {
  try { await fn(); console.log('  PASS  ' + name); pass++; }
  catch (e) { console.log('  FAIL  ' + name + '  -> ' + (e?.message||e).toString().slice(0,110)); fail++; }
};
const convo = (db) => doc(db,'conversations',BID);
const msgs  = (db) => collection(db,'conversations',BID,'messages');
const NEW = { bookingId:BID, participants:[CUST,HOST], tourTitle:'T', city:'Hà Nội',
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

console.log(`\n${pass} pass, ${fail} fail`);
await env.cleanup();
process.exit(fail ? 1 : 0);
