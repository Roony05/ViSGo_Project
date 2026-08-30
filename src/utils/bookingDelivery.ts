import type { Booking, Language } from '../types';
import { getFirebase } from '../config/firebase';

export type BookingDeliveryResult =
  | { status: 'sent'; customerEmailSent: boolean; hostEmailSent: boolean; hostCalendarInvited: boolean }
  | { status: 'unavailable'; reason: string }
  | { status: 'failed'; reason: string };

/**
 * Asks the authenticated backend to send both system emails and invite the
 * host to the system-owned Calendar event. No Gmail access is requested from
 * the traveller: the sender is the ViS-Go Workspace account configured on the
 * server.
 */
export type BookingDeliveryEvent = 'reserved' | 'confirmed' | 'cancelled';

export async function deliverBookingEvent(
  booking: Booking,
  language: Language,
  durationHours: number,
  event: BookingDeliveryEvent,
): Promise<BookingDeliveryResult> {
  const firebase = await getFirebase();
  const user = firebase?.auth.currentUser;
  const expectedUid = event === 'confirmed' ? booking.hostId : booking.customerId;
  if (!user || user.uid !== expectedUid) {
    return { status: 'unavailable', reason: 'FIREBASE_SESSION_REQUIRED' };
  }

  try {
    // Storage mirrors the new booking with an 800ms write coalescer. Waiting
    // here keeps the email endpoint from looking for the document before that
    // first write has reached Firestore.
    await new Promise((resolve) => window.setTimeout(resolve, 1_100));
    const idToken = await user.getIdToken();
    const response = await fetch('/api/booking-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id, idToken, language, durationHours, event }),
    });
    const result = (await response.json()) as {
      ok?: boolean;
      reason?: string;
      customerEmailSent?: boolean;
      hostEmailSent?: boolean;
      hostCalendarInvited?: boolean;
    };
    if (result.ok) {
      return {
        status: 'sent',
        customerEmailSent: Boolean(result.customerEmailSent),
        hostEmailSent: Boolean(result.hostEmailSent),
        hostCalendarInvited: Boolean(result.hostCalendarInvited),
      };
    }
    if (result.reason === 'WORKSPACE_NOT_CONFIGURED') {
      return { status: 'unavailable', reason: result.reason };
    }
    return { status: 'failed', reason: result.reason || `HTTP_${response.status}` };
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : String(error) };
  }
}

export const deliverNewBooking = (booking: Booking, language: Language, durationHours: number) =>
  deliverBookingEvent(booking, language, durationHours, 'reserved');
