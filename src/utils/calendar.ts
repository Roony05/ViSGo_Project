/**
 * Google Calendar integration for ViS-Go bookings.
 *
 * Two paths, chosen automatically:
 *   1. OAUTH   — VITE_GOOGLE_CLIENT_ID is set: inserts a real event into the
 *                user's primary calendar via the Calendar API, with a reminder.
 *   2. TEMPLATE— no client ID: opens the official Google Calendar TEMPLATE URL
 *                pre-filled with the same data; the user clicks "Save".
 *
 * Both are real Google Calendar. Neither costs anything.
 */

import { Booking, Language, Tour } from '../types';
import { GOOGLE_SCOPES, HAS_GOOGLE_OAUTH, VN_TIMEZONE } from '../config/env';
import { getAccessToken, GoogleAuthError } from './googleAuth';
import { buildGoogleMapsPlaceUrl } from './googleMaps';

export type CalendarMode = 'created' | 'template';

export interface CalendarResult {
  mode: CalendarMode;
  /** Direct link to the created event, when the API path succeeded. */
  eventUrl?: string;
  degradedReason?: string;
}

/** Default tour length used when the source tour is not available. */
const DEFAULT_DURATION_HOURS = 3;

interface EventTimes {
  /** Local wall-clock, no zone suffix: "20260820T180000". */
  startCompact: string;
  endCompact: string;
  /** RFC 3339 local date-time: "2026-08-20T18:00:00". */
  startRfc: string;
  endRfc: string;
}

/**
 * Computes start/end from the booking date, time and duration.
 *
 * The previous implementation clamped the end hour at 23 and emitted no
 * timezone, so an evening tour either lost time or landed in the wrong hour for
 * anyone outside UTC+7. Here the arithmetic rolls over into the next day and
 * every value is explicitly tagged Asia/Ho_Chi_Minh.
 */
function computeEventTimes(booking: Booking, durationHours: number): EventTimes | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(booking.bookingDate.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})/.exec(booking.bookingTime.trim());
  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  // Build in UTC then read back in UTC: this treats the values as pure
  // wall-clock arithmetic, immune to the browser's own timezone.
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour, minute, 0));
  const end = new Date(start.getTime() + Math.max(0.5, durationHours) * 3_600_000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const parts = (d: Date) => ({
    y: d.getUTCFullYear(),
    m: pad(d.getUTCMonth() + 1),
    d: pad(d.getUTCDate()),
    h: pad(d.getUTCHours()),
    min: pad(d.getUTCMinutes()),
  });

  const s = parts(start);
  const e = parts(end);

  return {
    startCompact:`${s.y}${s.m}${s.d}T${s.h}${s.min}00`,
    endCompact:`${e.y}${e.m}${e.d}T${e.h}${e.min}00`,
    startRfc:`${s.y}-${s.m}-${s.d}T${s.h}:${s.min}:00`,
    endRfc:`${e.y}-${e.m}-${e.d}T${e.h}:${e.min}:00`,
  };
}

function buildEventTitle(booking: Booking, language: Language): string {
  const title = language === 'vi' ? booking.tourTitleVi || booking.tourTitle : booking.tourTitle;
  return`[ViS-Go] ${title}`;
}

function buildEventDescription(booking: Booking, language: Language): string {
  const isVi = language === 'vi';
  const mapUrl = buildGoogleMapsPlaceUrl(booking.meetingPoint, booking.city);

  return isVi
    ? [
        'Trải nghiệm văn hoá cùng người bạn bản địa — ViS-Go ',
        '',
       `Mã đặt chỗ: #${booking.id}`,
       `Người bạn bản địa: ${booking.hostName} (${booking.hostPhone})`,
       `Số khách: ${booking.guestsCount}`,
       `Điểm hẹn: ${booking.meetingPoint}, ${booking.city}`,
       `Chỉ đường: ${mapUrl}`,
       `Trả cho host khi gặp: ${booking.totalPriceVND.toLocaleString('vi-VN')} ₫`,
        booking.notes ?`Ghi chú: ${booking.notes}` : '',
        '',
        'ViS-Go không thu tiền — bạn trả trực tiếp cho host khi gặp mặt.',
        'Hỗ trợ du khách 24/7 · Bật GPS Radar trước giờ hẹn 15 phút.',
      ]
        .filter(Boolean)
        .join('\n')
    : [
        'Authentic cultural experience with a verified local buddy — ViS-Go ',
        '',
       `Booking ref: #${booking.id}`,
       `Local buddy: ${booking.hostName} (${booking.hostPhone})`,
       `Travellers: ${booking.guestsCount}`,
       `Meeting point: ${booking.meetingPoint}, ${booking.city}`,
       `Directions: ${mapUrl}`,
       `Pay host when you meet: ${booking.totalPriceVND.toLocaleString('vi-VN')} VND`,
        booking.notes ?`Notes: ${booking.notes}` : '',
        '',
        'ViS-Go takes no payment — settle directly with your host when you meet.',
        '24/7 traveller support · Open the GPS Radar 15 minutes before departure.',
      ]
        .filter(Boolean)
        .join('\n');
}

/**
 * Builds the official Google Calendar TEMPLATE URL.
 *
 * Exported so the UI can render it as a plain <a href> — useful as a
 * right-click-to-copy affordance even when OAuth is available.
 */
export function createGoogleCalendarUrl(
  booking: Booking,
  language: Language = 'vi',
  durationHours: number = DEFAULT_DURATION_HOURS
): string {
  const times = computeEventTimes(booking, durationHours);
  if (!times) return 'https://calendar.google.com';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: buildEventTitle(booking, language),
    dates:`${times.startCompact}/${times.endCompact}`,
    details: buildEventDescription(booking, language),
    location:`${booking.meetingPoint}, ${booking.city}, Vietnam`,
    // Without ctz Google reads the timestamps in the viewer's own timezone,
    // which shifted every Vietnamese tour for international travellers.
    ctz: VN_TIMEZONE,
  });

  return`https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Looks up the real tour length so the event isn't always a flat 4 hours. */
export function resolveDurationHours(booking: Booking, tours: Tour[]): number {
  const tour = tours.find((t) => t.id === booking.tourId);
  return tour?.durationHours && tour.durationHours > 0 ? tour.durationHours : DEFAULT_DURATION_HOURS;
}

/**
 * Adds the booking to the user's Google Calendar.
 *
 * Call directly from a click handler — the OAuth path needs a user gesture.
 */
export async function addBookingToCalendar(
  booking: Booking,
  language: Language = 'vi',
  durationHours: number = DEFAULT_DURATION_HOURS
): Promise<CalendarResult> {
  const openTemplate = (): CalendarMode => {
    const url = createGoogleCalendarUrl(booking, language, durationHours);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) window.location.href = url;
    return 'template';
  };

  if (!HAS_GOOGLE_OAUTH) {
    return { mode: openTemplate() };
  }

  const times = computeEventTimes(booking, durationHours);
  if (!times) {
    return { mode: openTemplate(), degradedReason: 'Booking date or time could not be parsed' };
  }

  try {
    const token = await getAccessToken(GOOGLE_SCOPES.calendarEvents);
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none',
      {
        method: 'POST',
        headers: {
          Authorization:`Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: buildEventTitle(booking, language),
          description: buildEventDescription(booking, language),
          location:`${booking.meetingPoint}, ${booking.city}, Vietnam`,
          start: { dateTime: times.startRfc, timeZone: VN_TIMEZONE },
          end: { dateTime: times.endRfc, timeZone: VN_TIMEZONE },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 24 * 60 },
              { method: 'popup', minutes: 60 },
            ],
          },
          source: { title: 'ViS-Go', url: 'https://vis-go.vn' },
          colorId: '11', // Google's red — matches the ViS-Go brand.
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Calendar API ${response.status}: ${detail.slice(0, 200)}`);
    }

    const event = (await response.json()) as { htmlLink?: string };
    return { mode: 'created', eventUrl: event.htmlLink };
  } catch (err) {
    const reason =
      err instanceof GoogleAuthError ? err.message : err instanceof Error ? err.message : 'Unknown calendar error';
    console.warn('[ViS-Go] Calendar API insert failed, falling back to template link:', reason);
    return { mode: openTemplate(), degradedReason: reason };
  }
}
