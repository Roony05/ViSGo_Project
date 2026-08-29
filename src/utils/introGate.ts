/**
 * Whether the opening sequence should play — kept in its own module on purpose.
 *
 * The sequence is lazy-loaded: it carries its own stylesheet and the dragon's
 * per-frame geometry builder. Importing the decision from the component would
 * pull all of that into the main bundle for every visitor, including the repeat
 * visits that skip the intro — which is most of them.
 */

const SESSION_KEY = 'visgo_intro_played_v1';

export function shouldSkipIntro(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === '1') return true;
  } catch {
    // Private browsing can throw here; an unreadable flag is not proof the
    // visitor has already seen it, so play the intro.
  }
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function markIntroPlayed(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* At worst the intro plays again next navigation. */
  }
}
