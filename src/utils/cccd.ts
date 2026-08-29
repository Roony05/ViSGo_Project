/**
 * Vietnamese citizen ID numbers — the little that can be checked for free.
 *
 * A CCCD number is exactly twelve digits. That is the whole of what this file
 * verifies, and it is worth being precise about what such a check buys: it
 * catches a typo, a pasted phone number and a half-finished entry. It does not
 * prove the number belongs to anyone, because proving that means querying the
 * national population database through C06, which is open to registered
 * organisations under contract and cannot be done from a browser at any price.
 *
 * The leading digit is frequently 0 (province code 001 is Hà Nội), so the value
 * is a string everywhere. Storing it as a number would silently drop that zero
 * and turn a valid card into an eleven-digit one.
 */

/** Digits only — people type spaces, dots and dashes off the card. */
export function normaliseCccd(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidCccd(input: string): boolean {
  return /^\d{12}$/.test(normaliseCccd(input));
}

/** `012345678901` → `0123 4567 8901`, which is how it reads on the card. */
export function formatCccd(input: string): string {
  const digits = normaliseCccd(input);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Empty when the value is acceptable; otherwise the reason, in the UI language. */
export function cccdError(input: string, vi: boolean): string {
  const digits = normaliseCccd(input);
  if (digits.length === 0) {
    return vi ? 'Chưa nhập số căn cước.' : 'Enter your citizen ID number.';
  }
  if (digits.length !== 12) {
    return vi
      ? `Số căn cước phải đủ 12 chữ số (đang có ${digits.length}).`
      : `A citizen ID number is exactly 12 digits (you entered ${digits.length}).`;
  }
  return '';
}
