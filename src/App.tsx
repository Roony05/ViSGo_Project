import React, { useState, useEffect } from 'react';
import { Tour, Booking, User, Language, UserRole, TourReview, HostKycApplication } from './types';
import { Storage } from './utils/storage';
import { Navbar } from './components/Navbar';
import { BrandStoryBanner } from './components/BrandStoryBanner';
import { CustomerView } from './components/CustomerView';
import { TourDetailModal } from './components/TourDetailModal';
import { CheckoutModal } from './components/CheckoutModal';
import { LiveRadarModal } from './components/LiveRadarModal';
import { ChatDrawer } from './components/ChatDrawer';
import { HostCreatorStudio } from './components/HostCreatorStudio';
import { HostDashboard } from './components/HostDashboard';
import { AdminHub } from './components/AdminHub';
import { MyBookingsView } from './components/MyBookingsView';
import { ReviewModal } from './components/ReviewModal';
import { AuthModal } from './components/AuthModal';
import { AIChatbotModal } from './components/AIChatbotModal';
import { SettingsModal } from './components/SettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Sidebar } from './components/Sidebar';
import { FloatingAIBubble } from './components/FloatingAIBubble';
import { Footer } from './components/Footer';
import { ToastContainer, ToastMessage } from './components/Toast';

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

  // Navigation Tab: 'explore' | 'my-bookings' | 'host-studio' | 'admin-hub'
  const [activeTab, setActiveTab] = useState<string>('explore');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Modals & Drawers State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'register'>('login');
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [aiChatbotOpen, setAiChatbotOpen] = useState<boolean>(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
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
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [reviewingTour, setReviewingTour] = useState<Tour | null>(null);

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

  // Role switching
  const handleRoleSwitch = (newRole: UserRole) => {
    let matched = users.find((u) => u.role === newRole);
    if (!matched) {
      matched = {
        id: `user_${newRole}_${Date.now()}`,
        name: newRole === 'host' ? 'Nguyễn Minh Tuấn (Buddy)' : newRole === 'admin' ? 'ViS-Go Operations Admin' : 'Sarah Jenkins',
        email: `${newRole}@visgo.vn`,
        phone: '+84 901 234 567',
        role: newRole,
        avatar: newRole === 'host'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        verified: true,
      };
      setUsers([...users, matched]);
      Storage.saveUsers([...users, matched]);
    }

    setActiveUser(matched);
    Storage.setActiveUser(matched);

    if (newRole === 'host') {
      setActiveTab('host-studio');
    } else if (newRole === 'admin') {
      setActiveTab('admin-hub');
    } else {
      setActiveTab('explore');
    }

    addToast(
      'success',
      language === 'vi' ? 'Chuyển đổi vai trò' : 'Role Switched',
      language === 'vi' ? `Bạn đang trải nghiệm giao diện: ${newRole.toUpperCase()}` : `Active view switched to ${newRole.toUpperCase()}`
    );
  };

  // Auth Handlers
  const handleLogin = (user: User) => {
    setActiveUser(user);
    Storage.setActiveUser(user);
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
    const customerUser = users.find((u) => u.role === 'customer') || users[0];
    setActiveUser(customerUser);
    Storage.setActiveUser(customerUser);
    setActiveTab('explore');
    addToast(
      'info',
      language === 'vi' ? 'Đã đăng xuất' : 'Logged Out',
      language === 'vi' ? 'Chuyển về chế độ khách vãng lai' : 'Switched to guest traveler mode'
    );
  };

  // Booking Flow
  const handleQuickBook = (tour: Tour) => {
    setSelectedTour(tour);
  };

  const handleProceedBooking = (draft: any) => {
    setDraftBooking(draft);
    setSelectedTour(null);
    setCheckoutModalOpen(true);
  };

  const handleConfirmBooking = (newBooking: Booking) => {
    const updated = [newBooking, ...bookings];
    setBookings(updated);
    Storage.saveBookings(updated);
    addToast(
      'success',
      language === 'vi' ? 'Đặt tour thành công!' : 'Reservation Confirmed!',
      language === 'vi' ? `Mã đặt chỗ #${newBooking.id} đã được giữ cọc qua Escrow.` : `Booking #${newBooking.id} is escrow-protected.`
    );
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

  // Update Booking Status (Host accept / decline)
  const handleUpdateBookingStatus = (bookingId: string, newStatus: 'confirmed' | 'cancelled') => {
    const updated = bookings.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b));
    setBookings(updated);
    Storage.saveBookings(updated);
    addToast(
      'info',
      language === 'vi' ? 'Cập nhật đơn đặt' : 'Booking Updated',
      `Booking #${bookingId} is now ${newStatus.toUpperCase()}`
    );
  };

  // Admin KYC Actions
  const handleApproveKyc = (appId: string) => {
    const updated = kycApps.map((k) => (k.id === appId ? { ...k, status: 'approved' as const } : k));
    setKycApps(updated);
    Storage.saveKycApplications(updated);
    addToast(
      'success',
      'Host Verified',
      'eKYC application approved. Host granted verified buddy badge.'
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
  const handleOpenWriteReview = (tour: Tour) => {
    setReviewingTour(tour);
    setSelectedTour(null);
    setReviewModalOpen(true);
  };

  // Host Profile Customization Handler
  const handleSaveProfile = (updatedUser: User) => {
    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    Storage.saveUsers(updatedUsers);
    setActiveUser(updatedUser);
    Storage.setActiveUser(updatedUser);

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

  const handleSubmitReview = (newReview: TourReview) => {
    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);
    Storage.saveReviews(updatedReviews);

    // Update tour rating
    const tourRevs = updatedReviews.filter((r) => r.tourId === newReview.tourId);
    const avgRating = tourRevs.reduce((acc, c) => acc + c.rating, 0) / tourRevs.length;

    const updatedTours = tours.map((t) =>
      t.id === newReview.tourId
        ? {
            ...t,
            hostRating: Number(avgRating.toFixed(2)),
            hostReviewCount: tourRevs.length,
          }
        : t
    );
    setTours(updatedTours);
    Storage.saveTours(updatedTours);

    addToast(
      'success',
      language === 'vi' ? 'Đã gửi đánh giá' : 'Review Submitted',
      language === 'vi' ? 'Cảm ơn bạn đã đóng góp cho cộng đồng ViS-Go!' : 'Thank you for supporting verified Vietnamese hosts!'
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-['Be_Vietnam_Pro',sans-serif]">
      
      {/* 1. Header is at the very top with Logo ViS-Go and essential actions */}
      <Navbar
        activeUser={activeUser}
        language={language}
        currency={currency}
        activeTab={activeTab}
        bookingsCount={bookings.length}
        onLanguageChange={handleLanguageChange}
        onCurrencyChange={handleCurrencyChange}
        onRoleSwitch={handleRoleSwitch}
        onTabChange={setActiveTab}
        onOpenAuth={(tab) => {
          setAuthDefaultTab(tab || 'login');
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenChat={() => setChatDrawerOpen(true)}
        onOpenRadar={() => {
          setRadarBooking(bookings[0] || null);
          setRadarModalOpen(true);
        }}
        onOpenAIChat={() => setAiChatbotOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* 2. Dedicated Navigation Sidebar (Explore, My Bookings, GPS Radar, Host Studio, Admin) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeUser={activeUser}
        language={language}
        currency={currency}
        bookingsCount={bookings.length}
        onOpenRadar={() => {
          setRadarBooking(bookings[0] || null);
          setRadarModalOpen(true);
        }}
        onOpenChat={() => setChatDrawerOpen(true)}
        onOpenAIChat={() => setAiChatbotOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenAuth={(tab) => {
          setAuthDefaultTab(tab);
          setAuthModalOpen(true);
        }}
        onRoleSwitch={handleRoleSwitch}
        onLogout={handleLogout}
      />

      {/* 3. Dismissable Brand Story Banner */}
      {!bannerDismissed && (
        <BrandStoryBanner
          language={language}
          onDismiss={handleDismissBanner}
        />
      )}

      {/* 4. Main Views Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        
        {/* Customer Exploration View */}
        {activeTab === 'explore' && (
          <CustomerView
            tours={tours}
            language={language}
            currency={currency}
            onSelectTour={(t) => setSelectedTour(t)}
            onQuickBook={handleQuickBook}
          />
        )}

        {/* Customer Bookings View */}
        {activeTab === 'my-bookings' && (
          <MyBookingsView
            bookings={bookings}
            tours={tours}
            language={language}
            currency={currency}
            onOpenLiveRadar={(b) => {
              setRadarBooking(b);
              setRadarModalOpen(true);
            }}
            onOpenReview={(t) => handleOpenWriteReview(t)}
            onExploreMore={() => setActiveTab('explore')}
          />
        )}

        {/* Local Host Creator Studio & Dashboard View */}
        {activeTab === 'host-studio' && (
          <div className="space-y-8">
            <HostDashboard
              activeUser={activeUser}
              bookings={bookings}
              language={language}
              currency={currency}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onOpenLiveRadar={(b) => {
                setRadarBooking(b);
                setRadarModalOpen(true);
              }}
              onOpenChat={() => setChatDrawerOpen(true)}
              onSwitchToStudio={() => {
                const el = document.getElementById('tour-creator-studio');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onSaveProfile={handleSaveProfile}
            />

            <div id="tour-creator-studio">
              <HostCreatorStudio
                activeUser={activeUser}
                language={language}
                currency={currency}
                onPublishTour={handlePublishTour}
              />
            </div>
          </div>
        )}

        {/* Admin Hub View */}
        {activeTab === 'admin-hub' && (
          <AdminHub
            kycApplications={kycApps}
            tours={tours}
            language={language}
            currency={currency}
            onApproveKyc={handleApproveKyc}
            onRejectKyc={handleRejectKyc}
            onToggleFeatureTour={handleToggleFeatureTour}
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
          existingUsers={users}
          defaultTab={authDefaultTab}
        />
      )}

      {/* RAG AI Local Tour Assistant Modal */}
      {aiChatbotOpen && (
        <AIChatbotModal
          isOpen={aiChatbotOpen}
          onClose={() => setAiChatbotOpen(false)}
          language={language}
          tours={tours}
          hosts={users.filter((u) => u.role === 'host')}
          bookings={bookings}
          activeUser={activeUser}
          onSelectTour={(tour) => {
            setSelectedTour(tour);
            setAiChatbotOpen(false);
          }}
          onSelectCity={(_city) => {
            setActiveTab('explore');
          }}
        />
      )}

      {/* Tour Detail Modal */}
      {selectedTour && (
        <TourDetailModal
          tour={selectedTour}
          language={language}
          currency={currency}
          reviews={reviews}
          activeUser={activeUser}
          onClose={() => setSelectedTour(null)}
          onProceedBooking={handleProceedBooking}
          onOpenWriteReview={handleOpenWriteReview}
          onOpenChat={() => setChatDrawerOpen(true)}
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
          onOpenChat={() => setChatDrawerOpen(true)}
        />
      )}

      {/* Direct In-App Chat Drawer */}
      {chatDrawerOpen && (
        <ChatDrawer
          isOpen={chatDrawerOpen}
          activeUser={activeUser}
          language={language}
          onClose={() => setChatDrawerOpen(false)}
        />
      )}

      {/* Review Modal */}
      {reviewModalOpen && reviewingTour && (
        <ReviewModal
          isOpen={reviewModalOpen}
          tour={reviewingTour}
          activeUser={activeUser}
          language={language}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewingTour(null);
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
        />
      )}

      {/* Messenger-style Floating AI Chat Bubble (Hỗ trợ tư vấn) */}
      <FloatingAIBubble
        language={language}
        onOpenAIChat={() => setAiChatbotOpen(true)}
      />

      {/* Global Toast System */}
      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
      />

      {/* Complete Vietnamese Travel Footer */}
      <Footer
        language={language}
        currency={currency}
        onLanguageChange={handleLanguageChange}
        onCurrencyChange={handleCurrencyChange}
        onOpenAuth={(tab) => {
          setAuthDefaultTab(tab);
          setAuthModalOpen(true);
        }}
        onTabChange={setActiveTab}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

    </div>
  );
}
