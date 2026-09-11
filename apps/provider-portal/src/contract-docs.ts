import { PROVIDER_CONTRACT_VERSION, PROVIDER_PROTOCOL_ENDPOINTS } from '@zayuno/contracts';
export function createContractReference() {
  const json = (value: unknown) => '```json\n' + JSON.stringify(value, null, 2) + '\n```';
  return `# Provider API reference

Contract version: **${PROVIDER_CONTRACT_VERSION}**. This page is generated from \`packages/contracts/src/provider-protocol.ts\`. Do not edit examples independently.

Implement ZAYUNO_TO_PROVIDER routes on **your provider backend**. The webhook entry is PROVIDER_TO_ZAYUNO. Core management routes live in the separate [Zayuno Core API guide](api-reference.md).

- [OpenAPI 3.1 JSON](/openapi.json) — schemas, required fields and request/response examples.
- [Postman collection](/postman.json) — requests with environment placeholders.
- [Capabilities](capabilities.md) — read-only vs transactional; physical fulfillment also requires active locations.
- [Authentication](authentication.md) — outbound auth and inbound webhook signing are separate.

Provider-to-Zayuno status events use \`POST https://api.zayuno.uz/api/v1/webhooks/{providerSlug}\`.
Never send production status updates to your own backend URL.

## Request parameters {#contract-parameters}

Use the IDs and field names from the request schema. Base URLs, path parameters and query parameters are not interchangeable. Encode path IDs, send JSON bodies for POST requests, and use the authentication mode selected in the portal.

${PROVIDER_PROTOCOL_ENDPOINTS.map((endpoint, index) => `## ${endpoint.method} ${endpoint.path} {#${PROVIDER_PROTOCOL_ENDPOINTS.findIndex(item => item.docsAnchor === endpoint.docsAnchor) === index ? endpoint.docsAnchor : 'contract-' + endpoint.id}}

${endpoint.summary}

| Property | Value |
| --- | --- |
| Capability | \`${endpoint.capability}\` |
| Direction | \`${endpoint.direction || 'ZAYUNO_TO_PROVIDER'}\` |
| Profiles | ${endpoint.profiles.join(', ')} |
| Requirement | ${endpoint.required ? 'Required in the listed profiles' : 'When declared; see fulfillment/location requirements'} |
| Request schema | ${endpoint.requestSchemaName || 'No JSON request body'} |
| Response schema | ${endpoint.responseSchemaName} |

### Request

${endpoint.requestExample === undefined ? `\`${endpoint.method} ${endpoint.path}\` — no JSON body.` : json(endpoint.requestExample)}

### Response example

${json(endpoint.responseExample)}

Required ${endpoint.direction === 'PROVIDER_TO_ZAYUNO' ? 'event request' : 'response'} fields: ${endpoint.requiredFields.map(field => '\`' + field + '\`').join(', ') || 'See OpenAPI schema'}.
`).join('\n')}
`;
}
