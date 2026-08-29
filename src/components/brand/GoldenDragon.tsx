/**
 * Rồng Việt Nam — The Golden Vietnamese Dragon (Rồng thời Lý / Rồng Thăng Long)
 *
 * Distinctive authentic Vietnamese Dragon iconography:
 *   - Head (Đầu rồng):
 *       * Mào lửa bồ đề (Sacred Bodhi-leaf Flame Crest): Grand billowing flame crest surging
 *         upwards and backwards from the snout and brow in sacred flame curls (no deer antlers).
 *       * Mõm & Mũi sóng nước: Upturned snout with rolling water-wave scrolls ("mũi lượn sóng cuộn trào").
 *       * Râu rồng (Flowing Whiskers): Long, delicate sinusoidal wave whiskers floating dynamically.
 *       * Miệng há rộng, Răng nanh, Lưỡi: Open jaws with sharp curved fangs and undulating tongue.
 *       * Hỏa châu / Ngọc báu (Sacred Flaming Pearl): Brilliant jewel surrounded by flame petals and aura.
 *       * Bờm lửa: Silky multi-tiered flame mane cascading from behind the skull and jaw down the neck.
 *       * Mắt & Mày đao lửa: Radiant benevolent dragon eye with fiery eyebrow.
 *   - Body (Thân rồng):
 *       * Sinuous sinusoidal coils ("thân uốn lượn hình sin mềm mại, thon dài thanh thoát").
 *       * Continuous flame-toothed dorsal fin ("vây gai ngọn lửa nhỏ đều đặn dọc sống lưng").
 *       * Ventral segmented belly plates and golden shimmering scales.
 *   - Limbs (Chân & Móng vuốt):
 *       * 4 slender, agile legs with sharp eagle talons.
 *       * Đao lửa / Chỏm mây khuỷu chân: Dynamic flame-cloud tufts billowing back from the elbow joints.
 *   - Tail (Đuôi rồng):
 *       * Tapered tail terminating in an ornate spiral flame plume ("đuôi xoắn ngọn lửa đao mây").
 */

import React from 'react';
import { buildDragon, DRAGON_VIEWBOX, type DragonGeometry } from '../../utils/dragonGeometry';

interface GoldenDragonProps {
  className?: string;
  /** Flat-colour override for watermark and small-scale placements. */
  color?: string;
  title?: string;
  /** Swim animation. Off by default: the navbar and the page backdrop want it still. */
  animate?: boolean;
  /** Seconds per undulation cycle. */
  period?: number;
}

/**
 * One leg, in local coordinates: hip at origin, limb extending along +x.
 * Slender, graceful leg with sharp eagle talons and the iconic elbow flame blade ("đao lửa khuỷu chân").
 */
const Leg: React.FC<{
  fill: string;
  lit: string;
  dark: string;
  claw: string;
  tuft: string;
  deep: string;
  flat: boolean;
}> = ({ fill, lit, dark, claw, tuft, deep, flat }) => (
  <>
    {/* Elbow flame blade ("đao lửa / chỏm mây khuỷu chân") streaming backwards */}
    <path
      d="M8 -6 C-14 -22 -36 -28 -52 -20 C-32 -12 -18 2 -6 18 C-16 10 -28 12 -38 24 C-20 22 -6 26 6 12 Z"
      fill={tuft}
    />
    <path
      d="M0 -4 C-16 -16 -32 -20 -44 -14 C-28 -8 -16 2 -6 14 Z"
      fill={lit}
      opacity={flat ? 0 : 0.45}
    />

    {/* Upper leg / thigh */}
    <ellipse cx="6" cy="0" rx="12" ry="9.5" fill={fill} />
    <ellipse cx="4" cy="-3" rx="7.5" ry="5.5" fill={lit} opacity={flat ? 0 : 0.55} />

    {/* Foreleg / knee segment */}
    <path d="M-1 -8 C12 -8 22 0 28 12 L16 19 C12 10 4 4 -4 5 Z" fill={fill} />
    <path d="M1 -6 C10 -6 18 0 23 8 L18 11 C13 5 7 1 -1 0 Z" fill={lit} opacity={flat ? 0 : 0.5} />

    {/* Shin and ankle segment */}
    <path d="M18 15 C27 19 35 27 40 37 L30 41 C26 33 19 27 12 23 Z" fill={fill} />
    <path d="M20 17 C26 21 32 27 35 34 L31 36 C27 30 23 25 17 22 Z" fill={lit} opacity={flat ? 0 : 0.45} />

    {/* Paw pad */}
    <path d="M35 33 C44 33 49 39 46 46 C42 51 34 50 29 44 L29 36 Z" fill={fill} />
    <path d="M36 35 C42 35 46 39 44 43 L33 41 Z" fill={lit} opacity={flat ? 0 : 0.42} />

    {/* Eagle talons (4 sharp curved claws) */}
    {/* Upper talon */}
    <path d="M44 32 C56 29 64 22 68 15 C66 28 58 37 46 40 Z" fill={claw} />
    <path d="M44 32 C53 30 59 25 63 19 C59 26 53 32 44 35 Z" fill={lit} opacity={flat ? 0 : 0.6} />

    {/* Main middle talon */}
    <path d="M46 41 C58 43 67 41 73 37 C65 47 54 51 44 47 Z" fill={claw} />
    <path d="M46 41 C55 42 61 41 66 38 C60 44 52 47 45 44 Z" fill={lit} opacity={flat ? 0 : 0.6} />

    {/* Lower talon */}
    <path d="M39 47 C44 56 51 62 59 64 C48 66 38 60 33 52 Z" fill={claw} />
    <path d="M39 47 C43 53 48 58 54 59 C47 61 40 56 36 50 Z" fill={lit} opacity={flat ? 0 : 0.6} />

    {/* Rear spur claw */}
    <path d="M21 35 C23 45 21 53 16 58 C14 48 15 40 19 33 Z" fill={claw} />

    {/* Shading edges on claws */}
    <path d="M60 21 C64 18 67 15 68 15 C66 20 63 24 60 26 Z" fill={deep} />
    <path d="M66 38 C69 38 71 37 73 37 C70 41 66 44 63 45 Z" fill={deep} />
    <path d="M53 60 C56 62 58 63 59 64 C54 65 50 64 47 62 Z" fill={deep} />
  </>
);

/**
 * Đầu Rồng Thời Lý — The Brave & Fierce Vietnamese Dragon Head
 *
 * Designed with a fierce, angry, and brave imperial countenance:
 *   - Mắt quắc thước nộ mục: Piercing predator eye under a sharply angled furrowed flame brow.
 *   - Hàm há rộng gầm vang oai dũng: Wide roaring jaws with long curved dagger fangs.
 *   - Mào lửa bồ đề rực cháy: Bold, surging flame crest soaring from the brow and snout.
 *   - Mõm & Mũi sóng nước cuộn trào: Sinuous snarl muzzle with upturned water-wave scrolls.
 *   - Râu rồng uốn lượn: Dynamic wave whiskers crackling forward.
 *   - Hỏa châu ngọc báu: Sacred flaming pearl blazing before the roar.
 */
const Head: React.FC<{
  head: string;
  mane: string;
  lit: string;
  dark: string;
  deep: string;
  bone: string;
  flame: string;
  pearl: string;
  flat: boolean;
}> = ({ head, mane, lit, dark, deep, bone, flame, pearl, flat }) => (
  <>
    {/* ================================================================= */}
    {/* 1. LAYERED FLAME MANE (Bờm lửa sau gáy & dưới hàm)                */}
    {/* ================================================================= */}
    <path
      d="M4 -16 C-22 -52 -58 -70 -102 -62 C-76 -50 -56 -34 -48 -12 C-82 -36 -118 -26 -138 6 C-102 -8 -72 4 -54 32 C-88 20 -120 38 -132 72 C-96 44 -66 50 -42 80 C-68 80 -88 100 -94 124 C-64 94 -30 88 4 102 C-14 70 -10 38 8 16 Z"
      fill={mane}
    />
    <path
      d="M-24 -30 C-58 -60 -94 -70 -122 -54 C-88 -48 -62 -30 -48 -4 Z"
      fill={dark}
      opacity={flat ? 0 : 0.88}
    />
    <path
      d="M-38 10 C-72 -2 -104 10 -120 38 C-86 20 -58 28 -40 54 Z"
      fill={deep}
      opacity={flat ? 0 : 0.88}
    />
    <path
      d="M-32 54 C-64 56 -90 74 -102 100 C-72 80 -46 84 -22 104 Z"
      fill={dark}
      opacity={flat ? 0 : 0.88}
    />

    {/* ================================================================= */}
    {/* 2. MÀO LỬA BỒ ĐỀ (Surging Sacred Bodhi-leaf Flaming Crest)         */}
    {/* ================================================================= */}
    {/* Outermost sweeping flame crown */}
    <path
      d="M-12 -30 C-30 -74 -20 -116 18 -144 C-2 -102 8 -70 34 -48 C34 -90 58 -124 96 -138 C64 -98 62 -66 70 -38 Z"
      fill={flame}
    />
    {/* Mid flame plume with sacred Bodhi curvature */}
    <path
      d="M24 -44 C26 -82 46 -110 74 -122 C52 -90 54 -64 64 -40 Z"
      fill={mane}
    />
    <path
      d="M64 -38 C78 -72 104 -92 134 -98 C106 -74 96 -52 100 -28 Z"
      fill={dark}
    />
    {/* Inner flame highlights */}
    <path
      d="M-4 -36 C-16 -68 -8 -100 20 -122 C8 -90 16 -64 36 -50 Z"
      fill={lit}
      opacity={flat ? 0 : 0.5}
    />
    <path
      d="M34 -52 C36 -78 50 -100 72 -110 C54 -84 56 -62 64 -44 Z"
      fill={lit}
      opacity={flat ? 0 : 0.5}
    />

    {/* Forward flame horn rising above the snout */}
    <path
      d="M98 -26 C116 -58 142 -74 170 -70 C150 -50 144 -36 148 -18 C136 -28 122 -30 98 -26 Z"
      fill={flame}
    />
    <path
      d="M110 -32 C122 -56 142 -66 162 -62 C146 -46 142 -34 144 -20 Z"
      fill={lit}
      opacity={flat ? 0 : 0.55}
    />

    {/* ================================================================= */}
    {/* 3. ROARING MOUTH CAVITY, TONGUE & DAGGER FANGS                    */}
    {/* ================================================================= */}
    {/* Wide open mouth cavity (deep ferocious vermilion interior) */}
    <path
      d="M8 12 C38 14 70 20 100 24 C124 28 144 24 162 14 C158 34 138 46 112 50 C78 54 42 44 10 30 Z"
      fill={flat ? head : '#300804'}
    />

    {/* Ferocious tongue reaching outward towards the flaming pearl */}
    {!flat && (
      <>
        <path
          d="M50 18 C82 20 112 28 142 22 C152 20 158 24 148 30 C128 38 98 34 52 26 Z"
          fill="#D4380D"
        />
        <path
          d="M72 20 C96 23 118 28 140 23 C146 22 150 24 144 28 C128 34 106 32 72 26 Z"
          fill="#FFA39E"
          opacity={0.75}
        />
      </>
    )}

    {/* Razor-sharp dagger fangs and teeth (Răng nanh rồng uy dũng) */}
    {!flat && (
      <>
        {/* Main upper canine fang (longer, sharper, curved menace) */}
        <path
          d="M110 12 C118 2 126 -8 124 -18 C132 -6 130 8 122 24 C116 30 111 24 110 12 Z"
          fill={bone}
          stroke="#8A4A06"
          strokeWidth={1.2}
        />
        {/* Secondary upper forward fang */}
        <path
          d="M138 18 L150 16 L142 32 Z"
          fill={bone}
          stroke="#8A4A06"
          strokeWidth={0.8}
        />
        {/* Main lower canine fang (long dagger reaching up) */}
        <path
          d="M98 52 C106 42 110 30 108 16 C114 28 111 44 104 56 Z"
          fill={bone}
          stroke="#8A4A06"
          strokeWidth={1.2}
        />
        {/* Sharp serrated teeth along upper jaw */}
        <path d="M36 14 L48 16 L42 34 Z" fill={bone} />
        <path d="M68 18 L80 19 L74 37 Z" fill={bone} />
        <path d="M92 20 L104 20 L98 36 Z" fill={bone} />
        {/* Sharp serrated teeth along lower jaw */}
        <path d="M50 51 L62 53 L56 37 Z" fill={bone} />
        <path d="M74 54 L86 54 L79 38 Z" fill={bone} />
        <path d="M124 46 L136 40 L128 28 Z" fill={bone} />
      </>
    )}

    {/* ================================================================= */}
    {/* 4. UPPER SKULL & SNARLING WAVE SNOUT (Mõm rồng uy dũng)           */}
    {/* ================================================================= */}
    <path
      d="M-30 -8 C-14 -40 16 -54 50 -48 C78 -44 96 -28 110 -14 C126 -16 146 -10 156 2 C166 12 162 24 150 30 C138 38 118 30 106 22 C84 26 58 23 34 18 C10 14 -12 8 -30 4 Z"
      fill={head}
      stroke={deep}
      strokeWidth={flat ? 0 : 2.5}
      strokeLinejoin="round"
    />
    <path
      d="M-20 -12 C0 -40 28 -50 56 -44 C36 -40 16 -28 4 -12 Z"
      fill={lit}
      opacity={flat ? 0 : 0.46}
    />
    <path
      d="M-6 -32 C24 -54 64 -52 94 -28 L76 -8 C56 -24 30 -22 4 -8 Z"
      fill={deep}
      opacity={flat ? 0 : 0.85}
    />

    {/* Upturned wave snout with aggressive snarl curl */}
    <path
      d="M96 -18 C112 -32 140 -34 154 -20 C170 -8 172 10 162 24 C150 36 126 36 110 26 C98 18 92 0 96 -18 Z"
      fill={head}
      stroke={deep}
      strokeWidth={flat ? 0 : 2.5}
    />
    <path
      d="M108 -20 C124 -28 146 -26 156 -16 C140 -19 124 -14 112 -2 Z"
      fill={lit}
      opacity={flat ? 0 : 0.5}
    />
    <path
      d="M126 -8 C138 -14 154 -8 160 4 C150 14 134 16 124 10 C120 6 120 -2 126 -8 Z"
      fill={deep}
      opacity={flat ? 0 : 0.85}
    />
    <ellipse cx="146" cy="2" rx="4.6" ry="3.2" transform="rotate(-12 146 2)" fill={flat ? head : '#240602'} />

    {/* Snarl upper lip curl */}
    <path
      d="M150 16 C170 8 180 -6 178 -22 C176 -34 168 -38 162 -33 C158 -29 157 -23 160 -19 C160 -25 164 -29 168 -25 C170 -14 162 -3 148 3 C139 6 134 12 132 20 Z"
      fill={dark}
      stroke={deep}
      strokeWidth={flat ? 0 : 1.8}
    />
    <path
      d="M168 -33 C184 -40 198 -35 204 -23 C194 -30 182 -29 174 -21 Z"
      fill={mane}
    />

    {/* ================================================================= */}
    {/* 5. ANGRY & BRAVE PREDATOR EYE (Mắt nộ mục, quắc thước oai nghiêm) */}
    {/* ================================================================= */}
    {/* Intense furrowed eyebrow wrinkles */}
    <path
      d="M20 -34 C44 -48 72 -42 96 -24 L76 -8 C58 -4 40 -10 22 -18 Z"
      fill={flat ? head : '#1A0401'}
    />
    {/* Secondary flame brow blade surging up */}
    <path
      d="M40 -34 C54 -54 70 -58 84 -48 C70 -44 58 -36 50 -28 Z"
      fill={flame}
    />
    <path
      d="M50 -36 C60 -50 72 -54 82 -46 C70 -42 62 -36 56 -30 Z"
      fill={lit}
      opacity={flat ? 0 : 0.6}
    />

    {/* Fierce burning eye socket with red glow rim */}
    <path
      d="M32 -22 Q52 -13 74 -24 Q60 -2 36 -12 Z"
      fill={flat ? head : '#E60000'}
    />
    {/* Radiant intense golden iris */}
    <path
      d="M36 -20 Q53 -12 70 -22 Q58 -4 39 -11 Z"
      fill={flat ? head : '#FFD666'}
    />
    {/* Sharp, focused predator slit pupil */}
    <path
      d="M51 -21 C53 -14 55 -8 54 -4 C51 -8 50 -14 51 -21 Z"
      fill={flat ? head : '#000000'}
    />
    {/* Blazing white glints */}
    {!flat && (
      <>
        <circle cx="53" cy="-15" r="1.6" fill="#FFFFFF" />
        <circle cx="56" cy="-12" r="0.8" fill="#FFFBE6" />
      </>
    )}

    {/* ================================================================= */}
    {/* 6. LOWER JAW & CHIN BEARD (Hàm dưới uy lực & Râu cằm)             */}
    {/* ================================================================= */}
    <path
      d="M-14 20 C10 42 42 54 76 58 C104 60 130 50 150 32 L158 26 C152 47 134 66 112 75 C84 86 52 80 24 66 C4 56 -12 44 -24 30 Z"
      fill={head}
      stroke={deep}
      strokeWidth={flat ? 0 : 2.5}
      strokeLinejoin="round"
    />
    <path
      d="M-2 34 C20 50 48 58 76 60 C102 63 126 53 148 35 C134 57 112 70 86 72 C55 70 26 58 3 46 Z"
      fill={dark}
      opacity={flat ? 0 : 0.55}
    />
    <path
      d="M84 72 C108 70 128 58 148 38 C138 60 122 75 100 82 Z"
      fill={deep}
    />

    {/* Sharp flame beard locks under the chin */}
    <path
      d="M14 52 C-6 74 -10 100 2 122 C16 95 36 80 58 78 C40 70 26 60 14 52 Z"
      fill={mane}
    />
    <path
      d="M38 64 C34 92 48 114 72 124 C64 96 76 80 94 66 Z"
      fill={dark}
    />

    {/* ================================================================= */}
    {/* 7. HỎA CHÂU / VIÊN NGỌC BÁU (Sacred Flaming Pearl / Chầu Ngọc)    */}
    {/* ================================================================= */}
    {/* Swirling sacred flame petals surrounding the pearl ("đao lửa bọc ngọc") */}
    <g transform="translate(168 18)">
      {/* Outer blazing flame aura */}
      <path
        d="M0 -22 C18 -30 30 -18 22 -2 C34 -10 42 2 30 12 C42 20 32 36 18 30 C22 42 8 44 -2 32 C-12 44 -28 34 -22 20 C-34 24 -40 10 -28 0 C-40 -8 -30 -26 -16 -20 C-18 -34 -2 -34 0 -22 Z"
        fill={flame}
        opacity={flat ? 1 : 0.92}
      />
      <path
        d="M0 -15 C12 -20 20 -12 15 -1 C24 -7 28 2 20 9 C28 14 22 24 12 20 C15 28 5 30 -1 22 C-8 30 -18 24 -15 13 C-24 16 -27 7 -18 0 C-27 -5 -20 -17 -10 -13 C-12 -24 -1 -24 0 -15 Z"
        fill={pearl}
        opacity={flat ? 1 : 0.98}
      />

      {/* Pearl core sphere */}
      <circle cx="0" cy="0" r="11.5" fill={flat ? head : '#8E4804'} opacity={flat ? 1 : 0.7} />
      <circle cx="0" cy="-1" r="9.5" fill={flat ? head : '#FFD666'} stroke={flat ? head : '#FFFBE6'} strokeWidth={flat ? 0 : 2} />
      <circle cx="-3" cy="-4" r="3.5" fill={flat ? head : '#FFFFFF'} opacity={flat ? 1 : 0.98} />
    </g>

    {/* ================================================================= */}
    {/* 8. RÂU RỒNG SÓNG NƯỚC (Long Sinusoidal Whiskers)                  */}
    {/* ================================================================= */}
    {/* Upper whisker — dynamic wave surging forward and upward */}
    <path
      d="M156 -4 C190 -30 228 -28 252 -8 C270 8 262 26 244 26 C256 15 250 4 238 0 C214 -9 188 2 166 18"
      fill="none"
      stroke={deep}
      strokeWidth={flat ? 5 : 3.0}
      strokeLinecap="round"
    />
    <path
      d="M158 -4 C190 -28 226 -26 249 -7 C266 8 258 24 243 24"
      fill="none"
      stroke={lit}
      strokeWidth={flat ? 0 : 1.4}
      strokeLinecap="round"
    />

    {/* Lower whisker — undulating wave forward and downward */}
    <path
      d="M155 16 C192 25 224 50 230 76 C234 96 218 106 200 96 C212 88 217 74 210 61 C200 40 176 25 155 16"
      fill="none"
      stroke={dark}
      strokeWidth={flat ? 5 : 2.9}
      strokeLinecap="round"
    />
    <path
      d="M157 16 C192 25 222 48 227 73 C231 92 217 100 201 92"
      fill="none"
      stroke={lit}
      strokeWidth={flat ? 0 : 1.3}
      strokeLinecap="round"
    />

    {/* Supplementary whisker flame feathers */}
    <path d="M152 -8 C174 -22 194 -17 204 -4 C184 -10 170 0 160 14 Z" fill={mane} />
    <path d="M154 18 C176 21 194 34 202 52 C186 39 170 38 152 44 Z" fill={dark} />
  </>
);

export const GoldenDragon: React.FC<GoldenDragonProps> = ({
  className,
  color,
  title,
  animate = false,
  period = 5.2,
}) => {
  const uid = React.useId().replace(/:/g, '');
  const flat = Boolean(color);
  const f = (id: string) => (flat ? color : `url(#${uid}-${id})`);
  const solid = (c: string) => (flat ? color : c);
  const soften = !flat && !animate;

  /** First frame geometry */
  const initial = React.useMemo(() => buildDragon(0), []);

  const body = React.useRef<SVGPathElement>(null);
  const highlight = React.useRef<SVGPathElement>(null);
  const gleam = React.useRef<SVGPathElement>(null);
  const shadow = React.useRef<SVGPathElement>(null);
  const fin = React.useRef<SVGPathElement>(null);
  const scales = React.useRef<SVGPathElement>(null);
  const belly = React.useRef<SVGPathElement>(null);
  const legs = [
    React.useRef<SVGGElement>(null),
    React.useRef<SVGGElement>(null),
    React.useRef<SVGGElement>(null),
    React.useRef<SVGGElement>(null),
  ];
  const headRef = React.useRef<SVGGElement>(null);
  const tailRef = React.useRef<SVGGElement>(null);

  React.useEffect(() => {
    if (!animate) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const started = performance.now();
    const paint = (g: DragonGeometry) => {
      body.current?.setAttribute('d', g.body);
      highlight.current?.setAttribute('d', g.highlight);
      gleam.current?.setAttribute('d', g.gleam);
      shadow.current?.setAttribute('d', g.shadow);
      fin.current?.setAttribute('d', g.fin);
      scales.current?.setAttribute('d', g.scales);
      belly.current?.setAttribute('d', g.belly);
      g.legs.forEach((l, i) => {
        legs[i].current?.setAttribute(
          'transform',
          `translate(${l.x} ${l.y}) rotate(${l.a}) scale(${LEG_SCALE[i]})`,
        );
      });
      headRef.current?.setAttribute(
        'transform',
        `translate(${g.head.x} ${g.head.y}) rotate(${g.head.a}) scale(${headScale(g.neckWidth)})`,
      );
      tailRef.current?.setAttribute('transform', `translate(${g.tail.x} ${g.tail.y}) rotate(${g.tail.a})`);
    };

    const tick = (now: number) => {
      paint(buildDragon((((now - started) / 1000 / period) % 1 + 1) % 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, period]);

  const hs = headScale(initial.neckWidth);

  return (
    <svg
      viewBox={DRAGON_VIEWBOX}
      className={className}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}

      {!flat && (
        <defs>
          {/* Imperial Golden Vietnamese Dragon Gradients */}
          <linearGradient id={`${uid}-body`} x1="60" y1="60" x2="360" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE58F" />
            <stop offset="0.32" stopColor="#F5A623" />
            <stop offset="0.68" stopColor="#D48806" />
            <stop offset="1" stopColor="#873800" />
          </linearGradient>

          <linearGradient id={`${uid}-hi`} x1="110" y1="90" x2="300" y2="590" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFDF0" stopOpacity="0.25" />
            <stop offset="0.22" stopColor="#FFFBE6" stopOpacity="0.95" />
            <stop offset="0.58" stopColor="#FFE58F" stopOpacity="0.7" />
            <stop offset="1" stopColor="#FFD666" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id={`${uid}-gleam`} x1="120" y1="110" x2="290" y2="540" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.34" stopColor="#FFFDF0" stopOpacity="0.6" />
            <stop offset="0.62" stopColor="#FFE58F" stopOpacity="0.2" />
            <stop offset="1" stopColor="#FFE58F" stopOpacity="0" />
          </linearGradient>

          {/* Warm cinnabar shadow */}
          <linearGradient id={`${uid}-sh`} x1="90" y1="120" x2="350" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7E2E04" stopOpacity="0.75" />
            <stop offset="0.5" stopColor="#591C02" stopOpacity="0.82" />
            <stop offset="1" stopColor="#380E02" stopOpacity="0.75" />
          </linearGradient>

          {/* Flame-toothed dorsal fin */}
          <linearGradient id={`${uid}-fin`} x1="70" y1="120" x2="340" y2="580" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFF1B8" />
            <stop offset="0.4" stopColor="#FA8C16" />
            <stop offset="1" stopColor="#A82806" />
          </linearGradient>

          {/* Limbs & Claws */}
          <linearGradient id={`${uid}-limb`} x1="0" y1="-14" x2="30" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFD666" />
            <stop offset="0.55" stopColor="#D48806" />
            <stop offset="1" stopColor="#873800" />
          </linearGradient>

          {/* Head & Jaws */}
          <linearGradient id={`${uid}-head`} x1="-30" y1="50" x2="110" y2="-35" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#611F04" />
            <stop offset="0.35" stopColor="#AD4E08" />
            <stop offset="0.72" stopColor="#E08A0A" />
            <stop offset="1" stopColor="#F5B838" />
          </linearGradient>

          {/* Sacred Bodhi Flame Crest */}
          <linearGradient id={`${uid}-flame`} x1="0" y1="20" x2="60" y2="-120" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#D4380D" />
            <stop offset="0.4" stopColor="#FA8C16" />
            <stop offset="0.78" stopColor="#FFD666" />
            <stop offset="1" stopColor="#FFFBE6" />
          </linearGradient>

          {/* Flowing Mane */}
          <linearGradient id={`${uid}-mane`} x1="20" y1="-60" x2="-90" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFF1B8" />
            <stop offset="0.38" stopColor="#FA8C16" />
            <stop offset="1" stopColor="#A82806" />
          </linearGradient>

          {/* Sacred Pearl Aura */}
          <radialGradient id={`${uid}-pearl`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FFE58F" />
            <stop offset="75%" stopColor="#FA8C16" />
            <stop offset="100%" stopColor="#D4380D" />
          </radialGradient>

          {/* Tail Spiral Flame */}
          <linearGradient id={`${uid}-tail`} x1="0" y1="-40" x2="80" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFBE6" />
            <stop offset="0.45" stopColor="#FA8C16" />
            <stop offset="1" stopColor="#A82806" />
          </linearGradient>

          <filter id={`${uid}-soft`} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="3.4" />
          </filter>
          <filter id={`${uid}-soft2`} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
      )}

      {/* --- Tail Fin (Đuôi xoắn ngọn lửa thời Lý) -------------------------- */}
      <g ref={tailRef} transform={`translate(${initial.tail.x} ${initial.tail.y}) rotate(${initial.tail.a})`}>
        {/* Fanned flame plume licks */}
        {[
          { a: -52, l: 36, w: 4.8, o: 3 },
          { a: -20, l: 52, w: 6.2, o: 0 },
          { a: 16, l: 44, w: 5.2, o: 2 },
          { a: 48, l: 32, w: 4.4, o: 4 },
        ].map((k, i) => (
          <path
            key={i}
            transform={`rotate(${k.a}) translate(${k.o} 0)`}
            d={`M0 ${-k.w * 0.4} C ${k.l * 0.3} ${-k.w} ${k.l * 0.7} ${-k.w * 0.55} ${k.l} 0
                C ${k.l * 0.7} ${k.w * 0.55} ${k.l * 0.3} ${k.w} 0 ${k.w * 0.4} Z`}
            fill={f('tail')}
            stroke={solid('#8A3C0A')}
            strokeWidth={flat ? 0 : 0.9}
          />
        ))}
        {/* Inner spiral wisp */}
        <path
          d="M0 0 C 14 -12 28 -8 38 -2 C 26 -3 14 0 4 2 Z"
          fill={solid('#FFF3CB')}
          opacity={flat ? 0 : 0.75}
        />
      </g>

      {/* --- Hind Legs (Behind the body coil) -------------------------------- */}
      {[0, 1].map((i) => (
        <g
          key={i}
          ref={legs[i]}
          transform={`translate(${initial.legs[i].x} ${initial.legs[i].y}) rotate(${initial.legs[i].a}) scale(${LEG_SCALE[i]})`}
        >
          <Leg
            fill={f('limb')}
            lit={solid('#FFF1B8')}
            dark={solid('#7E2E04')}
            claw={solid('#E59B18')}
            tuft={f('mane')}
            deep={solid('#591C02')}
            flat={flat}
          />
        </g>
      ))}

      {/* --- Dorsal Fin (Behind the body so only the flame peaks show) ------- */}
      <path ref={fin} d={initial.fin} fill={f('fin')} />

      {/* --- Body (Sinuous golden dragon body) -------------------------------- */}
      <path ref={body} d={initial.body} fill={f('body')} />
      <path ref={shadow} d={initial.shadow} fill={f('sh')} filter={soften ? `url(#${uid}-soft)` : undefined} />
      <path
        ref={scales}
        d={initial.scales}
        fill="none"
        stroke={solid('#8A4C06')}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={flat ? 0 : 0.42}
      />
      <path ref={highlight} d={initial.highlight} fill={f('hi')} filter={soften ? `url(#${uid}-soft)` : undefined} />
      <path ref={gleam} d={initial.gleam} fill={f('gleam')} filter={soften ? `url(#${uid}-soft2)` : undefined} />
      <path ref={belly} d={initial.belly} fill={solid('#FFE58F')} opacity={flat ? 0 : 0.22} />

      {/* --- Fore Legs (In front of the body coil) ---------------------------- */}
      {[2, 3].map((i) => (
        <g
          key={i}
          ref={legs[i]}
          transform={`translate(${initial.legs[i].x} ${initial.legs[i].y}) rotate(${initial.legs[i].a}) scale(${LEG_SCALE[i]})`}
        >
          <Leg
            fill={f('limb')}
            lit={solid('#FFF1B8')}
            dark={solid('#7E2E04')}
            claw={solid('#E59B18')}
            tuft={f('mane')}
            deep={solid('#591C02')}
            flat={flat}
          />
        </g>
      ))}

      {/* --- Head (Đầu Rồng Thời Lý) ----------------------------------------- */}
      <g ref={headRef} transform={`translate(${initial.head.x} ${initial.head.y}) rotate(${initial.head.a}) scale(${hs})`}>
        <Head
          head={f('head')}
          mane={f('mane')}
          lit={solid('#FFE58F')}
          dark={solid('#A85408')}
          deep={solid('#6B2002')}
          bone={solid('#FFF8E7')}
          flame={f('flame')}
          pearl={f('pearl')}
          flat={flat}
        />
      </g>
    </svg>
  );
};

/** Per-limb scale: fore legs read larger because they are nearer the viewer. */
const LEG_SCALE = [0.95, 1.02, 0.92, 1.1] as const;

/**
 * Head size, derived proportionally from neck thickness.
 */
function headScale(neckWidth: number): number {
  return (neckWidth * 5.4) / 100;
}
