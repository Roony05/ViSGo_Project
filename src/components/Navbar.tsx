import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { LacBird } from './brand/LacBird';
import { Avatar } from './Avatar';

interface NavbarProps {
  activeUser: User | null;
  language: Language;
  currency: 'VND' | 'USD';
  activeTab: string;
  bookingsCount?: number;
  onLanguageChange: (lang: Language) => void;
  onCurrencyChange: (curr: 'VND' | 'USD') => void;
  onTabChange: (tab: string) => void;
  onOpenAuth: (defaultTab?: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenChat: () => void;
  onOpenRadar: () => void;
  onOpenAIChat?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  language,
  currency,
  activeTab,
  bookingsCount = 0,
  onLanguageChange,
  onCurrencyChange,
  onTabChange,
  onOpenAuth,
  onLogout,
  onOpenChat,
  onOpenRadar,
  onOpenAIChat,
  onOpenSettings,
  onOpenProfile,
  onToggleSidebar,
}) => {
  const t = translations[language];
  const isVi = language === 'vi';
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Exactly 3 Core Zones: [1] Hamburger Button — [2] ViS-Go Logo — [3] User Avatar / Auth */}
        {/* Centred brand from 400px up. Below that the symmetric grid forces the
            two side columns to match, and the wasted space pushes the header
            301px wide into a 288px content box — the whole document then gets a
            horizontal scrollbar. Narrow phones get a plain left-aligned row. */}
        <div className="flex h-18 items-center justify-between gap-2 min-[400px]:grid min-[400px]:grid-cols-[1fr_auto_1fr]">
          
          {/* 1. Nút 3 gạch (Hamburger Menu Button - Refined & Modern) */}
          <div className="flex items-center">
            <button
              onClick={() => {
                sounds.playTap();
                if (onToggleSidebar) onToggleSidebar();
              }}
              className="w-11 h-11 rounded-2xl bg-stone-100/90 hover:bg-stone-200 text-stone-800 flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer shadow-xs border border-stone-200/80 active:scale-95 group"
              title={isVi ? 'Mở menu điều hướng' : 'Open Navigation Menu'}
              aria-label="Navigation Menu"
            >
              <span className="w-5 h-0.5 bg-stone-800 rounded-full transition-transform group-hover:w-5.5"></span>
              <span className="w-5 h-0.5 bg-stone-800 rounded-full transition-transform group-hover:w-4"></span>
              <span className="w-5 h-0.5 bg-stone-800 rounded-full transition-transform group-hover:w-5.5"></span>
            </button>
          </div>

          {/* 2. Brand mark.
              Previously this stacked a "V" tile, the wordmark, a "VIỆT NAM"
              badge and a tagline — four pieces of branding competing in a
              48px-tall bar. The chim Lạc plus the wordmark carries the same
              identity in two. */}
          <div className="flex items-center">
            <button
              onClick={() => {
                sounds.playTap();
                onTabChange('explore');
              }}
              className="flex items-center gap-2.5 group cursor-pointer min-w-0"
              aria-label="ViS-Go"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#A82323] shadow-sm transition-transform duration-200 group-hover:scale-105">
                {/* Sized by width, not height: the mark is 2.1:1, so h-5 made it 42px
                    wide inside a 40px chip — it overflowed the badge and pushed the
                    header past a 320px viewport. */}
                <LacBird className="w-6 h-auto" color="#E8C25A" />
              </span>
              {/* Wordmark drops below 360px. The three header clusters need
                  301px of content there and only 288px exists; the badge alone
                  still carries the brand, a horizontal scrollbar does not. */}
              <span className="hidden min-[360px]:inline truncate text-xl font-black tracking-tight text-[#A82323] min-[420px]:text-2xl">
                ViS-Go
              </span>
            </button>
          </div>

          {/* 3. Avatar User / Đăng nhập (Right) */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">

            {/*
              Persistent global language switcher.
              onLanguageChange was passed into this component but never wired to
              anything, leaving the only language control buried in the Settings
              modal. It belongs in the header.

              Hidden below 400px: the header is a three-column grid and at 320px
              the right cluster needs 374px, which pushes the whole document
              into a horizontal scroll. The sidebar and Settings both carry the
              same control, so nothing is lost on the narrowest phones.
            */}
            <div
              className="hidden min-[400px]:flex items-center rounded-full border border-stone-200 bg-stone-50 p-0.5 shrink-0"
              role="group"
              aria-label={isVi ? 'Chọn ngôn ngữ' : 'Select language'}
            >
              <button
                onClick={() => {
                  if (language === 'vi') return;
                  sounds.playTap();
                  onLanguageChange('vi');
                }}
                aria-pressed={language === 'vi'}
                title="Tiếng Việt"
                /* py-1 made these 25px tall. `min-h-8` brings the pair up to a
                   hittable size without changing the pill's proportions. */
                className={`px-2.5 sm:px-3 py-1.5 min-h-8 rounded-full text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  language === 'vi'
                    ? 'bg-[#A82323] text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span>VI</span>
              </button>
              <button
                onClick={() => {
                  if (language === 'en') return;
                  sounds.playTap();
                  onLanguageChange('en');
                }}
                aria-pressed={language === 'en'}
                title="English"
                /* py-1 made these 25px tall. `min-h-8` brings the pair up to a
                   hittable size without changing the pill's proportions. */
                className={`px-2.5 sm:px-3 py-1.5 min-h-8 rounded-full text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  language === 'en'
                    ? 'bg-[#A82323] text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span>EN</span>
              </button>
            </div>

            {activeUser ? (
              <div className="relative">
                <button
                  onClick={() => {
                    sounds.playTap();
                    setUserMenuOpen(!userMenuOpen);
                  }}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-stone-100 transition-colors cursor-pointer border border-transparent hover:border-stone-200"
                  title={isVi ? 'Tài khoản của tôi' : 'My Account'}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] overflow-hidden bg-stone-100 shadow-xs shrink-0">
                    <Avatar
                      src={activeUser.avatar}
                      name={activeUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <i className="fa-solid fa-chevron-down text-[10px] text-stone-400 hidden sm:block pr-1"></i>
                </button>

                {/* Account Dropdown Menu (Synchronized Vietnamese/English translations) */}
                {userMenuOpen && (
                  <>
                    {/* Backdrop to close on click outside */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />

                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-xl border border-stone-200 p-2.5 z-50 animate-in fade-in slide-in-from-top-1">
                      
                      {/* User Summary Header */}
                      <div className="p-3 bg-stone-50 rounded-2xl mb-2 border border-stone-200/80">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={activeUser.avatar}
                            name={activeUser.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-[#D4AF37]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-stone-900 truncate">{activeUser.name}</span>
                              {activeUser.verified && (
                                <i className="fa-solid fa-circle-check text-emerald-600 text-xs" title="Verified"></i>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 truncate">{activeUser.email}</p>
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[9px] font-black uppercase px-2 py-0.2 bg-[#991B1B] text-white rounded-md">
                                {activeUser.role === 'customer'
                                  ? (isVi ? 'KHÁCH DU LỊCH' : 'TRAVELER')
                                  : activeUser.role === 'host'
                                  ? (isVi ? 'HOST BẢN ĐỊA' : 'LOCAL HOST')
                                  : 'ADMIN'}
                              </span>
                              <span className="text-[10px] text-stone-400">• {activeUser.city || 'Việt Nam'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* View and Edit Account Profile */}
                      <button
                        onClick={() => {
                          sounds.playTap();
                          setUserMenuOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className="w-full text-left px-3 py-2.5 text-xs text-stone-800 hover:bg-red-50 hover:text-[#991B1B] rounded-xl flex items-center justify-between font-bold cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <i className="fa-solid fa-user-pen text-[#991B1B] text-sm"></i>
                          <span>{isVi ? 'Thông tin tài khoản & Cập nhật' : 'Account Profile & Edit'}</span>
                        </span>
                        <i className="fa-solid fa-angle-right text-stone-300 text-xs"></i>
                      </button>

                      {/* My Bookings — travellers only. A host's incoming trips
                          live in the dashboard, and an admin books nothing. */}
                      {activeUser.role === 'customer' && (
                      <button
                        onClick={() => {
                          sounds.playTap();
                          onTabChange('my-bookings');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 rounded-xl flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <i className="fa-solid fa-suitcase-rolling text-stone-400 text-sm"></i>
                        <span>{t.myBookings}</span>
                        {bookingsCount > 0 && (
                          <span className="ml-auto px-2 py-0.2 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full">
                            {bookingsCount}
                          </span>
                        )}
                      </button>
                      )}

                      {/* Host Creator Studio. Admins used to be sent here too,
                          which made no sense: an admin has no listings, and the
                          studio publishes under whoever is signed in. */}
                      {activeUser.role === 'host' && (
                        <button
                          onClick={() => {
                            sounds.playTap();
                            onTabChange('host-studio');
                            setUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 rounded-xl flex items-center gap-2.5 cursor-pointer font-medium"
                        >
                          <i className="fa-solid fa-motorcycle text-[#D4AF37] text-sm"></i>
                          <span>{t.creatorStudio}</span>
                        </button>
                      )}

                      {/* Admin Hub */}
                      {activeUser.role === 'admin' && (
                        <button
                          onClick={() => {
                            sounds.playTap();
                            onTabChange('admin-hub');
                            setUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 rounded-xl flex items-center gap-2.5 cursor-pointer font-medium"
                        >
                          <i className="fa-solid fa-shield-halved text-[#D4AF37] text-sm"></i>
                          <span>{isVi ? 'Trung tâm quản trị' : 'Admin Hub'}</span>
                        </button>
                      )}

                      {/* Settings Modal */}
                      {/* Settings lives in the sidebar only — see Sidebar.tsx. */}


                      {/* Logout Button */}
                      <div className="border-t border-stone-100 pt-1 mt-1">
                        <button
                          onClick={() => {
                            sounds.playTap();
                            onLogout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2.5 font-bold cursor-pointer"
                        >
                          <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                          <span>{t.logout}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /*
                NOT SIGNED IN.

                A phone header already carries the hamburger, the brand and the
                language switcher. Adding a "Đăng nhập" *and* a "Đăng ký" button
                to that put five controls in a 390px bar — the previous fix was
                to collapse "Đăng nhập" down to a bare arrow icon, which is not
                a word anyone reads, next to a solid red "Đăng ký" that made
                signing up look like the only way in.

                So below `sm` there is one button. It says what it does, and the
                auth modal it opens has the "Đăng ký" toggle inside it, so the
                second route is one tap away rather than gone.
              */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sounds.playTap();
                    onOpenAuth('login');
                  }}
                  title={t.login}
                  aria-label={t.login}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#991B1B] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#7F1D1D] sm:bg-transparent sm:px-3.5 sm:text-stone-700 sm:shadow-none sm:hover:bg-stone-100 sm:hover:text-stone-900"
                >
                  <i className="fa-solid fa-arrow-right-to-bracket text-[11px] text-white/80 sm:text-stone-400"></i>
                  <span className="whitespace-nowrap">{t.login}</span>
                </button>

                {/* The second button is desktop-only; on a phone its job is
                    done by the toggle inside the modal. */}
                <button
                  onClick={() => {
                    sounds.playTap();
                    onOpenAuth('register');
                  }}
                  className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#991B1B] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#7F1D1D] sm:flex"
                >
                  <i className="fa-solid fa-user-plus text-[11px]"></i>
                  <span className="whitespace-nowrap">{t.signup}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
