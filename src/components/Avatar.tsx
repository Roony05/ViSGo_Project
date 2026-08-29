import React, { useEffect, useState } from 'react';
import { isAvatarRef, loadAvatar, resolveAvatar, subscribeAvatars } from '../utils/avatarStore';

/**
 * One profile picture.
 *
 * Every avatar in the app goes through here because the value it is handed may
 * be any of four things, and only two of them are an `<img src>`:
 *
 *   https://…            a linked picture (seeded hosts, a Google account photo)
 *   data:image/jpeg;…    a legacy inline upload, from before pictures were split out
 *   avatar:<uid>:<ver>   a reference to `avatars/{uid}` — fetched once, then cached
 *   ''                   no picture at all
 *
 * A reference resolves asynchronously, so this renders the person's initials
 * until the picture arrives. That placeholder is also what a broken link falls
 * back to: the app used to paper over a missing avatar with a stock Unsplash
 * portrait, which put a photograph of a real stranger on someone else's
 * account. Initials are honest and cost nothing.
 *
 * See `src/utils/avatarStore.ts` for why the picture is not simply stored on
 * the profile.
 */
interface AvatarProps {
  /** Whatever the document carries: a URL, a data URL, or an `avatar:` reference. */
  src?: string | null;
  /** Used for the initials placeholder, and as the alt text when none is given. */
  name?: string;
  alt?: string;
  /** Sizing and shape come from the caller, exactly as they did on the old <img>. */
  className?: string;
  title?: string;
}

/** Up to two letters: "Nguyễn Thị Linh" → "NL", "linh.host" → "L". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * A stable colour per person, so two placeholders side by side are telling
 * apart rather than a wall of identical grey circles.
 */
const PLACEHOLDER_TONES: ReadonlyArray<readonly [string, string]> = [
  ['#991B1B', '#FFFFFF'],
  ['#D4AF37', '#1C1917'],
  ['#047857', '#FFFFFF'],
  ['#075985', '#FFFFFF'],
  ['#44403C', '#FFFFFF'],
  ['#C2410C', '#FFFFFF'],
];

function toneOf(seed: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_TONES[hash % PLACEHOLDER_TONES.length];
}

export const Avatar: React.FC<AvatarProps> = ({ src, name = '', alt, className = '', title }) => {
  const [resolved, setResolved] = useState(() => resolveAvatar(src));
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let alive = true;
    setBroken(false);

    const immediate = resolveAvatar(src);
    setResolved(immediate);

    if (!immediate && isAvatarRef(src)) {
      void loadAvatar(src).then((url) => {
        if (alive) setResolved(url);
      });
    }

    // Covers the picture arriving because some *other* card asked for it, and
    // the owner replacing their photograph while this one is on screen.
    const unsubscribe = subscribeAvatars(() => {
      if (!alive) return;
      const next = resolveAvatar(src);
      if (next) setResolved(next);
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [src]);

  if (resolved && !broken) {
    return (
      <img
        src={resolved}
        alt={alt ?? name}
        title={title}
        loading="lazy"
        onError={() => setBroken(true)}
        className={className}
      />
    );
  }

  // Drawn as SVG rather than styled text: the callers size this with Tailwind
  // classes from `w-6` to `w-24`, and a viewBox scales the letters with the
  // circle where a CSS font-size — inherited from whatever the parent happens
  // to be — would not.
  const [background, foreground] = toneOf(name || String(src ?? ''));
  const label = alt || name;

  return (
    <svg
      viewBox="0 0 40 40"
      role={label ? 'img' : 'presentation'}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      {title && <title>{title}</title>}
      <rect width="40" height="40" fill={background} />
      <text
        x="20"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="16"
        fontWeight="700"
        fontFamily="inherit"
        fill={foreground}
      >
        {initialsOf(name)}
      </text>
    </svg>
  );
};
