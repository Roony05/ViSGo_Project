/**
 * Encyclopaedia lookup for Vietnamese places, used to widen what ViS-AI can
 * answer without widening what it is allowed to make up.
 *
 * WHY THIS EXISTS. Asked "Hà Nội là nơi nào, nằm ở đâu", the assistant had two
 * bad options: refuse, because the question is not about a tour, or answer from
 * the model's own memory, which is exactly the ungrounded guessing the rest of
 * ragEngine.ts is built to prevent. This gives it a third: fetch a paragraph
 * about the actual place, hand it over as data, and let the answer close with
 * the tours ViS-Go really has there.
 *
 * WHY WIKIPEDIA AND NOT A SEARCH API. Every general web-search API worth using
 * — Google Custom Search, Bing, Brave, Serper — needs a key, and every one of
 * them needs a card behind the key past a small free tier. Wikipedia's REST
 * summary endpoint needs neither: no key, no account, no billing, unlimited for
 * normal use, and it sends `Access-Control-Allow-Origin: *` so the browser can
 * call it directly with no server of ours in the middle. It is also the one
 * source where a wrong answer is a public, correctable fact rather than an SEO
 * page. Vietnamese first, English as the fallback.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not search for arbitrary text. A
 * place has to be recognised from the fixed index below before any request is
 * made, so a question about something else never becomes an outbound HTTP call,
 * and no user text is ever forwarded to a third party verbatim.
 */

import { foldVietnamese, VIETNAM_PROVINCES } from '../data/provinces';

export interface PlaceFact {
  /** Wikipedia's own title for the article. */
  title: string;
  /** One-line description, e.g. "thủ đô của Việt Nam". */
  description: string;
  /** The lead paragraph, trimmed. */
  extract: string;
  /** Article URL, shown as the citation. */
  url: string;
  lang: 'vi' | 'en';
}

/**
 * Places worth looking up, beyond the 34 provinces.
 *
 * A province is not where people go. "Hội An" is filed under Đà Nẵng and "Sa
 * Pa" under Lào Cai, so matching the query to a province and then looking THAT
 * up would answer a question about Hội An with an article about Đà Nẵng. These
 * are matched as themselves.
 */
const LANDMARKS = [
  'Hội An', 'Sa Pa', 'Đà Lạt', 'Hạ Long', 'Vịnh Hạ Long', 'Phú Quốc', 'Nha Trang',
  'Mũi Né', 'Phan Thiết', 'Vũng Tàu', 'Côn Đảo', 'Cát Bà', 'Tam Đảo', 'Ba Vì',
  'Phong Nha-Kẻ Bàng', 'Sơn Đoòng', 'Tràng An', 'Tam Cốc', 'Chùa Bái Đính',
  'Mộc Châu', 'Mù Cang Chải', 'Đồng Văn', 'Hà Giang', 'Mai Châu', 'Pù Luông',
  'Hồ Hoàn Kiếm', 'Văn Miếu - Quốc Tử Giám', 'Chùa Một Cột', 'Lăng Chủ tịch Hồ Chí Minh',
  'Phố cổ Hà Nội', 'Hồ Tây', 'Chùa Trấn Quốc', 'Nhà thờ Lớn Hà Nội',
  'Chợ Bến Thành', 'Dinh Độc Lập', 'Địa đạo Củ Chi', 'Nhà thờ Đức Bà Sài Gòn',
  'Chợ Lớn', 'Bưu điện trung tâm Sài Gòn', 'Bến Nhà Rồng',
  'Bà Nà', 'Ngũ Hành Sơn', 'Bán đảo Sơn Trà', 'Cầu Rồng', 'Mỹ Sơn',
  'Kinh thành Huế', 'Chùa Thiên Mụ', 'Lăng Tự Đức', 'Đèo Hải Vân',
  'Buôn Ma Thuột', 'Pleiku', 'Quy Nhơn', 'Lý Sơn', 'Cần Giờ', 'Đồng bằng sông Cửu Long',
  'Chợ nổi Cái Răng', 'Thác Bản Giốc', 'Hồ Ba Bể', 'Fansipan', 'Yên Tử',
];

/** Every name we are willing to look up, longest first so the match is specific. */
const PLACE_INDEX: { name: string; folded: string }[] = [
  ...VIETNAM_PROVINCES.map((p) => p.name),
  ...LANDMARKS,
  'Việt Nam',
]
  .map((name) => ({ name, folded: foldVietnamese(name) }))
  .sort((a, b) => b.folded.length - a.folded.length);

/**
 * The place a question is about, or null.
 *
 * Longest match wins, so "Phố cổ Hà Nội" is not answered with the article on
 * Hà Nội, and "Việt Nam" only wins when nothing more specific was named.
 */
export function detectVietnamPlace(query: string): string | null {
  const q = foldVietnamese(query);
  if (!q) return null;
  for (const entry of PLACE_INDEX) {
    // Word-boundary-ish: a place name has to start at a word break, so "hue"
    // does not match inside "chuyen" and "sapa" does not match "sapally".
    const at = q.indexOf(entry.folded);
    if (at === -1) continue;
    const before = at === 0 ? ' ' : q[at - 1];
    if (/[a-z0-9]/.test(before)) continue;
    return entry.name;
  }
  return null;
}

/**
 * Questions that want an encyclopaedia rather than the catalogue.
 *
 * Naming a place is not enough on its own — "tour ở Hà Nội giá bao nhiêu" is a
 * catalogue question and pulling an article about the city into it would only
 * pad the answer. The lookup runs when the question asks what or where a place
 * is, what is there, or what it is known for.
 */
const CURIOSITY = [
  'la noi nao', 'la o dau', 'nam o dau', 'o dau', 'la gi', 'la thanh pho gi',
  'the nao', 'gioi thieu', 'tim hieu', 'lich su', 'van hoa', 'noi tieng',
  'co gi', 'nen di dau', 'choi gi', 'khu vui choi', 'dia diem', 'diem den',
  'tham quan', 'du lich gi', 'dac san', 'an gi', 'thoi tiet', 'bao nhieu dan',
  'dan so', 'dien tich', 'thuoc tinh nao', 've ',
  'where is', 'what is', 'tell me about', 'about ', 'history', 'culture',
  'famous', 'what to do', 'things to do', 'attractions', 'known for',
];

export function wantsPlaceBackground(query: string): boolean {
  const q = foldVietnamese(query);
  return CURIOSITY.some((k) => q.includes(k));
}

/**
 * Answers already fetched this session.
 *
 * Two people asking about Hà Nội, or one person asking twice, is one request.
 * `sessionStorage` rather than `localStorage`: an article can be edited, and a
 * cache that survives for months would quietly go stale.
 */
const memory = new Map<string, PlaceFact | null>();

function readSession(key: string): PlaceFact | null | undefined {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return undefined;
    return raw === 'null' ? null : (JSON.parse(raw) as PlaceFact);
  } catch {
    return undefined;
  }
}

function writeSession(key: string, value: PlaceFact | null): void {
  try {
    window.sessionStorage.setItem(key, value ? JSON.stringify(value) : 'null');
  } catch {
    // A private window with storage disabled is not a reason to fail a lookup.
  }
}

async function fetchSummary(wiki: 'vi' | 'en', title: string): Promise<PlaceFact | null> {
  const controller = new AbortController();
  // Short on purpose. This runs before the model call, so every second here is
  // a second the person watches a typing indicator for nothing. An answer
  // without the background paragraph is much better than a slow one.
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const res = await fetch(
      `https://${wiki}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: controller.signal, headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      type?: string;
      title?: string;
      description?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    // 'disambiguation' means the title matched several articles; none of them
    // is the answer, and the summary text is just a list of links.
    if (!data.extract || data.type === 'disambiguation') return null;
    return {
      title: data.title ?? title,
      description: data.description ?? '',
      // Two or three sentences is what a chat answer can carry. The rest of the
      // lead paragraph would be padding the reader scrolls past.
      extract: data.extract.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ').trim(),
      url: data.content_urls?.desktop?.page ?? `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      lang: wiki,
    };
  } catch {
    // Offline, blocked, or too slow. The caller carries on without it.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Looks a place up, preferring the reader's own language. */
export async function lookupPlace(place: string, language: 'vi' | 'en'): Promise<PlaceFact | null> {
  const key = `visgo_place_${language}_${place}`;
  if (memory.has(key)) return memory.get(key) ?? null;

  const stored = readSession(key);
  if (stored !== undefined) {
    memory.set(key, stored);
    return stored;
  }

  const order: ('vi' | 'en')[] = language === 'vi' ? ['vi', 'en'] : ['en', 'vi'];
  let found: PlaceFact | null = null;
  for (const wiki of order) {
    found = await fetchSummary(wiki, place);
    if (found) break;
  }

  memory.set(key, found);
  writeSession(key, found);
  return found;
}
