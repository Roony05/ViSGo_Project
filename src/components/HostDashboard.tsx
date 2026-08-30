import React, { useState } from 'react';
import { Booking, HostKycApplication, Language, Tour, User } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { HostProfileEditor } from './HostProfileEditor';
import { HostVerificationForm } from './HostVerificationForm';
import { Avatar } from './Avatar';

/**
 * The host's own workspace.
 *
 * This panel was trimmed back hard, because most of what it showed was not
 * true. Four things were invented outright and have been deleted:
 *
 *   - 38,500,000₫ was ADDED to earnings, and 78 to the completed-trip count.
 *     A host reading their own payout figure was reading a number nobody owed
 *     them.
 *   - "4.98 (142)" was printed as the rating for every host on the platform,
 *     including one who had never been reviewed.
 *   - "Tốc độ phản hồi: < 5 phút (100%)" measured nothing. We do not record
 *     reply times anywhere.
 *   - "VERIFIED BUDDY" was stamped on every host regardless of `verified`,
 *     which is the one badge on this page that a traveller might act on.
 *
 * What is left is counted from the host's own bookings, listings and profile,
 * and a figure with nothing behind it says so rather than showing a zero that
 * reads like a bad result.
 */
interface HostDashboardProps {
  activeUser: User | null;
  bookings: Booking[];
  /** Every published tour; filtered to this host's own for the listing count. */
  tours: Tour[];
  language: Language;
  currency: 'VND' | 'USD';
  onUpdateBookingStatus: (bookingId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => void;
  /** Publishes a reserved listing again after the host has finished/edit it. */
  onReopenTour: (tourId: string) => void;
  onOpenLiveRadar: (booking: Booking) => void;
  /** Opens the conversation for this specific trip, not a generic inbox. */
  onOpenChat: (booking: Booking) => void;
  onSwitchToStudio: () => void;
  onSaveProfile: (updatedUser: User) => void;
  /** Which tab to open on. Lets the account modal link straight to the
      public-profile editor rather than "the dashboard, then click Hồ sơ". */
  initialTab?: 'bookings' | 'profile' | 'verify';
  /** Opens the account modal, which owns photo, name, phone and city. */
  onOpenAccount?: () => void;
  /** Opens one of this host's own listings in the studio for editing. */
  onEditTour?: (tour: Tour) => void;
  /** Every verification application this session can see; filtered to the host's own. */
  kycApplications: HostKycApplication[];
  onSubmitKyc: (application: HostKycApplication) => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  activeUser,
  bookings,
  tours,
  language,
  currency,
  onUpdateBookingStatus,
  onReopenTour,
  onOpenLiveRadar,
  onOpenChat,
  onSwitchToStudio,
  onSaveProfile,
  initialTab = 'bookings',
  onOpenAccount,
  onEditTour,
  kycApplications,
  onSubmitKyc,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile' | 'verify'>(initialTab);

  // A host may only ever have one application, so the first match is the one.
  const myKyc = kycApplications.find((k) => k.hostId === activeUser?.id) ?? null;
  const [isAccepting, setIsAccepting] = useState<boolean>(activeUser?.isAcceptingGuests ?? true);

  /*
    This host's bookings.

    The second clause used to be `|| activeUser?.role === 'host'`, which is true
    for every host reading the page — so the filter passed everything and each
    host saw every other host's guests, names and phone numbers. Firestore's
    rules were never the problem; this was a client-side list that had already
    been fetched. One condition, no escape hatch.
  */
  const hostBookings = bookings.filter((b) => b.hostId === activeUser?.id);
  const myTours = tours.filter((tr) => tr.hostId === activeUser?.id);

  const earnedBookings = hostBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  );
  const totalEarningsVND = earnedBookings.reduce(
    (acc, curr) => acc + (curr.totalPriceVND - curr.platformFeeVND),
    0,
  );
  const completedTrips = hostBookings.filter((b) => b.status === 'completed').length;
  const pendingCount = hostBookings.filter((b) => b.status === 'pending').length;
  const reviewCount = activeUser?.reviewCount ?? 0;

  const handleAccept = (bookingId: string) => {
    onUpdateBookingStatus(bookingId, 'confirmed');
    sounds.playSuccessChime();
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

          <button
            onClick={() => setActiveTab('verify')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'verify'
                ? 'bg-[#A82323] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <i className="fa-solid fa-id-card"></i>
            <span>{language === 'vi' ? 'Xác minh' : 'Verify'}</span>
            {/* The one state worth a dot in the tab bar: nothing sent yet. */}
            {!myKyc && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" aria-hidden="true"></span>
            )}
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

      {activeTab === 'verify' ? (
        <HostVerificationForm
          activeUser={activeUser}
          language={language}
          application={myKyc}
          onSubmit={onSubmitKyc}
        />
      ) : activeTab === 'profile' ? (
        <HostProfileEditor
          activeUser={activeUser}
          language={language}
          onOpenAccount={onOpenAccount}
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
                  {/* The stock Unsplash portrait that used to stand in here was a
                      photograph of a real stranger shown as this host's own face. */}
                  <Avatar
                    src={activeUser?.avatar}
                    name={activeUser?.name ?? ''}
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
                    {activeUser?.verified && (
                      <span className="px-2.5 py-0.5 bg-amber-400 text-stone-950 text-[10px] font-black uppercase rounded-full">
                        {language === 'vi' ? 'ĐÃ XÁC THỰC' : 'VERIFIED'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-300 mt-0.5">{t.hostDashTitle}</p>
                  {activeUser?.languages && (
                    <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                      <i className="fa-solid fa-language text-stone-500"></i>
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
                    // Was local state only: the switch moved, nothing was
                    // saved, and it was back on after a reload. It writes to
                    // the profile now, the same as any other profile field.
                    const next = !isAccepting;
                    setIsAccepting(next);
                    sounds.playNotificationPing();
                    if (activeUser) onSaveProfile({ ...activeUser, isAcceptingGuests: next });
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

            {/* Four figures, each counted from this host's own rows. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="bg-black/25 p-3.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.totalEarningsLabel}</span>
                <span className="text-base sm:text-lg font-extrabold text-amber-300">
                  {currency === 'USD'
                    ? `$${Math.round(totalEarningsVND / 25000).toLocaleString('en-US')}`
                    : `${totalEarningsVND.toLocaleString('vi-VN')}₫`}
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  {language === 'vi'
                    ? `${earnedBookings.length} đơn đã nhận`
                    : `${earnedBookings.length} accepted booking${earnedBookings.length === 1 ? '' : 's'}`}
                </span>
              </div>

              <div className="bg-black/25 p-3.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.completedTripsLabel}</span>
                <span className="text-base sm:text-lg font-extrabold text-white">
                  {completedTrips} {language === 'vi' ? 'chuyến' : completedTrips === 1 ? 'trip' : 'trips'}
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  {language === 'vi' ? `${pendingCount} đơn chờ duyệt` : `${pendingCount} awaiting your reply`}
                </span>
              </div>

              <div className="bg-black/25 p-3.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.ratingLabel}</span>
                {reviewCount > 0 ? (
                  <>
                    <span className="text-base sm:text-lg font-extrabold text-amber-300 flex items-center gap-1">
                      <i className="fa-solid fa-star text-xs"></i>
                      {(activeUser?.rating ?? 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      {language === 'vi' ? `${reviewCount} đánh giá` : `${reviewCount} review${reviewCount === 1 ? '' : 's'}`}
                    </span>
                  </>
                ) : (
                  /* A hard 0.00 reads as a terrible score. "Not yet rated" is
                     the honest shape of an empty review list. */
                  <span className="text-xs font-bold text-stone-400 block mt-1 leading-snug">
                    {language === 'vi' ? 'Chưa có đánh giá nào' : 'Not rated yet'}
                  </span>
                )}
              </div>

              <div className="bg-black/25 p-3.5 rounded-2xl border border-white/5">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                  {language === 'vi' ? 'Tour đang đăng' : 'Live listings'}
                </span>
                <span className="text-base sm:text-lg font-extrabold text-white">{myTours.length}</span>
                <button
                  onClick={onSwitchToStudio}
                  className="text-[10px] text-amber-300 hover:text-amber-200 block mt-0.5 cursor-pointer underline underline-offset-2"
                >
                  {language === 'vi' ? 'Đăng tour mới' : 'Publish a new tour'}
                </button>
              </div>
            </div>
          </div>

          {/* This host's own listings.
              The dashboard used to show only a count, so a host who wanted to
              fix a price or a typo had no way in at all — the studio only ever
              created new tours, and the old listing stayed wrong. */}
          {myTours.length > 0 && onEditTour && (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h3 className="font-bold text-base text-stone-900">
                  {language === 'vi' ? 'Tour của bạn' : 'Your listings'}
                </h3>
                <span className="text-xs text-stone-500">({myTours.length})</span>
              </div>

              <div className="space-y-2">
                {myTours.map((tour) => {
                  const reservedBooking = tour.reservedByBookingId
                    ? hostBookings.find((booking) => booking.id === tour.reservedByBookingId)
                    : hostBookings.find((booking) => booking.tourId === tour.id && booking.status !== 'cancelled');
                  const canReopen = reservedBooking?.status === 'completed' || reservedBooking?.status === 'cancelled';
                  return (
                  <div
                    key={tour.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-stone-200"
                  >
                    <img
                      src={tour.coverImage}
                      alt=""
                      loading="lazy"
                      className="w-16 h-12 rounded-lg object-cover shrink-0 bg-stone-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {language === 'vi' ? tour.titleVi : tour.title}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {tour.city} • {tour.priceVND.toLocaleString('vi-VN')}₫ •{' '}
                        {tour.durationHours}
                        {language === 'vi' ? ' giờ' : 'h'}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          tour.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tour.status === 'booked'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {tour.status === 'active'
                          ? language === 'vi' ? 'ĐANG MỞ' : 'OPEN'
                          : tour.status === 'booked'
                            ? language === 'vi' ? 'ĐANG/ĐÃ ĐƯỢC ĐẶT' : 'BOOKED'
                            : tour.status.toUpperCase()}
                      </span>
                    </div>
                    {tour.status === 'booked' && canReopen && (
                      <button
                        type="button"
                        onClick={() => onReopenTour(tour.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer shrink-0"
                      >
                        <i className="fa-solid fa-rotate-right mr-1.5"></i>
                        {language === 'vi' ? 'Mở lại' : 'Reopen'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playTap();
                        onEditTour(tour);
                      }}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-lg cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-pen"></i>
                      <span>{language === 'vi' ? 'Sửa' : 'Edit'}</span>
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* The studio button is already in the tab bar above and on the
              listings card; a third copy here was noise. */}
          <div className="flex items-baseline gap-2">
            <h3 className="font-bold text-base text-stone-900">{t.incomingBookings}</h3>
            {hostBookings.length > 0 && (
              <span className="text-xs text-stone-500">({hostBookings.length})</span>
            )}
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
                      {b.status === 'confirmed'
                        ? language === 'vi' ? 'ĐÃ XÁC NHẬN' : 'CONFIRMED'
                        : b.status === 'pending'
                        ? language === 'vi' ? 'CHỜ DUYỆT' : 'PENDING'
                        : b.status === 'completed'
                        ? language === 'vi' ? 'HOÀN THÀNH' : 'COMPLETED'
                        : language === 'vi' ? 'ĐÃ HỦY' : 'CANCELLED'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <img src={b.tourImage} alt={b.tourTitle} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-stone-900 line-clamp-1">
                        {language === 'vi' ? (b.tourTitleVi || b.tourTitle) : b.tourTitle}
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        <strong>{language === 'vi' ? 'Khách:' : 'Guest:'}</strong> {b.customerName} ({b.customerPhone})
                      </p>
                      <p className="text-[11px] text-stone-500">
                        <strong>{language === 'vi' ? 'Lịch trình:' : 'Schedule:'}</strong> {b.bookingDate} @ {b.bookingTime} ({b.guestsCount} {language === 'vi' ? 'khách' : 'pax'})
                      </p>
                      <p className="text-xs font-extrabold text-[#A82323] mt-1">
                        {language === 'vi' ? 'Thực nhận:' : 'Payout:'} {(b.totalPriceVND - b.platformFeeVND).toLocaleString('vi-VN')}₫
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
                        <span>{language === 'vi' ? 'Định vị GPS' : 'GPS Radar'}</span>
                      </button>
                      <button
                        onClick={() => onOpenChat(b)}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-regular fa-comment-dots text-stone-600"></i>
                        <span>{language === 'vi' ? 'Nhắn tin' : 'Chat'}</span>
                      </button>
                    </div>

                    {b.status === 'confirmed' ? (
                      <span className="text-[11px] font-bold text-emerald-700 text-right">
                        <i className="fa-solid fa-circle-check mr-1"></i>
                        {language === 'vi' ? 'Đã xác nhận • chờ khách hoàn thành' : 'Confirmed • awaiting traveller completion'}
                      </span>
                    ) : b.status === 'completed' ? (
                      <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                        <i className="fa-solid fa-check-double"></i>
                        {language === 'vi' ? 'Đã hoàn thành — hãy sửa/mở lại tour' : 'Completed — edit/reopen the tour'}
                      </span>
                    ) : b.status === 'cancelled' ? (
                      <span className="text-xs font-bold text-stone-500">
                        {language === 'vi' ? 'Tour đã được mở lại' : 'Tour was released'}
                      </span>
                    ) : (
                      <div className="flex gap-2">
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
