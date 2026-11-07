export function generateOTP(): string {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  return otp;
}

export function generateReferralCode(phone: string): string {
  const timestamp = Date.now().toString().slice(-4);
  const phoneDigits = phone.replace(/\D/g, '').slice(-4);
  const code = `NEO${phoneDigits}${timestamp}`;
  return code;
}

export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 5);
  return expiry;
}
