import React, { useEffect, useRef, useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { resizeImageFile, resizeFailureMessage } from '../utils/imageResize';
import { externaliseAvatar, isInlineImage } from '../utils/avatarStore';
import { ProvinceSelect } from './ProvinceSelect';
import { Avatar } from './Avatar';

/**
 * Account settings — deliberately small.
 *
 * This modal used to carry ten fields for everyone, most of which belonged to
 * somebody else's job:
 *
 *   - AN AVATAR URL BOX. It asked a traveller to paste an `https://…` link to a
 *     picture. Nobody outside a developer has one to hand. Underneath sat five
 *     Unsplash stock portraits offered as "quick presets" — photographs of real
 *     strangers, handed out as identities. Both are gone; the file picker below
 *     is the same one the host profile editor already used, and it re-encodes
 *     the picture so it fits in a Firestore document.
 *
 *   - A SECOND BIO BOX THAT SAVED NOWHERE. The English bio here was written to
 *     `user.bioEn`, a field that does not exist on the User type and that no
 *     component reads. The public English bio is `user.bio`, which only the
 *     host profile editor writes. So a host who filled this in, saved, and then
 *     looked at their own card saw nothing — with no error to explain it.
 *
 *   - THE HOST'S PUBLIC PROFILE, DUPLICATED. Bio, spoken languages and the
 *     operating city are what a traveller reads before booking, and the host
 *     dashboard has a proper editor for them with a live preview of the card.
 *     Two editors for one set of fields means two places to look when something
 *     is wrong. This one now links to that one instead.
 *
 *   - CLAIMS THE USER NEVER MADE. The languages list defaulted to "Tiếng Việt
 *     (Bản địa)" and "English (Fluent)" for every new account. Fluency is a
 *     claim a traveller acts on; it is not ours to fill in.
 *
 * What is left is what an account actually owns: your picture, your name, how
 * to reach you, and where you are. Four fields, and a line telling a host where
 * the rest lives.
 */
interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  language: Language;
  onSaveProfile: (updatedUser: User) => void;
  /** Hosts only: jump to the public-profile editor in the dashboard. */
  onOpenHostProfile?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  language,
  onSaveProfile,
  onOpenHostProfile,
}) => {
  const t = translations[language];
  const isVi = language === 'vi';

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setAvatar(user.avatar);
    setPhone(user.phone || '');
    setCity(user.city || '');
    setUploadError('');
    setSaving(false);
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked after a failure
    if (!file) return;

    setUploadError('');
    // Re-encoded, not merely size-checked: base64 inflates a file by about a
    // third, and Firestore rejects any document over 1 MiB.
    const result = await resizeImageFile(file);
    if (result.status === 'failed') {
      setUploadError(resizeFailureMessage(result.reason, isVi));
      return;
    }
    setAvatar(result.dataUrl);
    sounds.playNotificationPing();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    let picture = avatar.trim() || user.avatar;

    // A picture picked off disk is ~35 KB of base64. It goes to its own
    // document first, and the profile carries only the ~50-byte reference —
    // otherwise every visitor downloads it with every host card, because the
    // profiles collection is read whole. See src/utils/avatarStore.ts.
    if (isInlineImage(picture)) {
      setSaving(true);
      setUploadError('');
      try {
        picture = await externaliseAvatar(user.id, picture);
      } catch (err) {
        console.warn('[ViS-Go] Avatar did not save:', err);
        setSaving(false);
        setUploadError(
          isVi
            ? 'Chưa lưu được ảnh đại diện. Kiểm tra kết nối rồi thử lại.'
            : 'The picture could not be saved. Check your connection and try again.',
        );
        return;
      }
      setSaving(false);
    }

    onSaveProfile({
      ...user,
      name: name.trim() || user.name,
      avatar: picture,
      phone: phone.trim(),
      city: city.trim(),
    });
    sounds.playSuccessChime();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  const roleLabel =
    user.role === 'customer' ? t.customerRole : user.role === 'host' ? t.hostRole : t.adminRole;

  const field =
    'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] text-sm text-stone-900 outline-hidden transition-all';
  const label = 'block text-xs font-bold text-stone-700 mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header. The subtitle it used to carry ("Xem và chỉnh sửa thông tin
            tài khoản của bạn") only restated the title. */}
        <div className="bg-gradient-to-r from-[#991B1B] to-[#7F1D1D] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base">{t.accountProfile}</h3>
          <button
            type="button"
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            aria-label={isVi ? 'Đóng' : 'Close'}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Picture, and the two things about this account nobody can edit
              here. Email and role used to be repeated in a summary card that
              sat above fields showing the very same name and city. */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar
                src={avatar || user.avatar}
                name={name || user.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37] bg-stone-100"
              />
              {user.verified && (
                <span
                  title={isVi ? 'Đã xác minh' : 'Verified'}
                  className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                >
                  <i className="fa-solid fa-check text-[9px]"></i>
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold uppercase rounded-md border border-amber-300">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate mb-1.5">{user.email}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="text-xs font-bold text-[#991B1B] hover:underline cursor-pointer"
                >
                  {isVi ? 'Đổi ảnh' : 'Change photo'}
                </button>
                {avatar !== user.avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar(user.avatar)}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                  >
                    {isVi ? 'Hoàn tác' : 'Undo'}
                  </button>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={handlePickFile}
                className="hidden"
              />
            </div>
          </div>

          {uploadError && (
            <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 leading-relaxed">
              {uploadError}
            </p>
          )}

          <div>
            <label className={label} htmlFor="profile-name">
              {isVi ? 'Họ và tên' : 'Full name'} <span className="text-red-600">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={field}
            />
          </div>

          <div>
            <label className={label} htmlFor="profile-phone">
              {isVi ? 'Số điện thoại' : 'Phone number'}
              <span className="font-normal text-stone-400"> ({isVi ? 'không bắt buộc' : 'optional'})</span>
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+84 90 123 4567"
              className={field}
            />
          </div>

          <div>
            <label className={label} htmlFor="profile-city">
              {user.role === 'host'
                ? isVi ? 'Thành phố bạn dẫn tour' : 'City you host in'
                : isVi ? 'Bạn đang ở đâu' : 'Where you are'}
              <span className="font-normal text-stone-400"> ({isVi ? 'không bắt buộc' : 'optional'})</span>
            </label>
            {/* Was a dropdown of eight cities, so most of Vietnam had no answer. */}
            <ProvinceSelect
              id="profile-city"
              value={city}
              onChange={(next) => setCity(next)}
              language={language}
              className={`${field} pl-9 pr-8`}
            />
          </div>

          {/* One line instead of four duplicated fields. */}
          {user.role === 'host' && onOpenHostProfile && (
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                onClose();
                onOpenHostProfile();
              }}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <i className="fa-solid fa-address-card text-[#D4AF37]"></i>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-stone-900">
                    {isVi ? 'Hồ sơ Host công khai' : 'Public host profile'}
                  </span>
                  <span className="block text-[11px] text-stone-500 leading-snug">
                    {isVi
                      ? 'Giới thiệu, ngôn ngữ, thế mạnh — những gì khách đọc trước khi đặt'
                      : 'Bio, languages, specialities — what a traveller reads before booking'}
                  </span>
                </span>
              </span>
              <i className="fa-solid fa-angle-right text-stone-300 text-xs shrink-0"></i>
            </button>
          )}

          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <i className="fa-solid fa-circle-check text-emerald-600"></i>
              {t.accountUpdatedSuccess}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#991B1B] hover:bg-[#7F1D1D] disabled:bg-stone-400 disabled:cursor-wait text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {saving
                ? isVi ? 'Đang tải ảnh…' : 'Uploading…'
                : isVi ? 'Lưu' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
