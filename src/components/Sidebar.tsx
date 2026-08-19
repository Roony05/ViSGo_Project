import React from 'react';
import { User, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeUser: User | null;
  language: Language;
  currency: 'VND' | 'USD';
  bookingsCount: number;
  onOpenRadar: () => void;
  onOpenChat: () => void;
  onOpenAIChat: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onRoleSwitch: (role: UserRole) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  activeUser,
  language,
  currency,
  bookingsCount,
  onOpenRadar,
  onOpenChat,
  onOpenAIChat,
  onOpenSettings,
  onOpenProfile,
  onOpenAuth,
  onRoleSwitch,
  onLogout,
}) => {
  const isVi = language === 'vi';
  const t = translations[language];

  const handleNavClick = (tab: string) => {
    sounds.playTap();
    onTabChange(tab);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Sleek Compact Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-stone-900 text-stone-200 flex flex-col border-r border-stone-800/80 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header: Logo, Quick Settings Gear & Close */}
        <div className="h-16 px-4 sm:px-5 flex items-center justify-between border-b border-stone-800/80 shrink-0 bg-stone-950/50">
          <div
            onClick={() => handleNavClick('explore')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#991B1B] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-black text-base shadow-sm group-hover:scale-105 transition-transform">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-lg text-white tracking-tight">ViS-Go</span>
                <span className="px-1 py-0.2 bg-[#D4AF37] text-stone-950 text-[8px] font-black rounded uppercase">
                  VN
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Gear Icon for Quick Settings */}
            <button
              onClick={() => {
                sounds.playTap();
                onOpenSettings();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={t.settings}
              aria-label={t.settings}
            >
              <i className="fa-solid fa-gear text-xs"></i>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isVi ? 'Đóng' : 'Close'}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* Compact User Bar */}
        <div className="p-3 border-b border-stone-800/60 bg-stone-950/20">
          {activeUser ? (
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-stone-800/50 border border-stone-700/40">
              <div
                onClick={() => {
                  sounds.playTap();
                  onOpenProfile();
                  onClose();
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full border border-[#D4AF37]/60 overflow-hidden bg-stone-700 shrink-0">
                  <img src={activeUser.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white truncate group-hover:text-amber-300 transition-colors">
                      {activeUser.name}
                    </span>
                    {activeUser.verified && (
                      <i className="fa-solid fa-circle-check text-emerald-400 text-[10px]"></i>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 bg-[#991B1B]/80 text-white rounded">
                      {activeUser.role === 'customer'
                        ? (isVi ? 'Khách' : 'Guest')
                        : activeUser.role === 'host'
                        ? 'Host'
                        : 'Admin'}
                    </span>
                    <span className="text-[10px] text-stone-400 truncate">
                      {activeUser.city || 'Việt Nam'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Profile & Logout Quick Icons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    sounds.playTap();
                    onOpenProfile();
                    onClose();
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={isVi ? 'Hồ sơ tài khoản' : 'Edit profile'}
                >
                  <i className="fa-solid fa-user-pen text-[11px]"></i>
                </button>
                <button
                  onClick={() => {
                    sounds.playTap();
                    onLogout();
                    onClose();
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-red-900/50 text-stone-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                  title={t.logout}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-[11px]"></i>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  sounds.playTap();
                  onOpenAuth('login');
                  onClose();
                }}
                className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
              >
                {t.login}
              </button>
              <button
                onClick={() => {
                  sounds.playTap();
                  onOpenAuth('register');
                  onClose();
                }}
                className="py-2 px-3 bg-[#991B1B] hover:bg-[#7F1D1D] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center shadow-xs"
              >
                {t.signup}
              </button>
            </div>
          )}
        </div>

        {/* Clean, Streamlined Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
          {/* 1. Explore */}
          <button
            onClick={() => handleNavClick('explore')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'explore'
                ? 'bg-[#991B1B] text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <i className="fa-solid fa-compass text-sm text-[#D4AF37]"></i>
              <span>{isVi ? 'Khám phá Tour' : 'Explore Tours'}</span>
            </div>
            <i className="fa-solid fa-angle-right text-[10px] opacity-50"></i>
          </button>

          {/* 2. My Bookings */}
          <button
            onClick={() => handleNavClick('my-bookings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'my-bookings'
                ? 'bg-[#991B1B] text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <i className="fa-solid fa-suitcase-rolling text-sm text-amber-400"></i>
              <span>{t.myBookings}</span>
            </div>
            {bookingsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#D4AF37] text-stone-950 font-black text-[10px] rounded-full">
                {bookingsCount}
              </span>
            )}
          </button>

          {/* 3. Live GPS Radar */}
          <button
            onClick={() => {
              sounds.playTap();
              onOpenRadar();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-stone-300 hover:bg-stone-800/80 hover:text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <i className="fa-solid fa-location-crosshairs text-sm text-red-400"></i>
              <span>{t.liveRadar} (GPS)</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>

          {/* 4. Chat Messages */}
          <button
            onClick={() => {
              sounds.playTap();
              onOpenChat();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-stone-300 hover:bg-stone-800/80 hover:text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <i className="fa-regular fa-comment-dots text-sm text-stone-400"></i>
              <span>{isVi ? 'Tin nhắn' : 'Messages'}</span>
            </div>
          </button>

          {/* Host & Admin Studio Section (Only shown when relevant role) */}
          {(activeUser?.role === 'host' || activeUser?.role === 'admin') && (
            <div className="pt-2 mt-2 border-t border-stone-800/60 space-y-1">
              <button
                onClick={() => handleNavClick('host-studio')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'host-studio'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-motorcycle text-sm text-[#D4AF37]"></i>
                  <span>{t.creatorStudio}</span>
                </div>
                <i className="fa-solid fa-angle-right text-[10px] opacity-50"></i>
              </button>

              {activeUser?.role === 'admin' && (
                <button
                  onClick={() => handleNavClick('admin-hub')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'admin-hub'
                      ? 'bg-stone-800 text-amber-400 shadow-sm'
                      : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <i className="fa-solid fa-shield-halved text-sm text-[#D4AF37]"></i>
                    <span>{t.adminHub}</span>
                  </div>
                  <i className="fa-solid fa-angle-right text-[10px] opacity-50"></i>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Streamlined Footer: Role Switch & Quick Info */}
        <div className="p-3 border-t border-stone-800/80 bg-stone-950/40 space-y-2 shrink-0">
          {/* Compact Role Switcher */}
          {activeUser && (
            <div className="flex items-center gap-1 p-1 bg-stone-800/60 rounded-xl">
              <button
                onClick={() => {
                  sounds.playTap();
                  onRoleSwitch('customer');
                }}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                  activeUser.role === 'customer'
                    ? 'bg-[#991B1B] text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {isVi ? 'Khách' : 'Guest'}
              </button>
              <button
                onClick={() => {
                  sounds.playTap();
                  onRoleSwitch('host');
                }}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                  activeUser.role === 'host'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Host
              </button>
              <button
                onClick={() => {
                  sounds.playTap();
                  onRoleSwitch('admin');
                }}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                  activeUser.role === 'admin'
                    ? 'bg-stone-700 text-amber-300 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Admin
              </button>
            </div>
          )}

          {/* Quick Settings & Currency Info */}
          <div className="flex items-center justify-between text-[10px] text-stone-400 px-1 pt-0.5">
            <span>{isVi ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'} • {currency}</span>
            <button
              onClick={() => {
                sounds.playTap();
                onOpenSettings();
                onClose();
              }}
              className="hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-gear text-[10px]"></i>
              <span>{t.settings}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

