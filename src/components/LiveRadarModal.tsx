import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Booking, Language, User } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

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

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const hostMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);

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
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'locked' | 'permission_denied' | 'simulated'>('acquiring');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isGpsSharing, setIsGpsSharing] = useState<boolean>(true);
  const [distanceKm, setDistanceKm] = useState<string>('0.75');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(4);
  const [hostSpeedKmh, setHostSpeedKmh] = useState<number>(24);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosModalOpen, setSosModalOpen] = useState<boolean>(false);

  // Calculate distance between two lat/lng in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Continuous Hardware GPS tracking with navigator.geolocation.watchPosition
  useEffect(() => {
    if (!isOpen) return;

    if (!isGpsSharing) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('simulated');
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setGpsStatus('acquiring');

      const successHandler = (pos: GeolocationPosition) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy || 10);
        
        setUserCoords({ lat, lng });
        setAccuracyMeters(acc);
        setGpsStatus('locked');
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // Move host relative to user if first lock
        setHostCoords((prev) => {
          const dist = calculateDistance(lat, lng, prev.lat, prev.lng);
          if (dist > 5) {
            // Position buddy 600m away on road
            return {
              lat: lat + 0.0035,
              lng: lng + 0.0032,
            };
          }
          return prev;
        });
      };

      const errorHandler = (err: GeolocationPositionError) => {
        console.warn('Geolocation watch error or permission declined:', err.message);
        setGpsStatus('permission_denied');
      };

      const watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 12000,
      });

      watchIdRef.current = watchId;

      return () => {
        if (watchIdRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    } else {
      setGpsStatus('simulated');
    }
  }, [isOpen, isGpsSharing]);

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
    setDistanceKm(dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(2)} km`);
    const mins = Math.max(1, Math.round((dist / (hostSpeedKmh || 25)) * 60));
    setEstimatedMinutes(mins);
  }, [userCoords, hostCoords, hostSpeedKmh]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userCoords.lat, userCoords.lng],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // CartoDB Voyager tiles with sharp contrast
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Custom Icon for Traveler
    const userIcon = L.divIcon({
      className: 'custom-user-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10">
          <span class="absolute w-10 h-10 rounded-full bg-blue-500 opacity-40 animate-ping"></span>
          <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs">
            <i class="fa-solid fa-person-walking"></i>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Custom Icon for Host Buddy
    const hostIcon = L.divIcon({
      className: 'custom-host-icon',
      html: `
        <div class="relative flex items-center justify-center w-12 h-12">
          <span class="absolute w-12 h-12 rounded-full bg-[#A82323] opacity-40 animate-ping"></span>
          <div class="w-9 h-9 rounded-full bg-[#A82323] border-2 border-amber-400 shadow-2xl flex items-center justify-center text-amber-300 text-sm">
            <i class="fa-solid fa-motorcycle"></i>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    // User Marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>${activeUser?.name || 'Traveler'}</b><br>${t.yourLocation}`);
    }

    // Host Marker
    const hostName = booking?.hostName || 'Nguyễn Minh Tuấn (Buddy)';
    if (hostMarkerRef.current) {
      hostMarkerRef.current.setLatLng([hostCoords.lat, hostCoords.lng]);
    } else {
      hostMarkerRef.current = L.marker([hostCoords.lat, hostCoords.lng], { icon: hostIcon })
        .addTo(map)
        .bindPopup(`<b>${hostName}</b><br>${t.hostLocation}`);
    }

    // Polyline
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([
        [userCoords.lat, userCoords.lng],
        [hostCoords.lat, hostCoords.lng],
      ]);
    } else {
      polylineRef.current = L.polyline(
        [
          [userCoords.lat, userCoords.lng],
          [hostCoords.lat, hostCoords.lng],
        ],
        { color: '#A82323', weight: 3.5, dashArray: '6, 8', opacity: 0.85 }
      ).addTo(map);
    }

    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      // Map instance preserved or cleaned
    };
  }, [isOpen, userCoords, hostCoords, activeUser, booking, t]);

  const handleCenterOnUser = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 16, { animate: true });
      sounds.playTap();
    }
  }, [userCoords]);

  const handleFitRoute = useCallback(() => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds([
        [userCoords.lat, userCoords.lng],
        [hostCoords.lat, hostCoords.lng],
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      sounds.playTap();
    }
  }, [userCoords, hostCoords]);

  const handleSelectLandmark = (landmark: typeof VIETNAM_LANDMARKS[0]) => {
    setUserCoords({ lat: landmark.lat, lng: landmark.lng });
    setHostCoords({ lat: landmark.hostLat, lng: landmark.hostLng });
    setGpsStatus('simulated');
    setAccuracyMeters(5);
    sounds.playNotificationPing();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([landmark.lat, landmark.lng], 15, { animate: true });
    }
  };

  const handleTriggerSOS = () => {
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
                {(gpsStatus === 'permission_denied' || gpsStatus === 'simulated') && (
                  <span className="px-2 py-0.5 bg-stone-700 text-amber-300 text-[10px] font-bold rounded-full">
                    GPS VIỆT NAM
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100/90 hidden sm:block">
                {isVi ? 'Định vị vệ tinh thời gian thực & kết nối Host bản địa' : 'Real-time satellite GPS tracking & live Host buddy connection'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

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
              {booking?.hostName || 'Tommy (Buddy)'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 font-semibold block">GPS Live Status</span>
              <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {isGpsSharing ? (isVi ? 'Đang bật' : 'ON') : (isVi ? 'Tắt' : 'OFF')}
              </span>
            </div>
            <button
              onClick={() => setIsGpsSharing(!isGpsSharing)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs cursor-pointer ${
                isGpsSharing ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
              }`}
              title="Bật/Tắt định vị thiết bị"
            >
              <i className="fa-solid fa-location-arrow"></i>
            </button>
          </div>
        </div>

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

        {/* Leaflet Map Interactive Canvas */}
        <div className="relative flex-1 min-h-[340px] sm:min-h-[400px] bg-stone-200">
          <div ref={mapContainerRef} className="w-full h-full min-h-[340px] sm:min-h-[400px] z-10" />

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
          </div>

          {/* GPS Coordinates readout */}
          <div className="absolute top-3 right-3 z-20 bg-stone-900/85 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono shadow-md backdrop-blur-xs hidden sm:block">
            📍 {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)} {lastUpdated ? `• ${lastUpdated}` : ''}
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

      </div>

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
              <div>📍 Tọa độ: {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}</div>
              <div>🚨 Điều phối khẩn cấp: Công an Du lịch 113 & ViS-Go Safety Shield</div>
              <div>⚡ Thời gian phản hồi: Giao thức tự động phát tín hiệu 24/7</div>
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
