import React, { useState, useEffect, useRef } from 'react';
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
import { connectorStatus, createRequestGate, formatSyncTime, integrationsUrl } from './integrations-model';
import './integrations.css';

interface ConnectorInstanceDto {
  id: string;
  connectorDefinitionId: string;
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
  autoSyncEnabled?: boolean;
  syncIntervalHours?: number;
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

const PLANNED_DEFINITIONS = [
  { id: 'billz', name: 'Billz POS', description: 'Do‘kon tovarlari va qoldiqlarini ulash.' },
  { id: 'iiko', name: 'iiko / Jowi', description: 'Restoran menyusi va narxlarini ulash.' },
  { id: 'yclients', name: 'YCLIENTS / Dikidi', description: 'Xizmatlar va bo‘sh vaqtlarni ulash.' }
];

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
  const [definitionsLoading, setDefinitionsLoading] = useState(true);
  const [definitionsError, setDefinitionsError] = useState<string | null>(null);
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
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewTotal, setPreviewTotal] = useState(0);

  // Search & Compare test state
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const requestGate = useRef(createRequestGate()).current;

  const activeDefinitions = definitions.filter(def => def.status === 'ACTIVE' && def.id !== 'synthetic-test');
  const platformName = (definitionId: string) =>
    definitions.find(def => def.id === definitionId)?.name ||
    (definitionId === 'uzum' ? 'Uzum Market' : definitionId === 'synthetic-test' ? 'Ichki sinov do‘koni' : definitionId);

  const readError = async (res: Response, fallback: string) => {
    const data = await res.json().catch(() => null);
    if (res.status === 409) return 'Bu amal allaqachon bajarilmoqda. Natijani kuting.';
    if (res.status === 401) return 'Sessiya tugagan. Qayta kiring.';
    return data?.message || fallback;
  };

  const fetchInstances = async (silent = false) => {
    if (!token || !providerSlug) {
      setLoading(false);
      setInstances([]);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances?providerSlug=${providerSlug || ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Ulanishlarni yuklab bo‘lmadi.');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Ulanishlar javobi noto‘g‘ri.');
      setInstances(data);
    } catch {
      setErrorMessage('Ulanishlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDefinitions = async () => {
    setDefinitionsLoading(true);
    setDefinitionsError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/definitions`);
      if (!res.ok) throw new Error('Platformalarni yuklab bo‘lmadi.');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Platformalar javobi noto‘g‘ri.');
      setDefinitions(data);
    } catch {
      setDefinitions([]);
      setDefinitionsError('Platformalar yuklanmadi. Qayta urinib ko‘ring.');
    } finally {
      setDefinitionsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
    fetchDefinitions();
  }, [providerSlug, token]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void fetchInstances(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [providerSlug, token, apiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const normalized = integrationsUrl(window.location.href, providerSlug);
    if (normalized.href !== window.location.href) {
      window.history.replaceState(window.history.state, '', normalized.href);
    }
  }, [providerSlug]);

  const handleOpenConnect = (def: ConnectorDefinitionDto | null) => {
    if (!def) {
      setErrorMessage('Hozircha ulash mumkin bo‘lgan platforma topilmadi.');
      return;
    }
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
    if (!requestGate.enter('connect')) return;
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

      if (!res.ok) {
        setTestAuthError(await readError(res, `API kalit tekshiruvdan o‘tmadi. ${defName} kabinetingizdan faol kalitni tekshiring.`));
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setTestAuthError('Ushbu API kalitga biriktirilgan do‘konlar topilmadi.');
        return;
      }

      setAvailableShops(data);
      setSelectedShop(data.find((shop: ShopDto) => !instances.some(inst =>
        inst.connectorDefinitionId === defId &&
        inst.selectedShopId === shop.id &&
        inst.status !== 'DISCONNECTED'
      )) || null);
      setModalStep('SHOPS');
    } catch (err: any) {
      setTestAuthError(`${defName} API serveri bilan bog‘lanishda xatolik: ${err.message}`);
    } finally {
      requestGate.leave('connect');
      setTestAuthLoading(false);
    }
  };

  const handleCreateInstanceAndImport = async () => {
    if (!selectedShop || !providerSlug) return;
    if (!requestGate.enter('connect')) return;
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

      if (!res.ok) {
        setTestAuthError(await readError(res, 'Ulanishni yaratishda xatolik.'));
        setModalStep('SHOPS');
        return;
      }

      const data = await res.json();
      if (!data?.id) {
        setTestAuthError('Ulanish server tomonidan tasdiqlanmadi. Qayta urinib ko‘ring.');
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
      requestGate.leave('connect');
      setTestAuthLoading(false);
    }
  };

  const handleSyncNow = async (instanceId: string) => {
    if (!requestGate.enter(instanceId)) return;
    setActionLoading(instanceId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances/${instanceId}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setErrorMessage(await readError(res, 'Yangilashda xatolik yuz berdi.'));
      } else {
        const data = await res.json();
        if (data.success !== true || !Number.isFinite(data.importedCount)) {
          setErrorMessage('Yangilash natijasi tasdiqlanmadi. Ro‘yxatni qayta yuklab tekshiring.');
          return;
        }
        setSuccessMessage(`Sinxronlash yakunlandi! Jami ${data.importedCount} ta mahsulot yangilandi.`);
        await fetchInstances();
      }
    } catch (err: any) {
      setErrorMessage(`Sinxronlash xatosi: ${err.message}`);
    } finally {
      requestGate.leave(instanceId);
      setActionLoading(null);
    }
  };


  const handleDisconnect = async (instanceId: string) => {
    if (!window.confirm('Haqiqatan ham ushbu do‘kon ulanishini to‘xtatmoqchimisiz? Tovar katalogi AI qidiruvidan yashiriladi.')) {
      return;
    }
    if (!requestGate.enter(instanceId)) return;
    setActionLoading(instanceId);
    setErrorMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances/${instanceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMessage('Do‘kon ulanishi to‘xtatildi.');
        await fetchInstances();
      } else {
        setErrorMessage(await readError(res, 'Ulanishni uzib bo‘lmadi.'));
      }
    } catch (err: any) {
      setErrorMessage(`Xatolik: ${err.message}`);
    } finally {
      requestGate.leave(instanceId);
      setActionLoading(null);
    }
  };

  const handleOpenPreview = async (instanceId: string) => {
    setPreviewInstanceId(instanceId);
    setPreviewProducts([]);
    setPreviewTotal(0);
    setPreviewError(null);
    setSelectedForCompare([]);
    setComparisonData(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/instances/${instanceId}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data.products) || !Number.isFinite(data.totalCount)) {
          setPreviewError('Katalog serverdan noto‘g‘ri formatda qaytdi.');
        } else {
          setPreviewProducts(data.products);
          setPreviewTotal(data.totalCount);
        }
      } else {
        setPreviewError(await readError(res, 'Katalogni yuklab bo‘lmadi.'));
      }
    } catch {
      setPreviewError('Katalogni yuklab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSearchTest = async () => {
    if (!providerSlug) return;
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBaseUrl}/api/v1/search?provider=${providerSlug}&q=${encodeURIComponent(testSearchQuery)}`, {
        headers
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
    if (!requestGate.enter('compare')) return;
    setCompareLoading(true);
    setComparisonData(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBaseUrl}/api/v1/catalog/compare`, {
        method: 'POST',
        headers,
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
      requestGate.leave('compare');
      setCompareLoading(false);
    }
  };

  return (
    <div className="integrations-view" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header Banner */}
      <div className="ig-intro" style={{ background: 'var(--ws-surface)', border: '1px solid var(--ws-border)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ background: 'var(--ws-brand)', color: '#fff', padding: 8, borderRadius: 8, display: 'flex' }}>
            <Store size={22} />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--ws-text-primary)' }}>
            Savdo platformangizni ulang
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ws-text-secondary)', lineHeight: 1.6 }}>
          Do‘koningiz katalogi va narxlarini Zayunoga yuklang. Xaridorlar tovarning platformadagi sahifasiga o‘tishi mumkin.
        </p>
        {providerSlug && <p className="ig-provider-context">Boshqarilayotgan hisob: <strong>{providerSlug}</strong></p>}
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
        <div className="ig-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ws-text-primary)' }}>Ulangan do'konlaringiz</h3>
          <button
            disabled={!token || !providerSlug || activeDefinitions.length === 0}
            onClick={() => {
              const defaultDef = activeDefinitions.find(d => d.id === 'uzum') || activeDefinitions[0] || null;
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
              disabled={!token || !providerSlug || activeDefinitions.length === 0}
              onClick={() => {
              const defaultDef = activeDefinitions.find(d => d.id === 'uzum') || activeDefinitions[0] || null;
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
                className="ig-instance"
                style={{
                  background: 'var(--ws-surface)',
                  border: '1px solid var(--ws-border)',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div className="ig-instance-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div className="ig-instance-info">
                    <div className="ig-instance-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
                        {connectorStatus(inst.status)}
                      </span>
                    </div>
                    <div className="ig-metadata" style={{ fontSize: 13, color: 'var(--ws-text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>Platforma: <strong>{platformName(inst.connectorDefinitionId)}</strong></span>
                      <span>Do‘kon ID: <code>{inst.selectedShopId || 'N/A'}</code></span>
                    </div>
                  </div>

                  <div className="ig-actions" style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleOpenPreview(inst.id)}
                      disabled={inst.status === 'DISCONNECTED'}
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
                      <Eye size={14} /> {inst.lastSyncAt ? `Katalog (${inst.totalProducts})` : 'Katalog'}
                    </button>
                    <button
                      onClick={() => handleSyncNow(inst.id)}
                      disabled={actionLoading === inst.id || inst.status === 'SYNCING' || inst.status === 'DISCONNECTED'}
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
                      title="Ulanishni uzish"
                      aria-label={`${inst.selectedShopName || inst.name} ulanishini uzish`}
                      disabled={actionLoading === inst.id || inst.status === 'DISCONNECTED'}
                    >
                      <Trash2 size={14} /><span>Ulanishni uzish</span>
                    </button>
                  </div>
                </div>

                <div className="ig-stats" style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--ws-border)', fontSize: 13, color: 'var(--ws-text-muted)' }}>
                  <div><span>Jami tovarlar</span><strong style={{ color: 'var(--ws-text-primary)' }}>{inst.lastSyncAt ? inst.totalProducts : 'Kutilmoqda'}</strong></div>
                  <div><span>Sotuvda mavjud</span><strong style={{ color: 'var(--ws-success)' }}>{inst.lastSyncAt ? inst.activeProducts : 'Kutilmoqda'}</strong></div>
                  <div><span>Oxirgi muvaffaqiyatli yangilanish</span><strong>{formatSyncTime(inst.lastSyncAt)}</strong></div>
                </div>
                {!inst.lastSyncAt && inst.status !== 'ERROR' && inst.status !== 'DISCONNECTED' && <p className="ig-state-note">Katalog birinchi marta yuklanmoqda. Natija avtomatik ko‘rinadi.</p>}
                {(inst.status === 'ERROR' || inst.lastSyncStatus === 'FAILED') && <p className="ig-state-note ig-state-error">Oxirgi yangilash bajarilmadi. {inst.lastSyncAt ? 'Oldingi katalog saqlangan.' : 'Katalog hali yuklanmagan.'}</p>}
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
        {definitionsLoading && <p className="ig-state-note" role="status">Platformalar yuklanmoqda…</p>}
        {definitionsError && <p className="ig-state-note ig-state-error" role="alert">{definitionsError}</p>}
        {!definitionsLoading && !definitionsError && activeDefinitions.length === 0 && <p className="ig-state-note">Hozircha ulash mumkin bo‘lgan platforma yo‘q.</p>}
        <div className="ig-platform-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {activeDefinitions.map(def => (
                <div
                  key={def.id}
                  style={{
                    border: '2px solid var(--ws-brand)',
                    borderRadius: 10,
                    padding: 16,
                    background: 'var(--ws-surface-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ws-text-primary)' }}>{def.name}</span>
                      <span
                        style={{
                          background: 'var(--ws-success-bg)',
                          color: 'var(--ws-success)',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        ULASH MUMKIN
                      </span>
                    </div>
                    <p style={{ margin: '0 0 14px 0', fontSize: 13, color: 'var(--ws-text-secondary)', lineHeight: 1.5 }}>
                      {def.id === 'uzum' ? 'Uzum do‘konidagi tovarlar va narxlarni API kaliti orqali yuklang.' : def.description}
                    </p>
                  </div>
                  <button
                      disabled={!token || !providerSlug}
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
                </div>
          ))}
        </div>
        <h3 className="ig-planned-heading" style={{ margin: '28px 0 16px', fontSize: 18, fontWeight: 600, color: 'var(--ws-text-primary)' }}>Rejadagi platformalar</h3>
        <div className="ig-platform-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {PLANNED_DEFINITIONS.filter(planned => !activeDefinitions.some(def => def.id === planned.id)).map(def => (
            <div key={def.id} style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 16, background: 'var(--ws-surface)', opacity: .85 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ws-text-secondary)' }}>{def.name}</span>
                <span style={{ background: 'var(--ws-surface-hover)', color: 'var(--ws-text-muted)', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>REJADA</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ws-text-muted)', lineHeight: 1.5 }}>{def.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Catalog Preview Modal */}
      {previewInstanceId && (
        <div className="ig-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="ig-modal ig-modal-wide" style={{ background: 'var(--ws-surface-elevated)', borderRadius: 12, width: '90%', maxWidth: 850, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--ws-text-primary)' }}>Do‘kon katalogi</h3>
              <button onClick={() => setPreviewInstanceId(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ws-text-secondary)' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {previewLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ws-text-secondary)' }}>Tovarlar yuklanmoqda...</div>
              ) : previewError ? (
                <div className="ig-state-note ig-state-error" role="alert">{previewError}</div>
              ) : previewProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ws-text-muted)' }}>Katalog bo‘sh yoki birinchi yuklanish hali tugamagan.</div>
              ) : (
                <><p className="ig-preview-count">{previewProducts.length} / {previewTotal} ta tovar ko‘rsatilmoqda{previewTotal > previewProducts.length ? ' (dastlabki 50 ta)' : ''}.</p><div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {previewProducts.map(p => (
                    <div className="ig-product" key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--ws-border)', padding: 12, borderRadius: 8 }}>
                      <div className="ig-product-info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

                      <div className="ig-product-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                          Platformada ko‘rish <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div></>
              )}
            </div>

            {selectedForCompare.length >= 2 && (
              <div className="ig-compare-bar" style={{ padding: 12, background: 'var(--ws-surface)', borderTop: '1px solid var(--ws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <div className="ig-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="ig-modal ig-modal-wide" style={{ background: 'var(--ws-surface-elevated)', borderRadius: 12, width: '90%', maxWidth: 850, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--ws-text-primary)' }}>Tovarlarni solishtirish</h3>
              <button onClick={() => setComparisonData(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ws-text-secondary)' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div className="ig-table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
              </table></div>

              <div style={{ marginTop: 20, padding: 12, background: 'var(--ws-surface)', borderRadius: 8, fontSize: 12, color: 'var(--ws-text-muted)' }}>
                {comparisonData.notice}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {isModalOpen && (
        <div className="ig-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="ig-modal" style={{ background: 'var(--ws-surface-elevated)', borderRadius: 12, width: '90%', maxWidth: 500, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--ws-text-primary)' }}>
                {selectedDefinition ? `${selectedDefinition.name}'ni ulash` : 'Platformani ulash'}
              </h3>
              <button aria-label="Yopish" disabled={testAuthLoading} onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ws-text-secondary)' }}>×</button>
            </div>

            <div style={{ padding: 20 }}>
              {modalStep === 'KEY' && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: 'var(--ws-text-primary)' }}>
                    {selectedDefinition ? `${selectedDefinition.name} Maxfiy Kaliti (API Key)` : 'Maxfiy Kalit (API Key)'}
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
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

                  <div className="ig-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
                          disabled={instances.some(inst => inst.connectorDefinitionId === selectedDefinition?.id && inst.selectedShopId === shop.id && inst.status !== 'DISCONNECTED')}
                          onChange={() => setSelectedShop(shop)}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ws-text-primary)' }}>{shop.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ws-text-muted)' }}>Do'kon ID: {shop.id}{instances.some(inst => inst.connectorDefinitionId === selectedDefinition?.id && inst.selectedShopId === shop.id && inst.status !== 'DISCONNECTED') ? ' · Allaqachon ulangan' : ''}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {testAuthError && (
                    <div style={{ background: 'var(--ws-danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 13, color: 'var(--ws-danger)' }}>
                      {testAuthError}
                    </div>
                  )}

                  <div className="ig-form-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
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
