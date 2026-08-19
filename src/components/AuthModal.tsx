import React, { useState } from 'react';
import { User, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
  existingUsers: User[];
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  language,
  onClose,
  onLogin,
  onRegister,
  existingUsers,
  defaultTab = 'login',
}) => {
  const t = translations[language];
  const isVi = language === 'vi';

  const [isSignUp, setIsSignUp] = useState(defaultTab === 'register');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Hà Nội');
  const [bio, setBio] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Tiếng Việt', 'English']);
  const [idCardNumber, setIdCardNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  if (!isOpen) return null;

  const handleQuickDemo = (userRole: UserRole, userEmail?: string) => {
    setErrorMsg('');
    sounds.playTap();

    let matched: User | undefined;
    if (userEmail) {
      matched = existingUsers.find((u) => u.email === userEmail);
    } else {
      matched = existingUsers.find((u) => u.role === userRole);
    }

    if (matched) {
      onLogin(matched);
      onClose();
    } else if (existingUsers.length > 0) {
      onLogin(existingUsers[0]);
      onClose();
    }
  };

  const handleToggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập email để nhận liên kết đặt lại mật khẩu.' : 'Please enter your email.');
      return;
    }
    sounds.playNotificationPing();
    setSuccessMsg(
      isVi
        ? `Đã gửi liên kết khôi phục mật khẩu tới ${forgotEmail}. Vui lòng kiểm tra hộp thư!`
        : `Password recovery link sent to ${forgotEmail}. Please check your inbox!`
    );
    setIsForgotPasswordOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isSignUp) {
      if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
        setErrorMsg(isVi ? 'Vui lòng điền đầy đủ các thông tin bắt buộc.' : 'Please fill in all required fields.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg(isVi ? 'Mật khẩu xác nhận không khớp!' : 'Passwords do not match!');
        return;
      }

      if (password.length < 6) {
        setErrorMsg(isVi ? 'Mật khẩu phải có ít nhất 6 ký tự.' : 'Password must be at least 6 characters.');
        return;
      }

      if (!termsAgreed) {
        setErrorMsg(
          isVi
            ? 'Bạn cần đồng ý với Điều khoản dịch vụ & Chính sách an toàn ViS-Go.'
            : 'Please agree to ViS-Go Terms of Service & Safety Guidelines.'
        );
        return;
      }

      const existing = existingUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        setErrorMsg(isVi ? 'Email này đã tồn tại trong hệ thống. Vui lòng đăng nhập.' : 'This email is already registered. Please log in.');
        return;
      }

      const newUser: User = {
        id: `user_${Date.now()}`,
        name: fullName,
        email,
        password,
        phone,
        role: selectedRole,
        avatar:
          selectedRole === 'host'
            ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        verified: selectedRole === 'host' ? false : true,
        city: selectedRole === 'host' ? city : undefined,
        languages: selectedRole === 'host' ? selectedLanguages : ['English'],
        bio: selectedRole === 'host' ? bio || 'Passionate local host sharing authentic Vietnamese living.' : undefined,
        bioVi: selectedRole === 'host' ? bio || 'Người bạn bản địa nhiệt tình chia sẻ văn hóa và ẩm thực Việt.' : undefined,
        specialties: selectedRole === 'host' ? ['Street Food', 'Cultural Stories'] : undefined,
        rating: selectedRole === 'host' ? 5.0 : undefined,
        reviewCount: selectedRole === 'host' ? 0 : undefined,
        totalEarnings: selectedRole === 'host' ? 0 : undefined,
        completedTours: selectedRole === 'host' ? 0 : undefined,
        isAcceptingGuests: selectedRole === 'host' ? true : undefined,
      };

      sounds.playSuccessChime();
      onRegister(newUser);
      onClose();
    } else {
      if (!email.trim() || !password.trim()) {
        setErrorMsg(isVi ? 'Vui lòng nhập Email và Mật khẩu.' : 'Please enter Email and Password.');
        return;
      }

      const matched = existingUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        if (matched.password && matched.password !== password) {
          setErrorMsg(isVi ? 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.' : 'Incorrect password. Please try again.');
          return;
        }
        sounds.playSuccessChime();
        onLogin(matched);
        onClose();
      } else {
        // User not found
        setErrorMsg(
          isVi
            ? 'Tài khoản không tồn tại. Vui lòng chuyển sang tab "Đăng ký" để tạo tài khoản mới.'
            : 'Account not found. Please switch to "Register" to create an account.'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cultural Gradient */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-[#4A1010] p-5 sm:p-6 text-white flex items-center justify-between border-b border-amber-500/20 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#A82323] border border-[#D4AF37]/50 flex items-center justify-center text-white font-serif font-black text-xl shadow-md">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="serif font-bold text-lg sm:text-xl text-white">
                  {isSignUp ? (isVi ? 'Đăng Ký Tài Khoản' : 'Create an Account') : (isVi ? 'Đăng Nhập ViS-Go' : 'Welcome to ViS-Go')}
                </h3>
                <span className="px-2 py-0.5 bg-[#D4AF37] text-stone-950 text-[9px] font-black uppercase rounded-full">
                  VIETNAM
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                {isVi
                  ? 'Cộng đồng trải nghiệm văn hóa & Bạn đồng hành bản địa'
                  : 'Authentic Local Tour Buddy & Cultural Journeys'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Tab Switcher (Đăng nhập / Đăng ký) */}
        <div className="grid grid-cols-2 p-2 bg-stone-100/80 border-b border-stone-200/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              !isSignUp
                ? 'bg-white text-[#A82323] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <i className="fa-solid fa-arrow-right-to-bracket"></i>
            <span>{isVi ? 'Đăng Nhập' : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isSignUp
                ? 'bg-white text-[#A82323] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <i className="fa-solid fa-user-plus"></i>
            <span>{isVi ? 'Đăng Ký Mới' : 'Create Account'}</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Status Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 shrink-0"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2.5">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5 shrink-0"></i>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Demo Access Bar (Only on Sign In) */}
          {!isSignUp && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-bolt text-amber-600"></i>
                  {isVi ? '1-Click Đăng nhập Nhanh Demo' : '1-Click Instant Demo Login'}
                </span>
                <span className="text-[10px] text-amber-700 font-mono">Instant Test</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('customer', 'customer@visgo.vn')}
                  className="p-2.5 bg-white hover:bg-amber-100/80 border border-amber-200 rounded-xl text-center transition-all cursor-pointer shadow-2xs hover:scale-102"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 mx-auto flex items-center justify-center text-xs font-bold mb-1">
                    🎒
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 block truncate">Emma (Khách)</span>
                  <span className="text-[9px] text-stone-500 block">Traveler</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('host', 'tommy.hanoi@visgo.vn')}
                  className="p-2.5 bg-white hover:bg-amber-100/80 border border-amber-200 rounded-xl text-center transition-all cursor-pointer shadow-2xs hover:scale-102"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 mx-auto flex items-center justify-center text-xs font-bold mb-1">
                    🍜
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 block truncate">Host Tommy</span>
                  <span className="text-[9px] text-stone-500 block">Hà Nội Host</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('host', 'mailinh.saigon@visgo.vn')}
                  className="p-2.5 bg-white hover:bg-amber-100/80 border border-amber-200 rounded-xl text-center transition-all cursor-pointer shadow-2xs hover:scale-102"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-900 mx-auto flex items-center justify-center text-xs font-bold mb-1">
                    🛵
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 block truncate">Host Mai Linh</span>
                  <span className="text-[9px] text-stone-500 block">Sài Gòn Host</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin', 'admin@visgo.vn')}
                  className="p-2.5 bg-white hover:bg-amber-100/80 border border-amber-200 rounded-xl text-center transition-all cursor-pointer shadow-2xs hover:scale-102"
                >
                  <div className="w-7 h-7 rounded-full bg-stone-900 text-amber-400 mx-auto flex items-center justify-center text-xs font-bold mb-1">
                    🛡️
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 block truncate">Admin eKYC</span>
                  <span className="text-[9px] text-stone-500 block">Safety Hub</span>
                </button>
              </div>
            </div>
          )}

          {/* Registration Role Selector */}
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 block">
                {isVi ? 'Chọn vai trò tài khoản của bạn:' : 'Select your account type:'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('customer')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    selectedRole === 'customer'
                      ? 'border-[#A82323] bg-red-50/50 shadow-xs'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="text-2xl mb-1">🎒</div>
                  <h4 className="text-xs font-bold text-stone-900">
                    {isVi ? 'Khách du lịch' : 'Traveler / Guest'}
                  </h4>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">
                    {isVi
                      ? 'Khám phá văn hóa, đặt tour bản địa & bảo hiểm 100% Escrow'
                      : 'Explore authentic tours & book local companions safely'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('host')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    selectedRole === 'host'
                      ? 'border-[#D4AF37] bg-amber-50/50 shadow-xs'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="text-2xl mb-1">🛵</div>
                  <h4 className="text-xs font-bold text-stone-900">
                    {isVi ? 'Host Bản địa' : 'Local Buddy / Host'}
                  </h4>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">
                    {isVi
                      ? 'Dẫn tour văn hóa, nhận cọc tự động & kết nối bạn bè quốc tế'
                      : 'Host cultural journeys & earn direct verified payouts'}
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Main Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {isVi ? 'Họ và tên' : 'Full Name'} *
                </label>
                <div className="relative">
                  <i className="fa-regular fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isVi ? 'Nguyễn Văn A' : 'Alex Morgan'}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-xs sm:text-sm text-stone-900 outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">
                {isVi ? 'Địa chỉ Email' : 'Email Address'} *
              </label>
              <div className="relative">
                <i className="fa-regular fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-xs sm:text-sm text-stone-900 outline-hidden transition-all"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">
                    {isVi ? 'Số điện thoại / WhatsApp' : 'Phone / WhatsApp'} *
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+84 908 123 456"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-xs sm:text-sm text-stone-900 outline-hidden transition-all"
                    />
                  </div>
                </div>

                {selectedRole === 'host' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">
                      {isVi ? 'Thành phố hoạt động' : 'Base City'} *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-xs sm:text-sm text-stone-900 outline-hidden transition-all cursor-pointer"
                    >
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh (Sài Gòn)</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hội An">Hội An</option>
                      <option value="Đà Lạt">Đà Lạt</option>
                      <option value="Huế">Huế</option>
                      <option value="Ninh Bình">Ninh Bình</option>
                      <option value="Sa Pa">Sa Pa</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Host-specific registration fields */}
            {isSignUp && selectedRole === 'host' && (
              <div className="space-y-3 p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-950 block">
                    {isVi ? 'Ngôn ngữ bạn giao tiếp thông thạo:' : 'Languages you speak fluently:'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Tiếng Việt', 'English', 'Français', '한국어', '日本語', '中文', 'Deutsch'].map((l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => handleToggleLanguage(l)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedLanguages.includes(l)
                            ? 'bg-[#A82323] text-white shadow-2xs'
                            : 'bg-white text-stone-700 border border-stone-200'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-950 block">
                    {isVi ? 'Giới thiệu ngắn về bản thân & đam mê dẫn tour:' : 'Short Intro & Tour Style:'}
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={
                      isVi
                        ? 'Chào bạn! Mình sinh ra tại phố cổ Hà Nội, rất mê cà phê trứng và các con hẻm ẩm thực đêm...'
                        : 'Hi! I am a passionate local foodie who loves showing hidden alleyways and vintage Vespa rides...'
                    }
                    className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-[#A82323] rounded-xl text-xs text-stone-900 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-950 block">
                    {isVi ? 'Số CCCD / Hộ chiếu (Mô phỏng eKYC bước đầu):' : 'National ID / Passport No:'}
                  </label>
                  <input
                    type="text"
                    value={idCardNumber}
                    onChange={(e) => setIdCardNumber(e.target.value)}
                    placeholder="001099xxxxxx"
                    className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-[#A82323] rounded-xl text-xs font-mono text-stone-900 outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">
                  {isVi ? 'Mật khẩu' : 'Password'} *
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(!isForgotPasswordOpen)}
                    className="text-[11px] font-semibold text-[#A82323] hover:underline cursor-pointer"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-xs sm:text-sm text-stone-900 outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Confirm Password for Register */}
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {isVi ? 'Xác nhận lại mật khẩu' : 'Confirm Password'} *
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock-open absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-xs sm:text-sm text-stone-900 outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            {/* Forgot Password Accordion / Section */}
            {!isSignUp && isForgotPasswordOpen && (
              <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200 space-y-2 animate-in fade-in">
                <p className="text-xs font-semibold text-stone-800">
                  {isVi ? 'Khôi phục mật khẩu tài khoản:' : 'Reset your password:'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleForgotPasswordSubmit}
                    className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-stone-800"
                  >
                    {isVi ? 'Gửi OTP' : 'Send'}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me & Terms Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={isSignUp ? termsAgreed : rememberMe}
                onChange={(e) => (isSignUp ? setTermsAgreed(e.target.checked) : setRememberMe(e.target.checked))}
                className="mt-0.5 w-4 h-4 rounded text-[#A82323] focus:ring-[#A82323] border-stone-300 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-stone-600 leading-snug cursor-pointer select-none">
                {isSignUp ? (
                  <span>
                    {isVi
                      ? 'Tôi đồng ý với Điều khoản dịch vụ, Quy tắc bảo đảm an toàn và Chính sách ký quỹ 100% ViS-Go Escrow.'
                      : 'I agree to ViS-Go Terms of Service, Safety Guidelines & 100% Escrow Protection.'}
                  </span>
                ) : (
                  <span>{isVi ? 'Ghi nhớ đăng nhập trên thiết bị này' : 'Keep me signed in on this device'}</span>
                )}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-[#A82323] hover:bg-[#8C1818] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <i className={`fa-solid ${isSignUp ? 'fa-user-check' : 'fa-arrow-right-to-bracket'}`}></i>
              <span>{isSignUp ? (isVi ? 'Hoàn tất Đăng Ký' : 'Create Account') : (isVi ? 'Đăng Nhập Ngay' : 'Sign In Now')}</span>
            </button>
          </form>

          {/* Social Logins Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-stone-400 font-medium">
                {isVi ? 'Hoặc tiếp tục với' : 'Or continue with'}
              </span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('customer')}
              className="py-2.5 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <i className="fa-brands fa-google text-red-500"></i>
              <span className="hidden sm:inline">Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('customer')}
              className="py-2.5 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <i className="fa-brands fa-apple text-stone-900"></i>
              <span className="hidden sm:inline">Apple</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('customer')}
              className="py-2.5 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <i className="fa-brands fa-facebook text-blue-600"></i>
              <span className="hidden sm:inline">Facebook</span>
            </button>
          </div>

        </div>

        {/* Footer Guarantee */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 text-center text-[11px] text-stone-500 shrink-0">
          <i className="fa-solid fa-shield-check text-emerald-600 mr-1.5"></i>
          <span>
            {isVi
              ? 'Bảo mật chuẩn SSL 256-bit • Bảo vệ thanh toán ký quỹ ViS-Go Escrow 100%'
              : '256-bit SSL encryption • 100% Protected by ViS-Go Escrow Vault'}
          </span>
        </div>
      </div>
    </div>
  );
};
