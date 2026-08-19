import React, { useState } from 'react';
import { Booking, Language, User } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { HostProfileEditor } from './HostProfileEditor';

interface HostDashboardProps {
  activeUser: User | null;
  bookings: Booking[];
  language: Language;
  currency: 'VND' | 'USD';
  onUpdateBookingStatus: (bookingId: string, newStatus: 'confirmed' | 'cancelled') => void;
  onOpenLiveRadar: (booking: Booking) => void;
  onOpenChat: () => void;
  onSwitchToStudio: () => void;
  onSaveProfile: (updatedUser: User) => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  activeUser,
  bookings,
  language,
  currency,
  onUpdateBookingStatus,
  onOpenLiveRadar,
  onOpenChat,
  onSwitchToStudio,
  onSaveProfile,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');
  const [isAccepting, setIsAccepting] = useState<boolean>(activeUser?.isAcceptingGuests ?? true);

  // Filter bookings for this host (or all if demo)
  const hostBookings = bookings.filter(b => b.hostId === activeUser?.id || activeUser?.role === 'host');

  const totalEarningsVND = hostBookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((acc, curr) => acc + (curr.totalPriceVND - curr.platformFeeVND), 0) + 38500000;

  const completedTrips = hostBookings.filter(b => b.status === 'completed').length + 78;

  const handleAccept = (bookingId: string) => {
    onUpdateBookingStatus(bookingId, 'confirmed');
    sounds.playSuccessChime();
  };

  const handleDecline = (bookingId: string) => {
    onUpdateBookingStatus(bookingId, 'cancelled');
    sounds.playNotificationPing();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Portal Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'bg-[#A82323] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <i className="fa-solid fa-chart-line"></i>
            <span>{t.hostDashboardTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-[#A82323] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <i className="fa-solid fa-user-pen"></i>
            <span>{t.hostProfileTab}</span>
          </button>
        </div>

        <button
          onClick={onSwitchToStudio}
          className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c49f2e] text-stone-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <i className="fa-solid fa-plus"></i>
          <span>{t.tourStudioTab}</span>
        </button>
      </div>

      {activeTab === 'profile' ? (
        <HostProfileEditor
          activeUser={activeUser}
          language={language}
          onSaveProfile={(user) => {
            onSaveProfile(user);
            setActiveTab('bookings');
          }}
        />
      ) : (
        <>
          {/* Header with Stats & Live Availability Toggle */}
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-[#4A1010] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={activeUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                    alt={activeUser?.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-md"
                  />
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#D4AF37] hover:bg-[#c49f2e] text-stone-950 rounded-full flex items-center justify-center text-[10px] shadow-xs cursor-pointer"
                    title="Edit Profile"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold">{activeUser?.name}</h2>
                    <span className="px-2.5 py-0.5 bg-amber-400 text-stone-950 text-[10px] font-black uppercase rounded-full">
                      VERIFIED BUDDY
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-0.5">{t.hostDashTitle}</p>
                  {activeUser?.languages && (
                    <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                      <span>🗣️</span>
                      <span>{activeUser.languages.join(' • ')}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 flex items-center justify-between md:justify-end gap-3">
                <div>
                  <span className="text-[10px] text-stone-300 block uppercase font-bold">{t.acceptingGuestsStatus}</span>
                  <span className={`text-xs font-black ${isAccepting ? 'text-emerald-400' : 'text-stone-400'}`}>
                    {isAccepting ? t.acceptingOn : t.acceptingOff}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsAccepting(!isAccepting);
                    sounds.playNotificationPing();
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isAccepting ? 'bg-emerald-500' : 'bg-stone-600'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      isAccepting ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 4 Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="bg-black/25 p-3.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.totalEarningsLabel}</span>
                <span className="text-base sm:text-lg font-extrabold text-amber-300">
                  {currency === 'USD' ? `$${Math.round(totalEarningsVND / 25000)}` : `${totalEarningsVND.toLocaleString('vi-VN')}₫`}
                </span>
              </div>

              <div className="bg-black/25 p-3.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.completedTripsLabel}</span>
                <span className="text-base sm:text-lg font-extrabold text-white">
                  {completedTrips} {language === 'vi' ? 'chuyến đi' : 'trips'}
                </span>
              </div>

              <div className="bg-black/25 p-3.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.ratingLabel}</span>
                <span className="text-base sm:text-lg font-extrabold text-amber-300 flex items-center gap-1">
                  <i className="fa-solid fa-star text-xs"></i>
                  4.98 (142)
                </span>
              </div>

              <div className="bg-black/25 p-3.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                  {language === 'vi' ? 'Tốc độ phản hồi' : 'Response Time'}
                </span>
                <span className="text-base sm:text-lg font-extrabold text-emerald-400">
                  {language === 'vi' ? '< 5 phút (100%)' : '< 5 mins (100%)'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Profile Summary Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#A82323] text-white flex items-center justify-center text-sm shrink-0 shadow-2xs">
                <i className="fa-solid fa-id-card-clip"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  {language === 'vi' ? 'Hồ sơ Host Bản địa:' : 'Host Trust Profile:'} {activeUser?.name}
                </h4>
                <p className="text-[11px] text-stone-600 line-clamp-1 italic">
                  "{language === 'vi' ? (activeUser?.bioVi || activeUser?.bio) : (activeUser?.bio || activeUser?.bioVi)}"
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('profile')}
              className="px-3.5 py-1.5 bg-white hover:bg-stone-50 border border-amber-300 text-stone-800 text-xs font-bold rounded-xl shadow-2xs cursor-pointer shrink-0"
            >
              <i className="fa-solid fa-pen-to-square text-[#A82323] mr-1"></i>
              {language === 'vi' ? 'Chỉnh sửa hồ sơ' : 'Edit Profile'}
            </button>
          </div>

          {/* Action Bar: Create New Tour */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-stone-900">{t.incomingBookings}</h3>
            <button
              onClick={onSwitchToStudio}
              className="px-4 py-2 bg-[#A82323] hover:bg-[#8C1818] text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus"></i>
              <span>{t.creatorStudio}</span>
            </button>
          </div>

          {/* Incoming Bookings Table / Cards */}
          {hostBookings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500 text-xs">
              {t.noIncomingBookings}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hostBookings.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-500 font-mono">#{b.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {b.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <img src={b.tourImage} alt={b.tourTitle} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-stone-900 line-clamp-1">{b.tourTitle}</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        <strong>Guest:</strong> {b.customerName} ({b.customerPhone})
                      </p>
                      <p className="text-[11px] text-stone-500">
                        <strong>Schedule:</strong> {b.bookingDate} @ {b.bookingTime} ({b.guestsCount} pax)
                      </p>
                      <p className="text-xs font-extrabold text-[#A82323] mt-1">
                        Payout: {(b.totalPriceVND - b.platformFeeVND).toLocaleString('vi-VN')} VND
                      </p>
                    </div>
                  </div>

                  {b.notes && (
                    <div className="p-2 bg-stone-50 rounded-lg text-[11px] text-stone-600 italic">
                      "{b.notes}"
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenLiveRadar(b)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-location-crosshairs text-amber-700"></i>
                        <span>GPS Radar</span>
                      </button>
                      <button
                        onClick={onOpenChat}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-regular fa-comment-dots text-stone-600"></i>
                        <span>Chat</span>
                      </button>
                    </div>

                    {b.status === 'confirmed' ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <i className="fa-solid fa-check"></i>
                        {t.accepted}
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecline(b.id)}
                          className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          {t.declineBooking}
                        </button>
                        <button
                          onClick={() => handleAccept(b.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          {t.acceptBooking}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
};

