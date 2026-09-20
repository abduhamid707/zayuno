export type BusinessFields = {
  businessName: string;
  supportPhone: string;
  supportTelegram: string;
  supportEmail: string;
  supportUrl: string;
  supportNote: string;
};
export function businessErrors(fields: BusinessFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (fields.businessName.trim().length < 2) errors.businessName = 'Biznes nomi kamida 2 belgidan iborat bo‘lsin.';
  const phone = fields.supportPhone.trim();
  const telegram = fields.supportTelegram.trim();
  const email = fields.supportEmail.trim();
  const supportUrl = fields.supportUrl.trim();
  if (!phone && !telegram && !email && !supportUrl) errors.supportPhone = 'Kamida bitta mijoz yordam kanalini kiriting.';
  if (phone && !/^\+?[\d\s()-]{7,22}$/.test(phone)) errors.supportPhone = 'Telefon raqamini tekshiring, masalan +998901234567.';
  if (telegram && !/^(?:@|https:\/\/t\.me\/)?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(telegram)) errors.supportTelegram = 'Telegram username kiriting: @business_support.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.supportEmail = 'Email manzilini tekshiring.';
  if (supportUrl) {
    try {
      const url = new URL(supportUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch { errors.supportUrl = 'Rasmiy sayt yoki yordam sahifasining public HTTPS manzilini kiriting.'; }
  }
  if (fields.supportNote.trim().length > 500) errors.supportNote = 'Mijozga ko‘rinadigan izoh 500 belgidan oshmasin.';
  return errors;
}

export function integrationErrors(fields: { slug: string; baseUrl: string; apiSecret: string; hasSavedSecret: boolean; sandbox: boolean; generatedSecret: string; confirmed: boolean }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(fields.slug.trim())) errors.slug = '2–63 belgili slug kiriting: harf, raqam va defis.';
  try {
    const url = new URL(fields.baseUrl.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
  } catch { errors.baseUrl = 'Public HTTPS API manzilini kiriting, masalan https://api.biznes.uz/zayuno.'; }
  if (!fields.sandbox && !fields.hasSavedSecret && fields.apiSecret.trim().length < 12) errors.apiSecret = 'Kamida 12 belgili provider kalitini kiriting yoki generatsiya qiling.';
  if (fields.apiSecret && fields.apiSecret.trim().length < 12) errors.apiSecret = 'Provider kaliti kamida 12 belgi bo‘lsin.';
  if (fields.apiSecret.length > 512) errors.apiSecret = 'Provider kaliti 512 belgidan oshmasin.';
  if (fields.generatedSecret && !fields.confirmed) errors.apiSecret = 'Generatsiya qilingan kalitni saqlab, tasdiq katakchasini belgilang.';
  return errors;
}

export function reachableOnboardingStep(businessValid: boolean, integrationSaved: boolean, certified: boolean): number {
  if (!businessValid) return 1;
  if (!integrationSaved) return 2;
  return certified ? 4 : 3;
}

export const CERTIFICATION_VERSION = 2;

export function isCurrentCertification(report: any): boolean {
  return report?.certificationVersion === CERTIFICATION_VERSION && report?.mode === 'STRICT' && report?.isProductionReady === true;
}
