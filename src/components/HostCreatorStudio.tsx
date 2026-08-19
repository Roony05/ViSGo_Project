import React, { useState } from 'react';
import { Tour, TourStop, Language, User } from '../types';
import { translations } from '../i18n/translations';
import { CURATED_VIETNAM_IMAGES } from '../data/mockData';
import { sounds } from '../utils/audio';

interface HostCreatorStudioProps {
  activeUser: User | null;
  language: Language;
  currency: 'VND' | 'USD';
  onPublishTour: (tour: Tour) => void;
}

export const HostCreatorStudio: React.FC<HostCreatorStudioProps> = ({
  activeUser,
  language,
  currency,
  onPublishTour,
}) => {
  const t = translations[language];

  const [titleVi, setTitleVi] = useState('Hà Nội: Khám Phá Cà Phê Trứng & Phố Cổ Bí Mật');
  const [titleEn, setTitleEn] = useState('Hanoi: Secret Egg Coffee & Hidden Old Quarter Walk');
  const [taglineVi, setTaglineVi] = useState('Trải nghiệm hương vị cà phê béo ngậy và ngõ cổ 100 năm.');
  const [taglineEn, setTaglineEn] = useState('Savor decadent whipped egg coffee and discover century-old alleys.');
  const [city, setCity] = useState<'Hà Nội' | 'TP. Hồ Chí Minh' | 'Đà Nẵng' | 'Hội An' | 'Đà Lạt' | 'Huế' | 'Ninh Bình' | 'Sa Pa'>('Hà Nội');
  const [category, setCategory] = useState<'street-food' | 'hidden-gems' | 'nightlife' | 'heritage' | 'craft-art' | 'nature-trek'>('hidden-gems');
  const [durationHours, setDurationHours] = useState<number>(3);
  const [priceVND, setPriceVND] = useState<number>(450000);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(5);
  const [meetingPointVi, setMeetingPointVi] = useState('Café Giảng, 39 Nguyễn Hữu Huân, Hoàn Kiếm');
  const [meetingPointEn, setMeetingPointEn] = useState('Giang Cafe, 39 Nguyen Huu Huan Street, Hoan Kiem');
  const [coverImage, setCoverImage] = useState<string>(CURATED_VIETNAM_IMAGES[0].url);
  const [includedVi, setIncludedVi] = useState('Cà phê trứng đặc sản, Bánh mì kẹp thịt truyền thống, Nước khoáng, Host nhiệt tình');
  const [includedEn, setIncludedEn] = useState('Authentic Egg Coffee, Classic Banh Mi sandwich, Bottled water, Dedicated local host');
  const [descriptionVi, setDescriptionVi] = useState('Cùng người bạn bản địa đi sâu vào những con ngõ cổ kính của Hà Nội, tìm hiểu lịch sử ra đời của món Cà phê trứng trứ danh từ thời kỳ Pháp thuộc và ngắm nhìn nhịp sống thường nhật bình dị.');
  const [descriptionEn, setDescriptionEn] = useState('Join your local buddy into secret ancient alleyways of Hanoi, uncover the historic origins of Vietnam’s iconic whipped Egg Coffee, and experience everyday local life.');
  
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [showImagePicker, setShowImagePicker] = useState<boolean>(false);

  // Itinerary Stops
  const [stops, setStops] = useState<TourStop[]>([
    {
      id: 's_1',
      time: '09:00',
      title: 'Giang Cafe Meetup & Coffee Whipping Story',
      titleVi: 'Hẹn gặp tại Café Giảng & Câu chuyện Cà phê trứng',
      description: 'Taste the silky whipped egg cream over dark robusta coffee.',
      descriptionVi: 'Thưởng thức lớp kem trứng béo ngậy trên nền cà phê robusta đậm đà.',
      locationName: 'Nguyễn Hữu Huân'
    },
    {
      id: 's_2',
      time: '10:15',
      title: 'Hidden Old Quarter Residential Tunnel Walk',
      titleVi: 'Khám phá ngõ hẹp dân sinh Phố Cổ',
      description: 'Step through narrow archways into private communal courtyards.',
      descriptionVi: 'Bước qua những vòm cổng hẹp để khám phá sân chung của các gia đình phố cổ.',
      locationName: 'Hàng Bạc & Mã Mây'
    }
  ]);

  // Smart 1-Click AI Translation simulation
  const handleSmartTranslate = () => {
    if (!descriptionVi.trim()) {
      alert(language === 'vi' ? 'Vui lòng nhập mô tả tiếng Việt trước khi dịch.' : 'Please enter Vietnamese description first.');
      return;
    }

    setIsTranslating(true);
    setTimeout(() => {
      setIsTranslating(false);
      // Generate polished professional English translation
      setTitleEn(
        titleVi.includes('Phở')
          ? 'Hanoi: Night Pho & Classic Scooter Alley Safari'
          : titleVi.includes('Chợ Lớn')
          ? 'Saigon Chinatown: Historic Pagodas & Secret Dim Sum Alleys'
          : `Authentic ${city} Cultural Heritage & Local Buddy Tour`
      );
      setTaglineEn(`Immerse in authentic ${city} lifestyle, local culinary treasures, and safety-first hospitality.`);
      setDescriptionEn(
        `Experience the vibrant living soul of ${city} alongside a verified local buddy. ` +
        `This curated cultural journey avoids commercial tourist crowds and introduces you to authentic hidden gems, heirloom food stalls, ` +
        `and heartwarming local stories that make Vietnam feel like your second home.`
      );
      setIncludedEn('Local Buddy Host, Curated Tastings, Entrance Fees, Bottled Water, 24/7 Safety Escrow');
      setMeetingPointEn(`${meetingPointVi}, ${city}, Vietnam`);

      sounds.playSuccessChime();
    }, 1200);
  };

  const handleAddStop = () => {
    const newStop: TourStop = {
      id: `s_${Date.now()}`,
      time: '11:30',
      title: 'Local Craft Workshop Stop',
      titleVi: 'Chặng dừng trải nghiệm nghề thủ công',
      description: 'Interact with local artisans and craft keepsakes.',
      descriptionVi: 'Giao lưu cùng nghệ nhân và tự tay làm quà lưu niệm.',
      locationName: city
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newTour: Tour = {
      id: `tour_${Date.now()}`,
      hostId: activeUser?.id || 'user_host_1',
      hostName: activeUser?.name || 'Nguyễn Minh Tuấn (Buddy)',
      hostAvatar: activeUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      hostPhone: activeUser?.phone || '+84 912 345 678',
      hostRating: 5.0,
      hostReviewCount: 1,
      hostVerified: true,
      hostBio: activeUser?.bio || 'Passionate local host sharing authentic Vietnamese culture and culinary secrets.',
      hostBioVi: activeUser?.bioVi || 'Người bản địa nhiệt huyết chia sẻ ẩm thực ngõ hẻm và văn hóa chân thực.',
      hostLanguages: activeUser?.languages || ['Tiếng Việt', 'English'],
      hostSpecialties: activeUser?.specialties || ['Street Food', 'Hidden Gems'],
      title: titleEn || titleVi,
      titleVi: titleVi,
      tagline: taglineEn || taglineVi,
      taglineVi: taglineVi,
      city,
      category,
      durationHours,
      priceVND,
      priceUSD: Math.round(priceVND / 25000),
      maxGroupSize,
      languages: activeUser?.languages || ['Tiếng Việt', 'English'],
      meetingPoint: meetingPointEn || meetingPointVi,
      meetingPointVi,
      lat: city === 'Hà Nội' ? 21.0285 : city === 'TP. Hồ Chí Minh' ? 10.7769 : 16.0544,
      lng: city === 'Hà Nội' ? 105.8542 : city === 'TP. Hồ Chí Minh' ? 106.7009 : 108.2022,
      coverImage,
      galleryImages: [coverImage],
      included: includedEn.split(',').map(s => s.trim()),
      includedVi: includedVi.split(',').map(s => s.trim()),
      stops,
      description: descriptionEn || descriptionVi,
      descriptionVi,
      featured: false,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    onPublishTour(newTour);
    sounds.playSuccessChime();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Studio Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold mb-2">
            <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
            <span>{t.creatorStudio}</span>
          </div>
          <h2 className="font-serif text-xl sm:text-3xl font-bold tracking-tight">
            {t.hostStudioTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
            {t.hostStudioSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs text-center">
            <span className="text-stone-300 text-[10px] uppercase block">Host Escrow Payout</span>
            <span className="text-amber-300 font-extrabold text-sm">85% Net Direct Payout</span>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Form on Left, Real-Time Interactive Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Rich Tour Builder Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Title Inputs */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.tourTitleVi} *
              </label>
              <input
                type="text"
                required
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                placeholder="e.g. Hà Nội: Săn Phở Đêm & Ngõ Hẻm Cổ Kính"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.tourTitleEn}
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Hanoi: Midnight Pho & Ancient Secret Alleys"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>

            {/* City & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {t.selectCity} *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Hội An">Hội An</option>
                  <option value="Đà Lạt">Đà Lạt</option>
                  <option value="Huế">Huế</option>
                  <option value="Ninh Bình">Ninh Bình</option>
                  <option value="Sa Pa">Sa Pa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {t.selectCategory} *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="street-food">{t.catStreetFood}</option>
                  <option value="hidden-gems">{t.catHiddenGems}</option>
                  <option value="nightlife">{t.catNightlife}</option>
                  <option value="heritage">{t.catHeritage}</option>
                  <option value="craft-art">{t.catCraftArt}</option>
                  <option value="nature-trek">{t.catNatureTrek}</option>
                </select>
              </div>
            </div>

            {/* Duration, Price, Max Guests */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">{t.durationInput}</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">{t.priceVNDInput}</label>
                <input
                  type="number"
                  step="10000"
                  min="50000"
                  value={priceVND}
                  onChange={(e) => setPriceVND(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-[#A82323] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">{t.maxGroupSizeInput}</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxGroupSize}
                  onChange={(e) => setMaxGroupSize(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white"
                />
              </div>
            </div>

            {/* Meeting Point */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.meetingPointInputVi} *
              </label>
              <input
                type="text"
                required
                value={meetingPointVi}
                onChange={(e) => setMeetingPointVi(e.target.value)}
                placeholder="e.g. Nhà Hát Lớn Hà Nội, 1 Tràng Tiền"
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Cover Image URL & Preset Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-800">
                  {t.coverImageUrl}
                </label>
                <button
                  type="button"
                  onClick={() => setShowImagePicker(!showImagePicker)}
                  className="text-[11px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <i className="fa-regular fa-images"></i>
                  <span>{t.presetImages}</span>
                </button>
              </div>

              <input
                type="url"
                required
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono text-stone-800 focus:bg-white focus:outline-hidden"
              />

              {showImagePicker && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-2 bg-stone-100 rounded-xl border border-stone-200">
                  {CURATED_VIETNAM_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCoverImage(img.url);
                        setShowImagePicker(false);
                      }}
                      className="group relative rounded-lg overflow-hidden h-16 border border-stone-300 hover:border-[#A82323] cursor-pointer"
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] truncate px-1 py-0.5 font-medium">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Smart 1-Click Translation & Descriptions */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-language text-amber-600"></i>
                  <span>{t.descriptionInputVi}</span>
                </label>

                {/* Smart Translate Button */}
                <button
                  type="button"
                  onClick={handleSmartTranslate}
                  disabled={isTranslating}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isTranslating ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>{language === 'vi' ? 'Đang dịch AI...' : 'Translating...'}</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                      <span>{t.smartTranslateBtn}</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={3}
                required
                value={descriptionVi}
                onChange={(e) => setDescriptionVi(e.target.value)}
                placeholder="Mô tả các điểm đặc sắc, trải nghiệm ẩm thực, phương tiện di chuyển..."
                className="w-full px-3 py-2 bg-white border border-amber-300/70 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              ></textarea>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  {t.descriptionInputEn} (For International Travelers)
                </label>
                <textarea
                  rows={3}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  placeholder="English description generated via Smart Translate..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
                ></textarea>
              </div>
            </div>

            {/* Itinerary Timeline Stops Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  {t.itineraryBuilderTitle}
                </h4>
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {t.addStop}
                </button>
              </div>

              <div className="space-y-2">
                {stops.map((stop, idx) => (
                  <div key={stop.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-800 text-white text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={stop.time}
                        onChange={(e) => {
                          const updated = [...stops];
                          updated[idx].time = e.target.value;
                          setStops(updated);
                        }}
                        placeholder="09:00"
                        className="w-20 px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                      />
                      <input
                        type="text"
                        value={stop.titleVi}
                        onChange={(e) => {
                          const updated = [...stops];
                          updated[idx].titleVi = e.target.value;
                          setStops(updated);
                        }}
                        placeholder={language === 'vi' ? 'Tên chặng dừng chân' : 'Stop title / landmark'}
                        className="flex-1 px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                      />
                      {stops.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(stop.id)}
                          className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inclusions */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.includedItemsVi}
              </label>
              <input
                type="text"
                value={includedVi}
                onChange={(e) => setIncludedVi(e.target.value)}
                placeholder={
                  language === 'vi'
                    ? 'Ăn uống, Nước uống, Mũ bảo hiểm, Host hướng dẫn...'
                    : 'Food tastings, drinks, helmets, local guide...'
                }
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white"
              />
            </div>

            {/* Publish Action */}
            <div className="pt-3 border-t border-stone-200">
              <button
                type="submit"
                className="w-full py-3.5 bg-[#A82323] hover:bg-[#8C1818] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-cloud-arrow-up text-amber-300"></i>
                <span>{t.publishTour}</span>
              </button>
            </div>

          </form>

        </div>

        {/* Right Column: Real-Time Interactive Live Preview Card (5 Cols) */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              {t.livePreviewTitle}
            </span>
            <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
              LIVE SYNC
            </span>
          </div>

          {/* Rendered Live Tour Card */}
          <div className="bg-white rounded-3xl border-2 border-amber-400 shadow-xl overflow-hidden">
            
            <div className="relative aspect-4/3 w-full overflow-hidden bg-stone-900">
              <img
                src={coverImage}
                alt={titleVi}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"></div>

              <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                <i className="fa-solid fa-location-dot text-amber-400 text-[10px]"></i>
                <span>{city}</span>
              </div>

              <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/90 text-stone-900 text-[11px] font-bold">
                <i className="fa-regular fa-clock text-[#A82323]"></i>
                <span>{durationHours} {t.duration}</span>
              </div>

              <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-950/80 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                <i className="fa-solid fa-star text-amber-400 text-[10px]"></i>
                <span>5.0 (New)</span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {/* Host avatar */}
              <div className="flex items-center gap-2.5">
                <img
                  src={activeUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                  alt="Host"
                  className="w-8 h-8 rounded-full object-cover border border-amber-400"
                />
                <div>
                  <span className="text-xs font-bold text-stone-800 block">
                    {activeUser?.name || 'Nguyễn Minh Tuấn (Buddy)'}
                  </span>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                    100% eKYC Verified Host
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-stone-900 text-sm leading-snug">
                {language === 'vi' ? (titleVi || 'Tên trải nghiệm bản địa') : (titleEn || titleVi || 'Authentic Cultural Experience')}
              </h3>

              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                {language === 'vi' ? descriptionVi : (descriptionEn || descriptionVi)}
              </p>

              {/* Stops summary in preview */}
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <span className="font-bold text-stone-800 block text-[10px] uppercase">
                  {stops.length} Itinerary Stops:
                </span>
                {stops.map((s, i) => (
                  <div key={i} className="truncate">
                    • <strong>{s.time}</strong> - {language === 'vi' ? s.titleVi : s.title}
                  </div>
                ))}
              </div>

              {/* Price Row */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">{language === 'vi' ? 'Giá trên khách' : 'Price per person'}</span>
                  <span className="text-base font-extrabold text-[#A82323]">
                    {currency === 'USD' ? `$${Math.round(priceVND / 25000)}` : `${priceVND.toLocaleString('vi-VN')}₫`}
                  </span>
                </div>

                <span className="px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-lg">
                  Preview Mode
                </span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
