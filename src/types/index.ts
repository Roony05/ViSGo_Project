export type Language = 'en' | 'vi';
export type UserRole = 'customer' | 'host' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
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
  platformFeeVND: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  paymentMethod: 'vnpay' | 'momo' | 'card' | 'cash';
  createdAt: string;
  notes?: string;
  hasReviewed?: boolean;
  meetingPoint: string;
}

export interface ChatMessage {
  id: string;
  bookingId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface HostKycApplication {
  id: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  city: string;
  idCardFront: string;
  idCardBack: string;
  selfieWithId: string;
  criminalRecordStatus: 'clean' | 'pending' | 'flagged';
  identityMatchScore: number;
  languageCert: string;
  experienceYears: number;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}
