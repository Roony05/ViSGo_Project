import type { Language } from '../types';

export type DetectedLanguage = string;

const SCRIPT_TESTS: Array<[string, RegExp]> = [
  ['ja', /[぀-ヿ]/],
  ['ko', /[가-힯ᄀ-ᇿ]/],
  ['zh', /[一-鿿]/],
  ['ru', /[Ѐ-ӿ]/],
  ['th', /[฀-๿]/],
  ['ar', /[؀-ۿ]/],
];

const VI_DIACRITICS =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const VI_STOPWORDS = [' khong ', ' cua ', ' duoc ', ' minh ', ' ban ', ' gi ', ' the nao ', ' bao nhieu '];
const EN_STOPWORDS = [' the ', ' is ', ' are ', ' what ', ' how ', ' can ', ' i ', ' you ', ' do ', ' me '];

export function detectMessageLanguage(text: string): DetectedLanguage {
  const raw = (text ?? '').trim();
  if (raw.length < 2) return 'und';

  for (const [code, test] of SCRIPT_TESTS) {
    if (test.test(raw)) return code;
  }
  if (VI_DIACRITICS.test(raw)) return 'vi';

  const padded = ` ${raw.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
  const vi = VI_STOPWORDS.filter((word) => padded.includes(word)).length;
  const en = EN_STOPWORDS.filter((word) => padded.includes(word)).length;
  if (vi > en) return 'vi';
  if (en > 0) return 'en';
  return 'und';
}

export function offlineReplyLanguage(text: string, uiLanguage: Language): Language {
  const detected = detectMessageLanguage(text);
  return detected === 'vi' || detected === 'en' ? detected : uiLanguage;
}
