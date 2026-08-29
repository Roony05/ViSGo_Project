import React, { useState } from 'react';
import { Booking, Language, Tour } from '../types';
import { translations } from '../i18n/translations';
import { generateBookingInvoicePDF } from '../utils/pdfGenerator';
import { createGoogleCalendarUrl, addBookingToCalendar, resolveDurationHours } from '../utils/calendar';
import { sendBookingEmail } from '../utils/googleGmail';
import { buildGoogleMapsPlaceUrl } from '../utils/googleMaps';
import { HAS_GOOGLE_OAUTH } from '../config/env';

interface MyBookingsViewProps {
  bookings: Booking[];
  tours: Tour[];
  language: Language;
  currency: 'VND' | 'USD';
  onOpenLiveRadar: (booking: Booking) => void;
  /**
   * Opens the conversation for one specific trip.
   *
   * Per booking, not per user: a traveller with two trips has two separate
   * conversations, with two different hosts. The global "Messages" button can
   * only ever guess which one they meant.
   */
  onOpenChat: (booking: Booking) => void;
  onOpenReview: (tour: Tour) => void;
  onExploreMore: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  bookings,
  tours,
  language,
  currency,
  onOpenLiveRadar,
  onOpenChat,
  onOpenReview,
  onExploreMore,
}) => {
  const t = translations[language];

  // Per-booking async state, so one card's spinner never affects another.
  const [busyAction, setBusyAction] = useState<Record<string, 'calendar' | 'email' | undefined>>({});
  const [doneAction, setDoneAction] = useState<Record<string, 'calendar' | 'email' | undefined>>({});

  const handleDownloadInvoice = (booking: Booking) => {
    generateBookingInvoicePDF(booking, language);
  };

  const handleAddToCalendar = async (e: React.MouseEvent<HTMLAnchorElement>, booking: Booking) => {
    // Without OAuth the plain href already opens the Calendar template.
    if (!HAS_GOOGLE_OAUTH) return;

    e.preventDefault();
    setBusyAction((prev) => ({ ...prev, [booking.id]: 'calendar' }));

    const result = await addBookingToCalendar(booking, language, resolveDurationHours(booking, tours));

    setBusyAction((prev) => ({ ...prev, [booking.id]: undefined }));
    if (result.mode === 'created') {
      setDoneAction((prev) => ({ ...prev, [booking.id]: 'calendar' }));
    }
  };

  const handleEmailItinerary = async (booking: Booking) => {
    setBusyAction((prev) => ({ ...prev, [booking.id]: 'email' }));
    const result = await sendBookingEmail(booking, language);
    setBusyAction((prev) => ({ ...prev, [booking.id]: undefined }));
    if (result.mode === 'sent') {
      setDoneAction((prev) => ({ ...prev, [booking.id]: 'email' }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            {t.myBookingsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {language === 'vi' ? 'Quản lý lịch trình, hóa đơn PDF và định vị đón khách 24/7.' : 'Manage your upcoming itineraries, official receipts, and real-time buddy GPS tracking.'}
          </p>
        </div>

        <button
          onClick={onExploreMore}
          className="px-4 py-2 bg-[#A82323] hover:bg-[#8C1818] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
        >
          <i className="fa-solid fa-compass"></i>
          <span>{t.home}</span>
        </button>
      </div>

      {/* Bookings List or Empty State */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto my-8 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[#A82323] flex items-center justify-center mx-auto text-2xl">
            <i className="fa-solid fa-suitcase-rolling"></i>
          </div>
          <h3 className="font-bold text-stone-900 text-base">{t.noBookingsYet}</h3>
          <p className="text-xs text-stone-500">{t.pillar1Desc}</p>
          <button
            onClick={onExploreMore}
            className="px-5 py-2.5 bg-[#A82323] hover:bg-[#8C1818] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
          >
            {language === 'vi' ? 'Khám phá Tour ngay' : 'Browse Experiences'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bookings.map((booking) => {
            const matchedTour = tours.find(t => t.id === booking.tourId);
            const calendarUrl = createGoogleCalendarUrl(booking, language, resolveDurationHours(booking, tours));
            const mapUrl = buildGoogleMapsPlaceUrl(booking.meetingPoint, booking.city);
            const busy = busyAction[booking.id];
            const done = doneAction[booking.id];

            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                
                <div className="p-5 space-y-4">
                  {/* Top Bar: Reference ID and Status Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-stone-500">#{booking.id}</span>
                      <span className="text-[10px] text-stone-400 font-medium">• {booking.city}</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        booking.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : booking.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {booking.status === 'confirmed' ? t.statusConfirmed : booking.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Card Content: Image and Details */}
                  <div className="flex items-start gap-4">
                    <img
                      src={booking.tourImage}
                      alt={booking.tourTitle}
                      className="w-20 h-20 rounded-2xl object-cover border border-stone-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2">
                        {language === 'vi' ? (booking.tourTitleVi || booking.tourTitle) : booking.tourTitle}
                      </h4>
                      
                      <div className="mt-2 space-y-1 text-xs text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <i className="fa-regular fa-calendar text-[#A82323] text-xs"></i>
                          <span>{booking.bookingDate} @ {booking.bookingTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <i className="fa-solid fa-user-group text-amber-600 text-xs"></i>
                          <span>
                            {booking.guestsCount} {language === 'vi' ? 'khách' : (booking.guestsCount > 1 ? 'travelers' : 'traveler')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <i className="fa-solid fa-user text-stone-400 text-xs"></i>
                          <span>Host: <strong>{booking.hostName}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meeting Location + live Google Maps directions */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-bold text-[10px] text-stone-500 uppercase block mb-0.5">
                        {t.meetingLocation}
                      </span>
                      <p className="line-clamp-1">{booking.meetingPoint}</p>
                    </div>
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      title={language === 'vi' ? 'Mở chỉ đường trên Google Maps' : 'Open directions in Google Maps'}
                    >
                      <i className="fa-solid fa-diamond-turn-right"></i>
                      <span className="hidden sm:inline">{language === 'vi' ? 'Chỉ đường' : 'Directions'}</span>
                    </a>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-stone-50/70 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* PDF Download */}
                    <button
                      onClick={() => handleDownloadInvoice(booking)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title={t.downloadInvoice}
                    >
                      <i className="fa-solid fa-file-pdf text-red-600"></i>
                      <span>PDF</span>
                    </button>

                    {/* Google Calendar */}
                    <a
                      href={calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleAddToCalendar(e, booking)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title={language === 'vi' ? 'Thêm vào Google Calendar' : 'Add to Google Calendar'}
                    >
                      {busy === 'calendar' ? (
                        <i className="fa-solid fa-spinner fa-spin text-blue-600"></i>
                      ) : done === 'calendar' ? (
                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                      ) : (
                        <i className="fa-regular fa-calendar-plus text-blue-600"></i>
                      )}
                      <span className="hidden sm:inline">Calendar</span>
                    </a>

                    {/* Email the itinerary */}
                    <button
                      onClick={() => handleEmailItinerary(booking)}
                      disabled={busy === 'email'}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 disabled:opacity-60 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title={language === 'vi' ? 'Gửi lịch trình qua Gmail' : 'Email this itinerary via Gmail'}
                    >
                      {busy === 'email' ? (
                        <i className="fa-solid fa-spinner fa-spin text-red-600"></i>
                      ) : done === 'email' ? (
                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                      ) : (
                        <i className="fa-regular fa-envelope text-red-600"></i>
                      )}
                      <span className="hidden sm:inline">Gmail</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {matchedTour && (
                      <button
                        onClick={() => onOpenReview(matchedTour)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <i className="fa-regular fa-star mr-1"></i>
                        {t.reviewTrip}
                      </button>
                    )}

                    <button
                      onClick={() => onOpenChat(booking)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-regular fa-comment-dots text-stone-600"></i>
                      <span>{language === 'vi' ? 'Nhắn tin' : 'Message'}</span>
                    </button>

                    <button
                      onClick={() => onOpenLiveRadar(booking)}
                      className="px-3.5 py-1.5 bg-[#A82323] hover:bg-[#8C1818] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-location-crosshairs text-amber-300"></i>
                      <span>{t.liveRadar}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
