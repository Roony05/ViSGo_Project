/**
 * Document ids that cannot collide.
 *
 * Every id here becomes a Firestore document key, and a Firestore write is an
 * upsert: two records that pick the same id do not both exist, one replaces the
 * other. So an id generator is not a formatting detail, it is the thing keeping
 * two travellers' records apart.
 *
 * What this replaced, and why it mattered:
 *
 *   `VIS-${Math.floor(1000 + Math.random() * 9000)}`
 *
 * That is nine thousand possible booking codes. By the birthday bound a
 * collision is already more likely than not at about 110 bookings — not 9,000 —
 * and the second booking would be written straight over the first. Worse for
 * this app in particular: the booking id is also the conversation id, so a
 * collision would drop two unrelated people into one another's chat thread.
 *
 * Timestamps alone are not enough either. `tour_${Date.now()}` is unique only
 * against the same device's own clock; two hosts publishing in the same
 * millisecond, or one device whose clock steps backwards, produce the same id.
 *
 * So: milliseconds for rough ordering and readability, plus real randomness
 * from the platform CSPRNG for uniqueness.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Crockford-ish base32: no I, L, O or U.
 *
 * Booking codes get read down the phone and typed back into a support form, and
 * those four are the characters people get wrong — I/1, O/0, and U because it
 * turns up in words nobody wants printed on a receipt.
 */
function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

/**
 * A booking reference, shown to travellers and hosts: `VIS-M8K2QX-7F3A`.
 *
 * The time part sorts roughly chronologically and the random part carries the
 * uniqueness — 32^4 ≈ 1.05 million per millisecond, which is a collision
 * probability of about one in a million even for two bookings confirmed in the
 * very same millisecond.
 */
export function newBookingCode(): string {
  const stamp = Date.now().toString(32).toUpperCase();
  return `VIS-${stamp}-${randomToken(4)}`;
}

/**
 * An internal id for anything else — a tour, a review, an itinerary stop.
 *
 * Not shown to users, so it trades readability for a wider random part.
 */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(32)}${randomToken(8).toLowerCase()}`;
}
