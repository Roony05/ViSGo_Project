import React, { useState, useMemo } from 'react';
import { Tour, Language } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface CustomerViewProps {
  tours: Tour[];
  language: Language;
  currency: 'VND' | 'USD';
  onSelectTour: (tour: Tour) => void;
  onQuickBook: (tour: Tour) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  tours,
  language,
  currency,
  onSelectTour,
  onQuickBook,
}) => {
  const isVi = language === 'vi';
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'priceAsc' | 'priceDesc' | 'rating'>('popular');

  const CITIES = [
    { id: 'all', label: isVi ? 'Tất cả điểm đến' : 'All Destinations', icon: 'fa-globe' },
    { id: 'Hà Nội', label: 'Hà Nội', icon: 'fa-landmark' },
    { id: 'TP. Hồ Chí Minh', label: 'TP. Hồ Chí Minh', icon: 'fa-city' },
    { id: 'Đà Nẵng', label: 'Đà Nẵng', icon: 'fa-water' },
    { id: 'Hội An', label: 'Hội An', icon: 'fa-lightbulb' },
    { id: 'Đà Lạt', label: 'Đà Lạt', icon: 'fa-tree' },
    { id: 'Huế', label: 'Huế', icon: 'fa-monument' },
    { id: 'Ninh Bình', label: 'Ninh Bình', icon: 'fa-mountain-sun' },
    { id: 'Sa Pa', label: 'Sa Pa', icon: 'fa-mountain' },
  ];

  const CATEGORIES = [
    { id: 'all', label: isVi ? 'Tất cả thể loại' : 'All Categories' },
    { id: 'street-food', label: isVi ? '🍜 Ẩm thực ngõ hẻm' : '🍜 Street Food' },
    { id: 'hidden-gems', label: isVi ? '🛵 Khám phá bí mật' : '🛵 Hidden Gems' },
    { id: 'nightlife', label: isVi ? '🌃 Sài Gòn / Hà Nội đêm' : '🌃 Nightlife' },
    { id: 'heritage', label: isVi ? '🏛️ Di sản & Phố cổ' : '🏛️ Heritage' },
    { id: 'craft-art', label: isVi ? '🎨 Làng nghề truyền thống' : '🎨 Craft & Art' },
    { id: 'nature-trek', label: isVi ? '🌲 Sinh thái & Trekking' : '🌲 Nature Trek' },
  ];

  const filteredTours = useMemo(() => {
    return tours
      .filter((tour) => {
        if (tour.status !== 'active') return false;

        // City filter
        if (selectedCity !== 'all' && tour.city !== selectedCity) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && tour.category !== selectedCategory) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (tour.title || '').toLowerCase().includes(q) || (tour.titleVi || '').toLowerCase().includes(q);
          const matchDesc = (tour.description || '').toLowerCase().includes(q) || (tour.descriptionVi || '').toLowerCase().includes(q);
          const matchHost = (tour.hostName || '').toLowerCase().includes(q);
          const matchCity = (tour.city || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchHost && !matchCity) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priceAsc') return a.priceVND - b.priceVND;
        if (sortBy === 'priceDesc') return b.priceVND - a.priceVND;
        if (sortBy === 'rating') return b.hostRating - a.hostRating;
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return b.hostReviewCount - a.hostReviewCount;
      });
  }, [tours, selectedCity, selectedCategory, searchQuery, sortBy]);

  const formatPrice = (tour: Tour) => {
    if (currency === 'USD') {
      return `$${tour.priceUSD}`;
    }
    return `${tour.priceVND.toLocaleString('vi-VN')}₫`;
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* Clean, Breathable Search & Discovery Filter Hub */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200">
        
        {/* Top Search Input Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isVi
                  ? 'Tìm kiếm theo tên tour, món ăn (phở, bánh mì), địa danh (Phố Cổ, Sài Gòn)...'
                  : 'Search by tour title, street food, neighborhood, or host...'
              }
              className="w-full bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-200 focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10 rounded-2xl py-3.5 pl-11 pr-10 text-sm text-stone-900 placeholder:text-stone-400 transition-all outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs p-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-stone-500 hidden sm:inline">
              {isVi ? 'Sắp xếp:' : 'Sort by:'}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 focus:border-[#991B1B] outline-hidden cursor-pointer"
            >
              <option value="popular">{isVi ? 'Nổi bật nhất' : 'Featured First'}</option>
              <option value="rating">{isVi ? 'Đánh giá cao nhất (★)' : 'Top Rated (★)'}</option>
              <option value="priceAsc">{isVi ? 'Giá: Thấp đến Cao' : 'Price: Low to High'}</option>
              <option value="priceDesc">{isVi ? 'Giá: Cao đến Thấp' : 'Price: High to Low'}</option>
            </select>
          </div>
        </div>

        {/* City Filter Pills */}
        <div className="mt-5 pt-5 border-t border-stone-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CITIES.map((city) => {
              const isActive = selectedCity === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => {
                    sounds.playTap();
                    setSelectedCity(city.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#991B1B] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                >
                  <i className={`fa-solid ${city.icon} text-[11px] ${isActive ? 'text-amber-300' : 'text-stone-400'}`}></i>
                  <span>{city.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    sounds.playTap();
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-amber-50 text-stone-950 font-bold border-amber-400'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

      </section>

      {/* Header Result Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            {isVi ? 'Trải Nghiệm Văn Hóa Tại ' : 'Authentic Journeys in '}
            <span className="text-[#991B1B]">
              {selectedCity === 'all' ? (isVi ? 'Việt Nam' : 'Vietnam') : selectedCity}
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            {isVi
              ? `Tìm thấy ${filteredTours.length} hành trình bản địa độc bản cùng người bạn địa phương`
              : `Found ${filteredTours.length} unique experiences guided by verified local buddies`}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-stone-600 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-400/30">
          <i className="fa-solid fa-shield-halved text-[#991B1B]"></i>
          <span>100% ViS-Go Escrow Safe</span>
        </div>
      </div>

      {/* Empty State */}
      {filteredTours.length === 0 && (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto my-6 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[#991B1B] flex items-center justify-center mx-auto mb-4 text-2xl">
            <i className="fa-solid fa-compass"></i>
          </div>
          <h3 className="font-bold text-stone-900 text-lg">
            {isVi ? 'Không tìm thấy tour phù hợp' : 'No Tours Found'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {isVi
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn địa danh khác.'
              : 'Try changing your search keyword or clearing the filters.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCity('all');
              setSelectedCategory('all');
            }}
            className="mt-5 px-5 py-2.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {isVi ? 'Xem tất cả tour' : 'Show All Tours'}
          </button>
        </div>
      )}

      {/* Clean Tour Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTours.map((tour) => {
          const displayTitle = isVi ? (tour.titleVi || tour.title) : tour.title;
          const displayTagline = isVi ? (tour.taglineVi || tour.tagline) : tour.tagline;

          return (
            <div
              key={tour.id}
              onClick={() => onSelectTour(tour)}
              className="bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md border border-stone-200/90 transition-all duration-300 flex flex-col group cursor-pointer"
            >
              {/* Cover Image */}
              <div className="h-52 bg-stone-100 relative overflow-hidden">
                <img
                  src={tour.coverImage}
                  alt={displayTitle}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
                  loading="lazy"
                />

                {/* Price Tag Top Right */}
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-xl text-xs font-black text-[#991B1B] shadow-sm border border-stone-200/60">
                  {formatPrice(tour)} <span className="text-[10px] text-stone-500 font-normal">/ {isVi ? 'người' : 'pax'}</span>
                </div>

                {/* Top Left Featured Badge */}
                {tour.featured && (
                  <div className="absolute top-3 left-3 bg-[#D4AF37] text-stone-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs tracking-wider">
                    ★ {isVi ? 'NỔI BẬT' : 'FEATURED'}
                  </div>
                )}

                {/* Host Info Floating Pill Bottom Left */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 max-w-[70%]">
                  <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] overflow-hidden shadow-md shrink-0 bg-stone-900">
                    <img src={tour.hostAvatar} alt={tour.hostName} className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-stone-900/80 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[10px] text-white font-bold truncate flex items-center gap-1">
                    <span className="truncate">{tour.hostName}</span>
                    {tour.hostVerified && (
                      <i className="fa-solid fa-circle-check text-emerald-400 text-[10px] shrink-0" title="eKYC Verified"></i>
                    )}
                  </div>
                </div>

                {/* City badge bottom right */}
                <div className="absolute bottom-3 right-3 bg-stone-900/80 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[10px] text-white font-medium flex items-center gap-1">
                  <i className="fa-solid fa-location-dot text-amber-300 text-[9px]"></i>
                  <span>{tour.city}</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug group-hover:text-[#991B1B] transition-colors line-clamp-2">
                      {displayTitle}
                    </h3>
                    <div className="flex items-center gap-1 text-xs font-bold shrink-0">
                      <span className="text-amber-500">★</span>
                      <span className="text-stone-800">{tour.hostRating.toFixed(1)}</span>
                      <span className="text-stone-400 text-[10px]">({tour.hostReviewCount})</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {displayTagline}
                  </p>

                  {/* Host Languages spoken */}
                  <div className="mt-3 py-2 px-3 bg-stone-50 rounded-xl border border-stone-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 font-medium">
                      🗣️ {isVi ? 'Ngôn ngữ:' : 'Host speaks:'}
                    </span>
                    <span className="font-bold text-stone-800 truncate max-w-[160px]">
                      {(tour.hostLanguages || tour.languages).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Card Bottom Row */}
                <div className="pt-3 border-t border-stone-100 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
                    <i className="fa-regular fa-clock text-[#991B1B]"></i>
                    <span>{tour.durationHours} {t.duration}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectTour(tour)}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {t.viewDetails}
                    </button>
                    
                    <button
                      onClick={() => onQuickBook(tour)}
                      className="px-4 py-2 bg-[#991B1B] hover:bg-[#7F1D1D] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      {isVi ? 'Đặt Tour' : 'Book'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
