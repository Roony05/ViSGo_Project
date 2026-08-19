import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface HostProfileEditorProps {
  activeUser: User | null;
  language: Language;
  onSaveProfile: (updatedUser: User) => void;
}

// Curated avatar presets representing authentic Vietnamese local guides
const PRESET_AVATARS = [
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    label: 'Tommy (Hanoi Vintage Vespa)'
  },
  {
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    label: 'Mai Linh (Saigon Chinatown)'
  },
  {
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    label: 'Hoang (Da Nang Coastal)'
  },
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    label: 'Lan Huong (Hoi An Lanterns)'
  },
  {
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    label: 'Duc Minh (Hue Citadel Scholar)'
  },
  {
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    label: 'Thu Thao (Dalat Coffee Specialist)'
  }
];

const AVAILABLE_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳', defaultLevel: 'Native' },
  { code: 'en', label: 'English', flag: '🇬🇧', defaultLevel: 'Fluent' },
  { code: 'fr', label: 'Français (French)', flag: '🇫🇷', defaultLevel: 'Conversational' },
  { code: 'zh', label: '中文 (Mandarin / Cantonese)', flag: '🇨🇳', defaultLevel: 'Conversational' },
  { code: 'ja', label: '日本語 (Japanese)', flag: '🇯🇵', defaultLevel: 'Conversational' },
  { code: 'ko', label: '한국어 (Korean)', flag: '🇰🇷', defaultLevel: 'Conversational' },
  { code: 'de', label: 'Deutsch (German)', flag: '🇩🇪', defaultLevel: 'Conversational' },
  { code: 'es', label: 'Español (Spanish)', flag: '🇪🇸', defaultLevel: 'Conversational' },
  { code: 'ru', label: 'Русский (Russian)', flag: '🇷🇺', defaultLevel: 'Conversational' },
  { code: 'it', label: 'Italiano (Italian)', flag: '🇮🇹', defaultLevel: 'Conversational' },
];

const AVAILABLE_SPECIALTIES = [
  { id: 'street-food', labelVi: '🍜 Ẩm thực ngõ hẻm', labelEn: '🍜 Street Foodie' },
  { id: 'vespa', labelVi: '🛵 Xe máy & Vespa cổ', labelEn: '🛵 Vintage Vespa Rider' },
  { id: 'heritage', labelVi: '🏛️ Di sản & Lịch sử', labelEn: '🏛️ History & Heritage' },
  { id: 'coffee', labelVi: '☕ Cà phê trứng & Cà phê vợt', labelEn: '☕ Coffee Specialist' },
  { id: 'photo', labelVi: '📸 Chụp ảnh góc đẹp', labelEn: '📸 Travel Photographer' },
  { id: 'hidden-alleys', labelVi: '🏮 Ngõ cổ bí mật', labelEn: '🏮 Hidden Alleys Explorer' },
  { id: 'crafts', labelVi: '🎨 Làng nghề truyền thống', labelEn: '🎨 Artisan Crafts' },
  { id: 'nightlife', labelVi: '🍸 Sài Gòn/Hà Nội về đêm', labelEn: '🍸 Nightlife & Craft Beer' },
  { id: 'nature', labelVi: '🥾 Dã ngoại & Thiên nhiên', labelEn: '🥾 Nature & Hiking' },
];

export const HostProfileEditor: React.FC<HostProfileEditorProps> = ({
  activeUser,
  language,
  onSaveProfile,
}) => {
  const t = translations[language];

  // State
  const [name, setName] = useState(activeUser?.name || 'Nguyễn Minh Tuấn (Tommy)');
  const [city, setCity] = useState(activeUser?.city || 'Hà Nội');
  const [phone, setPhone] = useState(activeUser?.phone || '+84 912 345 678');
  const [avatar, setAvatar] = useState(
    activeUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  );
  const [taglineVi, setTaglineVi] = useState(
    activeUser?.taglineVi || 'Chàng trai Hà Nội, đam mê xe Vespa cổ & kể chuyện ẩm thực ngõ hẻm.'
  );
  const [taglineEn, setTaglineEn] = useState(
    activeUser?.tagline || 'Hanoi native, vintage Vespa lover & street food storyteller.'
  );
  const [bioVi, setBioVi] = useState(
    activeUser?.bioVi ||
      'Sinh ra và lớn lên giữa lòng 36 phố phường Hà Nội. Với hơn 7 năm kinh nghiệm đồng hành cùng du khách quốc tế trên xe máy cổ, mình mong muốn chia sẻ những quán ăn gia truyền ẩn mình trong ngõ hẹp, quán cà phê trứng bí mật và những câu chuyện lịch sử ngàn năm.'
  );
  const [bioEn, setBioEn] = useState(
    activeUser?.bio ||
      'Born and raised in the heart of Hanoi Old Quarter. With over 7 years of guiding foreign travelers on vintage scooters, I love sharing family-owned street food alleys, secret egg coffee rooftops, and untold wartime architectural stories.'
  );
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    activeUser?.languages || ['Tiếng Việt', 'English', 'Français']
  );
  const [customLanguage, setCustomLanguage] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    activeUser?.specialties || ['street-food', 'vespa', 'coffee', 'hidden-alleys']
  );

  const [isTranslating, setIsTranslating] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<'card' | 'detail'>('card');
  const [previewLang, setPreviewLang] = useState<'vi' | 'en'>(language);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(language === 'vi' ? 'Vui lòng chọn ảnh dung lượng dưới 5MB.' : 'Please choose an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setAvatar(uploadEvent.target.result as string);
          sounds.playNotificationPing();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle Language
  const toggleLanguage = (langLabel: string) => {
    if (selectedLanguages.includes(langLabel)) {
      if (selectedLanguages.length <= 1) {
        alert(language === 'vi' ? 'Bạn phải chọn ít nhất 1 ngôn ngữ giao tiếp.' : 'Please select at least 1 language.');
        return;
      }
      setSelectedLanguages(selectedLanguages.filter((l) => l !== langLabel));
    } else {
      setSelectedLanguages([...selectedLanguages, langLabel]);
    }
  };

  const handleAddCustomLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLanguage.trim() && !selectedLanguages.includes(customLanguage.trim())) {
      setSelectedLanguages([...selectedLanguages, customLanguage.trim()]);
      setCustomLanguage('');
      sounds.playNotificationPing();
    }
  };

  // Toggle Specialty
  const toggleSpecialty = (specId: string) => {
    if (selectedSpecialties.includes(specId)) {
      setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specId));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specId]);
    }
  };

  // AI Smart Translate Biography
  const handleSmartTranslateBio = () => {
    if (!bioVi.trim()) {
      alert(language === 'vi' ? 'Vui lòng nhập tiểu sử tiếng Việt trước.' : 'Please write your Vietnamese biography first.');
      return;
    }

    setIsTranslating(true);
    setTimeout(() => {
      setIsTranslating(false);
      // Generate polished, warm, international bio
      setTaglineEn(
        taglineVi.includes('Sài Gòn') || city.includes('Hồ Chí Minh')
          ? 'Saigon native & passionate cultural storyteller sharing hidden alleyways.'
          : taglineVi.includes('Đà Nẵng')
          ? 'Da Nang ocean lover & local street food insider.'
          : `${city} native & friendly local host sharing authentic cultural journeys.`
      );

      setBioEn(
        `Born and raised in ${city}, Vietnam. With a deep passion for our culinary heritage and warm local hospitality, ` +
        `I have been guiding international travelers through hidden alleyways, family-owned heirloom food stalls, and secret cultural corners. ` +
        `My mission is to ensure you experience Vietnam not as a tourist, but as a cherished friend returning to a second home.`
      );

      sounds.playSuccessChime();
    }, 1200);
  };

  // Save Profile
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedUser: User = {
      ...(activeUser || {
        id: `user_host_${Date.now()}`,
        email: 'host@visgo.vn',
        role: 'host',
      }),
      name,
      city,
      phone,
      avatar,
      tagline: taglineEn,
      taglineVi,
      bio: bioEn,
      bioVi,
      languages: selectedLanguages,
      specialties: selectedSpecialties,
      verified: activeUser?.verified ?? true,
      rating: activeUser?.rating ?? 4.98,
      reviewCount: activeUser?.reviewCount ?? 142,
    };

    setTimeout(() => {
      setIsSaving(false);
      onSaveProfile(updatedUser);
      sounds.playSuccessChime();
    }, 400);
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#A82323] to-[#7E1818] p-6 sm:p-8 text-white relative overflow-hidden border-b-4 border-[#D4AF37]">
        <div className="absolute right-0 top-0 opacity-10 h-full pointer-events-none">
          <svg width="300" height="120" viewBox="0 0 300 120" fill="white">
            <path d="M0 120L300 0H0V120Z" />
          </svg>
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-stone-950 text-[10px] font-black uppercase tracking-wider">
              {language === 'vi' ? 'HỒ SƠ BẠN ĐỒNG HÀNH' : 'HOST TRUST PROFILE'}
            </span>
            <span className="text-white/70 text-xs">• 100% eKYC Verified Badge</span>
          </div>
          <h2 className="serif text-2xl sm:text-3xl font-bold tracking-tight">
            {t.hostProfileTitle}
          </h2>
          <p className="text-white/85 sans text-xs sm:text-sm mt-1.5 leading-relaxed">
            {t.hostProfileSubtitle}
          </p>
        </div>
      </div>

      {/* Main Grid: Form on Left (7 cols), Live Trust Card Preview on Right (5 cols) */}
      <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          
          {/* 1. Profile Picture Customization */}
          <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-camera text-[#A82323]"></i>
                {t.avatarUploadTitle}
              </label>
              <span className="text-[11px] text-stone-500">{t.avatarUploadHint}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              
              {/* Avatar Preview with Gold Ring & Verified Shield */}
              <div className="relative shrink-0 group">
                <div className="w-24 h-24 rounded-full bg-[#D4AF37]/20 border-4 border-[#D4AF37] shadow-md overflow-hidden flex items-center justify-center">
                  <img src={avatar} alt={name} className="w-full h-full object-cover" />
                </div>
                <span className="absolute bottom-0 right-0 w-7 h-7 bg-[#A82323] text-white rounded-full border-2 border-white flex items-center justify-center text-xs shadow-xs" title="Verified Host">
                  <i className="fa-solid fa-shield-check"></i>
                </span>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 w-full space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  <label className="px-4 py-2 bg-[#A82323] hover:bg-[#8C1818] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5">
                    <i className="fa-solid fa-arrow-up-from-bracket text-xs"></i>
                    <span>{t.uploadPhotoBtn}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPresetPicker(!showPresetPicker)}
                    className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <i className="fa-solid fa-images text-[#D4AF37] mr-1"></i>
                    {t.choosePresetAvatar}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-700 focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
                  />
                </div>
              </div>

            </div>

            {/* Curated Presets Grid */}
            {showPresetPicker && (
              <div className="pt-3 border-t border-stone-200">
                <p className="text-[11px] font-bold text-stone-500 mb-2">{language === 'vi' ? 'Chọn nhanh ảnh đại diện mẫu:' : 'Select a preset avatar:'}</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatar(preset.url);
                        sounds.playNotificationPing();
                      }}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                        avatar === preset.url ? 'border-[#A82323] ring-2 ring-[#A82323]/30 scale-105' : 'border-transparent hover:border-stone-300'
                      }`}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      {avatar === preset.url && (
                        <div className="absolute inset-0 bg-[#A82323]/40 flex items-center justify-center text-white text-xs font-bold">
                          <i className="fa-solid fa-check"></i>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* 2. Basic Info & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.fullNameLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.cityLabel} <span className="text-red-500">*</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#A82323] cursor-pointer"
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

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.phoneLabel}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>

          </div>

          {/* 3. Welcome Tagline (Bilingual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.taglineLabelVi}
              </label>
              <input
                type="text"
                value={taglineVi}
                onChange={(e) => setTaglineVi(e.target.value)}
                placeholder="Chàng trai Hà Nội, đam mê xe Vespa cổ & kể chuyện ẩm thực..."
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t.taglineLabelEn}
              </label>
              <input
                type="text"
                value={taglineEn}
                onChange={(e) => setTaglineEn(e.target.value)}
                placeholder="Hanoi native, vintage Vespa lover & street food storyteller..."
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>
          </div>

          {/* 4. Languages Spoken (Crucial Requirement) */}
          <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-language text-[#D4AF37]"></i>
                  {t.languagesProficient} <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {language === 'vi'
                    ? 'Chọn các thứ tiếng bạn tự tin giao tiếp cùng du khách nước ngoài'
                    : 'Select all languages you are comfortable guiding travelers in'}
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#A82323] bg-white px-2 py-0.5 rounded-md border border-stone-200">
                {selectedLanguages.length} selected
              </span>
            </div>

            {/* Language Chips Multi-select */}
            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_LANGUAGES.map((langItem) => {
                const isSelected = selectedLanguages.some(
                  (l) => l.includes(langItem.code) || l.includes(langItem.label.split(' ')[0]) || l === langItem.label
                );

                return (
                  <button
                    key={langItem.code}
                    type="button"
                    onClick={() => {
                      toggleLanguage(langItem.label.split(' ')[0]);
                      sounds.playNotificationPing();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#A82323] text-white border-[#A82323] shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                    }`}
                  >
                    <span>{langItem.flag}</span>
                    <span>{langItem.label.split(' ')[0]}</span>
                    {isSelected && <i className="fa-solid fa-check text-[10px] ml-1"></i>}
                  </button>
                );
              })}
            </div>

            {/* Custom Language Input */}
            <div className="pt-2 flex gap-2">
              <input
                type="text"
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                placeholder={language === 'vi' ? 'Thêm ngôn ngữ khác (vd: Tiếng Ý, Tiếng Thái...)' : 'Add custom language (e.g. Italian, Thai...)'}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl text-stone-800"
              />
              <button
                type="button"
                onClick={handleAddCustomLanguage}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.addLanguage}
              </button>
            </div>
          </div>

          {/* 5. Bilingual Short Biography (Vietnamese & English with AI Smart Translate) */}
          <div className="space-y-4">
            
            {/* Vietnamese Bio */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span>🇻🇳</span>
                  <span>{t.bioLabelVi}</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-stone-400 font-mono">{bioVi.length} chars</span>
              </div>
              <textarea
                rows={4}
                required
                value={bioVi}
                onChange={(e) => setBioVi(e.target.value)}
                placeholder={t.bioPlaceholderVi}
                className="w-full p-3 bg-[#FAF8F5] border border-stone-300 rounded-2xl text-xs text-stone-900 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>

            {/* AI Smart Translate Action Bar */}
            <div className="flex items-center justify-between bg-amber-50/80 p-3 rounded-xl border border-amber-200/80">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-[#D4AF37] text-sm"></i>
                <span className="text-xs font-bold text-stone-800">
                  {language === 'vi' ? 'Trợ lý AI Biên dịch Quốc tế' : 'Smart AI English Translator'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSmartTranslateBio}
                disabled={isTranslating}
                className="px-3.5 py-1.5 bg-[#D4AF37] hover:bg-[#c49f2e] text-stone-950 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTranslating ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>{t.translatingBio}</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-language"></i>
                    <span>{t.bioSmartTranslate}</span>
                  </>
                )}
              </button>
            </div>

            {/* English Bio */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span>🇬🇧</span>
                  <span>{t.bioLabelEn}</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-stone-400 font-mono">{bioEn.length} chars</span>
              </div>
              <textarea
                rows={4}
                required
                value={bioEn}
                onChange={(e) => setBioEn(e.target.value)}
                placeholder={t.bioPlaceholderEn}
                className="w-full p-3 bg-[#FAF8F5] border border-stone-300 rounded-2xl text-xs text-stone-900 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
            </div>

          </div>

          {/* 6. Specialties & Passions */}
          <div>
            <label className="block text-xs font-bold text-stone-900 mb-2 uppercase tracking-wider">
              {t.specialtiesLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SPECIALTIES.map((spec) => {
                const isSelected = selectedSpecialties.includes(spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => {
                      toggleSpecialty(spec.id);
                      sounds.playNotificationPing();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-100/80 text-amber-950 border-[#D4AF37] font-bold shadow-xs'
                        : 'bg-[#FAF8F5] text-stone-700 border-stone-300 hover:border-stone-400'
                    }`}
                  >
                    {language === 'vi' ? spec.labelVi : spec.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-stone-200">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 bg-[#A82323] hover:bg-[#8C1818] text-white rounded-2xl text-sm font-bold uppercase tracking-wider shadow-regal transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSaving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>
                  <span>{t.saveProfileBtn}</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* Right Column: Live Trust Card Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-24 space-y-4">
            
            {/* Preview Mode Selector */}
            <div className="flex items-center justify-between bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewTab('card')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    previewTab === 'card' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {language === 'vi' ? 'Thẻ Tour Marketplace' : 'Tour Card View'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('detail')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    previewTab === 'detail' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {language === 'vi' ? 'Chi tiết Tour (Meet Buddy)' : 'Detail Page View'}
                </button>
              </div>

              <div className="flex gap-1 pr-1">
                <button
                  type="button"
                  onClick={() => setPreviewLang('vi')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${previewLang === 'vi' ? 'bg-[#A82323] text-white' : 'text-stone-500'}`}
                >
                  VI
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLang('en')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${previewLang === 'en' ? 'bg-[#A82323] text-white' : 'text-stone-500'}`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* 1. Preview Option A: Marketplace Tour Card */}
            {previewTab === 'card' && (
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-regal overflow-hidden">
                <div className="h-44 bg-stone-200 relative overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80"
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-lg text-xs font-bold text-[#A82323] shadow-xs">
                    650,000₫ <span className="text-[10px] text-stone-500 font-normal">/ person</span>
                  </div>

                  {/* Floating Host Pill Bottom Left */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full border-2 border-[#D4AF37] overflow-hidden shadow-md shrink-0 bg-[#D4AF37]/20">
                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>{name}</span>
                      <span className="text-[#D4AF37]">★ Verified</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="serif text-base font-bold text-stone-900 leading-snug">
                      {previewLang === 'vi' ? 'Hà Nội Ngõ Hẻm Bí Mật & Cà Phê Trứng Safari' : 'Hanoi Secret Alleys & Egg Coffee Safari'}
                    </h4>
                    <div className="flex items-center gap-1 text-xs font-bold shrink-0">
                      <span className="text-[#D4AF37]">★</span>
                      <span>4.98</span>
                      <span className="text-stone-400 text-[10px]">(142)</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-500 italic line-clamp-2">
                    "{previewLang === 'vi' ? taglineVi : taglineEn}"
                  </p>

                  {/* Host Languages Bar on Card */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-stone-600 font-medium">
                      <span className="text-stone-400">🗣️ Speaks:</span>
                      <span className="font-bold text-stone-800">{selectedLanguages.join(', ')}</span>
                    </div>
                    <span className="px-3 py-1.5 bg-[#D4AF37] text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider">
                      Book Now
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Preview Option B: Dedicated Host Profile Card on Detail Page */}
            {previewTab === 'detail' && (
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-regal p-5 space-y-4">
                
                {/* Host Hero */}
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] overflow-hidden shadow-md bg-[#D4AF37]/20">
                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#A82323] text-white rounded-full border-2 border-white flex items-center justify-center text-[9px]">
                      <i className="fa-solid fa-check"></i>
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="serif font-bold text-base text-stone-900 truncate">{name}</h4>
                      <span className="px-2 py-0.5 bg-[#D4AF37]/20 text-[#8C6D1F] border border-[#D4AF37]/40 text-[9px] font-black uppercase rounded-full">
                        Verified Buddy
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                      <i className="fa-solid fa-location-dot text-[#A82323] text-[11px]"></i>
                      <span>{city}, Vietnam</span>
                      <span>•</span>
                      <span>★ 4.98 (142 reviews)</span>
                    </p>

                    <p className="text-xs font-semibold text-[#A82323] mt-1 italic">
                      "{previewLang === 'vi' ? taglineVi : taglineEn}"
                    </p>
                  </div>
                </div>

                {/* Spoken Languages */}
                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">
                    {previewLang === 'vi' ? 'Ngôn ngữ thành thạo' : 'Languages Spoken Fluently'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLanguages.map((l, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white border border-stone-200 text-stone-800 text-xs font-semibold rounded-lg shadow-2xs">
                        🗣️ {l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Host Biography */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    {previewLang === 'vi' ? 'Tiểu sử người bạn bản địa' : 'About Your Local Buddy'}
                  </span>
                  <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                    {previewLang === 'vi' ? bioVi : bioEn}
                  </p>
                </div>

                {/* Verified Trust Guarantees */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <i className="fa-solid fa-shield-halved"></i>
                    100% eKYC ID & Criminal Record Checked
                  </span>
                  <span className="font-bold text-[#A82323]">78 Trips</span>
                </div>

              </div>
            )}

            {/* Live Synchronisation Note */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2">
              <i className="fa-solid fa-circle-info text-[#D4AF37] text-sm mt-0.5 shrink-0"></i>
              <div>
                <strong>{language === 'vi' ? 'Đồng bộ tự động:' : 'Auto Tour Sync:'}</strong>{' '}
                {language === 'vi'
                  ? 'Khi bạn lưu hồ sơ, ảnh đại diện, tiểu sử song ngữ và ngôn ngữ sẽ được cập nhật ngay lập tức trên tất cả các tour bạn đăng tải.'
                  : 'Saving your profile automatically updates your photo, bilingual bio, and languages across all your published tours on the marketplace.'}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
