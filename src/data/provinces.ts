/**
 * The provincial-level units of Vietnam.
 *
 * Two things worth knowing before editing this list.
 *
 * 1. IT IS 34, NOT 63. The National Assembly's 2025 reorganisation merged the
 *    old 63 provinces and centrally-run cities down to 34, effective 1 July
 *    2025. A host picking "Bình Dương" or "Hà Tây" today is picking a place
 *    that no longer exists as an administrative unit, so those names are gone
 *    from the list. Old listings keep whatever string they were saved with —
 *    nothing rewrites stored data — and the free-text escape hatch in
 *    `ProvinceSelect` means nobody is ever blocked by a name we lack.
 *
 * 2. A PROVINCE IS NOT A DESTINATION. Hội An, Sa Pa, Mũi Né and Tam Cốc are
 *    where tours actually happen, and none of them is a province. The city
 *    field answers "which province is this listing filed under"; the meeting
 *    point and the itinerary carry the real address. That is why the picker
 *    accepts anything typed rather than forcing the nearest province.
 *
 * The coordinates are the administrative centre of each unit, to about a
 * kilometre. They exist so a new listing has a sane map pin before the host
 * drops a precise one — HostCreatorStudio used to carry a three-branch ternary
 * that gave every province outside Hanoi and Saigon the coordinates of Da Nang.
 */

export interface Province {
  /** Vietnamese name, as displayed and as stored on a Tour or User. */
  name: string;
  /** English/romanised name, so `hcmc` and `saigon` find the right row. */
  en: string;
  /** 'city' = thành phố trực thuộc trung ương. */
  kind: 'city' | 'province';
  lat: number;
  lng: number;
  /** Extra search keys: former names, well-known towns, common misspellings. */
  aliases?: string[];
}

export const VIETNAM_PROVINCES: Province[] = [
  // ── Sáu thành phố trực thuộc trung ương ──────────────────────────────────
  { name: 'Hà Nội', en: 'Hanoi', kind: 'city', lat: 21.0285, lng: 105.8542, aliases: ['thu do', 'capital', 'ha noi', 'hn'] },
  { name: 'TP. Hồ Chí Minh', en: 'Ho Chi Minh City', kind: 'city', lat: 10.7769, lng: 106.7009, aliases: ['sai gon', 'saigon', 'hcm', 'hcmc', 'tphcm', 'binh duong', 'ba ria vung tau', 'vung tau'] },
  { name: 'Hải Phòng', en: 'Hai Phong', kind: 'city', lat: 20.8449, lng: 106.6881, aliases: ['hai duong', 'cat ba'] },
  { name: 'Đà Nẵng', en: 'Da Nang', kind: 'city', lat: 16.0544, lng: 108.2022, aliases: ['quang nam', 'hoi an', 'my son', 'ba na'] },
  { name: 'Huế', en: 'Hue', kind: 'city', lat: 16.4637, lng: 107.5909, aliases: ['thua thien hue', 'lang co'] },
  { name: 'Cần Thơ', en: 'Can Tho', kind: 'city', lat: 10.0452, lng: 105.7469, aliases: ['hau giang', 'soc trang', 'cai rang'] },

  // ── Hai mươi tám tỉnh ────────────────────────────────────────────────────
  { name: 'An Giang', en: 'An Giang', kind: 'province', lat: 10.3860, lng: 105.4380, aliases: ['kien giang', 'phu quoc', 'chau doc', 'long xuyen', 'rach gia'] },
  { name: 'Bắc Ninh', en: 'Bac Ninh', kind: 'province', lat: 21.1861, lng: 106.0763, aliases: ['bac giang', 'quan ho'] },
  { name: 'Cà Mau', en: 'Ca Mau', kind: 'province', lat: 9.1769, lng: 105.1524, aliases: ['bac lieu', 'dat mui'] },
  { name: 'Cao Bằng', en: 'Cao Bang', kind: 'province', lat: 22.6657, lng: 106.2570, aliases: ['ban gioc', 'pac bo'] },
  { name: 'Điện Biên', en: 'Dien Bien', kind: 'province', lat: 21.3860, lng: 103.0230, aliases: ['dien bien phu', 'muong thanh'] },
  { name: 'Đắk Lắk', en: 'Dak Lak', kind: 'province', lat: 12.7100, lng: 108.2378, aliases: ['buon ma thuot', 'phu yen', 'tuy hoa', 'dac lac'] },
  { name: 'Đồng Nai', en: 'Dong Nai', kind: 'province', lat: 10.9450, lng: 106.8244, aliases: ['bien hoa', 'binh phuoc', 'cat tien'] },
  { name: 'Đồng Tháp', en: 'Dong Thap', kind: 'province', lat: 10.4590, lng: 105.6320, aliases: ['tien giang', 'cao lanh', 'my tho', 'sa dec'] },
  { name: 'Gia Lai', en: 'Gia Lai', kind: 'province', lat: 13.9833, lng: 108.0000, aliases: ['pleiku', 'binh dinh', 'quy nhon'] },
  { name: 'Hà Tĩnh', en: 'Ha Tinh', kind: 'province', lat: 18.3428, lng: 105.9057, aliases: ['huong khe'] },
  { name: 'Hưng Yên', en: 'Hung Yen', kind: 'province', lat: 20.6464, lng: 106.0511, aliases: ['thai binh', 'pho hien'] },
  { name: 'Khánh Hòa', en: 'Khanh Hoa', kind: 'province', lat: 12.2388, lng: 109.1967, aliases: ['nha trang', 'ninh thuan', 'phan rang', 'cam ranh'] },
  { name: 'Lai Châu', en: 'Lai Chau', kind: 'province', lat: 22.3964, lng: 103.4590, aliases: ['sin ho', 'pu ta leng'] },
  { name: 'Lạng Sơn', en: 'Lang Son', kind: 'province', lat: 21.8530, lng: 106.7610, aliases: ['dong dang', 'mau son'] },
  { name: 'Lào Cai', en: 'Lao Cai', kind: 'province', lat: 22.4809, lng: 103.9755, aliases: ['sa pa', 'sapa', 'yen bai', 'mu cang chai', 'fansipan'] },
  { name: 'Lâm Đồng', en: 'Lam Dong', kind: 'province', lat: 11.9404, lng: 108.4583, aliases: ['da lat', 'dalat', 'binh thuan', 'mui ne', 'phan thiet', 'dak nong'] },
  { name: 'Nghệ An', en: 'Nghe An', kind: 'province', lat: 18.6790, lng: 105.6813, aliases: ['vinh', 'kim lien', 'pu mat'] },
  { name: 'Ninh Bình', en: 'Ninh Binh', kind: 'province', lat: 20.2506, lng: 105.9744, aliases: ['tam coc', 'trang an', 'ha nam', 'nam dinh', 'bai dinh'] },
  { name: 'Phú Thọ', en: 'Phu Tho', kind: 'province', lat: 21.3220, lng: 105.4020, aliases: ['viet tri', 'den hung', 'hoa binh', 'vinh phuc', 'mai chau'] },
  { name: 'Quảng Ngãi', en: 'Quang Ngai', kind: 'province', lat: 15.1214, lng: 108.8044, aliases: ['ly son', 'kon tum'] },
  { name: 'Quảng Ninh', en: 'Quang Ninh', kind: 'province', lat: 20.9590, lng: 107.0448, aliases: ['ha long', 'halong', 'bai tu long', 'co to', 'yen tu'] },
  { name: 'Quảng Trị', en: 'Quang Tri', kind: 'province', lat: 16.7500, lng: 107.2000, aliases: ['dong ha', 'quang binh', 'phong nha', 'dong hoi', 'son doong', 'khe sanh', 'dmz'] },
  { name: 'Sơn La', en: 'Son La', kind: 'province', lat: 21.3270, lng: 103.9140, aliases: ['moc chau', 'ta xua'] },
  { name: 'Tây Ninh', en: 'Tay Ninh', kind: 'province', lat: 11.3100, lng: 106.0980, aliases: ['long an', 'nui ba den', 'cao dai', 'moc bai'] },
  { name: 'Thanh Hóa', en: 'Thanh Hoa', kind: 'province', lat: 19.8067, lng: 105.7772, aliases: ['sam son', 'pu luong', 'thanh nha ho'] },
  { name: 'Thái Nguyên', en: 'Thai Nguyen', kind: 'province', lat: 21.5928, lng: 105.8442, aliases: ['bac kan', 'ba be', 'tan cuong'] },
  { name: 'Tuyên Quang', en: 'Tuyen Quang', kind: 'province', lat: 21.8230, lng: 105.2140, aliases: ['ha giang', 'dong van', 'ma pi leng', 'meo vac', 'na hang'] },
  { name: 'Vĩnh Long', en: 'Vinh Long', kind: 'province', lat: 10.2537, lng: 105.9722, aliases: ['ben tre', 'tra vinh', 'cai be'] },
];

/**
 * Strips diacritics and folds đ→d, so "da nang", "Đà Nẵng" and "DANANG" all
 * match. Vietnamese input without tone marks is the normal case on a phone
 * keyboard, and a picker that only matches perfectly-typed Vietnamese is a
 * picker most hosts will abandon for the free-text box.
 */
export function foldVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Provinces matching a query, best-first. An empty query returns all of them. */
export function searchProvinces(query: string): Province[] {
  const q = foldVietnamese(query);
  if (!q) return VIETNAM_PROVINCES;

  const scored: { p: Province; score: number }[] = [];
  for (const p of VIETNAM_PROVINCES) {
    const name = foldVietnamese(p.name);
    const en = foldVietnamese(p.en);
    let score = -1;
    if (name.startsWith(q) || en.startsWith(q)) score = 0;
    else if (name.includes(q) || en.includes(q)) score = 1;
    else if (p.aliases?.some((a) => a.startsWith(q))) score = 2;
    else if (p.aliases?.some((a) => a.includes(q))) score = 3;
    if (score >= 0) scored.push({ p, score });
  }
  return scored.sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name)).map((s) => s.p);
}

/** Centre coordinates for a stored city string, or Hanoi if it is unknown. */
export function coordsForCity(city: string): { lat: number; lng: number } {
  const hit = searchProvinces(city)[0];
  return hit ? { lat: hit.lat, lng: hit.lng } : { lat: 21.0285, lng: 105.8542 };
}
