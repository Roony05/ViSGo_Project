import React, { useEffect, useMemo, useState } from 'react';
import { Language, LocalVideo, User } from '../types';
import { Reveal } from './Reveal';
import { YouTubeEmbed } from './YouTubeEmbed';
import { youTubeId } from '../utils/youtube';
import { sounds } from '../utils/audio';

interface LocalVideoShowcaseProps {
  localVideos: LocalVideo[];
  language: Language;
  activeUser?: User | null;
  onOpenAdminHub?: () => void;
}

export const LocalVideoShowcase: React.FC<LocalVideoShowcaseProps> = ({
  localVideos = [],
  language,
  activeUser,
  onOpenAdminHub,
}) => {
  const isVi = language === 'vi';
  const [selectedCity, setSelectedCity] = useState<string>('all');
  /** Index of the leftmost video on show. Three fit across, so paging moves by three. */
  const [page, setPage] = useState(0);
  /** Once expanded the whole set is laid out at once and the arrows go away. */
  const [expanded, setExpanded] = useState(false);

  const PER_PAGE = 3;


  /*
    Only what an administrator actually put here.

    This used to fall back to a bundled list of eight "curated" videos. Every
    one of their YouTube ids was invented — `9_dqwH1-80I`, `X2V28y_dO4I` and the
    rest all answer 404 — so the section rendered eight play buttons that could
    never play anything, and the failure read as a copyright block rather than
    as a made-up id. An empty section is better than one that lies.
  */
  const allAvailableVideos = useMemo(
    () => localVideos.filter((v) => v.active && youTubeId(v.url)),
    [localVideos],
  );

  /** Only the places that actually have a video, in the order they were added. */
  const citiesWithVideos = useMemo(
    () => [...new Set(allAvailableVideos.map((v) => v.city))],
    [allAvailableVideos],
  );

  // Changing the city while on page two would otherwise leave the strip
  // scrolled past the end of a shorter list, showing nothing.
  useEffect(() => {
    setPage(0);
  }, [selectedCity]);

  const filteredVideos = useMemo(() => {
    return allAvailableVideos
      .filter((v) => selectedCity === 'all' || v.city === selectedCity)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allAvailableVideos, selectedCity]);

  const pageCount = Math.max(1, Math.ceil(filteredVideos.length / PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleVideos = expanded
    ? filteredVideos
    : filteredVideos.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  // Nothing curated yet. A visitor sees no section at all rather than an empty
  // frame; an administrator sees the way in, because they are the only person
  // who can fix it.
  if (filteredVideos.length === 0 && !(activeUser?.role === 'admin' && onOpenAdminHub)) {
    return null;
  }

  return (
    <section id="local-video-showcase-section" className="space-y-5">
      <Reveal className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {isVi ? 'Việt Nam qua ống kính' : 'Vietnam on film'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {isVi ? 'Bấm để xem' : 'Tap to play'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Three at a time, with arrows to move along the row — and a way to
              drop the whole set open for anyone who would rather see it all.
              Eight videos stacked above the tour catalogue pushed the actual
              product two screens down. */}
          {filteredVideos.length > PER_PAGE && (
            <>
              {!expanded && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTap();
                      setPage((n) => (n - 1 + pageCount) % pageCount);
                    }}
                    aria-label={isVi ? 'Video trước' : 'Previous videos'}
                    className="w-9 h-9 rounded-full border border-stone-300 hover:border-[#991B1B] hover:text-[#991B1B] text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTap();
                      setPage((n) => (n + 1) % pageCount);
                    }}
                    aria-label={isVi ? 'Video tiếp' : 'Next videos'}
                    className="w-9 h-9 rounded-full border border-stone-300 hover:border-[#991B1B] hover:text-[#991B1B] text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  setExpanded((v) => !v);
                  setPage(0);
                }}
                className="px-3.5 py-2 rounded-full border border-stone-300 hover:border-[#991B1B] text-stone-700 hover:text-[#991B1B] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>
                  {expanded
                    ? isVi ? 'Thu gọn' : 'Show less'
                    : isVi ? `Xem tất cả (${filteredVideos.length})` : `See all (${filteredVideos.length})`}
                </span>
                <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-[10px]`}></i>
              </button>
            </>
          )}

          {activeUser?.role === 'admin' && onOpenAdminHub && (
            <button
              onClick={onOpenAdminHub}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <i className="fa-solid fa-gear text-[#D4AF37]"></i>
              <span>{isVi ? 'Quản lý video' : 'Manage videos'}</span>
            </button>
          )}
        </div>
      </Reveal>

      {/* City pills, only once there is more than one place to choose between.
          A row of nine filters over three videos is furniture, not navigation. */}
      {citiesWithVideos.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[{ id: 'all', label: isVi ? 'Tất cả' : 'All' }, ...citiesWithVideos.map((c) => ({ id: c, label: c }))].map(
            (city) => {
              const isActive = selectedCity === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => {
                    sounds.playTap();
                    setSelectedCity(city.id);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-[#991B1B] text-white border-[#991B1B]'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  {city.label}
                </button>
              );
            },
          )}
        </div>
      )}

      {filteredVideos.length === 0 ? (
        <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-2xl px-4 py-6 text-center">
          {isVi
            ? 'Chưa có video nào. Thêm ở Bảng quản trị → Video địa phương.'
            : 'No videos yet. Add one under Admin → Local videos.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleVideos.map((video, i) => {
            const videoId = youTubeId(video.url);
            if (!videoId) return null;
            const title = isVi ? video.titleVi || video.title : video.title;

            return (
              /* Films arrive from the left, one after the next — a strip being
                 dealt out. The catalogue below rises instead, so the two
                 sections read as different kinds of thing. */
              <Reveal key={video.id} from="left" delay={i * 110}>
                <figure className="space-y-2">
                  <YouTubeEmbed videoId={videoId} title={title} />
                  <figcaption className="px-0.5">
                    <h3 className="text-sm font-bold text-stone-900 leading-snug line-clamp-2">{title}</h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      <i className="fa-solid fa-location-dot text-[#991B1B] mr-1"></i>
                      {video.city}
                    </p>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      )}
    </section>
  );
};
