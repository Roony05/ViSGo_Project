import React from 'react';
import { Booking, Language, Tour } from '../types';
import { translations } from '../i18n/translations';
import { generateBookingInvoicePDF } from '../utils/pdfGenerator';
import { createGoogleCalendarUrl } from '../utils/calendar';

interface MyBookingsViewProps {
  bookings: Booking[];
  tours: Tour[];
  language: Language;
  currency: 'VND' | 'USD';
  onOpenLiveRadar: (booking: Booking) => void;
  onOpenReview: (tour: Tour) => void;
  onExploreMore: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  bookings,
  tours,
  language,
  currency,
  onOpenLiveRadar,
  onOpenReview,
  onExploreMore,
}) => {
  const t = translations[language];

  const handleDownloadInvoice = (booking: Booking) => {
    generateBookingInvoicePDF(booking, language);
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
            const calendarUrl = createGoogleCalendarUrl(booking);

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

                  {/* Meeting Location */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700">
                    <span className="font-bold text-[10px] text-stone-500 uppercase block mb-0.5">
                      {t.meetingLocation}
                    </span>
                    <p className="line-clamp-1">{booking.meetingPoint}</p>
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

                    {/* Google Calendar Link */}
                    <a
                      href={calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Add to Google Calendar"
                    >
                      <i className="fa-regular fa-calendar-plus text-blue-600"></i>
                      <span className="hidden sm:inline">Calendar</span>
                    </a>
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
