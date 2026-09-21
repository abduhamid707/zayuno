export interface ConnectorDefinitionDto {
  id: string;
  name: string;
  description: string;
  status: string;
  configSchema?: { fields?: { key: string; helpUrl?: string }[] };
}

export interface ConnectorInstanceDto {
  id: string;
  connectorDefinitionId: string;
  name: string;
  status: string;
  selectedShopId: string | null;
  selectedShopName: string | null;
  totalProducts: number;
  activeProducts: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  autoSyncEnabled?: boolean;
  syncIntervalHours?: number;
  nextSyncAt: string | null;
}

// The signed-in provider is authoritative; onboarding parameters have no meaning here.
export function integrationsUrl(href: string, providerSlug?: string) {
  const url = new URL(href);
  if (url.searchParams.get('tab') !== 'integrations') return url;
  url.searchParams.delete('step');
  url.searchParams.delete('flow');
  if (providerSlug) url.searchParams.set('provider', providerSlug);
  return url;
}

export function connectorStatus(status: string) {
  return ({ CONNECTED: 'Ulangan', SYNCING: 'Yangilanmoqda', ERROR: 'Yangilashda xato', DISCONNECTED: 'Ulanish uzilgan' } as Record<string, string>)[status] || 'Holat noma’lum';
}

export function formatSyncTime(value: string | null, locale?: string, timeZone?: string) {
  if (!value) return 'Hali yangilanmagan';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Vaqt ma’lum emas';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone, timeZoneName: 'short',
  }).format(date);
}

export function safeProductUrl(value?: string | null) {
  try {
    const url = new URL(value || '');
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export async function connectorRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false) {
    // Do not expose raw vendor errors: they may contain credentials.
    const message = response.status === 401 ? 'Sessiya tugagan. Qayta kiring.'
      : response.status === 403 ? 'Bu amal uchun ruxsat yo‘q.'
      : response.status === 409 ? 'Bu amal allaqachon bajarilmoqda. Natijani kuting.'
      : 'So‘rov bajarilmadi. Birozdan keyin qayta urinib ko‘ring.';
    throw new Error(message);
  }
  if (data === null) throw new Error('Serverdan kutilmagan javob olindi. Qayta urinib ko‘ring.');
  return data as T;
}

// Synchronous gate: even two clicks before React renders cannot start two requests.
export function createRequestGate() {
  const pending = new Set<string>();
  return {
    enter(key: string) { if (pending.has(key)) return false; pending.add(key); return true; },
    leave(key: string) { pending.delete(key); },
  };
}
