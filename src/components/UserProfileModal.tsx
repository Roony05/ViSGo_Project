import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  language: Language;
  onSaveProfile: (updatedUser: User) => void;
}

const VIETNAM_CITIES = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hội An',
  'Huế',
  'Đà Lạt',
  'Ninh Bình',
  'Sa Pa',
  'Cần Thơ',
  'Quy Nhơn',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  language,
  onSaveProfile,
}) => {
  const t = translations[language];

  const [name, setName] = useState<string>(user?.name || '');
  const [avatar, setAvatar] = useState<string>(user?.avatar || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [city, setCity] = useState<string>(user?.city || 'Hà Nội');
  const [bioVi, setBioVi] = useState<string>(user?.bioVi || '');
  const [bioEn, setBioEn] = useState<string>(user?.bioEn || '');
  const [languages, setLanguages] = useState<string[]>(
    user?.languages && user.languages.length > 0 ? user.languages : ['Tiếng Việt (Bản địa)', 'English (Fluent)']
  );
  const [newLang, setNewLang] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Sync state if user changes
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatar(user.avatar);
      setPhone(user.phone || '');
      setCity(user.city || 'Hà Nội');
      setBioVi(user.bioVi || '');
      setBioEn(user.bioEn || '');
      if (user.languages && user.languages.length > 0) {
        setLanguages(user.languages);
      }
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleAddLanguage = () => {
    if (newLang.trim() && !languages.includes(newLang.trim())) {
      setLanguages([...languages, newLang.trim()]);
      setNewLang('');
      sounds.playTap();
    }
  };

  const handleRemoveLanguage = (langToRemove: string) => {
    setLanguages(languages.filter((l) => l !== langToRemove));
    sounds.playTap();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...user,
      name: name.trim() || user.name,
      avatar: avatar.trim() || user.avatar,
      phone: phone.trim() || user.phone,
      city,
      bioVi: bioVi.trim(),
      bioEn: bioEn.trim(),
      languages,
    };

    onSaveProfile(updatedUser);
    sounds.playSuccessChime();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  // Avatar presets for easy 1-click update
  const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#991B1B] to-[#7F1D1D] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-amber-300">
              <i className="fa-solid fa-user-gear text-lg"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{t.accountProfile}</h3>
              <p className="text-xs text-red-100/80">
                {language === 'vi' ? 'Xem và chỉnh sửa thông tin tài khoản của bạn' : 'View and update your personal profile details'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Top Profile Summary Badge */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200">
            <div className="relative">
              <img
                src={avatar || user.avatar}
                alt={name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37] shadow-sm"
              />
              {user.verified && (
                <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs" title="100% eKYC Verified">
                  ✓
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-stone-900 text-base truncate">{name || user.name}</h4>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold uppercase rounded-md border border-amber-300">
                  {user.role === 'customer' ? t.customerRole : user.role === 'host' ? t.hostRole : t.adminRole}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
              <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
                <i className="fa-solid fa-location-dot text-red-700 text-[10px]"></i>
                <span>{city}</span>
                <span>•</span>
                <span>ID: #{user.id}</span>
              </p>
            </div>
          </div>

          {/* Avatar URL & Preset Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              {t.avatarUrlLabel}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] text-xs"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-stone-500 font-medium">
                {language === 'vi' ? 'Chọn nhanh ảnh mẫu:' : 'Quick avatar presets:'}
              </span>
              <div className="flex gap-1.5">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatar(preset);
                      sounds.playTap();
                    }}
                    className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                      avatar === preset ? 'border-[#991B1B] scale-110' : 'border-stone-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full Name & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                {language === 'vi' ? 'Họ và tên đầy đủ' : 'Full Name'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                {t.phoneLabel}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84 90..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] text-xs"
              />
            </div>
          </div>

          {/* City Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              {t.cityLabel}
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] text-xs font-medium"
            >
              {VIETNAM_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Languages Spoken */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              {t.languagesProficient}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {languages.map((langItem) => (
                <span
                  key={langItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-full text-xs font-medium"
                >
                  <i className="fa-solid fa-comments text-amber-600 text-[10px]"></i>
                  {langItem}
                  <button
                    type="button"
                    onClick={() => handleRemoveLanguage(langItem)}
                    className="text-stone-400 hover:text-red-600 ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
                placeholder={
                  language === 'vi'
                    ? 'VD: Tiếng Pháp (Giao tiếp), Tiếng Hàn, Tiếng Nhật...'
                    : 'E.g. French (Conversational), Korean, Japanese...'
                }
                className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLanguage();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddLanguage}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 transition-colors cursor-pointer"
              >
                {language === 'vi' ? '+ Thêm' : '+ Add'}
              </button>
            </div>
          </div>

          {/* Short Bio (Vietnamese & English) */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                {t.bioLabelVi}
              </label>
              <textarea
                rows={2}
                value={bioVi}
                onChange={(e) => setBioVi(e.target.value)}
                placeholder={t.bioPlaceholderVi}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                {t.bioLabelEn}
              </label>
              <textarea
                rows={2}
                value={bioEn}
                onChange={(e) => setBioEn(e.target.value)}
                placeholder={t.bioPlaceholderEn}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Save Status Banner */}
          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <i className="fa-solid fa-circle-check text-emerald-600"></i>
              {t.accountUpdatedSuccess}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-check text-xs"></i>
              {language === 'vi' ? 'Lưu Thông Tin Tài Khoản' : 'Save Account Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
