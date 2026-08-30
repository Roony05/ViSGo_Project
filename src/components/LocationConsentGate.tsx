/**
 * The screen that stands between opening the Live Radar and any coordinate
 * being read.
 *
 * Consent copy is written to be specific rather than reassuring: who sees the
 * location, for how long, what is stored, and how to stop. A generic "we value
 * your privacy" panel would be worse than nothing here, because the traveller
 * is deciding whether to broadcast their physical position to a stranger.
 *
 */

import React from 'react';
import { Booking, Language } from '../types';
import { meetingTimeOf, shareWindow } from '../utils/locationSharing';
import { sounds } from '../utils/audio';

interface LocationConsentGateProps {
  booking: Booking;
  language: Language;
  /** Called once consent is given. */
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

  const handleGrant = () => {
    sounds.playTap();
    onGrant();
  };

  const rules = isVi
    ? [
        { icon: 'fa-user-shield', text: 'Radar chỉ đọc GPS **trên thiết bị này** để hiển thị vị trí của bạn; hiện chưa đồng bộ vị trí trực tiếp cho host.' },
        { icon: 'fa-clock', text: `Bắt đầu **1 giờ trước** giờ hẹn (${meetLabel}) và **tự tắt** khi tour kết thúc, tối đa 8 giờ.` },
        { icon: 'fa-database', text: 'ViS-Go **không lưu lịch sử di chuyển**. Chỉ khi bạn xác nhận SOS, một tọa độ mới được gửi tới admin.' },
        { icon: 'fa-toggle-off', text: 'Bạn có thể tắt chia sẻ GPS bất cứ lúc nào. Cảnh báo SOS đã gửi chỉ admin mới được đóng sau khi xử lý.' },
        { icon: 'fa-eye', text: 'Khi đang bật, luôn có dải báo hiển thị trên màn hình – không bao giờ chạy ngầm.' },
      ]
    : [
        { icon: 'fa-user-shield', text: 'The radar reads GPS **on this device only** to show your position; live host syncing is not implemented yet.' },
        { icon: 'fa-clock', text: `Starts **1 hour before** the meeting time (${meetLabel}) and **stops by itself** when the tour ends, 8 hours maximum.` },
        { icon: 'fa-database', text: 'ViS-Go **stores no location history**. One coordinate is sent to admins only when you confirm SOS.' },
        { icon: 'fa-toggle-off', text: 'You can stop routine GPS sharing at any time. A submitted SOS stays open until an admin resolves it.' },
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
              {isVi ? 'Bật GPS Radar cho buổi gặp này?' : 'Enable GPS Radar for this meetup?'}
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
            disabled={windowClosed}
            className="flex-1 rounded-xl bg-[#A82323] px-4 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#8C1818] disabled:bg-stone-300 cursor-pointer disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-location-arrow mr-2"></i>
              {isVi ? 'Đồng ý & bật GPS' : 'Agree & enable GPS'}
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
            ? 'Từ chối vẫn xem được bản đồ điểm hẹn và chỉ đường — Radar sẽ không đọc GPS của thiết bị.'
            : 'Declining still shows the meeting point and directions — the radar will not read device GPS.'}
        </p>
      </div>
    </div>
  );
};
