import { DOCS_MENU } from './docs-catalog';
import { createContractReference } from './contract-docs';
const sources = import.meta.glob('../../../docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const DOCS_CONTENT = Object.fromEntries(DOCS_MENU.map(entry => [
  entry.id, entry.id === 'contract-reference' ? createContractReference() : sources['../../../docs/' + entry.file] || ''
]));
