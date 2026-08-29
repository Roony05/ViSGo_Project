import React, { useEffect, useState } from 'react';
import { Language, LocalVideo } from '../types';
import { sounds } from '../utils/audio';
import { newId } from '../utils/ids';
import { probeYouTubeVideo, youTubeId, type VideoProbe } from '../utils/youtube';
import { ProvinceSelect } from './ProvinceSelect';
import { YouTubeEmbed } from './YouTubeEmbed';

/**
 * Where an administrator curates the local intro videos travellers see.
 *
 * These are the platform's own, not a host's: a host's video hangs off their
 * tour, is theirs to change, and only appears on that listing. These play on
 * the Explore page for every visitor, which is why firestore.rules lets only an
 * admin write them.
 *
 * Nothing is stored until the link parses. `youTubeId` returns null for
 * anything that is not a YouTube address, and the id it extracts — never the
 * pasted string — is what an iframe is later built from.
 */
interface LocalVideoManagerProps {
  videos: LocalVideo[];
  language: Language;
  onSave: (videos: LocalVideo[]) => void;
  onDelete: (id: string) => void;
}

export const LocalVideoManager: React.FC<LocalVideoManagerProps> = ({
  videos,
  language,
  onSave,
  onDelete,
}) => {
  const isVi = language === 'vi';

  const [url, setUrl] = useState('');
  const [city, setCity] = useState('Hà Nội');
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [error, setError] = useState('');

  const videoId = youTubeId(url);

  /*
    Whether the pasted video exists at all.

    Checked here rather than trusted, because a well-formed id is not a real
    one: eight invented ids once shipped as this site's default content and
    every one of them rendered a play button that did nothing. `probeYouTubeVideo`
    measures the thumbnail — YouTube serves a 120x90 grey placeholder for a
    video it does not have.
  */
  const [probe, setProbe] = useState<VideoProbe | 'checking' | null>(null);

  useEffect(() => {
    if (!videoId) {
      setProbe(null);
      return;
    }
    let alive = true;
    setProbe('checking');
    void probeYouTubeVideo(videoId).then((result) => {
      if (alive) setProbe(result);
    });
    return () => {
      alive = false;
    };
  }, [videoId]);
  const sorted = [...videos].sort((a, b) => a.order - b.order || a.city.localeCompare(b.city));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoId) {
      setError(isVi ? 'Chưa nhận ra link YouTube.' : 'That is not a YouTube link.');
      return;
    }
    if (probe === 'checking') {
      setError(isVi ? 'Đang kiểm tra video, đợi một giây.' : 'Still checking the video — one moment.');
      return;
    }
    if (probe === 'missing') {
      setError(
        isVi
          ? 'YouTube không có video này. Kiểm tra lại link — video có thể đã bị xoá hoặc để riêng tư.'
          : 'YouTube has no such video. Check the link — it may have been deleted or made private.',
      );
      return;
    }
    if (!titleVi.trim()) {
      setError(isVi ? 'Chưa nhập tiêu đề tiếng Việt.' : 'Enter a Vietnamese title.');
      return;
    }
    // The same video twice on one page is a mistake, not a choice.
    if (videos.some((v) => youTubeId(v.url) === videoId)) {
      setError(isVi ? 'Video này đã có trong danh sách.' : 'That video is already on the list.');
      return;
    }

    onSave([
      ...videos,
      {
        id: newId('vid'),
        city: city.trim(),
        url: url.trim(),
        titleVi: titleVi.trim() || titleEn.trim(),
        // Falls back to the Vietnamese rather than shipping an empty heading to
        // the very travellers these videos are for.
        title: titleEn.trim() || titleVi.trim(),
        order: videos.length,
        active: true,
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ]);

    setUrl('');
    setTitleVi('');
    setTitleEn('');
    setError('');
    setProbe(null);
    sounds.playSuccessChime();
  };

  const toggleActive = (video: LocalVideo) => {
    sounds.playTap();
    onSave(videos.map((v) => (v.id === video.id ? { ...v, active: !v.active } : v)));
  };

  const field =
    'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] text-sm text-stone-900 outline-hidden transition-all';
  const label = 'block text-xs font-bold text-stone-700 mb-1.5';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Add */}
      <form
        onSubmit={handleAdd}
        className="lg:col-span-5 bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4"
      >
        <div>
          <h3 className="font-serif font-bold text-base text-stone-900">
            {isVi ? 'Thêm video địa phương' : 'Add a local video'}
          </h3>
          <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
            {isVi
              ? 'Video hiện ở trang Khám phá cho mọi khách. Chỉ tải khi khách bấm play.'
              : 'Shown on Explore to every visitor, and only loaded when someone presses play.'}
          </p>
        </div>

        <div>
          <label className={label} htmlFor="video-url">
            {isVi ? 'Link YouTube' : 'YouTube link'} <span className="text-red-600">*</span>
          </label>
          <input
            id="video-url"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError('');
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`${field} font-mono text-xs ${url.trim() && !videoId ? 'border-red-400' : ''}`}
          />
        </div>

        {videoId && probe === 'checking' && (
          <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <i className="fa-solid fa-spinner fa-spin"></i>
            {isVi ? 'Đang kiểm tra video trên YouTube…' : 'Checking the video on YouTube…'}
          </p>
        )}

        {videoId && probe === 'missing' && (
          <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 leading-relaxed">
            <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
            {isVi
              ? 'YouTube không có video này — link đúng dạng nhưng không tồn tại, đã bị xoá, hoặc để riêng tư.'
              : 'YouTube has no such video — the link is well formed but the video does not exist, was deleted, or is private.'}
          </p>
        )}

        {videoId && (probe === 'ok' || probe === 'unknown') && (
          <YouTubeEmbed videoId={videoId} title={titleVi || 'Preview'} />
        )}

        <div>
          <label className={label} htmlFor="video-city">
            {isVi ? 'Tỉnh / thành phố' : 'Province or city'} <span className="text-red-600">*</span>
          </label>
          <ProvinceSelect
            id="video-city"
            value={city}
            onChange={setCity}
            language={language}
            className={`${field} pl-9 pr-8`}
          />
        </div>

        <div>
          <label className={label} htmlFor="video-title-vi">
            {isVi ? 'Tiêu đề tiếng Việt' : 'Vietnamese title'} <span className="text-red-600">*</span>
          </label>
          <input
            id="video-title-vi"
            type="text"
            value={titleVi}
            onChange={(e) => setTitleVi(e.target.value)}
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="video-title-en">
            {isVi ? 'Tiêu đề tiếng Anh' : 'English title'}
            <span className="font-normal text-stone-400">
              {' '}
              ({isVi ? 'để trống thì dùng tiếng Việt' : 'falls back to the Vietnamese'})
            </span>
          </label>
          <input
            id="video-title-en"
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className={field}
          />
        </div>

        {error && (
          <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={probe === 'checking' || probe === 'missing'}
          className="w-full py-2.5 bg-[#991B1B] hover:bg-[#7F1D1D] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {isVi ? 'Thêm video' : 'Add video'}
        </button>
      </form>

      {/* List */}
      <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-3">
        <h3 className="font-bold text-xs text-stone-500 uppercase tracking-wider">
          {isVi ? `Đang có (${videos.length})` : `On the site (${videos.length})`}
        </h3>

        {sorted.length === 0 ? (
          <p className="text-xs text-stone-500 py-6 text-center">
            {isVi
              ? 'Chưa có video nào. Thêm ở bên trái.'
              : 'No videos yet. Add one on the left.'}
          </p>
        ) : (
          <div className="space-y-2">
            {sorted.map((video) => {
              const id = youTubeId(video.url);
              return (
                <div
                  key={video.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border ${
                    video.active ? 'bg-stone-50 border-stone-200' : 'bg-stone-100 border-stone-300 opacity-60'
                  }`}
                >
                  {id ? (
                    <img
                      src={`https://i.ytimg.com/vi/${id}/default.jpg`}
                      alt=""
                      loading="lazy"
                      className="w-20 h-14 rounded-lg object-cover shrink-0 bg-stone-200"
                    />
                  ) : (
                    <span className="w-20 h-14 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {isVi ? 'Link hỏng' : 'Bad link'}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-stone-900 truncate">{video.titleVi}</p>
                    <p className="text-[11px] text-stone-500 truncate">{video.title}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      <i className="fa-solid fa-location-dot mr-1"></i>
                      {video.city}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleActive(video)}
                      className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-[11px] font-bold rounded-lg cursor-pointer"
                    >
                      {video.active ? (isVi ? 'Ẩn' : 'Hide') : isVi ? 'Hiện' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playTap();
                        onDelete(video.id);
                      }}
                      aria-label={isVi ? 'Xóa' : 'Delete'}
                      className="w-8 h-8 bg-white hover:bg-red-50 border border-stone-300 hover:border-red-300 text-stone-500 hover:text-red-700 rounded-lg cursor-pointer transition-colors"
                    >
                      <i className="fa-solid fa-trash text-[11px]"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
