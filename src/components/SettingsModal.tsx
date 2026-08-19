import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: 'VND' | 'USD';
  onLanguageChange: (lang: Language) => void;
  onCurrencyChange: (curr: 'VND' | 'USD') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  currency,
  onLanguageChange,
  onCurrencyChange,
}) => {
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(true);
  const t = translations[language];

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const isMuted = sounds.toggleMute();
    setSoundEnabled(!isMuted);
    if (!isMuted) {
      sounds.playTap();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#991B1B] to-[#7F1D1D] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-amber-300">
              <i className="fa-solid fa-sliders text-base"></i>
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">{t.settings}</h3>
              <p className="text-xs text-red-100/80">
                {language === 'vi'
                  ? 'Tùy biến trải nghiệm & giao diện ViS-Go'
                  : 'Customize ViS-Go experience & interface'}
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

        {/* Content */}
        <div className="p-6 space-y-6 text-stone-800">
          
          {/* 1. Language Preference */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <i className="fa-solid fa-earth-asia text-[#991B1B]"></i>
              {t.languageSelector}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  onLanguageChange('vi');
                }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  language === 'vi'
                    ? 'border-[#991B1B] bg-red-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                }`}
              >
                <span className="text-2xl">🇻🇳</span>
                <div>
                  <div className="text-sm font-bold text-stone-900">Tiếng Việt</div>
                  <div className="text-[11px] text-stone-500">
                    {language === 'vi' ? 'Mặc định bản địa' : 'Native default'}
                  </div>
                </div>
                {language === 'vi' && (
                  <i className="fa-solid fa-circle-check text-[#991B1B] ml-auto"></i>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  onLanguageChange('en');
                }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  language === 'en'
                    ? 'border-[#991B1B] bg-red-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                }`}
              >
                <span className="text-2xl">🇬🇧</span>
                <div>
                  <div className="text-sm font-bold text-stone-900">English</div>
                  <div className="text-[11px] text-stone-500">
                    {language === 'vi' ? 'Quốc tế' : 'International'}
                  </div>
                </div>
                {language === 'en' && (
                  <i className="fa-solid fa-circle-check text-[#991B1B] ml-auto"></i>
                )}
              </button>
            </div>
          </div>

          {/* 2. Currency Preference */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <i className="fa-solid fa-money-bill-wave text-[#D4AF37]"></i>
              {t.currencySelector}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  onCurrencyChange('VND');
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  currency === 'VND'
                    ? 'border-[#991B1B] bg-red-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-bold text-sm flex items-center justify-center">
                    ₫
                  </span>
                  <div className="text-left">
                    <div className="text-sm font-bold text-stone-900">VNĐ</div>
                    <div className="text-[10px] text-stone-500">
                      {language === 'vi' ? 'Đồng Việt Nam' : 'Vietnamese Dong'}
                    </div>
                  </div>
                </div>
                {currency === 'VND' && <i className="fa-solid fa-circle-check text-[#991B1B]"></i>}
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playTap();
                  onCurrencyChange('USD');
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'border-[#991B1B] bg-red-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-sm flex items-center justify-center">
                    $
                  </span>
                  <div className="text-left">
                    <div className="text-sm font-bold text-stone-900">USD</div>
                    <div className="text-[10px] text-stone-500">
                      {language === 'vi' ? 'Đô la Mỹ (~25k)' : 'US Dollar (~25k)'}
                    </div>
                  </div>
                </div>
                {currency === 'USD' && <i className="fa-solid fa-circle-check text-[#991B1B]"></i>}
              </button>
            </div>
          </div>

          {/* 3. Audio & Haptics Feedback */}
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
                  <i className={`fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">{t.soundEffects}</div>
                  <div className="text-[11px] text-stone-500">
                    {soundEnabled
                      ? (language === 'vi' ? 'Âm thanh thông báo & tương tác haptic' : 'Interactive sound effects & notifications')
                      : (language === 'vi' ? 'Đã tắt tiếng' : 'Muted')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-[#991B1B] text-white shadow-xs'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {soundEnabled ? t.soundOn : t.soundOff}
              </button>
            </div>
          </div>

          {/* 4. Escrow & Security Trust info */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-[#D4AF37]"></i>
              {language === 'vi' ? 'Bảo vệ Ký quỹ ViS-Go Escrow 100%' : '100% ViS-Go Escrow Protection'}
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              {language === 'vi'
                ? 'Mọi giao dịch trên nền tảng được mã hóa an toàn và bảo đảm tiền cọc đến khi hoàn tất chuyến đi.'
                : 'All platform bookings are encrypted and protected in escrow until your tour completes successfully.'}
            </p>
          </div>

        </div>

        {/* Footer Action */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {language === 'vi' ? 'Đóng & Lưu Cài Đặt' : 'Save & Close Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
