/**
 * Scenery pieces for the 2D opening sequence.
 *
 * Everything here is flat SVG with no animation of its own — the intro owns the
 * whole timeline, and a component that animates itself cannot be frozen at a
 * chosen moment for review. Motion is applied by the parent, on the wrapper.
 *
 * These are silhouettes, not illustrations. They sit behind the dragon and the
 * Lạc bird, whose artwork is the point of the scene, so anything with its own
 * colour and detail would compete with them. Shape alone has to carry the
 * reading: the brim of a nón lá, the sag of a carrying pole, a bamboo node.
 */

import React from 'react';

/* ------------------------------------------------------------------ */
/* Mountains                                                           */
/* ------------------------------------------------------------------ */

/**
 * One ridge line. `seed` shifts the peaks so several stacked copies read as
 * distance rather than as one shape repeated.
 */
export const Ridge: React.FC<{ className?: string; seed?: number }> = ({ className, seed = 0 }) => {
  const s = seed * 137;
  const p = (x: number) => (x + s) % 1440;
  return (
    <svg viewBox="0 0 1440 300" className={className} preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="currentColor"
        d={`M0 300 L0 ${190 + (seed % 3) * 18}
            C ${p(120)} ${150 - seed * 8}, ${p(210)} ${120 + seed * 6}, ${p(330)} ${168 - seed * 4}
            C ${p(430)} ${205}, ${p(520)} ${96 + seed * 10}, ${p(650)} ${138}
            C ${p(760)} ${176}, ${p(880)} ${104 + seed * 6}, ${p(1010)} ${150}
            C ${p(1130)} ${192}, ${p(1250)} ${118 + seed * 8}, 1440 ${172 - seed * 5}
            L1440 300 Z`}
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Bamboo                                                              */
/* ------------------------------------------------------------------ */

/**
 * A bamboo cane with nodes and leaf blades.
 *
 * Leaves are placed with a seeded pseudo-random so each cane in a grove differs
 * without needing a hand-authored variant per stalk.
 */
export const BambooCane: React.FC<{ className?: string; seed?: number; leaves?: number }> = ({
  className,
  seed = 1,
  leaves = 10,
}) => {
  const rand = (n: number) => {
    const x = Math.sin(seed * 991 + n * 57.3) * 10000;
    return x - Math.floor(x);
  };

  return (
    <svg viewBox="0 0 180 600" className={className} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <g fill="currentColor">
        <path d="M82 600 C84 500 78 410 84 322 C88 240 83 164 91 76 C94 43 97 23 101 10 C108 27 109 48 106 78 C99 166 105 242 99 324 C93 414 98 502 96 600 Z" />
        {Array.from({ length: 9 }, (_, i) => {
          const y = 552 - i * 61;
          const x = 83 + Math.sin(i * 1.35 + seed) * 3;
          const width = 15 - i * 0.55;
          return <path key={i} d={`M${x - 3} ${y} Q${x + width / 2} ${y + 5} ${x + width} ${y} L${x + width - 1} ${y + 5} Q${x + width / 2} ${y + 9} ${x - 2} ${y + 5} Z`} opacity={0.7} />;
        })}
        {Array.from({ length: leaves }, (_, i) => {
          const y = 500 - i * 46 - rand(i) * 18;
          const side = i % 2 === 0 ? 1 : -1;
          const branch = 31 + rand(i + 9) * 22;
          const lift = 18 + rand(i + 3) * 18;
          const x0 = 94 + Math.sin(i * 1.35 + seed) * 3;
          const tipX = x0 + side * branch;
          const tipY = y - lift;
          return (
            <g key={`l${i}`}>
              <path d={`M${x0} ${y + 4} Q${x0 + side * branch * 0.52} ${y - lift * 0.35} ${tipX} ${tipY} L${tipX - side * 2} ${tipY + 3} Q${x0 + side * branch * 0.48} ${y - lift * 0.15} ${x0} ${y + 7} Z`} opacity={0.82} />
              {[-0.72, 0, 0.72].map((fan, j) => {
                const leafLen = 29 + rand(i * 5 + j + 20) * 18;
                const leafX = tipX + side * leafLen;
                const leafY = tipY + fan * 17 + rand(i + j + 30) * 5;
                return <path key={j} d={`M${tipX} ${tipY} Q${tipX + side * leafLen * 0.58} ${leafY - fan * 5} ${leafX} ${leafY} Q${tipX + side * leafLen * 0.55} ${leafY + 6 + fan * 3} ${tipX + side * 3} ${tipY + 5} Z`} />;
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Farmer/* ------------------------------------------------------------------ */
/* Farmer                                                              */
/* ------------------------------------------------------------------ */

/**
 * A farmer carrying rice on a shoulder pole, walking to the right.
 *
 * The legs carry classes the intro's stylesheet animates; everything else is
 * one static silhouette. Three shapes do all the work of making this readable
 * at thumbnail size — the wide cone of the nón lá, the sag of the đòn gánh, and
 * the two loads hanging level below it. Proportion matters more than detail
 * here: the figure has to stay clearly taller than its load.
 */
export const Farmer: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 240 320" className={className} aria-hidden="true">
    <g fill="currentColor">
      {/* Carrying pole, bowed by the load. */}
      <path d="M14 96 C 80 82, 160 82, 226 96 L226 105 C 160 91, 80 91, 14 105 Z" />

      {/* Cords down to each load. */}
      <rect x="24" y="99" width="4" height="44" />
      <rect x="212" y="99" width="4" height="44" />

      {/* Two loads of rice. Deliberately kept to about a sixth of the figure's
          height: at basket-to-torso parity the silhouette read as two mushrooms
          with a stick between them rather than as a person carrying a load. */}
      {[26, 214].map((bx, i) => (
        <g key={i}>
          <path d={`M${bx - 21} 142 L${bx + 21} 142 L${bx + 16} 176 C ${bx + 8} 183, ${bx - 8} 183, ${bx - 16} 176 Z`} />
          {[-1, -0.34, 0.34, 1].map((k, j) => (
            <path
              key={j}
              d={`M${bx + k * 9} 144 C ${bx + k * 20} 130, ${bx + k * 26} 122, ${bx + k * 31} 118
                  L${bx + k * 23} 138 Z`}
            />
          ))}
        </g>
      ))}

      {/* Nón lá. The widest thing above the shoulders, so it is what names the
          figure at silhouette size. */}
      {/* A true cone, not a dome. Drawn shallow it read as a mushroom cap on a
          stick; the steep apex is what makes it a nón lá. */}
      <path d="M80 60 Q 120 8 160 60 Q 120 71 80 60 Z" />
      <ellipse cx="120" cy="60" rx="41" ry="5.5" />

      {/* Head, neck, torso. */}
      <circle cx="120" cy="77" r="11.5" />
      <path d="M105 84 L135 84 L141 176 C 130 185, 110 185, 99 176 Z" />

      {/* Arms up to the pole. */}
      <path d="M110 100 C 92 100, 68 98, 40 96 L40 105 C 68 107, 94 110, 111 111 Z" />
      <path d="M130 100 C 148 100, 172 98, 200 96 L200 105 C 172 107, 146 110, 129 111 Z" />

      {/* Legs. Hinged at the hip and swung by the intro's stylesheet — the
          timeline lives in one place, so a leg cannot drift out of step with
          the walker's travel across the frame. */}
      <g className="intro-leg-a">
        <path d="M106 172 L121 172 L125 262 L131 308 L108 308 L105 260 Z" />
      </g>
      <g className="intro-leg-b">
        <path d="M120 172 L135 172 L136 260 L142 308 L119 308 L115 262 Z" />
      </g>
    </g>
  </svg>
);
/* ------------------------------------------------------------------ */
/* Farmers working in the fields (Nông dân làm việc trên đồng ruộng)   */
/* ------------------------------------------------------------------ */

/**
 * A farmer bending down to plant rice seedlings in the paddy (Nông dân cấy lúa).
 */
export const FarmerPlanter: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 220 180" className={className} aria-hidden="true">
    <g fill="currentColor">
      {/* Nón lá tilted forward */}
      <path d="M70 42 Q105 4 140 42 Q105 52 70 42 Z" />
      <ellipse cx="105" cy="42" rx="35" ry="5" />
      {/* Head */}
      <circle cx="105" cy="54" r="10" />
      {/* Bent back and torso */}
      <path d="M96 58 C80 68 70 90 74 116 C88 122 118 120 126 112 C124 88 116 66 106 58 Z" />
      {/* Arms reaching down to plant rice seedlings */}
      <path d="M116 76 C130 92 144 118 142 146 L134 146 C136 122 124 100 110 86 Z" />
      <path d="M100 78 C108 96 116 120 118 148 L110 148 C108 124 102 102 94 88 Z" />
      {/* Rice seedlings bundle (Mạ non) */}
      <path d="M116 142 L112 165 L124 165 L120 142 Z" opacity="0.8" />
      <path d="M136 140 L132 165 L144 165 L140 140 Z" opacity="0.8" />
      {[-8, -3, 3, 8].map((dx, i) => (
        <path key={i} d={`M${120 + dx} 145 Q${120 + dx * 2} 130 ${120 + dx * 2.5} 122`} stroke="currentColor" strokeWidth="2.5" fill="none" />
      ))}
      {/* Legs crouching in paddy water */}
      <path d="M74 114 C68 132 64 154 60 172 L72 172 C76 156 80 136 84 120 Z" />
      <path d="M90 116 C88 134 86 156 84 172 L96 172 C98 156 100 136 102 118 Z" />
      {/* Water ripple at feet */}
      <ellipse cx="80" cy="172" rx="36" ry="4" opacity="0.4" />
    </g>
  </svg>
);
/**
 * A farmer hoeing the field / embankment (Nông dân cuốc đất).
 */
export const FarmerHoeing: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 240 280" className={className} aria-hidden="true">
    <g fill="currentColor">
      {/* Nón lá */}
      <path d="M90 48 Q125 10 160 48 Q125 58 90 48 Z" />
      <ellipse cx="125" cy="48" rx="35" ry="5" />
      {/* Head */}
      <circle cx="125" cy="62" r="10" />
      {/* Torso */}
      <path d="M112 68 L138 68 L142 148 C132 154 116 154 108 148 Z" />
      {/* Arms holding hoe */}
      <g className="intro-hoe-swing">
        <path d="M118 80 C106 94 92 108 72 116 L66 108 C84 102 96 90 106 76 Z" />
        <path d="M132 80 C118 96 98 114 74 122 L70 114 C92 106 110 90 122 76 Z" />
        {/* Hoe handle (Cán cuốc) */}
        <line x1="105" y1="52" x2="30" y2="230" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        {/* Hoe blade (Lưỡi cuốc) */}
        <polygon points="32,224 16,242 28,244 42,230" />
      </g>
      {/* Legs */}
      <path d="M110 146 L124 146 L118 252 L106 252 Z" />
      <path d="M128 146 L142 146 L154 252 L142 252 Z" />
    </g>
  </svg>
);

/**
 * A farmer with water buffalo walking on the dike (Nông dân và con trâu trên bờ ruộng).
 */
export const FarmerBuffalo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 340 220" className={className} aria-hidden="true">
    <g fill="currentColor">
      {/* Water Buffalo body */}
      <ellipse cx="160" cy="130" rx="72" ry="44" />
      {/* Buffalo neck and head */}
      <path d="M100 134 C82 126 68 112 56 94 C64 86 80 84 94 92 C108 100 120 114 128 126 Z" />
      <path d="M56 94 C46 88 40 76 44 68 C54 62 66 70 72 82 Z" />
      {/* Curved crescent horns (Sừng trâu cong vút) */}
      <path d="M64 74 C58 50 42 32 18 24 C34 38 46 54 48 70 Z" />
      <path d="M72 74 C78 50 96 32 120 24 C104 38 90 54 86 70 Z" />
      {/* Buffalo ears */}
      <ellipse cx="42" cy="74" rx="10" ry="4" transform="rotate(-20 42 74)" />
      <ellipse cx="88" cy="74" rx="10" ry="4" transform="rotate(20 88 74)" />
      {/* Buffalo legs */}
      <rect x="110" y="154" width="12" height="56" rx="4" />
      <rect x="136" y="156" width="11" height="54" rx="4" />
      <rect x="194" y="154" width="12" height="56" rx="4" />
      <rect x="216" y="156" width="11" height="54" rx="4" />
      {/* Buffalo tail */}
      <path d="M228 126 C242 142 248 166 244 188 L240 186 C244 166 238 144 226 130 Z" />
      {/* Lead cord / rope to farmer */}
      <path d="M50 82 C40 98 32 118 20 138" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2" />
      {/* Farmer / boy leading the buffalo */}
      <g transform="translate(-10, 38) scale(0.65)">
        {/* Nón lá */}
        <path d="M20 50 Q50 15 80 50 Q50 58 20 50 Z" />
        {/* Head */}
        <circle cx="50" cy="62" r="9" />
        {/* Torso */}
        <path d="M40 68 L60 68 L64 130 C55 135 44 135 38 130 Z" />
        {/* Arm holding rope */}
        <path d="M56 78 C68 88 80 100 86 114 L78 116 C74 104 64 94 52 84 Z" />
        {/* Legs */}
        <path d="M40 128 L50 128 L46 200 L38 200 Z" />
        <path d="M52 128 L62 128 L66 200 L58 200 Z" />
      </g>
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Auspicious Cloud (Vân mây thời Lý - Đại Việt)                      */
/* ------------------------------------------------------------------ */

/**
 * Traditional Vietnamese celestial cloud motif ("Vân mây đao lửa / mây hình khánh")
 * Swirling spiral head with streaming flame tails accompanying the scene in the sky.
 */
export const AuspiciousCloud: React.FC<{ className?: string; flip?: boolean }> = ({ className, flip }) => (
  <svg
    viewBox="0 0 260 120"
    className={className}
    fill="currentColor"
    aria-hidden="true"
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
  >
    {/* Main swirling cloud head */}
    <path
      d="M50 82 C22 82 4 64 4 40 C4 18 24 2 48 2 C68 2 84 14 90 30 C96 26 104 24 112 24 C128 24 140 34 144 48 C152 46 160 48 168 54 C178 48 190 48 198 56 C214 44 238 52 248 70 C258 88 244 110 224 114 C204 118 184 106 176 92 C168 96 156 94 146 88 C136 96 120 98 108 92 C98 106 76 112 56 104 C38 98 42 86 50 82 Z"
      opacity="0.88"
    />
    {/* Inner cloud swirl line */}
    <path
      d="M32 50 C32 38 42 28 54 28 C64 28 72 36 72 46 C72 54 66 60 58 60 C52 60 48 56 48 50 C48 46 50 44 54 44"
      fill="none"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    {/* Trailing flame wisp / ribbon */}
    <path
      d="M170 82 C196 82 226 94 256 86 C240 98 214 104 188 96 Z"
      opacity="0.75"
    />
  </svg>
);
