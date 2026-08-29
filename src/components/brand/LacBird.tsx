/**
 * Chim Lạc — the ViS-Go mark.
 *
 * Drawn to the polished-gold reference the user supplied: a sculpted bird in
 * flight, not a bronze-drum rubbing. An earlier version traced the Ngọc Lũ drum
 * literally — body as two parallel strokes, wings as hatched combs — which was
 * archaeologically right and visually wrong here: at the sizes this mark is used
 * it read as a twig with a rake stuck to it.
 *
 * What carries this version instead:
 *
 *   - One long unbroken line from beak tip to tail tip. The beak is a needle
 *     nearly as long as the body, and it is the first thing the eye follows.
 *   - A single great wing of layered primaries sweeping up and back. Feathers
 *     are separate leaves that overlap, each with its own highlight, so the wing
 *     has depth. One solid blade reads as a paper dart.
 *   - Three flat tail streamers with chiselled ends, fanned just enough to
 *     separate.
 *   - Every part lit from the same direction: a bright ridge along each upper
 *     edge, shadow beneath. That single consistent light is what makes flat
 *     vector shapes read as cast metal rather than as coloured paper.
 *
 * The bird flies to the right — beak leading — because every placement in the
 * app (navbar, sidebar, backdrop, intro) was laid out around that.
 *
 * Geometry is generated, not hand-authored: feathers are leaves swept along
 * cubics, and a wing is a fan of them interpolated between a leading and a
 * trailing edge. Hand-placing a dozen overlapping feathers by eye produces a
 * wing that fans unevenly, and every later adjustment means moving all of them.
 *
 * Everything is computed once at module load, not per render — the mark is
 * static. It never animates itself either: a component that animates itself
 * cannot be frozen at a chosen moment for review, and the same mark has to sit
 * still in the navbar. The parts that fly are wrapped in named groups —
 * `lac-wing-upper`, `lac-wing-lower`, `lac-tailfan` — each with its
 * transform-origin at the joint it pivots on, and whoever wants it flying
 * supplies the keyframes. Two callers do: the opening sequence, with its own
 * scene stylesheet, and the `.lac-flap` class in `index.css` for a bird that
 * hovers gently in place.
 *
 * Two rendering modes, because this mark has two jobs:
 *
 *   - Default (no `color`): the full gold illustration with modelling.
 *   - `color` given: every shape collapses to that flat colour and the
 *     modelling passes are dropped. Gradients stop resolving at favicon size and
 *     a two-tone mark on a coloured chip looks muddy, so small placements pass
 *     one colour instead.
 *
 * Gradient ids are namespaced with useId(): several instances appear on one
 * page (navbar, sidebar, footer) and duplicate SVG ids silently make every
 * later instance sample the first one's gradient.
 */

import React from 'react';

interface LacBirdProps {
  className?: string;
  /** Flat-colour override. Omit for the full gold artwork. */
  color?: string;
  title?: string;
}

type Pt = [number, number];

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

const r1 = (v: number) => Math.round(v * 10) / 10;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Point on a cubic Bézier. */
function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** Unit normal of that cubic, pointing to the curve's left. */
function nrm(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const m = Math.hypot(dx, dy) || 1;
  return [dy / m, -dx / m];
}

/**
 * A ribbon along a cubic between two lateral offsets, given as fractions of the
 * local half-width. (-1, 1) is the whole shape; a narrower pair is a highlight
 * running inside it.
 */
function ribbon(
  p: [Pt, Pt, Pt, Pt],
  width: (t: number) => number,
  kIn: number,
  kOut: number,
  steps = 26,
): string {
  const a: string[] = [];
  const b: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = bez(p[0], p[1], p[2], p[3], t);
    const [nx, ny] = nrm(p[0], p[1], p[2], p[3], t);
    const w = width(t);
    a.push(`${r1(x + nx * w * kIn)} ${r1(y + ny * w * kIn)}`);
    b.push(`${r1(x + nx * w * kOut)} ${r1(y + ny * w * kOut)}`);
  }
  return `M${a.join(' L')} L${b.reverse().join(' L')} Z`;
}

/**
 * One feather: a leaf swept along a cubic, pointed at the tip and narrowing
 * again at the quill so it tucks under its neighbour instead of ending in a
 * blunt stub.
 */
function feather(a: Pt, c1: Pt, c2: Pt, b: Pt, w: number, kIn = -1, kOut = 1): string {
  const width = (t: number) => w * Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)), 0.55);
  return ribbon([a, c1, c2, b], width, kIn, kOut, 18);
}

/**
 * A fan of feathers between a leading and a trailing edge.
 *
 * `k` runs 0 at the leading (upper) feather to 1 at the trailing (lower) one;
 * roots and tips are both interpolated, so the fan opens evenly however the two
 * edges are placed. `bow` curves each feather back along its own length, which
 * is what stops the fan reading as a starburst.
 */
function wingFan(
  rootLead: Pt,
  rootTrail: Pt,
  tipLead: Pt,
  tipTrail: Pt,
  n: number,
  w: (k: number) => number,
  bow: number,
): { d: string; lit: string }[] {
  const out: { d: string; lit: string }[] = [];
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1);
    const root = lerp(rootLead, rootTrail, k);
    const tip = lerp(tipLead, tipTrail, k);
    const dx = tip[0] - root[0];
    const dy = tip[1] - root[1];
    const m = Math.hypot(dx, dy) || 1;
    const px = -dy / m;
    const py = dx / m;
    const c1: Pt = [root[0] + dx * 0.34 + px * bow, root[1] + dy * 0.34 + py * bow];
    const c2: Pt = [root[0] + dx * 0.72 + px * bow * 0.7, root[1] + dy * 0.72 + py * bow * 0.7];
    out.push({
      d: feather(root, c1, c2, tip, w(k)),
      // The lit pass is the same leaf held to its upper half, so the highlight
      // follows the feather's own curve instead of being a straight stripe.
      lit: feather(root, c1, c2, tip, w(k), 0.1, 0.9),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The bird                                                            */
/* ------------------------------------------------------------------ */

/** Body: head end at t=0, tail root at t=1. */
const BODY_SPINE: [Pt, Pt, Pt, Pt] = [
  [230, 66],
  [200, 80],
  [154, 93],
  [112, 97],
];
const bodyW = (t: number) => 1.8 + 4.6 * Math.sin(Math.PI * Math.min(1, 0.16 + t * 0.72));

const BODY = ribbon(BODY_SPINE, bodyW, -1, 1);
/**
 * The modelling passes taper to nothing at both ends.
 *
 * Given the body's own width they ended in blunt square cuts, and the cut at the
 * head end sat right under the throat as a stepped tab — the one thing on the
 * bird that read as a mistake rather than as shading.
 */
const modelW = (t: number) => bodyW(t) * Math.pow(Math.sin(Math.PI * t), 0.6);
const BODY_LIT = ribbon(BODY_SPINE, modelW, -0.9, -0.1);
const BODY_SHADE = ribbon(BODY_SPINE, modelW, 0.45, 1);

/** Joints the moving parts pivot on. */
const SHOULDER: Pt = [196, 78];
const FORE_JOINT: Pt = [218, 68];
const TAIL_ROOT: Pt = [114, 96];

/**
 * The great wing. The leading edge runs from the shoulder up and back to the far
 * tip; the trailing edge is shorter and drops away, which is what sweeps it.
 *
 * Both roots sit *inside* the body outline. Placed on the body's lower edge the
 * trailing quills poked out under the throat as a little stepped nub — the only
 * thing on the bird that read as a fault rather than as form.
 */
const WING = wingFan([190, 72], [203, 81], [42, 38], [98, 82], 6, (k) => 7.4 - 3.2 * k, 15);
/** Coverts: the short overlapping feathers that cover the wing's roots. */
const COVERTS = wingFan([192, 70], [201, 79], [128, 52], [156, 78], 4, (k) => 5.4 - 1.4 * k, 9);
/** A short fore-wing above the neck, the small blade the reference carries. */
const FOREWING = wingFan([216, 63], [223, 70], [166, 46], [184, 64], 3, () => 3.8, 7);

/** Three flat tail streamers with chiselled ends. */
const TAIL = [0, 1, 2].map((i) => {
  const root: Pt = [116 - i * 2, 92 + i * 5];
  const tip: Pt = [10 + i * 4, 80 + i * 14];
  const dx = tip[0] - root[0];
  const dy = tip[1] - root[1];
  const m = Math.hypot(dx, dy);
  const px = (-dy / m) * (3.6 - i * 0.4);
  const py = (dx / m) * (3.6 - i * 0.4);
  // The tip is cut at a slant, the way the reference chisels each streamer.
  const cut: Pt = [tip[0] + (dx / m) * 7, tip[1] + (dy / m) * 7];
  return {
    d:
      `M${r1(root[0] + px)} ${r1(root[1] + py)}` +
      ` L${r1(tip[0] + px * 0.86)} ${r1(tip[1] + py * 0.86)}` +
      ` L${r1(cut[0] - px * 0.5)} ${r1(cut[1] - py * 0.5)}` +
      ` L${r1(root[0] - px)} ${r1(root[1] - py)} Z`,
    lit:
      `M${r1(root[0] + px * 0.8)} ${r1(root[1] + py * 0.8)}` +
      ` L${r1(tip[0] + px * 0.7)} ${r1(tip[1] + py * 0.7)}` +
      ` L${r1(tip[0] + px * 0.2)} ${r1(tip[1] + py * 0.2)}` +
      ` L${r1(root[0] + px * 0.25)} ${r1(root[1] + py * 0.25)} Z`,
  };
});

export const LacBird: React.FC<LacBirdProps> = ({ className, color, title }) => {
  const uid = React.useId().replace(/:/g, '');
  const flat = Boolean(color);
  const f = (id: string) => (flat ? color : `url(#${uid}-${id})`);
  const solid = (c: string) => (flat ? color : c);
  /** Modelling passes are dropped in flat mode — they only muddy a small chip. */
  const model = (node: React.ReactNode) => (flat ? null : node);

  return (
    <svg
      viewBox="0 0 300 150"
      className={className}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}

      {!flat && (
        <defs>
          {/* One light direction for the whole bird: bright along the upper
              edges, deepening underneath. Every gradient below is a slice of
              that same ramp, which is what makes the parts read as one cast
              object rather than as separately coloured shapes. */}
          <linearGradient id={`${uid}-gold`} x1="150" y1="34" x2="170" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE9A8" />
            <stop offset="0.3" stopColor="#FBCE4E" />
            <stop offset="0.68" stopColor="#E8A81E" />
            <stop offset="1" stopColor="#B87710" />
          </linearGradient>
          <linearGradient id={`${uid}-wing`} x1="60" y1="40" x2="200" y2="104" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFF0BE" />
            <stop offset="0.34" stopColor="#FBCE4E" />
            <stop offset="0.74" stopColor="#E5A31C" />
            <stop offset="1" stopColor="#C0800F" />
          </linearGradient>
          <linearGradient id={`${uid}-tail`} x1="20" y1="80" x2="120" y2="116" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE49A" />
            <stop offset="0.5" stopColor="#EFB52E" />
            <stop offset="1" stopColor="#C4830F" />
          </linearGradient>
          <linearGradient id={`${uid}-beak`} x1="238" y1="66" x2="296" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F6C63C" />
            <stop offset="0.6" stopColor="#FBD965" />
            <stop offset="1" stopColor="#FFEFB6" />
          </linearGradient>
          {/* The specular ridge. Warm, never white: gold lit hard goes pale
              gold, and a white highlight on gold reads as plastic. */}
          <linearGradient id={`${uid}-lit`} x1="120" y1="40" x2="180" y2="104" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFBE4" stopOpacity="0.9" />
            <stop offset="0.55" stopColor="#FFF0BA" stopOpacity="0.45" />
            <stop offset="1" stopColor="#FFF0BA" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}

      {/* --- Tail, behind everything --------------------------------------- */}
      <g className="lac-tailfan" style={{ transformOrigin: `${TAIL_ROOT[0]}px ${TAIL_ROOT[1]}px` }}>
        {TAIL.map((t, i) => (
          <g key={i}>
            <path d={t.d} fill={f('tail')} />
            {model(<path d={t.lit} fill={`url(#${uid}-lit)`} opacity={0.5 - i * 0.1} />)}
          </g>
        ))}
      </g>

      {/* --- Body ----------------------------------------------------------- */}
      {/* Neck first, so the body covers its root and only the span between body
          and head shows. Drawn over the body it left a loose tab hanging under
          the throat. */}
      <path d="M206 76 C214 68 223 62 233 59 L236 66 C227 69 218 75 211 81 Z" fill={f('gold')} />
      <path d={BODY} fill={f('gold')} />
      {model(<path d={BODY_SHADE} fill="#A96C0C" opacity={0.35} />)}
      {model(<path d={BODY_LIT} fill={`url(#${uid}-lit)`} opacity={0.75} />)}

      {/* --- The great wing -------------------------------------------------- */}
      {/* The leading feather is painted last so each overlaps the one behind it,
          which is the whole reason the wing has depth. */}
      <g className="lac-wing-upper" style={{ transformOrigin: `${SHOULDER[0]}px ${SHOULDER[1]}px` }}>
        {[...WING].reverse().map((w, i) => (
          <g key={i}>
            <path d={w.d} fill={f('wing')} />
            {model(<path d={w.lit} fill={`url(#${uid}-lit)`} opacity={0.42} />)}
          </g>
        ))}
        {COVERTS.map((w, i) => (
          <g key={`c${i}`}>
            <path d={w.d} fill={f('wing')} />
            {model(<path d={w.lit} fill={`url(#${uid}-lit)`} opacity={0.5} />)}
          </g>
        ))}
        {/* Shoulder: a mound that follows the body's own upper edge, tapering
            away down the back. Drawn as a circle it read as a third lump in a
            row of lumps — head, ball, body. */}
        <path
          d="M216 70 C206 63 188 62 168 68 C150 73 138 82 132 90
             C146 86 162 83 180 83 C196 83 208 79 216 70 Z"
          fill={f('gold')}
        />
        {model(
          <path
            d="M214 71 C204 66 188 65 170 70 C154 75 143 82 137 88
               C148 82 162 78 178 77 C193 77 205 76 214 71 Z"
            fill={`url(#${uid}-lit)`}
            opacity={0.55}
          />,
        )}
      </g>

      {/* --- Fore-wing above the neck ---------------------------------------- */}
      <g className="lac-wing-lower" style={{ transformOrigin: `${FORE_JOINT[0]}px ${FORE_JOINT[1]}px` }}>
        {FOREWING.map((w, i) => (
          <g key={i}>
            <path d={w.d} fill={f('wing')} opacity={flat ? 1 : 0.94} />
            {model(<path d={w.lit} fill={`url(#${uid}-lit)`} opacity={0.4} />)}
          </g>
        ))}
      </g>

      {/* --- Head and beak ---------------------------------------------------- */}
      {/* Head: small and smooth, barely wider than the neck it sits on. */}
      <path
        d="M224 70 C223 63 228 57 236 56 C243 55 249 59 249 65 C249 70 244 74 237 75 C231 75 225 74 224 70 Z"
        fill={f('gold')}
      />
      {model(
        <path d="M227 64 C229 60 233 57 239 58 C233 60 230 62 228 66 Z" fill={`url(#${uid}-lit)`} opacity={0.8} />,
      )}

      {/* The needle. Nearly as long as the body — it is what names the bird, and
          the first line the eye follows. */}
      <path d="M245 59 C262 52 279 45 297 36 L297.6 39 C280 47 263 55 247 63 Z" fill={f('beak')} />
      {model(<path d="M249 60 C265 53 281 46 296 38 L296.2 38.8 C281 46 266 53 250 61 Z" fill="#FFF6D8" opacity={0.5} />)}

      {/* Eye, and the small scroll ornaments the reference carries. */}
      <circle cx="238" cy="64" r="2.3" fill={solid('#8A5A08')} />
      <circle cx="238" cy="64" r="1.1" fill={solid('#FFF1C4')} />
      {model(
        <path
          d="M196 84 C192 81 194 77 198 77 C201 77 203 79 202 82 C201 84 199 84 198 83"
          stroke="#B8790E"
          strokeWidth="1"
          fill="none"
          opacity={0.5}
        />,
      )}
    </svg>
  );
};
