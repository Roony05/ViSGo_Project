import React, { useState } from 'react';
import { HostKycApplication, Language, User } from '../types';
import { sounds } from '../utils/audio';
import { newId } from '../utils/ids';
import { cccdError, formatCccd, normaliseCccd } from '../utils/cccd';

/**
 * The host's identity declaration.
 *
 * Five fields, typed by hand, checked for shape and handed to an administrator.
 * There is no document upload and no automated scoring, and both absences are
 * deliberate:
 *
 *   - A photograph of a citizen ID card is sensitive personal data under Nghị
 *     định 356/2025/NĐ-CP from 1 January 2026. Firestore is hosted outside
 *     Vietnam, so keeping one here would drag in the cross-border transfer
 *     obligations of Luật 91/2025/QH15 — for a picture that a human reviewer
 *     can be shown out of band instead.
 *
 *   - The panel this replaces displayed "AI Match: 98.4%" and "Record: CLEAN"
 *     next to every application. Nothing computed either number; they were
 *     constants in the fixtures. A confidence score with no measurement behind
 *     it is worse than no score, because a reviewer will trust it.
 *
 * So what an administrator sees is exactly what the host typed, and the badge
 * that follows means a person read it.
 */
interface HostVerificationFormProps {
  activeUser: User | null;
  language: Language;
  /** This host's own application, if they have already sent one. */
  application: HostKycApplication | null;
  onSubmit: (application: HostKycApplication) => void;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const HostVerificationForm: React.FC<HostVerificationFormProps> = ({
  activeUser,
  language,
  application,
  onSubmit,
}) => {
  const isVi = language === 'vi';

  const [fullName, setFullName] = useState(application?.fullName ?? activeUser?.name ?? '');
  const [cccdNumber, setCccdNumber] = useState(application?.cccdNumber ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(application?.dateOfBirth ?? '');
  const [nationality, setNationality] = useState(application?.nationality ?? 'Việt Nam');
  const [address, setAddress] = useState(application?.address ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // A rejected application is editable again; a pending one is not.
  const [editing, setEditing] = useState(false);

  if (!activeUser) return null;

  const showForm = editing || !application || application.status === 'rejected';

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};

    if (!fullName.trim()) {
      next.fullName = isVi ? 'Chưa nhập họ và tên.' : 'Enter your full name.';
    }

    const idProblem = cccdError(cccdNumber, isVi);
    if (idProblem) next.cccdNumber = idProblem;

    if (!dateOfBirth) {
      next.dateOfBirth = isVi ? 'Chưa chọn ngày sinh.' : 'Choose your date of birth.';
    } else if (dateOfBirth > todayIso()) {
      next.dateOfBirth = isVi ? 'Ngày sinh không thể ở tương lai.' : 'A date of birth cannot be in the future.';
    }

    if (!nationality.trim()) {
      next.nationality = isVi ? 'Chưa nhập quốc tịch.' : 'Enter your nationality.';
    }

    if (!address.trim()) {
      next.address = isVi ? 'Chưa nhập địa chỉ thường trú.' : 'Enter your permanent address.';
    }

    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      sounds.playTap();
      return;
    }

    onSubmit({
      // Re-submitting after a rejection keeps the same document, so the queue
      // shows one application per host rather than a growing pile.
      id: application?.id ?? newId('kyc'),
      hostId: activeUser.id,
      fullName: fullName.trim(),
      cccdNumber: normaliseCccd(cccdNumber),
      dateOfBirth,
      nationality: nationality.trim(),
      address: address.trim(),
      submittedDate: todayIso(),
      status: 'pending',
    });

    setEditing(false);
    sounds.playSuccessChime();
  };

  const field =
    'w-full px-3.5 py-2.5 rounded-xl border bg-white focus:ring-1 text-sm text-stone-900 outline-hidden transition-all';
  const fieldClass = (name: string): string =>
    `${field} ${
      errors[name]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
        : 'border-stone-300 focus:border-[#991B1B] focus:ring-[#991B1B]'
    }`;
  const label = 'block text-xs font-bold text-stone-700 mb-1.5';

  const Problem: React.FC<{ name: string }> = ({ name }) =>
    errors[name] ? <p className="text-[11px] text-red-700 mt-1">{errors[name]}</p> : null;

  /* ---- Already sent, waiting or accepted ------------------------- */

  if (!showForm && application) {
    const approved = application.status === 'approved';

    return (
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className={`px-6 py-5 text-white ${approved ? 'bg-emerald-700' : 'bg-stone-700'}`}>
          <div className="flex items-center gap-2.5">
            <i className={`fa-solid ${approved ? 'fa-circle-check' : 'fa-hourglass-half'} text-lg`}></i>
            <div>
              <h3 className="font-bold text-sm">
                {approved
                  ? isVi ? 'Hồ sơ đã được duyệt' : 'Your details have been approved'
                  : isVi ? 'Hồ sơ đang chờ duyệt' : 'Your details are waiting for review'}
              </h3>
              <p className="text-[11px] opacity-80">
                {isVi ? 'Gửi ngày' : 'Sent on'} {application.submittedDate}
              </p>
            </div>
          </div>
        </div>

        <dl className="p-6 space-y-3 text-sm">
          <Row label={isVi ? 'Họ và tên' : 'Full name'} value={application.fullName} />
          <Row label={isVi ? 'Số căn cước' : 'Citizen ID'} value={formatCccd(application.cccdNumber)} mono />
          <Row label={isVi ? 'Ngày sinh' : 'Date of birth'} value={application.dateOfBirth} />
          <Row label={isVi ? 'Quốc tịch' : 'Nationality'} value={application.nationality} />
          <Row label={isVi ? 'Địa chỉ thường trú' : 'Permanent address'} value={application.address} />
        </dl>

        {!approved && (
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                setEditing(true);
              }}
              className="text-xs font-bold text-[#991B1B] hover:underline cursor-pointer"
            >
              {isVi ? 'Sửa lại thông tin' : 'Change these details'}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ---- The form -------------------------------------------------- */

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#A82323] to-[#7E1818] px-6 py-5 text-white border-b-4 border-[#D4AF37]">
        <h3 className="font-serif font-bold text-base">
          {isVi ? 'Xác minh danh tính' : 'Identity details'}
        </h3>
        <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">
          {isVi
            ? 'Điền đúng như trên thẻ căn cước. Quản trị viên sẽ đọc và duyệt.'
            : 'Type these exactly as they appear on your citizen ID card. An administrator reads and approves them.'}
        </p>
      </div>

      {application?.status === 'rejected' && (
        <div className="mx-6 mt-5 p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-xs font-bold text-rose-900">
            {isVi ? 'Hồ sơ trước đã bị từ chối' : 'Your previous submission was rejected'}
          </p>
          {application.rejectionReason && (
            <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">{application.rejectionReason}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
        <div>
          <label className={label} htmlFor="kyc-name">
            {isVi ? 'Họ và tên' : 'Full name'} <span className="text-red-600">*</span>
          </label>
          <input
            id="kyc-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className={fieldClass('fullName')}
          />
          <Problem name="fullName" />
        </div>

        <div>
          <label className={label} htmlFor="kyc-cccd">
            {isVi ? 'Số căn cước công dân' : 'Citizen ID number'} <span className="text-red-600">*</span>
          </label>
          <input
            id="kyc-cccd"
            type="text"
            inputMode="numeric"
            value={cccdNumber}
            // Spaces and dashes get typed off the card; strip them as they land
            // rather than rejecting the person for punctuation.
            onChange={(e) => setCccdNumber(normaliseCccd(e.target.value).slice(0, 12))}
            placeholder="012345678901"
            className={`${fieldClass('cccdNumber')} font-mono tracking-widest`}
          />
          {errors.cccdNumber ? (
            <Problem name="cccdNumber" />
          ) : (
            <p className="text-[11px] text-stone-400 mt-1">
              {normaliseCccd(cccdNumber).length}/12 {isVi ? 'chữ số' : 'digits'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="kyc-dob">
              {isVi ? 'Ngày sinh' : 'Date of birth'} <span className="text-red-600">*</span>
            </label>
            <input
              id="kyc-dob"
              type="date"
              value={dateOfBirth}
              max={todayIso()}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={fieldClass('dateOfBirth')}
            />
            <Problem name="dateOfBirth" />
          </div>

          <div>
            <label className={label} htmlFor="kyc-nationality">
              {isVi ? 'Quốc tịch' : 'Nationality'} <span className="text-red-600">*</span>
            </label>
            <input
              id="kyc-nationality"
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className={fieldClass('nationality')}
            />
            <Problem name="nationality" />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="kyc-address">
            {isVi ? 'Địa chỉ thường trú' : 'Permanent address'} <span className="text-red-600">*</span>
          </label>
          <textarea
            id="kyc-address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
            className={`${fieldClass('address')} resize-none`}
          />
          <Problem name="address" />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          {application && (
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                setEditing(false);
                setErrors({});
              }}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isVi ? 'Gửi hồ sơ' : 'Send for review'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
    <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider sm:w-40 shrink-0">{label}</dt>
    <dd className={`text-stone-900 ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</dd>
  </div>
);
