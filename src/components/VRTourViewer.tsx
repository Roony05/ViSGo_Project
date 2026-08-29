/**
 * Immersive 360° viewer for the heritage tours.
 *
 * Three input modes, picked up automatically:
 *   - desktop  : drag to look, scroll to zoom
 *   - phone    : drag, plus an optional gyroscope mode ("look around by moving
 *                the phone"), which on iOS needs an explicit permission gesture
 *   - headset  : a real WebXR immersive-vr session when the device offers one
 *
 * three.js is imported here (not at app start) so the ~150 kB it costs only
 * loads when someone actually opens a VR tour.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Compass, Maximize2, Loader2, Rotate3d, Headset, AlertTriangle, Camera, Play, Pause } from 'lucide-react';
import type { VrLandmark } from '../data/vrLandmarks';
import { lookupPanorama, type PinnedPanorama, type RealPanorama } from '../utils/panoramaSource';
import type { Language } from '../types';

interface VRTourViewerProps {
  landmark: VrLandmark;
  /**
   * The photograph pinned to this landmark, already resolved by the gallery.
   * Null means either that the resolve failed, or that it has not finished —
   * `resolving` is what tells the two apart.
   */
  panorama: PinnedPanorama | null;
  /**
   * True while the gallery is still resolving its pinned photographs.
   *
   * Without this the viewer could not distinguish "there is no pinned photo"
   * from "the pinned photo is one second away", and it treated both as the
   * first: opening a landmark before the gallery's single Graph request came
   * back fell straight through to the coordinate search, which only looks
   * inside a 130 m box and so reported "Không tải được ảnh 360°" for a place
   * whose photograph was about to arrive. On a phone connection that race was
   * easy to lose — tap the card quickly and VR simply looked broken.
   */
  resolving: boolean;
  language: Language;
  onClose: () => void;
}

const SPHERE_RADIUS = 500;
const MIN_FOV = 35;
const MAX_FOV = 95;

/**
 * Idle drift, in degrees of heading per second.
 *
 * Positive turns the view to the right, so the scene slides leftward past you —
 * the same direction as walking around slowly on the spot. A full turn takes
 * about two and a half minutes, which is slow enough that it reads as the world
 * being alive rather than as the page moving on its own. Negate it to sweep the
 * other way.
 */
const SPIN_DEG_PER_SEC = 2.4;

/**
 * How long the drift stays out of the way after someone takes hold of the view.
 *
 * Resuming the instant a drag ends would pull the picture off whatever they
 * just chose to look at, which feels like the app arguing with them.
 */
const SPIN_RESUME_MS = 2500;

export const VRTourViewer: React.FC<VRTourViewerProps> = ({
  landmark,
  panorama,
  resolving,
  language,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState('');
  const [gyroOn, setGyroOn] = useState(false);
  /** Slow idle rotation. On by default: a still 360° photo looks like a flat one. */
  const [spinOn, setSpinOn] = useState(true);
  const [xrSupported, setXrSupported] = useState(false);
  const [xrActive, setXrActive] = useState(false);
  /**
   * Which photograph the sphere is showing — surfaced to the viewer, because
   * CC BY-SA obliges us to credit the photographer and because "the pinned
   * picture of this place" and "the nearest picture we could find" are not the
   * same claim.
   */
  const [source, setSource] = useState<
    | { kind: 'pending' }
    | { kind: 'pinned'; info: PinnedPanorama }
    | { kind: 'nearby'; info: RealPanorama }
  >({ kind: 'pending' });

  // Imperative handles the render loop reads every frame. Kept in refs so that
  // toggling a control never tears down and rebuilds the WebGL context.
  const gyroRef = useRef(false);
  const spinRef = useRef(true);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const vi = language === 'vi';

  useEffect(() => {
    gyroRef.current = gyroOn;
  }, [gyroOn]);

  useEffect(() => {
    spinRef.current = spinOn;
  }, [spinOn]);

  /* ---------------------------------------------------------------- */
  /* Scene setup                                                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frameId = 0;

    // This effect re-runs when the pinned photograph resolves, so a failed
    // first attempt must not leave its error message on screen.
    setStatus('loading');
    setErrorText('');

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setStatus('error');
      setErrorText(
        vi
          ? 'Trình duyệt hoặc máy này không hỗ trợ WebGL nên không xem được VR.'
          : 'This browser or device does not support WebGL, so VR cannot run.',
      );
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.xr.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 1100);
    cameraRef.current = camera;

    // BackSide renders the inside of the sphere; the usual `scale.x = -1` trick
    // also works but flips face winding and breaks raycasting later.
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 40);
    const material = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    const disposables: Array<{ dispose: () => void }> = [geometry, material];

    /* --- Texture ----------------------------------------------------- */
    const applyTexture = (texture: THREE.Texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
      disposables.push(texture);
      setStatus('ready');
    };

    const failed = () => {
      if (disposed) return;
      setStatus('error');
      setErrorText(
        vi
          ? 'Không tải được ảnh 360° của địa điểm này. Thử lại sau ít phút nhé.'
          : 'The 360° photograph of this place could not be loaded. Please try again shortly.',
      );
    };

    const loadPhoto = (url: string, onFail: () => void) => {
      const loader = new THREE.TextureLoader();
      // Mapillary's CDN answers with `access-control-allow-origin: *`, which is
      // what lets WebGL sample the texture at all — without it the sphere would
      // stay black no matter that the image downloaded fine.
      loader.setCrossOrigin('anonymous');
      loader.load(
        url,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          applyTexture(texture);
        },
        undefined,
        onFail,
      );
    };

    /**
     * Only real photography ever reaches the sphere.
     *
     * First choice is the picture pinned to this landmark, checked by hand to
     * actually show the place. If that link cannot be resolved or loaded we
     * fall back to the nearest 360° image to its coordinates — labelled with
     * its distance, because "somewhere near here" is a weaker claim and the
     * viewer is entitled to know which one they are looking at.
     */
    const searchNearby = () => {
      lookupPanorama(landmark.lat, landmark.lng)
        .then((result) => {
          if (disposed) return;
          if (result.status !== 'found') {
            failed();
            return;
          }
          setSource({ kind: 'nearby', info: result.panorama });
          loadPhoto(result.panorama.url, failed);
        })
        .catch(failed);
    };

    if (panorama) {
      setSource({ kind: 'pinned', info: panorama });
      loadPhoto(panorama.url, searchNearby);
    } else if (!resolving) {
      searchNearby();
    }
    // While `resolving` is true the sphere stays on the loading state. The
    // effect re-runs the moment the pinned photograph lands, because
    // `panorama` is a dependency.

    /* --- Pointer look ------------------------------------------------ */
    // Spherical angles in degrees; lat is clamped so the view cannot roll over
    // the poles, which is disorienting and shows the texture pinch.
    let lon = 0;
    let lat = 0;
    let dragging = false;
    /** Timestamp before which the idle drift stays paused, after an interaction. */
    let spinHeldUntil = 0;
    let startX = 0;
    let startY = 0;
    let startLon = 0;
    let startLat = 0;

    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLon = lon;
      startLat = lat;
      el.style.cursor = 'grabbing';
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      // Scale by fov so the drag feels the same when zoomed in.
      const speed = camera.fov / 72;
      lon = startLon - (e.clientX - startX) * 0.12 * speed;
      lat = startLat + (e.clientY - startY) * 0.12 * speed;
      lat = Math.max(-85, Math.min(85, lat));
    };
    const endDrag = (e: PointerEvent) => {
      dragging = false;
      spinHeldUntil = performance.now() + SPIN_RESUME_MS;
      el.style.cursor = 'grab';
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spinHeldUntil = performance.now() + SPIN_RESUME_MS;
      camera.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, camera.fov + e.deltaY * 0.05));
      camera.updateProjectionMatrix();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('wheel', onWheel, { passive: false });

    /* --- Gyroscope --------------------------------------------------- */
    // three.js dropped DeviceOrientationControls, so this is the standard
    // alpha/beta/gamma -> quaternion conversion it used to provide.
    const zAxis = new THREE.Vector3(0, 0, 1);
    const q0 = new THREE.Quaternion();
    // -90° about X, to move from "device flat on a table" to "looking forward".
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    const euler = new THREE.Euler();
    let orientation: DeviceOrientationEvent | null = null;

    const onDeviceOrientation = (e: DeviceOrientationEvent) => {
      orientation = e;
    };
    window.addEventListener('deviceorientation', onDeviceOrientation);

    const applyGyro = () => {
      if (!orientation || orientation.alpha == null) return false;
      const alpha = THREE.MathUtils.degToRad(orientation.alpha);
      const beta = THREE.MathUtils.degToRad(orientation.beta ?? 0);
      const gamma = THREE.MathUtils.degToRad(orientation.gamma ?? 0);
      const screenAngle = THREE.MathUtils.degToRad(
        typeof window.screen?.orientation?.angle === 'number' ? window.screen.orientation.angle : 0,
      );

      euler.set(beta, alpha, -gamma, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      camera.quaternion.multiply(q1);
      camera.quaternion.multiply(q0.setFromAxisAngle(zAxis, -screenAngle));
      return true;
    };

    /* --- Render loop -------------------------------------------------- */
    const target = new THREE.Vector3();
    let previousFrame = 0;

    const tick = (time: number) => {
      // Seconds since the last frame, so the drift runs at the same speed on a
      // 60 Hz laptop and a 120 Hz phone. Clamped because a backgrounded tab
      // resumes with a gap of seconds, which would otherwise whip the view
      // round before the first frame is even shown.
      const delta = previousFrame ? Math.min(0.1, (time - previousFrame) / 1000) : 0;
      previousFrame = time;

      // In an XR session the headset drives the camera; touching it fights the
      // runtime and causes drift, so only apply our own controls outside XR.
      if (!renderer.xr.isPresenting) {
        const usedGyro = gyroRef.current && applyGyro();
        if (!usedGyro) {
          // The gyro and the headset are the viewer's own head; only the
          // pointer view drifts, and only when nobody is holding it.
          if (spinRef.current && !dragging && time >= spinHeldUntil) {
            lon = (lon + SPIN_DEG_PER_SEC * delta) % 360;
          }
          const phi = THREE.MathUtils.degToRad(90 - lat);
          const theta = THREE.MathUtils.degToRad(lon);
          target.set(
            SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
            SPHERE_RADIUS * Math.cos(phi),
            SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
          );
          camera.lookAt(target);
        }
      }
      renderer.render(scene, camera);
    };

    // setAnimationLoop (not requestAnimationFrame) is mandatory for WebXR: the
    // headset supplies its own frame timing at its own refresh rate.
    renderer.setAnimationLoop(tick);

    /* --- Resize ------------------------------------------------------- */
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    /* --- Teardown ----------------------------------------------------- */
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      renderer.setAnimationLoop(null);

      window.removeEventListener('resize', onResize);
      window.removeEventListener('deviceorientation', onDeviceOrientation);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('wheel', onWheel);

      disposables.forEach((d) => d.dispose());
      // Frees the GPU context outright. Without this, opening several tours in
      // one session exhausts the browser's WebGL context limit and later ones
      // silently render black.
      renderer.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, [landmark, panorama, resolving, vi]);

  /* ---------------------------------------------------------------- */
  /* WebXR availability                                                */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
    if (!xr?.isSessionSupported) return;
    xr.isSessionSupported('immersive-vr')
      .then((ok) => {
        if (!cancelled) setXrSupported(ok);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const enterVR = useCallback(async () => {
    const renderer = rendererRef.current;
    const xr = (navigator as Navigator & {
      xr?: { requestSession(mode: string, opts?: unknown): Promise<XRSession> };
    }).xr;
    if (!renderer || !xr) return;

    try {
      const session = await xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });
      await renderer.xr.setSession(session as never);
      setXrActive(true);
      session.addEventListener('end', () => setXrActive(false));
    } catch {
      setErrorText(vi ? 'Không mở được chế độ kính VR.' : 'Could not start the VR headset session.');
    }
  }, [vi]);

  /* ---------------------------------------------------------------- */
  /* Gyroscope permission (iOS 13+ requires a user gesture)            */
  /* ---------------------------------------------------------------- */
  const toggleGyro = useCallback(async () => {
    if (gyroOn) {
      setGyroOn(false);
      return;
    }

    const DOE = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    }) | undefined;

    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
          setErrorText(
            vi
              ? 'Bạn đã từ chối quyền truy cập cảm biến chuyển động.'
              : 'Motion sensor permission was denied.',
          );
          return;
        }
      } catch {
        setErrorText(vi ? 'Thiết bị không cho phép dùng cảm biến.' : 'This device refused sensor access.');
        return;
      }
    }
    setErrorText('');
    setGyroOn(true);
  }, [gyroOn, vi]);

  const goFullscreen = useCallback(() => {
    const node = mountRef.current?.parentElement;
    if (!node) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void node.requestFullscreen?.().catch(() => undefined);
  }, []);

  /* Close on Escape, matching every other modal in the app. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] bg-black">
      <div ref={mountRef} className="absolute inset-0" />

      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-[#0d0b09] text-[#FAF8F5]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
            <p className="text-sm tracking-wide">
              {vi ? 'Đang dựng không gian 360°…' : 'Building the 360° scene…'}
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center bg-[#0d0b09] px-6 text-center text-[#FAF8F5]">
          <div className="max-w-sm space-y-3">
            <AlertTriangle className="mx-auto h-9 w-9 text-[#D4AF37]" />
            <p className="text-sm leading-relaxed">{errorText}</p>
            <button onClick={onClose} className="rounded-full bg-[#A82323] px-5 py-2 text-sm font-semibold">
              {vi ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Title card */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/75 to-transparent p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-white sm:text-2xl">
                {vi ? landmark.nameVi : landmark.name}
              </h2>
              {landmark.unesco && (
                <span className="rounded-full border border-[#D4AF37]/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                  UNESCO
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-white/70 sm:text-sm">
              {vi ? landmark.cityVi : landmark.city} · {vi ? landmark.bestTimeVi : landmark.bestTime}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute right-4 top-4 flex gap-2 sm:right-5 sm:top-5">
        <button
          onClick={onClose}
          aria-label={vi ? 'Đóng' : 'Close'}
          className="rounded-full bg-black/55 p-2.5 text-white backdrop-blur transition hover:bg-[#A82323]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {status === 'ready' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
          {errorText && (
            <p className="mb-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">{errorText}</p>
          )}

          {/*
            Credit the photographer — CC BY-SA requires it — and say which
            picture this is. The pinned one was checked to show the place; the
            nearby one is only the closest 360° image to these coordinates, so
            it carries its distance and never borrows the stronger claim.
          */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {source.kind === 'pinned' || source.kind === 'nearby' ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                  <Camera className="h-3 w-3" />
                  {vi ? 'Ảnh 360° thật' : 'Real 360° photo'}
                  {source.info.capturedAt ? ` · ${source.info.capturedAt}` : ''}
                </span>
                <span className="text-[10px] text-white/45">
                  {source.info.attribution}
                  {source.kind === 'nearby'
                    ? vi
                      ? ` · ảnh gần nhất, cách ${source.info.distanceMeters}m`
                      : ` · nearest image, ${source.info.distanceMeters}m away`
                    : ''}
                </span>
              </>
            ) : null}
          </div>

          <p className="mb-3 max-w-2xl text-xs leading-relaxed text-white/80 sm:text-sm">
            {vi ? landmark.descriptionVi : landmark.description}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 hidden items-center gap-1.5 text-xs text-white/55 sm:flex">
              <Compass className="h-3.5 w-3.5" />
              {vi ? 'Kéo để nhìn quanh · cuộn để phóng to' : 'Drag to look · scroll to zoom'}
            </span>

            <button
              onClick={() => setSpinOn((on) => !on)}
              aria-pressed={spinOn}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                spinOn ? 'bg-[#D4AF37] text-[#1F2937]' : 'bg-white/12 text-white hover:bg-white/20'
              }`}
            >
              {spinOn ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {vi ? 'Tự xoay' : 'Auto-spin'}
            </button>

            <button
              onClick={toggleGyro}
              aria-pressed={gyroOn}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                gyroOn ? 'bg-[#D4AF37] text-[#1F2937]' : 'bg-white/12 text-white hover:bg-white/20'
              }`}
            >
              <Rotate3d className="h-4 w-4" />
              {vi ? 'Xoay theo điện thoại' : 'Gyroscope'}
            </button>

            {xrSupported && (
              <button
                onClick={enterVR}
                disabled={xrActive}
                className="flex items-center gap-1.5 rounded-full bg-[#A82323] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#8c1c1c] disabled:opacity-60"
              >
                <Headset className="h-4 w-4" />
                {xrActive
                  ? vi ? 'Đang ở trong kính VR' : 'In headset'
                  : vi ? 'Vào kính VR' : 'Enter VR'}
              </button>
            )}

            <button
              onClick={goFullscreen}
              className="flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <Maximize2 className="h-4 w-4" />
              {vi ? 'Toàn màn hình' : 'Fullscreen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
