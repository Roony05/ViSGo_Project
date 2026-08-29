/** Shared language catalogue for host profiles, tour listings and discovery filters. */
export interface LanguageOption {
  code: string;
  short: string;
  label: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'vi', short: 'Tiếng Việt', label: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳' },
  { code: 'en', short: 'English', label: 'English', flag: '🇬🇧' },
  { code: 'fr', short: 'Français', label: 'Français (French)', flag: '🇫🇷' },
  { code: 'zh', short: 'Mandarin', label: 'Mandarin / Cantonese (中文)', flag: '🇨🇳' },
  { code: 'ja', short: 'Japanese', label: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'ko', short: 'Korean', label: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'de', short: 'Deutsch', label: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'es', short: 'Español', label: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'ru', short: 'Русский', label: 'Русский (Russian)', flag: '🇷🇺' },
  { code: 'it', short: 'Italiano', label: 'Italiano (Italian)', flag: '🇮🇹' },
];

const BY_CODE = new Map(LANGUAGE_OPTIONS.map((option) => [option.code, option]));

export function languageOption(code: string): LanguageOption | undefined {
  return BY_CODE.get(code);
}

export function languageLabel(code: string): string {
  return BY_CODE.get(code)?.short ?? code;
}

/** Maps legacy display names back to stable language codes. */
export function codeFromDisplayName(name: string): string | null {
  const norm = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z]/g, '');
  const normalized = norm(name);
  if (!normalized) return null;

  for (const option of LANGUAGE_OPTIONS) {
    if (
      norm(option.short) === normalized ||
      norm(option.label).startsWith(normalized) ||
      normalized.startsWith(norm(option.short))
    ) {
      return option.code;
    }
  }

  if (normalized.startsWith('french')) return 'fr';
  if (normalized.startsWith('vietnam')) return 'vi';
  if (normalized.startsWith('chinese') || normalized.startsWith('cantonese')) return 'zh';
  return null;
}
