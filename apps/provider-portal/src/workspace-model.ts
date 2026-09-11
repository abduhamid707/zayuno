export type WorkspaceTab = 'overview' | 'apps' | 'docs' | 'sandbox' | 'certification' | 'inspector' | 'onboarding' | 'auth';

export const WORKSPACE_NAV: { id: WorkspaceTab; title: string; detail: string; group: string }[] = [
  { id: 'overview', title: 'Boshlash', detail: 'Integratsiya yo‘li', group: 'Workspace' },
  { id: 'apps', title: 'Mening biznesim', detail: 'Buyurtmalar va API', group: 'Workspace' },
  { id: 'docs', title: 'Hujjatlar', detail: 'Qo‘llanma va API reference', group: 'Dasturchi uchun' },
  { id: 'sandbox', title: 'Sandbox', detail: 'Namunaviy buyurtma oqimi', group: 'Dasturchi uchun' },
  { id: 'certification', title: 'API tekshiruvi', detail: 'Contract va certification', group: 'Dasturchi uchun' },
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
    { title: 'Biznesni tanishtiring', description: 'Hisob, biznes profili va qo‘llab-quvvatlash kontaktlari.', complete: signedIn && !!provider?.slug },
    { title: 'API’ni ulang va tekshiring', description: 'Contractni joriy qiling. O‘z serveringizni certification orqali tekshiring.', complete: connected && certified },
    { title: 'Ko‘rib chiqishga yuboring', description: 'Tasdiqlangan integratsiya real mijozlar uchun ochiladi.', complete: active }
  ];
  if (!signedIn) return { steps, label: 'Integratsiyani boshlash', description: 'Biznes hisobini yarating. Docs va namunaviy sandbox hozirdanoq ochiq.', tab: 'onboarding' as WorkspaceTab, step: 1, status: 'Boshlashga tayyor' };
  if (!provider?.slug) return { steps, label: 'Biznes profilini yaratish', description: 'Hisobingiz tayyor. Endi biznes nomi, xizmat turi va kontaktlarni kiriting.', tab: 'onboarding' as WorkspaceTab, step: 3, status: 'Profil kutilmoqda' };
  if (provider.status === 'SUSPENDED' || provider.status === 'DISABLED') return { steps, label: 'Provider holatini ko‘rish', description: 'Provider faol emas. Dashboarddagi holat va ko‘rsatmalarni tekshiring.', tab: 'apps' as WorkspaceTab, step: 4, status: provider.status };
  if (active) return { steps, label: 'Dashboardni ochish', description: 'Buyurtmalar, to‘lov holati va integratsiya salomatligini kuzating.', tab: 'apps' as WorkspaceTab, step: 6, status: 'Faol provider' };
  if (!connected) return { steps, label: 'API manzilini ulash', description: 'Backend HTTPS manzilini va authentication sozlamalarini kiriting.', tab: 'apps' as WorkspaceTab, step: 4, status: 'API kutilmoqda' };
  if (!certified) return { steps, label: 'API tekshiruvini ochish', description: 'Server ulangan. Contractga mosligini certification bilan tekshiring.', tab: 'certification' as WorkspaceTab, step: 5, status: 'Tekshiruv kutilmoqda' };
  return { steps, label: 'Review holatini ko‘rish', description: 'API tekshiruvi o‘tgan. Dashboardda review talablari va nashr holatini ko‘ring.', tab: 'apps' as WorkspaceTab, step: 6, status: provider.metadata?.reviewStatus || 'Review uchun tayyor' };
}
