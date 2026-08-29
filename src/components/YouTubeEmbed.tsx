import React, { useState } from 'react';
import { youTubeEmbedUrl, youTubeThumbnail, youTubeWatchUrl } from '../utils/youtube';

/**
 * A YouTube video that costs nothing until somebody wants it.
 *
 * The iframe is not rendered on load. A YouTube embed pulls roughly a megabyte
 * of player JavaScript and opens a connection to Google before anyone has
 * decided to watch anything — on a listing page carrying a video the visitor
 * did not ask for, that is the whole page budget spent on a maybe, and on a
 * Vietnamese mobile connection it is felt.
 *
 * So what renders first is the still frame and a play button — one image. The
 * player is mounted on click, from `youtube-nocookie.com`, which sets no
 * tracking cookie until playback begins.
 */
interface YouTubeEmbedProps {
  /** Already-parsed video id. Callers use `youTubeId()` on whatever they hold. */
  videoId: string;
  title: string;
  className?: string;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ videoId, title, className = '' }) => {
  const [playing, setPlaying] = useState(false);
  /*
    A video YouTube does not have still yields a thumbnail — a 120x90 grey
    placeholder — so the facade would render a play button that opens an empty
    player. Measuring the picture on load catches that, and the card says so
    instead of leaving the viewer to conclude it is a copyright block.
  */
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div
        className={`relative aspect-video rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 flex flex-col items-center justify-center gap-2 text-center px-4 ${className}`}
      >
        <i className="fa-solid fa-video-slash text-stone-400 text-2xl"></i>
        <p className="text-[11px] font-bold text-stone-600">Video không còn trên YouTube</p>
        <a
          href={youTubeWatchUrl(videoId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-[#991B1B] hover:underline"
        >
          Mở trên YouTube
        </a>
      </div>
    );
  }

  return (
    <div className={`relative aspect-video rounded-2xl overflow-hidden bg-stone-900 ${className}`}>
      {playing ? (
        <iframe
          src={youTubeEmbedUrl(videoId, true)}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={title}
          className="group absolute inset-0 w-full h-full cursor-pointer"
        >
          <img
            src={youTubeThumbnail(videoId)}
            alt=""
            loading="lazy"
            onLoad={(e) => {
              // 480x360 for a real video; 120x90 means YouTube has nothing.
              if (e.currentTarget.naturalWidth <= 121) setMissing(true);
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></span>

          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-16 h-16 rounded-full bg-[#A82323] group-hover:bg-[#8C1818] shadow-xl flex items-center justify-center transition-colors">
              <i className="fa-solid fa-play text-white text-xl ml-1"></i>
            </span>
          </span>

          {/* No title text over the still. Every caller already puts the title
              beside the video — the card caption, the section heading, the
              form being filled in — so printing it here just showed it twice. */}
        </button>
      )}

      {/* Deliberately outside the facade: someone who wants the channel, the
          description or the comments should not have to load the player here
          to get to them. */}
      <a
        href={youTubeWatchUrl(videoId)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold transition-colors"
      >
        <i className="fa-brands fa-youtube mr-1"></i>
        YouTube
      </a>
    </div>
  );
};
