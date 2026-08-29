import { Tour, User, Booking, HostKycApplication, LocalVideo, TourReview, Language } from '../types';
import { mirror } from './cloudSync';

/**
 * The browser-side half of the store.
 *
 * There is no bundled dataset behind this any more, and that is deliberate.
 * Firestore holds the tours, the accounts, the bookings, the reviews and the
 * verification applications; `seed/fixtures.ts` puts them there once via `npm run seed`
 * and is never compiled into the app.
 *
 * What used to happen instead: `src/data/mockData.ts` was imported here as an
 * offline fallback, so its every field was shipped to every visitor and legible
 * with F12 — the demo accounts' email addresses, phone numbers, identity document
 * images, and the passwords that opened the admin panel. Deleting that import
 * is what closed it.
 *
 * localStorage keeps a narrower job: it is the render cache the components read
 * synchronously, and the offline copy that keeps a returning visitor's app
 * usable before Firestore answers. It is a cache, not a second database, so an
 * empty one simply means "not fetched yet" and `[]` is the honest answer.
 */
function read<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

const KEYS = {
  USERS: 'visgo_users_v1',
  ACTIVE_USER: 'visgo_active_user_v1',
  TOURS: 'visgo_tours_v1',
  BOOKINGS: 'visgo_bookings_v1',
  REVIEWS: 'visgo_reviews_v1',
  KYC: 'visgo_kyc_v1',
  VIDEOS: 'visgo_videos_v1',
  LANG: 'visgo_language_v1',
  CURRENCY: 'visgo_currency_v1',
  BANNER_DISMISSED: 'visgo_banner_dismissed_v1'
};

export const Storage = {
  getLanguage(): Language {
    const saved = localStorage.getItem(KEYS.LANG);
    return (saved === 'en' || saved === 'vi') ? saved : 'vi';
  },
  setLanguage(lang: Language): void {
    localStorage.setItem(KEYS.LANG, lang);
  },

  getCurrency(): 'VND' | 'USD' {
    return (localStorage.getItem(KEYS.CURRENCY) as 'VND' | 'USD') || 'VND';
  },
  setCurrency(curr: 'VND' | 'USD'): void {
    localStorage.setItem(KEYS.CURRENCY, curr);
  },

  isBannerDismissed(): boolean {
    return localStorage.getItem(KEYS.BANNER_DISMISSED) === 'true';
  },
  setBannerDismissed(dismissed: boolean): void {
    localStorage.setItem(KEYS.BANNER_DISMISSED, String(dismissed));
  },

  getUsers(): User[] {
    return read<User>(KEYS.USERS);
  },
  saveUsers(users: User[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  /**
   * Returns the signed-in user, or null when nobody is signed in.
   *
   * This used to auto-create a session from INITIAL_USERS[0] on first read,
   * which meant the app could never be in a logged-out state and "Log Out"
   * had nothing to clear.
   */
  getActiveUser(): User | null {
    const raw = localStorage.getItem(KEYS.ACTIVE_USER);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as User | null;
      return parsed && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  },
  setActiveUser(user: User): void {
    localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(user));
  },
  clearActiveUser(): void {
    localStorage.removeItem(KEYS.ACTIVE_USER);
  },

  getTours(): Tour[] {
    return read<Tour>(KEYS.TOURS);
  },
  saveTours(tours: Tour[]): void {
    localStorage.setItem(KEYS.TOURS, JSON.stringify(tours));
    mirror('tours', tours);
  },

  getBookings(): Booking[] {
    return read<Booking>(KEYS.BOOKINGS);
  },
  saveBookings(bookings: Booking[]): void {
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
    mirror('bookings', bookings);
  },

  getReviews(): TourReview[] {
    return read<TourReview>(KEYS.REVIEWS);
  },
  saveReviews(reviews: TourReview[]): void {
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(reviews));
    mirror('reviews', reviews);
  },

  getKycApplications(): HostKycApplication[] {
    return read<HostKycApplication>(KEYS.KYC);
  },
  saveKycApplications(kyc: HostKycApplication[]): void {
    localStorage.setItem(KEYS.KYC, JSON.stringify(kyc));
    mirror('kyc', kyc);
  },

  getLocalVideos(): LocalVideo[] {
    return read<LocalVideo>(KEYS.VIDEOS);
  },
  saveLocalVideos(videos: LocalVideo[]): void {
    localStorage.setItem(KEYS.VIDEOS, JSON.stringify(videos));
    mirror('videos', videos);
  },

  /** Replaces a collection from the cloud without re-mirroring it straight back. */
  hydrateLocal(
    collection: 'users' | 'tours' | 'bookings' | 'reviews' | 'kyc' | 'videos',
    rows: unknown[],
  ): void {
    const key = {
      users: KEYS.USERS,
      tours: KEYS.TOURS,
      bookings: KEYS.BOOKINGS,
      reviews: KEYS.REVIEWS,
      kyc: KEYS.KYC,
      videos: KEYS.VIDEOS,
    }[collection];
    localStorage.setItem(key, JSON.stringify(rows));
  }
};
