export type WorkspaceTab = 'overview' | 'apps' | 'docs' | 'sandbox' | 'certification' | 'inspector' | 'onboarding' | 'auth';

export const WORKSPACE_NAV: { id: WorkspaceTab; title: string; detail: string; group: string }[] = [
  { id: 'overview', title: 'Boshlash', detail: 'Integratsiya yo‘li', group: 'Workspace' },
  { id: 'apps', title: 'Biznesim', detail: 'Buyurtmalar va API', group: 'Workspace' },
  { id: 'docs', title: 'Hujjatlar', detail: 'Qo‘llanma va API reference', group: 'Dasturchi uchun' },
  { id: 'sandbox', title: 'Sinov muhiti', detail: 'Namunaviy buyurtma oqimi', group: 'Dasturchi uchun' },
  { id: 'certification', title: 'Tekshiruv', detail: 'Contract va certification', group: 'Dasturchi uchun' },
  { id: 'inspector', title: 'So‘rovlar jurnali', detail: 'Trace va xatolar', group: 'Dasturchi uchun' }
];

// Progress comes from persisted provider facts, never from the tab a user opens.
export function getIntegrationState(signedIn: boolean, provider?: {
  slug?: string; baseUrl?: string; status?: string;
  metadata?: { isCertified?: boolean; reviewStatus?: string; [key: string]: unknown };
}) {
  const connected = !!provider?.slug && !!provider.baseUrl;
  const certified = provider?.metadata?.isCertified === true;
  const active = provider?.status === 'ACTIVE';
  const steps = [
    { title: 'Biznes va mijoz yordami', description: 'Biznes nomi, rasmiy sayt va mijoz ko‘radigan yordam kanallarini kiriting.', complete: signedIn && !!provider?.slug },
    { title: 'Online API’ni ulang', description: 'Public HTTPS API manzilini kiriting va /health holatini tekshiring.', complete: connected },
    { title: 'Contractni tekshiring', description: 'Catalog yoki action endpointlari Zayuno contractiga mosligini tasdiqlang.', complete: certified },
    { title: 'Review va faollashuv', description: 'Tasdiqlangan integratsiya reviewdan so‘ng real mijozlarga ochiladi.', complete: active }
  ];
  if (!signedIn) return { steps, label: 'Integratsiyani boshlash', description: 'Biznes hisobini yarating. Docs va namunaviy sandbox hozirdanoq ochiq.', tab: 'onboarding' as WorkspaceTab, step: 1, status: 'Boshlashga tayyor' };
  if (!provider?.slug) return { steps, label: 'Biznes profilini yaratish', description: 'Hisobingiz tayyor. Endi biznes va mijoz yordam ma’lumotlarini kiriting.', tab: 'onboarding' as WorkspaceTab, step: 1, status: 'Profil kutilmoqda' };
  if (provider.status === 'SUSPENDED' || provider.status === 'DISABLED') return { steps, label: 'Provider holatini ko‘rish', description: 'Provider faol emas. Review holati va ko‘rsatmalarni tekshiring.', tab: 'onboarding' as WorkspaceTab, step: 4, status: provider.status };
  if (active) return { steps, label: 'Dashboardni ochish', description: 'Buyurtmalar, to‘lov holati va integratsiya salomatligini kuzating.', tab: 'apps' as WorkspaceTab, step: 4, status: 'Faol provider' };
  if (!connected) return { steps, label: 'API manzilini ulash', description: 'Public HTTPS API manzilini va authentication sozlamalarini kiriting.', tab: 'onboarding' as WorkspaceTab, step: 2, status: 'API kutilmoqda' };
  if (!certified) return { steps, label: 'API tekshiruvini ochish', description: 'Server ulangan. Contractga mosligini certification bilan tekshiring.', tab: 'onboarding' as WorkspaceTab, step: 3, status: 'Tekshiruv kutilmoqda' };
  return { steps, label: 'Review holatini ko‘rish', description: 'API tekshiruvi o‘tgan. Ariza reviewdan so‘ng real mijozlarga ochiladi.', tab: 'onboarding' as WorkspaceTab, step: 4, status: provider.metadata?.reviewStatus || 'Review uchun tayyor' };
}
