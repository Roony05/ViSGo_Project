import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface BrandStoryBannerProps {
  language: Language;
  onDismiss: () => void;
}

export const BrandStoryBanner: React.FC<BrandStoryBannerProps> = ({ language, onDismiss }) => {
  const t = translations[language];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-1 shrink-0">
      <div className="bg-[#A82323] rounded-2xl relative overflow-hidden px-4 sm:px-10 py-5 sm:py-6 shadow-regal border-b-4 border-[#D4AF37] text-white">
        
        {/* Subtle traditional geometric pattern */}
        <div className="absolute right-0 top-0 opacity-10 h-full pointer-events-none">
          <svg width="320" height="130" viewBox="0 0 320 130" fill="white">
            <path d="M0 130L320 0H0V130Z" />
          </svg>
        </div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

        {/* Title and message */}
        <div className="relative z-10 pr-12">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">
              {language === 'vi' ? 'SỨ MỆNH KẾT NỐI VĂN HÓA' : 'VIETNAM LOCAL BUDDY PLATFORM'}
            </span>
          </div>
          <h2 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight">
            {language === 'vi' ? 'Việt Nam: Linh Hồn Rực Rỡ' : 'Vietnam: Vibrant Soul'}
          </h2>
          <p className="text-white/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed font-medium">
            {language === 'vi'
              ? 'Kết nối bạn với người bản địa tận tâm – Trải nghiệm chân thực như một mái ấm thứ hai.'
              : 'Connecting you with authentic local buddies for a second home experience.'}
          </p>
        </div>

        {/*
          Dismiss only.

          This cluster used to carry "4.95/5 An toàn & Uy tín" and "12,400+ Host
          xác thực" in gold display type. Both were hard-coded: the catalogue
          holds a handful of verified hosts, and the rating shown on a tour card
          is derived from the reviews that actually exist. Printing figures the
          database cannot support undercuts every real number elsewhere on the
          page, so they are gone rather than recalculated — the banner's job is
          the invitation, and the proof belongs on the cards.
        */}
        <button
            onClick={onDismiss}
            className="absolute right-3 top-3 z-10 cursor-pointer rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            title={t.dismiss}
            aria-label="Dismiss banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

      </div>
    </div>
  );
};
