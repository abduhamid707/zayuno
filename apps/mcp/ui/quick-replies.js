(() => {
  'use strict';
  const bridge = window.ZayunoBridge;
  const root = document.getElementById('choices');
  const feedback = document.getElementById('feedback');
  const fallback = document.getElementById('fallback');
  const PAGE_SIZE = 6;
  const buttons = new Map();
  let payloadKey = '';
  let busy = false;
  let lastSent = '';
  let expiryTimer;
  let closed = false;
  const expired = (item) => Boolean(item.expiresAt) && (!Number.isFinite(Date.parse(item.expiresAt)) || Date.parse(item.expiresAt) <= Date.now());
  // Body content height (not viewport-inflated scrollHeight) permits both growth
  // and shrinkage and includes padding, avoiding an unnecessary inner scrollbar.
  const height = () => bridge.setHeight(Math.ceil(document.body.getBoundingClientRect().height) + 2);
  const status = (message) => { feedback.textContent = message; height(); };
  const element = (tag, value, className) => {
    const node = document.createElement(tag);
    if (value) node.textContent = value;
    if (className) node.className = className;
    return node;
  };
  const sync = () => {
    for (const [key, { button, item }] of buttons) {
      const sent = key === lastSent || button.dataset.confirmed === 'true';
      button.disabled = closed || busy || item.disabled === true || expired(item) || sent;
      button.dataset.sent = String(sent);
      button.title = expired(item) ? 'Hisob muddati tugadi. Narxni qayta hisoblang.' : sent ? 'Tanlov chatga yuborildi' : item.label;
    }
    root.setAttribute('aria-busy', String(busy));
  };
  const deliver = async (key) => {
    const entry = buttons.get(key);
    if (!entry || entry.button.disabled || busy) return;
    const { button, item } = entry;
    const sendingPayload = payloadKey;
    let sendTimer;
    if (expired(item)) { sync(); return status('Hisob muddati tugadi. Chatda narxni yangilashni so‘rang.'); }
    busy = true;
    sync();
    fallback.hidden = true;
    status('Chatga yuborilmoqda…');
    try {
      const answer = await Promise.race([
        bridge.sendMessage(item.prompt),
        new Promise((_, reject) => { sendTimer = window.setTimeout(() => reject(new Error('Message timed out')), 15000); })
      ]);
      if (answer?.isError === true) throw new Error('Host rejected the message');
      if (sendingPayload !== payloadKey || closed) return;
      lastSent = key;
      if (item.id === 'confirm') button.dataset.confirmed = 'true';
      status('Yuborildi. Davomi chatda.');
    } catch (error) {
      if (sendingPayload !== payloadKey || closed) return;
      // Never claim success or silently create an order when host messaging fails.
      fallback.value = item.prompt;
      fallback.hidden = false;
      const timeout = /timed out/i.test(String(error?.message));
      if (timeout) {
        lastSent = key; // A missing acknowledgement does not prove non-delivery.
        if (item.id === 'confirm') button.dataset.confirmed = 'true';
      }
      status(timeout ? 'Yuborilganini tasdiqlay olmadik. Qayta yuborishdan oldin chatni tekshiring.' : 'Chatga yuborilmadi. Qayta bosing yoki pastdagi matnni chatga ko‘chiring.');
    } finally {
      window.clearTimeout(sendTimer);
      busy = false;
      sync();
      height();
    }
  };

  const render = (data) => {
    if (!data || !Array.isArray(data.groups)) return;
    const key = JSON.stringify(data);
    if (key === payloadKey) return; // Host theme/global notifications are not new results.
    payloadKey = key;
    lastSent = '';
    fallback.hidden = true;
    fallback.value = '';
    buttons.clear();
    root.replaceChildren();
    window.clearTimeout(expiryTimer);
    if (typeof data.title === 'string' && data.groups.length) root.append(element('h1', data.title));
    if (typeof data.summary === 'string' && data.summary) root.append(element('p', data.summary, 'summary'));
    let nearestExpiry = Infinity;
    data.groups.forEach((group, groupIndex) => {
      if (!Array.isArray(group.choices)) return;
      const choices = group.choices.filter(item => item && typeof item.label === 'string' && typeof item.prompt === 'string' && item.prompt.trim());
      if (!choices.length) return;
      const section = element('section');
      if (group.label) section.append(element('h2', String(group.label)));
      const row = element('div', '', 'row');
      let offset = 0;
      const more = element('button', 'Ko‘proq variantlar', 'more');
      more.type = 'button';
      const appendPage = () => {
        more.remove();
        const end = Math.min(offset + PAGE_SIZE, choices.length);
        for (; offset < end; offset++) {
          const item = choices[offset];
          const choiceKey = `${groupIndex}:${offset}`;
          const button = element('button', item.label);
          button.type = 'button';
          button.dataset.choice = choiceKey;
          buttons.set(choiceKey, { button, item });
          row.append(button);
          if (item.expiresAt) nearestExpiry = Math.min(nearestExpiry, Date.parse(item.expiresAt));
        }
        if (offset < choices.length) row.append(more);
        sync();
        height();
      };
      more.addEventListener('click', () => {
        const next = offset;
        appendPage();
        buttons.get(`${groupIndex}:${next}`)?.button.focus();
      });
      section.append(row);
      root.append(section);
      appendPage();
    });
    status(buttons.size ? '' : 'Bu natijada tanlanadigan variant yo‘q. Chatda davom eting.');
    if (Number.isFinite(nearestExpiry)) expiryTimer = window.setTimeout(() => {
      sync();
      status('Hisob muddati tugadi. Tasdiqlashdan oldin narxni yangilang.');
    }, Math.max(0, Math.min(2147483647, nearestExpiry - Date.now() + 10)));
  };
  root.addEventListener('click', event => {
    const button = event.target.closest('button[data-choice]');
    if (button) void deliver(button.dataset.choice);
  });
  bridge.on('tool-metadata', meta => render(meta?.['zayuno/quickReplies']));
  bridge.on('context', context => {
    if (context?.theme === 'light' || context?.theme === 'dark') document.documentElement.dataset.theme = context.theme;
    height();
  });
  bridge.on('teardown', () => { closed = true; window.clearTimeout(expiryTimer); sync(); });
  if (typeof ResizeObserver === 'function') new ResizeObserver(height).observe(root);
  void bridge.start();
})();
