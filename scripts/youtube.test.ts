/**
 * The YouTube link parser, which is a security boundary: its output is the
 * only thing that ever reaches an <iframe src>, so anything it accepts that is
 * not a video id is a script running on somebody else's session.
 *
 *     npm run test:youtube
 */
import { youTubeId, youTubeEmbedUrl, youTubeThumbnail } from '../src/utils/youtube.js';

let pass = 0;
let fail = 0;

const eq = (name: string, actual: unknown, expected: unknown): void => {
  if (actual === expected) {
    console.log('  PASS  ' + name);
    pass += 1;
  } else {
    console.log(`  FAIL  ${name}\n          -> expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    fail += 1;
  }
};

const ID = 'dQw4w9WgXcQ';

console.log('\n=== youtube: link nao duoc nhan ===\n');

eq('watch URL', youTubeId(`https://www.youtube.com/watch?v=${ID}`), ID);
eq('watch URL voi timestamp', youTubeId(`https://www.youtube.com/watch?v=${ID}&t=90s`), ID);
eq('watch URL trong playlist', youTubeId(`https://www.youtube.com/watch?v=${ID}&list=PL123`), ID);
eq('youtu.be', youTubeId(`https://youtu.be/${ID}`), ID);
eq('youtu.be voi query', youTubeId(`https://youtu.be/${ID}?si=abc`), ID);
eq('shorts', youTubeId(`https://www.youtube.com/shorts/${ID}`), ID);
eq('embed', youTubeId(`https://www.youtube.com/embed/${ID}`), ID);
eq('live', youTubeId(`https://www.youtube.com/live/${ID}`), ID);
eq('m.youtube.com', youTubeId(`https://m.youtube.com/watch?v=${ID}`), ID);
eq('nocookie', youTubeId(`https://www.youtube-nocookie.com/embed/${ID}`), ID);
eq('khong co scheme', youTubeId(`youtube.com/watch?v=${ID}`), ID);
eq('co khoang trang thua', youTubeId(`  https://youtu.be/${ID}  `), ID);
eq('id tran', youTubeId(ID), ID);

console.log('\n=== youtube: link nao bi tu choi ===\n');

eq('rong', youTubeId(''), null);
eq('undefined', youTubeId(undefined), null);
eq('javascript:', youTubeId('javascript:alert(1)'), null);
eq('data:', youTubeId('data:text/html,<script>alert(1)</script>'), null);
eq('ten mien gia mao', youTubeId(`https://youtube.com.evil.tld/watch?v=${ID}`), null);
eq('ten mien khac', youTubeId(`https://vimeo.com/watch?v=${ID}`), null);
eq('youtube nhung khong co id', youTubeId('https://www.youtube.com/feed/subscriptions'), null);
eq('id sai do dai', youTubeId('https://www.youtube.com/watch?v=short'), null);
eq('id co ky tu la', youTubeId('https://www.youtube.com/watch?v=abc<script>d'), null);
eq('chi la chu', youTubeId('khong phai link'), null);

console.log('\n=== youtube: url phat ===\n');

const embed = youTubeEmbedUrl(ID);
eq('dung host nocookie', embed.startsWith('https://www.youtube-nocookie.com/embed/' + ID), true);
eq('khong goi y video ngoai kenh', embed.includes('rel=0'), true);
eq('khong tu dong phat', embed.includes('autoplay'), false);
eq('autoplay khi duoc yeu cau', youTubeEmbedUrl(ID, true).includes('autoplay=1'), true);

console.log('\n=== youtube: video co that hay khong ===\n');

/*
  The probe itself needs a browser (it measures an <img>), so what is checked
  here is the fact it rests on: YouTube serves a 480x360 thumbnail for a real
  video and a 120x90 grey placeholder for one it does not have. Eight invented
  ids once shipped as this site's default content; this is the assertion that
  would have caught them.
*/
const thumbBytes = async (id: string): Promise<number> => {
  const res = await fetch(youTubeThumbnail(id));
  return (await res.arrayBuffer()).byteLength;
};

const REAL = 'T4IcTq9YQ8Y';   // "The ULTIMATE Da Nang, Vietnam Travel Guide"
const FAKE = '9_dqwH1-80I';   // one of the fabricated defaults

const realBytes = await thumbBytes(REAL);
const fakeBytes = await thumbBytes(FAKE);
eq('anh that lon hon 10 KB', realBytes > 10_000, true);
eq('anh gia nho hon 3 KB', fakeBytes < 3_000, true);
eq('phan biet duoc that/gia', realBytes > fakeBytes * 5, true);

console.log(`          (that ${realBytes} bytes vs gia ${fakeBytes} bytes)`);

console.log(`\n================  ${pass} PASS / ${fail} FAIL  ================\n`);
process.exit(fail ? 1 : 0);
