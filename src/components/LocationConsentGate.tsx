/**
 * The screen that stands between opening the Live Radar and any coordinate
 * being read.
 *
 * Consent copy is written to be specific rather than reassuring: who sees the
 * location, for how long, what is stored, and how to stop. A generic "we value
 * your privacy" panel would be worse than nothing here, because the traveller
 * is deciding whether to broadcast their physical position to a stranger.
 *
 * The PIN is set in this same screen on first use. Splitting "consent" and "set
 * a PIN" into two dialogs makes people set a PIN they have already forgotten
 * the purpose of by the time they need it.
 */

import React from 'react';
import { Booking, Language } from '../types';
import { hasPin, setPin, meetingTimeOf, shareWindow } from '../utils/locationSharing';
import { sounds } from '../utils/audio';

interface LocationConsentGateProps {
  booking: Booking;
  language: Language;
  /** Called once consent is given and any PIN has been stored. */
  onGrant: () => void;
  onCancel: () => void;
}

export const LocationConsentGate: React.FC<LocationConsentGateProps> = ({
  booking,
  language,
  onGrant,
  onCancel,
}) => {
  const isVi = language === 'vi';
  const needsPin = !hasPin();

  const [pin, setPinValue] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // A tour whose window has already closed cannot be granted at all. Offering
  // the button anyway wrote a grant that was expired the moment it was written,
  // so the gate simply reappeared with nothing to explain why.
  const windowClosed = shareWindow(booking).alreadyClosed;

  const meet = meetingTimeOf(booking);
  const meetLabel = meet
    ? new Date(meet).toLocaleString(isVi ? 'vi-VN' : 'en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : `${booking.bookingDate} ${booking.bookingTime}`;

  const handleGrant = async () => {
    setError('');

    if (needsPin) {
      if (!/^\d{4,8}$/.test(pin)) {
        setError(isVi ? 'Mã PIN phải là 4–8 chữ số.' : 'The PIN must be 4–8 digits.');
        return;
      }
      if (pin !== confirmPin) {
        setError(isVi ? 'Hai mã PIN chưa khớp nhau.' : 'The two PINs do not match.');
        return;
      }
      setBusy(true);
      const res = await setPin(pin);
      setBusy(false);
      if (res.status !== 'ok') {
        setError(isVi ? 'Không lưu được mã PIN trên thiết bị này.' : 'Could not store the PIN on this device.');
        return;
      }
    }

    sounds.playTap();
    onGrant();
  };

  const rules = isVi
    ? [
        { icon: 'fa-user-shield', text: `Chỉ **${booking.hostName}** – Host của chuyến này – nhìn thấy vị trí của bạn. Không ai khác.` },
        { icon: 'fa-clock', text: `Bắt đầu **1 giờ trước** giờ hẹn (${meetLabel}) và **tự tắt** khi tour kết thúc, tối đa 8 giờ.` },
        { icon: 'fa-database', text: 'ViS-Go **không lưu lịch sử di chuyển**. Toạ độ chỉ hiển thị trực tiếp rồi bỏ đi.' },
        { icon: 'fa-key', text: 'Bạn tắt bất cứ lúc nào bằng **mã PIN của bạn** – người khác cầm máy cũng không tắt được.' },
        { icon: 'fa-eye', text: 'Khi đang bật, luôn có dải báo hiển thị trên màn hình – không bao giờ chạy ngầm.' },
      ]
    : [
        { icon: 'fa-user-shield', text: `Only **${booking.hostName}** — this booking's host — can see your location. Nobody else.` },
        { icon: 'fa-clock', text: `Starts **1 hour before** the meeting time (${meetLabel}) and **stops by itself** when the tour ends, 8 hours maximum.` },
        { icon: 'fa-database', text: 'ViS-Go **stores no location history**. Coordinates are shown live and then dropped.' },
        { icon: 'fa-key', text: 'Stop it any time with **your PIN** — someone else holding your phone cannot turn it off.' },
        { icon: 'fa-eye', text: 'While it is on, a banner stays on screen. It never runs silently.' },
      ];

  /** Renders the **bold** spans in the rule copy above. */
  const withBold = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') ? (
        <strong key={i} className="font-bold text-stone-900">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 sm:p-7">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#A82323] text-white">
            <i className="fa-solid fa-location-crosshairs text-lg"></i>
          </span>
          <div>
            <h3 className="text-base font-bold text-stone-900 sm:text-lg">
              {isVi ? 'Chia sẻ vị trí cho buổi gặp này?' : 'Share your location for this meetup?'}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              {isVi
                ? 'Bạn quyết định. Radar sẽ không đọc vị trí cho tới khi bạn đồng ý.'
                : 'Your call. The radar reads nothing until you agree.'}
            </p>
          </div>
        </div>

        <ul className="space-y-2.5 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-3 text-xs leading-relaxed text-stone-600">
              <i className={`fa-solid ${r.icon} mt-0.5 w-4 shrink-0 text-center text-[#B8860B]`}></i>
              <span>{withBold(r.text)}</span>
            </li>
          ))}
        </ul>

        {needsPin && !windowClosed && (
          <div className="mt-5 rounded-2xl border-2 border-[#D4AF37]/40 bg-amber-50/50 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C6D1F]">
              <i className="fa-solid fa-key mr-1.5"></i>
              {isVi ? 'Đặt mã PIN để tắt chia sẻ' : 'Set a PIN to stop sharing'}
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
              {isVi
                ? 'Chỉ dùng để tắt chia sẻ vị trí trên thiết bị này. Mã được mã hoá một chiều, ViS-Go không đọc được và không gửi đi đâu.'
                : 'Used only to stop location sharing on this device. It is stored one-way hashed — ViS-Go cannot read it and it is never sent anywhere.'}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={8}
                value={pin}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                placeholder={isVi ? 'Mã PIN (4–8 số)' : 'PIN (4–8 digits)'}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm tracking-[0.3em] outline-hidden focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323]"
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder={isVi ? 'Nhập lại mã PIN' : 'Repeat the PIN'}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm tracking-[0.3em] outline-hidden focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323]"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
            {error}
          </p>
        )}

        {windowClosed && (
          <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-xs leading-relaxed text-stone-600">
            <i className="fa-solid fa-circle-info mr-1.5 text-stone-400"></i>
            {isVi
              ? 'Chuyến đi này đã kết thúc, nên không thể bật chia sẻ vị trí nữa. Bạn vẫn xem được điểm hẹn và dùng nút SOS.'
              : 'This tour has already finished, so location sharing can no longer be turned on. The meeting point and the SOS button are still available.'}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            onClick={handleGrant}
            disabled={busy || windowClosed}
            className="flex-1 rounded-xl bg-[#A82323] px-4 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#8C1818] disabled:bg-stone-300 cursor-pointer disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-location-arrow mr-2"></i>
            {isVi ? 'Đồng ý & bật chia sẻ' : 'Agree & start sharing'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
          >
            {windowClosed
              ? isVi
                ? 'Đóng'
                : 'Close'
              : isVi
              ? 'Không, dùng điểm hẹn thủ công'
              : 'No, use the meeting point instead'}
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-stone-400">
          {isVi
            ? 'Từ chối vẫn xem được bản đồ điểm hẹn và chỉ đường — chỉ là không chia sẻ vị trí trực tiếp.'
            : 'Declining still shows the meeting point and directions — it just does not share your live position.'}
        </p>
      </div>
    </div>
  );
};
