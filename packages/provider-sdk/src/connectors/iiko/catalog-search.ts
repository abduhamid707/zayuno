import type { Offering } from '@zayuno/contracts';

const groups = [
  ['osh', 'palov', 'plov', 'pilaf', 'плов', 'ош'],
  ['lagmon', 'lagman', 'лагман', 'лағмон'],
  ['manti', 'manty', 'манты'], ['shorva', 'shurva', 'soup', 'шурпа'],
  ['shashlik', 'kebab', 'шашлык'], ['somsa', 'samsa', 'самса'],
  ['non', 'bread', 'лепешка'], ['gosht', 'meat', 'мясо'],
  ['guruch', 'rice', 'рис', 'guruchli'], ['sabzi', 'carrot', 'морковь', 'sabzili'],
];
const normalize = (s: string) => s.toLowerCase().replace(/[‘’'`ʻʼ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const tokens = (s: string) => normalize(s).split(/\s+/).filter(Boolean);
const aliases = (s: string) => groups.find(group => group.includes(s)) || [s];
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + Number(a[i - 1] !== b[j - 1]));
    row = next;
  }
  return row[b.length];
}

/** OR keyword matching, ranked on whole words; "osh" never matches "kartoshka". */
export function searchIikoCatalog(offerings: Offering[], query: string, limit?: number | null): Offering[] {
  const terms = [...new Set(tokens(query))];
  const ranked = offerings.map((offering, index) => {
    const title = normalize(offering.title);
    const titleWords = tokens(offering.title);
    const description = tokens(offering.description || '');
    const tags = tokens((offering.tags || []).join(' '));
    let score = title === normalize(query) && title ? 1000 : 0;
    for (const term of terms) {
      const variants = aliases(term);
      if (titleWords.includes(term)) score += 100;
      else if (variants.some(word => titleWords.includes(word))) score += 85;
      else if (term.length >= 4 && titleWords.some(word => word.startsWith(term))) score += 65;
      else if (variants.some(word => tags.includes(word))) score += 50;
      else if (variants.some(word => description.includes(word))) score += 25;
      else if (term.length >= 4 && titleWords.flatMap(aliases).some(word => word.length >= 3 && distance(term, word) <= (term.length >= 6 ? 2 : 1))) score += 10;
    }
    return { offering, score, index };
  }).filter(item => !terms.length || item.score > 0);
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, limit ?? ranked.length).map(item => item.offering);
}
