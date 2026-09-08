import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { App } from '@modelcontextprotocol/ext-apps';
import './choices.css';

type Choice = { id: string; label: string; prompt: string; price?: number; currency?: string; category?: string; disabled?: boolean };
type Choices = { kind: string; title: string; subtitle: string; items: Choice[] };
declare global { interface Window { openai?: { theme?: string; toolResponseMetadata?: any; sendFollowUpMessage?: (args: { prompt: string }) => Promise<unknown> } } }

function TextChoices() {
  const [data, setData] = useState<Choices | null>(null);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState(6);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const appRef = useRef<App | null>(null);
  const locked = useRef(false);

  useEffect(() => {
    const app = new App({ name: 'Zayuno text choices', version: '1.0.0' }, {}, { autoResize: true });
    let active = true;
    const theme = (value?: string) => { if (value) document.documentElement.dataset.theme = value; };
    const accept = (value: any) => {
      const choices = value?._meta?.zayunoChoices || value?.zayunoChoices;
      if (!active || !choices || !Array.isArray(choices.items)) return;
      setData(choices); setCategory(''); setLimit(6); setSelected(''); setStatus('');
    };
    const globals = () => { accept(window.openai?.toolResponseMetadata); theme(window.openai?.theme); };
    app.ontoolresult = accept;
    app.onhostcontextchanged = context => theme(context.theme);
    app.ontoolcancelled = () => { if (active) setStatus('Tanlov bekor qilindi. Chatda davom etishingiz mumkin.'); };
    globals();
    window.addEventListener('openai:set_globals', globals);
    app.connect(undefined, { timeout: 5000 }).then(() => {
      if (!active) return;
      appRef.current = app; theme(app.getHostContext()?.theme); setReady(true);
    }).catch(() => {
      if (!active) return;
      setReady(Boolean(window.openai?.sendFollowUpMessage));
      if (!window.openai?.sendFollowUpMessage) setStatus('Ulanib bo‘lmadi. Tanlovingizni chatga yozishingiz mumkin.');
    });
    return () => { active = false; window.removeEventListener('openai:set_globals', globals); void app.close(); };
  }, []);

  async function choose(item: Choice) {
    if (locked.current || item.disabled) return;
    locked.current = true; setBusy(true); setSelected(item.id); setStatus('Yuborilmoqda…');
    try {
      if (appRef.current) {
        const result = await appRef.current.sendMessage({ role: 'user', content: [{ type: 'text', text: item.prompt }] }, { timeout: 8000 });
        if (result.isError) throw new Error('Message rejected');
      } else if (window.openai?.sendFollowUpMessage) {
        // Compatibility only; never retry a timed-out standard send via another transport.
        let timer: ReturnType<typeof setTimeout>;
        await Promise.race([window.openai.sendFollowUpMessage({ prompt: item.prompt }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout')), 8000); })]).finally(() => clearTimeout(timer));
      } else throw new Error('No host');
      setStatus('Chatga yuborildi');
    } catch {
      setSelected(''); setStatus('Yuborilganini tasdiqlay olmadik. Chatni tekshiring yoki tanlovni yozing.');
    } finally { locked.current = false; setBusy(false); }
  }

  if (!data) return <p className="connection" role="status">{status || 'Tanlovlar tayyorlanmoqda…'}</p>;
  const categories = [...new Set(data.items.map(x => x.category).filter(Boolean))] as string[];
  const items = category ? data.items.filter(x => x.category === category) : data.items;
  return <section aria-label="Zayuno tanlovlari" className="choices">
    <header><p className="eyebrow">ZAYUNO <span>·</span> {data.kind === 'providers' ? 'SERVISLAR' : 'MENYU'}</p><h1>{data.title}</h1><p className="subtitle">{data.subtitle}</p></header>
    {categories.length > 1 && <nav aria-label="Taom kategoriyalari"><Button color="secondary" variant="ghost" className="category" aria-pressed={!category} onClick={() => { setCategory(''); setLimit(6); }}>Barchasi</Button>{categories.map(x => <Button color="secondary" variant="ghost" className="category" key={x} aria-pressed={category === x} onClick={() => { setCategory(x); setLimit(6); }}>{x}</Button>)}</nav>}
    <div className="rows">{items.slice(0, limit).map(item => <Button color="secondary" variant="ghost" pill={false} key={item.id} className="choice" disabled={busy || !ready || item.disabled || selected === item.id} onClick={() => void choose(item)}>
      <span className="row"><span className="arrow" aria-hidden="true">{selected === item.id ? '✓' : '↪'}</span><span className="label">{item.label}</span>{item.disabled ? <span className="price">Hozir yo‘q</span> : typeof item.price === 'number' && <span className="price">{new Intl.NumberFormat('uz-UZ').format(item.price)} {item.currency === 'UZS' ? 'so‘m' : item.currency}</span>}</span>
    </Button>)}</div>
    {!items.length && <p className="empty">Hozircha variantlar topilmadi. Boshqa servisni so‘rab ko‘ring.</p>}
    <footer>{items.length > limit && <Button color="secondary" variant="ghost" className="more" onClick={() => setLimit(limit + 6)}>Yana {Math.min(6, items.length - limit)} ta variant <span aria-hidden="true">↓</span></Button>}<p role="status" aria-live="polite">{status}</p></footer>
  </section>;
}
createRoot(document.getElementById('root')!).render(<TextChoices />);
