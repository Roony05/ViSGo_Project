import React, { useState } from 'react';
import { Language } from '../types';
import { sounds } from '../utils/audio';
import { DrumFace } from './brand/DongSonMotifs';
import { LacBird } from './brand/LacBird';

/**
 * The first screen.
 *
 * WHAT THIS REPLACED, AND WHY.
 *
 * The previous hero carried fifteen separate blocks in one view: a "#1 in
 * Vietnam" pill, a headline, a three-line paragraph, three buttons, a search
 * box, nine destination pills, four trust badges, and then an entire second
 * column holding a stock photo, two overlay badges, a location strip, a host
 * mini-profile, three statistic tiles and two floating cards. A visitor landing
 * on it had to read before they could act, which is the opposite of what a
 * landing page is for.
 *
 * Several of those blocks were also untrue: "NỀN TẢNG #1 VIỆT NAM", a hard-coded
 * "4.98 / 5.0" rating, "100% verified" over hosts who are not all verified, and a
 * named host with "7 years' experience" who was simply written into the markup.
 *
 * What is here now is what a landing page actually needs: one line saying where
 * you are, one line saying what it is, one thing to type in, and two things to
 * press. Everything else on this page is below the fold, where it belongs.
 *
 * The art is ours rather than a stock photograph — the Đông Sơn drum star and
 * the Lạc bird off the Ngọc Lũ drum, in gold on deep red. It carries the
 * "abstract graphic on the right" role from the layouts this was modelled on
 * without putting a stranger's face on the front page.
 */
interface HeroBannerProps {
  language: Language;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onExploreTours: () => void;
  onOpenAIChat: () => void;
  onOpenVRHeritage: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  language,
  searchQuery,
  onSearchChange,
  onExploreTours,
  onOpenVRHeritage,
}) => {
  const isVi = language === 'vi';
  const [localInput, setLocalInput] = useState(searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playTap();
    onSearchChange(localInput);
    onExploreTours();
  };

  return (
    <section className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-[#4A0A0A] text-white shadow-2xl">
      {/* Depth, in three layers rather than one flat gradient: a warm core, a
          gold bloom top-right, and a near-black falloff bottom-left. */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7F1214] via-[#5B0C0E] to-[#2A0505]" />
      <div className="absolute -top-32 -right-24 w-[38rem] h-[38rem] rounded-full bg-radial from-amber-400/25 via-amber-500/8 to-transparent blur-3xl" />
      <div className="absolute -bottom-40 -left-32 w-[34rem] h-[34rem] rounded-full bg-radial from-[#D4AF37]/12 to-transparent blur-3xl" />

      {/* The drum face. Large, low-contrast, and behind everything — it gives
          the panel its shape without competing with the words. One very slow
          rotation: fast enough to notice if you look, slow enough that nobody
          reading a headline is distracted by it. */}
      <div className="absolute -right-28 sm:-right-16 top-1/2 -translate-y-1/2 w-[32rem] h-[32rem] sm:w-[40rem] sm:h-[40rem] text-[#D4AF37]/[0.16] pointer-events-none select-none">
        <DrumFace className="w-full h-full animate-[spin_180s_linear_infinite]" rays={14} />
      </div>

      {/* Three Lạc birds in formation, the lead bird ahead and two trailing.
          They are staggered on both axes and fade back, so the group reads as
          depth rather than as three copies of one sticker. */}
      {/* The bird artwork is 2:1, so the boxes are given that ratio explicitly.
          Square boxes letterbox the bird inside them and the flock ends up
          bunched much tighter than the offsets suggest. */}
      {/* On a phone the flock has nowhere to fly: the panel is 390px wide and
          the birds land straight on top of the tagline. Only the lead bird
          stays, pushed up into the corner; the other two are for screens with
          room for them. */}
      <div className="lac-flap absolute -right-6 sm:right-12 -top-2 sm:top-10 w-28 sm:w-52 aspect-2/1 text-[#D4AF37]/20 sm:text-[#D4AF37]/30 pointer-events-none select-none -rotate-[14deg]">
        <LacBird className="w-full h-full" />
      </div>
      <div className="lac-flap lac-flap-b hidden sm:block absolute sm:right-[19rem] sm:top-32 sm:w-36 aspect-2/1 text-[#D4AF37]/30 opacity-75 pointer-events-none select-none -rotate-[20deg]">
        <LacBird className="w-full h-full" />
      </div>
      <div className="lac-flap lac-flap-c hidden sm:block absolute sm:right-[31rem] sm:top-16 sm:w-24 aspect-2/1 text-[#D4AF37]/30 opacity-50 pointer-events-none select-none -rotate-[7deg]">
        <LacBird className="w-full h-full" />
      </div>
      <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:22px_22px] pointer-events-none" />

      <div className="relative z-10 px-6 sm:px-12 lg:px-16 pt-16 pb-14 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-24">
        <div className="max-w-3xl">
          {/* The tagline.

              This line first carried a "#1 in Vietnam" claim, then the brand
              name spelled out as an acronym — Vibrant · insider · Safe. The
              acronym was accurate but it read as a product feature list on the
              one line of the page where a traveller is deciding whether they
              want to be here at all.

              What is here now names the country first and then what the
              product actually is — somebody's homeland, told by the people who
              live in it. It says where you are before it says what we sell,
              and it sets up the headline underneath rather than competing with
              it. */}
          <p className="text-xs sm:text-sm font-bold tracking-wide leading-relaxed">
            {/* Two lines on a phone, one on a wide screen. In English the
                tagline alone is thirty characters, so on a narrow viewport it
                wrapped mid-phrase and ran into the headline below. Breaking at
                the separator puts the country on its own line and keeps the
                tagline whole. */}
            <span className="block sm:inline text-white">{isVi ? 'Việt Nam' : 'Vietnam'}</span>
            <span className="hidden sm:inline mx-2.5 text-white/25">·</span>
            <span className="block sm:inline text-[#E9C46A]">
              {isVi ? 'Chuyện kể từ quê nhà' : 'Rustic Tales from Our Homeland'}
            </span>
          </p>

          {/* One headline, as large as the viewport allows. This is the whole
              message; everything under it is a way to act on it. */}
          {/* Sized so "Đồng hành cùng" stays on one line: Vietnamese runs longer
              than the English, and at the previous size it broke into three
              lines. The leading is also looser than the 0.92 it started at —
              tight leading is fine for "Welcome." and collides the tone marks
              on Đ and ồ with the line above it in Vietnamese. */}
          <h1 className="mt-6 font-display font-black tracking-tight leading-[1.04] text-[2.6rem] sm:text-6xl lg:text-7xl">
            {/* The brand name takes the gold. It is the one word on this page
                worth making a visitor remember, and putting it in the headline
                rather than only in the navbar is what turns a landing page into
                an introduction. */}
            {isVi ? 'Đồng hành cùng' : 'Travel with'}
            <br />
            <span className="bg-gradient-to-r from-[#F5D982] via-[#D4AF37] to-[#B8892B] bg-clip-text text-transparent">
              ViS-Go
            </span>
          </h1>

          {/* Search. Deliberately the single most prominent control on the
              page — one field, one button, nothing beside it. */}
          <form onSubmit={handleSearchSubmit} className="mt-8 sm:mt-10 max-w-xl">
            <div className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.1] focus-within:bg-white/[0.12] border border-white/15 focus-within:border-[#D4AF37]/70 rounded-full p-1.5 pl-5 backdrop-blur-md transition-colors">
              <input
                type="text"
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                placeholder={isVi ? 'Bạn muốn đi đâu?' : 'Where do you want to go?'}
                aria-label={isVi ? 'Tìm tour' : 'Search tours'}
                className="flex-1 min-w-0 bg-transparent py-3 text-sm sm:text-base text-white placeholder:text-white/45 outline-hidden"
              />
              <button
                type="submit"
                aria-label={isVi ? 'Tìm' : 'Search'}
                className="w-11 h-11 shrink-0 rounded-full bg-[#D4AF37] hover:bg-[#E9C46A] text-[#3A0808] flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-arrow-right text-sm"></i>
              </button>
            </div>
          </form>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                onExploreTours();
              }}
              className="px-7 py-3.5 rounded-full bg-[#D4AF37] hover:bg-[#E9C46A] text-[#3A0808] text-sm font-black shadow-lg shadow-black/25 transition-colors cursor-pointer"
            >
              {isVi ? 'Xem tour' : 'Browse tours'}
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                onOpenVRHeritage();
              }}
              className="px-7 py-3.5 rounded-full border border-white/25 hover:border-[#D4AF37]/70 hover:bg-white/5 text-white/90 text-sm font-bold transition-colors cursor-pointer"
            >
              {isVi ? 'Di sản VR 360°' : '360° heritage'}
            </button>
          </div>
        </div>

        {/* The one signal a first-time visitor needs before scrolling, and the
            only claim on this screen the database can actually back. */}
        {/* One practical fact, not a second slogan. This line used to repeat
            the acronym above in Vietnamese and then append the payment terms,
            which made the first thing a visitor read the same thing twice. */}
        <p className="mt-12 sm:mt-16 text-[11px] sm:text-xs text-white/45 font-medium">
          {isVi
            ? 'Đặt chỗ miễn phí · Trả trực tiếp cho host khi gặp mặt'
            : 'Free to reserve · pay your host in person'}
        </p>
      </div>

      {/* Scroll hint, as on the layouts this follows. */}
      <button
        type="button"
        onClick={() => {
          sounds.playTap();
          onExploreTours();
        }}
        aria-label={isVi ? 'Cuộn xuống' : 'Scroll down'}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full border border-white/20 hover:border-[#D4AF37]/70 text-white/55 hover:text-[#D4AF37] flex items-center justify-center transition-colors cursor-pointer animate-bounce"
      >
        <i className="fa-solid fa-chevron-down text-xs"></i>
      </button>
    </section>
  );
};
