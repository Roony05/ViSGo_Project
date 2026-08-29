import React from 'react';
import { Language } from '../types';
import { sounds } from '../utils/audio';
import { LacBird } from './brand/LacBird';

interface FooterProps {
  language: Language;
  currency: 'VND' | 'USD';
  onLanguageChange: (lang: Language) => void;
  onCurrencyChange: (curr: 'VND' | 'USD') => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onTabChange: (tab: string) => void;
  onOpenSettings?: () => void;
}

/** One row of the two link columns. Everything here goes somewhere. */
interface FooterLink {
  icon: string;
  label: string;
  onClick: () => void;
}

/**
 * Site footer.
 *
 * Rebuilt from a five-column version that was mostly decoration. What went and
 * why, because the same things grow back otherwise:
 *
 *   - A "Điểm đến bản địa" column of five destinations. All five called
 *     `onTabChange('explore')` — five different labels for one destination is
 *     not navigation, it is a list pretending to be one.
 *   - Six `<span>` rows styled exactly like the links beside them (verification, 85%
 *     payouts, escrow, GPS, refunds, terms). Nothing clickable, so every one
 *     of them was a dead end that looked live.
 *   - "ViS-Go Escrow 100%" printed twice, once as a badge and once as a list
 *     row three columns away.
 *   - A 24/7 hotline number that reaches nobody.
 *   - "VietQR • VNPay • MoMo • Visa/Mastercard", none of which is wired to a
 *     payment processor.
 *   - A "V" tile *and* the wordmark *and* a "VIỆT NAM" badge — the same three
 *     pieces of stacked branding the header was already trimmed down from.
 *
 * What is left is the mission, the signature, and links that navigate.
 */
export const Footer: React.FC<FooterProps> = ({
  language,
  onOpenAuth,
  onTabChange,
  onOpenSettings,
}) => {
  const isVi = language === 'vi';

  const go = (tab: string) => () => {
    sounds.playTap();
    onTabChange(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const explore: FooterLink[] = [
    { icon: 'fa-compass', label: isVi ? 'Khám phá tour' : 'Explore tours', onClick: go('explore') },
    { icon: 'fa-vr-cardboard', label: isVi ? 'Di sản 360°' : '360° heritage', onClick: go('vr-heritage') },
    {
      icon: 'fa-wand-magic-sparkles',
      label: isVi ? 'Trợ lý ViS-AI' : 'ViS-AI assistant',
      onClick: go('ai-assistant'),
    },
    {
      icon: 'fa-suitcase-rolling',
      label: isVi ? 'Chuyến đi của tôi' : 'My trips',
      onClick: go('my-bookings'),
    },
  ];

  const forHosts: FooterLink[] = [
    {
      icon: 'fa-star',
      label: isVi ? 'Đăng ký làm Host' : 'Become a host',
      onClick: () => {
        sounds.playTap();
        onOpenAuth('register');
      },
    },
    {
      icon: 'fa-palette',
      label: isVi ? 'Host Creator Studio' : 'Host Creator Studio',
      onClick: go('host-studio'),
    },
  ];

  const column = (title: string, links: FooterLink[]) => (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">{title}</h4>
      <ul className="mt-2">
        {links.map((l) => (
          <li key={l.label}>
            <button
              onClick={l.onClick}
              /* min-h-9: at `py-1` these were 24px tall — under every mobile
                 minimum, and the smallest targets on the page. */
              className="flex min-h-9 w-full cursor-pointer items-center gap-2.5 py-1.5 text-xs text-stone-400 transition-colors hover:text-white"
            >
              <i className={`fa-solid ${l.icon} w-3.5 text-center text-[11px] text-stone-600`}></i>
              <span>{l.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="border-t border-stone-800 bg-stone-900 text-stone-300 antialiased">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))] lg:gap-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#991B1B]">
                <LacBird className="h-auto w-5" color="#E8C25A" />
              </span>
              <span className="text-xl font-black tracking-tight text-white">ViS-Go</span>
            </div>

            <p className="mt-4 max-w-sm text-xs leading-relaxed text-stone-400">
              {isVi
                ? 'Kết nối du khách với người bạn bản địa đã qua xác minh. Ẩm thực ngõ hẻm, phố cổ và di sản — đi cùng người sống ở đó.'
                : 'Travellers, matched with verified local hosts. Alleyway food, old quarters and heritage — seen with someone who lives there.'}
            </p>
          </div>

          {column(isVi ? 'Khám phá' : 'Explore', explore)}
          {column(isVi ? 'Bạn bản địa' : 'For hosts', forHosts)}
        </div>

        {/* Bottom bar */}
        {/* `sm:pr-24` keeps this row clear of the floating ViS-AI bubble, which
            is `fixed bottom-6 right-6` and therefore sits on top of whatever
            the page puts in its bottom-right corner — here, the settings
            button. */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-stone-800 pt-6 text-[11px] text-stone-500 sm:flex-row sm:pr-24">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>© 2026 ViS-Go Vietnam</span>
            <span aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-[#D4AF37]"></i>
              {isVi ? 'Đặt chỗ miễn phí • Trả trực tiếp cho host' : 'Free to book • pay your host directly'}
            </span>
          </div>

          {onOpenSettings && (
            <button
              onClick={() => {
                sounds.playTap();
                onOpenSettings();
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-1.5 font-bold text-stone-300 transition-colors hover:bg-stone-700 hover:text-white"
            >
              <i className="fa-solid fa-gear text-[#D4AF37]"></i>
              <span>{isVi ? 'Ngôn ngữ / Tiền tệ' : 'Language / Currency'}</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
