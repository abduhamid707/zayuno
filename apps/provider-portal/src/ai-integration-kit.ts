import {
  ProviderCapability,
  ProviderCapabilityProfile,
  determineProviderCapabilityProfile,
  getMandatoryCapabilitiesForProfile,
  getProviderProtocolEndpoints,
  PROVIDER_CONTRACT_VERSION
} from '@zayuno/contracts';
import { redactForLogs, scrubSensitiveString } from '@zayuno/shared';

export type AiIntegrationGoal =
  | 'create-new'
  | 'implement-endpoint'
  | 'fix-hmac'
  | 'fix-quote'
  | 'fix-action'
  | 'fix-certification'
  | 'prepare-publishing';

export type AiFramework =
  | 'nodejs-express'
  | 'nestjs'
  | 'python-fastapi'
  | 'python-django'
  | 'php-laravel'
  | 'java-spring'
  | 'go'
  | 'dotnet'
  | 'raw-http';

export interface GoalOption {
  id: AiIntegrationGoal;
  labelUz: string;
  labelEn: string;
  descriptionUz: string;
  descriptionEn: string;
}

export interface FrameworkOption {
  id: AiFramework;
  name: string;
  language: string;
  tag: string;
}

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'create-new',
    labelUz: 'Yangi provider integratsiyasini yaratish',
    labelEn: 'Create New Provider Integration',
    descriptionUz: 'Zayuno universal capability arxitekturasi asosida noldan to‘liq provider API serverini yaratish.',
    descriptionEn: 'Scaffold a complete provider API server from scratch conforming to Zayuno capability specs.'
  },
  {
    id: 'implement-endpoint',
    labelUz: 'Mavjud endpointni implement qilish',
    labelEn: 'Implement Missing Endpoint',
    descriptionUz: 'Katalog (/catalog), kotirovka (/quote) yoki action (/actions) endpointlarini qo‘shish.',
    descriptionEn: 'Implement catalog, pricing quote, or action execution endpoints.'
  },
  {
    id: 'fix-hmac',
    labelUz: 'HMAC / Webhook imzosini tuzatish',
    labelEn: 'Fix HMAC Webhook Signatures',
    descriptionUz: 'Raw body asosida HMAC-SHA256 imzosi tekshiruvi va xavfsiz webhook dispatchni to‘g‘rilash.',
    descriptionEn: 'Fix HMAC-SHA256 signature verification over raw request body and webhook delivery.'
  },
  {
    id: 'fix-quote',
    labelUz: 'Quote hisoblash va mantiqiy xatoni tuzatish',
    labelEn: 'Fix Quote Math & Expiration',
    descriptionUz: 'Total = subtotal + fees - discount formulasi va lines taqsimoti xatolarini tuzatish.',
    descriptionEn: 'Resolve financial calculation discrepancies (total == subtotal + fees - discount) and line item math.'
  },
  {
    id: 'fix-action',
    labelUz: 'Action yaratish va Idempotency muammosini tuzatish',
    labelEn: 'Fix Action Dispatch & Idempotency',
    descriptionUz: 'Idempotency key himoyasi va provider-owned checkout URL (NextAction) handoffini to‘g‘rilash.',
    descriptionEn: 'Fix idempotency key replay handling and provider-owned checkout URL handoff.'
  },
  {
    id: 'fix-certification',
    labelUz: 'Certification test xatosini tuzatish',
    labelEn: 'Fix Certification Test Failures',
    descriptionUz: 'Avtomatlashtirilgan certification runner xatoliklarini tahlil qilib, API javoblarini to‘g‘rilash.',
    descriptionEn: 'Analyze automated capability certification failures and patch endpoint response schemas.'
  },
  {
    id: 'prepare-publishing',
    labelUz: 'Providerni publishingga tayyorlash',
    labelEn: 'Prepare for Public Publishing',
    descriptionUz: 'Barcha majburiy capabilitylarni yakunlab, jonli AI agentlar qidiruviga topshirish.',
    descriptionEn: 'Audit readiness, verify all mandatory capabilities, and prepare for live AI discovery.'
  }
];

export const FRAMEWORK_OPTIONS: FrameworkOption[] = [
  { id: 'nodejs-express', name: 'Node.js / Express', language: 'TypeScript / JavaScript', tag: 'Express' },
  { id: 'nestjs', name: 'NestJS', language: 'TypeScript', tag: 'NestJS' },
  { id: 'python-fastapi', name: 'Python / FastAPI', language: 'Python 3.10+', tag: 'FastAPI' },
  { id: 'python-django', name: 'Python / Django Ninja / DRF', language: 'Python 3.10+', tag: 'Django' },
  { id: 'php-laravel', name: 'PHP / Laravel', language: 'PHP 8.2+', tag: 'Laravel' },
  { id: 'java-spring', name: 'Java / Spring Boot', language: 'Java 17+', tag: 'Spring Boot' },
  { id: 'go', name: 'Go (Gin / Standard HTTP)', language: 'Go 1.21+', tag: 'Go' },
  { id: 'dotnet', name: '.NET / C# (ASP.NET Core)', language: 'C# / .NET 8', tag: 'ASP.NET Core' },
  { id: 'raw-http', name: 'Raw HTTP / cURL / Any Framework', language: 'HTTP REST', tag: 'HTTP' }
];

export interface GeneratePromptOptions {
  goal: AiIntegrationGoal;
  framework: AiFramework;
  provider?: any;
  certReport?: any;
  isAiTarget?: 'chatgpt' | 'claude' | 'cursor' | 'codex';
}

/**
 * Sanitizes and strips all secrets, keys, and PII from prompt generation context
 * using central redaction and explicit credential stripping.
 */
export function sanitizeContext(val: any): any {
  if (!val || typeof val !== 'object') return val;
  const redacted = redactForLogs(val);
  const copy = Array.isArray(redacted) ? [...redacted] : { ...redacted };
  const sensitiveKeys = [
    'secret', 'encryptedSecret', 'webhookSecret', 'apiKey', 'token',
    'password', 'passwordHash', 'phone', 'email', 'card', 'cvv', 'pan',
    'cookie', 'session', 'authorization'
  ];
  for (const k of Object.keys(copy)) {
    if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk.toLowerCase()))) {
      delete copy[k];
    } else if (typeof copy[k] === 'object' && copy[k] !== null) {
      copy[k] = sanitizeContext(copy[k]);
    }
  }
  return copy;
}

/**
 * Generates framework-tailored code skeletons and implementation tasks.
 */
function getFrameworkTask(framework: AiFramework, goal: AiIntegrationGoal): string {
  switch (framework) {
    case 'nodejs-express':
      return `### Framework: Node.js (TypeScript / Express)
- Use \`express.json({ verify: (req, res, buf) => { (req as any).rawBody = buf; } })\` so the raw body buffer is preserved for HMAC verification.
- Use \`crypto.createHmac('sha256', process.env.ZAYUNO_WEBHOOK_SECRET!).update(req.rawBody).digest('hex')\` for webhook signature verification.
- Omit undefined optional properties when serializing JSON responses; never emit explicit \`{ field: null }\` for optional properties.
- Return structured error responses with HTTP 400/404/409 matching Zayuno contract error structures.`;

    case 'nestjs':
      return `### Framework: NestJS
- Configure \`rawBody: true\` in \`NestFactory.create(AppModule, { rawBody: true })\`.
- Create a dedicated \`@Controller('zayuno')\` with endpoints: \`@Get('health')\`, \`@Get('provider-info')\`, \`@Get('catalog')\`, \`@Post('quote')\`, \`@Post('actions')\`, \`@Get('actions/:id')\`, \`@Post('webhooks')\`.
- Use an \`IdempotencyGuard\` or Redis-backed service for mutating \`POST /actions\` requests.
- Omit optional null properties using \`class-transformer\` or custom interceptor.`;

    case 'python-fastapi':
      return `### Framework: Python / FastAPI
- Use \`async def webhook(request: Request)\` and read \`raw_body = await request.body()\` before calculating \`hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()\`.
- Use Pydantic v2 models matching Zayuno schemas for automatic request/response validation.
- Add \`response_model_exclude_none=True\` to route decorators or use \`model.model_dump(exclude_none=True)\` to omit optional None fields.
- Mandatory fields (\`id\`, \`providerId\`, \`offeringCode\`, \`title\`, \`basePrice\`, \`currency\`) must never be None.
- Implement strict quote calculation: \`total = subtotal + fees - discount\`.`;

    case 'python-django':
      return `### Framework: Python / Django (Ninja / DRF)
- In Django views, access \`request.body\` directly for raw HMAC validation before parsing JSON.
- Store actions and quotes in Django models with an \`idempotency_key\` unique constraint.
- Ensure decimal precision is used for monetary computations.
- Exclude None values in serialization dictionary: \`{k: v for k, v in data.items() if v is not None or k in MANDATORY_FIELDS}\`.`;

    case 'php-laravel':
      return `### Framework: PHP / Laravel
- Read raw payload with \`$request->getContent()\` for \`hash_hmac('sha256', $rawBody, config('services.zayuno.webhook_secret'))\`.
- Use Laravel FormRequest validation for incoming quote and action payloads.
- Dispatch database transactions with unique \`idempotency_key\` locks.
- Clean optional nulls: \`array_filter($response, fn($v, $k) => !is_null($v) || in_array($k, $mandatoryFields), ARRAY_FILTER_USE_BOTH)\`.`;

    case 'java-spring':
      return `### Framework: Java / Spring Boot
- Use a \`ContentCachingRequestWrapper\` to read the raw request payload for HMAC-SHA256 signature verification.
- Create DTO records for \`NormalizedQuote\`, \`CreateActionInput\`, and \`NormalizedAction\`.
- Use \`@JsonInclude(JsonInclude.Include.NON_NULL)\` on DTO classes.
- Use \`@Transactional\` with unique database constraint on \`idempotencyKey\`.`;

    case 'go':
      return `### Framework: Go (net/http / Gin)
- Read request body using \`bodyBytes, _ := io.ReadAll(r.Body)\` and re-assign \`r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))\`.
- Calculate signature with \`h := hmac.New(sha256.New, []byte(secret)); h.Write(bodyBytes); sig := hex.EncodeToString(h.Sum(nil))\`.
- Structure responses using standard Go structs with \`json:"field,omitempty"\` tags on optional fields.
- Never add \`omitempty\` to mandatory fields (\`basePrice\`, \`title\`, \`providerSlug\`, \`currency\`).`;

    case 'dotnet':
      return `### Framework: .NET / C# (ASP.NET Core)
- Enable \`HttpRequest.EnableBuffering()\` to read the raw request body stream for HMAC-SHA256 verification.
- Define strongly-typed records matching Zayuno API contracts.
- Configure \`JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull\` or use \`[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]\` on optional properties.
- Use \`IMemoryCache\` or Distributed Redis Cache for idempotency keys.`;

    default:
      return `### Framework: Raw HTTP / cURL
- All endpoints must accept and return \`application/json; charset=utf-8\`.
- Verify HMAC-SHA256 signatures over the raw byte stream of incoming webhook requests.
- Omit optional null fields from JSON responses for optimal compatibility.
- Return explicit HTTP status codes (200 OK, 400 Bad Request, 404 Not Found, 409 Conflict).`;
  }
}

/**
 * Generates the full structured Markdown AI integration prompt.
 */
export function generateAiPrompt(options: GeneratePromptOptions): string {
  const { goal, framework, provider, certReport } = options;
  const goalObj = GOAL_OPTIONS.find(g => g.id === goal) || GOAL_OPTIONS[0];
  const fwObj = FRAMEWORK_OPTIONS.find(f => f.id === framework) || FRAMEWORK_OPTIONS[0];

  const sanitizedProvider = sanitizeContext(provider || {});
  const providerSlug = sanitizedProvider.slug || 'demo-provider';
  const providerName = sanitizedProvider.name || 'Demo Capability Provider';
  const providerType = sanitizedProvider.type || 'SERVICES';
  const declaredCaps: ProviderCapability[] = sanitizedProvider.capabilities || [
    ProviderCapability.METADATA,
    ProviderCapability.HEALTH,
    ProviderCapability.CATALOG,
    ProviderCapability.QUOTE,
    ProviderCapability.ACTION_CREATE,
    ProviderCapability.ACTION_STATUS,
    ProviderCapability.WEBHOOK
  ];

  const profile = determineProviderCapabilityProfile(declaredCaps);
  const mandatoryCaps = getMandatoryCapabilitiesForProfile(declaredCaps, { type: providerType });
  const isReadOnly = profile === ProviderCapabilityProfile.DISCOVERY_READONLY;

  // Redacted certification issues if any
  let issueSection = '';
  if (certReport && !certReport.isCertified && Array.isArray(certReport.tests)) {
    const failed = certReport.tests.filter((t: any) => (t.status || (t.passed ? 'PASS' : 'FAIL')) === 'FAIL');
    if (failed.length > 0) {
      issueSection = `
## 8. Current Certification Failure Context (Redacted)
The automated capability certification runner reported ${failed.length} failure(s):
${failed.map((f: any, idx: number) => `
### Failure ${idx + 1}: ${f.name} (${f.capability})
- **Test Type:** ${f.isMandatory ? 'MANDATORY' : 'OPTIONAL'}
- **Error:** \`${scrubSensitiveString(String(f.error || 'Unknown error'))}\`
- **Endpoint:** \`${f.endpoint || f.issue?.endpoint || 'unknown'}\`
- **Field path:** \`${f.issue?.path || 'not provided'}\`
- **Expected:** \`${f.issue?.expected || 'Provider Contract v1 response'}\`
- **Received:** \`${f.issue?.received || 'invalid response'}\`
- **Docs:** ${f.docsUrl || f.issue?.docsUrl || 'https://developers.zayuno.uz/?tab=docs&doc=spec-v1'}
- **Required Resolution:** Patch the endpoint to return the exact schema and response codes expected by Zayuno contracts.
`).join('\n')}`;
    }
  }

  const contractSection = getProviderProtocolEndpoints(profile)
    .filter(endpoint => endpoint.required || declaredCaps.includes(endpoint.capability as ProviderCapability))
    .map((endpoint, index) => `${index + 1}. **${endpoint.summary}** \`${endpoint.method} ${endpoint.path}\`
   - Capability: \`${endpoint.capability}\` (${endpoint.required ? 'REQUIRED' : 'OPTIONAL / DECLARED'})
   ${endpoint.requestExample === undefined ? '' : `- Request: \`${JSON.stringify(endpoint.requestExample)}\``}
   - Canonical response: \`${JSON.stringify(endpoint.responseExample)}\`
   - Docs: https://developers.zayuno.uz/?tab=docs&doc=spec-v1#${endpoint.docsAnchor}`)
    .join('\n');

  const rawPrompt = `# Zayuno Provider Integration Task

## 1. Goal
**${goalObj.labelEn}** (${goalObj.labelUz})
> ${goalObj.descriptionEn}

---

## 2. Product Context
Zayuno is an AI Agent Business Network that enables conversational AI agents (ChatGPT, Claude, Cursor, Codex) to discover and interact with real-world business services through normalized capability contracts.

The universal lifecycle follows four strict stages:
1. **Discover:** AI explores provider offerings and real-time catalog items.
2. **Quote:** AI requests an exact, verified itemized pricing quote with fee breakdowns.
3. **Confirm:** AI presents the price and terms to the user for explicit confirmation.
4. **Action:** Once confirmed, AI creates the action with an idempotency key and hands off payment via a provider-owned checkout URL (\`nextAction\`).

---

## 3. Provider Profile
- **Provider Slug:** \`${providerSlug}\`
- **Provider Name:** \`${providerName}\`
- **Provider Type:** \`${providerType}\`
- **Capability Profile:** \`${profile}\` (${isReadOnly ? 'Read-only / Discovery only' : 'Full Transactional'})
- **Declared Capabilities:** \`${declaredCaps.join(', ')}\`
- **Mandatory for this Profile:** \`${mandatoryCaps.join(', ')}\`
- **Physical Locations:** ${declaredCaps.includes(ProviderCapability.LOCATIONS) ? 'Required (Physical delivery/retail)' : 'Not Required (Digital/remote service)'}

---

## 4. Contract Specification

Provider Contract version: \`${PROVIDER_CONTRACT_VERSION}\`

${contractSection}

Compatibility note: new integrations emit canonical \`id/lines\` quote fields and a top-level payment-options array. Legacy aliases are accepted only at the adapter migration boundary.

---

## 5. Security & Privacy Rules
1. **Zero Secret Leakage:** Never hardcode secrets, API keys, or tokens in source files or AI prompts. Use environment variables (\`process.env\` / \`os.environ\`).
2. **HMAC Signature Verification:** HMAC-SHA256 must be computed over the **raw, unparsed body buffer**.
3. **Idempotency Guarantee:** Mutating action requests must respect \`idempotencyKey\` and return identical results on duplicates.
4. **Provider-Owned Checkout:** Zayuno never processes credit cards directly. Always return provider-owned payment URLs in \`nextAction\`.
5. **Customer PII Protection:** Mask or redact customer phone numbers and names in application logs.

---

## 6. Framework-Specific Task (${fwObj.name})
${getFrameworkTask(framework, goal)}

---

## 7. Verification Steps
1. **Local Test:** Start local server on port \`4001\` and verify \`GET /health\` and \`GET /catalog\`.
2. **Simulator Test:** Open Zayuno Developer Portal &rarr; **Sandbox Simulator** tab and execute the step-by-step lifecycle.
3. **Automated Certification:** Open **Certification** tab and run the automated test harness until 100% pass rate is achieved.
${issueSection}
---

## 9. Constraints
- Do NOT bypass or weaken authentication, idempotency, or HMAC signature checks.
- Do NOT generate fake providers or fake certification success flags.
- Follow the universal capability contract schemas strictly.
- Write unit and integration tests covering the implemented endpoints.
`;

  return scrubSensitiveString(rawPrompt, 100000);
}

/**
 * Generates a profile-aware JSON schema export of the provider contract.
 */
export function generateContractJson(provider?: any): string {
  const clean = sanitizeContext(provider || {});
  const declaredCaps: ProviderCapability[] = clean.capabilities || [
    ProviderCapability.METADATA,
    ProviderCapability.HEALTH,
    ProviderCapability.CATALOG,
    ProviderCapability.QUOTE,
    ProviderCapability.ACTION_CREATE,
    ProviderCapability.ACTION_STATUS,
    ProviderCapability.WEBHOOK
  ];

  const profile = determineProviderCapabilityProfile(declaredCaps);
  const isReadOnly = profile === ProviderCapabilityProfile.DISCOVERY_READONLY;

  const endpoints = Object.fromEntries(
    getProviderProtocolEndpoints(profile)
      .filter(endpoint => endpoint.required || declaredCaps.includes(endpoint.capability as ProviderCapability))
      .map(endpoint => [endpoint.id, {
        method: endpoint.method,
        path: endpoint.path,
        required: endpoint.required,
        responseExample: endpoint.responseExample,
        docsAnchor: endpoint.docsAnchor
      }])
  );

  const exportData = {
    contractVersion: PROVIDER_CONTRACT_VERSION,
    profile,
    generatedAt: new Date().toISOString(),
    provider: {
      slug: clean.slug || 'demo-provider',
      name: clean.name || 'Demo Capability Provider',
      type: clean.type || 'SERVICES',
      capabilities: declaredCaps
    },
    endpoints
  };

  return JSON.stringify(exportData, null, 2);
}
