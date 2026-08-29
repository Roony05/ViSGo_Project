/**
 * PIN prompt for turning location sharing off.
 *
 * The whole point of the PIN is that stopping is not a one-tap action for
 * whoever is holding the phone, so this dialog does the one thing that matters:
 * it refuses to close successfully without a correct PIN, and it says nothing
 * about how close a wrong attempt was.
 *
 * Attempts are throttled after three failures. Four digits is a small keyspace;
 * without a delay a bystander can walk it in under a minute.
 */

import React from 'react';
import { Language } from '../types';
import { revokeSharing } from '../utils/locationSharing';
import { sounds } from '../utils/audio';

interface StopSharingDialogProps {
  bookingId: string;
  hostName: string;
  language: Language;
  onStopped: () => void;
  onCancel: () => void;
}

const LOCKOUT_MS = 20_000;

export const StopSharingDialog: React.FC<StopSharingDialogProps> = ({
  bookingId,
  hostName,
  language,
  onStopped,
  onCancel,
}) => {
  const isVi = language === 'vi';

  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [failures, setFailures] = React.useState(0);
  const [lockedUntil, setLockedUntil] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());

  // Drives the lockout countdown.
  React.useEffect(() => {
    if (lockedUntil <= now) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedUntil, now]);

  const lockedFor = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedFor > 0 || busy) return;

    setBusy(true);
    const res = await revokeSharing(bookingId, pin);
    setBusy(false);

    if (res.status === 'ok') {
      sounds.playTap();
      onStopped();
      return;
    }

    const next = failures + 1;
    setFailures(next);
    setPin('');
    setError(isVi ? 'Mã PIN không đúng.' : 'That PIN is not correct.');
    if (next >= 3) {
      setLockedUntil(Date.now() + LOCKOUT_MS);
      setFailures(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-stone-900 text-[#D4AF37]">
            <i className="fa-solid fa-key"></i>
          </span>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              {isVi ? 'Nhập mã PIN để tắt chia sẻ' : 'Enter your PIN to stop sharing'}
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
              {isVi
                ? `${hostName} sẽ không còn thấy vị trí của bạn ngay sau khi tắt.`
                : `${hostName} stops seeing your location the moment this is off.`}
            </p>
          </div>
        </div>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          autoComplete="current-password"
          maxLength={8}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            setError('');
          }}
          disabled={lockedFor > 0 || busy}
          placeholder={isVi ? 'Mã PIN' : 'PIN'}
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-lg tracking-[0.5em] outline-hidden focus:border-[#A82323] focus:bg-white focus:ring-1 focus:ring-[#A82323] disabled:opacity-60"
        />

        {error && lockedFor === 0 && (
          <p className="mt-2 text-center text-xs font-medium text-red-600">{error}</p>
        )}
        {lockedFor > 0 && (
          <p className="mt-2 text-center text-xs font-medium text-amber-700">
            {isVi
              ? `Sai quá nhiều lần. Thử lại sau ${lockedFor}s.`
              : `Too many attempts. Try again in ${lockedFor}s.`}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-50"
          >
            {isVi ? 'Giữ nguyên' : 'Keep sharing'}
          </button>
          <button
            type="submit"
            disabled={pin.length < 4 || lockedFor > 0 || busy}
            className="flex-1 cursor-pointer rounded-xl bg-[#A82323] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#8C1818] disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isVi ? 'Tắt chia sẻ vị trí' : 'Stop sharing'}
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-stone-400">
          {isVi
            ? 'Quên PIN? Chia sẻ vẫn tự tắt khi tour kết thúc.'
            : 'Forgot the PIN? Sharing still stops by itself when the tour ends.'}
        </p>
      </form>
    </div>
  );
};
