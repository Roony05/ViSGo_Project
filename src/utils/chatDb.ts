/**
 * Real messaging between a traveller and their host, stored in Firestore.
 *
 * SHAPE
 *
 *   conversations/{bookingId}
 *       participants  [customerUid, hostUid]
 *       tourTitle, city, bookingId
 *       lastMessage, lastSenderId, lastMessageAt
 *       lastReadAt    { uid: Timestamp }
 *
 *   conversations/{bookingId}/messages/{messageId}
 *       senderId, senderName, senderRole, text, createdAt
 *
 * Four decisions worth knowing before changing anything here.
 *
 * 1. THE CONVERSATION ID *IS* THE BOOKING ID. No lookup, no directory, and no
 *    way to end up with two threads for one trip. It also lets the security
 *    rules reason about a conversation without joining anything.
 *
 * 2. MESSAGES ARE A SUBCOLLECTION, AND APPEND-ONLY. The rules refuse update
 *    outright. ViS-Go sells escrow protection, and when a traveller and a host
 *    disagree about where they agreed to meet, this thread is the evidence —
 *    evidence that can be edited afterwards is not evidence.
 *
 * 3. `lastMessage` IS COPIED ONTO THE PARENT. Denormalised on purpose: showing
 *    a list of conversations then costs one read per conversation instead of
 *    opening every thread to find its newest line.
 *
 * 4. TIME COMES FROM THE SERVER. `serverTimestamp()`, enforced by the rules as
 *    `createdAt == request.time`. A phone with a wrong clock would otherwise
 *    scatter its messages through the middle of the thread, and a dishonest one
 *    could backdate them.
 *
 * QUOTA. Sending costs 2 writes (the message, then the parent's summary line).
 * Opening a thread costs about 30 reads, and 1 more per message that arrives
 * while it is open. The Spark free tier allows 20,000 writes and 50,000 reads a
 * day; see COST.md for where that sits against everything else.
 */

import { getFirebase } from '../config/firebase';
import type { Booking, ChatMessage, Conversation, User } from '../types';

const COLLECTION = 'conversations';

/** How many messages load at once. Kept small: every document is a read. */
export const PAGE_SIZE = 30;

/** Firestore rejects anything longer; the rules enforce the same ceiling. */
export const MAX_MESSAGE_LENGTH = 2000;

type Millis = { toDate(): Date };

const toDate = (value: unknown): Date | null =>
  value && typeof (value as Millis).toDate === 'function' ? (value as Millis).toDate() : null;

/* ------------------------------------------------------------------ */
/* Opening a conversation                                              */
/* ------------------------------------------------------------------ */

/**
 * Returns the conversation for a booking, creating it on first use.
 *
 * Deliberately a read before a possible write: `setDoc(..., { merge: true })`
 * would be one call, but it would also rewrite `participants` on every open,
 * and the update rule exists precisely to keep that list immutable.
 */
export async function openConversation(
  booking: Booking,
  /**
   * False for an admin reading someone else's thread. They may look, but the
   * create rule requires the writer to be one of the two participants, so
   * attempting it would be denied — and on a trip where nobody has written yet
   * that denial would look like "you have no access" rather than "no messages".
   */
  mayCreate: boolean,
): Promise<Conversation | null> {
  const fb = await getFirebase();
  if (!fb) return null;

  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(fb.db, COLLECTION, booking.id);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as Record<string, unknown>;
    return {
      id: snap.id,
      bookingId: booking.id,
      tourId: (data.tourId as string) ?? booking.tourId,
      participants: (data.participants as string[]) ?? [],
      tourTitle: (data.tourTitle as string) ?? booking.tourTitle,
      city: (data.city as string) ?? booking.city,
      lastMessage: (data.lastMessage as string) ?? '',
      lastSenderId: (data.lastSenderId as string) ?? '',
      lastMessageAt: toDate(data.lastMessageAt),
      lastReadAt: Object.fromEntries(
        Object.entries((data.lastReadAt as Record<string, unknown>) ?? {}).map(([uid, at]) => [
          uid,
          toDate(at),
        ]),
      ),
    };
  }

  if (!mayCreate) return null;

  const participants = [booking.customerId, booking.hostId];
  const parties = {
    customerId: booking.customerId,
    hostId: booking.hostId,
    customerName: booking.customerName,
    hostName: booking.hostName,
    // A reference like `avatar:<uid>:<v>` or a URL is welcome here; an inlined
    // base64 portrait is not, and dropping it costs only the thumbnail.
    hostAvatar: (booking.hostAvatar ?? '').length <= 512 ? booking.hostAvatar ?? '' : '',
    hostPhone: booking.hostPhone ?? '',
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
  };
  await setDoc(ref, {
    bookingId: booking.id,
    tourId: booking.tourId,
    participants,
    tourTitle: booking.tourTitle,
    city: booking.city,
    ...parties,
    lastMessage: '',
    lastSenderId: '',
    lastMessageAt: serverTimestamp(),
    lastReadAt: {},
    createdAt: serverTimestamp(),
  });

  return {
    id: booking.id,
    bookingId: booking.id,
    tourId: booking.tourId,
    participants,
    tourTitle: booking.tourTitle,
    city: booking.city,
    ...parties,
    lastMessage: '',
    lastSenderId: '',
    lastMessageAt: null,
    lastReadAt: {},
  };
}

/**
 * Every thread this user belongs to, live.
 *
 * The host inbox exists because a traveller may now write *before* reserving,
 * to agree a date. That thread has no booking row behind it, so the host's
 * booking list cannot surface it and the message would arrive nowhere.
 *
 * No `orderBy` on the query: pairing `array-contains` with a sort on another
 * field needs a composite index, and a signed-in user has a handful of threads.
 * Sorting the page in memory costs nothing and keeps deployment to rules alone.
 */
export async function subscribeUserConversations(
  uid: string,
  onRows: (rows: Conversation[]) => void,
  onError?: (err: unknown) => void,
): Promise<() => void> {
  const fb = await getFirebase();
  if (!fb) return () => undefined;

  const { collection, onSnapshot, query, where } = await import('firebase/firestore');
  return onSnapshot(
    query(collection(fb.db, COLLECTION), where('participants', 'array-contains', uid)),
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const participants = (data.participants as string[]) ?? [];
        return {
          id: d.id,
          bookingId: (data.bookingId as string) ?? d.id,
          tourId: data.tourId as string | undefined,
          participants,
          tourTitle: (data.tourTitle as string) ?? '',
          city: (data.city as string) ?? '',
          lastMessage: (data.lastMessage as string) ?? '',
          lastSenderId: (data.lastSenderId as string) ?? '',
          lastMessageAt: toDate(data.lastMessageAt),
          lastReadAt: Object.fromEntries(
            Object.entries((data.lastReadAt as Record<string, unknown>) ?? {}).map(([who, at]) => [
              who,
              toDate(at),
            ]),
          ),
          customerId: (data.customerId as string) ?? participants[0],
          hostId: (data.hostId as string) ?? participants[1],
          customerName: data.customerName as string | undefined,
          hostName: data.hostName as string | undefined,
          hostAvatar: data.hostAvatar as string | undefined,
          hostPhone: data.hostPhone as string | undefined,
          bookingDate: data.bookingDate as string | undefined,
          bookingTime: data.bookingTime as string | undefined,
        } satisfies Conversation;
      });
      rows.sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));
      onRows(rows);
    },
    (err) => onError?.(err),
  );
}

/* ------------------------------------------------------------------ */
/* Live thread                                                         */
/* ------------------------------------------------------------------ */

export interface ThreadUpdate {
  messages: ChatMessage[];
  /** True when the first page came back full, so older messages may exist. */
  hasMore: boolean;
}

/**
 * Streams the newest page of a thread, and keeps it live.
 *
 * The query is `desc` + `limit` so that "newest 30" is one indexed read rather
 * than a scan; the result is reversed for display. Without the limit this would
 * re-read the entire history every time the listener reconnected.
 *
 * Returns its own unsubscribe function, or a no-op when Firebase is off.
 */
export async function subscribeToThread(
  bookingId: string,
  onUpdate: (update: ThreadUpdate) => void,
  onError?: (err: unknown) => void,
): Promise<() => void> {
  const fb = await getFirebase();
  if (!fb) return () => undefined;

  const { collection, limit, onSnapshot, orderBy, query } = await import('firebase/firestore');

  const q = query(
    collection(fb.db, COLLECTION, bookingId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );

  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            senderId: (data.senderId as string) ?? '',
            senderName: (data.senderName as string) ?? '',
            senderRole: (data.senderRole as ChatMessage['senderRole']) ?? 'customer',
            text: (data.text as string) ?? '',
            createdAt: toDate(data.createdAt),
            // A message this device just sent, not yet acknowledged. Firestore
            // shows it immediately from its local queue so the thread never
            // stalls waiting for the network.
            pending: d.metadata.hasPendingWrites,
          } satisfies ChatMessage;
        })
        .reverse();

      onUpdate({ messages, hasMore: snap.docs.length === PAGE_SIZE });
    },
    (err) => onError?.(err),
  );
}

/**
 * Fetches the page of messages immediately older than the ones on screen.
 *
 * A one-off read rather than a second listener: history does not change, so
 * paying to watch it would be paying for nothing.
 */
export async function loadOlderMessages(
  bookingId: string,
  oldest: ChatMessage | undefined,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const fb = await getFirebase();
  if (!fb || !oldest?.createdAt) return { messages: [], hasMore: false };

  const { collection, getDocs, limit, orderBy, query, startAfter } = await import('firebase/firestore');

  const snap = await getDocs(
    query(
      collection(fb.db, COLLECTION, bookingId, 'messages'),
      orderBy('createdAt', 'desc'),
      startAfter(oldest.createdAt),
      limit(PAGE_SIZE),
    ),
  );

  const messages = snap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        senderId: (data.senderId as string) ?? '',
        senderName: (data.senderName as string) ?? '',
        senderRole: (data.senderRole as ChatMessage['senderRole']) ?? 'customer',
        text: (data.text as string) ?? '',
        createdAt: toDate(data.createdAt),
        pending: false,
      } satisfies ChatMessage;
    })
    .reverse();

  return { messages, hasMore: snap.docs.length === PAGE_SIZE };
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

export type SendResult = 'sent' | 'empty' | 'too-long' | 'not-allowed' | 'failed';

/**
 * Appends a message, then refreshes the parent's summary line.
 *
 * Two writes, and only the first one matters: if the summary update is refused
 * or lost, the message itself is still in the thread and the next send repairs
 * the summary. So the message is written first and the summary is best-effort.
 */
export async function sendMessage(
  booking: Booking,
  sender: User,
  rawText: string,
): Promise<SendResult> {
  const text = rawText.trim();
  if (!text) return 'empty';
  if (text.length > MAX_MESSAGE_LENGTH) return 'too-long';

  // The rules will refuse this anyway; refusing here keeps an admin reading a
  // thread from being shown a send box that cannot work.
  if (sender.id !== booking.customerId && sender.id !== booking.hostId) return 'not-allowed';

  const fb = await getFirebase();
  if (!fb) return 'failed';

  try {
    const { addDoc, collection, doc, serverTimestamp, updateDoc } = await import('firebase/firestore');

    await addDoc(collection(fb.db, COLLECTION, booking.id, 'messages'), {
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      text,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(fb.db, COLLECTION, booking.id), {
      lastMessage: text.slice(0, 140),
      lastSenderId: sender.id,
      lastMessageAt: serverTimestamp(),
    }).catch((err: unknown) => {
      console.warn('[ViS-Go chat] Message sent, but the summary line did not update:', err);
    });

    return 'sent';
  } catch (err) {
    console.warn('[ViS-Go chat] Could not send:', err);
    return 'failed';
  }
}

/**
 * Marks the thread read for this participant.
 *
 * Only called when there is actually something newer than the last marker —
 * writing it on every open would spend a write per glance, and the free tier
 * allows 20,000 a day across the whole app.
 */
export async function markThreadRead(
  bookingId: string,
  uid: string,
  conversation: Conversation | null,
): Promise<void> {
  if (!conversation) return;

  const seenAt = conversation.lastReadAt[uid];
  const newest = conversation.lastMessageAt;
  if (newest && seenAt && seenAt >= newest) return;

  const fb = await getFirebase();
  if (!fb) return;

  try {
    const { doc, serverTimestamp, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(fb.db, COLLECTION, bookingId), {
      [`lastReadAt.${uid}`]: serverTimestamp(),
    });
  } catch (err) {
    // Losing a read marker is cosmetic; never surface it.
    console.warn('[ViS-Go chat] Could not update the read marker:', err);
  }
}
