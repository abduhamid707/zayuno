/** Conservative, versioned classification. Only structured facts are persisted. */
export function classifyDemand(prompt: string, providers: Array<{ name: string; slug: string }> = []) {
  const text = prompt.toLowerCase().replace(/[‘’`ʻʼ]/g, "'");
  const brands = new Set<string>();
  const aliases: Array<[string, RegExp]> = [
    ['EVOS', /\bevos(?:dan|ga|ning|ni)?\b|эвос/iu], ['Beshqozon', /besh\s*qozon|беш\s*козон|бешқозон/iu],
    ['Feed Up', /feed\s*up|фид\s*ап/iu], ['Uzum', /uzum|узум/iu],
    ['Yandex', /yandex|яндекс/iu], ['MaxWay', /max\s*way|макс\s*вей/iu],
    ['Oqtepa', /oqtepa|октепа|оқтепа/iu], ['Les Ailes', /les\s*ailes|лес\s*эйл/iu],
  ];
  for (const [name, pattern] of aliases) if (pattern.test(text)) brands.add(name);
  for (const provider of providers) {
    const escape = (value: string) => value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|[^\\p{L}])(?:${escape(provider.name)}|${escape(provider.slug)})(?=$|[^\\p{L}]|dan|ga|ning|ni)`, 'u');
    if (pattern.test(text) && !aliases.some(([name, alias]) => brands.has(name) && alias.test(provider.name))) brands.add(provider.name.slice(0, 80));
  }
  const rules: Array<[string, RegExp]> = [
    ['transport', /taksi|taxi|такси|poyezd|поезд|avia|авиа/iu],
    ['food', /lavash|лаваш|burger|бургер|ovqat|овқат|taom|restoran|ресторан|pizza|пицца|pitsa|\bosh\b|\bош\b|beshqozon|evos|feed\s*up|oqtepa|maxway/iu],
    ['retail', /sumka|сумка|kiyim|кийим|telefon|телефон|noutbuk|ноутбук|shopping|uzum|узум|market|магазин/iu],
    ['travel', /mehmonxona|отель|hotel|sayohat|bilet|билет/iu],
    ['healthcare', /klinika|клиника|shifokor|врач|dori|apteka|аптека/iu],
    ['education', /universitet|kurs|ta'lim|o'qish|курс|университет/iu],
    ['jobs', /vakansiya|rezyume|\bjob\b|ish\s+top|ваканси/iu],
  ];
  const category = rules.find(([, pattern]) => pattern.test(text))?.[0] || 'other';
  const topic = ([['lavash', /lavash|лаваш/iu], ['burger', /burger|бургер/iu], ['osh', /\bosh\b|\bош\b|плов/iu],
    ['pizza', /pizza|pitsa|пицца/iu], ['sumka', /sumka|сумка/iu], ['taxi', /taxi|taksi|такси/iu]] as Array<[string, RegExp]>).find(([, re]) => re.test(text))?.[0] || null;
  const intent = /buyurtma|буюртма|закаж|заказ|order|chaqir|чақир|вызов|sotib|купить|bron|брон/iu.test(text) ? 'ORDER'
    : /filial|филиал|eng\s+yaqin|ближай/iu.test(text) ? 'NEARBY'
    : /delivery|yetkaz|достав/iu.test(text) ? 'DELIVERY'
    : /\btop|qidir|най[дт]|покажи|ko'rsat|kerak|нуж|bormi|борми|search|find/iu.test(text) ? 'SEARCH' : 'MENTION';
  const cities: Array<[string, RegExp]> = [
    ['Toshkent', /toshkent|tashkent|ташкент|тошкент/iu], ['Samarqand', /samar[qk]and|самарканд|самарқанд/iu],
    ['Buxoro', /buxoro|bukhara|бухара|бухоро/iu], ['Andijon', /andijon|андижан/iu],
    ['Namangan', /namangan|наманган/iu], ['Farg‘ona', /farg'ona|fergana|фергана/iu],
    ['Nukus', /nukus|нукус/iu], ['Qarshi', /qarshi|карши|қарши/iu],
  ];
  // Only explicit maxima; ordinary digits (quantity/phone/address) are never budgets.
  const budget = text.match(/(\d+(?:[ .,]\d{3})*|\d+)\s*(ming|минг|тыс(?:яч)?|k|mln|million)?\s*(?:so'm|som|сум|uzs)?\s*(?:gacha|гача|до|dan\s+oshmasin)/iu)
    || text.match(/(?:до|under|up to)\s+(\d+(?:[ .,]\d{3})*|\d+)\s*(ming|тыс(?:яч)?|k|mln|million)?/iu);
  const amount = budget ? Number(budget[1].replace(/[ .,]/g, '')) * (/mln|million/.test(budget[2] || '') ? 1_000_000 : budget[2] ? 1000 : 1) : null;
  const budgetMax = amount && Number.isSafeInteger(amount) && amount <= 1_000_000_000 ? amount : null;
  const relevant = category !== 'other' || brands.size > 0 || intent !== 'MENTION';
  return relevant ? { category, topic, intent, brands: [...brands].sort(), city: cities.find(([, re]) => re.test(text))?.[0] || null,
    budgetMax, currency: budgetMax ? 'UZS' : null, highIntent: intent === 'ORDER' || intent === 'SEARCH' } : null;
}
