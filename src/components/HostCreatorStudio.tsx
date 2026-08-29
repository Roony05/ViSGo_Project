import React, { useState } from 'react';
import { Tour, TourStop, HostKycApplication, Language, User } from '../types';
import { translations } from '../i18n/translations';
import { CURATED_VIETNAM_IMAGES } from '../data/curatedImages';
import { sounds } from '../utils/audio';
import { tourLanguageCodes } from '../utils/contentLanguage';
import { newId } from '../utils/ids';
import { ProvinceSelect } from './ProvinceSelect';
import { coordsForCity } from '../data/provinces';
import { youTubeId } from '../utils/youtube';
import { YouTubeEmbed } from './YouTubeEmbed';
import { Avatar } from './Avatar';
import { HostAiAssistant, type ListingDraft } from './HostAiAssistant';
import { LANGUAGE_OPTIONS, languageLabel, languageOption } from '../data/languages';

interface HostCreatorStudioProps {
  activeUser: User | null;
  language: Language;
  currency: 'VND' | 'USD';
  onPublishTour: (tour: Tour) => void;
  /** This host's identity declaration, if they have filed one. */
  identity: HostKycApplication | null;
  /** Takes the host to the form that fills the gap. */
  onOpenVerification: () => void;
  /**
   * The tour being edited, when the host came here from their own listing.
   *
   * The parent gives this component a `key` of the tour id, so switching from
   * one listing to another remounts it and every field re-initialises. That is
   * simpler and safer than an effect copying eleven fields into state, where
   * one missed field silently keeps the previous tour's text.
   */
  editingTour?: Tour | null;
  onUpdateTour?: (tour: Tour) => void;
  onCancelEdit?: () => void;
}

export const HostCreatorStudio: React.FC<HostCreatorStudioProps> = ({
  activeUser,
  language,
  currency,
  onPublishTour,
  identity,
  onOpenVerification,
  editingTour = null,
  onUpdateTour,
  onCancelEdit,
}) => {
  const isEditing = Boolean(editingTour);
  const t = translations[language];

  /*
    A tour may not be published by a host who has not said who they are.

    A traveller meets this person alone, often in a place they do not know, and
    the listing is the only thing standing between the two. Name, citizen ID,
    date of birth and address is the least that has to be on record first —
    a rejected declaration counts as no declaration, and a traveller booking is
    not asked for any of it.

    Approval is deliberately NOT required. An administrator reviewing the queue
    is a person on a schedule, and blocking every new host until someone
    happens to look would close the platform to newcomers for no gain in
    safety: what matters is that the details exist and are attributable.
  */
  const identityOnFile = Boolean(identity) && identity?.status !== 'rejected';
  const missingIdentity = [
    !identity?.fullName?.trim() && (language === 'vi' ? 'họ tên' : 'full name'),
    !identity?.cccdNumber?.trim() && (language === 'vi' ? 'số căn cước' : 'citizen ID'),
    !identity?.dateOfBirth?.trim() && (language === 'vi' ? 'ngày sinh' : 'date of birth'),
    !identity?.address?.trim() && (language === 'vi' ? 'địa chỉ' : 'address'),
  ].filter(Boolean) as string[];

  const [title, setTitle] = useState(editingTour?.titleVi || editingTour?.title || '');
  const [tagline, setTagline] = useState(editingTour?.taglineVi || editingTour?.tagline || '');
  // A free string, not a union of eight names. The union was the whole reason
  // a host outside those eight places could not file a listing at all.
  const [city, setCity] = useState<string>(editingTour?.city ?? 'Hà Nội');
  const [category, setCategory] = useState<'street-food' | 'hidden-gems' | 'nightlife' | 'heritage' | 'craft-art' | 'nature-trek'>(editingTour?.category ?? 'hidden-gems');
  const [durationHours, setDurationHours] = useState<number>(editingTour?.durationHours ?? 3);
  const [priceVND, setPriceVND] = useState<number>(editingTour?.priceVND ?? 450000);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(editingTour?.maxGroupSize ?? 5);
  const [meetingPoint, setMeetingPoint] = useState(editingTour?.meetingPointVi || editingTour?.meetingPoint || '');
  const [coverImage, setCoverImage] = useState<string>(editingTour?.coverImage ?? CURATED_VIETNAM_IMAGES[0].url);
  const [videoUrl, setVideoUrl] = useState<string>(editingTour?.videoUrl ?? '');
  const videoId = youTubeId(videoUrl);
  const [included, setIncluded] = useState(
    (editingTour?.includedVi?.length ? editingTour.includedVi : editingTour?.included)?.join(', ') || '',
  );
  const [description, setDescription] = useState(editingTour?.descriptionVi || editingTour?.description || '');

  /** What the writing assistant is shown: the five text fields, as they stand right now. */
  const listingDraft: ListingDraft = { title, tagline, description, included, meetingPoint };

  /**
   * Writes an accepted suggestion back into the form.
   *
   * Field by field, and only the keys the model actually returned — a patch
   * that touched just the title must not blank the other four. This runs on the
   * host's Apply press, never on the answer arriving.
   */
  const applyDraftPatch = (patch: Partial<ListingDraft>) => {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.tagline !== undefined) setTagline(patch.tagline);
    if (patch.description !== undefined) setDescription(patch.description);
    if (patch.included !== undefined) setIncluded(patch.included);
    if (patch.meetingPoint !== undefined) setMeetingPoint(patch.meetingPoint);
    sounds.playSuccessChime();
  };
  const [tourLanguages, setTourLanguages] = useState<string[]>(() =>
    editingTour ? tourLanguageCodes(editingTour) : ['vi'],
  );
  const [showImagePicker, setShowImagePicker] = useState<boolean>(false);

  const toggleTourLanguage = (code: string) => {
    setTourLanguages((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code],
    );
  };


  // Itinerary Stops
  const [stops, setStops] = useState<TourStop[]>(editingTour?.stops?.length ? editingTour.stops : [{
    id: newId('s'),
    time: '09:00',
    title: '',
    titleVi: '',
    description: '',
    descriptionVi: '',
    locationName: '',
  }]);

  const updateStop = (idx: number, patch: Partial<TourStop>) => {
    setStops(stops.map((stop, i) => (i === idx ? { ...stop, ...patch } : stop)));
  };

  const handleAddStop = () => {
    const newStop: TourStop = {
      id: newId('s'),
      time: '11:30',
      title: '',
      titleVi: '',
      description: '',
      descriptionVi: '',
      locationName: city,
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tourLanguages.length === 0) return;

    const both = (text: string) => text.trim();
    const publishableStops: TourStop[] = stops.map((stop) => ({
      ...stop,
      title: both(stop.titleVi),
      titleVi: both(stop.titleVi),
      description: both(stop.descriptionVi),
      descriptionVi: both(stop.descriptionVi),
    }));

    // A tour belongs to the host publishing it. Without a signed-in account
    // there is no owner to name, and Firestore refuses a tour whose `hostId` is
    // not the caller's uid — so this used to build a listing credited to a
    // fabricated host and then fail to save it.
    if (!activeUser) return;

    // Only for a new listing. A host whose declaration was rejected after they
    // published still has to be able to correct the tour that is already live.
    if (!identityOnFile && !isEditing) {
      onOpenVerification();
      return;
    }

    const newTour: Tour = {
      // An edit keeps the document it started from, so the tour keeps its URL,
      // its reviews and any booking that already points at it. Ownership and
      // the original publish date are equally not the form's to change: the
      // rules check `hostId` against the caller, and a listing that reset its
      // own createdAt on every edit would keep jumping to the top of "newest".
      id: editingTour?.id ?? newId('tour'),
      hostId: editingTour?.hostId ?? activeUser.id,
      hostName: activeUser.name,
      hostAvatar: activeUser.avatar,
      hostPhone: activeUser.phone || '',
      // The host card on a listing shows what this host has actually earned.
      // These were hard-coded to 5.0 stars, 1 review and a verified badge, so
      // every brand-new listing opened with a perfect record and a trust mark
      // nobody had checked.
      hostRating: activeUser.rating ?? 0,
      hostReviewCount: activeUser.reviewCount ?? 0,
      hostVerified: activeUser.verified ?? false,
      hostBio: activeUser.bio || '',
      hostBioVi: activeUser.bioVi || '',
      hostLanguages: activeUser.languages || ['Tiếng Việt', 'English'],
      hostSpecialties: activeUser.specialties || [],
      tourLanguages,
      title: both(title),
      titleVi: both(title),
      tagline: both(tagline),
      taglineVi: both(tagline),
      city,
      category,
      durationHours,
      priceVND,
      priceUSD: Math.round(priceVND / 25000),
      maxGroupSize,
      languages: tourLanguages.map(languageLabel),
      meetingPoint: both(meetingPoint),
      meetingPointVi: both(meetingPoint),
      // Was a three-branch ternary that handed every city except Hanoi and
      // Saigon the coordinates of Da Nang — a Sa Pa tour pinned 700km away.
      lat: coordsForCity(city).lat,
      lng: coordsForCity(city).lng,
      coverImage,
      // Left off the document entirely when blank, rather than stored as ''.
      ...(videoId ? { videoUrl: videoUrl.trim() } : {}),
      galleryImages: [coverImage],
      included: both(included).split(',').map((item) => item.trim()).filter(Boolean),
      includedVi: both(included).split(',').map((item) => item.trim()).filter(Boolean),
      stops: publishableStops,
      description: both(description),
      descriptionVi: both(description),
      featured: editingTour?.featured ?? false,
      createdAt: editingTour?.createdAt ?? new Date().toISOString().split('T')[0],
      status: editingTour?.status ?? 'active',
    };

    if (editingTour && onUpdateTour) onUpdateTour(newTour);
    else onPublishTour(newTour);
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
            {isEditing
              ? language === 'vi' ? 'Sửa bài đăng' : 'Edit your listing'
              : t.hostStudioTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
            {isEditing
              ? language === 'vi'
                ? `Đang sửa: ${editingTour?.titleVi ?? ''}`
                : `Editing: ${editingTour?.title ?? ''}`
              : t.hostStudioSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* 85% is real — TourDetailPage takes a 15% platform fee — but it was
              labelled "Escrow Payout", and there is no escrow account behind
              ViS-Go. The number stays; the claim goes. */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs text-center">
            <span className="text-stone-300 text-[10px] uppercase block">
              {language === 'vi' ? 'Phí nền tảng' : 'Platform fee'}
            </span>
            <span className="text-amber-300 font-extrabold text-sm">
              {language === 'vi' ? '15% — bạn nhận 85%' : '15% — you keep 85%'}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Form on Left, Real-Time Interactive Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Rich Tour Builder Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {language === 'vi' ? 'Tên trải nghiệm' : 'Tour title'} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={language === 'vi' ? 'VD: Hà Nội: Săn Phở Đêm & Ngõ Hẻm Cổ Kính' : 'e.g. Hanoi: Midnight Pho & Ancient Secret Alleys'}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <i className="fa-solid fa-language text-[#A82323]"></i>
                <span>{language === 'vi' ? 'Ngôn ngữ chính trong tour' : 'Languages used on this tour'} *</span>
              </label>
              <p className="text-[10px] text-stone-500">
                {language === 'vi'
                  ? 'Chọn mọi thứ tiếng bạn thật sự dẫn khách được. Khách lọc tour theo đúng mục này.'
                  : 'Pick every language you can genuinely guide in. Travellers filter tours by exactly this.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((option) => {
                  const selected = tourLanguages.includes(option.code);
                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => { sounds.playTap(); toggleTourLanguage(option.code); }}
                      className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selected
                          ? 'border-[#A82323] bg-red-50 text-[#A82323]'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span>{option.flag}</span>
                      <span>{option.short}</span>
                      {selected && <i className="fa-solid fa-check text-[10px]"></i>}
                    </button>
                  );
                })}
              </div>
              {tourLanguages.length === 0 && (
                <p className="text-[11px] text-red-700 font-semibold">
                  {language === 'vi' ? 'Chọn ít nhất một ngôn ngữ.' : 'Pick at least one language.'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {language === 'vi' ? 'Dòng giới thiệu ngắn' : 'Short tagline'}
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder={language === 'vi' ? 'Một câu ngắn làm nổi bật trải nghiệm' : 'One short line that makes the experience stand out'}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* City & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {t.selectCity} *
                </label>
                <ProvinceSelect
                  value={city}
                  onChange={(next) => setCity(next)}
                  language={language}
                  className="w-full pl-9 pr-8 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-[#A82323]"
                />
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
                {language === 'vi' ? 'Điểm hẹn đón khách' : 'Meeting point'} *
              </label>
              <input
                type="text"
                required
                value={meetingPoint}
                onChange={(event) => setMeetingPoint(event.target.value)}
                placeholder={language === 'vi' ? 'VD: Café Giảng, 39 Nguyễn Hữu Huân, Hoàn Kiếm' : 'e.g. Giang Cafe, 39 Nguyen Huu Huan Street, Hoan Kiem'}
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

            {/* Optional YouTube video introducing the place */}
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1" htmlFor="tour-video">
                {language === 'vi' ? 'Video giới thiệu địa phương (YouTube)' : 'Local intro video (YouTube)'}
                <span className="font-normal text-stone-400"> ({language === 'vi' ? 'không bắt buộc' : 'optional'})</span>
              </label>
              <input
                id="tour-video"
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`w-full px-3.5 py-2 bg-stone-50 border rounded-xl text-xs font-mono text-stone-800 focus:bg-white focus:outline-hidden ${
                  videoUrl.trim() && !videoId ? 'border-red-400' : 'border-stone-300'
                }`}
              />
              {videoUrl.trim() && !videoId ? (
                <p className="text-[11px] text-red-700 mt-1">
                  {language === 'vi'
                    ? 'Chưa nhận ra link YouTube. Dán link dạng youtube.com/watch?v=… hoặc youtu.be/…'
                    : 'That is not a YouTube link. Paste a youtube.com/watch?v=… or youtu.be/… address.'}
                </p>
              ) : (
                <p className="text-[11px] text-stone-400 mt-1">
                  {language === 'vi'
                    ? 'Chỉ tải khi khách bấm play — trang không nặng thêm vì có video.'
                    : 'Loaded only when a visitor presses play, so the page costs nothing extra.'}
                </p>
              )}
              {videoId && (
                <YouTubeEmbed
                  videoId={videoId}
                  title={title || (language === 'vi' ? 'Video giới thiệu' : 'Intro video')}
                  className="mt-2"
                />
              )}
            </div>

            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
              <label className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-pen text-amber-600"></i>
                <span>{language === 'vi' ? 'Mô tả tour' : 'Tour description'} *</span>
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={language === 'vi' ? 'Mô tả các điểm đặc sắc, trải nghiệm ẩm thực, phương tiện di chuyển...' : 'Describe what guests will experience, food tastings and transport...'}
                className="w-full px-3 py-2 bg-white border border-amber-300/70 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              ></textarea>

              {/*
                The writing assistant, directly under the box it helps with.

                Deliberately not a modal: a host has to be able to see their own
                sentences while asking for a better version of them. It never
                writes into the form on its own either — `applyDraftPatch` runs
                only when the host presses Apply, because text in this form is
                the host's text, and an AI quietly rewriting it mid-sentence is
                how someone abandons a form.
              */}
              <HostAiAssistant
                language={language}
                draft={listingDraft}
                tourLanguages={tourLanguages}
                onApply={applyDraftPatch}
              />
            </div>

            {/* Itinerary Timeline Stops Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  {t.itineraryBuilderTitle}
                </h4>
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {t.addStop}
                </button>
              </div>
<div className="space-y-2">
                {stops.map((stop, idx) => (
                  <div key={stop.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={stop.time}
                        onChange={(e) => updateStop(idx, { time: e.target.value })}
                        placeholder="09:00"
                        className="w-20 px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                      />
                      <input
                        type="text"
                        value={stop.locationName}
                        onChange={(e) => updateStop(idx, { locationName: e.target.value })}
                        placeholder={language === 'vi' ? 'Địa điểm' : 'Place'}
                        className="flex-1 px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs"
                      />
                      {stops.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(stop.id)}
                          className="text-stone-400 hover:text-red-600 p-1 cursor-pointer shrink-0"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={stop.titleVi}
                        onChange={(event) => updateStop(idx, { titleVi: event.target.value })}
                        placeholder={language === 'vi' ? 'Tên chặng dừng chân' : 'Stop title'}
                        className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                      />
                      <textarea
                        rows={2}
                        value={stop.descriptionVi}
                        onChange={(event) => updateStop(idx, { descriptionVi: event.target.value })}
                        placeholder={language === 'vi' ? 'Khách sẽ làm gì ở chặng này?' : 'What happens at this stop?'}
                        className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs text-stone-800"
                      ></textarea>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inclusions */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {language === 'vi' ? 'Bao gồm những gì' : 'Included items'}
              </label>
              <input
                type="text"
                value={included}
                onChange={(event) => setIncluded(event.target.value)}
                placeholder={language === 'vi' ? 'Ăn uống, Nước uống, Mũ bảo hiểm, Host hướng dẫn...' : 'Food tastings, drinks, helmets, local guide...'}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white"
              />
            </div>

            {/* Publish Action */}
            <div className="pt-3 border-t border-stone-200 space-y-3">
              {!identityOnFile && !isEditing && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <i className="fa-solid fa-id-card text-amber-600"></i>
                    {language === 'vi'
                      ? 'Cần khai danh tính trước khi đăng tour'
                      : 'Your identity details are needed before publishing'}
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    {language === 'vi'
                      ? identity?.status === 'rejected'
                        ? 'Hồ sơ trước đã bị từ chối. Hãy sửa lại rồi gửi lần nữa.'
                        : `Còn thiếu: ${missingIdentity.join(', ')}. Khách du lịch gặp bạn một mình, nên tên, số căn cước, ngày sinh và địa chỉ phải có trước.`
                      : identity?.status === 'rejected'
                        ? 'Your previous declaration was rejected. Correct it and send it again.'
                        : `Still missing: ${missingIdentity.join(', ')}. A traveller meets you alone, so your name, citizen ID, date of birth and address have to be on record first.`}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenVerification}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    {language === 'vi' ? 'Khai danh tính ngay' : 'Fill in my details'}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {isEditing && onCancelEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTap();
                      onCancelEdit();
                    }}
                    className="px-4 py-3.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    {language === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={(!identityOnFile && !isEditing) || tourLanguages.length === 0}
                  className="flex-1 py-3.5 bg-[#A82323] hover:bg-[#8C1818] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <i
                    className={`fa-solid ${
                      isEditing
                        ? 'fa-floppy-disk text-amber-300'
                        : identityOnFile
                          ? 'fa-cloud-arrow-up text-amber-300'
                          : 'fa-lock'
                    }`}
                  ></i>
                  <span>
                    {isEditing ? (language === 'vi' ? 'Lưu thay đổi' : 'Save changes') : t.publishTour}
                  </span>
                </button>
              </div>
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
              {language === 'vi' ? 'ĐỒNG BỘ TRỰC TIẾP' : 'LIVE SYNC'}
            </span>
          </div>

          {/* Rendered Live Tour Card */}
          <div className="bg-white rounded-3xl border-2 border-amber-400 shadow-xl overflow-hidden">
            
            <div className="relative aspect-4/3 w-full overflow-hidden bg-stone-900">
              <img
                src={coverImage}
                alt={title}
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
                <span>5.0 ({language === 'vi' ? 'Mới' : 'New'})</span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {/* Host avatar */}
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={activeUser?.avatar}
                  name={activeUser?.name ?? ''}
                  className="w-8 h-8 rounded-full object-cover border border-amber-400"
                />
                <div>
                  <span className="text-xs font-bold text-stone-800 block">
                    {activeUser?.name || (language === 'vi' ? 'Nguyễn Minh Tuấn (Buddy)' : 'Nguyen Minh Tuan (Buddy)')}
                  </span>
                  {/* Shown only to a host who actually passed verification. It used to
                      be printed for everyone, which is precisely the badge a
                      traveller would rely on. */}
                  {activeUser?.verified ? (
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                      {language === 'vi' ? 'Host đã xác minh' : 'Verified host'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded font-semibold">
                      {language === 'vi' ? 'Chưa xác minh' : 'Not verified'}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-stone-900 text-sm leading-snug">
                {title || (language === 'vi' ? 'Tên trải nghiệm bản địa' : 'Authentic Cultural Experience')}
              </h3>

              <div className="flex flex-wrap gap-1">
                {tourLanguages.map((code) => (
                  <span key={code} className="px-2 py-0.5 bg-stone-100 rounded-full text-[10px] font-bold text-stone-600">
                    {languageOption(code)?.flag ?? '🌐'} {languageLabel(code)}
                  </span>
                ))}
              </div>

              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                {description || (language === 'vi' ? 'Mô tả chi tiết trải nghiệm sẽ xuất hiện ở đây...' : 'Detailed cultural experience description...')}
              </p>

              {/* Stops summary in preview */}
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <span className="font-bold text-stone-800 block text-[10px] uppercase">
                  {stops.length} {language === 'vi' ? 'Chặng lịch trình:' : 'Itinerary Stops:'}
                </span>
                {stops.map((s, i) => (
                  <div key={i} className="truncate">
                    • <strong>{s.time}</strong> - {s.titleVi}
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
                  {language === 'vi' ? 'Chế độ xem trước' : 'Preview Mode'}
                </span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
