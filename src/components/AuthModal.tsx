import React, { useState } from 'react';
import { User, Language, UserRole } from '../types';
import { sounds } from '../utils/audio';

import { HAS_FIREBASE } from '../config/firebase';
import {
  authFailureMessage,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../utils/firebaseAuth';
import { writeProfile } from '../utils/firestoreDb';

/**
 * Sign-in / sign-up.
 *
 * Deliberately small. Two ways in — an email and password, or Google — and
 * nothing else on the screen. Everything that used to be here and is gone now
 * fell into one of three groups:
 *
 *   1. DOORS THAT WERE NOT DOORS. Apple and Facebook buttons wired to no
 *      provider, and a "Send OTP" that sent nothing while telling the user to
 *      go check their inbox. Password reset below is now Firebase's real
 *      reset email; the other two are simply not offered.
 *
 *   2. CLAIMS WE CANNOT MAKE. "256-bit SSL", "100% Escrow protected", a
 *      certification badge. TLS is the browser's doing and says nothing about
 *      this form, and there is no escrow account behind ViS-Go. Invented trust
 *      marks on a login screen are exactly what a phishing page shows.
 *
 *   3. FIELDS THE PROFILE EDITOR ALREADY OWNS. Phone, city, spoken languages,
 *      bio, ID-card number. Asking for them at the door lengthened the form
 *      and bought nothing: the ID number was collected and then dropped on the
 *      floor — it never reached the User object — and verification collects it
 *      properly, with document photos, later.
 *
 * ROLES. Registration offers traveller and host only. `admin` is not a choice
 * here and cannot be smuggled in either: firestore.rules pin profile creation
 * to `role in ['customer','host']`, so a hand-crafted request is refused at
 * the database. Admin is granted by an existing admin, in the Admin Hub.
 */
interface AuthModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  language,
  onClose,
  onLogin,
  onRegister,
  defaultTab = 'login',
}) => {
  const isVi = language === 'vi';
  const [busy, setBusy] = useState(false);

  const [isSignUp, setIsSignUp] = useState(defaultTab === 'register');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  /*
    Which screen the modal is showing.

    Password recovery used to be a link under the password field that fired an
    email from underneath the sign-in form, and reported it in the same little
    green strip used for everything else. It is a different transaction with a
    different outcome — you leave for your inbox and come back later — so it
    now gets a screen of its own, with the tab switcher out of the way.

    On what arrives in that inbox: Firebase sends a reset *link*, not a six
    digit code. A code cannot be honest here. Verifying one and then setting a
    new password needs an endpoint holding admin credentials, and on static
    hosting that means Cloud Functions, which means a card on the account —
    the one thing this project may never require. A pretend code that does not
    reset anything is exactly the kind of dead control that was stripped out of
    this file. So: a real link, and copy that says so.
  */
  const [view, setView] = useState<'auth' | 'forgot'>('auth');
  /** The address the reset mail actually went to, once it has gone. */
  const [resetSentTo, setResetSentTo] = useState('');

  if (!isOpen) return null;

  const notConfigured = isVi
    ? 'Chưa kết nối cơ sở dữ liệu, nên chưa đăng nhập được. Điền cấu hình Firebase vào tệp .env rồi tải lại trang.'
    : 'The database is not connected, so sign-in is unavailable. Add the Firebase config to .env and reload.';

  const switchTab = (signUp: boolean) => {
    setIsSignUp(signUp);
    setView('auth');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!HAS_FIREBASE) {
      setErrorMsg(notConfigured);
      return;
    }
    setBusy(true);
    // The role only applies to an account being created for the first time;
    // an existing profile keeps whatever role it already has.
    const res = await signInWithGoogle(isSignUp ? selectedRole : 'customer');
    setBusy(false);
    if (res.status === 'failed') {
      setErrorMsg(authFailureMessage(res.reason, isVi ? 'vi' : 'en'));
      return;
    }
    sounds.playSuccessChime();
    onLogin(res.user);
    onClose();
  };

  const openForgot = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setResetSentTo('');
    setView('forgot');
  };

  const backToSignIn = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setView('auth');
  };

  /** Firebase's own reset email — no template, no cost, and it actually sends. */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const address = email.trim();
    if (!address) {
      setErrorMsg(isVi ? 'Nhập email của bạn.' : 'Enter your email address.');
      return;
    }
    if (!HAS_FIREBASE) {
      setErrorMsg(notConfigured);
      return;
    }
    setBusy(true);
    const res = await sendPasswordReset(address);
    setBusy(false);
    if (res.status === 'failed') {
      setErrorMsg(authFailureMessage(res.reason, isVi ? 'vi' : 'en'));
      return;
    }
    setResetSentTo(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Accounts live in Firebase Authentication and nowhere else. With no
    // Firebase config there is genuinely nothing to authenticate against, and
    // saying so beats inventing a session that can save nothing.
    if (!HAS_FIREBASE) {
      setErrorMsg(notConfigured);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập email và mật khẩu.' : 'Please enter your email and password.');
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setErrorMsg(isVi ? 'Vui lòng nhập họ và tên.' : 'Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg(isVi ? 'Mật khẩu phải có ít nhất 6 ký tự.' : 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(isVi ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
        return;
      }

      // Firebase Auth owns the credential. The password is handed to it and
      // never stored anywhere else — not in the profile document, which is
      // world-readable, and not in this browser. Whether the email is already
      // taken is Firebase's answer to give: it comes back as EMAIL_IN_USE.
      setBusy(true);
      const res = await signUpWithEmail(email, password, fullName, selectedRole);
      setBusy(false);
      if (res.status === 'failed') {
        setErrorMsg(authFailureMessage(res.reason, isVi ? 'vi' : 'en'));
        return;
      }

      // signUpWithEmail already wrote the profile; this second write only adds
      // the fields the form collected on top of it.
      const merged: User = {
        ...res.user,
        name: fullName.trim(),
        role: selectedRole,
        isAcceptingGuests: selectedRole === 'host',
      };
      await writeProfile(merged);
      sounds.playSuccessChime();
      onRegister(merged);
      onClose();
      return;
    }

    setBusy(true);
    const res = await signInWithEmail(email, password);
    setBusy(false);
    if (res.status === 'failed') {
      setErrorMsg(authFailureMessage(res.reason, isVi ? 'vi' : 'en'));
      return;
    }
    sounds.playSuccessChime();
    onLogin(res.user);
    onClose();
  };

  const inputClass =
    'w-full pl-9 pr-3.5 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-sm text-stone-900 outline-hidden transition-all';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-[#4A1010] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#A82323] border border-[#D4AF37]/50 flex items-center justify-center text-white font-serif font-black text-xl shadow-md">
              V
            </div>
            <h3 className="serif font-bold text-lg text-white">
              {view === 'forgot'
                ? (isVi ? 'Quên mật khẩu' : 'Password recovery')
                : isSignUp
                  ? (isVi ? 'Tạo tài khoản ViS-Go' : 'Create a ViS-Go account')
                  : (isVi ? 'Đăng nhập ViS-Go' : 'Sign in to ViS-Go')}
            </h3>
          </div>

          <button
            onClick={onClose}
            aria-label={isVi ? 'Đóng' : 'Close'}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Tab switcher — put away while recovering a password. */}
        {view === 'auth' && (
        <div className="grid grid-cols-2 bg-stone-100/80 border-b border-stone-200/80 shrink-0">
          <button
            type="button"
            onClick={() => switchTab(false)}
            className={`py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              !isSignUp ? 'bg-white text-[#A82323] shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {isVi ? 'Đăng nhập' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={() => switchTab(true)}
            className={`py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              isSignUp ? 'bg-white text-[#A82323] shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {isVi ? 'Đăng ký' : 'Create account'}
          </button>
        </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 shrink-0"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2.5">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5 shrink-0"></i>
              <span>{successMsg}</span>
            </div>
          )}

          {view === 'forgot' ? (
            resetSentTo ? (
              /* Sent. Nothing left to type, so the screen is only an instruction. */
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <i className="fa-regular fa-envelope-open text-2xl text-emerald-600"></i>
                </div>
                <div className="space-y-2">
                  <h4 className="serif font-bold text-lg text-stone-900">
                    {isVi ? 'Đã gửi email' : 'Email sent'}
                  </h4>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {isVi ? 'Liên kết đặt lại mật khẩu vừa được gửi tới' : 'A password reset link is on its way to'}
                    {/* Its own line: an address broken mid-word to fit reads as a typo. */}
                    <span className="block font-bold text-stone-900 break-words mt-0.5">{resetSentTo}</span>
                  </p>
                  <p className="text-xs text-stone-500 leading-relaxed px-2">
                    {isVi
                      ? 'Mở email đó rồi bấm vào liên kết để đặt mật khẩu mới. Liên kết hết hạn sau 1 giờ. Chưa thấy thì xem thêm hộp thư rác.'
                      : 'Open it and follow the link to choose a new password. The link expires after an hour. Check your spam folder if it has not arrived.'}
                  </p>
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="w-full py-3 bg-[#A82323] hover:bg-[#8C1818] text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer text-sm"
                  >
                    {isVi ? 'Về trang đăng nhập' : 'Back to sign in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetSentTo('')}
                    className="w-full text-xs font-semibold text-stone-500 hover:text-[#A82323] cursor-pointer py-1"
                  >
                    {isVi ? 'Gửi lại, hoặc dùng email khác' : 'Send again, or use another address'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-[#A82323] cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>{isVi ? 'Quay lại đăng nhập' : 'Back to sign in'}</span>
                </button>

                <div className="space-y-1.5">
                  <h4 className="serif font-bold text-lg text-stone-900">
                    {isVi ? 'Đặt lại mật khẩu' : 'Reset your password'}
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    {isVi
                      ? 'Nhập email bạn đã dùng để đăng ký. Chúng tôi gửi tới đó một liên kết để bạn đặt mật khẩu mới.'
                      : 'Enter the address you signed up with. We will send it a link for choosing a new password.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">Email</label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      placeholder="ban@email.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-[#A82323] hover:bg-[#8C1818] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-60 disabled:cursor-wait"
                >
                  {busy && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                  <span>
                    {busy
                      ? (isVi ? 'Đang gửi…' : 'Sending…')
                      : (isVi ? 'Gửi liên kết đặt lại' : 'Send reset link')}
                  </span>
                </button>
              </form>
            )
          ) : (
          <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role. Traveller and host only — see the note at the top. */}
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-800 block">
                  {isVi ? 'Bạn đăng ký với vai trò:' : 'Register as:'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('customer')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      selectedRole === 'customer'
                        ? 'border-[#A82323] bg-red-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <i className="fa-solid fa-suitcase-rolling text-xl text-[#A82323] mb-1 block"></i>
                    <h4 className="text-xs font-bold text-stone-900">
                      {isVi ? 'Khách du lịch' : 'Traveller'}
                    </h4>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('host')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      selectedRole === 'host'
                        ? 'border-[#D4AF37] bg-amber-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <i className="fa-solid fa-motorcycle text-xl text-[#B8860B] mb-1 block"></i>
                    <h4 className="text-xs font-bold text-stone-900">
                      {isVi ? 'Host bản địa' : 'Local host'}
                    </h4>
                  </button>
                </div>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">{isVi ? 'Họ và tên' : 'Full name'}</label>
                <div className="relative">
                  <i className="fa-regular fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isVi ? 'Nguyễn Văn A' : 'Alex Morgan'}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Email</label>
              <div className="relative">
                <i className="fa-regular fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">{isVi ? 'Mật khẩu' : 'Password'}</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={openForgot}
                    disabled={busy}
                    className="text-[11px] font-semibold text-[#A82323] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={isVi ? 'Hiện mật khẩu' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                >
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {isVi ? 'Nhập lại mật khẩu' : 'Confirm password'}
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock-open absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-[#A82323] hover:bg-[#8C1818] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-60 disabled:cursor-wait"
            >
              {busy && <i className="fa-solid fa-circle-notch fa-spin"></i>}
              <span>
                {busy
                  ? (isVi ? 'Đang xử lý…' : 'Working…')
                  : isSignUp
                    ? (isVi ? 'Đăng ký' : 'Create account')
                    : (isVi ? 'Đăng nhập' : 'Sign in')}
              </span>
            </button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-stone-400 font-medium">{isVi ? 'hoặc' : 'or'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy || !HAS_FIREBASE}
            title={HAS_FIREBASE ? undefined : notConfigured}
            className="w-full py-2.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-2xl text-sm font-semibold text-stone-800 flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fa-brands fa-google text-red-500"></i>
            <span>{isVi ? 'Tiếp tục với Google' : 'Continue with Google'}</span>
          </button>
          </>
          )}
        </div>
      </div>
    </div>
  );
};
