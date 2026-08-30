import React, { useMemo, useState } from 'react';
import type { Language, Tour, TourReview } from '../types';
import { Avatar } from './Avatar';

interface Props {
  tours: Tour[];
  reviews: TourReview[];
  language: Language;
  onSelectTour: (tour: Tour) => void;
}

export const HostLeaderboardView: React.FC<Props> = ({ tours, reviews, language, onSelectTour }) => {
  const isVi = language === 'vi';
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);

  const ranking = useMemo(() => {
    const tourHost = new Map<string, string>(tours.map((tour) => [tour.id, tour.hostId]));
    const totals = new Map<string, { sum: number; count: number }>();
    for (const review of reviews) {
      const hostId = tourHost.get(review.tourId);
      if (!hostId) continue;
      const value = totals.get(hostId) ?? { sum: 0, count: 0 };
      value.sum += review.rating;
      value.count += 1;
      totals.set(hostId, value);
    }

    const hosts = new Map<string, Tour>();
    for (const tour of tours) if (!hosts.has(tour.hostId)) hosts.set(tour.hostId, tour);
    return [...hosts.entries()]
      .map(([hostId, sample]) => {
        const total = totals.get(hostId) ?? { sum: 0, count: 0 };
        return {
          hostId,
          name: sample.hostName,
          avatar: sample.hostAvatar,
          verified: sample.hostVerified,
          rating: total.count ? total.sum / total.count : 0,
          reviewCount: total.count,
          activeTours: tours.filter((tour) => tour.hostId === hostId && tour.status === 'active'),
        };
      })
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name));
  }, [tours, reviews]);

  const selected = ranking.find((host) => host.hostId === selectedHostId) ?? null;

  return (
    <div className="space-y-6 pb-14">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
          {isVi ? 'Bảng xếp hạng Host' : 'Host Leaderboard'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-500">
          {isVi
            ? 'Điểm là trung bình tất cả đánh giá đã xác thực từ các tour của mỗi host.'
            : 'Scores are the average of all verified trip reviews across each host’s tours.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-2 space-y-2">
          {ranking.map((host, index) => (
            <button
              key={host.hostId}
              type="button"
              onClick={() => setSelectedHostId(host.hostId)}
              className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3 cursor-pointer transition-all ${selectedHostId === host.hostId ? 'border-[#A82323] bg-red-50 shadow-sm' : 'border-stone-200 bg-white hover:border-amber-400'}`}
            >
              <span className={`w-8 text-center text-lg font-black ${index < 3 ? 'text-amber-600' : 'text-stone-400'}`}>#{index + 1}</span>
              <Avatar src={host.avatar} name={host.name} className="w-11 h-11 rounded-full object-cover bg-stone-200" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-stone-900 truncate">
                  {host.name} {host.verified && <i className="fa-solid fa-circle-check text-emerald-600 text-xs" />}
                </span>
                <span className="block text-[11px] text-stone-500">
                  <i className="fa-solid fa-star text-amber-500 mr-1" />
                  {host.reviewCount ? host.rating.toFixed(2) : (isVi ? 'Chưa có điểm' : 'Not rated')}
                  {host.reviewCount > 0 && ` • ${host.reviewCount} ${isVi ? 'đánh giá' : 'reviews'}`}
                </span>
              </span>
              <i className="fa-solid fa-chevron-right text-stone-300" />
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 bg-white rounded-3xl border border-stone-200 p-5 min-h-72">
          {!selected ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-stone-400">
              <i className="fa-solid fa-ranking-star text-4xl text-amber-400 mb-3" />
              <p className="text-sm font-bold text-stone-700">{isVi ? 'Chọn một host để xem tour đang mở' : 'Select a host to see available tours'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-stone-900">{selected.name}</h3>
                <p className="text-xs text-stone-500">{selected.activeTours.length} {isVi ? 'tour hiện đang mở' : 'currently available tours'}</p>
              </div>
              {selected.activeTours.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500">
                  {isVi ? 'Host này hiện chưa có tour đang mở.' : 'This host has no tours open right now.'}
                </div>
              ) : selected.activeTours.map((tour) => (
                <button key={tour.id} type="button" onClick={() => onSelectTour(tour)} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-stone-200 hover:border-[#A82323] hover:bg-red-50 text-left cursor-pointer">
                  <img src={tour.coverImage} alt="" className="w-20 h-16 rounded-xl object-cover bg-stone-100" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-stone-900 line-clamp-2">{isVi ? tour.titleVi : tour.title}</span>
                    <span className="block mt-1 text-[11px] text-stone-500">{tour.city} • {tour.priceVND.toLocaleString('vi-VN')}₫</span>
                  </span>
                  <i className="fa-solid fa-arrow-right text-[#A82323]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
