/**
 * The ambient Vietnamese backdrop the whole app sits on.
 *
 * Fixed to the viewport rather than placed in the document flow: a decorative
 * layer that scrolls with content competes with it for attention, and re-paints
 * a full-page SVG on every scroll frame.
 *
 * Two things this file depends on, both easy to break from outside it:
 *
 *   1. App's root <div> must not paint its own background. This layer sits at
 *      -z-10, so any opaque background on the wrapper covers it completely —
 *      which is exactly how the first version shipped invisible.
 *   2. Every motif is drawn in its flat-colour mode. The gradient artwork is
 *      built for a mark at full strength; behind body copy at 6% it turns into
 *      a smear, and its light stops disappear into the cream entirely.
 *
 * Contrast budget: the page is cream (#FAF8F5) and body copy is near-black.
 * Deep greens hold at 5–7%; gold is a light hue and needs 9–11% to register at
 * all. Nothing here goes above 11%, which stays well clear of text legibility.
 */

import React from 'react';
import { BambooColumn, DrumStar, MountainRiver } from './DongSonMotifs';
import { GoldenDragon } from './GoldenDragon';
import { LacBird } from './LacBird';

const INK = '#1F3A28';
const GOLD = '#B8860B';

export const PageBackdrop: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
    {/* Warm paper wash, lightest at the top where the header sits. */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#FCFAF7] via-[#F7F2E9] to-[#F1E7D7]" />

    {/* Drum star, off-centre so it reads as a watermark rather than a target. */}
    <DrumStar className="absolute -left-32 top-10 h-[30rem] w-[30rem] text-[#A82323] opacity-[0.05]" />

    {/* The dragon: the largest single motif, anchored to the right margin where
        the content column does not reach on wide screens. Hidden below md —
        at phone width there is no margin for it to live in, and it would sit
        straight under the text. */}
    <GoldenDragon
      color={GOLD}
      className="absolute -right-16 top-1/2 hidden h-[86vh] w-auto -translate-y-1/2 opacity-[0.10] md:block lg:-right-6"
    />

    {/* Bamboo down the left margin, balancing the dragon on the right. */}
    <BambooColumn className="absolute -left-4 bottom-0 hidden h-[80vh] w-40 text-[#1F3A28] opacity-[0.07] lg:block" />

    {/* A skein of Lạc birds — the same mark as the logo, so the decoration and
        the brand are visibly one thing. Kept in the side margins: the content
        column is a run of opaque white cards, and anything placed behind it is
        simply not on screen. */}
    <LacBird color={GOLD} className="absolute right-[3%] top-[9%] hidden w-36 opacity-[0.12] lg:block" />
    <LacBird color={GOLD} className="absolute right-[10%] top-[27%] hidden w-20 opacity-[0.09] xl:block" />
    <LacBird color={GOLD} className="absolute bottom-[22%] left-[2%] hidden w-28 opacity-[0.10] lg:block" />

    {/* Mountains and river along the foot of the viewport. Taller than looks
        necessary: the middle of the band is always behind the content column or
        the footer, so only the peaks reaching into the side margins are ever
        actually seen. */}
    <MountainRiver className="absolute inset-x-0 bottom-0 h-56 text-[#2E5A46] opacity-[0.12] sm:h-72" />
  </div>
);
