import React, { useState, useEffect } from 'react';
import { Tour, Booking, User, Language, UserRole, TourReview, HostKycApplication, LocalVideo } from './types';
import { Storage } from './utils/storage';
import { Navbar } from './components/Navbar';
import { CustomerView } from './components/CustomerView';
import { TourDetailPage } from './components/TourDetailPage';
import { CheckoutModal } from './components/CheckoutModal';
import { LiveRadarModal } from './components/LiveRadarModal';
import { ChatDrawer } from './components/ChatDrawer';
import { HostCreatorStudio } from './components/HostCreatorStudio';
import { HostDashboard } from './components/HostDashboard';
import { AdminHub } from './components/AdminHub';
import { MyBookingsView } from './components/MyBookingsView';
import { HostLeaderboardView } from './components/HostLeaderboardView';
import { ChatInboxModal, type InboxThread } from './components/ChatInboxModal';
import { ReviewModal } from './components/ReviewModal';
import { AuthModal } from './components/AuthModal';
import { AIAssistantPage } from './components/AIAssistantPage';
import { SettingsModal } from './components/SettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Sidebar } from './components/Sidebar';
import { FloatingAIBubble } from './components/FloatingAIBubble';
import { Footer } from './components/Footer';
import { VRHeritageView } from './components/VRHeritageView';
import { shouldSkipIntro } from './utils/introGate';
import { PageBackdrop } from './components/brand/PageBackdrop';

// Lazy so three.js is fetched only when the sequence actually plays.
const IntroSequence = React.lazy(() =>
  import('./components/IntroSequence').then((m) => ({ default: m.IntroSequence })),
);
import { ToastContainer, ToastMessage } from './components/Toast';
import { signOutGoogle } from './utils/googleAuth';
import { HAS_FIREBASE } from './config/firebase';
import { restoreFirebaseSession, signOutFirebase } from './utils/firebaseAuth';
import { cloudEnabled, hydrateFromCloud, hydrateOwned, setCloudIdentity, setSyncListener, type SyncState } from './utils/cloudSync';
import { deleteLocalVideo, reserveTourWithBooking, subscribeHostBookings, transitionBookingStatus, writeProfile } from './utils/firestoreDb';
import { deliverBookingEvent } from './utils/bookingDelivery';
import { subscribeUserConversations } from './utils/chatDb';
import type { Conversation } from './types';

/**
 * Every address the app answers to.
 *
 * A closed set, not `hash.slice(2)`: the hash is user input, and feeding it
 * straight into `activeTab` would let `#/<script>` reach the router. Anything
 * unrecognised — including an empty hash on a first visit — lands on Explore.
 */
const ROUTES = [
  'explore',
  'vr-heritage',
  'ai-assistant',
  'my-bookings',
  'host-ranking',
  'host-studio',
  'admin-hub',
] as const;

/**
 * The one address that carries a parameter: `#/tour/<id>`.
 *
 * A tour used to be a modal stacked over Explore, which meant it had no
 * address of its own — Back closed the whole catalogue instead of returning
 * to it, a reload lost the tour, and there was nothing to send to a friend.
 * It is a page now, so the id has to survive the round trip through the hash.
 */
interface Route {
  tab: string;
  tourId?: string;
}

function routeFromHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [head, ...rest] = raw.split('/');

  // Only the id is interpolated back out, and only after decoding — the hash
  // is user input, and the closed ROUTES set below is what keeps `#/<script>`
  // away from the router.
  if (head === 'tour' && rest[0]) {
    return { tab: 'tour', tourId: decodeURIComponent(rest.join('/')) };
  }
  return { tab: (ROUTES as readonly string[]).includes(head) ? head : 'explore' };
}

export default function App() {
  // Global State
  const [language, setLanguage] = useState<Language>(() => Storage.getLanguage());
  const [currency, setCurrency] = useState<'VND' | 'USD'>(() => Storage.getCurrency());
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => Storage.isBannerDismissed());
  
  const [users, setUsers] = useState<User[]>(() => Storage.getUsers());
  const [activeUser, setActiveUser] = useState<User | null>(() => Storage.getActiveUser());
  const [tours, setTours] = useState<Tour[]>(() => Storage.getTours());
  const [bookings, setBookings] = useState<Booking[]>(() => Storage.getBookings());
  const [reviews, setReviews] = useState<TourReview[]>(() => Storage.getReviews());
  const [kycApps, setKycApps] = useState<HostKycApplication[]>(() => Storage.getKycApplications());
  const [localVideos, setLocalVideos] = useState<LocalVideo[]>(() => Storage.getLocalVideos());

  /**
   * The current route.
   *
   * Mirrored into `location.hash` below, so every view is a real address: the
   * browser Back button works, a view survives a reload, and a link to the
   * assistant or to VR heritage can be shared.
   */
  const [activeTab, setActiveTab] = useState<string>(() => routeFromHash(window.location.hash).tab);
  const [routeTourId, setRouteTourId] = useState<string | null>(
    () => routeFromHash(window.location.hash).tourId ?? null,
  );
  const [syncState, setSyncState] = useState<SyncState>('idle');

  /**
   * True until the first Firestore pull finishes on a device that has nothing
   * cached yet. Only then is an empty catalogue really empty; before that it
   * just means the request is still in flight.
   */
  const [cloudLoading, setCloudLoading] = useState<boolean>(
    () => cloudEnabled() && Storage.getTours().length === 0,
  );
  // Decided once, synchronously, so the app never flashes before the intro.
  const [showIntro, setShowIntro] = useState<boolean>(() => !shouldSkipIntro());
  /**
   * A booking a signed-out visitor started. Bookings carry a real identity —
   * the host has to know who is showing up, and the traveller needs somewhere
   * to find the reservation later — so checkout requires an account. Rather
   * than discarding their work, the draft is parked here and replayed the
   * moment they finish signing in.
   */
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Modals & Drawers State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'register'>('login');
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  /** Which half of the host dashboard to land on. */
  const [hostSection, setHostSection] = useState<'bookings' | 'profile' | 'verify'>('bookings');

  /**
   * Navigation from the menus.
   *
   * Reaching the host dashboard from a nav link always means the bookings side.
   * Only the account modal's "Hồ sơ Host công khai" row asks for the other one,
   * and it sets `hostSection` itself — without this reset, one visit there
   * would make every later click on "Studio Chủ nhà" land on the profile
   * editor instead.
   */
  const goToTab = (tab: string) => {
    if (tab === 'host-studio') setHostSection('bookings');
    // Navigating away abandons an edit in progress. Keeping it would reopen the
    // form days later, filled with a listing the host had stopped thinking about.
    if (tab !== 'host-studio') setEditingTour(null);
    setActiveTab(tab);
  };
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  /** Navigates to a tour's own page. */
  const openTour = (tour: Tour) => {
    setRouteTourId(tour.id);
    setActiveTab('tour');
    window.scrollTo({ top: 0 });
  };
  const [draftBooking, setDraftBooking] = useState<{
    tour: Tour;
    date: string;
    time: string;
    guests: number;
    totalVND: number;
    totalUSD: number;
    platformFeeVND: number;
    discountVND: number;
    couponCode: string;
    specialNotes: string;
  } | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [radarModalOpen, setRadarModalOpen] = useState<boolean>(false);
  const [radarBooking, setRadarBooking] = useState<Booking | null>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState<boolean>(false);
  const [chatStartsWithCall, setChatStartsWithCall] = useState<boolean>(false);
  /**
   * The trip the chat drawer was opened *for*, when something named one.
   *
   * A traveller with two trips has two conversations with two different hosts,
   * so "open messages" is only answerable per booking. The global button in the
   * navbar falls back to `chatBooking` below; every per-trip button sets this.
   * An admin reading someone else's thread from the safety board sets it too.
   * Cleared on close, so the next generic open is the user's own again.
   */
  const [chatSubject, setChatSubject] = useState<Booking | null>(null);

  const openChatFor = (booking: Booking, startWithCall = false) => {
    setChatSubject(booking);
    setChatStartsWithCall(startWithCall);
    setInboxOpen(false);
    setChatDrawerOpen(true);
  };

  /**
   * The thread picker behind the generic "Messages" button.
   *
   * A host cannot reach a pre-booking enquiry through their booking list —
   * there is no booking yet — so the button opens the list of conversations
   * this account actually belongs to instead of guessing one.
   */
  const [inboxOpen, setInboxOpen] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [reviewingTour, setReviewingTour] = useState<Tour | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync Language
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    Storage.setLanguage(lang);
    addToast(
      'info',
      lang === 'vi' ? 'Đã đổi ngôn ngữ' : 'Language Changed',
      lang === 'vi' ? 'Giao diện hiển thị Tiếng Việt' : 'UI switched to English'
    );
  };

  // Sync Currency
  const handleCurrencyChange = (curr: 'VND' | 'USD') => {
    setCurrency(curr);
    Storage.setCurrency(curr);
    addToast(
      'info',
      'Currency Updated',
      `Displaying prices in ${curr}`
    );
  };

  // Dismiss Banner
  const handleDismissBanner = () => {
    setBannerDismissed(true);
    Storage.setBannerDismissed(true);
  };


  // Auth Handlers
  const handleLogin = (user: User) => {
    setActiveUser(user);
    Storage.setActiveUser(user);
    resumePendingBooking(user);
    if (user.role === 'host') {
      setActiveTab('host-studio');
    } else if (user.role === 'admin') {
      setActiveTab('admin-hub');
    } else {
      setActiveTab('explore');
    }
    addToast(
      'success',
      language === 'vi' ? 'Đăng nhập thành công' : 'Welcome back!',
      `${language === 'vi' ? 'Xin chào' : 'Hello'}, ${user.name}`
    );
  };

  const handleRegister = (newUser: User) => {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    Storage.saveUsers(updatedUsers);
    setActiveUser(newUser);
    Storage.setActiveUser(newUser);
    resumePendingBooking(newUser);
    if (newUser.role === 'host') {
      setActiveTab('host-studio');
    } else {
      setActiveTab('explore');
    }
    addToast(
      'success',
      language === 'vi' ? 'Đăng ký thành công' : 'Account Created!',
      language === 'vi' ? 'Chào mừng bạn gia nhập cộng đồng ViS-Go' : 'Welcome to ViS-Go community'
    );
  };

  const handleLogout = () => {
    // A real sign-out: clear the session, drop any Google tokens we hold, and
    // return to the public explore view.
    setActiveUser(null);
    Storage.clearActiveUser();

    // Private rows must not outlive the session on a shared device. The cache
    // is only a cache; whoever signs in next re-fetches their own.
    Storage.hydrateLocal('bookings', []);
    Storage.hydrateLocal('kyc', []);
    setBookings([]);
    setKycApps([]);

    signOutGoogle();
    // Firebase keeps its own persisted session; without this the next reload
    // silently signs the user back in.
    void signOutFirebase().catch(() => undefined);
    setActiveTab('explore');
    setSidebarOpen(false);
    addToast(
      'info',
      language === 'vi' ? 'Đã đăng xuất' : 'Logged Out',
      language === 'vi' ? 'Bạn đang xem với tư cách khách vãng lai' : 'You are now browsing as a guest'
    );
  };

  // Booking Flow
  const handleQuickBook = (tour: Tour) => {
    openTour(tour);
  };

  const handleProceedBooking = (draft: any) => {
    if (!activeUser) {
      setPendingBooking(draft);
      setAuthDefaultTab('register');
      setAuthModalOpen(true);
      addToast(
        'info',
        language === 'vi' ? 'Cần tài khoản để đặt tour' : 'An account is required',
        language === 'vi'
          ? 'Tạo tài khoản hoặc đăng nhập — lựa chọn của bạn đã được giữ lại.'
          : 'Sign up or log in — your selection has been saved.'
      );
      return;
    }

    setDraftBooking(draft);
    setCheckoutModalOpen(true);
  };

  /** Replays a booking that was interrupted by the sign-in requirement. */
  const resumePendingBooking = (user: User) => {
    if (!pendingBooking) return;
    // Only travellers book; a host or admin who signs in here just lands in
    // their own workspace instead of being pushed into a checkout.
    if (user.role !== 'customer') {
      setPendingBooking(null);
      return;
    }
    const draft = pendingBooking;
    setPendingBooking(null);
    setDraftBooking(draft);
    setCheckoutModalOpen(true);
    addToast(
      'success',
      language === 'vi' ? 'Tiếp tục đặt tour' : 'Resuming your booking',
      language === 'vi' ? 'Lựa chọn của bạn đã được khôi phục.' : 'Your selection has been restored.'
    );
  };

  const handleConfirmBooking = async (newBooking: Booking): Promise<boolean> => {
    const updated = [newBooking, ...bookings];
    const reservedTours = tours.map((tour) =>
      tour.id === newBooking.tourId
        ? { ...tour, status: 'booked' as const, reservedByBookingId: newBooking.id }
        : tour,
    );

    if (cloudEnabled()) {
      try {
        await reserveTourWithBooking(newBooking);
        // The transaction already wrote Firestore. Update only the synchronous
        // render cache; mirroring again as the customer would be both wasteful
        // and refused once the tour is no longer active.
        Storage.hydrateLocal('bookings', updated);
        Storage.hydrateLocal('tours', reservedTours);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        addToast(
          'error',
          language === 'vi' ? 'Không thể giữ chỗ' : 'Could not reserve this tour',
          reason === 'TOUR_ALREADY_BOOKED'
            ? language === 'vi' ? 'Một khách khác vừa đặt tour này trước bạn.' : 'Another traveller just reserved this tour.'
            : language === 'vi' ? 'Booking chưa được lưu. Kiểm tra mạng rồi thử lại.' : 'The booking was not saved. Check your connection and retry.',
        );
        return false;
      }
    } else {
      Storage.saveBookings(updated);
      Storage.saveTours(reservedTours);
    }

    setBookings(updated);
    setTours(reservedTours);
    addToast(
      'success',
      language === 'vi' ? 'Đã gửi yêu cầu đặt chỗ' : 'Booking request sent',
      language === 'vi'
        ? `Mã #${newBooking.id}. Host sẽ xác nhận lại — chưa thanh toán gì cả.`
        : `Reference #${newBooking.id}. Your host will confirm — nothing has been charged.`,
    );
    return true;
  };

  // Host Tour Publish
  const handlePublishTour = (newTour: Tour) => {
    const updatedTours = [newTour, ...tours];
    setTours(updatedTours);
    Storage.saveTours(updatedTours);
    addToast(
      'success',
      language === 'vi' ? 'Đăng tour thành công!' : 'Tour Published!',
      language === 'vi' ? 'Trải nghiệm của bạn đã hiển thị trên chợ ViS-Go.' : 'Your experience is now live for global travelers.'
    );
    setActiveTab('explore');
  };

  /** Which of the host's own listings the studio is editing, if any. */
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setActiveTab('host-studio');
    // The studio sits below the dashboard on the same screen, so without this
    // the form opens filled in somewhere off the bottom of the page.
    window.setTimeout(() => {
      document.getElementById('tour-creator-studio')?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  /**
   * Saves an edit to a listing the host already owns.
   *
   * Replaces the row in place rather than prepending a copy: the tour keeps its
   * id, so its reviews and any booking pointing at it stay attached, and
   * `saveTours` mirrors only the row that actually changed.
   */
  const handleUpdateTour = (updated: Tour) => {
    const next = tours.map((t) => (t.id === updated.id ? updated : t));
    setTours(next);
    Storage.saveTours(next);
    setEditingTour(null);
    addToast(
      'success',
      language === 'vi' ? 'Đã lưu thay đổi' : 'Changes saved',
      language === 'vi'
        ? 'Bài đăng của bạn đã được cập nhật trên chợ ViS-Go.'
        : 'Your listing has been updated on the marketplace.',
    );
    setActiveTab('explore');
  };

  // Update Booking Status (Host accept / decline)
  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: 'confirmed' | 'cancelled' | 'completed',
  ): Promise<void> => {
    const subject = bookings.find((booking) => booking.id === bookingId);
    if (!subject || !activeUser) return;
    const isHost = activeUser.id === subject.hostId;
    const isCustomer = activeUser.id === subject.customerId;
    const allowed =
      (isHost && subject.status === 'pending' && newStatus === 'confirmed')
      || (isCustomer && subject.status === 'confirmed' && newStatus === 'completed')
      || (isCustomer && subject.status === 'pending' && newStatus === 'cancelled');
    if (!allowed) {
      addToast(
        'warning',
        language === 'vi' ? 'Thao tác không được phép' : 'Action not allowed',
        language === 'vi'
          ? 'Host xác nhận yêu cầu; khách chỉ được hủy khi đang chờ và là người xác nhận hoàn thành.'
          : 'The host confirms; the customer may cancel only while pending and confirms completion.',
      );
      return;
    }
    try {
      if (cloudEnabled()) await transitionBookingStatus(subject, newStatus);
    } catch (error) {
      addToast('error', language === 'vi' ? 'Chưa cập nhật được' : 'Update failed', error instanceof Error ? error.message : String(error));
      return;
    }
    const changed = { ...subject, status: newStatus };
    const updated = bookings.map((b) => (b.id === bookingId ? changed : b));
    setBookings(updated);
    if (cloudEnabled()) Storage.hydrateLocal('bookings', updated);
    else Storage.saveBookings(updated);

    // A declined/cancelled request releases the slot immediately. Completing
    // the trip does not: the host may need to edit price, schedule or content
    // first, then explicitly reopen it from their dashboard.
    if (newStatus === 'cancelled') {
      const reopened = tours.map((tour) =>
        tour.id === subject.tourId ? { ...tour, status: 'active' as const, reservedByBookingId: undefined } : tour,
      );
      setTours(reopened);
      if (cloudEnabled()) Storage.hydrateLocal('tours', reopened);
      else Storage.saveTours(reopened);
    }
    addToast(
      'info',
      language === 'vi' ? 'Cập nhật đơn đặt' : 'Booking Updated',
      `Booking #${bookingId} is now ${newStatus.toUpperCase()}`
    );
    const tour = tours.find((item) => item.id === subject.tourId);
    if (newStatus === 'confirmed' || newStatus === 'cancelled') {
      void deliverBookingEvent(changed, language, tour?.durationHours ?? 3, newStatus).then((result) => {
        if (result.status !== 'sent') {
          addToast('warning', language === 'vi' ? 'Trạng thái đã lưu, email chưa gửi' : 'Status saved, email not sent', result.reason);
        }
      });
    }
    if (newStatus === 'completed' && tour) {
      setReviewingTour(tour);
      setReviewingBooking(changed);
      setReviewModalOpen(true);
    }
  };

  const handleReopenTour = (tourId: string) => {
    const next = tours.map((tour) =>
      tour.id === tourId ? { ...tour, status: 'active' as const } : tour,
    );
    setTours(next);
    Storage.saveTours(next);
    addToast(
      'success',
      language === 'vi' ? 'Đã mở lại tour' : 'Tour reopened',
      language === 'vi'
        ? 'Tour đã xuất hiện lại để khách mới đặt chỗ.'
        : 'The tour is visible to travellers again.',
    );
  };

  /**
   * Administrators curate the local intro videos shown on Explore.
   *
   * Deleting goes straight to Firestore as well as to local state: the sync
   * layer only ever writes rows, so a video removed here would disappear from
   * the screen and reappear on the next page load.
   */
  const handleSaveLocalVideos = (videos: LocalVideo[]) => {
    setLocalVideos(videos);
    Storage.saveLocalVideos(videos);
  };

  const handleDeleteLocalVideo = (id: string) => {
    const remaining = localVideos.filter((v) => v.id !== id);
    setLocalVideos(remaining);
    Storage.saveLocalVideos(remaining);
    if (cloudEnabled()) {
      void deleteLocalVideo(id).catch((err: unknown) => {
        console.warn('[ViS-Go] Video did not delete from Firestore:', err);
      });
    }
  };

  /**
   * A host sends, or re-sends, their identity details.
   *
   * Keyed by id so a re-submission after a rejection replaces the application
   * rather than adding a second one to the queue; the form reuses the id for
   * exactly that reason.
   */
  const handleSubmitKyc = (application: HostKycApplication) => {
    const updated = kycApps.some((k) => k.id === application.id)
      ? kycApps.map((k) => (k.id === application.id ? application : k))
      : [...kycApps, application];
    setKycApps(updated);
    Storage.saveKycApplications(updated);
    addToast(
      'success',
      language === 'vi' ? 'Đã gửi hồ sơ' : 'Details sent',
      language === 'vi'
        ? 'Quản trị viên sẽ xem và duyệt hồ sơ của bạn.'
        : 'An administrator will read and approve your details.',
    );
  };

  // Admin KYC Actions
  const handleApproveKyc = (appId: string) => {
    const application = kycApps.find((item) => item.id === appId);
    const updated = kycApps.map((k) => (k.id === appId ? { ...k, status: 'approved' as const } : k));
    setKycApps(updated);
    Storage.saveKycApplications(updated);
    if (application) {
      const host = users.find((user) => user.id === application.hostId);
      if (host) {
        const verifiedHost = { ...host, verified: true };
        const updatedUsers = users.map((user) => user.id === host.id ? verifiedHost : user);
        setUsers(updatedUsers);
        Storage.saveUsers(updatedUsers);
        if (cloudEnabled()) {
          void writeProfile(verifiedHost).catch((error: unknown) => {
            console.warn('[ViS-Go] Approved host profile did not save:', error);
          });
        }
      }
    }
    addToast(
      'success',
      'Host Verified',
      'Identity verification approved. Host granted verified buddy badge.'
    );
  };

  const handleRejectKyc = (appId: string) => {
    const updated = kycApps.map((k) => (k.id === appId ? { ...k, status: 'rejected' as const } : k));
    setKycApps(updated);
    Storage.saveKycApplications(updated);
    addToast(
      'warning',
      'Application Rejected',
      'Candidate has been notified to re-submit identity documents.'
    );
  };

  const handleToggleFeatureTour = (tourId: string) => {
    const updated = tours.map((t) => (t.id === tourId ? { ...t, featured: !t.featured } : t));
    setTours(updated);
    Storage.saveTours(updated);
    addToast('info', 'Featured Tour Updated', 'Homepage recommendations refreshed.');
  };

  // Review Flow
  /**
   * Opens the review form — for a signed-in traveller, on someone else's tour.
   *
   * Both guards used to be missing, and the first one mattered: a signed-out
   * visitor could fill the form in, and `handleSubmitReview` would put the
   * review into local state and toast "sent". It never reached Firestore —
   * `mirror()` returns early with no identity, and the rules require
   * `userId == request.auth.uid` regardless — so the review appeared, then
   * vanished on the next reload with nothing said. Refusing at the door is the
   * honest version of the same answer.
   */
  const handleOpenWriteReview = (tour: Tour) => {
    if (!activeUser) {
      setAuthDefaultTab('login');
      setAuthModalOpen(true);
      addToast(
        'info',
        language === 'vi' ? 'Cần đăng nhập để đánh giá' : 'Sign in to leave a review',
        language === 'vi'
          ? 'Đánh giá được gắn với tài khoản của bạn, nên cần đăng nhập trước.'
          : 'A review is attached to your account, so you need to be signed in.',
      );
      return;
    }

    if (tour.hostId === activeUser.id) {
      addToast(
        'error',
        language === 'vi' ? 'Không tự đánh giá tour của mình' : 'You cannot review your own tour',
        language === 'vi'
          ? 'Điểm đánh giá của host được tính từ chính các nhận xét này.'
          : 'A host rating is computed from these very reviews.',
      );
      return;
    }

    const completed = bookings.find((booking) =>
      booking.tourId === tour.id
      && booking.customerId === activeUser.id
      && booking.status === 'completed'
      && !reviews.some((review) => review.bookingId === booking.id),
    );
    if (!completed) {
      addToast(
        'info',
        language === 'vi' ? 'Chưa thể đánh giá' : 'Review not available',
        language === 'vi' ? 'Bạn chỉ đánh giá sau khi xác nhận hoàn thành chuyến đi, mỗi booking một lần.' : 'Complete the trip first; each booking can be reviewed once.',
      );
      return;
    }

    setReviewingTour(tour);
    setReviewingBooking(completed);
    setReviewModalOpen(true);
  };

  /** Opens a tour-specific contact thread before a reservation exists. */
  const handleMessageHost = (tour: Tour, date: string, time: string, startWithCall = false) => {
    if (!activeUser) {
      setAuthDefaultTab('login');
      setAuthModalOpen(true);
      return;
    }
    if (activeUser.role !== 'customer' || activeUser.id === tour.hostId) {
      addToast(
        'info',
        language === 'vi' ? 'Dành cho khách du lịch' : 'For travellers',
        language === 'vi'
          ? 'Khách có thể liên hệ host để thống nhất lịch trước khi đặt chỗ.'
          : 'Travellers can contact the host to agree on a schedule before reserving.',
      );
      return;
    }

    const existingBooking = bookings.find(
      (booking) => booking.tourId === tour.id
        && booking.customerId === activeUser.id
        && booking.status !== 'cancelled',
    );
    if (existingBooking) {
      openChatFor(existingBooking, startWithCall);
      return;
    }

    const start = new Date(`${date}T${time}:00+07:00`).getTime();
    const contact: Booking = {
      id: `contact_${tour.id}_${activeUser.id}`,
      tourId: tour.id,
      tourTitle: tour.title,
      tourTitleVi: tour.titleVi,
      tourImage: tour.coverImage,
      city: tour.city,
      hostId: tour.hostId,
      hostName: tour.hostName,
      hostPhone: tour.hostPhone,
      hostAvatar: tour.hostAvatar,
      customerId: activeUser.id,
      customerName: activeUser.name,
      customerEmail: activeUser.email,
      customerPhone: activeUser.phone,
      bookingDate: date,
      bookingTime: time,
      tourEndsAtEpochMs: start + tour.durationHours * 60 * 60 * 1000,
      guestsCount: 1,
      totalPriceVND: 0,
      totalPriceUSD: 0,
      platformFeeVND: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      meetingPoint: language === 'vi' ? tour.meetingPointVi : tour.meetingPoint,
    };
    openChatFor(contact, startWithCall);
  };

  // Host Profile Customization Handler
  /**
   * Grants or revokes the administrator role on someone else's profile.
   *
   * Only an admin can get here: the Admin Hub is behind a role check on the
   * route, and firestore.rules independently require `isAdmin()` for any write
   * that changes another profile's role — the route guard is convenience, the
   * rule is the enforcement. Written straight to Firestore rather than through
   * `mirror()`, because a profile is one document written by hand.
   */
  const handleSetUserRole = (target: User, role: UserRole) => {
    if (target.id === activeUser?.id) return; // no self-demotion; see AdminHub
    const updated: User = { ...target, role };
    const updatedUsers = users.map((u) => (u.id === target.id ? updated : u));
    setUsers(updatedUsers);
    Storage.saveUsers(updatedUsers);

    if (cloudEnabled()) {
      void writeProfile(updated).catch((err: unknown) => {
        console.warn('[ViS-Go] Role change did not save to Firestore:', err);
        addToast(
          'error',
          language === 'vi' ? 'Chưa lưu được' : 'Not saved',
          language === 'vi'
            ? 'Firestore từ chối thay đổi này. Tài khoản của bạn có còn quyền quản trị không?'
            : 'Firestore refused the change. Does your account still have admin access?',
        );
      });
    }

    addToast(
      'success',
      role === 'admin'
        ? (language === 'vi' ? 'Đã cấp quyền quản trị' : 'Administrator access granted')
        : (language === 'vi' ? 'Đã thu hồi quyền quản trị' : 'Administrator access revoked'),
      `${target.name} — ${target.email}`,
    );
  };

  const handleSaveProfile = (updatedUser: User) => {
    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    Storage.saveUsers(updatedUsers);
    setActiveUser(updatedUser);
    Storage.setActiveUser(updatedUser);

    // Profiles are not part of the mirror() path — they are written one document
    // at a time, by their owner, so the edit reaches the database rather than
    // living only in this browser.
    if (cloudEnabled()) {
      void writeProfile(updatedUser).catch((err: unknown) => {
        console.warn('[ViS-Go] Profile did not save to Firestore:', err);
      });
    }

    // Synchronize host's tours with new profile (bio, languages, avatar, specialties)
    const updatedTours = tours.map((t) => {
      if (t.hostId === updatedUser.id || t.hostName === updatedUser.name) {
        return {
          ...t,
          hostName: updatedUser.name,
          hostAvatar: updatedUser.avatar,
          hostPhone: updatedUser.phone,
          hostBio: updatedUser.bio,
          hostBioVi: updatedUser.bioVi,
          hostLanguages: updatedUser.languages || t.hostLanguages,
          hostSpecialties: updatedUser.specialties || t.hostSpecialties,
          languages: updatedUser.languages || t.languages,
        };
      }
      return t;
    });
    setTours(updatedTours);
    Storage.saveTours(updatedTours);

    addToast(
      'success',
      language === 'vi' ? 'Hồ sơ đã cập nhật!' : 'Profile Updated!',
      language === 'vi'
        ? 'Thông tin người bạn bản địa & các tour của bạn đã được làm mới.'
        : 'Your host trust card & tour listings have been updated.'
    );
  };

  // Role gatekeeper: a tab whose role no longer matches the session bounces
  // back to Explore. Without this, logging out while inside the Host Studio or
  // Admin Hub left those screens on display for a signed-out visitor.
  /**
   * Keeps <html lang> and the document title in step with the language switch.
   *
   * index.html hard-codes lang="vi" and nothing ever changed it, so a visitor
   * reading the app in English still had every screen reader, translation tool
   * and search crawler told the page was Vietnamese.
   */
  useEffect(() => {
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';
    document.title =
      language === 'vi'
        ? 'ViS-Go — Kết nối du khách với người bạn bản địa Việt Nam'
        : 'ViS-Go — Travel Vietnam with a verified local buddy';
  }, [language]);

  /**
   * Cloud boot: restore the Firebase session and pull shared data.
   *
   * Runs once and only when Firebase is configured. Everything here is
   * best-effort — if the network or the security rules say no, the app keeps
   * running on local data rather than blocking the first paint.
   */
  useEffect(() => {
    if (!cloudEnabled()) return;

    let cancelled = false;
    setSyncListener((state) => {
      if (!cancelled) setSyncState(state);
    });

    (async () => {
      const restored = await restoreFirebaseSession();
      if (cancelled) return;

      if (restored) {
        setActiveUser(restored);
        Storage.setActiveUser(restored);
      } else if (Storage.getActiveUser()) {
        // localStorage still names a signed-in user but Firebase does not know
        // them any more — the token expired, the session was cleared, or the
        // account was deleted. The app would have gone on showing them as
        // signed in while every write was silently refused, which is the worst
        // of both states. Treat it as signed out.
        setActiveUser(null);
        Storage.clearActiveUser();
        Storage.hydrateLocal('bookings', []);
        Storage.hydrateLocal('kyc', []);
        setBookings([]);
        setKycApps([]);
      }

      const result = await hydrateFromCloud(restored);
      if (cancelled) return;

      if (result.users?.length) {
        Storage.hydrateLocal('users', result.users);
        setUsers(result.users);
      }
      if (result.tours?.length) {
        Storage.hydrateLocal('tours', result.tours);
        setTours(result.tours);
      }
      if (result.bookings) {
        Storage.hydrateLocal('bookings', result.bookings);
        setBookings(result.bookings);
      }
      if (result.reviews?.length) {
        Storage.hydrateLocal('reviews', result.reviews);
        setReviews(result.reviews);
      }
      if (result.videos) {
        Storage.hydrateLocal('videos', result.videos);
        setLocalVideos(result.videos);
      }
      if (result.kyc) {
        Storage.hydrateLocal('kyc', result.kyc);
        setKycApps(result.kyc);
      }

      setCloudLoading(false);

      // An empty catalogue after a successful read means the database has never
      // been seeded. Say so plainly — silence here looks like a broken app.
      if (result.status === 'pulled' && !result.tours?.length) {
        addToast(
          'info',
          language === 'vi' ? 'Cơ sở dữ liệu đang trống' : 'The database is empty',
          language === 'vi'
            ? 'Chưa có tour nào trên Firestore. Chạy "npm run seed" để nạp dữ liệu.'
            : 'Firestore holds no tours yet. Run "npm run seed" to load them.',
        );
      }
    })();

    return () => {
      cancelled = true;
      setSyncListener(null);
    };
    // Intentionally boot-only: re-running would re-pull and burn read quota.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Keeps the Firestore layer told who is signed in.
   *
   * Writes are mirrored from `Storage.save*()`, which is synchronous and has no
   * view of auth state, and the security rules will not accept a write that
   * cannot name its owner. One effect here is cheaper than threading the user
   * through every save call site, and it cannot drift out of step.
   */
  useEffect(() => {
    if (!cloudEnabled()) return;

    let cancelled = false;
    (async () => {
      // Signing in is the moment the private collections become readable, so it
      // is also the moment to fetch them. Without this the rows only arrived on
      // the next full page load.
      const owned = await hydrateOwned(activeUser);
      if (cancelled) return;

      if (owned.bookings) {
        Storage.hydrateLocal('bookings', owned.bookings);
        setBookings(owned.bookings);
      }
      if (owned.kyc) {
        Storage.hydrateLocal('kyc', owned.kyc);
        setKycApps(owned.kyc);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUser]);

  /**
   * A host should not have to refresh the dashboard to discover a booking.
   * The first snapshot hydrates silently; later new rows raise an in-app
   * notification while retaining any bookings where this host is a traveller.
   */
  useEffect(() => {
    if (!cloudEnabled() || !activeUser || activeUser.role !== 'host') return;

    let cancelled = false;
    let initialized = false;
    let knownIds = new Set<string>();
    let unsubscribe = () => undefined;

    void subscribeHostBookings(
      activeUser.id,
      (hostRows) => {
        if (cancelled) return;
        const nextIds = new Set(hostRows.map((booking) => booking.id));
        if (initialized) {
          const newest = hostRows.find((booking) => !knownIds.has(booking.id));
          if (newest) {
            addToast(
              'info',
              language === 'vi' ? 'Có booking mới' : 'New booking',
              language === 'vi'
                ? `${newest.customerName} vừa đặt “${newest.tourTitleVi || newest.tourTitle}”.`
                : `${newest.customerName} just booked “${newest.tourTitle}”.`,
            );
          }
        }
        initialized = true;
        knownIds = nextIds;
        setBookings((current) => {
          const merged = [...hostRows, ...current.filter((booking) => booking.hostId !== activeUser.id)];
          Storage.hydrateLocal('bookings', merged);
          return merged;
        });
      },
      () => {
        // Email remains the out-of-app notification if the live listener drops.
      },
    ).then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeUser, language]);

  /**
   * Every thread this account belongs to, for the inbox.
   *
   * Read from `conversations` rather than from bookings, because an enquiry
   * written before a reservation has no booking row on either side.
   */
  useEffect(() => {
    if (!cloudEnabled() || !activeUser) {
      setConversations([]);
      return;
    }

    let cancelled = false;
    let unsubscribe = () => undefined;
    void subscribeUserConversations(
      activeUser.id,
      (rows) => {
        if (!cancelled) setConversations(rows);
      },
      () => {
        if (!cancelled) setConversations([]);
      },
    ).then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeUser]);

  /**
   * URL <-> tab, both directions.
   *
   * Two effects rather than one because they answer to different events: the
   * first publishes a tab change to the address bar, the second picks up a
   * Back/Forward press. `replace` on the way out keeps the history stack one
   * entry per navigation instead of two.
   */
  useEffect(() => {
    const target =
      activeTab === 'tour' && routeTourId
        ? `#/tour/${encodeURIComponent(routeTourId)}`
        : `#/${activeTab}`;
    if (window.location.hash !== target) {
      // `pushState` for a tour, `replaceState` for everything else. A tour page
      // is somewhere you go *from* the catalogue and expect Back to return you
      // to, so it earns its own history entry; the top-level tabs are switches,
      // not steps, and one entry each is enough.
      const write = activeTab === 'tour' ? window.history.pushState : window.history.replaceState;
      write.call(window.history, null, '', target);
    }
  }, [activeTab, routeTourId]);

  useEffect(() => {
    const onHashChange = () => {
      const route = routeFromHash(window.location.hash);
      setActiveTab(route.tab);
      setRouteTourId(route.tourId ?? null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const requiredRole: Record<string, UserRole> = {
      'host-studio': 'host',
      'admin-hub': 'admin',
    };
    const needed = requiredRole[activeTab];

    if (needed && activeUser?.role !== needed) {
      setActiveTab('explore');
      return;
    }

    // "My Bookings" is for signed-in travellers only.
    if (activeTab === 'my-bookings' && !activeUser) {
      setActiveTab('explore');
    }
  }, [activeTab, activeUser]);

  /**
   * Host ratings, recomputed from the reviews collection on every render.
   *
   * `hostRating` and `hostReviewCount` are denormalised onto each tour so a
   * card can render without loading reviews. Keeping that copy in step was the
   * job of a write in handleSubmitReview — and that write can never land: a
   * tour may only be written by the host who owns it, so a traveller leaving a
   * review had their rating update silently dropped by the security rules. The
   * number looked right until the page was reloaded, then snapped back.
   *
   * Deriving it here fixes that without weakening the rules. Reviews are
   * world-readable and already loaded, so the aggregate costs nothing extra,
   * and it is always consistent with the reviews actually on file.
   *
   * A host with no reviews yet keeps the figure stored on the tour, so a fresh
   * catalogue does not read as zero-star across the board.
   */
  const ratedTours = React.useMemo(() => {
    const hostOf = new Map<string, string>(tours.map((t) => [t.id, t.hostId] as [string, string]));

    const totals = new Map<string, { sum: number; count: number }>();
    for (const review of reviews) {
      const hostId = hostOf.get(review.tourId);
      if (!hostId) continue;
      const entry = totals.get(hostId) ?? { sum: 0, count: 0 };
      entry.sum += review.rating;
      entry.count += 1;
      totals.set(hostId, entry);
    }

    return tours.map((tour) => {
      const stats = totals.get(tour.hostId);
      if (!stats || stats.count === 0) return tour;
      return {
        ...tour,
        hostRating: Number((stats.sum / stats.count).toFixed(2)),
        hostReviewCount: stats.count,
      };
    });
  }, [tours, reviews]);

  /**
   * The tour the current address names.
   *
   * Derived, not stored: the catalogue arrives from Firestore after the first
   * paint, so a page opened straight from a link (or reloaded on the tour
   * page) has an id in the hash before there is anything to match it against.
   * Deriving means the page fills itself in when the data lands, instead of
   * deciding "not found" a second too early.
   */
  const selectedTour = React.useMemo(
    () => (routeTourId ? ratedTours.find((t) => t.id === routeTourId) ?? null : null),
    [ratedTours, routeTourId],
  );

  const leaveTourPage = () => {
    setRouteTourId(null);
    setActiveTab('explore');
  };

  /**
   * The trip the chat drawer opens onto: this user's own booking, soonest
   * confirmed one first. `null` when they have none, which the drawer renders
   * as an empty state instead of inventing a host to talk to.
   */
  const chatBooking = React.useMemo(() => {
    if (!activeUser) return null;
    const mine = bookings.filter(
      (b) => b.customerId === activeUser.id || b.hostId === activeUser.id,
    );
    return mine.find((b) => b.status === 'confirmed') ?? mine[0] ?? null;
  }, [bookings, activeUser]);

  /**
   * The inbox rows: one per conversation, plus every trip that has no thread
   * open yet so a first message is always one tap away.
   *
   * A conversation with no matching booking is an enquiry. Its subject is
   * rebuilt from the fields the thread itself carries — that is why they are
   * denormalised onto the document — falling back to the tour when an older
   * thread predates them.
   */
  const inboxThreads = React.useMemo<InboxThread[]>(() => {
    if (!activeUser) return [];

    const mine = bookings.filter(
      (b) => b.customerId === activeUser.id || b.hostId === activeUser.id,
    );
    const byId = new Map<string, InboxThread>();

    for (const booking of mine) {
      byId.set(booking.id, { subject: booking, unread: false, isEnquiry: false });
    }

    for (const conversation of conversations) {
      const existing = byId.get(conversation.id);
      const lastAt = conversation.lastMessageAt?.getTime() ?? 0;
      const readAt = conversation.lastReadAt?.[activeUser.id]?.getTime() ?? 0;
      const unread =
        Boolean(conversation.lastMessage)
        && conversation.lastSenderId !== activeUser.id
        && lastAt > readAt;

      if (existing) {
        byId.set(conversation.id, { ...existing, conversation, unread });
        continue;
      }

      const tour = tours.find((item) => item.id === conversation.tourId);
      const hostId = conversation.hostId ?? tour?.hostId ?? '';
      const customerId = conversation.customerId
        ?? conversation.participants.find((uid) => uid !== hostId)
        ?? '';
      const subject: Booking = {
        id: conversation.id,
        tourId: conversation.tourId ?? '',
        tourTitle: conversation.tourTitle || tour?.title || '',
        tourTitleVi: tour?.titleVi ?? conversation.tourTitle ?? '',
        tourImage: tour?.coverImage ?? '',
        city: conversation.city || tour?.city || '',
        hostId,
        hostName: conversation.hostName ?? tour?.hostName ?? '',
        hostPhone: conversation.hostPhone ?? tour?.hostPhone ?? '',
        hostAvatar: conversation.hostAvatar ?? tour?.hostAvatar ?? '',
        customerId,
        customerName:
          conversation.customerName
          ?? (customerId === activeUser.id ? activeUser.name : language === 'vi' ? 'Khách' : 'Traveller'),
        customerEmail: customerId === activeUser.id ? activeUser.email : '',
        customerPhone: customerId === activeUser.id ? activeUser.phone : '',
        bookingDate: conversation.bookingDate ?? '',
        bookingTime: conversation.bookingTime ?? '',
        guestsCount: 1,
        totalPriceVND: 0,
        totalPriceUSD: 0,
        platformFeeVND: 0,
        status: 'pending',
        createdAt: conversation.lastMessageAt?.toISOString() ?? new Date().toISOString(),
        meetingPoint: tour ? (language === 'vi' ? tour.meetingPointVi : tour.meetingPoint) : '',
      };
      byId.set(conversation.id, { subject, conversation, unread, isEnquiry: true });
    }

    const at = (thread: InboxThread) =>
      thread.conversation?.lastMessageAt?.getTime()
      ?? new Date(thread.subject.createdAt).getTime()
      ?? 0;
    return [...byId.values()].sort((a, b) => at(b) - at(a));
  }, [activeUser, bookings, conversations, tours, language]);

  const handleSubmitReview = (newReview: TourReview) => {
    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);
    Storage.saveReviews(updatedReviews);

    // No tour write here. The rating shown on a card is derived from these
    // reviews by `ratedTours` above; writing it back would be denied for
    // everyone except the host who owns the tour, and a traveller is never
    // that person.

    addToast(
      'success',
      language === 'vi' ? 'Đã gửi đánh giá' : 'Review Submitted',
      language === 'vi' ? 'Cảm ơn bạn đã đóng góp cho cộng đồng ViS-Go!' : 'Thank you for supporting verified Vietnamese hosts!'
    );
  };

  /**
   * The assistant route owns the whole area below the header.
   *
   * It sizes itself to the viewport so the composer stays on the bottom edge,
   * which only works if nothing else is stacked above or below it — hence the
   * banner, the footer and the floating bubble all step aside here. The bubble
   * in particular would be a button that opens the page you are already on.
   */
  const isAssistantRoute = activeTab === 'ai-assistant';

  return (
    /* `min-h-screen` uses `vh`, which on a phone is the *tallest* the viewport
       ever gets — taller than the visible area while the browser chrome is
       showing. On the assistant route, where the child is sized in `dvh`, that
       difference is a strip of scrollable document under the composer, so the
       shell switches to an exact `dvh` box there. */
    <div
      className={`relative text-stone-900 flex flex-col font-['Be_Vietnam_Pro',sans-serif] ${
        isAssistantRoute ? 'h-dvh overflow-hidden' : 'min-h-screen'
      }`}
    >

      <PageBackdrop />

      {/* Opening sequence. Rendered above everything and self-dismissing. */}
      {showIntro && (
        <React.Suspense fallback={<div className="fixed inset-0 z-[100] bg-[#16224a]" />}>
          <IntroSequence language={language} onFinish={() => setShowIntro(false)} />
        </React.Suspense>
      )}

      
      {/* 1. Header is at the very top with Logo ViS-Go and essential actions */}
      <Navbar
        activeUser={activeUser}
        language={language}
        currency={currency}
        activeTab={activeTab}
        bookingsCount={bookings.length}
        onLanguageChange={handleLanguageChange}
        onCurrencyChange={handleCurrencyChange}
        onTabChange={goToTab}
        onOpenAuth={(tab) => {
          setAuthDefaultTab(tab || 'login');
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenChat={() => setInboxOpen(true)}
        onOpenRadar={() => {
          setRadarBooking(bookings[0] || null);
          setRadarModalOpen(true);
        }}
        onOpenAIChat={() => setActiveTab('ai-assistant')}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* 2. Dedicated Navigation Sidebar (Explore, My Bookings, GPS Radar, Host Studio, Admin) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={goToTab}
        activeUser={activeUser}
        language={language}
        currency={currency}
        bookingsCount={bookings.length}
        onOpenRadar={() => {
          setRadarBooking(bookings[0] || null);
          setRadarModalOpen(true);
        }}
        onOpenChat={() => setInboxOpen(true)}
        onOpenAIChat={() => setActiveTab('ai-assistant')}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenAuth={(tab) => {
          setAuthDefaultTab(tab);
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Main Views Router */}
      <main
        className={
          isAssistantRoute
            ? 'flex-1 w-full'
            : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16'
        }
      >
        
        {/* Customer Exploration View with Hero Banner, Local Video Showcase & Tour Catalog */}
        {activeTab === 'explore' && (
          <CustomerView
            localVideos={localVideos}
            tours={ratedTours}
            language={language}
            currency={currency}
            loading={cloudLoading}
            activeUser={activeUser}
            onSelectTour={openTour}
            onQuickBook={handleQuickBook}
            onOpenAIChat={() => setActiveTab('ai-assistant')}
            onOpenVRHeritage={() => setActiveTab('vr-heritage')}
            onOpenAdminHub={() => setActiveTab('admin-hub')}
          />
        )}

        {/* VR Heritage 360 View — open to everyone, no sign-in required */}
        {activeTab === 'vr-heritage' && <VRHeritageView language={language} />}

        {/* ViS-AI assistant — a route of its own, not an overlay */}
        {isAssistantRoute && (
          <AIAssistantPage
            language={language}
            tours={ratedTours}
            hosts={users.filter((u) => u.role === 'host')}
            bookings={bookings}
            activeUser={activeUser}
            onSelectTour={openTour}
            onSelectCity={() => setActiveTab('explore')}
            onBack={() => setActiveTab('explore')}
          />
        )}

        {/* Customer Bookings View */}
        {activeTab === 'my-bookings' && (
          <MyBookingsView
            bookings={bookings}
            tours={ratedTours}
            language={language}
            currency={currency}
            onOpenLiveRadar={(b) => {
              setRadarBooking(b);
              setRadarModalOpen(true);
            }}
            onOpenChat={openChatFor}
            reviews={reviews}
            onOpenReview={(t) => handleOpenWriteReview(t)}
            onCompleteBooking={(bookingId) => void handleUpdateBookingStatus(bookingId, 'completed')}
            onExploreMore={() => setActiveTab('explore')}
            onCancelBooking={(bookingId) => handleUpdateBookingStatus(bookingId, 'cancelled')}
          />
        )}

        {activeTab === 'host-ranking' && activeUser?.role === 'customer' && (
          <HostLeaderboardView
            tours={ratedTours}
            reviews={reviews}
            language={language}
            onSelectTour={openTour}
          />
        )}

        {/* Local Host Creator Studio & Dashboard View */}
        {activeTab === 'host-studio' && (
          <div className="space-y-8">
            <HostDashboard
              /* Remounts when the section changes, so `initialTab` is read
                 again — the dashboard owns its own tab state after that. */
              key={hostSection}
              initialTab={hostSection}
              activeUser={activeUser}
              bookings={bookings}
              tours={ratedTours}
              language={language}
              currency={currency}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onReopenTour={handleReopenTour}
              onOpenLiveRadar={(b) => {
                setRadarBooking(b);
                setRadarModalOpen(true);
              }}
              onOpenChat={openChatFor}
              onSwitchToStudio={() => {
                const el = document.getElementById('tour-creator-studio');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onSaveProfile={handleSaveProfile}
              onOpenAccount={() => setProfileModalOpen(true)}
              kycApplications={kycApps}
              onSubmitKyc={handleSubmitKyc}
              onEditTour={handleEditTour}
            />

            <div id="tour-creator-studio">
              <HostCreatorStudio
                activeUser={activeUser}
                language={language}
                currency={currency}
                key={editingTour?.id ?? 'new'}
                onPublishTour={handlePublishTour}
                editingTour={editingTour}
                onUpdateTour={handleUpdateTour}
                onCancelEdit={() => setEditingTour(null)}
                identity={kycApps.find((k) => k.hostId === activeUser?.id) ?? null}
                onOpenVerification={() => {
                  setHostSection('verify');
                  setActiveTab('host-studio');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        )}

        {/* Tour Detail — a page of its own at #/tour/<id>, not an overlay */}
        {activeTab === 'tour' && (
          selectedTour ? (
            <TourDetailPage
              tour={selectedTour}
              language={language}
              currency={currency}
              reviews={reviews}
              activeUser={activeUser}
              onBack={leaveTourPage}
              onProceedBooking={handleProceedBooking}
              onOpenWriteReview={handleOpenWriteReview}
              onOpenChat={(date, time) => handleMessageHost(selectedTour, date, time)}
              onOpenCall={(date, time) => handleMessageHost(selectedTour, date, time, true)}
            />
          ) : cloudLoading ? (
            /* The catalogue has not arrived yet. A link opened cold lands here
               for a moment; saying "not found" now would be wrong. */
            <div className="py-24 text-center text-stone-400">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-3"></i>
              <p className="text-sm">{language === 'vi' ? 'Đang tải chuyến đi…' : 'Loading this trip…'}</p>
            </div>
          ) : (
            <div className="py-24 text-center space-y-4">
              <i className="fa-regular fa-compass text-stone-300 text-4xl"></i>
              <p className="text-sm text-stone-600">
                {language === 'vi'
                  ? 'Không tìm thấy chuyến đi này. Có thể host đã gỡ nó xuống.'
                  : 'This trip could not be found. The host may have taken it down.'}
              </p>
              <button
                onClick={leaveTourPage}
                className="px-5 py-2.5 bg-[#A82323] hover:bg-[#8C1818] text-white rounded-2xl text-sm font-bold cursor-pointer transition-colors"
              >
                {language === 'vi' ? 'Về trang khám phá' : 'Back to Explore'}
              </button>
            </div>
          )
        )}

        {/* Admin Hub View */}
        {activeTab === 'admin-hub' && (
          <AdminHub
            kycApplications={kycApps}
            tours={ratedTours}
            bookings={bookings}
            users={users}
            onOpenConversation={openChatFor}
            language={language}
            currency={currency}
            localVideos={localVideos}
            onSaveLocalVideos={handleSaveLocalVideos}
            onDeleteLocalVideo={handleDeleteLocalVideo}
            onApproveKyc={handleApproveKyc}
            onRejectKyc={handleRejectKyc}
            onToggleFeatureTour={handleToggleFeatureTour}
            activeUser={activeUser}
            onSetUserRole={handleSetUserRole}
          />
        )}

      </main>

      {/* 4. Global Modals & Drawers */}

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          language={language}
          onClose={() => setAuthModalOpen(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
          defaultTab={authDefaultTab}
        />
      )}

      {/* Checkout & Invoice Modal */}
      {checkoutModalOpen && draftBooking && (
        <CheckoutModal
          isOpen={checkoutModalOpen}
          draftBooking={draftBooking}
          activeUser={activeUser}
          language={language}
          currency={currency}
          onClose={() => {
            setCheckoutModalOpen(false);
            setDraftBooking(null);
          }}
          onConfirmBooking={handleConfirmBooking}
          onOpenLiveRadar={(b) => {
            setRadarBooking(b);
            setRadarModalOpen(true);
          }}
        />
      )}

      {/* Live Radar & SOS Safety Shield */}
      {radarModalOpen && (
        <LiveRadarModal
          isOpen={radarModalOpen}
          booking={radarBooking}
          activeUser={activeUser}
          language={language}
          onClose={() => setRadarModalOpen(false)}
          onOpenChat={() => (radarBooking ? openChatFor(radarBooking) : setInboxOpen(true))}
        />
      )}

      {/* Thread picker. Opened by the generic "Messages" button in the header
          and the sidebar, which used to guess a booking instead. */}
      <ChatInboxModal
        isOpen={inboxOpen}
        threads={inboxThreads}
        activeUser={activeUser}
        language={language}
        onSelect={(subject) => openChatFor(subject)}
        onClose={() => setInboxOpen(false)}
      />

      {/* Direct In-App Chat Drawer */}
      {chatDrawerOpen && (
        <ChatDrawer
          isOpen={chatDrawerOpen}
          activeUser={activeUser}
          booking={chatSubject ?? chatBooking}
          language={language}
          startWithCall={chatStartsWithCall}
          onClose={() => {
            setChatDrawerOpen(false);
            setChatSubject(null);
            setChatStartsWithCall(false);
          }}
        />
      )}

      {/* Review Modal */}
      {reviewModalOpen && reviewingTour && (
        <ReviewModal
          isOpen={reviewModalOpen}
          tour={reviewingTour}
          booking={reviewingBooking}
          activeUser={activeUser}
          language={language}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewingTour(null);
            setReviewingBooking(null);
          }}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {/* Consolidated Settings & Preferences Modal (Language, Currency, Sound) */}
      {settingsModalOpen && (
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          language={language}
          currency={currency}
          onLanguageChange={handleLanguageChange}
          onCurrencyChange={handleCurrencyChange}
        />
      )}

      {/* User Account Details & Edit Profile Modal */}
      {profileModalOpen && activeUser && (
        <UserProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          user={activeUser}
          language={language}
          onSaveProfile={handleSaveProfile}
          onOpenHostProfile={() => {
            setHostSection('profile');
            setActiveTab('host-studio');
          }}
        />
      )}

      {/* Messenger-style Floating AI Chat Bubble (Hỗ trợ tư vấn) */}
      {!isAssistantRoute && (
        <FloatingAIBubble
          language={language}
          onOpenAIChat={() => setActiveTab('ai-assistant')}
        />
      )}

      {/* Global Toast System */}
      {/*
        Cloud sync indicator. Only appears when Firebase is configured AND
        something is worth saying — a permanently-visible "synced" badge is
        noise, but silently failing to save is worse.
      */}
      {HAS_FIREBASE && (syncState === 'syncing' || syncState === 'error' || syncState === 'offline') && (
        <div
          role="status"
          /* Pinned to both edges with a max width: the Vietnamese copy is long
             enough that a left-anchored pill ran past a 390px viewport and gave
             the page a horizontal scrollbar. */
          className={`fixed bottom-4 left-4 right-4 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur sm:right-auto sm:mx-0 ${
            syncState === 'syncing'
              ? 'bg-stone-900/85 text-white'
              : 'bg-amber-500/95 text-stone-900'
          }`}
        >
          <i
            className={`fa-solid ${
              syncState === 'syncing' ? 'fa-cloud-arrow-up fa-fade' : 'fa-triangle-exclamation'
            }`}
          />
          <span className="min-w-0">
            {syncState === 'syncing'
              ? (language === 'vi' ? 'Đang đồng bộ Firebase…' : 'Syncing to Firebase…')
              : (language === 'vi'
                  ? 'Chưa lưu được lên Firebase — dữ liệu vẫn nằm trên máy này'
                  : 'Could not save to Firebase — data is still on this device')}
          </span>
        </div>
      )}

      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
      />

      {/* Complete Vietnamese Travel Footer */}
      {!isAssistantRoute && (
      <Footer
        language={language}
        currency={currency}
        onLanguageChange={handleLanguageChange}
        onCurrencyChange={handleCurrencyChange}
        onOpenAuth={(tab) => {
          setAuthDefaultTab(tab);
          setAuthModalOpen(true);
        }}
        onTabChange={goToTab}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />
      )}

    </div>
  );
}
