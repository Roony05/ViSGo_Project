import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface FooterProps {
  language: Language;
  currency: 'VND' | 'USD';
  onLanguageChange: (lang: Language) => void;
  onCurrencyChange: (curr: 'VND' | 'USD') => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onTabChange: (tab: string) => void;
  onOpenSettings?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  language,
  currency,
  onLanguageChange,
  onCurrencyChange,
  onOpenAuth,
  onTabChange,
  onOpenSettings,
}) => {
  const isVi = language === 'vi';
  const t = translations[language];

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 pt-14 pb-10 text-xs antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-stone-800">
          
          {/* Brand & Mission Column (2 spans) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#991B1B] border border-[#D4AF37]/40 flex items-center justify-center text-white font-serif font-black text-xl shadow-md">
                V
              </div>
              <div>
                <span className="font-serif font-black text-2xl tracking-tight text-white">ViS-Go</span>
                <span className="ml-2 px-1.5 py-0.5 bg-[#D4AF37] text-stone-950 text-[9px] font-black rounded-md uppercase tracking-wider">
                  VIỆT NAM
                </span>
              </div>
            </div>

            <p className="text-stone-400 text-xs leading-relaxed max-w-sm">
              {isVi
                ? 'Nền tảng kết nối du khách với người bạn bản địa chân thực tại Việt Nam. Khám phá ẩm thực ngõ hẻm, văn hóa phố cổ và lịch sử cùng hướng dẫn viên địa phương đã qua xác thực eKYC.'
                : 'Empowering travelers to discover Vietnam alongside verified local buddies. Experience authentic alleyway dining, heritage walks, and hidden cultural wonders with 100% Escrow protection.'}
            </p>

            {/* Escrow & Trust Badge */}
            <div className="inline-flex items-center gap-2.5 p-3 rounded-2xl bg-stone-800/80 border border-stone-700/60 text-stone-300">
              <i className="fa-solid fa-shield-halved text-[#D4AF37] text-base"></i>
              <div>
                <div className="text-[11px] font-bold text-white">ViS-Go Escrow 100% Protection</div>
                <div className="text-[10px] text-stone-400">
                  {isVi ? 'Bảo vệ tiền cọc • Hoàn tiền miễn phí trước 24h' : 'Secure payment holding • Free 24h refund'}
                </div>
              </div>
            </div>

            {/* Emergency Hotline */}
            <div className="flex items-center gap-2 text-stone-400 text-[11px]">
              <i className="fa-solid fa-headset text-amber-400"></i>
              <span>Hotline 24/7:</span>
              <strong className="text-white font-mono">+84 908 123 456</strong>
            </div>
          </div>

          {/* Column 2: Khám phá Điểm đến (Destinations) */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-serif">
              {isVi ? 'Điểm Đến Bản Địa' : 'Popular Destinations'}
            </h4>
            <ul className="space-y-2 text-stone-400 text-xs">
              <li>
                <button
                  onClick={() => onTabChange('explore')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  🇻🇳 Hà Nội • Phố Cổ & Ẩm Thực
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('explore')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  🛵 TP. Hồ Chí Minh • Sài Gòn Đêm
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('explore')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  🌊 Đà Nẵng • Bán Đảo Sơn Trà
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('explore')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  🏮 Hội An • Đèn Lồng & Chùa Cầu
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('explore')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  🌸 Đà Lạt & Cố Đô Huế
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Dành cho Host (For Hosts) */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-serif">
              {isVi ? 'Bạn Bản Địa (Host)' : 'For Local Hosts'}
            </h4>
            <ul className="space-y-2 text-stone-400 text-xs">
              <li>
                <button
                  onClick={() => {
                    sounds.playTap();
                    onOpenAuth('register');
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-left flex items-center gap-1.5"
                >
                  <span>✨ {isVi ? 'Đăng ký làm Host bản địa' : 'Become a Local Host'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('host-studio')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  🎨 {isVi ? 'Host Creator Studio' : 'Host Creator Studio'}
                </button>
              </li>
              <li>
                <span className="text-stone-500">
                  🛡️ {isVi ? 'Quy chuẩn eKYC CCCD/Passport' : 'eKYC ID Verification'}
                </span>
              </li>
              <li>
                <span className="text-stone-500">
                  💳 {isVi ? 'Nhận thanh toán tự động 85%' : 'Automatic 85% Payouts'}
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: An toàn & Hỗ trợ (Trust & Safety) */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-serif">
              {isVi ? 'An Toàn & Điều Khoản' : 'Trust & Safety'}
            </h4>
            <ul className="space-y-2 text-stone-400 text-xs">
              <li>
                <span className="text-stone-400">
                  🛡️ {isVi ? 'Ký quỹ ViS-Go Escrow 100%' : '100% Escrow Protection'}
                </span>
              </li>
              <li>
                <span className="text-stone-400">
                  📍 {isVi ? 'Hỗ trợ định vị GPS thời gian thực' : 'Live GPS Meetup Support'}
                </span>
              </li>
              <li>
                <span className="text-stone-400">
                  🔄 {isVi ? 'Chính sách hoàn tiền trong 24h' : '24-hour Refund Policy'}
                </span>
              </li>
              <li>
                <span className="text-stone-400">
                  📜 {isVi ? 'Điều khoản dịch vụ & Bảo mật' : 'Terms & Privacy Policy'}
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Settings shortcuts */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          
          <div className="flex items-center gap-2">
            <span>© 2026 ViS-Go Vietnam.</span>
            <span>•</span>
            <span>{isVi ? 'Bản quyền trải nghiệm văn hóa bản địa.' : 'All rights reserved.'}</span>
          </div>

          {/* Payment Badges & Language Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 rounded-lg text-[10px] text-stone-300">
              <span className="text-amber-400 font-bold">VietQR</span>
              <span>•</span>
              <span>VNPay</span>
              <span>•</span>
              <span>MoMo</span>
              <span>•</span>
              <span>Visa/Mastercard</span>
            </div>

            {onOpenSettings && (
              <button
                onClick={() => {
                  sounds.playTap();
                  onOpenSettings();
                }}
                className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-gear text-xs text-[#D4AF37]"></i>
                <span>{isVi ? 'Cài đặt (Ngôn ngữ / Tiền tệ)' : 'Settings'}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </footer>
  );
};
