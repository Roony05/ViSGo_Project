import type { Tour } from '../types';
import { codeFromDisplayName } from '../data/languages';

/** Resolves a tour's guide languages, including legacy Firestore documents. */
export function tourLanguageCodes(tour: Tour): string[] {
  if (tour.tourLanguages?.length) return [...new Set(tour.tourLanguages)];

  const fromDisplay = (tour.languages ?? [])
    .map(codeFromDisplayName)
    .filter((code): code is string => code !== null);
  if (fromDisplay.length) return [...new Set(fromDisplay)];

  if (tour.audience === 'bilingual') return ['vi', 'en'];
  if (tour.audience === 'en') return ['en'];
  return ['vi'];
}

export function tourSpeaks(tour: Tour, code: string): boolean {
  return tourLanguageCodes(tour).includes(code);
}
