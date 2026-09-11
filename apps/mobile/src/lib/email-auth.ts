export const EMAIL_CODE_LENGTH = 5;
export const EMAIL_RESEND_SECONDS = 60;

export function normalizeLoginEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validLoginEmail(value: string) {
  const email = normalizeLoginEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmailCode(value: string) {
  // Accept pasted and OS-autofilled codes, including spaced digits.
  return value.replace(/[^0-9]/g, '').slice(0, EMAIL_CODE_LENGTH);
}

export function resendSecondsRemaining(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
