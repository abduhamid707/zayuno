(() => {
  'use strict';

  const bridge = window.ZayunoBridge;
  const config = window.ZAYUNO_UI_CONFIG || {};
  const state = {
    offerings: [],
    categories: [],
    providerSlug: '',
    locationId: '',
    category: 'ALL',
    search: '',
    cart: [],
    selected: null,
    selectedVariant: null,
    selectedOptions: {},
    quantity: 1,
    modal: null,
    quote: null,
    action: null,
    paymentOptions: [],
    busy: false,
    loading: true,
    error: '',
    connection: false,
    form: { name: '', phone: '', address: '', fulfillmentType: 'STANDARD' },
    parameters: {},
    idempotencyKey: null,
    lastFocus: null
  };

  const app = () => document.getElementById('app');
  const cssEscape = (value) => globalThis.CSS?.escape ? globalThis.CSS.escape(String(value)) : String(value).replace(/(["\\])/g, '\\$1');
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const money = (value, currency = 'UZS') => {
    const amount = Number(value || 0);
    const label = currency === 'UZS' || !currency ? 'so‘m' : String(currency);
    return `${Number.isFinite(amount) ? amount.toLocaleString('uz-UZ') : '—'} ${esc(label)}`;
  };
  const titleOf = (item) => item?.name || item?.title || 'Nomsiz taklif';
  const priceOf = (item) => Number(item?.price ?? item?.basePrice ?? 0);
  const categoryOf = (item) => item?.categorySlug || item?.category || '';
  const icon = (name) => ({ search: '⌕', cart: '🛒', close: '×', check: '✓', arrow: '→', plus: '+', minus: '−', refresh: '↻', expand: '↗' }[name] || '•');
  const logo = () => config.logoSvg || '<span class="brand-logo">Z</span>';
  const selectedOptionsArray = () => Object.values(state.selectedOptions).flat().filter(Boolean);
  const optionPayload = (options) => (options || []).map((option) => ({ groupId: option.groupId, optionId: option.id || option.optionId, quantity: option.quantity || 1 }));
  const uuid = () => globalThis.crypto?.randomUUID?.() || `zy-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function notify(message, error = false) {
    state.error = error ? String(message || 'Amalni bajarib bo‘lmadi.') : '';
    render();
  }

  function snapshot() {
    return {
      providerSlug: state.providerSlug,
      locationId: state.locationId,
      cart: state.cart,
      form: state.form,
      parameters: state.parameters
    };
  }

  function saveState() {
    bridge?.save?.(snapshot(), {
      providerSlug: state.providerSlug,
      cart: state.cart.map((line) => ({ offeringId: line.offeringId, quantity: line.quantity }))
    });
  }

  function restoreState() {
    const restored = bridge?.restore?.() || {};
    if (restored.providerSlug) state.providerSlug = String(restored.providerSlug);
    if (restored.locationId) state.locationId = String(restored.locationId);
    if (Array.isArray(restored.cart)) state.cart = restored.cart.filter((line) => line?.offeringId && Number(line.quantity) > 0).map((line) => ({
      ...line,
      quantity: Math.max(1, Number(line.quantity) || 1),
      selectedOptions: Array.isArray(line.selectedOptions) ? line.selectedOptions : []
    }));
    if (restored.form && typeof restored.form === 'object') state.form = { ...state.form, ...restored.form };
    if (restored.parameters && typeof restored.parameters === 'object') state.parameters = { ...restored.parameters };
  }

  function decodeOutput(raw) {
    try { return bridge?.decode ? bridge.decode(raw) : (raw || {}); } catch (error) { throw error; }
  }

  function isQuote(data) {
    return Boolean(data && Array.isArray(data.lines) && (data.id || data.quoteId) && data.total !== undefined && data.expiresAt);
  }

  function isAction(data) {
    return Boolean(data && (data.actionId || data.publicId) && (data.status || data.paymentStatus || data.checkoutUrl || data.paymentUrl || data.nextAction));
  }

  function applyOutput(raw) {
    const data = decodeOutput(raw);
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data.offerings)) state.offerings = data.offerings;
    if (Array.isArray(data.categories)) state.categories = data.categories;
    if (data.providerSlug) state.providerSlug = String(data.providerSlug);
    if (data.locationId) state.locationId = String(data.locationId);
    if (data.parametersSchema) state.parametersSchema = data.parametersSchema;
    if (isQuote(data)) {
      state.quote = { ...data, receivedAt: Date.now() };
      state.action = null;
      state.paymentOptions = [];
      state.error = '';
    }
    if (isAction(data)) {
      state.action = {
        ...(state.action || {}),
        ...data,
        checkoutUrl: data.checkoutUrl || data.paymentUrl || data.nextAction?.url || state.action?.checkoutUrl
      };
      if (Array.isArray(data.paymentOptions)) state.paymentOptions = data.paymentOptions;
      state.error = '';
    }
    if (Array.isArray(data.paymentOptions)) state.paymentOptions = data.paymentOptions;
    state.loading = false;
    render();
    saveState();
    return data;
  }

  function handleToolInput(input) {
    if (!input || typeof input !== 'object') return;
    if (input.providerSlug) state.providerSlug = String(input.providerSlug);
    if (input.locationId) state.locationId = String(input.locationId);
    if (input.parameters && typeof input.parameters === 'object') state.parameters = { ...state.parameters, ...input.parameters };
    render();
  }

  function handleContext(context) {
    state.connection = Boolean(context?.connected) || bridge?.isConnected?.() === true;
    render();
  }

  function initialHostOutput() {
    try {
      const input = window.openai?.toolInput;
      handleToolInput(input);
      if (window.openai?.toolOutput) applyOutput(window.openai.toolOutput);
    } catch (error) { state.error = error.message || 'Katalogni yuklab bo‘lmadi.'; }
  }

  function imageUrl(item) {
    const media = Array.isArray(item?.media) ? [...item.media].sort((a, b) => (a.order || 0) - (b.order || 0))[0] : null;
    const candidate = media?.url || item?.imageUrl;
    if (!candidate) return null;
    try {
      const url = new URL(candidate);
      const allowed = (config.imageOrigins || []).some((origin) => url.origin === origin);
      if (url.protocol !== 'https:' || !allowed) return null;
      return { url: url.href, alt: media?.altText || titleOf(item) };
    } catch { return null; }
  }

  function visual(item, detail = false) {
    const image = imageUrl(item);
    if (image) return `<img src="${esc(image.url)}" alt="${esc(image.alt)}" loading="${detail ? 'eager' : 'lazy'}" />`;
    return `<div class="placeholder" aria-hidden="true">${esc(item?.emoji || '✦')}</div><span class="photo-missing">Rasm provider tomonidan berilmagan</span>`;
  }

  function categories() {
    const values = [...state.categories.map((category) => category.slug || category.id || category.name), ...state.offerings.map(categoryOf)]
      .filter(Boolean).filter((value, index, all) => all.indexOf(value) === index);
    return ['ALL', ...values];
  }

  function visibleOfferings() {
    const query = state.search.trim().toLocaleLowerCase();
    return state.offerings.filter((item) => {
      const inCategory = state.category === 'ALL' || categoryOf(item) === state.category;
      const searchable = `${titleOf(item)} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLocaleLowerCase();
      return inCategory && (!query || searchable.includes(query));
    });
  }

  function selectedVariant(item) {
    return state.selectedVariant || (item?.variants || []).find((variant) => variant.isAvailable !== false) || null;
  }

  function configuredPrice(item) {
    const base = selectedVariant(item)?.basePrice ?? priceOf(item);
    const modifiers = selectedOptionsArray().reduce((sum, option) => sum + Number(option.priceDelta || 0), 0);
    return Number(base) + modifiers;
  }

  function openOffering(item) {
    state.selected = item;
    state.selectedVariant = (item.variants || []).find((variant) => variant.isAvailable !== false) || null;
    state.selectedOptions = {};
    for (const group of item.optionGroups || []) {
      const defaults = (group.options || []).filter((option) => option.isAvailable !== false && option.isDefault);
      if (defaults.length) state.selectedOptions[group.id] = defaults;
    }
    state.quantity = 1;
    state.modal = 'detail';
    state.error = '';
    render();
  }

  function toggleOption(group, option) {
    const current = state.selectedOptions[group.id] || [];
    const max = Number(group.maxSelections || 1);
    const has = current.some((item) => item.id === option.id);
    if (has) state.selectedOptions[group.id] = current.filter((item) => item.id !== option.id);
    else if (max <= 1) state.selectedOptions[group.id] = [option];
    else if (current.length < max) state.selectedOptions[group.id] = [...current, option];
    else state.error = `“${group.name || 'Variant'}” uchun ko‘pi bilan ${max} ta tanlov mumkin.`;
    render();
  }

  function parametersSchema(item) {
    return item?.parametersSchema || state.parametersSchema || null;
  }

  function parameterValue(name, property) {
    if (state.parameters[name] !== undefined) return state.parameters[name];
    if (property?.default !== undefined) return property.default;
    return '';
  }

  function parameterFields(item) {
    const schema = parametersSchema(item);
    const properties = schema?.properties || {};
    const required = new Set(schema?.required || []);
    return Object.entries(properties).map(([name, property]) => {
      const value = parameterValue(name, property);
      const label = property.title || name;
      const requiredMark = required.has(name) ? ' *' : '';
      if (Array.isArray(property.enum)) return `<div class="field"><label>${esc(label)}${requiredMark}</label><select data-param="${esc(name)}"><option value="">Tanlang…</option>${property.enum.map((option) => `<option value="${esc(String(option))}" ${String(value) === String(option) ? 'selected' : ''}>${esc(String(option))}</option>`).join('')}</select></div>`;
      if (property.type === 'boolean') return `<div class="field"><label>${esc(label)}${requiredMark}</label><select data-param="${esc(name)}"><option value="">Tanlang…</option><option value="true" ${value === true || value === 'true' ? 'selected' : ''}>Ha</option><option value="false" ${value === false || value === 'false' ? 'selected' : ''}>Yo‘q</option></select></div>`;
      if (property.type === 'array' || property.type === 'object') return `<div class="field"><label>${esc(label)}${requiredMark}</label><textarea data-param="${esc(name)}" data-param-json="true" placeholder="JSON ko‘rinishida kiriting">${esc(typeof value === 'string' ? value : value ? JSON.stringify(value) : '')}</textarea></div>`;
      const type = property.format === 'date' ? 'date' : property.format === 'email' ? 'email' : property.type === 'number' || property.type === 'integer' ? 'number' : 'text';
      return `<div class="field"><label>${esc(label)}${requiredMark}</label><input data-param="${esc(name)}" type="${type}" value="${esc(value)}" placeholder="${esc(property.description || '')}" ${property.minimum !== undefined ? `min="${esc(property.minimum)}"` : ''} ${property.maximum !== undefined ? `max="${esc(property.maximum)}"` : ''} /></div>`;
    }).join('');
  }

  function validateParameters(item) {
    const schema = parametersSchema(item);
    for (const name of schema?.required || []) {
      const value = state.parameters[name];
      if (value === undefined || value === null || value === '') return `“${schema.properties?.[name]?.title || name}” maydonini to‘ldiring.`;
    }
    return '';
  }

  function updateParameter(name, raw, json) {
    if (raw === '') delete state.parameters[name];
    else if (json) {
      try { state.parameters[name] = JSON.parse(raw); } catch { state.parameters[name] = raw; }
    } else state.parameters[name] = raw;
    invalidateQuote();
    saveState();
  }

  function addOffering() {
    const item = state.selected;
    if (!item || item.isAvailable === false) return;
    const groups = item.optionGroups || [];
    for (const group of groups) {
      const selected = state.selectedOptions[group.id] || [];
      const minimum = Math.max(Number(group.minSelections || 0), group.isRequired ? 1 : 0);
      if (selected.length < minimum) {
        state.error = `“${group.name || 'Variant'}” uchun tanlov qiling.`;
        render();
        return;
      }
    }
    const parameterError = validateParameters(item);
    if (parameterError) { state.error = parameterError; render(); return; }
    const selected = selectedOptionsArray();
    const variant = selectedVariant(item);
    const key = `${item.id}:${variant?.id || ''}:${selected.map((option) => option.id).sort().join(',')}:${JSON.stringify(state.parameters)}`;
    const line = state.cart.find((entry) => entry.key === key);
    if (line) line.quantity += state.quantity;
    else state.cart.push({
      key,
      offeringId: item.id,
      variantId: variant?.id,
      title: titleOf(item),
      unitPrice: configuredPrice(item),
      currency: item.currency || 'UZS',
      quantity: state.quantity,
      selectedOptions: selected.map((option) => ({ groupId: option.groupId, optionId: option.id, name: option.name })),
      parameters: { ...state.parameters }
    });
    invalidateQuote();
    state.modal = 'cart';
    state.selected = null;
    saveState();
    render();
  }

  function invalidateQuote() {
    state.quote = null;
    state.action = null;
    state.paymentOptions = [];
    state.idempotencyKey = null;
  }

  function changeCart(key, delta) {
    const line = state.cart.find((entry) => entry.key === key);
    if (!line) return;
    line.quantity += delta;
    if (line.quantity <= 0) state.cart = state.cart.filter((entry) => entry.key !== key);
    invalidateQuote();
    if (!state.cart.length) state.modal = 'cart';
    saveState();
    render();
  }

  function cartItems() {
    return state.cart.map((line) => ({
      offeringId: line.offeringId,
      variantId: line.variantId,
      quantity: line.quantity,
      selectedOptions: optionPayload(line.selectedOptions),
      ...(line.parameters && Object.keys(line.parameters).length ? { parameters: line.parameters } : {})
    }));
  }

  function requestArgs() {
    const args = {
      providerSlug: state.providerSlug,
      items: cartItems(),
      fulfillmentType: state.form.fulfillmentType,
      ...(state.locationId ? { locationId: state.locationId } : {}),
      ...(state.parameters && Object.keys(state.parameters).length ? { parameters: state.parameters } : {})
    };
    if (state.form.fulfillmentType !== 'PICKUP' && state.form.address.trim()) args.destination = { raw: state.form.address.trim() };
    return args;
  }

  function quoteValid() {
    return Boolean(isQuote(state.quote) && Date.parse(state.quote.expiresAt) > Date.now());
  }

  async function callTool(name, args) {
    state.busy = true;
    state.error = '';
    render();
    try {
      const result = await bridge.callTool(name, args);
      return applyOutput(result);
    } catch (error) {
      state.error = error?.message && !/timed out|unavailable|failed/i.test(error.message)
        ? error.message : 'Hozir bu amalni yakunlab bo‘lmadi. Qayta urinib ko‘ring.';
      render();
      throw error;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function requestQuote() {
    if (!state.cart.length) { state.error = 'Avval savatga mahsulot qo‘shing.'; render(); return; }
    if (!state.providerSlug) { state.error = 'Provider aniqlanmadi. Katalogni qayta oching.'; render(); return; }
    if (state.form.fulfillmentType !== 'PICKUP' && !state.form.address.trim()) {
      state.error = 'Yetkazib berish manzilini kiriting.';
      render();
      return;
    }
    invalidateQuote();
    try {
      await callTool('request_quote', requestArgs());
      if (!state.quote) throw new Error('Provider verified quote qaytarmadi.');
      state.modal = 'quote';
      state.error = '';
      render();
    } catch { state.modal = 'cart'; render(); }
  }

  async function createAction() {
    if (!quoteValid()) { state.error = 'Quote muddati tugagan. Yangi hisob-kitob oling.'; render(); return; }
    if (!state.form.name.trim() || !state.form.phone.trim()) { state.error = 'Ism va telefon raqamingizni kiriting.'; render(); return; }
    if (!state.idempotencyKey) state.idempotencyKey = uuid();
    try {
      await callTool('create_action', {
        idempotencyKey: state.idempotencyKey,
        providerSlug: state.providerSlug,
        quoteId: state.quote.id || state.quote.quoteId,
        items: cartItems(),
        customer: { name: state.form.name.trim(), phone: state.form.phone.trim() },
        userConfirmed: true,
        fulfillmentType: state.form.fulfillmentType,
        ...(state.locationId ? { locationId: state.locationId } : {}),
        ...(state.form.fulfillmentType !== 'PICKUP' && state.form.address.trim() ? { destination: { raw: state.form.address.trim() } } : {}),
        ...(state.parameters && Object.keys(state.parameters).length ? { parameters: state.parameters } : {})
      });
      if (!state.action) throw new Error('Provider buyurtma natijasini qaytarmadi.');
      state.modal = 'success';
      state.error = '';
      saveState();
      render();
    } catch { render(); }
  }

  function actionReference() { return state.action?.actionId || state.action?.publicId || state.action?.id; }
  function paymentStatus() { return String(state.action?.paymentStatus || '').toUpperCase(); }
  function actionStatus() { return String(state.action?.status || '').toUpperCase(); }
  function isPaid() { return paymentStatus() === 'PAID' || actionStatus() === 'PAID'; }
  function isFailed() { return ['FAILED', 'CANCELLED', 'REFUNDED'].includes(paymentStatus()) || ['FAILED', 'CANCELLED', 'REFUNDED'].includes(actionStatus()); }
  function paymentUrl() {
    const value = state.action?.checkoutUrl || state.action?.paymentUrl || state.action?.nextAction?.url;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }

  async function refreshStatus() {
    const reference = actionReference();
    if (!reference) return;
    try { await callTool('get_action', { actionId: reference }); } catch { /* callTool renders the customer-safe error */ }
  }

  async function loadPaymentOptions() {
    const reference = actionReference();
    if (!reference) return;
    try { await callTool('get_payment_options', { actionId: reference }); } catch { /* callTool renders the customer-safe error */ }
  }

  async function openPayment() {
    const url = paymentUrl();
    if (!url) { await loadPaymentOptions(); return; }
    try { await bridge.openLink(url); } catch (error) { state.error = 'To‘lov sahifasini ochib bo‘lmadi.'; render(); }
  }

  function localSubtotal() { return state.cart.reduce((sum, line) => sum + Number(line.unitPrice || 0) * line.quantity, 0); }
  function quoteFees() { return Number(state.quote?.totalFees ?? (state.quote?.fees || []).reduce((sum, fee) => sum + Number(fee.amount || 0), 0)); }
  function quoteDiscount() { return Number(state.quote?.totalDiscount ?? (state.quote?.discounts || []).reduce((sum, discount) => sum + Number(discount.amount || 0), 0)); }
  function rememberFocus() {
    const active = document.activeElement;
    if (!active || !active.dataset) return;
    const key = active.dataset.input || active.dataset.form || active.dataset.param;
    if (!key) return;
    state.lastFocus = { kind: active.dataset.input ? 'input' : active.dataset.form ? 'form' : 'param', key, start: active.selectionStart, end: active.selectionEnd };
  }

  function restoreFocus() {
    const focus = state.lastFocus;
    state.lastFocus = null;
    if (!focus) return;
    const element = document.querySelector(`[data-${focus.kind}="${cssEscape(focus.key)}"]`);
    if (!element) return;
    element.focus();
    if (typeof element.setSelectionRange === 'function' && focus.start !== null) element.setSelectionRange(focus.start, focus.end);
  }

  function cardHtml(item) {
    const available = item.isAvailable !== false;
    return `<article class="offering-card"><button class="offering-visual" data-item="${esc(item.id)}" aria-label="${esc(titleOf(item))}" ${available ? '' : 'disabled'}>${available ? '<span class="availability">Mavjud</span>' : '<span class="availability unavailable">Mavjud emas</span>'}${visual(item)}</button><div class="offering-body"><h3>${esc(titleOf(item))}</h3><p class="description">${esc(item.description || 'Provider katalogidagi mahsulot yoki xizmat.')}</p><div class="card-footer"><span class="price">${money(priceOf(item), item.currency)}</span><button class="button-add" data-item="${esc(item.id)}" ${available ? '' : 'disabled'}>Tanlash ${icon('arrow')}</button></div></div></article>`;
  }

  function detailHtml() {
    const item = state.selected;
    if (!item) return '';
    const variants = (item.variants || []).filter((variant) => variant.isAvailable !== false);
    const groups = item.optionGroups || [];
    const params = parameterFields(item);
    return `<div class="backdrop" data-backdrop="detail"><section class="dialog wide" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div class="dialog-header"><div><div class="eyebrow">Tanlovni sozlash</div><h2 id="detail-title">${esc(titleOf(item))}</h2></div><button class="close-button" data-action="close" aria-label="Yopish">${icon('close')}</button></div><div class="dialog-body"><div class="detail-visual">${visual(item, true)}</div><p class="detail-copy">${esc(item.description || 'Provider katalogidagi mahsulot yoki xizmat.')}</p>${variants.length ? `<fieldset class="field-group"><legend>Variant</legend><div class="option-list">${variants.map((variant) => `<button class="option-button ${state.selectedVariant?.id === variant.id ? 'selected' : ''}" data-variant="${esc(variant.id)}">${esc(variant.name)} · ${money(variant.basePrice, item.currency)}</button>`).join('')}</div></fieldset>` : ''}${groups.map((group) => { const selected = state.selectedOptions[group.id] || []; const minimum = Math.max(Number(group.minSelections || 0), group.isRequired ? 1 : 0); return `<fieldset class="field-group"><legend>${esc(group.name || 'Qo‘shimcha')}${minimum ? ' *' : ''}</legend>${group.description ? `<p class="option-help">${esc(group.description)}</p>` : ''}<div class="option-list">${(group.options || []).map((option) => `<button class="option-button ${selected.some((entry) => entry.id === option.id) ? 'selected' : ''}" data-option-group="${esc(group.id)}" data-option="${esc(option.id)}" ${option.isAvailable === false ? 'disabled' : ''}>${esc(option.name)}${Number(option.priceDelta || 0) ? ` · +${money(option.priceDelta, item.currency)}` : ''}</button>`).join('')}</div></fieldset>`; }).join('')}${params ? `<div class="field-group"><div class="field-label">Buyurtma tafsilotlari</div><div class="form">${params}</div></div>` : ''}<div class="quantity-row"><b>Miqdor</b><div class="quantity-control"><button data-action="quantity-minus" aria-label="Kamaytirish">${icon('minus')}</button><strong>${state.quantity}</strong><button data-action="quantity-plus" aria-label="Ko‘paytirish">${icon('plus')}</button></div><strong class="price quantity-total">${money(configuredPrice(item) * state.quantity, item.currency)}</strong></div>${state.error ? `<div class="error-notice">${esc(state.error)}</div>` : ''}<div class="dialog-actions"><button class="button-ghost" data-action="close">Bekor qilish</button><button class="button-primary" data-action="add">Savatga qo‘shish ${icon('cart')}</button></div></div></section></div>`;
  }

  function formHtml() {
    return `<div class="form"><div class="form-grid"><div class="field"><label for="customer-name">Ism *</label><input id="customer-name" data-form="name" value="${esc(state.form.name)}" placeholder="Masalan, Abduhamid" autocomplete="name" /></div><div class="field"><label for="customer-phone">Telefon *</label><input id="customer-phone" data-form="phone" value="${esc(state.form.phone)}" placeholder="+998 90 123 45 67" autocomplete="tel" /></div></div><div class="field"><label for="customer-address">Yetkazish manzili${state.form.fulfillmentType === 'PICKUP' ? '' : ' *'}</label><input id="customer-address" data-form="address" value="${esc(state.form.address)}" placeholder="Toshkent City Park…" autocomplete="street-address" /></div><div class="field"><label for="fulfillment-type">Olish usuli</label><select id="fulfillment-type" data-form="fulfillmentType"><option value="STANDARD" ${state.form.fulfillmentType === 'STANDARD' ? 'selected' : ''}>Yetkazib berish</option><option value="PICKUP" ${state.form.fulfillmentType === 'PICKUP' ? 'selected' : ''}>O‘zim olib ketaman</option></select></div></div>`;
  }

  function cartHtml() {
    const lines = state.cart.map((line) => `<div class="cart-line"><div><strong>${esc(line.title)}</strong><small>${money(line.unitPrice, line.currency)} · ${line.selectedOptions?.length ? 'Qo‘shimchalar tanlangan' : 'Standart variant'}</small></div><div class="cart-quantity"><button data-cart="${esc(line.key)}" data-delta="-1" aria-label="Kamaytirish">${icon('minus')}</button><b>${line.quantity}</b><button data-cart="${esc(line.key)}" data-delta="1" aria-label="Ko‘paytirish">${icon('plus')}</button></div></div>`).join('');
    return `<div class="backdrop" data-backdrop="cart"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="cart-title"><div class="dialog-header"><div><div class="eyebrow">Sizning tanlovlaringiz</div><h2 id="cart-title">Savat</h2></div><button class="close-button" data-action="close" aria-label="Yopish">${icon('close')}</button></div><div class="dialog-body">${lines || '<div class="empty-state">Savat hozircha bo‘sh.</div>'}${lines ? `<div class="summary"><div class="summary-row"><span>Mahsulotlar</span><b>${money(localSubtotal())}</b></div><div class="summary-row total"><span>Taxminiy jami</span><b>${money(localSubtotal())}</b></div></div>${formHtml()}<button class="button-primary" style="width:100%;margin-top:18px" data-action="quote" ${state.busy ? 'disabled' : ''}>${state.busy ? '<span class="spinner"></span>Hisoblanmoqda…' : 'Real quote olish →'}</button>` : ''}${state.error ? `<div class="error-notice">${esc(state.error)}</div>` : ''}</div></section></div>`;
  }

  function quoteHtml() {
    const expired = !quoteValid();
    const quote = state.quote || {};
    const lines = (quote.lines || []).map((line) => `<div class="cart-line"><div><strong>${esc(line.offeringTitle || line.title || line.offeringId || 'Tanlangan xizmat')}</strong><small>${line.quantity || 1} × ${money(line.unitPrice, quote.currency)}</small></div><b>${money(line.lineTotal, quote.currency)}</b></div>`).join('');
    return `<div class="backdrop" data-backdrop="quote"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="quote-title"><div class="dialog-header"><div><div class="eyebrow">Provider tasdiqlagan narx</div><h2 id="quote-title">Yakuniy quote</h2></div><button class="close-button" data-action="close" aria-label="Yopish">${icon('close')}</button></div><div class="dialog-body">${expired ? '<div class="error-notice">Quote muddati tugagan. Buyurtma berishdan oldin qayta hisoblang.</div>' : ''}${lines || '<div class="empty-state">Quote ma’lumotlari yuklanmoqda…</div>'}<div class="summary"><div class="summary-row"><span>Mahsulotlar</span><b>${money(quote.subtotal, quote.currency)}</b></div>${quoteFees() ? `<div class="summary-row"><span>Yetkazish va xizmat haqi</span><b>${money(quoteFees(), quote.currency)}</b></div>` : ''}${quoteDiscount() ? `<div class="summary-row"><span>Chegirma</span><b>−${money(quoteDiscount(), quote.currency)}</b></div>` : ''}<div class="summary-row total"><span>Jami</span><b>${money(quote.total, quote.currency)}</b></div></div>${formHtml()}${state.error ? `<div class="error-notice">${esc(state.error)}</div>` : ''}<div class="dialog-actions"><button class="button-ghost" data-action="back-cart">Savatga qaytish</button><button class="button-primary" data-action="create" ${state.busy || expired ? 'disabled' : ''}>${state.busy ? '<span class="spinner"></span>Yuborilmoqda…' : 'Tasdiqlayman va buyurtma beraman'}</button></div><div class="notice">Narx va mavjudlik provider’dan real-time olindi. Buyurtma faqat siz tasdiqlaganingizdan keyin yaratiladi.</div></div></section></div>`;
  }

  function successHtml() {
    const paid = isPaid();
    const failed = isFailed();
    const url = paymentUrl();
    const heading = failed ? 'Buyurtma yakunlanmadi' : paid ? 'To‘lov qabul qilindi' : 'Buyurtma yaratildi';
    const copy = failed ? 'Provider bu buyurtmani davom ettirmadi. Katalogga qaytib, yangi tanlov qilishingiz mumkin.' : paid ? 'To‘lov holati provider tomonidan aniq tasdiqlandi.' : 'Buyurtma yaratildi, ammo to‘lov hali PAID deb tasdiqlanmagan.';
    return `<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="status-title"><div class="dialog-body"><div class="status-hero"><div class="status-icon">${failed ? '!' : paid ? icon('check') : '◷'}</div><div class="eyebrow">Zayuno order status</div><h2 id="status-title">${heading}</h2><p>${copy}</p><span class="status-pill ${failed ? 'bad' : ''}">${paid ? 'PAID' : failed ? (actionStatus() || paymentStatus() || 'FAILED') : (paymentStatus() || actionStatus() || 'To‘lov kutilmoqda')}</span></div>${state.error ? `<div class="error-notice">${esc(state.error)}</div>` : ''}<div class="status-actions">${url && !paid && !failed ? `<button class="button-primary" data-action="payment">To‘lov sahifasini ochish ${icon('arrow')}</button>` : ''}${!paid && !failed && !state.paymentOptions.length ? `<button class="button-secondary" data-action="payment-options">To‘lov usullarini tekshirish</button>` : ''}${state.paymentOptions.map((option) => `<button class="button-secondary" data-payment-url="${esc(option.checkoutUrl || option.url || '')}">${esc(option.name || 'To‘lov variantini ochish')} ${icon('arrow')}</button>`).join('')}<button class="button-ghost" data-action="status">Holatni yangilash ${icon('refresh')}</button><button class="button-ghost" data-action="close">Katalogga qaytish</button></div></div></section></div>`;
  }

  function modalHtml() {
    if (state.modal === 'detail') return detailHtml();
    if (state.modal === 'cart') return cartHtml();
    if (state.modal === 'quote') return quoteHtml();
    if (state.modal === 'success') return successHtml();
    return '';
  }

  function render() {
    rememberFocus();
    const items = visibleOfferings();
    const cats = categories();
    const count = state.cart.reduce((sum, line) => sum + line.quantity, 0);
    const emptyText = state.loading ? '<div class="empty-state"><span class="shell-spinner"></span><span>Katalog yuklanmoqda…</span></div>' : '<div class="empty-state">Katalog hozircha bo‘sh yoki qidiruv bo‘yicha natija topilmadi.</div>';
    app().innerHTML = `<div class="topbar"><div class="brand-row"><span class="brand-logo">${logo()}</span><div class="brand-copy"><div class="eyebrow">Zayuno commerce</div><div class="brand-name">Interaktiv katalog va checkout</div></div></div><div class="topbar-actions"><span class="connection ${state.connection ? 'is-live' : ''}"><i class="connection-dot"></i>${state.connection ? 'Host bilan ulangan' : 'Katalog rejimi'}</span><button class="button-ghost" data-action="refresh" ${state.busy ? 'disabled' : ''}>${icon('refresh')} Yangilash</button></div></div><section class="hero"><div><div class="eyebrow">Provider katalogi</div><h1>Kerakli mahsulotni tanlang, quote’ni tekshiring va buyurtmani tasdiqlang.</h1><p>Rasm, variant, qo‘shimcha, miqdor va yetkazish ma’lumotlari bir joyda. Narx buyurtma berishdan oldin provider’dan real-time qayta olinadi.</p></div><div class="hero-actions"><button class="button-primary" data-action="open-cart">${icon('cart')} Savat <span class="badge">${count}</span></button></div></section><div class="workspace-toolbar"><label class="search-box">${icon('search')}<input data-input="search" value="${esc(state.search)}" placeholder="Mahsulot yoki xizmat qidiring…" aria-label="Katalogdan qidirish" /></label><button class="cart-button" data-action="open-cart">${icon('cart')} Savat <span class="badge">${count}</span></button></div><div class="filter-row">${cats.map((category) => `<button class="filter ${state.category === category ? 'active' : ''}" data-category="${esc(category)}">${esc(category === 'ALL' ? 'Barchasi' : category)}</button>`).join('')}</div><div class="section-head"><h2>${esc(state.providerSlug || 'Katalog')}</h2><span>${items.length} ta variant</span></div>${items.length ? `<div class="catalog-grid">${items.map(cardHtml).join('')}</div>` : emptyText}${state.error && !state.modal ? `<div class="error-notice">${esc(state.error)}</div>` : ''}${state.busy && !state.modal ? '<div class="notice"><span class="spinner"></span>Provider bilan xavfsiz bog‘lanilmoqda…</div>' : ''}${modalHtml()}`;
    bind();
    restoreFocus();
    window.requestAnimationFrame(() => bridge?.setHeight?.(document.documentElement.scrollHeight));
  }

  function setFormValue(name, value) {
    state.form[name] = value;
    if (name === 'address' || name === 'fulfillmentType') invalidateQuote();
    saveState();
  }

  function bind() {
    document.querySelectorAll('[data-category]').forEach((element) => element.addEventListener('click', () => { state.category = element.dataset.category; render(); }));
    document.querySelectorAll('[data-item]').forEach((element) => element.addEventListener('click', () => {
      const item = state.offerings.find((entry) => String(entry.id) === String(element.dataset.item));
      if (item) openOffering(item);
    }));
    document.querySelectorAll('[data-action]').forEach((element) => element.addEventListener('click', (event) => {
      const action = element.dataset.action;
      if (action === 'close') { state.modal = null; state.error = ''; render(); return; }
      if (action === 'open-cart') { state.modal = 'cart'; state.error = ''; render(); return; }
      if (action === 'back-cart') { state.modal = 'cart'; state.error = ''; render(); return; }
      if (action === 'refresh') { void callTool('get_catalog', { providerSlug: state.providerSlug, ...(state.locationId ? { locationId: state.locationId } : {}), ...(Object.keys(state.parameters).length ? { parameters: state.parameters } : {}) }).catch(() => {}); return; }
      if (action === 'quantity-minus') { state.quantity = Math.max(1, state.quantity - 1); render(); return; }
      if (action === 'quantity-plus') { state.quantity += 1; render(); return; }
      if (action === 'add') { addOffering(); return; }
      if (action === 'quote') { void requestQuote(); return; }
      if (action === 'create') { void createAction(); return; }
      if (action === 'payment') { void openPayment(); return; }
      if (action === 'payment-options') { void loadPaymentOptions(); return; }
      if (action === 'status') { void refreshStatus(); return; }
      if (action === 'expand') { void bridge.requestDisplayMode?.('fullscreen'); return; }
      if (event.target === element) event.stopPropagation();
    }));
    document.querySelectorAll('[data-backdrop]').forEach((element) => element.addEventListener('click', (event) => { if (event.target === element) { state.modal = null; state.error = ''; render(); } }));
    document.querySelectorAll('[data-variant]').forEach((element) => element.addEventListener('click', () => {
      state.selectedVariant = (state.selected?.variants || []).find((variant) => String(variant.id) === String(element.dataset.variant)) || null;
      render();
    }));
    document.querySelectorAll('[data-option]').forEach((element) => element.addEventListener('click', () => {
      const group = (state.selected?.optionGroups || []).find((entry) => String(entry.id) === String(element.dataset.optionGroup));
      const option = group?.options?.find((entry) => String(entry.id) === String(element.dataset.option));
      if (group && option) toggleOption(group, option);
    }));
    document.querySelectorAll('[data-cart]').forEach((element) => element.addEventListener('click', () => changeCart(element.dataset.cart, Number(element.dataset.delta))));
    const search = document.querySelector('[data-input="search"]');
    if (search) search.addEventListener('input', (event) => { state.search = event.target.value; render(); });
    document.querySelectorAll('[data-form]').forEach((element) => element.addEventListener('input', (event) => {
      setFormValue(element.dataset.form, event.target.value);
      render();
    }));
    document.querySelectorAll('[data-param]').forEach((element) => element.addEventListener('input', (event) => {
      updateParameter(element.dataset.param, event.target.value, element.dataset.paramJson === 'true');
      render();
    }));
    document.querySelectorAll('[data-payment-url]').forEach((element) => element.addEventListener('click', async () => {
      try { await bridge.openLink(element.dataset.paymentUrl); } catch { state.error = 'To‘lov sahifasini ochib bo‘lmadi.'; render(); }
    }));
  }

  bridge?.on?.('tool-input', handleToolInput);
  bridge?.on?.('tool-output', (output) => { try { applyOutput(output); } catch (error) { state.error = error.message || 'Tool natijasini o‘qib bo‘lmadi.'; render(); } });
  bridge?.on?.('context', handleContext);
  bridge?.on?.('connection', handleContext);
  bridge?.on?.('error', (error) => { if (state.busy) state.error = error?.message || 'Host bilan aloqa uzildi.'; });

  restoreState();
  initialHostOutput();
  render();
  bridge?.start?.().then(() => { initialHostOutput(); state.loading = state.offerings.length === 0; render(); }).catch(() => { state.loading = state.offerings.length === 0; render(); });
})();
