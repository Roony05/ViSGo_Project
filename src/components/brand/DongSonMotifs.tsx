/**
 * Vietnamese ornament drawn from the Đông Sơn bronze drum vocabulary.
 *
 * Everything here is decoration, so it is `aria-hidden` and non-interactive.
 * The hard rule is contrast: these sit under real content, and content that
 * becomes harder to read is a net loss no matter how handsome the pattern. The
 * opacities are therefore deliberately low, and nothing here uses the crimson
 * at full strength.
 */

import React from 'react';

/** The star at the centre of every Đông Sơn drum. */
export const DrumStar: React.FC<{ className?: string; rays?: number }> = ({ className, rays = 14 }) => {
  const spikes = Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * Math.PI * 2;
    const half = Math.PI / rays / 1.9;
    const inner = 15;
    const outer = 33;
    const p = (r: number, ang: number) => `${50 + Math.cos(ang) * r},${50 + Math.sin(ang) * r}`;
    return `M ${p(inner, a - half)} L ${p(outer, a)} L ${p(inner, a + half)} Z`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="15" fill="currentColor" />
      <path d={spikes} fill="currentColor" />
      {[41, 45, 48].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="0.8" />
      ))}
      {/* Dotted band, the drum's characteristic ring of punch marks. */}
      <circle
        cx="50"
        cy="50"
        r="43"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeDasharray="1 4"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * The face of a Đông Sơn bronze drum, after the Ngọc Lũ I drum.
 *
 * `DrumStar` above is a single star and a dotted ring — right for a faint
 * watermark behind a page, far too plain to carry a hero. A real drum face is
 * a set of concentric bands, and it is the bands that make it recognisable as
 * Vietnamese rather than as a generic sunburst.
 *
 * Read from the centre outward, matching the original:
 *
 *   1. a fourteen-pointed star, with the feather motif between its rays
 *   2. a ring of saw-teeth
 *   3. the "circle with a dot and a tangent" band, the drum's signature
 *   4. deer walking, alternating with standing long-legged birds
 *   5. a second ring of saw-teeth
 *   6. eighteen Lạc birds in flight, all travelling anticlockwise
 *   7. plain and dotted rings closing the edge
 *
 * Everything is generated from the ray count and a table of radii rather than
 * hand-plotted, so the whole thing stays sharp at any size and the bands cannot
 * drift out of alignment with one another.
 *
 * It is decoration: `aria-hidden`, no interaction, and drawn in `currentColor`
 * so the caller decides how far it sits behind the text.
 */
export const DrumFace: React.FC<{ className?: string; rays?: number }> = ({ className, rays = 14 }) => {
  const C = 200;
  const RAD = Math.PI / 180;
  /** Polar to cartesian, 0° at twelve o'clock. */
  const pt = (r: number, deg: number): [number, number] => [
    C + r * Math.cos((deg - 90) * RAD),
    C + r * Math.sin((deg - 90) * RAD),
  ];
  const xy = (r: number, deg: number): string => pt(r, deg).map((n) => n.toFixed(1)).join(',');

  /**
   * N copies of a shape, evenly spaced around a ring.
   *
   * Each copy is rotated so that **local +x runs along the ring** and local -y
   * points outward. A figure drawn along its own x axis therefore lies flat in
   * the band. Getting this backwards is what sent the first version's birds
   * straight through the rim: they were additionally rotated 90°, which stood
   * every one of them on end.
   */
  const around = (count: number, radius: number, render: (i: number) => React.ReactNode) =>
    Array.from({ length: count }, (_, i) => {
      const deg = (i / count) * 360;
      const [x, y] = pt(radius, deg);
      return (
        <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`}>
          {render(i)}
        </g>
      );
    });

  /* The star: bold triangular rays, with a small chevron in each gap. */
  const starRays = Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * 360;
    const half = (360 / rays / 2) * 0.62;
    return `M ${xy(16, a - half)} L ${xy(60, a)} L ${xy(16, a + half)} Z`;
  }).join(' ');


  const sawtooth = (inner: number, outer: number, teeth: number) =>
    Array.from({ length: teeth }, (_, i) => {
      const a = (i / teeth) * 360;
      const half = 360 / teeth / 2;
      return `M ${xy(inner, a - half)} L ${xy(outer, a)} L ${xy(inner, a + half)} Z`;
    }).join(' ');

  const ring = (r: number, w = 1.6) => (
    <circle key={`r${r}`} cx={C} cy={C} r={r} fill="none" stroke="currentColor" strokeWidth={w} />
  );

  /**
   * One elongated feather: a long thin triangle from a root to a tip.
   *
   * The base has to be perpendicular to the feather's own direction. Laying it
   * flat along y instead — which the first attempt did — collapses every
   * feather that points diagonally, and a bird's wing points diagonally by
   * definition. That is what turned the outer band into a row of blobs.
   */
  const feather = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * w;
    const ny = (dx / len) * w;
    const n = (v: number) => v.toFixed(2);
    // Returns an element, not a path string. Returned as a string it was being
    // dropped into JSX as a text node — SVG renders nothing for that, so every
    // beak, wing feather, tail feather and antler silently disappeared and the
    // bands were left as bare bodies.
    return <path d={`M${n(x1 + nx)} ${n(y1 + ny)} L${n(x2)} ${n(y2)} L${n(x1 - nx)} ${n(y1 - ny)} Z`} />;
  };

  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      {/* 1. the star */}
      <circle cx={C} cy={C} r="16" fill="currentColor" />
      <path d={starRays} fill="currentColor" />

      {ring(66)}
      {ring(70)}

      {/* 2. saw-teeth */}
      <path d={sawtooth(70, 82, 28)} fill="currentColor" />
      {ring(82)}
      {ring(86)}

      {/* 3. the circle-and-tangent band, the drum's signature ornament */}
      {around(16, 97, () => (
        <>
          <circle cx="0" cy="0" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="0" cy="0" r="2.2" fill="currentColor" />
          <path d="M-6.4 -9 L6.4 -9 M-6.4 9 L6.4 9" stroke="currentColor" strokeWidth="1.6" />
        </>
      ))}
      {ring(108)}
      {ring(112)}

      {/* 4. the procession: deer alternating with long-legged birds, walking
             anticlockwise with their feet toward the centre */}
      {around(12, 130, (i) =>
        i % 2 === 0 ? (
          <g fill="currentColor">
            {/* deer */}
            <path d="M-12 -1 C-6 -6, 6 -6, 12 -1 C 6 3, -6 3, -12 -1 Z" />
            <path d="M-11.6 -2 L-18 -9 L-15.4 -11 L-9.6 -4 Z" />
            {feather(-17, -10, -23.4, -19.6, 2)}
            {feather(-20.6, -15, -26.6, -16.4, 1.5)}
            {feather(-15.4, -10.6, -12.4, -20.4, 2)}
            {feather(-13.8, -16.4, -8, -18.6, 1.5)}
            <path d="M-8.6 1.6 L-9.6 13 L-7 13 L-6 2 Z" />
            <path d="M-3.4 2.4 L-4 13 L-1.6 13 L-1 2.6 Z" />
            <path d="M4.6 2.4 L4.4 13 L6.8 13 L6.6 2.4 Z" />
            <path d="M9.4 1.4 L10.6 12.4 L13 12 L11.6 1 Z" />
            {feather(12, -1, 21, -5, 2)}
          </g>
        ) : (
          <g fill="currentColor">
            {/* standing bird */}
            <path d="M-9 0 C-4 -5, 5 -5, 10 -1 C 5 3.4, -4 4, -9 0 Z" />
            <path d="M-8 -1.6 L-13.6 -10 L-11 -11.4 L-5.6 -3.4 Z" />
            <circle cx="-14" cy="-11.6" r="2.8" />
            {feather(-15.6, -12.4, -25, -15, 1.6)}
            {feather(-14.6, -14.4, -13.6, -19, 1.4)}
            <path d="M-5.6 3 L-6.6 13 L-4.2 13 L-3.4 3.2 Z" />
            <path d="M3 3 L2.8 13 L5.2 13 L5.2 2.8 Z" />
            {feather(9.6, -1, 21, -8, 2.2)}
            {feather(9.6, 0.4, 20, -2.6, 1.8)}
          </g>
        ),
      )}
      {ring(148)}
      {ring(152)}

      {/* 5. saw-teeth */}
      <path d={sawtooth(152, 162, 36)} fill="currentColor" />
      {ring(162)}
      {ring(166)}

      {/* 6. eighteen Lạc birds in flight, all anticlockwise.
             Drawn along local x with a half-height of twelve, so the band sits
             inside 164–188 and never reaches the rim. The wing and the tail are
             separate elongated feathers rather than one compound outline —
             those parallel strokes are what makes the shape read as a Đông Sơn
             bird rather than as a smudge. */}
      {around(16, 176, () => (
        <g fill="currentColor">
          {/* Beak — long, straight and thin. It is the single feature that
              makes the silhouette read as a Lạc bird rather than a duck. */}
          {feather(-12, -4, -28, -6.4, 1.5)}
          <circle cx="-10.4" cy="-3.4" r="3.4" />
          {/* crest */}
          {feather(-11.6, -6.6, -14.2, -12.4, 1.4)}
          {feather(-8.4, -6.6, -6.6, -12.2, 1.4)}

          {/* Body: one solid, elongated shape. Three-quarters of the bird's
              weight sits here — the first attempt gave it almost none, so each
              figure came out as a burst of spikes with nothing in the middle. */}
          <path d="M-9 -1.2 C-2 -5.6, 6 -5, 13.4 -0.8 C 6 4.6, -2 4.8, -9 2.4 Z" />

          {/* Wing: a single broad sweep back over the body, notched once,
              rather than a fan of separate quills. */}
          <path d="M-1.6 -3.4 L11 -13.6 L17.4 -9.6 L8.6 -4.6 L13.6 -6.2 L4.4 -0.8 Z" />

          {/* Tail: three broad feathers, close to horizontal. */}
          {feather(12.4, -1.4, 27.6, -5.2, 2.6)}
          {feather(12.6, 0.6, 28.4, 1, 2.4)}
          {feather(12, 2.6, 25.6, 7.4, 2.2)}

          {/* legs tucked back */}
          {feather(3, 4.2, 10.4, 9.4, 1.3)}
        </g>
      ))}
      {ring(191)}

      {/* 7. the rim: two unbroken lines, as cast.
             This was a ring of punched dots, which read as a dotted border
             around the artwork rather than as the edge of a bronze drum. */}
      {ring(194, 2.6)}
      {ring(198, 1.4)}
    </svg>
  );
};

/** A frieze of Lạc birds circling, as used to separate sections. */
export const BirdFrieze: React.FC<{ className?: string; count?: number }> = ({ className, count = 9 }) => (
  <svg viewBox={`0 0 ${count * 40} 24`} className={className} preserveAspectRatio="none" aria-hidden="true">
    {Array.from({ length: count }, (_, i) => (
      <g key={i} transform={`translate(${i * 40} 0) scale(0.19)`} fill="currentColor">
        <path d="M2 44 L32 53 L32 40 Z" />
        <path d="M24 40 C28 30 40 26 50 29 C43 36 37 40 33 43 Z" />
        <circle cx="32" cy="47" r="8.5" />
        <path d="M34 54 C37 64 44 70 55 73 L57 62 C48 60 43 56 41 50 Z" />
        <ellipse cx="68" cy="71" rx="19" ry="11" transform="rotate(-8 68 71)" />
        <path d="M58 64 C60 44 72 29 92 20 C85 38 80 54 80 68 Z" />
        <path d="M84 64 L119 42 L117 56 L86 74 Z" />
        <path d="M83 73 L118 68 L114 80 L82 82 Z" />
      </g>
    ))}
  </svg>
);

/** A stand of bamboo, used down the page margins. */
export const BambooColumn: React.FC<{ className?: string; flip?: boolean }> = ({ className, flip }) => (
  <svg
    viewBox="0 0 120 600"
    className={className}
    preserveAspectRatio="xMidYMax slice"
    aria-hidden="true"
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
  >
    {[
      { x: 22, w: 13, top: 40 },
      { x: 58, w: 9, top: 130 },
      { x: 88, w: 11, top: 78 },
    ].map((cane) => (
      <g key={cane.x} fill="currentColor">
        <rect x={cane.x} y={cane.top} width={cane.w} height={600 - cane.top} rx={cane.w / 2.6} />
        {/* Node rings, spaced up the cane. */}
        {Array.from({ length: 9 }, (_, i) => cane.top + 55 + i * 62).map((y) => (
          <rect key={y} x={cane.x - 2.5} y={y} width={cane.w + 5} height="4.5" rx="2" opacity="0.55" />
        ))}
        {/* Leaf blades, alternating sides. */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = cane.top + 70 + i * 96;
          const dir = i % 2 === 0 ? 1 : -1;
          const len = 46;
          return (
            <path
              key={y}
              d={`M ${cane.x + cane.w / 2} ${y}
                  Q ${cane.x + cane.w / 2 + dir * len * 0.6} ${y - len * 0.5}
                    ${cane.x + cane.w / 2 + dir * len} ${y - len * 0.28}
                  Q ${cane.x + cane.w / 2 + dir * len * 0.55} ${y - len * 0.05}
                    ${cane.x + cane.w / 2} ${y} Z`}
            />
          );
        })}
      </g>
    ))}
  </svg>
);

/** Layered mountains over a river — the "sông núi" of the homeland. */
export const MountainRiver: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1440 260" className={className} preserveAspectRatio="none" aria-hidden="true">
    <path
      d="M0 190 L120 120 L210 165 L330 72 L430 150 L540 105 L660 175 L780 118 L900 168 L1010 96 L1130 158 L1250 112 L1350 165 L1440 128 L1440 260 L0 260 Z"
      fill="currentColor"
      opacity="0.55"
    />
    <path
      d="M0 225 L150 178 L270 214 L390 160 L520 208 L640 172 L770 218 L890 176 L1020 216 L1150 170 L1290 212 L1440 180 L1440 260 L0 260 Z"
      fill="currentColor"
      opacity="0.8"
    />
  </svg>
);
