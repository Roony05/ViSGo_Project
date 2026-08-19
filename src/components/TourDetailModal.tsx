import React, { useState } from 'react';
import { Tour, Language, TourReview, User } from '../types';
import { translations } from '../i18n/translations';

interface TourDetailModalProps {
  tour: Tour | null;
  language: Language;
  currency: 'VND' | 'USD';
  reviews: TourReview[];
  activeUser: User | null;
  onClose: () => void;
  onProceedBooking: (bookingDraft: {
    tour: Tour;
    date: string;
    time: string;
    guests: number;
    totalVND: number;
    totalUSD: number;
    platformFeeVND: number;
    discountVND: number;
    couponCode: string;
    specialNotes: string;
  }) => void;
  onOpenWriteReview: (tour: Tour) => void;
  onOpenChat?: () => void;
}

export const TourDetailModal: React.FC<TourDetailModalProps> = ({
  tour,
  language,
  currency,
  reviews,
  onClose,
  onProceedBooking,
  onOpenWriteReview,
  onOpenChat,
}) => {
  const t = translations[language];

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState<string>('18:00');
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [couponDiscount, setCouponDiscount] = useState<number>(0); // percentage
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'itinerary' | 'host' | 'reviews'>('itinerary');

  if (!tour) return null;

  const tourReviews = reviews.filter((r) => r.tourId === tour.id);

  // Price calculations
  const baseSubtotalVND = tour.priceVND * guestsCount;
  const baseSubtotalUSD = tour.priceUSD * guestsCount;
  
  const discountAmountVND = couponApplied ? Math.round(baseSubtotalVND * (couponDiscount / 100)) : 0;
  const totalPayableVND = Math.max(0, baseSubtotalVND - discountAmountVND);
  const totalPayableUSD = currency === 'USD' ? Math.round(totalPayableVND / 25000) : baseSubtotalUSD;
  const platformFeeVND = Math.round(totalPayableVND * 0.15); // 15% escrow included

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'VISGOVIETNAM' || code === 'HELLOVN' || code === 'VIETNAM10') {
      setCouponApplied(true);
      setCouponDiscount(10); // 10% off
    } else if (code === 'WELCOME20') {
      setCouponApplied(true);
      setCouponDiscount(20);
    } else {
      alert(language === 'vi' ? 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn.' : 'Invalid or expired promo code.');
    }
  };

  const handleReserve = () => {
    onProceedBooking({
      tour,
      date: selectedDate,
      time: selectedTime,
      guests: guestsCount,
      totalVND: totalPayableVND,
      totalUSD: totalPayableUSD,
      platformFeeVND,
      discountVND: discountAmountVND,
      couponCode: couponApplied ? couponCode.toUpperCase() : '',
      specialNotes,
    });
  };

  const displayTitle = language === 'vi' ? tour.titleVi : tour.title;
  const displayDesc = language === 'vi' ? tour.descriptionVi : tour.description;
  const displayIncluded = language === 'vi' ? tour.includedVi : tour.included;
  const displayMeeting = language === 'vi' ? tour.meetingPointVi : tour.meetingPoint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Sticky Modal Top Bar with Cover Image */}
        <div className="relative h-48 sm:h-64 w-full bg-stone-900 shrink-0">
          <img
            src={tour.coverImage}
            alt={displayTitle}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20"></div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20 z-10"
            aria-label="Close modal"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>

          {/* Header Meta Content */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 text-white">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#A82323] text-white text-[11px] font-bold">
                {tour.city}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/90 text-stone-950 text-[11px] font-bold flex items-center gap-1">
                <i className="fa-solid fa-star text-[10px]"></i>
                {tour.hostRating.toFixed(2)} ({tour.hostReviewCount} {t.ratingReviews})
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-medium">
                <i className="fa-regular fa-clock mr-1"></i>
                {tour.durationHours} {t.duration}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold leading-snug drop-shadow-md line-clamp-2">
              {displayTitle}
            </h2>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center border-b border-stone-200 px-6 bg-stone-50/70 shrink-0">
          <button
            onClick={() => setSelectedTab('itinerary')}
            className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'itinerary'
                ? 'border-[#A82323] text-[#A82323]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <i className="fa-solid fa-route mr-1.5"></i>
            {t.itineraryTimeline}
          </button>
          <button
            onClick={() => setSelectedTab('host')}
            className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'host'
                ? 'border-[#A82323] text-[#A82323]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <i className="fa-solid fa-user mr-1.5"></i>
            {t.hostBioTitle}
          </button>
          <button
            onClick={() => setSelectedTab('reviews')}
            className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'reviews'
                ? 'border-[#A82323] text-[#A82323]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <i className="fa-regular fa-star mr-1.5"></i>
            {t.reviewsTitle} ({tourReviews.length})
          </button>
        </div>

        {/* Modal Scrollable Body (2 Columns on Desktop) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Details, Timeline, Inclusions (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {selectedTab === 'itinerary' && (
              <>
                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    {t.experienceOverview}
                  </h4>
                  <p className="text-stone-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                    {displayDesc}
                  </p>
                </div>

                {/* Step-by-Step Timeline Stops */}
                <div>
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                    {t.itineraryTimeline}
                  </h4>
                  <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-300">
                    {tour.stops.map((stop, idx) => {
                      const sTitle = language === 'vi' ? stop.titleVi : stop.title;
                      const sDesc = language === 'vi' ? stop.descriptionVi : stop.description;

                      return (
                        <div key={stop.id} className="relative">
                          <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-[#A82323] border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                            {idx + 1}
                          </span>
                          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/80">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h5 className="font-bold text-xs text-stone-900">{sTitle}</h5>
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold font-mono shrink-0">
                                {stop.time}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 leading-snug">{sDesc}</p>
                            <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1">
                              <i className="fa-solid fa-map-pin text-[#A82323] text-[10px]"></i>
                              <span>{stop.locationName}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* What's Included */}
                <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/60">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check text-amber-600"></i>
                    {t.whatsIncluded}
                  </h4>
                  <ul className="space-y-1.5">
                    {displayIncluded.map((inc, i) => (
                      <li key={i} className="text-xs text-stone-700 flex items-start gap-2">
                        <i className="fa-solid fa-check text-emerald-600 text-xs mt-0.5 shrink-0"></i>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Meeting Point */}
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
                  <h4 className="text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                    <i className="fa-solid fa-location-dot text-[#A82323]"></i>
                    {t.meetingLocation}
                  </h4>
                  <p className="text-xs text-stone-600 font-medium">{displayMeeting}</p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    {language === 'vi' ? 'Tọa độ GPS sẽ kích hoạt định vị trực tiếp khi bạn xác nhận đặt tour.' : 'Live GPS navigation unlocks upon booking confirmation.'}
                  </p>
                </div>

                {/* Cancellation policy */}
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                  <i className="fa-solid fa-shield-halved text-emerald-600 mt-0.5"></i>
                  <div>
                    <span className="font-bold">{t.cancellationPolicy}:</span> {t.cancellationDetails}
                  </div>
                </div>
              </>
            )}

            {selectedTab === 'host' && (
              <div className="space-y-5">
                {/* Host Hero Card */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-gradient-to-br from-[#FAF8F5] to-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <div className="relative shrink-0">
                    <img
                      src={tour.hostAvatar}
                      alt={tour.hostName}
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#D4AF37] shadow-md bg-[#D4AF37]/20"
                    />
                    {tour.hostVerified && (
                      <span className="absolute bottom-0 right-0 w-6 h-6 bg-[#A82323] text-white rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-xs" title="100% eKYC Verified Host">
                        <i className="fa-solid fa-shield-check"></i>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="serif font-bold text-lg text-stone-900">{tour.hostName}</h3>
                      {tour.hostVerified && (
                        <span className="px-2.5 py-0.5 bg-[#D4AF37]/20 text-[#8C6D1F] border border-[#D4AF37]/40 text-[10px] font-black uppercase rounded-full">
                          {t.verifiedHost}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                      <i className="fa-solid fa-location-dot text-[#A82323] text-[11px]"></i>
                      <span>{tour.city}, Vietnam</span>
                      <span>•</span>
                      <span>★ {tour.hostRating.toFixed(2)} ({tour.hostReviewCount} {language === 'vi' ? 'đánh giá' : 'reviews'})</span>
                    </p>

                    <p className="text-xs text-stone-500 mt-1">
                      <i className="fa-solid fa-phone text-xs mr-1 text-stone-400"></i>
                      {tour.hostPhone}
                    </p>
                  </div>

                  <button
                    onClick={onOpenChat}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-center"
                  >
                    <i className="fa-regular fa-comment-dots text-[#D4AF37]"></i>
                    <span>{language === 'vi' ? 'Nhắn tin cho Host' : 'Message Host'}</span>
                  </button>
                </div>

                {/* Spoken Languages */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-language text-[#D4AF37] text-sm"></i>
                    <span>{t.languagesSpoken}</span>
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(tour.hostLanguages || tour.languages).map((l, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-[#FAF8F5] border border-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>🗣️</span>
                        <span>{l}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Host Biography (Bilingual with Language Switcher) */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-user-tag text-[#A82323]"></i>
                      <span>{language === 'vi' ? 'Tiểu sử người bạn bản địa' : 'About Your Local Buddy'}</span>
                    </h4>
                    <span className="text-[10px] text-stone-400 font-mono uppercase">
                      {language === 'vi' ? 'Song ngữ VI / EN' : 'Bilingual Host'}
                    </span>
                  </div>

                  {/* Primary Language Bio */}
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-[#FAF8F5] p-4 rounded-xl border border-stone-200/70">
                    {language === 'vi'
                      ? (tour.hostBioVi || tour.hostBio || 'Người bản địa nhiệt huyết, yêu mến văn hóa dân tộc và có nhiều năm kinh nghiệm dẫn khách quốc tế khám phá ẩm thực ngõ hẻm và các câu chuyện lịch sử chân thực.')
                      : (tour.hostBio || tour.hostBioVi || 'A passionate local host dedicated to showcasing authentic Vietnamese heritage, street culinary treasures, and safety-first scooter journeys.')}
                  </p>

                  {/* Secondary Language toggle / collapsed note */}
                  {(tour.hostBio && tour.hostBioVi) && (
                    <details className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200/60 cursor-pointer">
                      <summary className="font-semibold text-stone-700 hover:text-[#A82323]">
                        {language === 'vi' ? '🌐 Xem bản dịch Tiếng Anh (English Bio)' : '🌐 View Vietnamese Version (Tiếng Việt)'}
                      </summary>
                      <p className="mt-2 pt-2 border-t border-stone-200 text-stone-600 italic leading-relaxed whitespace-pre-line">
                        {language === 'vi' ? tour.hostBio : tour.hostBioVi}
                      </p>
                    </details>
                  )}
                </div>

                {/* Host Specialties & Tags if available */}
                {tour.hostSpecialties && tour.hostSpecialties.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      {language === 'vi' ? 'Sở trường & Phong cách dẫn tour' : 'Host Passions & Specialties'}
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tour.hostSpecialties.map((spec, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-medium rounded-lg"
                        >
                          #{spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification & Safety Escrow Badge */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-start gap-3">
                  <i className="fa-solid fa-shield-check text-emerald-700 text-lg mt-0.5 shrink-0"></i>
                  <div>
                    <strong className="block font-bold">
                      {language === 'vi' ? 'Chứng nhận Bạn Đồng Hành ViS-Go Uy Tín' : 'Verified ViS-Go Local Companion Seal'}
                    </strong>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      {language === 'vi'
                        ? 'Host đã hoàn tất kiểm tra danh tính điện tử eKYC với CCCD/Hộ chiếu, xác thực lý lịch tư pháp trong sạch và cam kết bảo hiểm an toàn 24/7 cho du khách.'
                        : 'This host has completed full biometric eKYC identity verification with Citizen ID/Passport, passed criminal background screening, and adheres to 24/7 safety standards.'}
                    </p>
                  </div>
                </div>

              </div>
            )}

            {selectedTab === 'reviews' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-stone-900">
                    {tourReviews.length} {t.reviewsTitle}
                  </h4>
                  <button
                    onClick={() => onOpenWriteReview(tour)}
                    className="px-3 py-1.5 bg-[#A82323] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#8C1818]"
                  >
                    <i className="fa-regular fa-pen-to-square mr-1"></i>
                    {t.leaveReview}
                  </button>
                </div>

                {tourReviews.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                    {language === 'vi' ? 'Chưa có đánh giá nào cho tour này. Hãy là người đầu tiên trải nghiệm!' : 'No reviews yet for this tour. Be the first to share your experience!'}
                  </div>
                ) : (
                  tourReviews.map((rev) => (
                    <div key={rev.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={rev.userAvatar}
                            alt={rev.userName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <h5 className="font-bold text-xs text-stone-900">{rev.userName}</h5>
                            <span className="text-[10px] text-stone-400">{rev.userCountry} • {rev.date}</span>
                          </div>
                        </div>
                        <div className="flex text-amber-400 text-xs">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <i key={i} className="fa-solid fa-star"></i>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                      {rev.tags && rev.tags.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {rev.tags.map((tag, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-100/60 text-amber-900 rounded-md font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

          </div>

          {/* Right Column: Dynamic Booking Card Calculator (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-2 bg-gradient-to-b from-stone-50 to-white rounded-2xl p-5 border border-stone-200 shadow-md space-y-4">
              
              {/* Pricing Header */}
              <div className="flex items-baseline justify-between pb-3 border-b border-stone-200">
                <div>
                  <span className="text-xl font-extrabold text-[#A82323]">
                    {currency === 'USD' ? `$${tour.priceUSD}` : `${tour.priceVND.toLocaleString('vi-VN')}₫`}
                  </span>
                  <span className="text-xs text-stone-500 ml-1">{t.perPerson}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {t.instantConfirmation}
                </span>
              </div>

              {/* Date & Time Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-800">
                  {t.selectDateTime}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-stone-500 block mb-1">{t.dateLabel}</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block mb-1">{t.timeLabel}</span>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#A82323] cursor-pointer"
                    >
                      <option value="08:00">08:00 AM (Morning)</option>
                      <option value="11:30">11:30 AM (Lunch)</option>
                      <option value="15:00">03:00 PM (Afternoon)</option>
                      <option value="18:00">06:00 PM (Evening Tour)</option>
                      <option value="19:30">07:30 PM (Night Life)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Guest Counter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-800">
                    {t.guestsCountLabel}
                  </label>
                  <span className="text-[11px] text-stone-400">
                    {t.maxGuests}: {tour.maxGroupSize}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-stone-300">
                  <button
                    type="button"
                    onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))}
                    disabled={guestsCount <= 1}
                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-800 font-bold flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm text-stone-900 font-mono">
                    {guestsCount} {language === 'vi' ? (guestsCount > 1 ? 'Khách du lịch' : 'Khách du lịch') : (guestsCount > 1 ? 'Travelers' : 'Traveler')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGuestsCount(Math.min(tour.maxGroupSize, guestsCount + 1))}
                    disabled={guestsCount >= tour.maxGroupSize}
                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-800 font-bold flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Promo Coupon Code */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {t.discountCode} (Try: <span className="font-mono text-amber-700">VISGOVIETNAM</span>)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. VISGOVIETNAM"
                    className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    {t.applyCode}
                  </button>
                </div>
                {couponApplied && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <i className="fa-solid fa-check"></i>
                    {language === 'vi' ? `Đã áp dụng giảm ${couponDiscount}%!` : `${couponDiscount}% discount applied!`}
                  </p>
                )}
              </div>

              {/* Special dietary / notes */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {language === 'vi' ? 'Ghi chú cho Bạn Bản địa' : 'Special Notes for Buddy'}
                </label>
                <textarea
                  rows={2}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder={language === 'vi' ? 'Dị ứng thực phẩm, ăn chay, đón tại khách sạn...' : 'Vegetarian, food allergies, hotel pick-up details...'}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
                ></textarea>
              </div>

              {/* Dynamic Price Breakdown */}
              <div className="p-3 bg-stone-100 rounded-xl space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>{t.subtotal} ({guestsCount}x)</span>
                  <span className="font-semibold text-stone-900">
                    {currency === 'USD' ? `$${baseSubtotalUSD}` : `${baseSubtotalVND.toLocaleString('vi-VN')}₫`}
                  </span>
                </div>

                {couponApplied && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>{t.discountCode} (-{couponDiscount}%)</span>
                    <span>-{currency === 'USD' ? `$${Math.round(discountAmountVND / 25000)}` : `${discountAmountVND.toLocaleString('vi-VN')}₫`}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>{t.platformFee}</span>
                  <span className="text-emerald-700 font-semibold">{language === 'vi' ? 'ĐÃ BAO GỒM' : 'INCLUDED'}</span>
                </div>

                <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline font-bold text-stone-900 text-sm">
                  <span>{t.totalPayable}</span>
                  <span className="text-base text-[#A82323]">
                    {currency === 'USD' ? `$${totalPayableUSD}` : `${totalPayableVND.toLocaleString('vi-VN')}₫`}
                  </span>
                </div>
              </div>

              {/* Action Button: Reserve */}
              <button
                type="button"
                onClick={handleReserve}
                className="w-full py-3.5 bg-gradient-to-r from-[#A82323] to-[#8C1818] hover:from-[#8C1818] hover:to-[#6E0E0E] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-shield-heart text-amber-300"></i>
                <span>{t.proceedCheckout}</span>
              </button>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
