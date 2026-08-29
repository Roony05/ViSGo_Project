import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import L from 'leaflet';
import { loadGoogleMaps, HAS_GOOGLE_MAPS, type GMap, type GMarker, type GPolyline, type GoogleMapsApi } from '../utils/googleMaps';

/**
 * Live tracking map with two interchangeable rendering backends.
 *
 * - Google Maps  when VITE_GOOGLE_MAPS_API_KEY is set (needs a billing account)
 * - Leaflet + OpenStreetMap otherwise (free, keyless, no card required)
 *
 * Both render the same thing: a pulsing traveller marker, a host buddy marker,
 * and a dashed line between them. If the Google script fails to load for any
 * reason — bad key, referrer restriction, disabled billing, offline — the
 * component silently falls back to Leaflet rather than showing a blank box.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RadarMapHandle {
  centerOn: (pos: LatLng, zoom?: number) => void;
  fitBoth: () => void;
}

interface RadarMapProps {
  userCoords: LatLng;
  hostCoords: LatLng;
  userLabel: string;
  hostLabel: string;
  /** Reports which backend actually rendered, so the UI can label it honestly. */
  onBackendResolved?: (backend: 'google' | 'leaflet') => void;
}

const USER_MARKER_HTML = `
  <div class="relative flex items-center justify-center w-10 h-10">
    <span class="absolute w-10 h-10 rounded-full bg-blue-500 opacity-40 animate-ping"></span>
    <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs">
      <i class="fa-solid fa-person-walking"></i>
    </div>
  </div>`;

const HOST_MARKER_HTML = `
  <div class="relative flex items-center justify-center w-12 h-12">
    <span class="absolute w-12 h-12 rounded-full bg-[#A82323] opacity-40 animate-ping"></span>
    <div class="w-9 h-9 rounded-full bg-[#A82323] border-2 border-amber-400 shadow-2xl flex items-center justify-center text-amber-300 text-sm">
      <i class="fa-solid fa-motorcycle"></i>
    </div>
  </div>`;

/** Inline SVG pins for Google Maps, which has no HTML-marker equivalent. */
const svgPin = (fill: string, stroke: string): string =>
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
       <circle cx="20" cy="20" r="17" fill="${fill}" fill-opacity="0.25"/>
       <circle cx="20" cy="20" r="11" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
     </svg>`
  );

export const RadarMap = forwardRef<RadarMapHandle, RadarMapProps>(function RadarMap(
  { userCoords, hostCoords, userLabel, hostLabel, onBackendResolved },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [backend, setBackend] = useState<'pending' | 'google' | 'leaflet'>(
    HAS_GOOGLE_MAPS ? 'pending' : 'leaflet'
  );

  // Google Maps handles
  const gMapsApiRef = useRef<GoogleMapsApi | null>(null);
  const gMapRef = useRef<GMap | null>(null);
  const gUserRef = useRef<GMarker | null>(null);
  const gHostRef = useRef<GMarker | null>(null);
  const gLineRef = useRef<GPolyline | null>(null);

  // Leaflet handles
  const lMapRef = useRef<L.Map | null>(null);
  const lUserRef = useRef<L.Marker | null>(null);
  const lHostRef = useRef<L.Marker | null>(null);
  const lLineRef = useRef<L.Polyline | null>(null);

  // Latest coords, readable from imperative handlers without re-binding them.
  const coordsRef = useRef({ userCoords, hostCoords });
  coordsRef.current = { userCoords, hostCoords };

  /* --- Decide which backend to use, once --- */
  useEffect(() => {
    if (!HAS_GOOGLE_MAPS) {
      onBackendResolved?.('leaflet');
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then((api) => {
        if (cancelled) return;
        gMapsApiRef.current = api;
        setBackend('google');
        onBackendResolved?.('google');
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[ViS-Go] Google Maps unavailable, using Leaflet instead:', err?.message ?? err);
        setBackend('leaflet');
        onBackendResolved?.('leaflet');
      });

    return () => {
      cancelled = true;
    };
    // onBackendResolved is intentionally excluded: it is a reporting callback
    // and re-running the loader on every parent render would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- Google Maps rendering --- */
  useEffect(() => {
    if (backend !== 'google' || !containerRef.current) return;
    const maps = gMapsApiRef.current;
    if (!maps) return;

    if (!gMapRef.current) {
      gMapRef.current = new maps.Map(containerRef.current, {
        center: userCoords,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
      });
    }

    const map = gMapRef.current;

    if (gUserRef.current) {
      gUserRef.current.setPosition(userCoords);
    } else {
      gUserRef.current = new maps.Marker({
        position: userCoords,
        map,
        title: userLabel,
        icon: { url: svgPin('#2563eb', '#ffffff'), scaledSize: { width: 40, height: 40 } },
      });
    }

    if (gHostRef.current) {
      gHostRef.current.setPosition(hostCoords);
    } else {
      gHostRef.current = new maps.Marker({
        position: hostCoords,
        map,
        title: hostLabel,
        icon: { url: svgPin('#a82323', '#d4af37'), scaledSize: { width: 44, height: 44 } },
      });
    }

    const path = [userCoords, hostCoords];
    if (gLineRef.current) {
      gLineRef.current.setPath(path);
    } else {
      gLineRef.current = new maps.Polyline({
        path,
        map,
        strokeColor: '#A82323',
        strokeOpacity: 0,
        // strokeOpacity 0 + icons = a dashed line, Google Maps' idiom for this.
        icons: [
          {
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeWeight: 3.5, scale: 3 },
            offset: '0',
            repeat: '14px',
          },
        ],
      });
    }
  }, [backend, userCoords, hostCoords, userLabel, hostLabel]);

  /* --- Leaflet rendering --- */
  useEffect(() => {
    if (backend !== 'leaflet' || !containerRef.current) return;

    if (!lMapRef.current) {
      const map = L.map(containerRef.current, {
        center: [userCoords.lat, userCoords.lng],
        zoom: 15,
        zoomControl: false,
      });
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);
      lMapRef.current = map;
    }

    const map = lMapRef.current;

    const userIcon = L.divIcon({
      className: 'visgo-user-marker',
      html: USER_MARKER_HTML,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const hostIcon = L.divIcon({
      className: 'visgo-host-marker',
      html: HOST_MARKER_HTML,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    if (lUserRef.current) {
      lUserRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      lUserRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>${userLabel}</b>`);
    }

    if (lHostRef.current) {
      lHostRef.current.setLatLng([hostCoords.lat, hostCoords.lng]);
    } else {
      lHostRef.current = L.marker([hostCoords.lat, hostCoords.lng], { icon: hostIcon })
        .addTo(map)
        .bindPopup(`<b>${hostLabel}</b>`);
    }

    const line: L.LatLngExpression[] = [
      [userCoords.lat, userCoords.lng],
      [hostCoords.lat, hostCoords.lng],
    ];

    if (lLineRef.current) {
      lLineRef.current.setLatLngs(line);
    } else {
      lLineRef.current = L.polyline(line, {
        color: '#A82323',
        weight: 3.5,
        dashArray: '6, 8',
        opacity: 0.85,
      }).addTo(map);
    }

    // The modal animates in, so the container has no size on the first paint.
    const timer = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(timer);
  }, [backend, userCoords, hostCoords, userLabel, hostLabel]);

  /* --- Tear the map down when the component unmounts --- */
  useEffect(() => {
    return () => {
      if (lMapRef.current) {
        lMapRef.current.remove();
        lMapRef.current = null;
        lUserRef.current = null;
        lHostRef.current = null;
        lLineRef.current = null;
      }
      // Google Maps has no destroy(); dropping the refs lets GC reclaim it once
      // the container node is removed from the DOM.
      gMapRef.current = null;
      gUserRef.current = null;
      gHostRef.current = null;
      gLineRef.current = null;
    };
  }, []);

  /* --- Imperative controls used by the radar toolbar --- */
  useImperativeHandle(
    ref,
    () => ({
      centerOn: (pos: LatLng, zoom = 16) => {
        if (gMapRef.current) {
          gMapRef.current.panTo(pos);
          gMapRef.current.setZoom(zoom);
        } else if (lMapRef.current) {
          lMapRef.current.setView([pos.lat, pos.lng], zoom, { animate: true });
        }
      },
      fitBoth: () => {
        const { userCoords: u, hostCoords: h } = coordsRef.current;
        const maps = gMapsApiRef.current;

        if (gMapRef.current && maps) {
          const bounds = new maps.LatLngBounds();
          bounds.extend(u);
          bounds.extend(h);
          gMapRef.current.fitBounds(bounds, 60);
        } else if (lMapRef.current) {
          lMapRef.current.fitBounds(
            L.latLngBounds([u.lat, u.lng], [h.lat, h.lng]),
            { padding: [60, 60], maxZoom: 16 }
          );
        }
      },
    }),
    []
  );

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full min-h-[340px] sm:min-h-[400px] z-10" />

      {backend === 'pending' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100 text-stone-500 text-xs font-semibold gap-2">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Đang tải bản đồ...</span>
        </div>
      )}
    </div>
  );
});
