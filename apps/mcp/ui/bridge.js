(() => {
  'use strict';

  const PROTOCOL_VERSION = '2026-01-26';
  const pending = new Map();
  const listeners = new Map();
  let sequence = 0;
  let initialized = false;
  let disposed = false;
  let initialization = null;
  let hostContext = {};

  const on = (event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
  };

  const emit = (event, value) => {
    for (const handler of listeners.get(event) || []) {
      try { handler(value); } catch (error) { emit('error', error); }
    }
  };

  const safeUrl = (value) => {
    try {
      const url = new URL(String(value));
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      return url.href;
    } catch { return null; }
  };

  const unwrap = (value) => {
    if (value && value.result !== undefined && value.jsonrpc) return value.result;
    return value;
  };

  const decode = (value) => {
    const raw = unwrap(value);
    if (raw?.isError === true || raw?.result?.isError === true) {
      const message = raw?.customerMessage || raw?.result?.customerMessage || 'Tool call failed';
      throw new Error(String(message));
    }
    if (raw?.structuredContent) return raw.structuredContent;
    if (raw?.result?.structuredContent) return raw.result.structuredContent;
    if (raw?.toolOutput) return decode(raw.toolOutput);
    if (Array.isArray(raw?.content)) {
      const text = raw.content.find((item) => item?.type === 'text')?.text;
      if (typeof text === 'string') {
        try { return decode(JSON.parse(text)); } catch { return { customerMessage: text }; }
      }
    }
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return { customerMessage: raw }; }
    }
    return raw || {};
  };

  const post = (message) => {
    if (disposed || window.parent === window) return;
    window.parent.postMessage({ jsonrpc: '2.0', ...message }, '*');
  };

  const request = (method, params = {}, timeoutMs = 30000) => new Promise((resolve, reject) => {
    if (disposed) return reject(new Error('Widget connection is closed'));
    const id = `zayuno-ui-${++sequence}`;
    const timer = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (value) => { window.clearTimeout(timer); pending.delete(id); resolve(value); },
      reject: (error) => { window.clearTimeout(timer); pending.delete(id); reject(error); }
    });
    post({ id, method, params });
  });

  const handleMessage = (event) => {
    if (event.source !== window.parent || !event.data || event.data.jsonrpc !== '2.0') return;
    const message = event.data;
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id);
      if (message.error) item.reject(new Error(message.error.message || 'Host request failed'));
      else item.resolve(message.result);
      return;
    }
    if (message.method === 'ui/notifications/tool-result') {
      emit('tool-metadata', (message.params?.result ?? message.params)?._meta || {});
      try { emit('tool-output', decode(message.params?.result ?? message.params)); }
      catch (error) { emit('error', error); }
      return;
    }
    if (message.method === 'ui/notifications/tool-input') {
      emit('tool-input', message.params?.arguments || message.params?.toolInput || {});
      return;
    }
    if (message.method === 'ui/notifications/host-context-changed') {
      hostContext = { ...hostContext, ...(message.params || {}) };
      emit('context', hostContext);
      return;
    }
    if (message.method === 'ui/notifications/resource-teardown') {
      disposed = true;
      for (const item of pending.values()) item.reject(new Error('Widget was closed by the host'));
      pending.clear();
      emit('teardown');
    }
  };

  const readOpenAiGlobals = (event) => {
    const globals = event?.detail?.globals ? { ...window.openai, ...event.detail.globals } : window.openai;
    if (!globals) return;
    if (globals.toolResponseMetadata) emit('tool-metadata', globals.toolResponseMetadata);
    if (globals.toolInput) emit('tool-input', globals.toolInput);
    if (globals.toolOutput) {
      try { emit('tool-output', decode(globals.toolOutput)); } catch (error) { emit('error', error); }
    }
    if (globals.theme) emit('context', { theme: globals.theme });
  };

  const start = () => {
    if (initialization) return initialization;
    readOpenAiGlobals();
    if (window.parent === window) {
      if (window.openai) {
        initialized = true;
        emit('connection', { connected: true, standalone: false, compatibility: true });
        initialization = Promise.resolve({ hostContext: {} });
      } else {
        emit('connection', { connected: false, standalone: true });
        initialization = Promise.resolve(null);
      }
      return initialization;
    }
    initialization = request('ui/initialize', {
      protocolVersion: PROTOCOL_VERSION,
      appInfo: { name: window.ZAYUNO_UI_CONFIG?.appName || 'Zayuno Catalog', version: window.ZAYUNO_UI_CONFIG?.version || '2.0.0' },
      appCapabilities: { availableDisplayModes: window.ZAYUNO_UI_CONFIG?.displayModes || ['inline', 'fullscreen'] }
    }, 8000).then((result) => {
      const response = result || {};
      hostContext = response.hostContext || {};
      initialized = true;
      post({ method: 'ui/notifications/initialized', params: {} });
      emit('context', hostContext);
      emit('connection', { connected: true, standalone: false });
      return response;
    }).catch((error) => {
      emit('connection', { connected: Boolean(window.openai), standalone: false, degraded: true });
      emit('error', error);
      return null;
    });
    return initialization;
  };

  const callTool = async (name, args = {}) => {
    const globals = window.openai;
    if (typeof globals?.callTool === 'function') return decode(await globals.callTool(name, args));
    await start();
    if (!initialized) throw new Error('Host tool bridge is unavailable');
    return decode(await request('tools/call', { name, arguments: args }));
  };

  const restore = () => {
    const state = window.openai?.widgetState;
    return state?.privateContent || state || {};
  };

  const save = (privateContent, modelContent) => {
    try { window.openai?.setWidgetState?.({ privateContent, ...(modelContent ? { modelContent } : {}) }); } catch (error) { emit('error', error); }
  };

  const updateModelContext = (structuredContent) => {
    if (initialized) request('ui/update-model-context', { structuredContent }).catch((error) => emit('error', error));
  };

  const openLink = async (value) => {
    const url = safeUrl(value);
    if (!url) throw new Error('Only public HTTPS links can be opened');
    if (typeof window.openai?.openExternal === 'function') return window.openai.openExternal({ href: url });
    await start();
    if (!initialized) throw new Error('Host link bridge is unavailable');
    return request('ui/open-link', { url });
  };

  const sendMessage = async (text) => {
    if (!text) return;
    // Prefer the portable bridge once initialized. Do not wait for a legacy
    // host's handshake timeout when its compatible messaging API is ready.
    if (initialized && window.parent !== window) return request('ui/message', { role: 'user', content: [{ type: 'text', text: String(text) }] });
    if (typeof window.openai?.sendFollowUpMessage === 'function') return window.openai.sendFollowUpMessage({ prompt: text });
    await start();
    if (!initialized) throw new Error('Host message bridge is unavailable');
    return request('ui/message', { role: 'user', content: [{ type: 'text', text: String(text) }] });
  };

  const requestDisplayMode = async (mode) => {
    if (typeof window.openai?.requestDisplayMode === 'function') return window.openai.requestDisplayMode({ mode });
    if (!initialized) return null;
    return request('ui/request-display-mode', { mode });
  };

  const setHeight = (height) => {
    const value = Math.max(window.ZAYUNO_UI_CONFIG?.minHeight || 120, Math.min(1400, Math.ceil(Number(height) || 0)));
    if (initialized) post({ method: 'ui/notifications/size-changed', params: { height: value } });
    else if (typeof window.openai?.notifyIntrinsicHeight === 'function') window.openai.notifyIntrinsicHeight(value);
  };

  window.addEventListener('message', handleMessage);
  window.addEventListener('openai:set_globals', readOpenAiGlobals);

  window.ZayunoBridge = {
    on, start, callTool, decode, restore, save, updateModelContext, openLink, sendMessage,
    requestDisplayMode, setHeight,
    isConnected: () => initialized
  };
})();
