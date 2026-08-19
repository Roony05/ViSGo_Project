import React, { useState } from 'react';
import { User, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface NavbarProps {
  activeUser: User | null;
  language: Language;
  currency: 'VND' | 'USD';
  activeTab: string;
  bookingsCount?: number;
  onLanguageChange: (lang: Language) => void;
  onCurrencyChange: (curr: 'VND' | 'USD') => void;
  onRoleSwitch: (role: UserRole) => void;
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
  onRoleSwitch,
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
        <div className="flex items-center justify-between h-18">
          
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

          {/* 2. Logo ViS-Go (Center/Left Brand Identity) */}
          <div className="flex items-center">
            <button
              onClick={() => {
                sounds.playTap();
                onTabChange('explore');
              }}
              className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#991B1B] flex items-center justify-center text-white shadow-xs border border-[#D4AF37]/50 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <span className="font-black text-xl text-[#D4AF37]">V</span>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-2xl tracking-tight text-[#991B1B]">
                    ViS-Go
                  </span>
                  <span className="px-1.5 py-0.2 bg-amber-100 text-[#991B1B] text-[9px] font-black rounded-md border border-amber-300/60 uppercase tracking-wider">
                    VIỆT NAM
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 font-medium hidden sm:inline leading-none mt-0.5">
                  {isVi ? 'Bạn bản địa & Tour văn hóa' : 'Authentic Vietnam Tour Buddies'}
                </span>
              </div>
            </button>
          </div>

          {/* 3. Avatar User / Đăng nhập (Right) */}
          <div className="flex items-center">
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
                    <img
                      src={activeUser.avatar}
                      alt={activeUser.name}
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
                          <img
                            src={activeUser.avatar}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover border-2 border-[#D4AF37]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-stone-900 truncate">{activeUser.name}</span>
                              {activeUser.verified && (
                                <i className="fa-solid fa-circle-check text-emerald-600 text-xs" title="eKYC Verified"></i>
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

                      {/* My Bookings */}
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

                      {/* Host Creator Studio */}
                      {(activeUser.role === 'host' || activeUser.role === 'admin') && (
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

                      {/* Settings Modal */}
                      {onOpenSettings && (
                        <button
                          onClick={() => {
                            sounds.playTap();
                            setUserMenuOpen(false);
                            onOpenSettings();
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 rounded-xl flex items-center gap-2.5 cursor-pointer font-medium"
                        >
                          <i className="fa-solid fa-sliders text-stone-400 text-sm"></i>
                          <span>{t.settings}</span>
                        </button>
                      )}

                      {/* Quick Switch Role */}
                      <div className="my-1.5 border-t border-stone-100 pt-1.5 px-3">
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                          {isVi ? 'Đổi góc nhìn vai trò:' : 'Switch role view:'}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => {
                              sounds.playTap();
                              onRoleSwitch('customer');
                              setUserMenuOpen(false);
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                              activeUser.role === 'customer'
                                ? 'bg-[#991B1B] text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {isVi ? 'Khách' : 'Traveler'}
                          </button>
                          <button
                            onClick={() => {
                              sounds.playTap();
                              onRoleSwitch('host');
                              setUserMenuOpen(false);
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                              activeUser.role === 'host'
                                ? 'bg-amber-600 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            Host
                          </button>
                          <button
                            onClick={() => {
                              sounds.playTap();
                              onRoleSwitch('admin');
                              setUserMenuOpen(false);
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                              activeUser.role === 'admin'
                                ? 'bg-stone-900 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            Admin
                          </button>
                        </div>
                      </div>

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
              /* NON-LOGGED IN AUTH BUTTONS */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sounds.playTap();
                    onOpenAuth('login');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-right-to-bracket mr-1.5 text-stone-400"></i>
                  <span>{t.login}</span>
                </button>
                <button
                  onClick={() => {
                    sounds.playTap();
                    onOpenAuth('register');
                  }}
                  className="px-4 py-2 bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-user-plus text-[11px]"></i>
                  <span>{t.signup}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
