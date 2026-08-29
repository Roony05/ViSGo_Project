/**
 * Thân Rồng Việt Nam (Rồng thời Lý — Hoàng thành Thăng Long)
 *
 * Vietnamese Dragon geometry rebuilt with authentic historical and artistic characteristics:
 *   - Sinuous, serpentine, sinusoidal wave curvature ("thân uốn lượn hình sin mềm mại, thắt túi").
 *   - Slender, round, graceful proportions tapering gently from neck to a delicate spiraling tail.
 *   - Continuous flame-toothed dorsal fin ("vây lưng hình răng cưa/ngọn lửa nhỏ đều đặn dọc sống lưng").
 *   - Ventral segmentation plates and delicate shimmering scale curves.
 *   - Balanced limb roots for 4 slender eagle-clawed legs with flame tufts ("đao lửa").
 *   - Head anchor tilted proudly upward ("đầu ngẩng cao uy nghi").
 */

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;

/** Hermite ramp from 0 to 1 across [a, b]. */
function smoothstep(a: number, b: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/** Overall arc length of the body, before fitting to viewBox. */
const LENGTH = 1180;

/**
 * Landscape viewBox for the soaring Vietnamese Dragon.
 */
export const DRAGON_VIEWBOX = '0 0 960 420';
const VIEW = { w: 960, h: 420, pad: 32 };

/* ------------------------------------------------------------------ */
/* Spine                                                               */
/* ------------------------------------------------------------------ */

/**
 * Heading at arc-length fraction s in [0, 1], at wave phase t in [0, 1].
 *
 * S-curve of the authentic Vietnamese dragon:
 *   - Tail begins low-left ($s=0$), undulating through 3.5 harmonic sinusoidal waves.
 *   - Body rises majestically toward upper-right ($s=1$).
 *   - Neck straightens and lifts proudly with an upward angle (~-18° to -24°).
 *   - Dynamic swim wave propagates from tail to head with natural serpentine grace.
 */
function heading(s: number, t: number): number {
  // Settle factor: stabilizes the head and upper neck while allowing subtle rhythmic nodding
  const settle = 1 - smoothstep(0.82, 1, s);

  // Base sinusoidal curve with 3.2 rhythmic wave cycles across the body
  const baseWave = 0.92 * Math.sin(TAU * 1.62 * s + 0.38) * settle;
  // Overall diagonal climb from tail to neck
  const climb = -0.16 * s - 0.08;

  // Dynamic undulation wave: propagates along the body
  const amp = (0.08 + 0.22 * Math.pow(1 - s, 1.4)) * (0.35 + 0.65 * settle);
  const primaryWave = amp * Math.sin(TAU * (1.35 * s - t));
  const secondaryWave = 0.3 * amp * Math.sin(TAU * (2.7 * s - t * 1.6) + 0.8);

  return baseWave + climb + primaryWave + secondaryWave;
}

interface Sample {
  x: number;
  y: number;
  /** Unit normal pointing to the dragon's back (dorsal side). */
  nx: number;
  ny: number;
  /** Unit tangent pointing toward the head. */
  tx: number;
  ty: number;
  /** Half-width of the body at this point. */
  w: number;
}

/**
 * Vietnamese Dragon body half-width:
 * Slender, rounded, elegant serpentine form ("thân tròn lẳn, thon dài, uyển chuyển").
 * Upsized slightly for stronger imperial stature and commanding presence.
 */
function halfWidth(s: number): number {
  const grow = Math.pow(s, 0.42);
  // Chest expansion around s = 0.75 - 0.95
  const chest = 1 + 0.20 * Math.sin(Math.PI * Math.min(1, s / 0.88));
  // Slight neck tapering right before the head joint
  const neck = 1 - 0.10 * Math.pow(Math.max(0, s - 0.86) / 0.14, 2);
  return (2.2 + 22.8 * grow) * chest * neck;
}

const STEPS = 240;

/**
 * Raw spine before fitting: heading integrated along arc length.
 */
function rawSpine(t: number): { x: number; y: number; tx: number; ty: number; w: number }[] {
  const out = new Array(STEPS + 1);
  const ds = LENGTH / STEPS;
  let x = 0;
  let y = 0;
  for (let i = 0; i <= STEPS; i++) {
    const s = i / STEPS;
    const th = heading(s, t);
    const tx = Math.cos(th);
    const ty = Math.sin(th);
    out[i] = { x, y, tx, ty, w: halfWidth(s) };
    x += tx * ds;
    y += ty * ds;
  }
  return out;
}

/**
 * Reach of the Vietnamese Dragon head artwork (flaming crest, whiskers, flaming pearl).
 */
const HEAD_REACH = 310 * halfWidth(1) * 0.052;

const FIT = (() => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let k = 0; k < 12; k++) {
    const sp = rawSpine(k / 12);
    for (let i = 0; i < sp.length; i++) {
      const p = sp[i];
      const s = i / (sp.length - 1);
      const m = p.w + 26 + HEAD_REACH * smoothstep(0.78, 1, s) + 70 * (1 - smoothstep(0, 0.12, s));
      if (p.x - m < minX) minX = p.x - m;
      if (p.x + m > maxX) maxX = p.x + m;
      if (p.y - m < minY) minY = p.y - m;
      if (p.y + m > maxY) maxY = p.y + m;
    }
  }
  const scale = Math.min((VIEW.w - VIEW.pad * 2) / (maxX - minX), (VIEW.h - VIEW.pad * 2) / (maxY - minY));
  return {
    scale,
    dx: (VIEW.w - (maxX - minX) * scale) / 2 - minX * scale,
    dy: (VIEW.h - (maxY - minY) * scale) / 2 - minY * scale,
  };
})();

/** Fitted spine in viewBox coordinates. */
function sampleSpine(t: number): Sample[] {
  const raw = rawSpine(t);
  const out: Sample[] = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    out[i] = {
      x: p.x * FIT.scale + FIT.dx,
      y: p.y * FIT.scale + FIT.dy,
      nx: p.ty,
      ny: -p.tx,
      tx: p.tx,
      ty: p.ty,
      w: p.w * FIT.scale,
    };
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Path Builders                                                       */
/* ------------------------------------------------------------------ */

const f = (v: number) => Math.round(v * 10) / 10;

/** A ribbon between two lateral offsets, as fractions of the half-width. */
function ribbon(sp: Sample[], from: number, to: number, innerK: number, outerK: number, step = 2): string {
  const a: string[] = [];
  const b: string[] = [];
  const i0 = Math.round(from * STEPS);
  const i1 = Math.round(to * STEPS);
  for (let i = i0; i <= i1; i += step) {
    const p = sp[i];
    a.push(`${f(p.x + p.nx * p.w * innerK)} ${f(p.y + p.ny * p.w * innerK)}`);
    b.push(`${f(p.x + p.nx * p.w * outerK)} ${f(p.y + p.ny * p.w * outerK)}`);
  }
  return `M${a.join(' L')} L${b.reverse().join(' L')} Z`;
}

/**
 * Continuous flame-toothed dorsal fin ("Vây gai ngọn lửa / vây tam giác răng cưa thời Lý").
 * Runs all the way along the back from behind the head to the tail.
 */
function dorsalFin(sp: Sample[]): string {
  const i0 = Math.round(0.04 * STEPS);
  const i1 = Math.round(0.97 * STEPS);
  const step = 4;
  let d = '';
  const bases: string[] = [];

  for (let i = i0; i <= i1; i += step) {
    const p = sp[i];
    const s = i / STEPS;
    const bx = p.x + p.nx * p.w * 0.95;
    const by = p.y + p.ny * p.w * 0.95;
    if (!d) d = `M${f(bx)} ${f(by)}`;
    bases.push(`${f(bx)} ${f(by)}`);

    const nextIdx = Math.min(i1, i + step);
    const next = sp[nextIdx];
    // Flame height scales gracefully with body width
    const h = (4.5 + 14 * Math.pow(s, 0.65));
    // Peaks swept along the body tangent in graceful flame-tip curls
    const px = bx + p.nx * h - p.tx * (2.5 + 5 * s);
    const py = by + p.ny * h - p.ty * (2.5 + 5 * s);

    d += ` Q${f(px)} ${f(py)} ${f(next.x + next.nx * next.w * 0.95)} ${f(next.y + next.ny * next.w * 0.95)}`;
  }
  return `${d} L${bases.reverse().join(' L')} Z`;
}

/** Shimmering scale arches along the sinuous body. */
function scales(sp: Sample[]): string {
  let d = '';
  for (let row = 0; row < 3; row++) {
    const k = 0.55 - row * 0.42;
    const step = 6 + row;
    for (let i = Math.round(0.1 * STEPS); i <= Math.round(0.94 * STEPS); i += step) {
      const p = sp[i];
      const s = i / STEPS;
      const cx = p.x + p.nx * p.w * k;
      const cy = p.y + p.ny * p.w * k;
      const r = (2.6 + 5.2 * Math.pow(s, 0.72)) * (1 - row * 0.1);
      d +=
        `M${f(cx - p.tx * r - p.nx * r * 0.22)} ${f(cy - p.ty * r - p.ny * r * 0.22)}` +
        ` Q${f(cx + p.nx * r * 0.92)} ${f(cy + p.ny * r * 0.92)}` +
        ` ${f(cx + p.tx * r - p.nx * r * 0.22)} ${f(cy + p.ty * r - p.ny * r * 0.22)} `;
    }
  }
  return d.trim();
}

/** Segment plates along the ventral belly. */
function bellyPlates(sp: Sample[]): string {
  let d = '';
  for (let i = Math.round(0.08 * STEPS); i <= Math.round(0.92 * STEPS); i += 5) {
    const p = sp[i];
    const s = i / STEPS;
    const cx = p.x - p.nx * p.w * 0.72;
    const cy = p.y - p.ny * p.w * 0.72;
    const half = p.w * 0.24;
    const th = 1.0 + 1.2 * s;
    d +=
      `M${f(cx - p.tx * th - p.nx * half)} ${f(cy - p.ty * th - p.ny * half)}` +
      ` L${f(cx - p.tx * th + p.nx * half)} ${f(cy - p.ty * th + p.ny * half)}` +
      ` L${f(cx + p.tx * th + p.nx * half)} ${f(cy + p.ty * th + p.ny * half)}` +
      ` L${f(cx + p.tx * th - p.nx * half)} ${f(cy + p.ty * th - p.ny * half)} Z `;
  }
  return d.trim();
}

/* ------------------------------------------------------------------ */
/* Public Shape & Anchors                                              */
/* ------------------------------------------------------------------ */

export interface Placed {
  x: number;
  y: number;
  /** Rotation in degrees along the body tangent. */
  a: number;
}

export interface DragonGeometry {
  body: string;
  highlight: string;
  gleam: string;
  shadow: string;
  fin: string;
  scales: string;
  belly: string;
  /** Four limbs in paint order: 2 hind limbs (behind), 2 fore limbs (in front). */
  legs: Placed[];
  head: Placed;
  tail: Placed;
  /** Body half-width at the neck. */
  neckWidth: number;
}

/**
 * Limb anchor positions along the body wave.
 * Positioned on the downward/flank curves so limbs emerge naturally from the torso.
 */
const LEG_ROOTS = [
  { s: 0.28, swing: 98 },
  { s: 0.44, swing: -42 },
  { s: 0.70, swing: 154 },
  { s: 0.88, swing: 32 },
];

export function buildDragon(phase = 0): DragonGeometry {
  const sp = sampleSpine(phase);
  const at = (s: number): Sample => sp[Math.min(STEPS, Math.max(0, Math.round(s * STEPS)))];

  const head = at(1);
  const tail = at(0);

  return {
    body: ribbon(sp, 0, 1, -1, 1, 2),
    shadow: ribbon(sp, 0.02, 0.99, -0.42, -1, 3),
    highlight: ribbon(sp, 0.04, 0.985, 0.28, 0.88, 3),
    gleam: ribbon(sp, 0.18, 0.92, 0.44, 0.70, 4),
    fin: dorsalFin(sp),
    scales: scales(sp),
    belly: bellyPlates(sp),
    legs: LEG_ROOTS.map(({ s, swing }) => {
      const p = at(s);
      return {
        x: f(p.x - p.nx * p.w * 0.68),
        y: f(p.y - p.ny * p.w * 0.68),
        a: f(Math.atan2(p.ty, p.tx) * DEG + swing),
      };
    }),
    head: { x: f(head.x), y: f(head.y), a: f(Math.atan2(head.ty, head.tx) * DEG - 2) },
    neckWidth: f(head.w),
    tail: { x: f(tail.x), y: f(tail.y), a: f(Math.atan2(-tail.ty, -tail.tx) * DEG) },
  };
}
