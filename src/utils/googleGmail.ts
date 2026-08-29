/**
 * Real Gmail delivery for booking confirmations.
 *
 * Two paths, chosen automatically:
 *   1. OAUTH  — VITE_GOOGLE_CLIENT_ID is set: sends the email through the Gmail
 *               API from the signed-in user's own account. Nothing to click.
 *   2. COMPOSE— no client ID: opens Gmail's compose window pre-filled with the
 *               same content, and falls back to mailto: if popups are blocked.
 *
 * Both paths send genuine email. Neither costs anything.
 */

import { Booking, Language } from '../types';
import { GOOGLE_SCOPES, HAS_GOOGLE_OAUTH } from '../config/env';
import { getAccessToken, GoogleAuthError } from './googleAuth';
import { buildGoogleMapsPlaceUrl } from './googleMaps';

export type MailDeliveryMode = 'sent' | 'compose' | 'mailto';

export interface MailResult {
  mode: MailDeliveryMode;
  /** Populated when OAuth sending failed and we degraded to a link. */
  degradedReason?: string;
}

const formatVnd = (n: number): string => `${n.toLocaleString('vi-VN')} ₫`;

/** Subject line for the confirmation email. */
export function buildSubject(booking: Booking, language: Language): string {
  return language === 'vi'
    ? `[ViS-Go] Xác nhận đặt tour #${booking.id} — ${booking.tourTitleVi || booking.tourTitle}`
    : `[ViS-Go] Booking confirmed #${booking.id} — ${booking.tourTitle}`;
}

/** Plain-text body, used for the compose/mailto path and as the MIME alt part. */
export function buildPlainTextBody(booking: Booking, language: Language): string {
  const isVi = language === 'vi';
  const title = isVi ? booking.tourTitleVi || booking.tourTitle : booking.tourTitle;
  const mapUrl = buildGoogleMapsPlaceUrl(booking.meetingPoint, booking.city);

  const lines = isVi
    ? [
        `Xin chào ${booking.customerName},`,
        '',
        `Đặt chỗ của bạn cho trải nghiệm "${title}" đã được xác nhận.`,
        '',
        '--- CHI TIẾT CHUYẾN ĐI ---',
        `Mã đặt chỗ:   #${booking.id}`,
        `Ngày & giờ:   ${booking.bookingDate} lúc ${booking.bookingTime}`,
        `Điểm hẹn:     ${booking.meetingPoint}, ${booking.city}`,
        `Chỉ đường:    ${mapUrl}`,
        `Người bạn bản địa: ${booking.hostName} (${booking.hostPhone})`,
        `Số khách:     ${booking.guestsCount}`,
        `Trả cho host: ${formatVnd(booking.totalPriceVND)} (trực tiếp khi gặp mặt)`,
        booking.notes ? `Ghi chú:      ${booking.notes}` : '',
        '',
        '--- AN TOÀN ---',
        'ViS-Go không thu tiền và không giữ tiền hộ. Bạn trả trực tiếp cho host',
        'khi gặp mặt. Hãy bật GPS Radar trước giờ hẹn 15 phút để dễ dàng tìm thấy',
        'người bạn bản địa của bạn.',
        '',
        'Chúc bạn có một chuyến đi thật đáng nhớ!',
        'Đội ngũ ViS-Go',
      ]
    : [
        `Hello ${booking.customerName},`,
        '',
        `Your booking for "${title}" is confirmed.`,
        '',
        '--- TRIP DETAILS ---',
        `Booking ref:  #${booking.id}`,
        `Date & time:  ${booking.bookingDate} at ${booking.bookingTime}`,
        `Meeting point: ${booking.meetingPoint}, ${booking.city}`,
        `Directions:   ${mapUrl}`,
        `Local buddy:  ${booking.hostName} (${booking.hostPhone})`,
        `Travellers:   ${booking.guestsCount}`,
        `Pay the host: ${formatVnd(booking.totalPriceVND)} (in person, when you meet)`,
        booking.notes ? `Notes:        ${booking.notes}` : '',
        '',
        '--- SAFETY ---',
        'ViS-Go neither takes nor holds your money. You settle directly with your',
        'host when you meet. Open the GPS Radar 15 minutes before the meeting',
        'time to locate your local buddy easily.',
        '',
        'Have an unforgettable trip!',
        'The ViS-Go Team',
      ];

  return lines.filter((l) => l !== '').join('\n');
}

/** Branded HTML body used for the OAuth (Gmail API) path. */
function buildHtmlBody(booking: Booking, language: Language): string {
  const isVi = language === 'vi';
  const title = isVi ? booking.tourTitleVi || booking.tourTitle : booking.tourTitle;
  const mapUrl = buildGoogleMapsPlaceUrl(booking.meetingPoint, booking.city);

  const l = isVi
    ? {
        greeting: `Xin chào ${booking.customerName},`,
        confirmed: 'Đặt chỗ của bạn đã được xác nhận',
        intro: `Trải nghiệm <strong>${title}</strong> đã sẵn sàng. Dưới đây là toàn bộ thông tin chuyến đi của bạn.`,
        ref: 'Mã đặt chỗ',
        when: 'Ngày & giờ',
        where: 'Điểm hẹn',
        directions: 'Xem chỉ đường trên Google Maps',
        host: 'Người bạn bản địa',
        guests: 'Số khách',
        total: 'Trả cho host',
        safety: 'ViS-Go <strong>không thu tiền và không giữ tiền hộ</strong>. Bạn trả trực tiếp cho host khi gặp mặt.',
        footer: 'Chúc bạn có một chuyến đi thật đáng nhớ! — Đội ngũ ViS-Go',
      }
    : {
        greeting: `Hello ${booking.customerName},`,
        confirmed: 'Your booking is confirmed',
        intro: `Your <strong>${title}</strong> experience is all set. Here is everything you need.`,
        ref: 'Booking ref',
        when: 'Date & time',
        where: 'Meeting point',
        directions: 'Open directions in Google Maps',
        host: 'Local buddy',
        guests: 'Travellers',
        total: 'Pay the host',
        safety: 'ViS-Go <strong>neither takes nor holds your money</strong>. You settle with your host directly when you meet.',
        footer: 'Have an unforgettable trip! — The ViS-Go Team',
      };

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:#78716c;font-size:13px;width:150px;">${label}</td>
      <td style="padding:8px 0;color:#1f2937;font-size:13px;font-weight:600;">${value}</td>
    </tr>`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf8f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">
    <div style="background:linear-gradient(135deg,#a82323,#690e0e);padding:24px;color:#ffffff;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">ViS-Go</div>
      <div style="font-size:12px;color:#fca5a5;margin-top:2px;">Vietnam · Second Home · Just Go</div>
      <div style="font-size:17px;font-weight:700;margin-top:16px;color:#d4af37;">🎉 ${l.confirmed}</div>
    </div>

    <div style="padding:24px;">
      <p style="margin:0 0 6px;color:#1f2937;font-size:14px;">${l.greeting}</p>
      <p style="margin:0 0 18px;color:#57534e;font-size:14px;line-height:1.6;">${l.intro}</p>

      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e7e5e4;">
        ${row(l.ref, `#${booking.id}`)}
        ${row(l.when, `${booking.bookingDate} · ${booking.bookingTime}`)}
        ${row(l.where, `${booking.meetingPoint}, ${booking.city}`)}
        ${row(l.host, `${booking.hostName} · ${booking.hostPhone}`)}
        ${row(l.guests, String(booking.guestsCount))}
        ${row(l.total, formatVnd(booking.totalPriceVND))}
      </table>

      <a href="${mapUrl}" style="display:inline-block;margin-top:18px;padding:11px 18px;background:#a82323;color:#ffffff;text-decoration:none;border-radius:10px;font-size:13px;font-weight:700;">📍 ${l.directions}</a>

      <div style="margin-top:20px;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;color:#78350f;font-size:12px;line-height:1.6;">
        🛡️ ${l.safety}
      </div>

      <p style="margin:22px 0 0;color:#a8a29e;font-size:12px;">${l.footer}</p>
    </div>
  </div>
</body></html>`;
}

/**
 * Base64url-encodes a string containing arbitrary Unicode.
 *
 * btoa() only accepts Latin-1, and Vietnamese diacritics are outside it —
 * encoding the UTF-8 bytes first is what keeps "Hà Nội" from becoming mojibake.
 */
function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Encodes a header value that may contain non-ASCII, per RFC 2047. */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${base64UrlEncode(value).replace(/-/g, '+').replace(/_/g, '/')}?=`;
}

/** Builds an RFC 2822 multipart/alternative message. */
function buildMimeMessage(booking: Booking, language: Language): string {
  const boundary = `visgo_${Date.now().toString(36)}`;
  const subject = buildSubject(booking, language);

  return [
    `To: ${booking.customerEmail}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    buildPlainTextBody(booking, language),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    buildHtmlBody(booking, language),
    '',
    `--${boundary}--`,
  ].join('\r\n');
}

/** Gmail web compose URL, pre-filled. Works for anyone with a Gmail session. */
export function buildGmailComposeUrl(booking: Booking, language: Language): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: booking.customerEmail,
    su: buildSubject(booking, language),
    body: buildPlainTextBody(booking, language),
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** mailto: URL — the universal fallback when popups are blocked. */
export function buildMailtoUrl(booking: Booking, language: Language): string {
  const params = new URLSearchParams({
    subject: buildSubject(booking, language),
    body: buildPlainTextBody(booking, language),
  });
  return `mailto:${booking.customerEmail}?${params.toString()}`;
}

/** Opens the pre-filled compose window, degrading to mailto: if blocked. */
function openComposeFallback(booking: Booking, language: Language): MailDeliveryMode {
  const win = window.open(buildGmailComposeUrl(booking, language), '_blank', 'noopener,noreferrer');
  if (win) return 'compose';
  window.location.href = buildMailtoUrl(booking, language);
  return 'mailto';
}

/**
 * Sends the booking confirmation email.
 *
 * Call this straight from a click handler — the OAuth path needs a user gesture.
 */
export async function sendBookingEmail(booking: Booking, language: Language): Promise<MailResult> {
  if (!HAS_GOOGLE_OAUTH) {
    return { mode: openComposeFallback(booking, language) };
  }

  try {
    const token = await getAccessToken(GOOGLE_SCOPES.gmailSend);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64UrlEncode(buildMimeMessage(booking, language)) }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gmail API ${response.status}: ${detail.slice(0, 200)}`);
    }

    return { mode: 'sent' };
  } catch (err) {
    // Any failure — denied consent, blocked popup, quota, offline — still
    // leaves the traveller with a working way to get their itinerary.
    const reason =
      err instanceof GoogleAuthError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Unknown Gmail error';
    console.warn('[ViS-Go] Gmail API send failed, falling back to compose:', reason);
    return { mode: openComposeFallback(booking, language), degradedReason: reason };
  }
}
