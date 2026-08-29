import React, { useEffect, useMemo, useState } from 'react';
import { Tour, Language, LocalVideo, User } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { Avatar } from './Avatar';
import { HeroBanner } from './HeroBanner';
import { LocalVideoShowcase } from './LocalVideoShowcase';
import { Reveal } from './Reveal';
import { tourLanguageCodes, tourSpeaks } from '../utils/contentLanguage';
import { LANGUAGE_OPTIONS, languageLabel, languageOption } from '../data/languages';

interface CustomerViewProps {
  tours: Tour[];
  language: Language;
  currency: 'VND' | 'USD';
  loading?: boolean;
  localVideos?: LocalVideo[];
  activeUser?: User | null;
  onSelectTour: (tour: Tour) => void;
  onQuickBook: (tour: Tour) => void;
  onOpenAIChat?: () => void;
  onOpenVRHeritage?: () => void;
  onOpenAdminHub?: () => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  tours,
  language,
  currency,
  loading = false,
  localVideos = [],
  activeUser,
  onSelectTour,
  onQuickBook,
  onOpenAIChat,
  onOpenVRHeritage,
  onOpenAdminHub,
}) => {
  const isVi = language === 'vi';
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  /**
   * Which page of the catalogue is on screen.
   *
   * Six is a full two rows at desktop width and one scroll on a phone. The
   * grid used to render every active tour at once, which is fine at six and a
   * wall at sixty — and the videos and the hero are already above it.
   */
  const [page, setPage] = useState(0);
  const PER_PAGE = 6;
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
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
    {
      id: 'all',
      label: isVi ? 'Tất cả thể loại' : 'All Categories',
      icon: 'fa-layer-group',
      desc: isVi ? 'Trọn bộ trải nghiệm' : 'All experiences',
      gradient: 'from-red-600 to-amber-600',
    },
    {
      id: 'street-food',
      label: isVi ? 'Ẩm thực ngõ hẻm' : 'Street Food',
      icon: 'fa-bowl-food',
      desc: isVi ? 'Hương vị gia truyền' : 'Heirloom family recipes',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      id: 'hidden-gems',
      label: isVi ? 'Khám phá bí mật' : 'Hidden Gems',
      icon: 'fa-motorcycle',
      desc: isVi ? 'Ngõ nhỏ & Vespa cổ' : 'Secret alleyways & Vespas',
      gradient: 'from-red-700 to-rose-600',
    },
    {
      id: 'heritage',
      label: isVi ? 'Di sản & Phố cổ' : 'Heritage & History',
      icon: 'fa-torii-gate',
      desc: isVi ? 'Văn hóa ngàn năm' : 'Living history & temples',
      gradient: 'from-yellow-700 to-amber-700',
    },
    {
      id: 'nightlife',
      label: isVi ? 'Sài Gòn / Hà Nội đêm' : 'Nightlife & Safaris',
      icon: 'fa-moon',
      desc: isVi ? 'Rooftop & Phố đêm' : 'Rooftops & night markets',
      gradient: 'from-purple-800 to-indigo-800',
    },
    {
      id: 'craft-art',
      label: isVi ? 'Làng nghề truyền thống' : 'Craft & Art',
      icon: 'fa-palette',
      desc: isVi ? 'Nghệ nhân gia truyền' : 'Handmade crafts & silks',
      gradient: 'from-emerald-700 to-teal-700',
    },
    {
      id: 'nature-trek',
      label: isVi ? 'Sinh thái & Trekking' : 'Nature & Trek',
      icon: 'fa-mountain-sun',
      desc: isVi ? 'Rừng thông & Săn mây' : 'Highlands & cloud hunting',
      gradient: 'from-emerald-800 to-green-700',
    },
  ];

  // Any change to the filters produces a different list, and staying on page
  // four of the old one shows an empty grid.
  useEffect(() => {
    setPage(0);
  }, [selectedCity, selectedCategory, selectedLanguage, searchQuery, sortBy]);

  const scrollToTours = () => {
    const el = document.getElementById('tour-catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

        if (selectedLanguage !== 'all' && !tourSpeaks(tour, selectedLanguage)) {
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
  }, [tours, selectedCity, selectedCategory, selectedLanguage, searchQuery, sortBy]);

  const formatPrice = (tour: Tour) => {
    if (currency === 'USD') {
      return `$${tour.priceUSD}`;
    }
    return `${tour.priceVND.toLocaleString('vi-VN')}₫`;
  };

  const pageCount = Math.max(1, Math.ceil(filteredTours.length / PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageTours = filteredTours.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      
      {/* 1. TOP HERO BANNER: Grand, high-converting Red & Gold Banner with Slogan & Search */}
      <HeroBanner
        language={language}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        onExploreTours={scrollToTours}
        onOpenAIChat={onOpenAIChat || (() => {})}
        onOpenVRHeritage={onOpenVRHeritage || (() => {})}
      />

      {/* 2. LOCAL DISCOVERY VIDEO SHOWCASE: Curated videos of Vietnam destinations by Admin */}
      <LocalVideoShowcase
        localVideos={localVideos}
        language={language}
        activeUser={activeUser}
        onOpenAdminHub={onOpenAdminHub}
      />

      {/* 3. HOST TOURS CATALOG & CATEGORIES SECTION */}
      <section id="tour-catalog-section" className="space-y-8 scroll-mt-20">
        
        {/* Section header.
            This carried an uppercase badge, a two-line heading, a sentence
            restating the result count, and a guarantee pill repeating what the
            hero already says. A heading and a count is the whole job. */}
        <Reveal className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {selectedCity === 'all'
                ? isVi ? 'Tour từ người bản địa' : 'Tours from locals'
                : selectedCity}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {filteredTours.length} {isVi ? 'trải nghiệm' : filteredTours.length === 1 ? 'experience' : 'experiences'}
              {pageCount > 1 && (
                <span className="text-stone-400">
                  {' '}
                  · {isVi ? 'trang' : 'page'} {safePage + 1}/{pageCount}
                </span>
              )}
            </p>
          </div>
        </Reveal>

        {/* Categories as pills.
            They were seven cards, each with an icon tile, a count badge, a
            title and a one-line description — a second navigation layer above
            the filter bar that already existed below it. */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const count = tours.filter(
              (t) => t.status === 'active' && (cat.id === 'all' || t.category === cat.id),
            ).length;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  sounds.playTap();
                  setSelectedCategory(cat.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-[#991B1B] text-white border-[#991B1B]'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border-stone-200'
                }`}
              >
                <i className={`fa-solid ${cat.icon} text-[11px] ${isActive ? 'text-[#D4AF37]' : 'text-stone-400'}`}></i>
                <span>{cat.label}</span>
                <span className={isActive ? 'text-white/60' : 'text-stone-400'}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search, sort and place — one row, no card around it.
            This was a bordered white panel holding a full-width search field,
            a labelled sort dropdown and a divider above a second row of city
            pills. Three of those four things are already decided by the hero
            above; what is left is the refinement someone does after scrolling. */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Tìm trong danh sách' : 'Filter these tours'}
                className="w-full bg-white border border-stone-200 focus:border-[#991B1B] rounded-full py-2.5 pl-10 pr-9 text-sm text-stone-900 placeholder:text-stone-400 outline-hidden transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label={isVi ? 'Xóa' : 'Clear'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs p-1 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label={isVi ? 'Sắp xếp' : 'Sort'}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-full text-xs font-bold text-stone-700 focus:border-[#991B1B] outline-hidden cursor-pointer shrink-0"
            >
              <option value="popular">{isVi ? 'Nổi bật' : 'Featured'}</option>
              <option value="rating">{isVi ? 'Đánh giá cao' : 'Top rated'}</option>
              <option value="priceAsc">{isVi ? 'Giá thấp trước' : 'Cheapest'}</option>
              <option value="priceDesc">{isVi ? 'Giá cao trước' : 'Priciest'}</option>
            </select>
          </div>

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
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  {city.label}
                </button>
              );
            })}
          </div>

          {/* Only offer languages that can return at least one active tour. */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-stone-400 uppercase shrink-0 pr-1">
              {isVi ? 'Ngôn ngữ' : 'Language'}
            </span>
            {[
              { code: 'all', flag: '🌏', short: isVi ? 'Tất cả' : 'All' },
              ...LANGUAGE_OPTIONS.filter((option) =>
                tours.some((tour) => tour.status === 'active' && tourSpeaks(tour, option.code)),
              ),
            ].map((option) => {
              const isActive = selectedLanguage === option.code;
              const count = tours.filter(
                (tour) =>
                  tour.status === 'active' &&
                  (option.code === 'all' || tourSpeaks(tour, option.code)),
              ).length;

              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setSelectedLanguage(option.code);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  <span>{option.flag}</span>
                  <span>{option.short}</span>
                  <span className={isActive ? 'text-white/60' : 'text-stone-400'}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && tours.length === 0 && (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto my-6 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-[#B45309] flex items-center justify-center mx-auto mb-4 text-2xl">
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            </div>
            <h3 className="font-bold text-stone-900 text-lg">
              {isVi ? 'Đang tải danh sách tour…' : 'Loading tours…'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {isVi
                ? 'Đang đồng bộ dữ liệu trải nghiệm từ hệ thống ViS-Go.'
                : 'Fetching the latest listings from ViS-Go cloud.'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTours.length === 0 && (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto my-6 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-red-50 text-[#991B1B] flex items-center justify-center mx-auto mb-4 text-2xl">
              <i className="fa-solid fa-compass"></i>
            </div>
            <h3 className="font-bold text-stone-900 text-lg">
              {isVi ? 'Không tìm thấy tour phù hợp' : 'No Tours Found'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {isVi
                ? 'Hãy thử đổi từ khóa tìm kiếm hoặc chọn địa danh / danh mục khác.'
                : 'Try changing your search keywords or clearing active filters.'}
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

        {/* Tour Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pageTours.map((tour, i) => {
            const displayTitle = isVi ? (tour.titleVi || tour.title) : tour.title;
            const displayTagline = isVi ? (tour.taglineVi || tour.tagline) : tour.tagline;

            return (
              /* Cards rise as the row comes into view, a beat apart. The delay
                 is capped by the row length rather than the page length, so
                 page two does not open with a two-second wait. */
              <Reveal key={tour.id} delay={(i % 3) * 110} className="h-full">
              <div
                onClick={() => onSelectTour(tour)}
                className="bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-xl border border-stone-200/90 transition-all duration-300 flex flex-col group cursor-pointer h-full"
              >
                {/* Cover Image Container */}
                <div className="h-56 bg-stone-100 relative overflow-hidden">
                  <img
                    src={tour.coverImage}
                    alt={displayTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  {/* Price Tag Top Right */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black text-[#991B1B] shadow-md border border-amber-300/40">
                    {formatPrice(tour)} <span className="text-[10px] text-stone-500 font-normal">/ {isVi ? 'người' : 'pax'}</span>
                  </div>

                  {/* Featured Gold Badge */}
                  {tour.featured && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md tracking-wider flex items-center gap-1">
                      <i className="fa-solid fa-crown text-[9px]"></i>
                      <span>{isVi ? 'NỔI BẬT' : 'FEATURED'}</span>
                    </div>
                  )}

                  {/* Host Pill Bottom Left */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 max-w-[70%]">
                    <div className="w-9 h-9 rounded-full border-2 border-amber-400 overflow-hidden shadow-md shrink-0 bg-stone-900">
                      <Avatar src={tour.hostAvatar} name={tour.hostName} className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-stone-900/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] text-white font-bold truncate flex items-center gap-1.5 border border-white/10">
                      <span className="truncate">{tour.hostName}</span>
                      {tour.hostVerified && (
                        <i className="fa-solid fa-circle-check text-emerald-400 text-[11px] shrink-0" title="Verified"></i>
                      )}
                    </div>
                  </div>

                  {/* City Badge Bottom Right */}
                  <div className="absolute bottom-3 right-3 bg-stone-900/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] text-white font-semibold flex items-center gap-1 border border-white/10">
                    <i className="fa-solid fa-location-dot text-amber-400 text-[9px]"></i>
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
                      <div className="flex items-center gap-1 text-xs font-bold shrink-0 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        <span className="text-amber-500">★</span>
                        <span className="text-stone-900 font-black">{tour.hostRating.toFixed(1)}</span>
                        <span className="text-stone-400 text-[10px]">({tour.hostReviewCount})</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {displayTagline}
                    </p>

                    <div className="mt-2 flex items-center gap-1">
                      {tourLanguageCodes(tour).slice(0, 4).map((code) => (
                        <span key={code} title={languageLabel(code)} className="text-xs">
                          {languageOption(code)?.flag ?? '🌐'}
                        </span>
                      ))}
                    </div>

                    {/* Host Languages Spoken */}
                    <div className="mt-3 py-2 px-3 bg-stone-50 rounded-xl border border-stone-200/70 flex items-center justify-between text-[11px]">
                      <span className="text-stone-500 font-medium">
                        <i className="fa-solid fa-comments mr-1.5 text-[#991B1B]"></i>
                        {isVi ? 'Ngôn ngữ:' : 'Host speaks:'}
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
                        className="px-4 py-2 bg-gradient-to-r from-[#991B1B] to-[#7F1D1D] hover:from-[#7F1D1D] hover:to-[#580B0B] text-white rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all cursor-pointer"
                      >
                        {isVi ? 'Đặt Tour' : 'Book'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
              </Reveal>
            );
          })}
        </div>

        {/* Pagination. Numbers rather than an endless "load more": someone
            comparing two tours needs to be able to get back to the one they
            saw, and an infinite list makes that impossible. */}
        {pageCount > 1 && (
          <nav
            className="flex items-center justify-center gap-1.5 pt-2"
            aria-label={isVi ? 'Phân trang danh sách tour' : 'Tour list pages'}
          >
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                setPage((n) => Math.max(0, n - 1));
                scrollToTours();
              }}
              disabled={safePage === 0}
              aria-label={isVi ? 'Trang trước' : 'Previous page'}
              className="w-9 h-9 rounded-full border border-stone-300 text-stone-500 hover:border-[#991B1B] hover:text-[#991B1B] disabled:opacity-35 disabled:hover:border-stone-300 disabled:hover:text-stone-500 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>

            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  sounds.playTap();
                  setPage(i);
                  scrollToTours();
                }}
                aria-current={i === safePage ? 'page' : undefined}
                className={`w-9 h-9 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
                  i === safePage
                    ? 'bg-[#991B1B] text-white border-[#991B1B]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[#991B1B] hover:text-[#991B1B]'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                setPage((n) => Math.min(pageCount - 1, n + 1));
                scrollToTours();
              }}
              disabled={safePage === pageCount - 1}
              aria-label={isVi ? 'Trang sau' : 'Next page'}
              className="w-9 h-9 rounded-full border border-stone-300 text-stone-500 hover:border-[#991B1B] hover:text-[#991B1B] disabled:opacity-35 disabled:hover:border-stone-300 disabled:hover:text-stone-500 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </nav>
        )}

      </section>

    </div>
  );
};
