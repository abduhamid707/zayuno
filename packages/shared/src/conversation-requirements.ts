import { ConversationField, ConversationState, ProviderManifest, validateParametersAgainstDeclaration } from '@zayuno/contracts';

const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
export function readField(value: any, path: string): any {
  return path.split('.').reduce((node, key) => unsafe.has(key) || !node || !Object.prototype.hasOwnProperty.call(node, key) ? undefined : node[key], value);
}
export function writeField(value: any, path: string, supplied: unknown): void {
  const keys = path.split('.');
  if (keys.some(key => !key || unsafe.has(key))) throw new Error('Invalid field path');
  let current = value;
  for (const key of keys.slice(0, -1)) current = current[key] ??= {};
  current[keys[keys.length - 1]] = supplied;
}
const absent = (value: unknown) => value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);

export function manifestOf(provider: any): ProviderManifest | undefined {
  return provider?.manifest || provider?.metadata?.manifest;
}

/** Required paths accumulate; no business domain or provider identity participates. */
export function conversationRequirements(state: ConversationState, capability = 'QUOTE'): ConversationField[] {
  const result = new Map<string, ConversationField>();
  const add = (path: string, schema: any = {}) => {
    if (path === 'items' && state.selectedOffering) return;
    if (absent(readField(state, path))) result.set(path, { path, title: schema.title || path, type: schema.type || 'string',
      format: schema.format, enum: schema.enum, schema });
  };
  const visit = (schema: any, prefix: string) => {
    if (!schema) return;
    for (const key of schema.required || []) {
      const child = schema.properties?.[key] || {};
      const path = `${prefix}.${key}`;
      if (child.type === 'object' && child.required?.length) visit(child, path);
      else add(path, child);
    }
    for (const [key, child] of Object.entries(schema.properties || {}) as [string, any][]) {
      if (!(schema.required || []).includes(key) && !absent(readField(state, `${prefix}.${key}`)) && child.type === 'object') visit(child, `${prefix}.${key}`);
    }
  };
  const manifest = state.manifest;
  const requirement = manifest?.requirements?.[capability];
  const fulfillment = manifest?.fulfillmentRequirements?.[state.fulfillment || ''];
  const quoteRequirements = capability === 'ACTION_CREATE' ? state.quote?.requirements : undefined;
  for (const declaration of [manifest?.parametersSchema, state.parametersSchema, state.selectedOffering?.parametersSchema,
    requirement?.parametersSchema, fulfillment?.parametersSchema, quoteRequirements?.parametersSchema]) visit(declaration, 'parameters');
  for (const path of [...(requirement?.required || []), ...(fulfillment?.required || []), ...(quoteRequirements?.required || [])]) {
    const parameterName = path.startsWith('parameters.') ? path.slice(11) : undefined;
    add(path, parameterName ? requirement?.parametersSchema?.properties?.[parameterName] || manifest?.parametersSchema?.properties?.[parameterName] : undefined);
  }
  const contacts = [capability === 'ACTION_CREATE' ? manifest?.customerRequirements : undefined,
    requirement?.customerRequirements, fulfillment?.customerRequirements, quoteRequirements?.customerRequirements];
  for (const source of contacts) {
    for (const [key, required] of Object.entries(source || {})) if (required === 'REQUIRED') add(`customer.${key}`,
      { title: key, type: 'string', ...(key === 'email' ? { format: 'email' } : {}) });
  }
  for (const location of manifest?.supportedLocationRoles || []) {
    if (location.required && !state.locations.some(item => item.role === location.role && (item.address?.raw || item.locationId))) {
      result.set(`locations.${location.role}`, { path: `locations.${location.role}`, title: location.title || location.role, type: 'location' });
    }
  }
  if (state.selectedOffering) {
    const variants = (state.selectedOffering.variants || []).filter(variant => variant.isAvailable !== false);
    if (variants.length && !state.selectedVariant) add('selectedVariant', { title: 'Variant', enum: variants.map(variant => variant.id) });
    for (const group of state.selectedOffering.optionGroups || []) {
      const count = state.selectedOptions.filter(option => option.groupId === group.id).length;
      if (count < Math.max(group.minSelections || 0, group.isRequired ? 1 : 0)) {
        result.set(`selectedOptions.${group.id}`, { path: `selectedOptions.${group.id}`, title: group.name, type: 'option',
          enum: (group.options || []).filter(option => option.isAvailable !== false).map(option => option.id) });
      }
    }
  }
  if (manifest?.supportedFulfillmentModes?.length && !state.fulfillment) add('fulfillment', { title: 'Fulfillment', enum: manifest.supportedFulfillmentModes });
  return [...result.values()];
}

export function validateSlot(field: ConversationField, value: unknown): boolean {
  if (absent(value)) return false;
  const schema = field.schema || { type: field.type === 'location' || field.type === 'option' ? 'string' : field.type, ...(field.enum ? { enum: field.enum } : {}) };
  if (schema.format === 'email' && (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) return false;
  if (schema.format === 'date') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  }
  if (schema.format === 'date-time' && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) return false;
  return validateParametersAgainstDeclaration({ value }, { type: 'object', properties: { value: schema }, required: ['value'], additionalProperties: false }).success;
}
