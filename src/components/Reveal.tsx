import React, { useEffect, useRef, useState } from 'react';

/**
 * Reveals its children whenever they scroll into view.
 *
 * The page is a long vertical read — hero, then films, then the catalogue — and
 * without this every section below the fold is simply already there when you
 * arrive at it. Moving each one a short distance as it enters tells you it is
 * new, which is the whole trick behind the pages this was modelled on.
 *
 * It plays in BOTH directions: a section that leaves the viewport is reset, so
 * scrolling back up re-runs the same arrival. The observer therefore stays
 * connected for the life of the component instead of disconnecting on the first
 * hit.
 *
 * TWO THINGS IT DELIBERATELY DOES NOT DO.
 *
 *   - It never hides content that cannot animate. If `IntersectionObserver` is
 *     missing, everything renders visible immediately — an effect failing must
 *     not take the page's content with it.
 *
 *   - It respects `prefers-reduced-motion`. Movement across a whole page is
 *     exactly the kind that triggers vestibular symptoms, and the setting
 *     exists to be honoured, not detected and ignored.
 */
interface RevealProps {
  children: React.ReactNode;
  /** Where it travels in from. */
  from?: 'bottom' | 'left' | 'right';
  /** Milliseconds to wait, so a row of cards arrives one after another. */
  delay?: number;
  className?: string;
}

/** True when the visitor has asked the system for less animation. */
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const OFFSET: Record<NonNullable<RevealProps['from']>, string> = {
  bottom: 'translateY(2.25rem)',
  left: 'translateX(-3rem)',
  right: 'translateX(3rem)',
};

export const Reveal: React.FC<RevealProps> = ({ children, from = 'bottom', delay = 0, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  // Locked visible when there is nothing to animate with, so the content is
  // never left hidden by a capability check that failed.
  const [locked] = useState(
    () => prefersReducedMotion() || typeof IntersectionObserver === 'undefined',
  );
  const [shown, setShown] = useState(locked);

  useEffect(() => {
    if (locked) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setShown(entry.isIntersecting);
      },
      // A little way in from the bottom edge: starting exactly at the edge means
      // the movement finishes off-screen and the visitor never sees it. The top
      // edge is left alone so a section only resets once it has fully left.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [locked]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : OFFSET[from],
        transition: 'opacity 620ms cubic-bezier(0.22, 1, 0.36, 1), transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
        // The stagger is for arrivals only; on the way out everything should
        // clear together rather than trickle.
        transitionDelay: shown ? `${delay}ms` : '0ms',
        // Without this the browser rasterises the moving layer at its final
        // size only, and text arrives visibly blurred on the way in.
        willChange: locked ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};
