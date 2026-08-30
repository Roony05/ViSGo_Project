import React, { useEffect, useMemo, useState } from 'react';
import { Booking, HostKycApplication, LocalVideo, SosAlert, Tour, User, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { formatCccd } from '../utils/cccd';
import { Avatar } from './Avatar';
import { LocalVideoManager } from './LocalVideoManager';
import { AdminDashboard } from './AdminDashboard';
import { subscribeSosAlerts, updateSosStatus } from '../utils/firestoreDb';
import { buildGoogleMapsCoordUrl } from '../utils/googleMaps';

interface AdminHubProps {
  kycApplications: HostKycApplication[];
  tours: Tour[];
  bookings: Booking[];
  users: User[];
  /** The signed-in administrator. Needed to stop one demoting themselves. */
  activeUser: User | null;
  /**
   * Opens a trip's message thread. Admins can read any conversation — a
   * deliberate product decision, so that a dispute about what was arranged can
   * actually be settled — but the rules still refuse to let them post in it.
   */
  onOpenConversation: (booking: Booking) => void;
  language: Language;
  currency: 'VND' | 'USD';
  localVideos: LocalVideo[];
  onSaveLocalVideos: (videos: LocalVideo[]) => void;
  onDeleteLocalVideo: (id: string) => void;
  onApproveKyc: (appId: string) => void;
  onRejectKyc: (appId: string) => void;
  onToggleFeatureTour: (tourId: string) => void;
  /**
   * Grants or revokes the `admin` role on someone else's profile.
   *
   * This is the only way an account can become an administrator. Registration
   * cannot do it — firestore.rules pin profile *creation* to
   * `role in ['customer','host']` — and no user may edit their own role, since
   * the self-update branch requires `request.resource.data.role ==
   * resource.data.role`. The one branch that can change a role is `isAdmin()`,
   * and `isAdmin()` reads the caller's own profile document on the server. So
   * the chain has to start somewhere outside the app: the seeded operations
   * account, written by the Admin SDK in `scripts/seed-firestore.ts`.
   */
  onSetUserRole: (user: User, role: UserRole) => void;
}

export const AdminHub: React.FC<AdminHubProps> = ({
  kycApplications,
  tours,
  bookings,
  users,
  activeUser,
  onOpenConversation,
  language,
  currency,
  localVideos,
  onSaveLocalVideos,
  onDeleteLocalVideo,
  onApproveKyc,
  onRejectKyc,
  onToggleFeatureTour,
  onSetUserRole,
}) => {
  const t = translations[language];
  const [selectedKyc, setSelectedKyc] = useState<HostKycApplication | null>(kycApplications[0] || null);

  /**
   * The applications arrive from Firestore after this component mounts, so the
   * initial state above is almost always null on a fresh sign-in — leaving the
   * detail panel blank next to a populated list. Select the first one as soon
   * as there is one, and follow it when an approval rewrites the row.
   */
  useEffect(() => {
    if (kycApplications.length === 0) {
      setSelectedKyc(null);
      return;
    }
    setSelectedKyc((current) =>
      current ? kycApplications.find((k) => k.id === current.id) ?? kycApplications[0] : kycApplications[0],
    );
  }, [kycApplications]);
  /* The console opens on the numbers. Verification is the queue an admin
     comes here to work through, but what the platform did this month is
     what they came to find out. */
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kyc' | 'tours' | 'videos' | 'safety' | 'team'>('dashboard');
  const [memberQuery, setMemberQuery] = useState('');
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [sosLoadError, setSosLoadError] = useState('');

  useEffect(() => {
    let unsubscribe = () => undefined;
    let disposed = false;
    void subscribeSosAlerts(
      (alerts) => {
        if (!disposed) {
          setSosAlerts(alerts);
          setSosLoadError('');
        }
      },
      () => {
        if (!disposed) setSosLoadError(language === 'vi' ? 'Không tải được hàng đợi SOS.' : 'Could not load SOS queue.');
      },
    ).then((stop) => {
      if (disposed) stop();
      else unsubscribe = stop;
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [language]);

  const activeSosAlerts = useMemo(() => sosAlerts.filter((alert) => alert.status === 'active'), [sosAlerts]);

  const admins = useMemo(() => users.filter((u) => u.role === 'admin'), [users]);

  /**
   * Candidates for promotion.
   *
   * Searched rather than listed: the profile list grows with every signup, and
   * granting admin is a deliberate act aimed at one person you already know,
   * not something to do by scrolling. An empty box therefore shows nothing.
   */
  const memberMatches = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return users
      .filter((u) => u.role !== 'admin')
      .filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [users, memberQuery]);

  /**
   * Platform metrics, counted from the bookings and profiles in Firestore.
   *
   * These were four hard-coded constants — 148.5M in GMV, 48 hosts, 14 live
   * trips — displayed as if they were measurements. An operations console that
   * shows invented numbers is worse than one that shows a zero, because a zero
   * is at least true and tells you the platform is quiet.
   *
   * Cancelled bookings are excluded; commission is summed from each booking's
   * own `platformFeeVND` rather than re-derived from a 15% rule, so a booking
   * taken under different terms still reports what it really was.
   *
   * It is commission DUE, not collected. The platform processes no payment, so
   * this figure was renamed off "escrow fee" — the previous label described
   * money the project had never touched.
   */
  const { totalGmvVND, commissionDueVND, activeHostsCount, hostTotal, travellerCount, liveTrips } =
    useMemo(() => {
      const billable = bookings.filter((b) => b.status !== 'cancelled');
      const hosts = users.filter((u) => u.role === 'host');
      return {
        totalGmvVND: billable.reduce((sum, b) => sum + (b.totalPriceVND || 0), 0),
        commissionDueVND: billable.reduce((sum, b) => sum + (b.platformFeeVND || 0), 0),
        activeHostsCount: hosts.filter((u) => u.verified).length,
        hostTotal: hosts.length,
        travellerCount: users.filter((u) => u.role === 'customer').length,
        liveTrips: bookings.filter((b) => b.status === 'confirmed'),
      };
    }, [bookings, users]);
  const liveBookingsCount = liveTrips.length;
  const pendingKycCount = kycApplications.filter((k) => k.status === 'pending').length;

  const handleApprove = (id: string) => {
    onApproveKyc(id);
    sounds.playSuccessChime();
    const updated = kycApplications.find(k => k.id === id);
    if (updated) {
      setSelectedKyc({ ...updated, status: 'approved' });
    }
  };

  const handleReject = (id: string) => {
    onRejectKyc(id);
    sounds.playNotificationPing();
    const updated = kycApplications.find(k => k.id === id);
    if (updated) {
      setSelectedKyc({ ...updated, status: 'rejected' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Admin Operations Banner */}
      <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-[#400B0B] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-500/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold mb-2 border border-red-500/30">
              <i className="fa-solid fa-shield-halved text-xs"></i>
              <span>{language === 'vi' ? 'Bảng điều khiển quản trị' : 'Platform Trust & Safety Admin'}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-3xl font-bold tracking-tight">
              {t.adminTitle}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              {t.adminSubtitle}
            </p>
          </div>

          {/* "All Services Operational" was a green light wired to nothing —
              no health check exists, so it would have stayed green through a
              total outage. What an operator can actually use is the size of
              their queue. */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 border ${
                pendingKycCount > 0
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                  : 'bg-white/5 border-white/15 text-stone-300'
              }`}
            >
              <i className="fa-solid fa-inbox text-[11px]"></i>
              <span>
                {pendingKycCount > 0
                  ? language === 'vi'
                    ? `${pendingKycCount} hồ sơ xác minh chờ duyệt`
                    : `${pendingKycCount} verification request${pendingKycCount === 1 ? '' : 's'} waiting`
                  : language === 'vi'
                    ? 'Không có hồ sơ nào chờ duyệt'
                    : 'No applications waiting'}
              </span>
            </span>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.totalGmv}</span>
            <span className="text-lg sm:text-xl font-extrabold text-amber-300">
              {currency === 'USD' ? `$${Math.round(totalGmvVND / 25000)}` : `${totalGmvVND.toLocaleString('vi-VN')}₫`}
            </span>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">
              {language === 'vi' ? 'Hoa hồng host phải trả' : 'Commission owed by hosts'}
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-400">
              {currency === 'USD'
                ? `$${Math.round(commissionDueVND / 25000)}`
                : `${commissionDueVND.toLocaleString('vi-VN')}₫`}
            </span>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.totalHosts}</span>
            <span className="text-lg sm:text-xl font-extrabold text-white">
              {activeHostsCount}
              <span className="text-sm text-stone-400 font-bold"> / {hostTotal}</span>
            </span>
            <span className="text-[10px] text-stone-500 block mt-0.5">
              {language === 'vi' ? 'đã xác minh' : 'verified'}
            </span>
          </div>

          {/* Was "Safety score: 100% Escrow Protected" — a score with no formula
              behind it, for an escrow account that does not exist. */}
          <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">
              {language === 'vi' ? 'Người dùng' : 'Accounts'}
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-white">{users.length}</span>
            <span className="text-[10px] text-stone-500 block mt-0.5">
              {language === 'vi'
                ? `${travellerCount} khách • ${hostTotal} host • ${admins.length} admin`
                : `${travellerCount} travellers • ${hostTotal} hosts • ${admins.length} admins`}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'dashboard' ? 'bg-[#A82323] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <i className="fa-solid fa-chart-column mr-1.5"></i>
          {language === 'vi' ? 'Tổng quan' : 'Dashboard'}
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'kyc' ? 'bg-[#A82323] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <i className="fa-solid fa-id-card mr-1.5"></i>
          {t.pendingKycTitle} ({kycApplications.length})
        </button>

        <button
          onClick={() => setActiveTab('tours')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'tours' ? 'bg-[#A82323] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <i className="fa-solid fa-layer-group mr-1.5"></i>
          {t.allToursMod} ({tours.length})
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'videos' ? 'bg-[#A82323] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <i className="fa-brands fa-youtube mr-1.5"></i>
          {language === 'vi' ? 'Video địa phương' : 'Local videos'} ({localVideos.length})
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'safety' ? 'bg-[#A82323] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <i className="fa-solid fa-tower-broadcast mr-1.5"></i>
          {language === 'vi' ? 'An toàn & SOS' : 'Safety & SOS'} ({activeSosAlerts.length})
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'team' ? 'bg-[#A82323] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <i className="fa-solid fa-user-shield mr-1.5"></i>
          {language === 'vi' ? 'Quyền quản trị' : 'Administrators'} ({admins.length})
        </button>
      </div>

      {/* TAB 0: THE NUMBERS */}
      {activeTab === 'dashboard' && (
        <AdminDashboard
          tours={tours}
          bookings={bookings}
          users={users}
          language={language}
          currency={currency}
        />
      )}

      {/* TAB 1: HOST IDENTITY VERIFICATION CENTER */}
      {activeTab === 'kyc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Applications List (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-4 border border-stone-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-stone-500 uppercase tracking-wider px-2">
              {language === 'vi' ? 'Hồ sơ chờ & Đã xét duyệt' : 'Pending & Reviewed Applications'}
            </h3>

            <div className="space-y-2">
              {kycApplications.map((app) => {
                const isSelected = selectedKyc?.id === app.id;

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedKyc(app)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#A82323] bg-red-50/50 ring-1 ring-[#A82323]'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-stone-900">{app.fullName}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status.toUpperCase()}
                      </span>
                    </div>
                    {/* This row used to read "AI Match: 98.4% • Record: CLEAN"
                        for every application. Nothing measured either one —
                        both were constants in the fixtures, and a reviewer who
                        trusts a made-up score is worse off than one shown
                        nothing at all. */}
                    <p className="text-[11px] text-stone-500 mt-0.5 font-mono tracking-wide">
                      {formatCccd(app.cccdNumber)}
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">{app.submittedDate}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side-by-Side Detailed Document Preview (7 Cols) */}
          {selectedKyc && (
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-200">
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-base text-stone-900 truncate">
                    {selectedKyc.fullName}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {language === 'vi' ? 'Gửi ngày' : 'Submitted'} {selectedKyc.submittedDate}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${
                    selectedKyc.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedKyc.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedKyc.status.toUpperCase()}
                </span>
              </div>

              {/* What the host typed, and nothing else.
                  The two ID-card photographs that used to sit here are gone on
                  purpose: from 1 January 2026 Nghị định 356/2025/NĐ-CP treats a
                  picture of a citizen ID card as sensitive personal data, and
                  Firestore is hosted outside Vietnam. Not holding the image is
                  the cheapest compliance available, and a reviewer can be shown
                  the card out of band if they need to see it. */}
              <dl className="space-y-3 text-sm">
                <KycRow
                  label={language === 'vi' ? 'Họ và tên' : 'Full name'}
                  value={selectedKyc.fullName}
                />
                <KycRow
                  label={language === 'vi' ? 'Số căn cước' : 'Citizen ID'}
                  value={formatCccd(selectedKyc.cccdNumber)}
                  mono
                />
                <KycRow
                  label={language === 'vi' ? 'Ngày sinh' : 'Date of birth'}
                  value={selectedKyc.dateOfBirth}
                />
                <KycRow
                  label={language === 'vi' ? 'Quốc tịch' : 'Nationality'}
                  value={selectedKyc.nationality}
                />
                <KycRow
                  label={language === 'vi' ? 'Địa chỉ thường trú' : 'Permanent address'}
                  value={selectedKyc.address}
                />
              </dl>

              <p className="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-xl p-3 leading-relaxed">
                {language === 'vi'
                  ? 'Đây là thông tin host tự khai. ViS-Go không đối chiếu với Cơ sở dữ liệu quốc gia về dân cư — duyệt nghĩa là bạn đã đọc và chịu trách nhiệm.'
                  : 'These are details the host declared. ViS-Go does not check them against the national population database — approving means you read them and take responsibility.'}
              </p>

              {/* Action Buttons: Approve / Reject */}
              <div className="pt-3 border-t border-stone-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleReject(selectedKyc.id)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  {t.rejectHost}
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(selectedKyc.id)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check text-white"></i>
                  <span>{t.approveHost}</span>
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {activeTab === 'videos' && (
        <LocalVideoManager
          videos={localVideos}
          language={language}
          onSave={onSaveLocalVideos}
          onDelete={onDeleteLocalVideo}
        />
      )}

      {/* TAB 2: TOURS CATALOG MODERATION */}
      {activeTab === 'tours' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900">{t.allToursMod}</h3>
          <div className="space-y-3">
            {tours.map((tour) => (
              <div key={tour.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={tour.coverImage} alt={tour.title} className="w-16 h-16 rounded-xl object-cover" />
                  <div>
                    <h4 className="font-bold text-xs text-stone-900">{tour.title}</h4>
                    <p className="text-[11px] text-stone-500">{tour.city} • By {tour.hostName} • {tour.priceVND.toLocaleString('vi-VN')}₫</p>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold mt-1 inline-block">
                      ★ {tour.hostRating.toFixed(2)} ({tour.hostReviewCount} reviews)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onToggleFeatureTour(tour.id);
                      sounds.playNotificationPing();
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                      tour.featured
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    <i className="fa-solid fa-crown mr-1 text-amber-500"></i>
                    {tour.featured ? 'Featured on Top' : 'Set as Featured'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SAFETY DISPATCH & ACTIVE TRIPS */}
      {activeTab === 'safety' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif font-bold text-base text-red-800">
                {language === 'vi' ? 'Cảnh báo SOS tới admin' : 'Admin SOS alerts'}
              </h3>
              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-black">
                {activeSosAlerts.length} {language === 'vi' ? 'ĐANG MỞ' : 'OPEN'}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {language === 'vi'
                ? 'Đây là cảnh báo nội bộ ViS-Go. Hệ thống không tự động liên hệ công an hoặc dịch vụ khẩn cấp.'
                : 'This is an internal ViS-Go queue. The system does not automatically contact police or emergency services.'}
            </p>

            {sosLoadError && <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200">{sosLoadError}</div>}

            {activeSosAlerts.length === 0 ? (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-500 text-center">
                {language === 'vi' ? 'Không có cảnh báo SOS đang mở.' : 'No open SOS alerts.'}
              </div>
            ) : (
              <div className="space-y-3">
                {activeSosAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black text-red-900">
                        SOS • {alert.reporterName} • #{alert.bookingId}
                      </p>
                      <time className="text-[10px] text-red-700">{new Date(alert.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</time>
                    </div>
                    <p className="text-[11px] text-stone-700 font-mono">
                      {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                      {alert.accuracyMeters !== null ? ` • ±${alert.accuracyMeters}m` : ''}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={buildGoogleMapsCoordUrl(alert.latitude, alert.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-red-300 text-red-800 text-[11px] font-bold text-center"
                      >
                        <i className="fa-solid fa-map-location-dot mr-1.5"></i>
                        {language === 'vi' ? 'Mở tọa độ' : 'Open coordinates'}
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          await updateSosStatus(alert.id, 'resolved');
                          sounds.playSuccessChime();
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-[11px] font-bold cursor-pointer"
                      >
                        <i className="fa-solid fa-check mr-1.5"></i>
                        {language === 'vi' ? 'Đánh dấu đã xử lý' : 'Mark resolved'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900">
            {language === 'vi' ? 'Chuyến đi đang diễn ra' : 'Active live trips'}
          </h3>
          <p className="text-xs text-stone-500">
            {language === 'vi'
              ? 'Danh sách booking đã xác nhận. ViS-Go không thu hoặc hiển thị vị trí liên tục tại đây.'
              : 'Confirmed bookings. ViS-Go does not collect or display continuous location telemetry here.'}
          </p>

          {liveTrips.length === 0 ? (
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center">
              <i className="fa-solid fa-satellite-dish text-stone-300 text-2xl mb-2"></i>
              <p className="text-xs text-stone-500">
                {language === 'vi'
                  ? 'Hiện không có chuyến đi nào đang diễn ra.'
                  : 'No trips are currently in progress.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveTrips.map((trip) => (
                <div key={trip.id} className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-emerald-900 truncate">
                      Trip #{trip.id} ({trip.city})
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold shrink-0">
                      {language === 'vi' ? 'ĐÃ XÁC NHẬN' : 'CONFIRMED'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700">
                    <strong>Host:</strong> {trip.hostName} ↔ <strong>Guest:</strong> {trip.customerName}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {language === 'vi' ? 'Điểm hẹn' : 'Meeting Point'}: {trip.meetingPoint} • {trip.bookingDate} {trip.bookingTime}
                  </p>
                  <button
                    onClick={() => {
                      sounds.playTap();
                      onOpenConversation(trip);
                    }}
                    className="w-full mt-1 px-3 py-1.5 bg-white hover:bg-stone-50 border border-emerald-300 text-emerald-900 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <i className="fa-regular fa-comments mr-1.5"></i>
                    {language === 'vi' ? 'Xem hội thoại' : 'Read conversation'}
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* TAB 4: WHO IS AN ADMINISTRATOR */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Current administrators */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900">
              {language === 'vi' ? 'Quản trị viên hiện tại' : 'Current administrators'}
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              {language === 'vi'
                ? 'Không ai tự đăng ký thành quản trị viên được. Trang đăng ký chỉ có hai vai trò — khách và host — và quy tắc bảo mật của Firestore từ chối mọi hồ sơ tạo mới với vai trò admin. Quyền này chỉ có thể do một quản trị viên đang có cấp cho người khác.'
                : 'Nobody can register as an administrator. Sign-up offers two roles — traveller and host — and the Firestore rules refuse any profile created with the admin role. The only way in is an existing administrator granting it.'}
            </p>

            <div className="space-y-2 pt-1">
              {admins.map((a) => {
                const isSelf = a.id === activeUser?.id;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200"
                  >
                    <Avatar src={a.avatar} name={a.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 truncate">{a.name}</p>
                      <p className="text-[11px] text-stone-500 truncate">{a.email}</p>
                    </div>
                    {isSelf ? (
                      <span className="px-2 py-1 rounded-lg bg-stone-200 text-stone-600 text-[10px] font-bold shrink-0">
                        {language === 'vi' ? 'BẠN' : 'YOU'}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          sounds.playNotificationPing();
                          onSetUserRole(a, 'customer');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-stone-700 text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
                      >
                        {language === 'vi' ? 'Thu hồi' : 'Revoke'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* An admin who demotes themselves cannot undo it — the button that
                would undo it is on a page they can no longer open. So that one
                case is a label, not a button, above. */}
            <p className="text-[11px] text-stone-400 pt-1">
              {language === 'vi'
                ? 'Bạn không thể tự thu hồi quyền của chính mình: sau khi thu hồi, trang này sẽ không mở được nữa để hoàn tác.'
                : 'You cannot revoke your own access: once revoked, this page is no longer reachable to undo it.'}
            </p>
          </div>

          {/* Grant */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900">
              {language === 'vi' ? 'Cấp quyền quản trị' : 'Grant administrator access'}
            </h3>

            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
              <input
                type="text"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder={
                  language === 'vi'
                    ? 'Tìm theo tên hoặc email tài khoản đã đăng ký…'
                    : 'Search a registered account by name or email…'
                }
                className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-xs text-stone-900 outline-hidden transition-all"
              />
            </div>

            {memberQuery.trim().length < 2 ? (
              <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                <i className="fa-solid fa-user-shield text-stone-300 text-2xl mb-2"></i>
                <p className="text-xs text-stone-500">
                  {language === 'vi'
                    ? 'Nhập ít nhất 2 ký tự để tìm tài khoản.'
                    : 'Type at least 2 characters to find an account.'}
                </p>
              </div>
            ) : memberMatches.length === 0 ? (
              <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                <p className="text-xs text-stone-500">
                  {language === 'vi'
                    ? 'Không có tài khoản nào khớp. Người đó phải tự đăng ký trước rồi mới cấp quyền được.'
                    : 'No account matches. They must register themselves before they can be granted access.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {memberMatches.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                    <Avatar src={u.avatar} name={u.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 truncate">{u.name}</p>
                      <p className="text-[11px] text-stone-500 truncate">
                        {u.email} • {u.role === 'host' ? (language === 'vi' ? 'Host' : 'Host') : (language === 'vi' ? 'Khách' : 'Traveller')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const ok = window.confirm(
                          language === 'vi'
                            ? `Cấp quyền quản trị cho ${u.name} (${u.email})?\n\nQuản trị viên đọc được mọi hội thoại, mọi đơn đặt và mọi giấy tờ xác minh, và có thể cấp quyền này cho người khác.`
                            : `Grant administrator access to ${u.name} (${u.email})?\n\nAdministrators can read every conversation, booking and verification document, and can grant this access to others.`,
                        );
                        if (!ok) return;
                        sounds.playSuccessChime();
                        onSetUserRole(u, 'admin');
                        setMemberQuery('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#A82323] hover:bg-[#8C1818] text-white text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
                    >
                      {language === 'vi' ? 'Cấp quyền admin' : 'Make admin'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

/** One declared field in the review panel. */
const KycRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
    <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider sm:w-40 shrink-0">{label}</dt>
    <dd className={`text-stone-900 break-words ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</dd>
  </div>
);
