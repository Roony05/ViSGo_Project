import React, { useState } from 'react';
import { HostKycApplication, Tour, Language } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface AdminHubProps {
  kycApplications: HostKycApplication[];
  tours: Tour[];
  language: Language;
  currency: 'VND' | 'USD';
  onApproveKyc: (appId: string) => void;
  onRejectKyc: (appId: string) => void;
  onToggleFeatureTour: (tourId: string) => void;
}

export const AdminHub: React.FC<AdminHubProps> = ({
  kycApplications,
  tours,
  language,
  currency,
  onApproveKyc,
  onRejectKyc,
  onToggleFeatureTour,
}) => {
  const t = translations[language];
  const [selectedKyc, setSelectedKyc] = useState<HostKycApplication | null>(kycApplications[0] || null);
  const [activeTab, setActiveTab] = useState<'kyc' | 'tours' | 'safety'>('kyc');

  // Metrics
  const totalGmvVND = 148500000;
  const escrowFeeVND = Math.round(totalGmvVND * 0.15); // 22.2M VND
  const activeHostsCount = 48;
  const liveBookingsCount = 14;

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
              <span>{language === 'vi' ? 'Hệ Thống Kiểm Soát An Toàn 24/7' : 'Platform Trust & Safety Admin'}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-3xl font-bold tracking-tight">
              {t.adminTitle}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              {t.adminSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>All Services Operational</span>
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
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.escrowRevenue}</span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-400">
              {currency === 'USD' ? `$${Math.round(escrowFeeVND / 25000)}` : `${escrowFeeVND.toLocaleString('vi-VN')}₫`}
            </span>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.totalHosts}</span>
            <span className="text-lg sm:text-xl font-extrabold text-white">{activeHostsCount} verified</span>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.safetyScore}</span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-300">100% Escrow Protected</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
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
          onClick={() => setActiveTab('safety')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'safety' ? 'bg-[#A82323] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <i className="fa-solid fa-tower-broadcast mr-1.5"></i>
          {language === 'vi' ? 'Chuyến đi trực tiếp' : 'Active Live Trips'} ({liveBookingsCount})
        </button>
      </div>

      {/* TAB 1: HOST eKYC IDENTITY VERIFICATION CENTER */}
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
                      <h4 className="font-bold text-xs text-stone-900">{app.hostName}</h4>
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
                    <p className="text-[11px] text-stone-500 mt-0.5">{app.city} • {app.submittedDate}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-medium text-stone-600">
                      <span>AI Match: <strong className="text-emerald-700">{app.identityMatchScore}%</strong></span>
                      <span>•</span>
                      <span>Record: <strong>{app.criminalRecordStatus.toUpperCase()}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side-by-Side Detailed Document Preview (7 Cols) */}
          {selectedKyc && (
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    {selectedKyc.hostName}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {selectedKyc.hostEmail} • {selectedKyc.hostPhone} • {selectedKyc.city}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">{t.aiMatchScore}</span>
                  <span className="text-base font-black text-emerald-600">
                    {selectedKyc.identityMatchScore}% MATCH
                  </span>
                </div>
              </div>

              {/* Side-by-Side Document Previews */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
                  {t.idCardPreview}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-stone-100 rounded-xl p-2 border border-stone-200 text-center">
                    <span className="text-[10px] text-stone-500 font-semibold block mb-1">Mặt Trước (Front)</span>
                    <img
                      src={selectedKyc.idCardFront}
                      alt="ID Front"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                  <div className="bg-stone-100 rounded-xl p-2 border border-stone-200 text-center">
                    <span className="text-[10px] text-stone-500 font-semibold block mb-1">Mặt Sau (Back)</span>
                    <img
                      src={selectedKyc.idCardBack}
                      alt="ID Back"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Verified Checks List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-shield-check text-emerald-600"></i>
                    <span>{t.criminalBackground}</span>
                  </div>
                  <span className="text-[11px] block mt-0.5 font-mono">{t.cleanRecord}</span>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-certificate text-amber-600"></i>
                    <span>Certifications & Languages</span>
                  </div>
                  <span className="text-[11px] block mt-0.5">{selectedKyc.languageCert}</span>
                </div>
              </div>

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
          <h3 className="font-serif font-bold text-base text-stone-900">Active Live Trips & Escrow Protection</h3>
          <p className="text-xs text-stone-500">
            Real-time telemetry tracking active host & customer pairings across Vietnam.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900">Trip #VIS-8492 (Hà Nội)</span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold">ACTIVE GPS TRACKING</span>
              </div>
              <p className="text-xs text-stone-700"><strong>Host:</strong> Tommy (0912 345 678) ↔ <strong>Guest:</strong> Sarah Jenkins</p>
              <p className="text-[11px] text-stone-500">Meeting Point: Hanoi Opera House • Status: Normal Pace</p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900">Trip #VIS-7310 (TP. Hồ Chí Minh)</span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold">ACTIVE GPS TRACKING</span>
              </div>
              <p className="text-xs text-stone-700"><strong>Host:</strong> Mai Linh (0933 456 789) ↔ <strong>Guest:</strong> Sarah Jenkins</p>
              <p className="text-[11px] text-stone-500">Meeting Point: Cha Tam Church • Status: Normal Pace</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
