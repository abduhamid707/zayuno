import React, { useState, useEffect } from 'react';
import {
  Store,
  RefreshCw,
  ExternalLink,
  Key,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  Eye,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface ConnectorInstanceDto {
  id: string;
  name: string;
  status: string;
  selectedShopId: string | null;
  selectedShopName: string | null;
  totalProducts: number;
  activeProducts: number;
  maskedSecret?: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  nextSyncAt: string | null;
}

interface ShopDto {
  id: string;
  name: string;
  legalName?: string;
  status?: string;
}


interface ConnectorDefinitionDto {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  iconUrl?: string;
  websiteUrl?: string;
  docsUrl?: string;
  authType: string;
  status: string;
}

interface PreviewProduct {
  id: string;
  externalProductId: string;
  title: string;
  basePrice: number;
  currency: string;
  imageUrl?: string | null;
  categoryTitle?: string | null;
  productUrl: string;
  isAvailable: boolean;
  lastSyncedAt: string;
}

export function IntegrationsView({
  providerSlug,
  token,
  apiBaseUrl = ''
}: {
  providerSlug?: string;
  token?: string;
  apiBaseUrl?: string;
}) {
  const [instances, setInstances] = useState<ConnectorInstanceDto[]>([]);
  const [definitions, setDefinitions] = useState<ConnectorDefinitionDto[]>([]);
  const [selectedDefinition, setSelectedDefinition] = useState<ConnectorDefinitionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Connect modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'KEY' | 'SHOPS' | 'SYNCING'>('KEY');
  const [apiKey, setApiKey] = useState('');
  const [availableShops, setAvailableShops] = useState<ShopDto[]>([]);
  const [selectedShop, setSelectedShop] = useState<ShopDto | null>(null);
  const [testAuthLoading, setTestAuthLoading] = useState(false);
  const [testAuthError, setTestAuthError] = useState<string | null>(null);

  // Preview state
  const [previewInstanceId, setPreviewInstanceId] = useState<string | null>(null);
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Search & Compare test state
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const fetchInstances = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances?providerSlug=${providerSlug || ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInstances(Array.isArray(data) ? data : []);
      }
    } catch {
      setErrorMessage('Ulanishlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDefinitions = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/definitions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDefinitions(data);
        }
      }
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    fetchInstances();
    fetchDefinitions();
  }, [providerSlug, token]);

  const handleOpenConnect = (def: ConnectorDefinitionDto) => {
    setSelectedDefinition(def);
    setApiKey('');
    setTestAuthError(null);
    setAvailableShops([]);
    setSelectedShop(null);
    setModalStep('KEY');
    setIsModalOpen(true);
  };

  const handleTestKeyAndLoadShops = async () => {
    const defId = selectedDefinition?.id || 'uzum';
    const defName = selectedDefinition?.name || 'Platforma';
    if (!apiKey.trim()) {
      setTestAuthError(`Iltimos, ${defName} API kalitini kiriting.`);
      return;
    }
    setTestAuthLoading(true);
    setTestAuthError(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/shops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          connectorDefinitionId: defId,
          apiKey: apiKey.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setTestAuthError(data.message || `API kalit tekshiruvdan o‘tmadi. ${defName} kabinetingizdan faol kalitni tekshiring.`);
        return;
      }

      if (!Array.isArray(data) || data.length === 0) {
        setTestAuthError('Ushbu API kalitga biriktirilgan do‘konlar topilmadi.');
        return;
      }

      setAvailableShops(data);
      setSelectedShop(data[0]);
      setModalStep('SHOPS');
    } catch (err: any) {
      setTestAuthError(`${defName} API serveri bilan bog‘lanishda xatolik: ${err.message}`);
    } finally {
      setTestAuthLoading(false);
    }
  };

  const handleCreateInstanceAndImport = async () => {
    if (!selectedShop || !providerSlug) return;
    const defId = selectedDefinition?.id || 'uzum';
    const defName = selectedDefinition?.name || 'Platforma';
    setTestAuthLoading(true);
    setTestAuthError(null);
    setModalStep('SYNCING');

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          providerSlug,
          connectorDefinitionId: defId,
          apiKey: apiKey.trim(),
          shopId: selectedShop.id,
          shopName: selectedShop.name,
          name: `${defName} - ${selectedShop.name}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setTestAuthError(data.message || 'Ulanishni yaratishda xatolik.');
        setModalStep('SHOPS');
        return;
      }

      setSuccessMessage(`"${selectedShop.name}" do‘koni muvaffaqiyatli ulandi! Tovar katalogi import qilinmoqda.`);
      setIsModalOpen(false);
      setApiKey('');
      await fetchInstances();
    } catch (err: any) {
      setTestAuthError(`Xatolik: ${err.message}`);
      setModalStep('SHOPS');
    } finally {
      setTestAuthLoading(false);
    }
  };

  const handleSyncNow = async (instanceId: string) => {
    setActionLoading(instanceId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances/${instanceId}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setErrorMessage(data.message || 'Sinxronlashda xatolik yuz berdi.');
      } else {
        setSuccessMessage(`Sinxronlash yakunlandi! Jami ${data.importedCount} ta mahsulot yangilandi.`);
        await fetchInstances();
      }
    } catch (err: any) {
      setErrorMessage(`Sinxronlash xatosi: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };


  const handleDisconnect = async (instanceId: string) => {
    if (!window.confirm('Haqiqatan ham ushbu do‘kon ulanishini to‘xtatmoqchimisiz? Tovar katalogi AI qidiruvidan yashiriladi.')) {
      return;
    }
    setActionLoading(instanceId);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances/${instanceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMessage('Do‘kon ulanishi to‘xtatildi.');
        await fetchInstances();
      }
    } catch (err: any) {
      setErrorMessage(`Xatolik: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPreview = async (instanceId: string) => {
    setPreviewInstanceId(instanceId);
    setPreviewLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances/${instanceId}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewProducts(data.products || []);
      }
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSearchTest = async () => {
    if (!providerSlug) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/search?provider=${providerSlug}&q=${encodeURIComponent(testSearchQuery)}`, {
        headers: { 'api-key': 'anonymous_or_user' }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  const handleToggleCompareItem = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    } else {
      if (selectedForCompare.length >= 4) {
        alert('Maksimal 4 ta mahsulotni solishtirish mumkin.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleRunCompare = async () => {
    if (selectedForCompare.length < 2) {
      alert('Solishtirish uchun kamida 2 ta mahsulot tanlang.');
      return;
    }
    setCompareLoading(true);
    setComparisonData(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/catalog/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'test'
        },
        body: JSON.stringify({ offeringIds: selectedForCompare })
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      } else {
        const err = await res.json();
        alert(err.message || 'Solishtirishda xatolik.');
      }
    } catch (e: any) {
      alert(`Xatolik: ${e.message}`);
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header Banner */}
      <div style={{ background: 'var(--ws-surface)', border: '1px solid var(--ws-border)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ background: 'var(--ws-brand)', color: '#fff', padding: 8, borderRadius: 8, display: 'flex' }}>
            <Store size={22} />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--ws-text-primary)' }}>
            Tayyor Tizimlarni Ulash (Managed Connectors)
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ws-text-secondary)', lineHeight: 1.6 }}>
          Dasturchi yollamasdan yoki API kod yozmasdan, o‘zingiz ishlatayotgan savdo platformasini Zayunoga ulang.
          Zayuno katalogingizni doimiy yangilab boradi va ChatGPT, Claude hamda mobil ilova foydalanuvchilariga do‘koningizdan tovar xarid qilish imkonini yaratadi.
        </p>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div style={{ background: 'var(--ws-danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ws-danger)' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div style={{ background: 'var(--ws-success-bg)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ws-success)' }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Active Connectors List */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ws-text-primary)' }}>Ulangan do'konlaringiz</h3>
          <button
            onClick={() => {
              const defaultDef = definitions.find(d => d.id === 'uzum') || definitions[0] || null;
              handleOpenConnect(defaultDef);
            }}
            style={{
              background: 'var(--ws-brand)',
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Store size={16} /> Yangi do‘kon ulash
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ws-text-muted)' }}>Yuklanmoqda...</div>
        ) : instances.length === 0 ? (
          <div style={{ background: 'var(--ws-surface)', border: '1px dashed var(--ws-border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <Store size={40} style={{ color: 'var(--ws-text-muted)', marginBottom: 12 }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: 16, color: 'var(--ws-text-primary)' }}>Hozircha hech qanday do'kon ulanmagan</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--ws-text-secondary)' }}>
              Tayyor platforma (masalan Uzum Market) sotuvchilar hisobingizni ulab, tovarlaringizni AI xaridorlariga oching.
            </p>
            <button
              onClick={() => {
                const defaultDef = definitions.find(d => d.id === 'uzum') || definitions[0] || null;
                handleOpenConnect(defaultDef);
              }}
              style={{ background: 'var(--ws-brand)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
            >
              Yangi do‘kon ulash
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {instances.map(inst => (
              <div
                key={inst.id}
                style={{
                  background: 'var(--ws-surface)',
                  border: '1px solid var(--ws-border)',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--ws-text-primary)' }}>
                        {inst.selectedShopName || inst.name}
                      </h4>
                      <span style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 600,
                        background: inst.status === 'CONNECTED' ? 'var(--ws-success-bg)' : inst.status === 'SYNCING' ? 'var(--ws-info-bg)' : 'var(--ws-danger-bg)',
                        color: inst.status === 'CONNECTED' ? 'var(--ws-success)' : inst.status === 'SYNCING' ? 'var(--ws-info)' : 'var(--ws-danger)'
                      }}>
                        {inst.status === 'CONNECTED' ? 'Faol' : inst.status === 'SYNCING' ? 'Sinxronlanmoqda...' : inst.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ws-text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>Platforma: <strong>Uzum Market</strong></span>
                      <span>Do‘kon ID: <code>{inst.selectedShopId || 'N/A'}</code></span>
                      <span>API Kalit: <code>{inst.maskedSecret || '••••••••'}</code></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleOpenPreview(inst.id)}
                      style={{
                        background: 'var(--ws-surface-elevated)',
                        border: '1px solid var(--ws-border)',
                        padding: '7px 12px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        color: 'var(--ws-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Eye size={14} /> Katalog ({inst.totalProducts})
                    </button>
                    <button
                      onClick={() => handleSyncNow(inst.id)}
                      disabled={actionLoading === inst.id}
                      style={{
                        background: 'var(--ws-brand)',
                        color: '#fff',
                        border: 'none',
                        padding: '7px 12px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: actionLoading === inst.id ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <RefreshCw size={14} className={actionLoading === inst.id ? 'animate-spin' : ''} />
                      {actionLoading === inst.id ? 'Yangilanmoqda...' : 'Hozir yangilash'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(inst.id)}
                      style={{
                        background: 'var(--ws-surface-elevated)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: 'var(--ws-danger)',
                        padding: '7px 10px',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                      title="Ulanishni to'xtatish"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--ws-border)', fontSize: 13, color: 'var(--ws-text-muted)' }}>
                  <div>Jami tovarlar: <strong style={{ color: 'var(--ws-text-primary)' }}>{inst.totalProducts}</strong></div>
                  <div>Faol tovarlar: <strong style={{ color: 'var(--ws-success)' }}>{inst.activeProducts}</strong></div>
                  <div>Oxirgi yangilanish: <strong>{inst.lastSyncAt ? new Date(inst.lastSyncAt).toLocaleString() : 'Hali bajarilmagan'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Platforms Showcase */}
      <div style={{ marginBottom: 36 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: 'var(--ws-text-primary)' }}>
          Qo‘llab-quvvatlanadigan platformalar
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {(() => {
            const plannedDefinitions = [
              {
                id: 'billz',
                name: 'Billz POS',
                description: 'Kiyim-kechak, elektronika va butiklar uchun jonli shahar do‘konlari ombor qoldiqlari qidiruvi.',
                status: 'PLANNED'
              },
              {
                id: 'iiko',
                name: 'iiko / Jowi',
                description: 'Restoranlar va kafelar uchun jonli taomlar menyusi, narxlar va stop-list sinxronizatsiyasi.',
                status: 'PLANNED'
              },
              {
                id: 'yclients',
                name: 'YCLIENTS / Dikidi',
                description: 'Go‘zallik salonlari, sartaroshxonalar va klinikalar uchun jonli usta va bandlik (booking) integratsiyasi.',
                status: 'PLANNED'
              }
            ];
            const baseDefinitions = definitions.length > 0 ? definitions : [
              {
                id: 'uzum',
                name: 'Uzum Market',
                description: 'Marketpleys sotuvchilari uchun API kalit orqali tovarlar, narxlar va qoldiqlarni avtomatik sinxronlash.',
                status: 'ACTIVE',
                docsUrl: 'https://seller.uzum.uz/seller/api-keys'
              },
              {
                id: 'synthetic-test',
                name: 'Synthetic Retail',
                description: 'Universal connector sinovi va lokal katalog simulatsiyasi uchun sinov ulagichi.',
                status: 'ACTIVE'
              }
            ];
            const allDefs = [
              ...baseDefinitions,
              ...plannedDefinitions.filter(p => !baseDefinitions.some(d => d.id === p.id))
            ];

            return allDefs.map(def => {
              const isActive = def.status === 'ACTIVE' || (!def.status && (def.id === 'uzum' || def.id === 'synthetic-test'));
              return (
                <div
                  key={def.id}
                  style={{
                    border: isActive ? '2px solid var(--ws-brand)' : '1px solid var(--ws-border)',
                    borderRadius: 10,
                    padding: 16,
                    background: isActive ? 'var(--ws-surface-elevated)' : 'var(--ws-surface)',
                    opacity: isActive ? 1 : 0.85,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: isActive ? 'var(--ws-text-primary)' : 'var(--ws-text-secondary)' }}>{def.name}</span>
                      <span
                        style={{
                          background: isActive ? 'var(--ws-success-bg)' : 'var(--ws-surface-hover)',
                          color: isActive ? 'var(--ws-success)' : 'var(--ws-text-muted)',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        {isActive ? 'FAOL' : def.status === 'BETA' ? 'BETA' : 'REJADA'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 14px 0', fontSize: 13, color: isActive ? 'var(--ws-text-secondary)' : 'var(--ws-text-muted)', lineHeight: 1.5 }}>
                      {def.description}
                    </p>
                  </div>
                  {isActive ? (
                    <button
                      onClick={() => handleOpenConnect(def as any)}
                      style={{
                        width: '100%',
                        background: 'var(--ws-brand)',
                        color: '#fff',
                        border: 'none',
                        padding: '7px 0',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Ulash
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ws-text-muted)', padding: '6px 0', background: 'var(--ws-surface)', borderRadius: 6, fontWeight: 500 }}>
                      Tez kunda qo'shiladi
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Catalog Preview Modal */}
      {previewInstanceId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--ws-surface-elevated)', borderRadius: 12, width: '90%', maxWidth: 850, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--ws-text-primary)' }}>Import qilingan tovarlar (Preview)</h3>
              <button onClick={() => setPreviewInstanceId(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ws-text-secondary)' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {previewLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ws-text-secondary)' }}>Tovarlar yuklanmoqda...</div>
              ) : previewProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ws-text-muted)' }}>Ushbu do'konda tovarlar mavjud emas yoki hali import qilinmagan.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {previewProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--ws-border)', padding: 12, borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, background: 'var(--ws-surface-hover)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ws-text-muted)' }}>
                            <Store size={20} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ws-text-primary)' }}>{p.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--ws-text-muted)' }}>
                            Kategoriya: {p.categoryTitle || 'Boshqa'} · Narxi: <strong>{p.basePrice.toLocaleString()} {p.currency}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => handleToggleCompareItem(p.id)}
                          style={{
                            background: selectedForCompare.includes(p.id) ? 'var(--ws-brand)' : 'var(--ws-surface-hover)',
                            color: selectedForCompare.includes(p.id) ? '#fff' : 'var(--ws-text-secondary)',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {selectedForCompare.includes(p.id) ? '✓ Tanlangan' : '+ Solishtirish'}
                        </button>
                        <a
                          href={p.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#7000ff',
                            color: '#fff',
                            textDecoration: 'none',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          Uzumda ko'rish <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedForCompare.length >= 2 && (
              <div style={{ padding: 12, background: 'var(--ws-surface)', borderTop: '1px solid var(--ws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--ws-text-primary)' }}>
                  <strong>{selectedForCompare.length} ta</strong> mahsulot solishtirish uchun tanlandi
                </span>
                <button
                  onClick={handleRunCompare}
                  disabled={compareLoading}
                  style={{ background: 'var(--ws-brand)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {compareLoading ? 'Solishtirilmoqda...' : 'Solishtirish matritsasini ochish'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {comparisonData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--ws-surface-elevated)', borderRadius: 12, width: '90%', maxWidth: 850, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--ws-text-primary)' }}>Mahsulotlarni Solishtirish (Compare)</h3>
              <button onClick={() => setComparisonData(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ws-text-secondary)' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--ws-border)' }}>
                    <th style={{ padding: 10, textAlign: 'left', width: '25%', color: 'var(--ws-text-secondary)' }}>Xususiyat</th>
                    {comparisonData.items.map((it: any) => (
                      <th key={it.offeringId} style={{ padding: 10, textAlign: 'left', width: `${75 / comparisonData.items.length}%` }}>
                        {it.imageUrl && <img src={it.imageUrl} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />}
                        <div style={{ fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: 4 }}>{it.title}</div>
                        <div style={{ color: 'var(--ws-brand-light)', fontWeight: 700, fontSize: 14 }}>{it.basePrice.toLocaleString()} {it.currency}</div>
                        <a href={it.productUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#7000ff', fontSize: 12, marginTop: 4, fontWeight: 600, textDecoration: 'none' }}>
                          Uzumda ochish <ExternalLink size={11} />
                        </a>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.attributes.map((attr: any) => (
                    <tr key={attr.name} style={{ borderBottom: '1px solid var(--ws-border)' }}>
                      <td style={{ padding: 10, fontWeight: 600, color: 'var(--ws-text-secondary)' }}>{attr.name}</td>
                      {comparisonData.items.map((it: any) => (
                        <td key={it.offeringId} style={{ padding: 10, color: attr.values[it.offeringId] === 'Ma\'lumot yo\'q' ? 'var(--ws-text-muted)' : 'var(--ws-text-primary)' }}>
                          {attr.values[it.offeringId] || 'Ma\'lumot yo\'q'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 20, padding: 12, background: 'var(--ws-surface)', borderRadius: 8, fontSize: 12, color: 'var(--ws-text-muted)' }}>
                {comparisonData.notice}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--ws-surface-elevated)', borderRadius: 12, width: '90%', maxWidth: 500, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--ws-text-primary)' }}>
                {selectedDefinition ? `${selectedDefinition.name}'ni ulash` : 'Platformani ulash'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ws-text-secondary)' }}>×</button>
            </div>

            <div style={{ padding: 20 }}>
              {modalStep === 'KEY' && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: 'var(--ws-text-primary)' }}>
                    {selectedDefinition ? `${selectedDefinition.name} Maxfiy Kaliti (API Key)` : 'Maxfiy Kalit (API Key)'}
                  </label>
                  <input
                    type="password"
                    placeholder="Masalan: 3foSyaevUybDp+t1tu..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--ws-border)', borderRadius: 6, fontSize: 14, marginBottom: 10, boxSizing: 'border-box', background: 'var(--ws-surface)', color: 'var(--ws-text-primary)' }}
                  />
                  {selectedDefinition?.docsUrl ? (
                    <div style={{ fontSize: 12, color: 'var(--ws-text-muted)', lineHeight: 1.5, background: 'var(--ws-surface)', padding: 10, borderRadius: 6, marginBottom: 16 }}>
                      API kalitni qayerdan olasiz? {selectedDefinition.name} kabinetingizga kiring:{' '}
                      <a href={selectedDefinition.docsUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ws-brand-light)', fontWeight: 600 }}>
                        {selectedDefinition.docsUrl.replace(/^https?:\/\//, '')}
                      </a>{' '}
                      va "Kalitni yaratish" orqali nusxalang.
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--ws-text-muted)', lineHeight: 1.5, background: 'var(--ws-surface)', padding: 10, borderRadius: 6, marginBottom: 16 }}>
                      {selectedDefinition?.name || 'Platforma'} tizimidagi API kaliti yoki integratsiya tokenini kiriting.
                    </div>
                  )}

                  {testAuthError && (
                    <div style={{ background: 'var(--ws-danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 13, color: 'var(--ws-danger)' }}>
                      {testAuthError}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={() => setIsModalOpen(false)} style={{ background: 'var(--ws-surface-hover)', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 500, color: 'var(--ws-text-secondary)' }}>
                      Bekor qilish
                    </button>
                    <button
                      onClick={handleTestKeyAndLoadShops}
                      disabled={testAuthLoading}
                      style={{ background: 'var(--ws-brand)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: testAuthLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                    >
                      {testAuthLoading ? 'Tekshirilmoqda...' : 'Davom etish →'}
                    </button>
                  </div>
                </div>
              )}

              {modalStep === 'SHOPS' && (
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 15, color: 'var(--ws-text-primary)' }}>Ulanadigan do'konni tanlang:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {availableShops.map(shop => (
                      <label
                        key={shop.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: 12,
                          border: selectedShop?.id === shop.id ? '2px solid var(--ws-brand)' : '1px solid var(--ws-border)',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: selectedShop?.id === shop.id ? 'var(--ws-brand-glow)' : 'var(--ws-surface)'
                        }}
                      >
                        <input
                          type="radio"
                          name="shop"
                          checked={selectedShop?.id === shop.id}
                          onChange={() => setSelectedShop(shop)}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ws-text-primary)' }}>{shop.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ws-text-muted)' }}>Do'kon ID: {shop.id}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {testAuthError && (
                    <div style={{ background: 'var(--ws-danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 13, color: 'var(--ws-danger)' }}>
                      {testAuthError}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={() => setModalStep('KEY')} style={{ background: 'var(--ws-surface-hover)', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', color: 'var(--ws-text-secondary)' }}>
                      ← Orqaga
                    </button>
                    <button
                      onClick={handleCreateInstanceAndImport}
                      disabled={testAuthLoading || !selectedShop}
                      style={{ background: 'var(--ws-brand)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                    >
                      {testAuthLoading ? 'Ulanmoqda...' : 'Do\u2018konni ulash va Import qilish'}
                    </button>
                  </div>
                </div>
              )}

              {modalStep === 'SYNCING' && (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--ws-brand)', marginBottom: 14 }} />
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: 'var(--ws-text-primary)' }}>Do'kon ulanmoqda va katalog import qilinmoqda</h4>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ws-text-muted)' }}>
                    Bu jarayon bir necha soniya vaqt oladi. Barcha faol mahsulotlar avtomatik tarzda Zayunoga yuklanadi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
