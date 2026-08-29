/**
 * Firebase Authentication wrapper.
 *
 * ViS-Go must run with or without Firebase, so every function here returns a
 * discriminated result instead of throwing raw SDK errors at components. When
 * Firebase is unconfigured the caller falls back to the localStorage account
 * store in `storage.ts`.
 *
 * Only Email/Password and Google sign-in are used — both are free on the Spark
 * plan up to 50k monthly active users. Phone auth is deliberately avoided: it
 * bills per SMS and requires Blaze.
 */

import type { User as FirebaseUser } from 'firebase/auth';
import { getFirebase, HAS_FIREBASE } from '../config/firebase';
import type { User, UserRole } from '../types';
import { readProfile, writeProfile } from './firestoreDb';

export type AuthFailure =
  | 'NOT_CONFIGURED'
  | 'EMAIL_IN_USE'
  | 'INVALID_CREDENTIALS'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'POPUP_BLOCKED'
  | 'POPUP_CLOSED'
  /** The sign-in method itself is switched off in the Firebase console. */
  | 'PROVIDER_DISABLED'
  /** The host the app is being served from is not on the authorised list. */
  | 'DOMAIN_NOT_ALLOWED'
  /** Same address, different sign-in method — use the original one. */
  | 'ACCOUNT_EXISTS_OTHER_METHOD'
  /** Signed in, but the Firestore profile could not be created or read. */
  | 'PROFILE_UNAVAILABLE'
  | 'NETWORK'
  | 'TOO_MANY_REQUESTS'
  | 'UNKNOWN';

/**
 * Discriminated on a *string* rather than a boolean deliberately: this project
 * compiles with `strict` off, and without `strictNullChecks` TypeScript widens
 * `true`/`false` literal types to `boolean`, so `if (!res.ok)` fails to narrow
 * the union at the call site. A string tag narrows correctly either way.
 */
export type AuthResult =
  | { status: 'ok'; user: User }
  | { status: 'failed'; reason: AuthFailure; detail?: string };

/** Maps Firebase's error codes onto our own closed set. */
function mapAuthError(err: unknown): AuthFailure {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'EMAIL_IN_USE';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'INVALID_CREDENTIALS';
    case 'auth/weak-password':
      return 'WEAK_PASSWORD';
    case 'auth/invalid-email':
      return 'INVALID_EMAIL';
    case 'auth/popup-blocked':
      return 'POPUP_BLOCKED';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'POPUP_CLOSED';
    // Every one of these used to fall through to UNKNOWN, whose message is
    // "please try again" — advice that cannot possibly work, because none of
    // them is transient. They are configuration, and the person clicking the
    // button needs to be told which one.
    case 'auth/operation-not-allowed':
      return 'PROVIDER_DISABLED';
    case 'auth/unauthorized-domain':
      return 'DOMAIN_NOT_ALLOWED';
    case 'auth/account-exists-with-different-credential':
      return 'ACCOUNT_EXISTS_OTHER_METHOD';
    case 'auth/network-request-failed':
      return 'NETWORK';
    case 'auth/too-many-requests':
      return 'TOO_MANY_REQUESTS';
    default:
      return 'UNKNOWN';
  }
}

/** Human-readable, per-language message for each failure. */
export function authFailureMessage(reason: AuthFailure, lang: 'vi' | 'en'): string {
  const vi: Record<AuthFailure, string> = {
    NOT_CONFIGURED: 'Chưa cấu hình Firebase — đang dùng tài khoản lưu trên máy.',
    EMAIL_IN_USE: 'Email này đã được đăng ký. Hãy đăng nhập thay vì tạo mới.',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
    WEAK_PASSWORD: 'Mật khẩu phải có ít nhất 6 ký tự.',
    INVALID_EMAIL: 'Địa chỉ email không hợp lệ.',
    POPUP_BLOCKED: 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép pop-up rồi thử lại.',
    POPUP_CLOSED: 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.',
    PROVIDER_DISABLED:
      'Đăng nhập bằng Google chưa được bật cho dự án này. Vào Firebase Console → Authentication → ' +
      'Sign-in method → Google → Enable. Miễn phí, không cần thẻ.',
    DOMAIN_NOT_ALLOWED:
      'Địa chỉ đang mở trang không nằm trong danh sách được phép của Firebase. Hãy dùng ' +
      'http://localhost thay cho 127.0.0.1 hoặc địa chỉ IP mạng LAN.',
    ACCOUNT_EXISTS_OTHER_METHOD:
      'Email này đã đăng ký bằng mật khẩu. Hãy đăng nhập bằng email và mật khẩu như cũ.',
    PROFILE_UNAVAILABLE:
      'Xác thực thành công nhưng không tạo được hồ sơ trong Firestore. Kiểm tra security rules rồi thử lại.',
    NETWORK: 'Không kết nối được tới Firebase. Kiểm tra mạng rồi thử lại.',
    TOO_MANY_REQUESTS: 'Sai quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.',
    UNKNOWN: 'Đăng nhập thất bại. Vui lòng thử lại.',
  };
  const en: Record<AuthFailure, string> = {
    NOT_CONFIGURED: 'Firebase is not configured — using accounts stored on this device.',
    EMAIL_IN_USE: 'That email is already registered. Sign in instead.',
    INVALID_CREDENTIALS: 'Incorrect email or password.',
    WEAK_PASSWORD: 'Password must be at least 6 characters.',
    INVALID_EMAIL: 'That email address is not valid.',
    POPUP_BLOCKED: 'Your browser blocked the Google sign-in window. Allow pop-ups and retry.',
    POPUP_CLOSED: 'You closed the sign-in window before it finished.',
    PROVIDER_DISABLED:
      'Google sign-in is not switched on for this project. Firebase Console → Authentication → ' +
      'Sign-in method → Google → Enable. It is free and needs no card.',
    DOMAIN_NOT_ALLOWED:
      'The address this page is served from is not on Firebase\u2019s authorised list. Use ' +
      'http://localhost rather than 127.0.0.1 or a LAN IP address.',
    ACCOUNT_EXISTS_OTHER_METHOD:
      'That address is already registered with a password. Sign in with your email and password instead.',
    PROFILE_UNAVAILABLE:
      'You were authenticated, but your Firestore profile could not be created. Check the security rules and retry.',
    NETWORK: 'Could not reach Firebase. Check your connection and retry.',
    TOO_MANY_REQUESTS: 'Too many failed attempts. Please wait a few minutes.',
    UNKNOWN: 'Sign-in failed. Please try again.',
  };
  return (lang === 'vi' ? vi : en)[reason];
}

/**
 * Builds the app's `User` for a freshly authenticated Firebase account,
 * creating the Firestore profile document on first sign-in.
 *
 * The Firebase Auth record only holds credentials — role, city, bio and the
 * host stats all live in Firestore, so the two must be stitched together here.
 */
async function hydrateProfile(fbUser: FirebaseUser, fallbackRole: UserRole, fallbackName?: string): Promise<User> {
  const existing = await readProfile(fbUser.uid);
  if (existing) return existing;

  const profile: User = {
    id: fbUser.uid,
    name: fallbackName || fbUser.displayName || fbUser.email?.split('@')[0] || 'ViS-Go User',
    email: fbUser.email ?? '',
    role: fallbackRole,
    phone: fbUser.phoneNumber ?? '',
    avatar:
      fbUser.photoURL ??
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.uid)}`,
    verified: false,
    rating: 0,
    reviewCount: 0,
    totalEarnings: 0,
    completedTours: 0,
    isAcceptingGuests: fallbackRole === 'host',
  };

  await writeProfile(profile);
  return profile;
}

/**
 * Turns an authenticated credential into an app `User`.
 *
 * Authentication and the profile document are two different systems, and a
 * failure in the second used to be reported as a failure of the first: the
 * Google popup succeeded, `writeProfile` was refused by the rules, and the
 * person was told "sign-in failed" while Firebase kept a perfectly good
 * session open — so the next page load signed them in for a sign-in they had
 * been told did not work.
 *
 * A profile failure therefore ends the session as well, and says which half of
 * it broke.
 */
async function completeSignIn(
  fbUser: FirebaseUser,
  fallbackRole: UserRole,
  fallbackName?: string,
): Promise<AuthResult> {
  try {
    return { status: 'ok', user: await hydrateProfile(fbUser, fallbackRole, fallbackName) };
  } catch (err) {
    console.warn('[ViS-Go] Authenticated, but the Firestore profile failed:', err);
    await signOutFirebase().catch(() => undefined);
    return { status: 'failed', reason: 'PROFILE_UNAVAILABLE', detail: (err as Error)?.message };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  role: UserRole,
): Promise<AuthResult> {
  const fb = await getFirebase();
  if (!fb) return { status: 'failed', reason: 'NOT_CONFIGURED' };

  try {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const cred = await createUserWithEmailAndPassword(fb.auth, email.trim(), password);
    if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
    return completeSignIn(cred.user, role, name.trim());
  } catch (err) {
    return { status: 'failed', reason: mapAuthError(err), detail: (err as Error)?.message };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const fb = await getFirebase();
  if (!fb) return { status: 'failed', reason: 'NOT_CONFIGURED' };

  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const cred = await signInWithEmailAndPassword(fb.auth, email.trim(), password);
    // An account always has a profile by this point; 'customer' is only used if
    // the Firestore document was manually deleted.
    return completeSignIn(cred.user, 'customer');
  } catch (err) {
    return { status: 'failed', reason: mapAuthError(err), detail: (err as Error)?.message };
  }
}

/**
 * Google sign-in. Reuses the same OAuth consent the Gmail/Calendar features
 * use, so a project already configured for those needs no extra setup.
 */
export async function signInWithGoogle(role: UserRole = 'customer'): Promise<AuthResult> {
  const fb = await getFirebase();
  if (!fb) return { status: 'failed', reason: 'NOT_CONFIGURED' };

  try {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    // Always show the chooser: users testing multiple roles need to switch.
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(fb.auth, provider);
    return completeSignIn(cred.user, role);
  } catch (err) {
    return { status: 'failed', reason: mapAuthError(err), detail: (err as Error)?.message };
  }
}

/**
 * Sends the real Firebase password-reset email.
 *
 * This used to be a toast that said a link had been sent while sending
 * nothing — the worst kind of failure, because the user waits for an email
 * that will never arrive. Firebase's own reset email is free on Spark and
 * needs no template of ours.
 */
export async function sendPasswordReset(email: string): Promise<AuthResult | { status: 'sent' }> {
  const fb = await getFirebase();
  if (!fb) return { status: 'failed', reason: 'NOT_CONFIGURED' };
  try {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(fb.auth, email.trim());
    return { status: 'sent' };
  } catch (err) {
    return { status: 'failed', reason: mapAuthError(err), detail: (err as Error)?.message };
  }
}

export async function signOutFirebase(): Promise<void> {
  if (!HAS_FIREBASE) return;
  const fb = await getFirebase();
  if (!fb) return;
  const { signOut } = await import('firebase/auth');
  await signOut(fb.auth);
}

/**
 * Restores the signed-in user on page load.
 *
 * Firebase resolves the persisted session asynchronously, so callers must wait
 * for this rather than reading `auth.currentUser` immediately — that is null
 * for the first few hundred milliseconds even when a valid session exists.
 */
export async function restoreFirebaseSession(): Promise<User | null> {
  const fb = await getFirebase();
  if (!fb) return null;

  const { onAuthStateChanged } = await import('firebase/auth');
  const fbUser = await new Promise<FirebaseUser | null>((resolve) => {
    const unsub = onAuthStateChanged(
      fb.auth,
      (u) => {
        unsub();
        resolve(u);
      },
      () => {
        unsub();
        resolve(null);
      },
    );
  });

  if (!fbUser) return null;
  try {
    return await hydrateProfile(fbUser, 'customer');
  } catch {
    return null;
  }
}
