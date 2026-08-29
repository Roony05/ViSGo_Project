import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Booking, Language, User } from '../types';
import { CALL_DOMAIN, CALL_LIMITS, CALL_ROOM_SALT } from '../config/env';
import {
  type CallAllowance,
  checkAllowance,
  noteCallEnded,
  noteCallStarted,
  roomNameFor,
} from '../utils/callBudget';

/**
 * A free voice/video call between the two people on a booking.
 *
 * HOW IT IS FREE, AND STAYS FREE. The call runs on a public Jitsi Meet
 * instance: no account, no API key, no card on file, so there is no billing
 * relationship that could produce a charge. On top of that — because a
 * deployment may later point `VITE_CALL_DOMAIN` at a metered provider — three
 * ceilings are enforced before and during every call, in `callBudget.ts`: a
 * monthly minute allowance, a calls-per-day count, and a hard per-call timer
 * that hangs up on its own. Reaching a ceiling disables the button; it never
 * degrades into paid usage.
 *
 * WHAT IS NOT KEPT. Nothing about the call. No recording, no transcript, no
 * participant record, no room name, no start or end time, not even a row
 * saying a call happened. The only thing written anywhere is three integers in
 * this browser's own localStorage, and they exist solely to enforce the
 * ceilings above.
 *
 * The room name is a salted hash of the booking id rather than the id itself,
 * because on a public instance the name is the only lock on the door.
 */

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

interface JitsiApi {
  addListener(event: string, handler: (...args: unknown[]) => void): void;
  executeCommand(command: string, ...args: unknown[]): void;
  dispose(): void;
}

/** Loads the embed script once per session, and remembers the attempt. */
let scriptPromise: Promise<boolean> | null = null;

function loadJitsiScript(domain: string): Promise<boolean> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    if (window.JitsiMeetExternalAPI) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve(Boolean(window.JitsiMeetExternalAPI));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface CallModalProps {
  booking: Booking;
  activeUser: User;
  language: Language;
  onClose: () => void;
}

type Phase = 'checking' | 'connecting' | 'live' | 'blocked' | 'failed' | 'ended';

export const CallModal: React.FC<CallModalProps> = ({ booking, activeUser, language, onClose }) => {
  const isVi = language === 'vi';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const startedAtRef = useRef<number>(0);
  /** Guards against counting the same call twice: the API fires more than one leave event. */
  const settledRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('checking');
  const [allowance, setAllowance] = useState<CallAllowance | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  /**
   * Ends the call and books the minutes it used.
   *
   * Called from the hang-up button, from the per-call timer, from Jitsi's own
   * leave events and from unmount — whichever happens first — so the accounting
   * cannot be skipped by closing the tab from inside the conference.
   */
  const finish = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;

    if (startedAtRef.current > 0) {
      noteCallEnded((Date.now() - startedAtRef.current) / 1000);
      startedAtRef.current = 0;
    }
    try {
      apiRef.current?.dispose();
    } catch {
      // Disposing an already-disposed conference is not worth a console line.
    }
    apiRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const verdict = checkAllowance();
    setAllowance(verdict);
    if (!verdict.allowed) {
      setPhase('blocked');
      return;
    }

    setPhase('connecting');
    setSecondsLeft(Math.round(verdict.minutesThisCall * 60));

    void (async () => {
      const [ok, room] = await Promise.all([
        loadJitsiScript(CALL_DOMAIN),
        roomNameFor(booking.id, CALL_ROOM_SALT),
      ]);
      if (cancelled) return;

      if (!ok || !window.JitsiMeetExternalAPI || !containerRef.current) {
        setPhase('failed');
        return;
      }

      // Counted at the moment the room is created rather than when the other
      // person answers: an unanswered call still occupies a room.
      noteCallStarted();
      startedAtRef.current = Date.now();

      const api = new window.JitsiMeetExternalAPI(CALL_DOMAIN, {
        roomName: room,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: activeUser.name },
        configOverwrite: {
          // Straight into the room: a lobby screen on a two-person call is a
          // step that only ever loses the other party.
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          // Audio first. Video is one tap away inside the call, and starting
          // without it is both kinder to a phone plan and the usual shape of
          // "the host is calling about where to meet".
          startWithVideoMuted: true,
          startWithAudioMuted: false,
          disableThirdPartyRequests: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_CHROME_EXTENSION_BANNER: false,
        },
      });

      apiRef.current = api;
      setPhase('live');

      const leave = () => {
        finish();
        setPhase('ended');
      };
      api.addListener('videoConferenceLeft', leave);
      api.addListener('readyToClose', leave);
    })();

    return () => {
      cancelled = true;
      finish();
    };
  }, [booking.id, activeUser.name, finish]);

  /** The per-call ceiling, counted down in the open. */
  useEffect(() => {
    if (phase !== 'live') return;
    const timer = window.setInterval(() => {
      setSecondsLeft((left) => {
        if (left <= 1) {
          finish();
          setPhase('ended');
          return 0;
        }
        return left - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, finish]);

  const clock = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const otherName = activeUser.id === booking.hostId ? booking.customerName : booking.hostName;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-stone-950 w-full max-w-3xl h-[min(80vh,640px)] rounded-3xl border border-stone-700 shadow-2xl overflow-hidden flex flex-col">

        <div className="px-4 py-3 flex items-center justify-between gap-3 bg-stone-900 border-b border-stone-800 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {isVi ? `Gọi với ${otherName}` : `Call with ${otherName}`}
            </p>
            <p className="text-[11px] text-stone-400 truncate">
              {isVi ? `Chuyến ${booking.id} • ${booking.city}` : `Trip ${booking.id} • ${booking.city}`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {phase === 'live' && (
              <span
                className="px-2.5 py-1 rounded-lg bg-stone-800 text-amber-300 text-[11px] font-bold tabular-nums"
                title={isVi ? 'Cuộc gọi tự kết thúc khi hết giờ' : 'The call hangs up on its own at zero'}
              >
                <i className="fa-regular fa-clock mr-1"></i>
                {clock}
              </span>
            )}
            <button
              onClick={() => {
                finish();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#A82323] hover:bg-[#8C1818] text-white text-[11px] font-bold cursor-pointer"
            >
              <i className="fa-solid fa-phone-slash mr-1.5"></i>
              {isVi ? 'Kết thúc' : 'Hang up'}
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-black">
          {/* Jitsi mounts its iframe here. It stays in the tree across phases so
              the conference is never torn down by a re-render. */}
          <div ref={containerRef} className="absolute inset-0"></div>

          {phase !== 'live' && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-stone-950">
              {phase === 'checking' || phase === 'connecting' ? (
                <div className="text-stone-300 space-y-2">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl text-amber-400"></i>
                  <p className="text-xs">{isVi ? 'Đang mở phòng gọi…' : 'Opening the call…'}</p>
                </div>
              ) : phase === 'blocked' ? (
                <div className="space-y-2 max-w-sm">
                  <i className="fa-solid fa-hand text-2xl text-amber-400"></i>
                  <p className="text-sm font-bold text-white">
                    {isVi ? 'Đã dùng hết mức gọi miễn phí' : 'The free call allowance is used up'}
                  </p>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {allowance?.reason === 'DAILY_CAP'
                      ? isVi
                        ? `Hôm nay đã gọi đủ ${CALL_LIMITS.callsPerDay} cuộc. Mai gọi tiếp được nhé — giới hạn này đặt ra để tính năng gọi không bao giờ phát sinh phí.`
                        : `That is all ${CALL_LIMITS.callsPerDay} calls for today. The cap exists so calling can never turn into a bill; it resets tomorrow.`
                      : isVi
                        ? `Tháng này đã dùng hết ${CALL_LIMITS.minutesPerMonth.toLocaleString('vi-VN')} phút miễn phí. Mức này đặt ra để không bao giờ bị tính phí; sang tháng sẽ được cấp lại.`
                        : `This month's ${CALL_LIMITS.minutesPerMonth.toLocaleString('en-US')} free minutes are gone. The ceiling is there so calling can never be charged; it resets next month.`}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {isVi ? 'Bạn vẫn nhắn tin bình thường được.' : 'Messaging still works as usual.'}
                  </p>
                </div>
              ) : phase === 'failed' ? (
                <div className="space-y-2 max-w-sm">
                  <i className="fa-solid fa-triangle-exclamation text-2xl text-amber-400"></i>
                  <p className="text-sm font-bold text-white">
                    {isVi ? 'Không mở được cuộc gọi' : 'The call could not open'}
                  </p>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {isVi
                      ? `Không tải được ${CALL_DOMAIN}. Kiểm tra mạng, hoặc thử lại sau — tin nhắn vẫn dùng bình thường.`
                      : `${CALL_DOMAIN} did not load. Check the connection or try again later — messaging is unaffected.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-w-sm">
                  <i className="fa-solid fa-phone-slash text-2xl text-stone-500"></i>
                  <p className="text-sm font-bold text-white">
                    {isVi ? 'Cuộc gọi đã kết thúc' : 'Call ended'}
                  </p>
                  <p className="text-xs text-stone-400">
                    {isVi ? 'Không có nội dung nào được lưu lại.' : 'Nothing about it was recorded.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-stone-900 border-t border-stone-800 shrink-0 flex items-center justify-between gap-3">
          <p className="text-[10px] text-stone-500 leading-relaxed">
            {isVi
              ? 'Cuộc gọi miễn phí, không ghi âm và không lưu lại bất kỳ dữ liệu nào.'
              : 'Free, never recorded, and nothing about the call is stored.'}
          </p>
          {phase === 'ended' && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white text-[11px] font-bold cursor-pointer shrink-0"
            >
              {isVi ? 'Đóng' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
