import { Booking } from '../types';

export const createGoogleCalendarUrl = (booking: Booking): string => {
  // Format date and time for Google Calendar: YYYYMMDDTHHmmSSZ
  const dateParts = booking.bookingDate.split('-'); // e.g. "2026-08-20"
  const timeParts = booking.bookingTime.split(':'); // e.g. "18:00"
  
  if (dateParts.length !== 3 || timeParts.length < 2) {
    return 'https://calendar.google.com';
  }

  const year = dateParts[0];
  const month = dateParts[1];
  const day = dateParts[2];
  const hour = timeParts[0].padStart(2, '0');
  const min = timeParts[1].padStart(2, '0');

  const startIso = `${year}${month}${day}T${hour}${min}00`;
  
  // Estimate 4 hours tour duration
  const endHour = String(Math.min(23, parseInt(hour, 10) + 4)).padStart(2, '0');
  const endIso = `${year}${month}${day}T${endHour}${min}00`;

  const title = encodeURIComponent(`[ViS-Go] ${booking.tourTitle}`);
  const details = encodeURIComponent(
    `ViS-Go Cultural Experience in Vietnam\n` +
    `Booking ID: #${booking.id}\n` +
    `Local Buddy Host: ${booking.hostName} (${booking.hostPhone})\n` +
    `Guests: ${booking.guestsCount}\n` +
    `Meeting Location: ${booking.meetingPoint}\n` +
    `Notes: ${booking.notes || 'None'}\n\n` +
    `24/7 Traveler Support: ViS-Go Safety Escrow`
  );
  const location = encodeURIComponent(`${booking.meetingPoint}, ${booking.city}, Vietnam`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
};
