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
      <div className="bg-[#A82323] rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between px-6 sm:px-10 py-5 sm:py-6 shadow-regal border-b-4 border-[#D4AF37] text-white">
        
        {/* Subtle traditional geometric pattern */}
        <div className="absolute right-0 top-0 opacity-10 h-full pointer-events-none">
          <svg width="320" height="130" viewBox="0 0 320 130" fill="white">
            <path d="M0 130L320 0H0V130Z" />
          </svg>
        </div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

        {/* Title and message */}
        <div className="relative z-10 flex-1 pr-4">
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

        {/* Highlights & Dismiss */}
        <div className="relative z-10 flex items-center justify-between md:justify-end gap-6 sm:gap-8 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/20">
          
          <div className="text-center">
            <p className="text-[#D4AF37] text-xl sm:text-2xl font-black">4.95/5</p>
            <p className="text-white/70 text-[10px] uppercase tracking-widest font-semibold">
              {language === 'vi' ? 'An toàn & Uy tín' : 'Average Safety'}
            </p>
          </div>

          <div className="text-center border-l border-white/20 pl-6 sm:pl-8">
            <p className="text-[#D4AF37] text-xl sm:text-2xl font-black">12,400+</p>
            <p className="text-white/70 text-[10px] uppercase tracking-widest font-semibold">
              {language === 'vi' ? 'Host Xác Thực' : 'Verified Hosts'}
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="ml-2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors cursor-pointer shrink-0"
            title={t.dismiss}
            aria-label="Dismiss banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
};
