/**
 * ViS-Go opening sequence — "Con Rồng cháu Tiên".
 *
 * A 12 second 2D cinematic, played once per browser tab before the app is
 * revealed. It replaced a three.js version: WebGL bought nothing here, cost
 * every first-time visitor a 548 KB engine download, went black wherever a
 * context was refused, and — the real reason — could never carry the dragon
 * and the Lạc bird as *drawn*. Both are flat vector artwork with gradients;
 * rebuilding them out of primitives lost the thing that made them worth using.
 * Here the same two SVGs the brand uses everywhere are the stars of the scene.
 *
 * One clock. Every animation runs `var(--d)` long — the full sequence — and all
 * staging lives inside keyframe percentages rather than in `animation-delay`.
 * That has two consequences worth the small awkwardness of writing keyframes
 * that way:
 *
 *   1. Nothing can drift out of sync, because there is only one duration.
 *   2. The whole scene freezes at any chosen moment by setting a single
 *      negative delay and pausing, which is how it gets reviewed frame by
 *      frame instead of by squinting at a moving picture.
 *
 * Three rules keep a splash screen from becoming an obstacle: skippable from
 * the first frame, shown once per session, and skipped outright under
 * `prefers-reduced-motion` (handled in introGate).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LacBird } from './brand/LacBird';
import {
  BambooCane,
  Farmer,
  FarmerPlanter,
  FarmerHoeing,
  FarmerBuffalo,
  Ridge,
  AuspiciousCloud,
} from './brand/IntroScenery';
import { markIntroPlayed } from '../utils/introGate';
import { isIntroMuted, playIntroMusic, setIntroMuted, type IntroMusic } from '../utils/introMusic';
import type { Language } from '../types';

export const INTRO_MS = 12_000;

interface IntroSequenceProps {
  language: Language;
  onFinish: () => void;
}

/* ------------------------------------------------------------------ */
/* Scene stylesheet                                                    */
/* ------------------------------------------------------------------ */


/**
 * Builds `cycles` oscillations of a transform across the full sequence.
 *
 * Everything in this scene shares one duration so nothing can drift and the
 * whole thing freezes at a chosen moment with a single negative delay. Repeated
 * motion — a wingbeat, a stride, a body undulating — therefore cannot use a
 * short looping animation; the cycles have to be written into the keyframe
 * percentages. Writing thirty stops by hand is how they end up subtly uneven,
 * so they are generated.
 */
function oscillate(name: string, cycles: number, a: string, b: string): string {
  const steps = cycles * 2;
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) {
    stops.push(`${((i / steps) * 100).toFixed(3)}% { transform: ${i % 2 === 0 ? a : b} }`);
  }
  return `@keyframes ${name} { ${stops.join(' ')} }`;
}

const SCENE_CSS = `
.vg-intro {
  --d: ${INTRO_MS}ms;
  --gold: #F0C75E;
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #070B1C;
}
.vg-intro * { animation-duration: var(--d); animation-timing-function: linear; animation-fill-mode: both; }
.vg-intro .layer { position: absolute; inset: 0; }

/* --- Sky ---------------------------------------------------------- */
.vg-night {
  background:
    radial-gradient(120% 90% at 50% 100%, #16204A 0%, #0A0F28 55%, #070B1C 100%);
}
.vg-dawn {
  background:
    radial-gradient(90% 62% at 50% 82%, rgba(255,214,138,0.95) 0%, rgba(233,124,58,0.85) 34%, rgba(140,42,58,0.6) 62%, rgba(24,20,58,0) 88%),
    linear-gradient(180deg, #1B1C46 0%, #55265A 38%, #B34A3C 68%, #E98B45 88%, #F6C46A 100%);
  animation-name: vg-dawn;
}
@keyframes vg-dawn { 0%,16% { opacity: 0 } 52%,100% { opacity: 1 } }

.vg-stars { animation-name: vg-stars; }
@keyframes vg-stars { 0% { opacity: 0 } 6%,20% { opacity: .85 } 42%,100% { opacity: 0 } }

/* --- Sun ---------------------------------------------------------- */
.vg-sun {
  position: absolute; left: 50%; bottom: 26%;
  width: clamp(120px, 17vw, 280px); aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle, #FFF6D8 0%, #FFD98A 42%, #F2A65A 68%, rgba(242,166,90,0) 72%);
  filter: blur(0.5px);
  animation-name: vg-sun;
}
.vg-sunglow {
  position: absolute; left: 50%; bottom: 26%;
  width: clamp(420px, 78vw, 1200px); aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,206,120,0.5) 0%, rgba(233,124,58,0.22) 38%, rgba(233,124,58,0) 68%);
  animation-name: vg-sun;
}
@keyframes vg-sun {
  0%,16% { opacity: 0; transform: translate(-50%, 62%) }
  34%    { opacity: 1; transform: translate(-50%, 34%) }
  64%    { opacity: 1; transform: translate(-50%, -6%) }
  100%   { opacity: .92; transform: translate(-50%, -16%) }
}

/* --- Mountains ---------------------------------------------------- */
.vg-ridge { position: absolute; left: -6%; width: 112%; bottom: 0; display: block; }
.vg-ridge-far  { height: 46%; color: #2B2350; opacity: .95; animation-name: vg-ridge-far }
.vg-ridge-mid  { height: 34%; color: #1A1638; animation-name: vg-ridge-mid }
.vg-ridge-near { height: 24%; color: #0D0B22; animation-name: vg-ridge-near }
@keyframes vg-ridge-far  { 0%,4% { opacity: 0; transform: translate(0, 6%) } 22%,100% { opacity: .95; transform: none } }
@keyframes vg-ridge-mid  { 0%,6% { opacity: 0; transform: translate(-1%, 8%) } 26%,100% { opacity: 1; transform: none } }
@keyframes vg-ridge-near { 0%,8% { opacity: 0; transform: translate(1%, 10%) } 30%,100% { opacity: 1; transform: none } }

/* --- Mist --------------------------------------------------------- */
.vg-mist {
  position: absolute; left: -30%; width: 160%; height: 26%;
  background: linear-gradient(180deg, rgba(255,225,180,0) 0%, rgba(255,222,178,0.3) 45%, rgba(255,222,178,0) 100%);
  filter: blur(18px);
}
.vg-mist-1 { bottom: 16%; animation-name: vg-mist1 }
.vg-mist-2 { bottom: 6%;  animation-name: vg-mist2 }
@keyframes vg-mist1 { 0% { opacity: 0; transform: translateX(-6%) } 30% { opacity: .9 } 100% { opacity: .7; transform: translateX(8%) } }
@keyframes vg-mist2 { 0% { opacity: 0; transform: translateX(7%) } 34% { opacity: 1 } 100% { opacity: .8; transform: translateX(-7%) } }

/* --- Lạc birds (Flock of 5 birds flying across the sky) ----------- */
.vg-bird { position: absolute; filter: drop-shadow(0 4px 16px rgba(0,0,0,0.4)); }
.vg-bird .lac-wing-upper { animation-name: vg-flap-up; animation-timing-function: ease-in-out; }
.vg-bird .lac-wing-lower { animation-name: vg-flap-low; animation-timing-function: ease-in-out; }
.vg-bird .lac-tailfan    { animation-name: vg-trail; animation-timing-function: ease-in-out; }
.vg-bird-inner { animation-name: vg-bob; animation-timing-function: ease-in-out; }

.vg-bird-1 { top: 24%; width: clamp(88px, 12vw, 180px); animation-name: vg-bird1 }
.vg-bird-2 { top: 14%; width: clamp(64px, 8.5vw, 130px); animation-name: vg-bird2 }
.vg-bird-3 { top: 32%; width: clamp(52px, 7vw, 105px);  animation-name: vg-bird3 }
.vg-bird-4 { top: 8%;  width: clamp(40px, 5.5vw, 82px);  animation-name: vg-bird4 }
.vg-bird-5 { top: 38%; width: clamp(34px, 4.5vw, 70px);  animation-name: vg-bird5 }

@keyframes vg-bird1 {
  0%,20% { opacity: 0; transform: translate(-24vw, 12vh) }
  26%    { opacity: 1 }
  70%    { opacity: 1 }
  80%,100% { opacity: 0; transform: translate(116vw, -14vh) }
}
@keyframes vg-bird2 {
  0%,25% { opacity: 0; transform: translate(-20vw, 16vh) }
  31%    { opacity: .95 }
  75%    { opacity: .95 }
  85%,100% { opacity: 0; transform: translate(114vw, -18vh) }
}
@keyframes vg-bird3 {
  0%,30% { opacity: 0; transform: translate(-18vw, 10vh) }
  36%    { opacity: .88 }
  79%    { opacity: .88 }
  89%,100% { opacity: 0; transform: translate(112vw, -10vh) }
}
@keyframes vg-bird4 {
  0%,34% { opacity: 0; transform: translate(-22vw, 14vh) }
  40%    { opacity: .8 }
  82%    { opacity: .8 }
  92%,100% { opacity: 0; transform: translate(110vw, -16vh) }
}
@keyframes vg-bird5 {
  0%,38% { opacity: 0; transform: translate(-16vw, 8vh) }
  44%    { opacity: .75 }
  85%    { opacity: .75 }
  94%,100% { opacity: 0; transform: translate(110vw, -8vh) }
}

/* --- Auspicious Clouds (Vân Mây Đại Việt) -------------------------- */
/* Clouds appear near the end (56% to 74%) as the title emerges */
.vg-cloud-group {
  position: absolute; inset: 0; pointer-events: none;
  animation-name: vg-cloud-end-fade;
}
@keyframes vg-cloud-end-fade {
  0%, 56%  { opacity: 0; transform: translateY(14px) scale(0.95); }
  72%      { opacity: 1; transform: translateY(0) scale(1); }
  90%      { opacity: 1; }
  100%     { opacity: 0.95; }
}

.vg-cloud-item {
  position: absolute;
  pointer-events: none;
  filter: drop-shadow(0 4px 16px rgba(255,180,80,0.25));
}
.vg-c-float-a { animation-name: vg-c-float-a; animation-timing-function: ease-in-out; }
.vg-c-float-b { animation-name: vg-c-float-b; animation-timing-function: ease-in-out; }
.vg-c-float-c { animation-name: vg-c-float-c; animation-timing-function: ease-in-out; }
.vg-c-float-d { animation-name: vg-c-float-d; animation-timing-function: ease-in-out; }

/* --- Bamboo ------------------------------------------------------- */
.vg-grove { position: absolute; bottom: -2%; height: 94%; display: flex; align-items: flex-end; gap: 0; width: min(30vw, 430px); }
.vg-grove-l { left: 0;  transform-origin: 50% 100%; animation-name: vg-grove-l }
.vg-grove-r { right: 0; transform-origin: 50% 100%; animation-name: vg-grove-r }
@keyframes vg-grove-l { 0% { opacity: 0; transform: translateX(-46%) } 11% { opacity: 1 } 100% { opacity: 1; transform: translateX(0) rotate(.5deg) } }
@keyframes vg-grove-r { 0% { opacity: 0; transform: translateX(46%) }  11% { opacity: 1 } 100% { opacity: 1; transform: translateX(0) rotate(-.5deg) } }
.vg-cane { height: 100%; color: #071A12; overflow: visible; filter: drop-shadow(0 5px 6px rgba(0,0,0,.18)); }
.vg-grove > div { transform-origin: 50% 100%; }

/* --- Ground and Working Farmers ----------------------------------- */
.vg-ground {
  position: absolute; inset-inline: 0; bottom: 0; height: 15%; z-index: 2;
  background: linear-gradient(180deg, rgba(8,10,22,0) 0%, #06070F 62%);
}
.vg-worker {
  position: absolute; color: #04050C; z-index: 3;
  filter: drop-shadow(0 0 12px rgba(255,170,80,0.35));
}
.vg-worker-planter {
  bottom: 3.5%; left: 14%; height: clamp(75px, 15vh, 150px);
  animation-name: vg-worker-fade;
}
.vg-worker-planter-2 {
  bottom: 4.5%; left: 24%; height: clamp(65px, 13vh, 130px);
  animation-name: vg-worker-fade;
}
.vg-worker-hoeing {
  bottom: 5.5%; left: 34%; height: clamp(95px, 19vh, 190px);
  animation-name: vg-worker-fade;
}
.vg-worker-buffalo {
  bottom: 4.5%; height: clamp(90px, 18vh, 180px);
  animation-name: vg-buffalo-walk;
}
.intro-planter-sway { animation-name: vg-plant-sway; animation-timing-function: ease-in-out; }
.intro-hoe-swing { animation-name: vg-hoe-swing; animation-timing-function: ease-in-out; transform-origin: 125px 68px; }

@keyframes vg-worker-fade {
  0%, 14% { opacity: 0; transform: translateY(10px); }
  24%     { opacity: 1; transform: translateY(0); }
  92%     { opacity: 1; }
  100%    { opacity: 0; }
}

@keyframes vg-buffalo-walk {
  0%, 20% { opacity: 0; transform: translateX(20vw); }
  28%     { opacity: 1; }
  90%     { opacity: 1; }
  100%    { opacity: 0; transform: translateX(-65vw); }
}

.vg-walker {
  position: absolute; bottom: 6%; color: #04050C; z-index: 3;
  filter: drop-shadow(0 0 12px rgba(255,170,80,0.35));
}
.vg-walker-1 { height: clamp(170px, 34vh, 400px); animation-name: vg-walk1 }
.vg-walker-2 { height: clamp(132px, 26vh, 310px); bottom: 10%; animation-name: vg-walk2 }
@keyframes vg-walk1 { 0%,26% { opacity: 0; transform: translateX(22vw) } 32% { opacity: 1 } 90% { opacity: 1 } 100% { opacity: 0; transform: translateX(-128vw) } }
@keyframes vg-walk2 { 0%,36% { opacity: 0; transform: translateX(26vw) } 42% { opacity: 1 } 92% { opacity: 1 } 100% { opacity: 0; transform: translateX(-118vw) } }

/* Mobile responsiveness: preserve framing bamboos and adjust character density */
@media (max-width: 768px) {
  /* Prominent bamboo stalks framing the left and right margins on mobile */
  .vg-grove {
    width: clamp(75px, 22vw, 120px) !important;
    height: 90% !important;
    bottom: -1% !important;
    z-index: 3 !important;
  }
  .vg-grove-l {
    left: -2% !important;
  }
  .vg-grove-r {
    right: -2% !important;
  }
  .vg-cane {
    color: #0A1E14 !important;
    filter: drop-shadow(0 0 8px rgba(255, 180, 80, 0.35)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45)) !important;
  }
  /* Show 3 nicely staggered bamboo canes on mobile */
  .vg-grove > div:nth-child(1) { width: 44px !important; height: 82% !important; display: block !important; }
  .vg-grove > div:nth-child(2) { width: 48px !important; height: 96% !important; margin-left: -14px !important; display: block !important; }
  .vg-grove > div:nth-child(3) { width: 40px !important; height: 74% !important; margin-left: -12px !important; display: block !important; }
  .vg-grove > div:nth-child(n+4) { display: none !important; }

  /* Worker adjustments on mobile */
  .vg-worker-planter-2,
  .vg-worker-hoeing,
  .vg-walker-2 {
    display: none !important;
  }
  .vg-worker-planter {
    left: 8%;
    bottom: 2.5%;
    height: clamp(55px, 12vh, 85px);
  }
  .vg-worker-buffalo {
    bottom: 3.5%;
    height: clamp(65px, 14vh, 95px);
  }
  .vg-walker-1 {
    height: clamp(100px, 20vh, 160px);
    bottom: 4%;
  }
}

/* Eight strides across the sequence: fast enough to read as walking, slow
   enough not to look like a sprint at this scale. Keyframes generated below. */
.intro-leg-a { animation-name: vg-stride-a; animation-timing-function: ease-in-out; }
.intro-leg-b { animation-name: vg-stride-b; animation-timing-function: ease-in-out; }
.intro-leg-a { transform-origin: 113px 176px; }
.intro-leg-b { transform-origin: 127px 176px; }

/* --- Motes and vignette ------------------------------------------- */
.vg-mote {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,226,160,.95) 0%, rgba(255,196,100,0) 70%);
  animation-name: vg-mote;
}
@keyframes vg-mote {
  0%,18% { opacity: 0; transform: translateY(24vh) }
  40%    { opacity: .85 }
  78%    { opacity: .6 }
  100%   { opacity: 0; transform: translateY(-30vh) }
}
.vg-vignette {
  background: radial-gradient(120% 90% at 50% 46%, transparent 42%, rgba(4,5,14,0.5) 78%, rgba(4,5,14,0.88) 100%);
}

/* --- Title -------------------------------------------------------- */
.vg-titlecard { position: absolute; inset-inline: 0; top: 16%; z-index: 4; }
@media (min-width: 640px) { .vg-titlecard { top: 20%; } }
.vg-title, .vg-title-sub, .vg-title-rule { animation-duration: var(--d); animation-fill-mode: both; }
.vg-title { animation-name: vg-title }
@keyframes vg-title {
  0%,66% { opacity: 0; transform: translateY(30px) }
  78%,100% { opacity: 1; transform: none }
}
.vg-title-sub { animation-name: vg-title-sub }
@keyframes vg-title-sub { 0%,72% { opacity: 0 } 84%,100% { opacity: 1 } }
.vg-title-rule { animation-name: vg-title-rule }
@keyframes vg-title-rule { 0%,76% { opacity: 0; transform: scaleX(.2) } 90%,100% { opacity: 1; transform: none } }

${oscillate('vg-flap-up', 16, 'rotate(-19deg)', 'rotate(13deg)')}
${oscillate('vg-flap-low', 16, 'rotate(9deg)', 'rotate(-7deg)')}
${oscillate('vg-trail', 16, 'rotate(5deg)', 'rotate(-4deg)')}
${oscillate('vg-bob', 16, 'translateY(-4%)', 'translateY(4%)')}
${oscillate('vg-stride-a', 8, 'rotate(13deg)', 'rotate(-13deg)')}
${oscillate('vg-stride-b', 8, 'rotate(-13deg)', 'rotate(13deg)')}
${oscillate('vg-c-float-a', 6, 'translate(10px, -6px) scale(1.02)', 'translate(-8px, 6px) scale(0.98)')}
${oscillate('vg-c-float-b', 5, 'translate(-12px, 8px) scale(0.97)', 'translate(9px, -8px) scale(1.03)')}
${oscillate('vg-c-float-c', 7, 'translate(8px, 9px) scale(1.02)', 'translate(-10px, -7px) scale(0.98)')}
${oscillate('vg-c-float-d', 6, 'translate(-8px, -10px) scale(0.98)', 'translate(11px, 6px) scale(1.02)')}
${oscillate('vg-plant-sway', 10, 'translateY(0) rotate(0deg)', 'translateY(3px) rotate(-3deg)')}
${oscillate('vg-hoe-swing', 8, 'rotate(0deg)', 'rotate(-22deg)')}
`;

/**
 * Auspicious clouds (Vân Mây Đại Việt) placed across the sunrise sky.
 * They appear near the end of the intro sequence (56% to 74%) and hover softly in place.
 */
const AUSPICIOUS_CLOUDS = [
  { top: '14%', left: '5%', w: 'clamp(115px, 15vw, 230px)', color: '#FFD666', op: 0.68, float: 'vg-c-float-a', flip: false },
  { top: '26%', left: '17%', w: 'clamp(95px, 12vw, 185px)', color: '#FFA940', op: 0.58, float: 'vg-c-float-b', flip: true },
  { top: '9%', left: '35%', w: 'clamp(140px, 18vw, 270px)', color: '#FFF1B8', op: 0.74, float: 'vg-c-float-c', flip: false },
  { top: '20%', left: '54%', w: 'clamp(110px, 14vw, 215px)', color: '#FFD666', op: 0.64, float: 'vg-c-float-d', flip: false },
  { top: '12%', left: '72%', w: 'clamp(130px, 17vw, 250px)', color: '#FFA940', op: 0.70, float: 'vg-c-float-a', flip: true },
  { top: '30%', left: '83%', w: 'clamp(90px, 11vw, 175px)', color: '#FFD666', op: 0.55, float: 'vg-c-float-b', flip: false },
  { top: '42%', left: '8%', w: 'clamp(105px, 13vw, 195px)', color: '#FA8C16', op: 0.50, float: 'vg-c-float-c', flip: false },
  { top: '38%', left: '66%', w: 'clamp(120px, 15vw, 230px)', color: '#FA8C16', op: 0.52, float: 'vg-c-float-d', flip: true },
];

/** Star field, generated once. A background-image of dots costs no elements. */
function useStarField(): string {
  return React.useMemo(() => {
    const dots: string[] = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    // Authored at roughly screen scale. At viewBox 0 0 100 100 stretched over
    // the viewport, a radius of 1 became a 13px ellipse and the sky filled with
    // grey blobs.
    for (let i = 0; i < 150; i++) {
      const x = (rnd() * 1600).toFixed(1);
      const y = (rnd() * 620).toFixed(1);
      const r = (rnd() * 1.3 + 0.5).toFixed(2);
      const a = (rnd() * 0.6 + 0.3).toFixed(2);
      dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${a}"/>`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="none">${dots.join('')}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, []);
}

/** Cane width / height / spacing, front-to-back within one margin. */
const GROVE = [
  { w: 'clamp(58px, 6vw, 96px)', h: '72%', gap: '-1.2vw', lean: -4.2 },
  { w: 'clamp(62px, 6.4vw, 104px)', h: '91%', gap: '-2.6vw', lean: 2.1 },
  { w: 'clamp(52px, 5.5vw, 90px)', h: '79%', gap: '-2.4vw', lean: -1.2 },
  { w: 'clamp(68px, 7vw, 112px)', h: '106%', gap: '-2.8vw', lean: 1.1 },
  { w: 'clamp(50px, 5.2vw, 84px)', h: '68%', gap: '-2.7vw', lean: 4.4 },
  { w: 'clamp(60px, 6.2vw, 100px)', h: '87%', gap: '-2.6vw', lean: -2.6 },
  { w: 'clamp(48px, 5vw, 80px)', h: '61%', gap: '-2.5vw', lean: 3.4 },
];

const MOTES = [
  { left: '14%', bottom: '22%', size: 7 },
  { left: '27%', bottom: '12%', size: 4 },
  { left: '39%', bottom: '30%', size: 9 },
  { left: '58%', bottom: '16%', size: 5 },
  { left: '69%', bottom: '26%', size: 8 },
  { left: '81%', bottom: '11%', size: 4 },
  { left: '91%', bottom: '24%', size: 6 },
  { left: '48%', bottom: '8%', size: 5 },
];

export const IntroSequence: React.FC<IntroSequenceProps> = ({ language, onFinish }) => {
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const finishedRef = useRef(false);
  const vi = language === 'vi';
  const stars = useStarField();

  /**
   * Sound.
   *
   * `muted` is the visitor's stated preference, remembered across visits.
   * `audible` is whether sound is genuinely coming out right now, which is a
   * different question: a first visit has had no interaction yet, and every
   * current browser refuses to start audio in that situation. When the two
   * disagree the button below says "bật nhạc" and one tap fixes it — which is
   * itself the gesture the autoplay policy was waiting for.
   */
  const [muted, setMuted] = useState(isIntroMuted);
  const [audible, setAudible] = useState(false);
  const musicRef = useRef<IntroMusic | null>(null);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markIntroPlayed();
    // Fade the cue out over the same 620ms the picture takes to leave, so
    // sound and image end together instead of the music snapping off.
    musicRef.current?.stop(0.62);
    musicRef.current = null;
    setLeaving(true);
    // Let the fade-out play before unmounting.
    window.setTimeout(onFinish, 620);
  }, [onFinish]);

  // Start the cue with the scene. Runs once: `muted` is deliberately not a
  // dependency, because unmuting later goes through `toggleSound` and
  // restarting the piece from the top halfway through the picture would be
  // worse than the silence it replaced.
  useEffect(() => {
    if (isIntroMuted()) return;
    const music = playIntroMusic(INTRO_MS);
    musicRef.current = music;
    // `play()` resolves a tick later, so read the verdict after it settles
    // rather than immediately.
    const id = window.setTimeout(() => setAudible(music.playing), 400);
    return () => {
      window.clearTimeout(id);
      music.stop(0.2);
      musicRef.current = null;
    };
  }, []);

  const toggleSound = useCallback(async () => {
    if (muted || !audible) {
      setMuted(false);
      setIntroMuted(false);
      if (!musicRef.current) {
        musicRef.current = playIntroMusic(INTRO_MS);
      }
      const ok = await musicRef.current.resume();
      setAudible(ok);
      return;
    }
    setMuted(true);
    setIntroMuted(true);
    setAudible(false);
    musicRef.current?.stop(0.3);
    musicRef.current = null;
  }, [muted, audible]);

  // The progress hairline is the only thing driven from JS. Everything visual
  // is CSS, so a busy main thread cannot stutter the scene itself.
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / INTRO_MS);
      setProgress(p);
      if (p >= 1) {
        finish();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden bg-[#070B1C] transition-opacity duration-600 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-label={vi ? 'Giới thiệu ViS-Go' : 'ViS-Go introduction'}
    >
      <style>{SCENE_CSS}</style>

      <div className="vg-intro">
        {/* Sky, back to front. */}
        <div className="layer vg-night" />
        <div className="layer vg-stars" style={{ backgroundImage: stars, backgroundSize: '100% 100%' }} />
        <div className="layer vg-dawn" />

        <div className="vg-sunglow" />
        <div className="vg-sun" />

        <Ridge className="vg-ridge vg-ridge-far" seed={0} />
        <div className="vg-mist vg-mist-1" />
        <Ridge className="vg-ridge vg-ridge-mid" seed={1} />

        {/* Auspicious clouds layer: appears near the end (56% to 74%) with the title */}
        <div className="vg-cloud-group">
          {AUSPICIOUS_CLOUDS.map((c, i) => (
            <div
              key={i}
              className={`vg-cloud-item ${c.float}`}
              style={{
                top: c.top,
                left: c.left,
                width: c.w,
                color: c.color,
                opacity: c.op,
              }}
            >
              <AuspiciousCloud className="block w-full h-auto" flip={c.flip} />
            </div>
          ))}
        </div>

        {/* Flock of 5 Lạc birds soaring across the sunrise sky */}
        <div className="vg-bird vg-bird-1">
          <div className="vg-bird-inner">
            <LacBird className="block w-full h-auto" />
          </div>
        </div>
        <div className="vg-bird vg-bird-2">
          <div className="vg-bird-inner">
            <LacBird className="block w-full h-auto" />
          </div>
        </div>
        <div className="vg-bird vg-bird-3">
          <div className="vg-bird-inner">
            <LacBird className="block w-full h-auto" />
          </div>
        </div>
        <div className="vg-bird vg-bird-4">
          <div className="vg-bird-inner">
            <LacBird className="block w-full h-auto" />
          </div>
        </div>
        <div className="vg-bird vg-bird-5">
          <div className="vg-bird-inner">
            <LacBird className="block w-full h-auto" />
          </div>
        </div>

        <Ridge className="vg-ridge vg-ridge-near" seed={2} />
        <div className="vg-mist vg-mist-2" />

        {MOTES.map((m, i) => (
          <div
            key={i}
            className="vg-mote"
            style={{ left: m.left, bottom: m.bottom, width: m.size, height: m.size }}
          />
        ))}

        {/* Bamboo down both margins, framing the valley. */}
        <div className="vg-grove vg-grove-l">
          {GROVE.map((c, i) => (
            <div key={i} style={{ width: c.w, height: c.h, marginLeft: c.gap, transform: `rotate(${c.lean}deg)` }}>
              <BambooCane seed={i + 1} className="vg-cane w-full" />
            </div>
          ))}
        </div>
        <div className="vg-grove vg-grove-r">
          {GROVE.map((c, i) => (
            <div key={i} style={{ width: c.w, height: c.h, marginLeft: c.gap, transform: `rotate(${-c.lean}deg)` }}>
              <BambooCane seed={i + 5} className="vg-cane w-full" />
            </div>
          ))}
        </div>

        <div className="vg-ground" />

        {/* Working farmers in the rice fields */}
        {/* 1. Farmer bending down planting rice seedlings in the paddy (Nông dân cấy lúa) */}
        <div className="vg-worker vg-worker-planter">
          <div className="intro-planter-sway h-full w-auto">
            <FarmerPlanter className="block h-full w-auto" />
          </div>
        </div>
        <div className="vg-worker vg-worker-planter-2">
          <div className="intro-planter-sway h-full w-auto" style={{ animationDelay: '-1.5s' }}>
            <FarmerPlanter className="block h-full w-auto" />
          </div>
        </div>

        {/* 2. Farmer hoeing the embankment (Nông dân cuốc đất) */}
        <div className="vg-worker vg-worker-hoeing">
          <FarmerHoeing className="block h-full w-auto" />
        </div>

        {/* 3. Farmer leading water buffalo on the field dike (Nông dân dắt trâu) */}
        <div className="vg-worker vg-worker-buffalo" style={{ right: '8%' }}>
          <FarmerBuffalo className="block h-full w-auto" />
        </div>

        {/* 4. Farmers walking carrying harvested rice on shoulder poles (Nông dân gánh lúa) */}
        <div className="vg-walker vg-walker-1" style={{ right: 0 }}>
          <Farmer className="block h-full w-auto" />
        </div>
        <div className="vg-walker vg-walker-2" style={{ right: 0 }}>
          <Farmer className="block h-full w-auto" />
        </div>

        <div className="layer vg-vignette" />

        {/* Title card. Inside the scene so it shares the one clock. */}
        <div className="vg-titlecard pointer-events-none flex flex-col items-center px-6 text-center">
          <h1
            className="vg-title font-black tracking-tight text-[#FDF6E6]"
            style={{
              fontSize: 'clamp(1.75rem, 6.4vw, 4.6rem)',
              textWrap: 'balance',
              textShadow: '0 6px 48px rgba(0,0,0,0.7), 0 0 90px rgba(255,180,80,0.35)',
              letterSpacing: '-0.02em',
            }}
          >
            {vi ? 'Chào mừng đến Việt Nam' : 'Welcome to Viet Nam'}
          </h1>

          <p
            className="vg-title-sub mt-2 font-semibold text-[#F0C75E]"
            style={{ fontSize: 'clamp(0.9rem, 2.3vw, 1.55rem)', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
          >
            {vi ? 'Welcome to Viet Nam' : 'Chào mừng đến Việt Nam'}
          </p>

          <div className="vg-title-rule mt-5 h-px w-32 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </div>

      {/* Skip and sound — present from the first frame, never behind a delay. */}
      <div className="absolute bottom-7 right-6 z-10 flex items-center gap-2">
        <button
          onClick={toggleSound}
          aria-pressed={audible}
          title={audible ? (vi ? 'Tắt nhạc' : 'Mute') : (vi ? 'Bật nhạc' : 'Play music')}
          className="flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-4 py-2.5 text-xs font-semibold text-white/85 backdrop-blur transition hover:border-white/50 hover:bg-black/55 hover:text-white sm:text-sm"
        >
          <i className={`fa-solid ${audible ? 'fa-volume-high' : 'fa-volume-xmark'} text-[13px]`}></i>
          {/* The label only appears when there is something to ask for. Once
              sound is playing the icon alone is enough. */}
          {!audible && <span className="hidden sm:inline">{vi ? 'Bật nhạc' : 'Music'}</span>}
        </button>

        <button
          onClick={finish}
          className="flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-5 py-2.5 text-xs font-semibold text-white/85 backdrop-blur transition hover:border-white/50 hover:bg-black/55 hover:text-white sm:text-sm"
        >
          {vi ? 'Bỏ qua' : 'Skip'}
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {/* Progress hairline, so the wait has a visible end. */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#A82323] via-[#D4AF37] to-[#F0D98A]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};
