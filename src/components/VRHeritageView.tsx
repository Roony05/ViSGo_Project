/**
 * VR heritage gallery — the landing grid for the 360° tours.
 *
 * The viewer itself is behind React.lazy so three.js stays out of the main
 * bundle; a traveller who never opens a VR tour never downloads it.
 */

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Play, MapPin, Sparkles, Loader2, Landmark, Clock, ImageOff } from 'lucide-react';
import { VR_LANDMARKS, type VrLandmark } from '../data/vrLandmarks';
import { resolvePins, type PinnedPanorama } from '../utils/panoramaSource';
import { buildGoogleMapsCoordUrl } from '../utils/googleMaps';
import type { Language } from '../types';

const VRTourViewer = lazy(() =>
  import('./VRTourViewer').then((m) => ({ default: m.VRTourViewer })),
);

interface VRHeritageViewProps {
  language: Language;
}

/**
 * The landmark's own photograph, as its card image.
 *
 * The 1024px preview is the same picture the sphere will show, so the card is
 * an honest thumbnail of what opening it gives you rather than decoration.
 * `object-position` keeps the horizon band in view: the top and bottom of an
 * equirectangular frame are the stretched zenith and nadir, which as a flat
 * crop read as smeared sky and a smeared road.
 */
const LandmarkPreview: React.FC<{ landmark: VrLandmark; pin: PinnedPanorama | null; resolved: boolean }> = ({
  landmark,
  pin,
  resolved,
}) => (
  <div className="relative h-44 w-full overflow-hidden bg-[#1F2937]">
    {pin ? (
      /*
       * Zoomed to the horizon band rather than fitted.
       *
       * An equirectangular frame puts the horizon exactly halfway down, the
       * stretched sky above it and the nadir below — and since these are
       * vehicle-mounted captures, that nadir is bonnet, helmet and watermark.
       * `object-cover` on a 2:1 image in a 2.1:1 box leaves almost no vertical
       * slack to crop with, so the image is oversized and pulled up by hand
       * instead: 160% width puts the horizon 36% above the box top.
       */
      <img
        src={pin.previewUrl}
        alt={landmark.nameVi}
        loading="lazy"
        decoding="async"
        className="absolute left-1/2 w-[160%] max-w-none -translate-x-1/2"
        style={{ top: '-36%' }}
      />
    ) : (
      <div className="absolute inset-0 grid place-items-center text-white/40">
        {resolved ? <ImageOff className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]/70" />}
      </div>
    )}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
  </div>
);

export const VRHeritageView: React.FC<VRHeritageViewProps> = ({ language }) => {
  const [active, setActive] = useState<VrLandmark | null>(null);
  /**
   * Every landmark's photograph, resolved in one request.
   *
   * Mapillary serves images from a CDN with a short-lived signed URL, so the
   * data can only pin image ids and the URLs have to be fetched. Doing it once
   * for the whole gallery is what makes the cards show real photographs
   * immediately instead of each one searching for itself.
   */
  const [pins, setPins] = useState<Record<string, PinnedPanorama> | null>(null);
  const vi = language === 'vi';

  useEffect(() => {
    let cancelled = false;
    resolvePins(VR_LANDMARKS.map((l) => l.mapillaryId))
      .then((resolved) => {
        if (!cancelled) setPins(resolved);
      })
      .catch(() => {
        if (!cancelled) setPins({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prevent the page behind the immersive viewer from scrolling.
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#A82323]/10 px-3 py-1 text-xs font-semibold text-[#A82323]">
          <Sparkles className="h-3.5 w-3.5" />
          {vi ? 'Trải nghiệm thực tế ảo' : 'Virtual reality experience'}
        </div>
        <h1 className="text-2xl font-bold text-[#1F2937] sm:text-3xl">
          {vi ? 'Di sản Việt Nam trong không gian 360°' : 'Vietnamese Heritage in 360°'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#1F2937]/70">
          {vi
            ? 'Đứng giữa di sản trước khi đặt tour. Kéo để nhìn quanh trên máy tính, nghiêng điện thoại để xoay theo, hoặc đeo kính VR nếu bạn có.'
            : 'Stand inside the landmark before you book. Drag to look around on desktop, tilt your phone to pan, or put on a headset if you have one.'}
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {VR_LANDMARKS.map((landmark) => (
          <article
            key={landmark.id}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#1F2937]/8 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <LandmarkPreview
              landmark={landmark}
              pin={pins?.[landmark.mapillaryId] ?? null}
              resolved={pins !== null}
            />

            <div className="flex flex-1 flex-col p-4">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <h2 className="font-bold leading-snug text-[#1F2937]">
                  {vi ? landmark.nameVi : landmark.name}
                </h2>
                {landmark.unesco && (
                  <span
                    className="shrink-0 rounded-full bg-[#D4AF37]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8a6d13]"
                    title={vi ? 'Di sản thế giới UNESCO' : 'UNESCO World Heritage'}
                  >
                    UNESCO
                  </span>
                )}
              </div>

              <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[#1F2937]/65">
                {vi ? landmark.taglineVi : landmark.tagline}
              </p>

              <dl className="mb-4 mt-auto space-y-1.5 text-xs text-[#1F2937]/60">
                <div className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 shrink-0 text-[#A82323]/70" />
                  <dd>{vi ? landmark.cityVi : landmark.city}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-[#A82323]/70" />
                  <dd>{vi ? landmark.bestTimeVi : landmark.bestTime}</dd>
                </div>
              </dl>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActive(landmark)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#A82323] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8c1c1c]"
                >
                  <Play className="h-4 w-4" />
                  {vi ? 'Xem 360°' : 'View in 360°'}
                </button>
                <a
                  href={buildGoogleMapsCoordUrl(landmark.lat, landmark.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={vi ? 'Mở trên Google Maps' : 'Open in Google Maps'}
                  className="rounded-full border border-[#1F2937]/12 p-2.5 text-[#1F2937]/60 transition hover:border-[#A82323]/40 hover:text-[#A82323]"
                >
                  <MapPin className="h-4 w-4" />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {active && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] grid place-items-center bg-[#0d0b09]">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
            </div>
          }
        >
          <VRTourViewer
            landmark={active}
            panorama={pins?.[active.mapillaryId] ?? null}
            /* `pins` is null only while the one Graph request is in flight;
               a failed resolve sets it to {}. The viewer needs that difference
               so it waits instead of falling through to the coordinate
               search — see VRTourViewer's `resolving` prop. */
            resolving={pins === null}
            language={language}
            onClose={() => setActive(null)}
          />
        </Suspense>
      )}
    </div>
  );
};
