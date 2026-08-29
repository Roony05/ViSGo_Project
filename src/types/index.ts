export type Language = 'en' | 'vi';
export type UserRole = 'customer' | 'host' | 'admin';
/** @deprecated Read-only compatibility for tour documents created before August 2026. */
export type TourAudience = 'vi' | 'en' | 'bilingual';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar: string;
  bio?: string;
  bioVi?: string;
  tagline?: string;
  taglineVi?: string;
  languages?: string[];
  specialties?: string[];
  city?: string;
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
  totalEarnings?: number;
  completedTours?: number;
  isAcceptingGuests?: boolean;
  currentLat?: number;
  currentLng?: number;
}

export interface TourStop {
  id: string;
  time: string;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  locationName: string;
  lat?: number;
  lng?: number;
}

export interface TourReview {
  id: string;
  tourId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userCountry: string;
  rating: number;
  date: string;
  comment: string;
  tags?: string[];
}

export interface Tour {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostPhone: string;
  hostRating: number;
  hostReviewCount: number;
  hostVerified: boolean;
  hostBio?: string;
  hostBioVi?: string;
  hostLanguages?: string[];
  hostSpecialties?: string[];
  /** @deprecated Only used to infer languages for legacy rows. */
  audience?: TourAudience;
  /** Stable codes for every language the host can genuinely guide this tour in. */
  tourLanguages?: string[];
  title: string;
  titleVi: string;
  tagline: string;
  taglineVi: string;
  city: 'Hà Nội' | 'TP. Hồ Chí Minh' | 'Đà Nẵng' | 'Hội An' | 'Đà Lạt' | 'Huế' | 'Ninh Bình' | 'Sa Pa';
  category: 'street-food' | 'hidden-gems' | 'nightlife' | 'heritage' | 'craft-art' | 'nature-trek';
  durationHours: number;
  priceVND: number;
  priceUSD: number;
  maxGroupSize: number;
  languages: string[];
  meetingPoint: string;
  meetingPointVi: string;
  lat: number;
  lng: number;
  coverImage: string;
  /**
   * A YouTube link introducing the place, pasted by the host.
   *
   * The URL is stored as given and parsed at render time — see
   * `src/utils/youtube.ts`, which is the only thing allowed to decide what
   * reaches an iframe.
   */
  videoUrl?: string;
  galleryImages: string[];
  included: string[];
  includedVi: string[];
  stops: TourStop[];
  description: string;
  descriptionVi: string;
  featured?: boolean;
  createdAt: string;
  status: 'active' | 'pending' | 'draft';
}

export interface Booking {
  id: string;
  tourId: string;
  tourTitle: string;
  tourTitleVi: string;
  tourImage: string;
  city: string;
  hostId: string;
  hostName: string;
  hostPhone: string;
  hostAvatar: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guestsCount: number;
  totalPriceVND: number;
  totalPriceUSD: number;
  /**
   * ViS-Go's commission on this booking, owed by the host.
   *
   * It is NOT money the traveller hands over separately, and it is not held by
   * anyone: nothing on this platform takes a payment. The traveller settles the
   * full price with the host directly when they meet; this figure is what the
   * host owes ViS-Go out of it, and it is shown on the host's own dashboard
   * rather than in a traveller's price breakdown.
   */
  platformFeeVND: number;
  /**
   * A booking starts 'pending' and the host decides.
   *
   * There is no payment step, so nothing else can confirm it. `paymentMethod`
   * used to sit beside this field, offering VNPay, MoMo, a card and cash —
   * none of which charged anything. It was removed rather than left as a
   * decoration on a record that decides whether two strangers meet.
   */
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  notes?: string;
  hasReviewed?: boolean;
  meetingPoint: string;
}

/**
 * One message in a booking's conversation.
 *
 * Stored at `conversations/{bookingId}/messages/{id}` and never edited after
 * it is written — a thread that can be rewritten is no use when a traveller and
 * a host disagree about what was arranged.
 */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  /**
   * Set by the server, not the sender's clock. `null` for the fraction of a
   * second between the local write and the server's acknowledgement, which is
   * also what `pending` reports.
   */
  createdAt: Date | null;
  /** True while the write is still queued locally — rendered as a clock icon. */
  pending?: boolean;
}

/** The conversation attached to a booking. Its id *is* the booking id. */
export interface Conversation {
  id: string;
  bookingId: string;
  participants: string[];
  tourTitle: string;
  city: string;
  lastMessage: string;
  lastSenderId: string;
  lastMessageAt: Date | null;
  /** Per-participant read marker, keyed by uid. */
  lastReadAt: Record<string, Date | null>;
}

/**
 * A host's identity declaration, reviewed by an administrator.
 *
 * WHAT THIS IS NOT. It is a typed form, not a check against the national
 * population database. Nothing here proves the card exists — that requires a
 * connection to C06 through a licensed integrator, which is open to registered
 * organisations under contract and to nobody else. So this collects what the
 * host declares, checks it is internally well-formed, and puts it in front of a
 * person to decide. The badge it leads to means "an administrator looked",
 * which is worth saying plainly wherever the badge is shown.
 *
 * WHAT WAS REMOVED, AND WHY. Photographs of the ID card and a selfie holding
 * it, an `identityMatchScore`, a `criminalRecordStatus`, a language
 * certificate and a years-of-experience count. The three scores were never
 * computed by anything — they were fixed numbers in the fixtures, printed as
 * though a system had produced them. The images were worse than useless: from
 * 1 January 2026, Nghị định 356/2025/NĐ-CP classes a picture of a citizen ID
 * card as sensitive personal data, and holding one in Firestore (US-hosted)
 * pulls in the cross-border transfer duties of Luật 91/2025/QH15. Not storing
 * the image is the cheapest possible compliance, and it costs this form
 * nothing.
 */
export interface HostKycApplication {
  id: string;
  hostId: string;
  /** Full name exactly as printed on the card. */
  fullName: string;
  /** Vietnamese citizen ID: exactly 12 digits, kept as a string so the leading zero survives. */
  cccdNumber: string;
  /** ISO `yyyy-mm-dd`, so it sorts and parses without a locale. */
  dateOfBirth: string;
  nationality: string;
  /** Permanent address as printed on the card. */
  address: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

/**
 * A YouTube video introducing a place, put on the site by an administrator.
 *
 * Separate from `Tour.videoUrl`, which is a host's own optional video on their
 * own listing. These belong to the platform: they play on the Explore page for
 * every visitor, so only an admin can add one — see firestore.rules.
 *
 * The URL is stored as pasted and parsed at render time by
 * `src/utils/youtube.ts`, which is the only thing allowed to decide what
 * reaches an iframe.
 */
export interface LocalVideo {
  id: string;
  /** Province or city this introduces, matching the names in data/provinces.ts. */
  city: string;
  url: string;
  title: string;
  titleVi: string;
  /** Lower shows first. */
  order: number;
  /** Hidden without deleting — a video pulled from YouTube, say. */
  active: boolean;
  createdAt: string;
}
