import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Tour, Booking, Language, User } from '../types';
import { translations } from '../i18n/translations';
import { generateBookingInvoicePDF } from '../utils/pdfGenerator';
import { createGoogleCalendarUrl, addBookingToCalendar } from '../utils/calendar';
import { sendBookingEmail } from '../utils/googleGmail';
import { HAS_GOOGLE_OAUTH } from '../config/env';
import { sounds } from '../utils/audio';
import { newBookingCode } from '../utils/ids';
import { deliverNewBooking } from '../utils/bookingDelivery';

interface CheckoutModalProps {
  isOpen: boolean;
  draftBooking: {
    tour: Tour;
    date: string;
    time: string;
    guests: number;
    totalVND: number;
    totalUSD: number;
    platformFeeVND: number;
    discountVND: number;
    couponCode: string;
    specialNotes: string;
  } | null;
  activeUser: User | null;
  language: Language;
  currency: 'VND' | 'USD';
  onClose: () => void;
  onConfirmBooking: (newBooking: Booking) => Promise<boolean>;
  onOpenLiveRadar: (booking: Booking) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  draftBooking,
  activeUser,
  language,
  currency,
  onClose,
  onConfirmBooking,
  onOpenLiveRadar,
}) => {
  const t = translations[language];

  // Prefilled from the signed-in account, and otherwise blank. These used to
  // default to a demo traveller's real-looking name, email and phone number,
  // which meant a stranger's contact details sat in the checkout form of anyone
  // who reached it — and shipped in the bundle for anyone to read.
  const [fullName, setFullName] = useState(activeUser?.name || '');
  const [email, setEmail] = useState(activeUser?.email || '');
  const [phone, setPhone] = useState(activeUser?.phone || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Real integration status, so the UI never claims something that didn't happen.
  const [mailStatus, setMailStatus] = useState<'idle' | 'sending' | 'sent' | 'compose' | 'error'>('idle');
  const [mailDetail, setMailDetail] = useState<string>('');
  const [mailRecipients, setMailRecipients] = useState<string[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<'idle' | 'working' | 'created' | 'template' | 'error'>('idle');
  const [calendarEventUrl, setCalendarEventUrl] = useState<string>('');
  const [showCalendarPrompt, setShowCalendarPrompt] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'idle' | 'sending' | 'sent' | 'unavailable' | 'error'>('idle');
  const [deliveryDetail, setDeliveryDetail] = useState('');
  const [bookingError, setBookingError] = useState('');

  if (!isOpen || !draftBooking) return null;

  /**
   * Sends the reservation. No money moves here, and none is meant to.
   *
   * This modal used to offer VNPay, MoMo, a card and cash, take one of them,
   * and confirm the booking itself with a lock icon and "Securing booking in
   * Escrow…". Not one of those methods charged anything — the choice was
   * written onto the record and never used again — and escrow is not something
   * this platform may lawfully do: holding a traveller's money for a host is a
   * payment intermediary service, which under Nghị định 52/2024/NĐ-CP needs a
   * State Bank licence.
   *
   * So what happens is what actually happened all along: the traveller's
   * details are recorded, the request goes to the host, and the host decides.
   * The traveller settles with them in person.
   */
  const handleRequestBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(async () => {
      const newBooking: Booking = {
        id: newBookingCode(),
        tourId: draftBooking.tour.id,
        tourTitle: draftBooking.tour.title,
        tourTitleVi: draftBooking.tour.titleVi,
        tourImage: draftBooking.tour.coverImage,
        city: draftBooking.tour.city,
        hostId: draftBooking.tour.hostId,
        hostName: draftBooking.tour.hostName,
        hostPhone: draftBooking.tour.hostPhone,
        hostAvatar: draftBooking.tour.hostAvatar,
        customerId: activeUser?.id || 'user_guest',
        customerName: fullName,
        customerEmail: email,
        customerPhone: phone,
        bookingDate: draftBooking.date,
        bookingTime: draftBooking.time,
        tourEndsAtEpochMs:
          new Date(`${draftBooking.date}T${draftBooking.time}:00+07:00`).getTime()
          + (draftBooking.tour.durationHours || 3) * 3_600_000,
        guestsCount: draftBooking.guests,
        totalPriceVND: draftBooking.totalVND,
        totalPriceUSD: draftBooking.totalUSD,
        platformFeeVND: draftBooking.platformFeeVND,
        // The host confirms, not this form. Nothing else can: there is no
        // payment to succeed, so a booking that confirmed itself would be
        // telling a traveller their place is held before anyone had agreed.
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
        notes: draftBooking.specialNotes,
        meetingPoint: language === 'vi' ? draftBooking.tour.meetingPointVi : draftBooking.tour.meetingPoint,
      };

      const saved = await onConfirmBooking(newBooking);
      setIsProcessing(false);
      if (!saved) {
        setBookingError(
          language === 'vi'
            ? 'Chưa giữ được chỗ. Có thể tour vừa được khách khác đặt hoặc kết nối mạng bị gián đoạn.'
            : 'The slot could not be reserved. It may have just been booked or the network was interrupted.',
        );
        return;
      }

      setConfirmedBooking(newBooking);
      setDeliveryStatus('sending');
      void deliverNewBooking(newBooking, language, draftBooking.tour.durationHours || 3).then((result) => {
        if (result.status === 'sent') {
          setDeliveryStatus('sent');
          sounds.playNotificationPing();
          setShowCalendarPrompt(true);
          return;
        }
        setDeliveryStatus(result.status === 'unavailable' ? 'unavailable' : 'error');
        setDeliveryDetail(result.reason);
        // The customer's own calendar remains useful even when system email
        // delivery is not configured, so still offer it after the attempt.
        setShowCalendarPrompt(true);
      });

      // Play chime & Fire Confetti
      sounds.playSuccessChime();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#A82323', '#D4AF37', '#10B981', '#F59E0B', '#3B82F6']
        });
      } catch {
        // Confetti fallback
      }
    }, 1200);
  };

  const handleDownloadPDF = () => {
    if (confirmedBooking) {
      generateBookingInvoicePDF(confirmedBooking, language);
    }
  };

  const tourDurationHours = draftBooking.tour.durationHours || 3;

  // Kept for the right-click / copy-link affordance; the button below uses the
  // API path when OAuth is configured.
  const calendarUrl = confirmedBooking
    ? createGoogleCalendarUrl(confirmedBooking, language, tourDurationHours)
    : '#';

  const handleAddToCalendar = async (e?: React.SyntheticEvent) => {
    if (!confirmedBooking) return;
    e?.preventDefault();
    setCalendarStatus('working');

    const result = await addBookingToCalendar(confirmedBooking, language, tourDurationHours);
    setCalendarEventUrl(result.eventUrl || '');
    setCalendarStatus(result.mode === 'created' ? 'created' : 'template');
    setShowCalendarPrompt(false);
    if (result.mode === 'created') sounds.playSuccessChime();
  };

  const handleSendEmail = async () => {
    if (!confirmedBooking) return;
    setMailStatus('sending');
    setMailDetail('');

    const result = await sendBookingEmail(confirmedBooking, language);
    setMailRecipients(result.recipients || []);

    if (result.mode === 'sent') {
      setMailStatus('sent');
      sounds.playNotificationPing();
      return;
    }

    setMailStatus('compose');
    setMailDetail(
      result.degradedReason
        ? language === 'vi'
          ? 'Không gửi tự động được, đã mở cửa sổ soạn thư Gmail với nội dung điền sẵn.'
          : 'Automatic sending was unavailable, so a pre-filled Gmail compose window was opened instead.'
        : language === 'vi'
          ? 'Đã mở cửa sổ soạn thư Gmail với nội dung điền sẵn. Bạn chỉ cần bấm Gửi.'
          : 'A pre-filled Gmail compose window was opened. Just press Send.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#A82323] via-[#8C1818] to-[#690E0E] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 font-bold">
              {/* A padlock is the icon for "your payment is secured". Nothing is
                  paid here, so it was promising the wrong thing. */}
              <i className={`fa-solid ${confirmedBooking ? 'fa-circle-check' : 'fa-paper-plane'} text-sm`}></i>
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg">
                  {confirmedBooking
                    ? language === 'vi' ? 'Đã ghi nhận yêu cầu đặt tour' : 'Booking request recorded'
                    : t.checkoutTitle}
              </h3>
              <p className="text-xs text-stone-200/90 font-medium">
                {confirmedBooking
                  ? `${language === 'vi' ? 'Mã đặt chỗ' : 'Booking reference'}: #${confirmedBooking.id}`
                  : language === 'vi'
                    ? 'Chưa thanh toán — chỉ gửi yêu cầu tới host'
                    : 'No payment — this only sends a request to your host'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* CONFIRMATION SUCCESS STATE */}
          {confirmedBooking ? (
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner border-2 border-emerald-400">
                <i className="fa-solid fa-check"></i>
              </div>

              <div>
                <h4 className="font-serif font-bold text-xl text-stone-900">
                  {language === 'vi' ? 'Đã ghi nhận yêu cầu đặt tour!' : 'Your booking request was recorded!'}
                </h4>
                <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mt-1 leading-relaxed">
                  {t.bookingSuccessMsg}
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="font-bold text-stone-900">{confirmedBooking.tourTitle}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                    {confirmedBooking.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <div>
                    <span className="text-[10px] text-stone-400 block">{t.dateLabel} & {t.timeLabel}</span>
                    <span className="font-semibold text-stone-800">{confirmedBooking.bookingDate} @ {confirmedBooking.bookingTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">{t.hostBioTitle}</span>
                    <span className="font-semibold text-stone-800">{confirmedBooking.hostName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">{t.guestsCountLabel}</span>
                    <span className="font-semibold text-stone-800">
                      {confirmedBooking.guestsCount} {language === 'vi' ? 'khách du lịch' : (confirmedBooking.guestsCount > 1 ? 'travelers' : 'traveler')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">{t.totalPayable}</span>
                    <span className="font-extrabold text-[#A82323]">{confirmedBooking.totalPriceVND.toLocaleString('vi-VN')} VND</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: PDF, Gmail, Calendar, Live Radar */}
              <div className="space-y-2.5">

                <div className={`rounded-xl border p-3 text-left text-[11px] leading-relaxed ${
                  deliveryStatus === 'sent'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : deliveryStatus === 'sending'
                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                }`}>
                  {deliveryStatus === 'sending' ? (
                    <><i className="fa-solid fa-spinner fa-spin mr-1.5"></i>{language === 'vi' ? 'Đang gửi biên bản đặt chỗ trước cho bạn và thông báo cho host…' : 'Sending your pre-reservation record and notifying the host…'}</>
                  ) : deliveryStatus === 'sent' ? (
                    <><i className="fa-solid fa-circle-check mr-1.5"></i>{language === 'vi' ? `Biên bản đặt chỗ trước đã gửi tới ${confirmedBooking.customerEmail}; host đã nhận email. Calendar của host chỉ được tạo sau khi host xác nhận.` : `Pre-reservation record sent to ${confirmedBooking.customerEmail}; the host was notified. The host calendar is created only after confirmation.`}</>
                  ) : (
                    <><i className="fa-solid fa-triangle-exclamation mr-1.5"></i>{language === 'vi' ? 'Booking đã được lưu nhưng hệ thống chưa gửi được email/lịch tự động. Bạn có thể tải biên bản hoặc mở bản nháp Gmail bên dưới.' : 'The booking was saved, but automatic email/calendar delivery is unavailable. Download the receipt or open a Gmail draft below.'}{deliveryDetail ? ` (${deliveryDetail})` : ''}</>
                  )}
                </div>
                
                {/* Download PDF Invoice */}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="w-full py-3 bg-[#A82323] hover:bg-[#8C1818] text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-file-pdf text-amber-300"></i>
                  <span>{t.downloadInvoice}</span>
                </button>

                {/* Customer calendar is optional. Host delivery is automatic above. */}
                <div className={`grid grid-cols-1 ${deliveryStatus === 'sent' ? '' : 'sm:grid-cols-2'} gap-2`}>
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleAddToCalendar}
                    className="py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {calendarStatus === 'working' ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-blue-600"></i>
                        <span>{language === 'vi' ? 'Đang thêm vào lịch...' : 'Adding to calendar...'}</span>
                      </>
                    ) : calendarStatus === 'created' ? (
                      <>
                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                        <span>{language === 'vi' ? 'Đã thêm vào lịch' : 'Added to calendar'}</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-regular fa-calendar-plus text-blue-600"></i>
                        <span>{t.addToGoogleCalendar}</span>
                      </>
                    )}
                  </a>

                  {deliveryStatus !== 'sent' && <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={mailStatus === 'sending' || mailStatus === 'sent'}
                    className="py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {mailStatus === 'sending' ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-red-600"></i>
                        <span>{language === 'vi' ? 'Đang gửi PDF…' : 'Sending PDF…'}</span>
                      </>
                    ) : mailStatus === 'sent' ? (
                      <>
                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                        <span>{language === 'vi' ? 'Đã gửi email' : 'Email sent'}</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-regular fa-envelope text-red-600"></i>
                        <span>{HAS_GOOGLE_OAUTH ? (language === 'vi' ? 'Gửi PDF qua Gmail' : 'Email PDF') : (language === 'vi' ? 'Mở bản nháp Gmail' : 'Open Gmail draft')}</span>
                      </>
                    )}
                  </button>}
                </div>

                {/* Link to the freshly created calendar event */}
                {calendarStatus === 'created' && calendarEventUrl && (
                  <a
                    href={calendarEventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[11px] text-blue-700 hover:text-blue-900 underline font-semibold"
                  >
                    {language === 'vi' ? 'Mở sự kiện trong Google Calendar →' : 'Open the event in Google Calendar →'}
                  </a>
                )}

                {calendarStatus === 'created' && (
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    <i className="fa-solid fa-circle-check mr-1"></i>
                    {language === 'vi' ? 'Đã thêm lịch vào Google Calendar của bạn.' : 'Added to your Google Calendar.'}
                  </p>
                )}

                {mailStatus === 'sent' && (
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    <i className="fa-solid fa-circle-check mr-1"></i>
                    {language === 'vi'
                      ? `Gmail API đã gửi PDF tới ${mailRecipients.join(' và ')}.`
                      : `Gmail API sent the PDF to ${mailRecipients.join(' and ')}.`}
                  </p>
                )}

                {mailStatus === 'compose' && (
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    <i className="fa-solid fa-circle-info mr-1"></i>{mailDetail}{' '}
                    {language === 'vi' ? 'PDF chưa được gửi tự động; hãy tải PDF và đính kèm trước khi bấm Gửi.' : 'The PDF was not sent automatically; download and attach it before pressing Send.'}
                  </p>
                )}

                {/* Open Live GPS Radar */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLiveRadar(confirmedBooking);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-location-crosshairs text-stone-950"></i>
                  <span>{t.openLiveRadar}</span>
                </button>

              </div>
            </div>
          ) : (
            /* CHECKOUT FORM STATE */
            <form onSubmit={handleRequestBooking} className="space-y-4">
              {bookingError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i>{bookingError}
                </div>
              )}
              
              {/* Order Quick Summary Header */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center gap-3">
                <img
                  src={draftBooking.tour.coverImage}
                  alt={draftBooking.tour.title}
                  className="w-14 h-14 rounded-lg object-cover border border-amber-300"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-stone-900 truncate">
                    {language === 'vi' ? draftBooking.tour.titleVi : draftBooking.tour.title}
                  </h4>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    {draftBooking.date} @ {draftBooking.time} • {draftBooking.guests} {language === 'vi' ? 'khách' : 'travelers'}
                  </p>
                  <p className="text-xs font-extrabold text-[#A82323] mt-0.5">
                    {currency === 'USD' ? `$${draftBooking.totalUSD}` : `${draftBooking.totalVND.toLocaleString('vi-VN')}₫`}
                  </p>
                </div>
              </div>

              {/* Step 1: Contact Details */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  {t.step1Info}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">{t.fullName} *</label>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder={language === 'vi' ? 'Họ và tên trên giấy tờ' : 'Full name as on your ID'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">{t.phoneNumber} *</label>
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="+84 …"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">{t.emailAddress} *</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
                  />
                </div>
              </div>

              {/* Where Step 2 used to be: a choice of four payment methods,
                  none of which took a payment. What replaces it is the one
                  thing a traveller actually needs to know before sending the
                  request — that the money is settled in person, with the host. */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-hand-holding-heart text-[#A82323]"></i>
                  {language === 'vi' ? 'Chưa thanh toán gì lúc này' : 'Nothing is charged now'}
                </p>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {language === 'vi'
                    ? `Bạn đang đặt chỗ trước. Hãy trao đổi và tự thanh toán trực tiếp theo thỏa thuận với host. Hệ thống không thu hoặc xác minh khoản ${draftBooking.totalVND.toLocaleString('vi-VN')}₫; host chỉ xác nhận sau khi họ tự kiểm tra.`
                    : `This is a pre-reservation. Settle directly with the host as agreed. The system neither collects nor verifies the ${draftBooking.totalVND.toLocaleString('vi-VN')}₫; the host confirms only after checking it themselves.`}
                </p>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 bg-[#A82323] hover:bg-[#8C1818] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                {isProcessing ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>{language === 'vi' ? 'Đang gửi yêu cầu…' : 'Sending your request…'}</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane text-amber-300"></i>
                    <span>{language === 'vi' ? 'Gửi yêu cầu đặt chỗ' : 'Send booking request'}</span>
                  </>
                )}
              </button>

            </form>
          )}

        </div>

      </div>

      {showCalendarPrompt && confirmedBooking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl">
              <i className="fa-regular fa-calendar-plus"></i>
            </div>
            <div>
              <h3 className="font-bold text-stone-900">
                {language === 'vi' ? 'Thêm lịch cho bạn?' : 'Add this to your calendar?'}
              </h3>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                {language === 'vi'
                  ? 'Host đã được hệ thống thông báo riêng. Bạn có muốn thêm lịch trình này vào Google Calendar của chính mình không?'
                  : 'The host is being notified separately. Would you like this itinerary on your own Google Calendar?'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setShowCalendarPrompt(false)} className="py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold cursor-pointer">
                {language === 'vi' ? 'Không cần' : 'Not now'}
              </button>
              <button type="button" disabled={calendarStatus === 'working'} onClick={() => void handleAddToCalendar()} className="py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
                {calendarStatus === 'working' ? <i className="fa-solid fa-spinner fa-spin"></i> : language === 'vi' ? 'Có, thêm lịch' : 'Yes, add it'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
