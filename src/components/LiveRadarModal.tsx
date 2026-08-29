import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Booking, Language, User } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { RadarMap, type RadarMapHandle } from './RadarMap';
import { LocationConsentGate } from './LocationConsentGate';
import { StopSharingDialog } from './StopSharingDialog';
import {
  grantSharing,
  shareVerdict,
  formatRemaining,
  type ShareVerdict,
} from '../utils/locationSharing';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsCoordUrl,
  haversineKm,
  formatDistance,
} from '../utils/googleMaps';

interface LiveRadarModalProps {
  isOpen: boolean;
  booking?: Booking | null;
  activeUser: User | null;
  language: Language;
  onClose: () => void;
  onOpenChat: () => void;
}

// Landmark presets for quick testing when physical GPS is far or denied
const VIETNAM_LANDMARKS = [
  { name: 'Hà Nội - Nhà Hát Lớn', lat: 21.0245, lng: 105.8576, hostLat: 21.0315, hostLng: 105.8525 },
  { name: 'Sài Gòn - Chợ Bến Thành', lat: 10.7724, lng: 106.6983, hostLat: 10.7785, hostLng: 106.7032 },
  { name: 'Đà Nẵng - Cầu Rồng', lat: 16.0613, lng: 108.2272, hostLat: 16.0685, hostLng: 108.2215 },
  { name: 'Hội An - Chùa Cầu', lat: 15.8771, lng: 108.3260, hostLat: 15.8825, hostLng: 108.3312 },
  { name: 'Huế - Đại Nội', lat: 16.4687, lng: 107.5786, hostLat: 16.4635, hostLng: 107.5852 },
  { name: 'Đà Lạt - Hồ Xuân Hương', lat: 11.9404, lng: 108.4380, hostLat: 11.9465, hostLng: 108.4435 },
];

export const LiveRadarModal: React.FC<LiveRadarModalProps> = ({
  isOpen,
  booking,
  activeUser,
  language,
  onClose,
  onOpenChat,
}) => {
  const isVi = language === 'vi';
  const t = translations[language];

  const mapRef = useRef<RadarMapHandle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [mapBackend, setMapBackend] = useState<'google' | 'leaflet'>('leaflet');

  // Coordinates
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 21.0285,
    lng: 105.8542,
  });

  const [hostCoords, setHostCoords] = useState<{ lat: number; lng: number }>({
    lat: 21.0335,
    lng: 105.8505,
  });

  // GPS Realtime Metadata
  const [gpsStatus, setGpsStatus] = useState<
    'acquiring' | 'locked' | 'permission_denied' | 'unavailable' | 'timeout' | 'insecure' | 'simulated'
  >('acquiring');
  const [gpsError, setGpsError] = useState<string>('');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  /**
   * Whether we may read the device's position, decided by locationSharing.ts.
   * This used to be a plain `useState(true)`: the radar started tracking the
   * moment it opened, and the off switch was lost on the next remount.
   */
  const [verdict, setVerdict] = useState<ShareVerdict>({ state: 'none' });
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const isGpsSharing = verdict.state === 'active';
  const [distanceKm, setDistanceKm] = useState<string>('0.75');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(4);
  const [hostSpeedKmh, setHostSpeedKmh] = useState<number>(24);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosModalOpen, setSosModalOpen] = useState<boolean>(false);

  // Great-circle distance in km between two coordinates.
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) =>
    haversineKm({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });

  // The grant is re-checked on open and then every 15s while the radar is up,
  // so an expiry ends tracking on its own without the user doing anything and
  // without waiting for a remount.
  useEffect(() => {
    if (!isOpen) return;
    const evaluate = () => setVerdict(shareVerdict(booking));
    evaluate();
    const id = setInterval(evaluate, 15_000);
    return () => clearInterval(id);
  }, [isOpen, booking]);

  // Continuous hardware GPS tracking via navigator.geolocation.watchPosition.
  useEffect(() => {
    if (!isOpen) return;

    const clearWatch = () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };

    if (!isGpsSharing) {
      clearWatch();
      setGpsStatus('simulated');
      setGpsError('');
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      setGpsError(isVi ? 'Trình duyệt không hỗ trợ định vị.' : 'This browser does not support geolocation.');
      return;
    }

    // Browsers silently refuse geolocation on plain http:// (localhost aside),
    // which used to surface as a generic "permission denied" and send people
    // hunting through their browser settings for nothing.
    if (!window.isSecureContext) {
      setGpsStatus('insecure');
      setGpsError(
        isVi
          ? 'Định vị chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở app qua https:// hoặc http://localhost.'
          : 'Geolocation only works over HTTPS or on localhost. Open the app via https:// or http://localhost.'
      );
      return;
    }

    setGpsStatus('acquiring');
    setGpsError('');

    const successHandler = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy || 10);

      setUserCoords({ lat, lng });
      setAccuracyMeters(acc);
      setGpsStatus('locked');
      setGpsError('');
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // On the first real fix, drop the buddy nearby instead of leaving them
      // stranded at the default Hanoi coordinates.
      setHostCoords((prev) => {
        const dist = calculateDistance(lat, lng, prev.lat, prev.lng);
        if (dist > 5) {
          return { lat: lat + 0.0035, lng: lng + 0.0032 };
        }
        return prev;
      });
    };

    const errorHandler = (err: GeolocationPositionError) => {
      console.warn('[ViS-Go] Geolocation error:', err.code, err.message);

      switch (err.code) {
        case err.PERMISSION_DENIED:
          setGpsStatus('permission_denied');
          setGpsError(
            isVi
              ? 'Bạn đã từ chối quyền truy cập vị trí. Bấm vào biểu tượng ổ khóa trên thanh địa chỉ để cấp lại quyền, hoặc chọn một điểm hẹn mẫu bên dưới.'
              : 'Location access was denied. Use the padlock icon in the address bar to allow it, or pick a sample meeting point below.'
          );
          break;
        case err.POSITION_UNAVAILABLE:
          setGpsStatus('unavailable');
          setGpsError(
            isVi
              ? 'Không lấy được tín hiệu vệ tinh. Hãy thử ra ngoài trời hoặc bật Wi-Fi để định vị chính xác hơn.'
              : 'No satellite signal. Try moving outdoors or turning on Wi-Fi to improve positioning.'
          );
          break;
        case err.TIMEOUT:
          setGpsStatus('timeout');
          setGpsError(
            isVi
              ? 'Hết thời gian chờ định vị. Đang thử lại...'
              : 'Locating timed out. Retrying...'
          );
          break;
        default:
          setGpsStatus('unavailable');
          setGpsError(err.message || (isVi ? 'Lỗi định vị không xác định.' : 'Unknown geolocation error.'));
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    });

    return clearWatch;
  }, [isOpen, isGpsSharing, isVi]);

  // Real-time host buddy scooter simulation tick (approaching traveler)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setHostCoords((currentHost) => {
        const dLat = userCoords.lat - currentHost.lat;
        const dLng = userCoords.lng - currentHost.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        // If very close, slight fluctuation
        if (dist < 0.0003) {
          setHostSpeedKmh(0);
          return currentHost;
        }

        // Move 5% closer per tick to simulate 25-30 km/h scooter movement
        const step = 0.04;
        const newLat = currentHost.lat + dLat * step;
        const newLng = currentHost.lng + dLng * step;
        setHostSpeedKmh(Math.floor(22 + Math.random() * 8));

        return { lat: newLat, lng: newLng };
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, userCoords]);

  // Compute live distance and ETA
  useEffect(() => {
    const dist = calculateDistance(userCoords.lat, userCoords.lng, hostCoords.lat, hostCoords.lng);
    setDistanceKm(formatDistance(dist));
    const mins = Math.max(1, Math.round((dist / (hostSpeedKmh || 25)) * 60));
    setEstimatedMinutes(mins);
  }, [userCoords, hostCoords, hostSpeedKmh]);

  const handleCenterOnUser = useCallback(() => {
    mapRef.current?.centerOn(userCoords, 16);
    sounds.playTap();
  }, [userCoords]);

  const handleFitRoute = useCallback(() => {
    mapRef.current?.fitBoth();
    sounds.playTap();
  }, []);

  const handleSelectLandmark = (landmark: typeof VIETNAM_LANDMARKS[0]) => {
    setUserCoords({ lat: landmark.lat, lng: landmark.lng });
    setHostCoords({ lat: landmark.hostLat, lng: landmark.hostLng });
    setGpsStatus('simulated');
    setGpsError('');
    setAccuracyMeters(5);
    sounds.playNotificationPing();
    mapRef.current?.centerOn({ lat: landmark.lat, lng: landmark.lng }, 15);
  };

  const handleTriggerSOS = () => {
    // The one deliberate exception to the consent gate. Confirming SOS *is*
    // consent to share position: an alert carrying the default Hanoi fallback
    // coordinates would be worse than no alert, because it sends help to the
    // wrong place. The grant created here is bound by the same expiry and the
    // same PIN-protected stop as any other.
    if (booking && verdict.state !== 'active') {
      grantSharing(booking);
      setVerdict(shareVerdict(booking));
    }
    setSosActive(true);
    setSosModalOpen(false);
    sounds.playSosSiren();
  };

  const handleCancelSOS = () => {
    setSosActive(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#991B1B] to-[#7F1D1D] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <i className="fa-solid fa-location-crosshairs text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base sm:text-lg">{t.radarTitle}</h3>
                {gpsStatus === 'locked' && (
                  <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    GPS REALTIME {accuracyMeters ? `(±${accuracyMeters}m)` : ''}
                  </span>
                )}
                {gpsStatus === 'acquiring' && (
                  <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                    ĐANG KẾT NỐI VỆ TINH...
                  </span>
                )}
                {gpsStatus === 'simulated' && (
                  <span className="px-2 py-0.5 bg-stone-700 text-amber-300 text-[10px] font-bold rounded-full">
                    {isVi ? 'ĐIỂM HẸN MẪU' : 'SAMPLE LOCATION'}
                  </span>
                )}
                {(gpsStatus === 'permission_denied' ||
                  gpsStatus === 'unavailable' ||
                  gpsStatus === 'timeout' ||
                  gpsStatus === 'insecure') && (
                  <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-full">
                    {isVi ? 'CHƯA CÓ GPS' : 'GPS UNAVAILABLE'}
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100/90 hidden sm:block">
                {isVi ? 'Định vị vệ tinh thời gian thực & kết nối Host bản địa' : 'Real-time satellite GPS tracking & live Host buddy connection'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* While the consent gate is up the map — and with it the big SOS
                button — is not rendered. An emergency control must not be
                reachable only after agreeing to routine tracking. */}
            {verdict.state !== 'active' && (
              <button
                onClick={() => setSosModalOpen(true)}
                className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg"
                title={t.sosPanicButton}
              >
                <i className="fa-solid fa-bell text-amber-300"></i>
                SOS
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/*
          Until this booking has an active grant the radar shows the consent
          screen and nothing else. Rendering the map underneath would invite
          the reflex of tapping past the explanation.
        */}
        {booking && verdict.state === 'scheduled' && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <i className="fa-regular fa-clock text-xl"></i>
            </span>
            <h3 className="text-sm font-bold text-stone-900">
              {isVi ? 'Đã bật — sẽ bắt đầu trước giờ hẹn' : 'Enabled — starts before your meetup'}
            </h3>
            <p className="max-w-sm text-xs leading-relaxed text-stone-500">
              {isVi
                ? `Chia sẻ vị trí với ${verdict.grant.hostName} sẽ tự bật sau ${formatRemaining(
                    verdict.opensInMs,
                    true,
                  )}, tức 1 giờ trước giờ hẹn. Từ giờ tới lúc đó ViS-Go không đọc vị trí của bạn.`
                : `Sharing with ${verdict.grant.hostName} switches on in ${formatRemaining(
                    verdict.opensInMs,
                    false,
                  )} — one hour before the meeting time. Until then ViS-Go reads nothing.`}
            </p>
            <button
              onClick={() => setStopDialogOpen(true)}
              className="mt-1 cursor-pointer rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              <i className="fa-solid fa-key mr-1.5"></i>
              {isVi ? 'Huỷ chia sẻ (cần mã PIN)' : 'Cancel sharing (PIN required)'}
            </button>
          </div>
        )}

        {booking && (verdict.state === 'none' || verdict.state === 'expired') && (
          <LocationConsentGate
            booking={booking}
            language={language}
            onGrant={() => {
              grantSharing(booking);
              setVerdict(shareVerdict(booking));
            }}
            onCancel={onClose}
          />
        )}

        {(!booking || verdict.state === 'active') && (
        <>
        {/* SOS Alert Banner if Active */}
        {sosActive && (
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between animate-pulse shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold">
              <i className="fa-solid fa-triangle-exclamation text-base"></i>
              <span>{t.sosTriggered} (Công an Du lịch 113 & Trung tâm ViS-Go đã nhận tọa độ)</span>
            </div>
            <button
              onClick={handleCancelSOS}
              className="px-3 py-1 bg-white text-red-700 text-xs font-black rounded-lg uppercase tracking-wider cursor-pointer hover:bg-stone-100"
            >
              {t.sosCancel}
            </button>
          </div>
        )}

        {/*
          Always-on indicator. A safety feature that shares your position must
          never be something you can forget is running.
        */}
        {verdict.state === 'active' && (
          <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] text-emerald-900">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
              </span>
              {isVi ? 'Đang chia sẻ vị trí với' : 'Sharing live location with'} {verdict.grant.hostName}
            </span>
            <span className="text-emerald-700">
              <i className="fa-regular fa-clock mr-1"></i>
              {isVi ? 'Tự tắt sau' : 'Auto-stops in'} {formatRemaining(verdict.endsInMs, isVi)}
            </span>
            <button
              onClick={() => setStopDialogOpen(true)}
              className="ml-auto cursor-pointer rounded-lg bg-emerald-700 px-2.5 py-1 font-bold text-white transition-colors hover:bg-emerald-800"
            >
              <i className="fa-solid fa-key mr-1"></i>
              {isVi ? 'Tắt' : 'Stop'}
            </button>
          </div>
        )}

        {/* Distance & ETA Live Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-stone-100/90 border-b border-stone-200 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] text-stone-400 font-semibold block">{t.distanceToHost}</span>
            <span className="font-extrabold text-stone-900 text-sm">{distanceKm}</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] text-stone-400 font-semibold block">{t.estimatedEta}</span>
            <span className="font-extrabold text-[#A82323] text-sm flex items-center gap-1">
              <i className="fa-solid fa-motorcycle text-xs"></i>
              ~{estimatedMinutes} {isVi ? 'phút' : 'mins'} ({hostSpeedKmh} km/h)
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] text-stone-400 font-semibold block">{t.hostLocation}</span>
            <span className="font-bold text-stone-800 text-xs truncate block">
              {booking?.hostName || '—'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] text-stone-400 font-semibold block">GPS Live Status</span>
              <span
                className={`font-bold text-xs flex items-center gap-1 ${
                  isGpsSharing ? 'text-emerald-700' : 'text-stone-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isGpsSharing ? 'bg-emerald-500' : 'bg-stone-400'}`}
                ></span>
                {isGpsSharing ? (isVi ? 'Đang chia sẻ' : 'Sharing') : (isVi ? 'Tắt' : 'Off')}
              </span>
            </div>
            {/*
              Off is one tap; on is not, and neither is off without the PIN.
              This tile used to be a bare toggle, so anyone holding the phone
              could silently switch live location on or off.
            */}
            {isGpsSharing && (
              <button
                onClick={() => setStopDialogOpen(true)}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs cursor-pointer bg-stone-900 text-[#D4AF37] hover:bg-stone-800"
                title={isVi ? 'Tắt chia sẻ vị trí (cần mã PIN)' : 'Stop sharing (PIN required)'}
              >
                <i className="fa-solid fa-key"></i>
              </button>
            )}
          </div>
        </div>

        {/* Actionable GPS diagnostics — replaces the old silent failure */}
        {gpsError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2.5 text-[11px] text-amber-900 shrink-0">
            <i className="fa-solid fa-triangle-exclamation mt-0.5 text-amber-600"></i>
            <p className="leading-relaxed flex-1">{gpsError}</p>
            {(gpsStatus === 'permission_denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout') && (
              <button
                onClick={() => {
                  // Force the watch effect to tear down and re-subscribe by
                  // re-reading the grant; nothing here may bypass the policy.
                  setVerdict({ state: 'none' });
                  setTimeout(() => setVerdict(shareVerdict(booking)), 80);
                }}
                className="shrink-0 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg cursor-pointer"
              >
                {isVi ? 'Thử lại' : 'Retry'}
              </button>
            )}
          </div>
        )}

        {/* Quick Vietnam City Landmark Switcher */}
        <div className="bg-stone-50 px-3 py-1.5 border-b border-stone-200 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
          <span className="text-stone-500 font-bold whitespace-nowrap shrink-0">
            <i className="fa-solid fa-map-pin mr-1 text-[#A82323]"></i>
            {isVi ? 'Điểm hẹn mẫu:' : 'Presets:'}
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {VIETNAM_LANDMARKS.map((lm) => (
              <button
                key={lm.name}
                onClick={() => handleSelectLandmark(lm)}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:border-amber-400 border border-stone-200 text-stone-700 hover:text-stone-900 rounded-lg whitespace-nowrap text-[11px] font-medium transition-colors cursor-pointer shrink-0"
              >
                {lm.name}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Map Canvas — Google Maps when keyed, Leaflet otherwise */}
        <div className="relative flex-1 min-h-[340px] sm:min-h-[400px] bg-stone-200">
          <RadarMap
            ref={mapRef}
            userCoords={userCoords}
            hostCoords={hostCoords}
            userLabel={`${activeUser?.name || 'Traveler'} — ${t.yourLocation}`}
            hostLabel={`${booking?.hostName || 'Nguyễn Minh Tuấn (Buddy)'} — ${t.hostLocation}`}
            onBackendResolved={setMapBackend}
          />

          {/* Map Controls: Center on Me & Fit Route */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
            <button
              onClick={handleCenterOnUser}
              className="px-3 py-2 bg-white/95 hover:bg-white text-stone-800 font-bold text-xs rounded-xl shadow-lg border border-stone-200 flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-all"
              title="Căn giữa vị trí của tôi"
            >
              <i className="fa-solid fa-crosshairs text-blue-600"></i>
              <span className="hidden sm:inline">{isVi ? 'Vị trí của tôi' : 'My Location'}</span>
            </button>
            <button
              onClick={handleFitRoute}
              className="px-3 py-2 bg-white/95 hover:bg-white text-stone-800 font-bold text-xs rounded-xl shadow-lg border border-stone-200 flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-all"
              title="Xem toàn bộ lộ trình"
            >
              <i className="fa-solid fa-route text-[#A82323]"></i>
              <span className="hidden sm:inline">{isVi ? 'Toàn cảnh lộ trình' : 'Fit Route'}</span>
            </button>

            {/* Hand the live route off to the real Google Maps app */}
            <a
              href={buildGoogleMapsDirectionsUrl(userCoords, hostCoords)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-white/95 hover:bg-white text-stone-800 font-bold text-xs rounded-xl shadow-lg border border-stone-200 flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-all"
              title={isVi ? 'Mở chỉ đường trong Google Maps' : 'Open directions in Google Maps'}
            >
              <i className="fa-solid fa-diamond-turn-right text-emerald-600"></i>
              <span className="hidden sm:inline">Google Maps</span>
            </a>
          </div>

          {/* GPS Coordinates readout */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
            <a
              href={buildGoogleMapsCoordUrl(userCoords.lat, userCoords.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-stone-900/85 hover:bg-stone-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono shadow-md backdrop-blur-xs hidden sm:block cursor-pointer"
              title={isVi ? 'Mở toạ độ này trong Google Maps' : 'Open these coordinates in Google Maps'}
            >
              <i className="fa-solid fa-location-dot mr-1.5"></i>{userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)} {lastUpdated ? `• ${lastUpdated}` : ''}
            </a>
            <span className="bg-stone-900/70 text-stone-300 px-2 py-0.5 rounded-lg text-[9px] font-semibold hidden sm:block">
              {mapBackend === 'google' ? 'Google Maps' : 'OpenStreetMap'}
            </span>
          </div>

          {/* Quick Floating Chat Button */}
          <button
            onClick={() => {
              onClose();
              onOpenChat();
            }}
            className="absolute bottom-4 left-4 z-20 px-3.5 py-2.5 bg-white hover:bg-stone-50 text-stone-900 font-bold text-xs rounded-xl shadow-xl border border-stone-200 flex items-center gap-2 cursor-pointer transition-all"
          >
            <i className="fa-regular fa-comment-dots text-emerald-600 text-sm"></i>
            <span>{t.openChatWithHost}</span>
          </button>

          {/* SOS Panic Button in Bottom Right */}
          <button
            onClick={() => setSosModalOpen(true)}
            className="absolute bottom-4 right-4 z-20 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-2xl border-2 border-red-400 flex items-center gap-2 cursor-pointer transition-all uppercase tracking-wider animate-bounce"
          >
            <i className="fa-solid fa-bell text-amber-300"></i>
            <span>{t.sosPanicButton}</span>
          </button>
        </div>
        </>
        )}

      </div>

      {/* PIN prompt for stopping. Rendered above the radar so it cannot be
          dismissed by scrolling the panel behind it. */}
      {stopDialogOpen && booking && (verdict.state === 'active' || verdict.state === 'scheduled') && (
        <StopSharingDialog
          bookingId={booking.id}
          hostName={verdict.grant.hostName}
          language={language}
          onStopped={() => {
            setStopDialogOpen(false);
            setVerdict(shareVerdict(booking));
          }}
          onCancel={() => setStopDialogOpen(false)}
        />
      )}

      {/* SOS Confirmation Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border-2 border-red-600 p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-3xl">
              <i className="fa-solid fa-shield-halved"></i>
            </div>

            <h3 className="font-serif font-black text-xl text-red-700 uppercase tracking-tight">
              {t.sosPanicButton}
            </h3>

            <p className="text-xs text-stone-600 leading-relaxed">
              {t.sosWarning}
            </p>

            <div className="p-3 bg-stone-100 rounded-xl text-[11px] text-stone-700 text-left font-mono space-y-1">
              <div><i className="fa-solid fa-location-dot mr-1.5"></i>Tọa độ: {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}</div>
              <div><i className="fa-solid fa-tower-broadcast mr-1.5"></i>Điều phối khẩn cấp: Công an Du lịch 113 & ViS-Go Safety Shield</div>
              <div><i className="fa-solid fa-bolt mr-1.5"></i>Thời gian phản hồi: Giao thức tự động phát tín hiệu 24/7</div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSosModalOpen(false)}
                className="flex-1 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                {language === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleTriggerSOS}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl uppercase tracking-wider shadow-lg cursor-pointer"
              >
                {language === 'vi' ? 'Xác Nhận SOS' : 'Confirm SOS'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
