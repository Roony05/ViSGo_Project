import { Tour, User, Booking, HostKycApplication, TourReview, Language } from '../types';
import { INITIAL_USERS, INITIAL_TOURS, INITIAL_BOOKINGS, INITIAL_HOST_KYC, INITIAL_REVIEWS } from '../data/mockData';

const KEYS = {
  USERS: 'visgo_users_v1',
  ACTIVE_USER: 'visgo_active_user_v1',
  TOURS: 'visgo_tours_v1',
  BOOKINGS: 'visgo_bookings_v1',
  REVIEWS: 'visgo_reviews_v1',
  KYC: 'visgo_kyc_v1',
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
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  },
  saveUsers(users: User[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  getActiveUser(): User {
    const raw = localStorage.getItem(KEYS.ACTIVE_USER);
    if (!raw) {
      const defaultUser = INITIAL_USERS[0];
      localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS[0];
    }
  },
  setActiveUser(user: User): void {
    localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(user));
  },

  getTours(): Tour[] {
    const raw = localStorage.getItem(KEYS.TOURS);
    if (!raw) {
      localStorage.setItem(KEYS.TOURS, JSON.stringify(INITIAL_TOURS));
      return INITIAL_TOURS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TOURS;
    }
  },
  saveTours(tours: Tour[]): void {
    localStorage.setItem(KEYS.TOURS, JSON.stringify(tours));
  },

  getBookings(): Booking[] {
    const raw = localStorage.getItem(KEYS.BOOKINGS);
    if (!raw) {
      localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_BOOKINGS;
    }
  },
  saveBookings(bookings: Booking[]): void {
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
  },

  getReviews(): TourReview[] {
    const raw = localStorage.getItem(KEYS.REVIEWS);
    if (!raw) {
      localStorage.setItem(KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
      return INITIAL_REVIEWS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_REVIEWS;
    }
  },
  saveReviews(reviews: TourReview[]): void {
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(reviews));
  },

  getKycApplications(): HostKycApplication[] {
    const raw = localStorage.getItem(KEYS.KYC);
    if (!raw) {
      localStorage.setItem(KEYS.KYC, JSON.stringify(INITIAL_HOST_KYC));
      return INITIAL_HOST_KYC;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_HOST_KYC;
    }
  },
  saveKycApplications(kyc: HostKycApplication[]): void {
    localStorage.setItem(KEYS.KYC, JSON.stringify(kyc));
  }
};
