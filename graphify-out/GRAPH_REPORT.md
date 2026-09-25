# Graph Report - Zayuno  (2026-09-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4520 nodes · 9408 edges · 248 communities (211 shown, 37 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 466 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fe07db38`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 230
- Community 233
- Community 234
- Community 236
- Community 244

## God Nodes (most connected - your core abstractions)
1. `ProvidersService` - 97 edges
2. `@nestjs/common` - 65 edges
3. `RedisService` - 52 edges
4. `ActionsService` - 49 edges
5. `CatalogService` - 45 edges
6. `ConsumerMemoryService` - 44 edges
7. `ProviderCapability` - 41 edges
8. `ProviderRegistryService` - 41 edges
9. `RemoteHttpProviderAdapter` - 41 edges
10. `ProvidersController` - 33 edges

## Surprising Connections (you probably didn't know these)
- `runHhRecruitmentTests()` --calls--> `createHhRecruitmentApp()`  [EXTRACTED]
  tests/test-hh-recruitment-provider.ts → integrations/hh-recruitment/src/server.ts
- `MockServerOptions` --references--> `ProviderCapability`  [EXTRACTED]
  tests/test-universal-provider-certification-strict.ts → packages/contracts/src/provider.ts
- `main()` --calls--> `CatalogService`  [EXTRACTED]
  tests/test-error-taxonomy-and-catalog-fallback.ts → apps/api/src/modules/catalog/catalog.service.ts
- `main()` --calls--> `CatalogService`  [EXTRACTED]
  tests/test-managed-connectors-and-uzum.ts → apps/api/src/modules/catalog/catalog.service.ts
- `runScaleAndResilienceSuite()` --calls--> `CatalogService`  [EXTRACTED]
  tests/test-v4-scale-and-resilience.ts → apps/api/src/modules/catalog/catalog.service.ts

## Import Cycles
- 3-file cycle: `packages/contracts/src/action.ts -> packages/contracts/src/provider.ts -> packages/contracts/src/webhook.ts -> packages/contracts/src/action.ts`

## Communities (248 total, 37 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (32): Roles(), ConnectorsController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Delete (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (66): CancelActionInput, CancelActionResult, CreateActionInput, GetActionInput, NormalizedAction, AvailabilityResult, Catalog, CheckAvailabilityInput (+58 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (71): destructiveHint, openWorldHint, readOnlyHint, app_info, category, description, developer_name, display_name (+63 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (27): d_works_dev_zayuno_apps_api_node_modules_nestjs_common_index_badrequestexception, d_works_dev_zayuno_apps_api_node_modules_nestjs_common_index_conflictexception, d_works_dev_zayuno_apps_api_node_modules_nestjs_common_index_forbiddenexception, d_works_dev_zayuno_apps_api_node_modules_nestjs_common_index_notfoundexception, ext_pnpm_zayuno_nestjs_commo_k5n4wrjpi3l7q44rsthbcvphgi_node_modules_nestjs_common_index_js, BaseProviderAdapter, SyntheticRetailConnector, extractUzumStatus() (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (49): defaultSuggestions, fallbackSuggestions, formatTime(), HomeScreen(), QuickSuggestion, styles, CartFlightHandle, CartFlightOverlay (+41 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (39): CategoryRibbon(), CategoryRibbonProps, styles, InChatCatalogWidgetProps, styles, Button(), ButtonProps, styles (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (6): ProvidersService, Injectable, main(), main(), provider(), main()

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (34): packages_contracts_dist_index_publicactionschema, AvailabilityStatus, AVAILABLE, ERROR, NOT_SUPPORTED, STALE, UNAVAILABLE, UNKNOWN (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (43): Asset, createDocsAssets(), escape(), DocsViewer, createContractReference(), CodeBlock(), DocMarkdown(), headingIds() (+35 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (49): actionCreateEp, actionTest, actionWithNullPublicId, cancelEp, catalogEp, catalogTest, catalogWithNullLocation, expressStarter (+41 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (37): ALLOWED_TRANSITIONS, canApplyPaymentStatus(), canTransitionAction(), isTerminalActionStatus(), TERMINAL_STATUSES, CommonModule, Global, Module (+29 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (14): assertDeclaredDynamicParameters(), CatalogService, Injectable, QuotesService, Injectable, Injectable, WebhooksService, runInvariantBreakerSuite() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (11): NatsService, Injectable, RedisService, Injectable, DeveloperSandboxService, Injectable, ProviderRegistryService, Injectable (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (32): runHttpSseServer(), runStdioServer(), ZAYUNO_MCP_PROMPTS, catalogMediaItemOutputProperties, catalogOfferingOutputProperties, catalogOfferingOutputSchema, jsonSchemaToZodShape(), quoteIdToIdempotencyKey (+24 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (38): packages_contracts_dist_index_providerfulfillmentmode, packages_contracts_dist_index_providerhealthmonitoringdata, packages_contracts_dist_index_providerhealthstate, packages_contracts_dist_index_requiresactivelocations, defaultFulfillmentModeForProviderType(), HealthCheckResultSchema, ProviderComplianceStatus, COMPLIANT (+30 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (33): executeSsrfSafeGet(), isCloudMetadataHost(), isPrivateOrReservedIp(), SsrfSafeGetResult, SsrfSecurityError, packages_shared_dist_index_istrustedinternalprovidertarget, isTrustedInternalProviderTarget(), TRUSTED_INTERNAL_PROVIDER_TARGETS (+25 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (41): CarClass, normalizeDate(), POYEZ_CATEGORIES, POYEZ_STATIONS, POYEZ_TRIPS, RailCarTemplate, RailTripTemplate, resolveTripOffering() (+33 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (37): ActionLocation, Address, AddressSchema, Coordinates, CoordinatesSchema, Currency, CurrencySchema, CustomerContact (+29 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (37): SANDBOX_CATEGORIES, SANDBOX_LOCATIONS, SANDBOX_OFFERINGS, packages_contracts_dist_index_authmethod, packages_contracts_dist_index_cancelactioninput, packages_contracts_dist_index_cancelactionresult, packages_contracts_dist_index_cancelactionresultschema, packages_contracts_dist_index_catalog (+29 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (25): ActionsModule, Module, AdminModule, Module, AuthModule, Module, CatalogModule, Module (+17 more)

### Community 20 - "Community 20"
Cohesion: 0.05
Nodes (38): devDependencies, tsx, @types/cors, @types/express, @types/node, @types/node-fetch, typescript, cors (+30 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (34): AdapterFactory, preflightRateLimiter, REVIEW_REASON_CODES, integrations_sandbox_provider_dist_index, integrations_sandbox_provider_dist_index_sandboxprovideradapter, packages_contracts_dist_index_defaultfulfillmentmodeforprovidertype, packages_contracts_dist_index_defaultprovidercategoryfortype, packages_contracts_dist_index_findprovidersresult (+26 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (29): AuthView, MANDATORY_PROVIDER_CAPABILITIES, PROTECTED_PROVIDER_TABS, PROVIDER_CAPABILITIES, providerSession, READONLY_CAPABILITIES, TRANSACTIONAL_MANDATORY_CAPABILITIES, AuthMode (+21 more)

### Community 23 - "Community 23"
Cohesion: 0.05
Nodes (27): ref_fs, files, fs, fs, m, m2, payload, fs (+19 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (28): assertActionRequirements(), fail(), ChatRequest, ChatResult, ConversationStore, packages_contracts_dist_index_actionlocationschema, packages_contracts_dist_index_conversationfield, packages_contracts_dist_index_conversationstate (+20 more)

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (34): config, { getDefaultConfig }, devDependencies, @expo/ngrok, sharp, @types/react, typescript, react (+26 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (32): ProviderFulfillmentMode, DELIVERY, HYBRID, ONSITE, PICKUP, REMOTE, ProviderStatus, ACTIVE (+24 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (34): autoprefixer, clsx, lucide-react, postcss, posthog-js, react, react-dom, tailwind-merge (+26 more)

### Community 28 - "Community 28"
Cohesion: 0.06
Nodes (36): dependencies, expo, expo-application, expo-auth-session, expo-build-properties, expo-constants, expo-crypto, expo-device (+28 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (31): AiFramework, AiIntegrationGoal, FRAMEWORK_OPTIONS, FrameworkOption, generateAiPrompt(), generateContractJson(), GeneratePromptOptions, generateUniversalAiPrompt() (+23 more)

### Community 30 - "Community 30"
Cohesion: 0.06
Nodes (35): dependencies, bcryptjs, class-transformer, class-validator, cors, dotenv, @google/generative-ai, helmet (+27 more)

### Community 31 - "Community 31"
Cohesion: 0.06
Nodes (34): bin, zayuno-mcp, dependencies, cors, dotenv, express, @modelcontextprotocol/sdk, @zayuno/contracts (+26 more)

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (31): AvailabilityResultSchema, CatalogCategory, CatalogCategorySchema, CatalogSchema, CheckAvailabilityInputSchema, GetCatalogInputSchema, GetOfferingInputSchema, LegacyOffering (+23 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (21): TRANSACTIONAL_CAPABILITIES, worker, ZayunoBackgroundWorker, packages_contracts_dist_index_connectordefinition, packages_contracts_dist_index_connectorshop, packages_database_dist_index_providercapability, packages_database_dist_index_providerstatus, packages_database_dist_index_providertype (+13 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (27): OnboardingWizard, CAPABILITY_AREAS, CertificationView(), CertificationViewProps, businessErrors(), BusinessFields, CERTIFICATION_VERSION, integrationErrors() (+19 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (13): MANDATORY_FIELD_NAMES, normalizeLegacyPaymentOptionsResponse(), normalizeLegacyQuoteResponse(), ProviderContractIssue, ProviderContractValidationError, validateProviderResponse(), valueAtPath(), valueKind() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.06
Nodes (32): cors, nats, rimraf, zod, main, name, private, scripts (+24 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (16): CurrentUser, AuthController, ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags, Body, Controller (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.06
Nodes (33): scripts, build, build:apk, clean, db:generate, db:migrate, db:migrate:deploy, db:push (+25 more)

### Community 39 - "Community 39"
Cohesion: 0.06
Nodes (31): bcryptjs, @prisma/client, dependencies, bcryptjs, dotenv, @prisma/client, @zayuno/contracts, @zayuno/shared (+23 more)

### Community 40 - "Community 40"
Cohesion: 0.09
Nodes (26): SelectedOption, SelectedOptionSchema, ActionLocationSchema, CustomerContactSchema, ConversationField, ConversationState, SemanticIntent, CapabilityRequirementsSchema (+18 more)

### Community 41 - "Community 41"
Cohesion: 0.14
Nodes (12): ProviderCertificationRunner, ref_node_assert, ref_node_crypto, ref_node_fs, ref_node_path, main(), main(), service (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (13): DevEmailTransport, EmailTransport, EmailVerificationService, ResendEmailTransport, Injectable, isSafePublicHttpsUrl(), LegacyOfferingSchema, MediaItemSchema (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.21
Nodes (7): PublicPagesController, ApiExcludeEndpoint, Controller, Get, Param, Req, Res

### Community 44 - "Community 44"
Cohesion: 0.18
Nodes (24): computeAvailableServiceCount(), formatCustomerActionCancellation(), formatCustomerActionConfirmation(), formatCustomerActionStatus(), formatCustomerAvailability(), packages_shared_src_customer_presenter_formatcustomercatalog, formatCustomerError(), formatCustomerGeneralHelp() (+16 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (22): ref_https, get(), https, run(), fetch(), https, run(), fetchHtml() (+14 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (4): IdempotencyInterceptor, Injectable, AuthService, Injectable

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (22): BrowserGoogleButton(), createConsumerSession(), NativeGoogleButton(), SessionResponse, styles, WelcomeScreen(), Session, useEmailSignIn() (+14 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (18): MOCK_EVOS_CATEGORIES, MOCK_EVOS_LOCATIONS, MOCK_EVOS_OFFERINGS, app, port, canCancel(), canSimulatePayment(), createMockEvosApp() (+10 more)

### Community 49 - "Community 49"
Cohesion: 0.10
Nodes (19): App(), DISCOVERY_REASON_LABELS, formatDiscoveryReason(), REVIEW_REASON_OPTIONS, apps_admin_src_index, adminAnalytics, initAdminAnalytics(), POSTHOG_HOST (+11 more)

### Community 50 - "Community 50"
Cohesion: 0.07
Nodes (26): ts-node, @zayuno/database, @zayuno/event-schemas, dependencies, dotenv, nats, @zayuno/contracts, @zayuno/database (+18 more)

### Community 52 - "Community 52"
Cohesion: 0.07
Nodes (26): dependencies, cors, dotenv, express, @zayuno/contracts, devDependencies, rimraf, tsx (+18 more)

### Community 53 - "Community 53"
Cohesion: 0.11
Nodes (23): packages_contracts_dist_index_mandatory_capabilities, packages_contracts_dist_index_optional_capabilities, packages_contracts_dist_index_selectedoption, CertificationIssue, CertificationMode, CertificationReport, CertificationRunOptions, CertificationTestResult (+15 more)

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (17): AgentErrorEnvelope, AgentErrorPresentation, AgentRecommendedAction, asRecord(), CapacityExceededError, ConflictError, EnvironmentNotAllowedError, ERROR_CODE_ALIASES (+9 more)

### Community 55 - "Community 55"
Cohesion: 0.14
Nodes (14): ConsumerMemoryController, ApiOperation, ApiTags, Body, Controller, Delete, Get, HttpCode (+6 more)

### Community 56 - "Community 56"
Cohesion: 0.08
Nodes (25): dependencies, cors, express, @zayuno/contracts, @zayuno/provider-sdk, @zayuno/shared, devDependencies, rimraf (+17 more)

### Community 57 - "Community 57"
Cohesion: 0.09
Nodes (23): ActionEvent, ActionEventSchema, ActionItemInput, ActionItemInputSchema, CancelActionInputSchema, CancelActionResultSchema, CancellationReasonCode, CancellationReasonCodeSchema (+15 more)

### Community 58 - "Community 58"
Cohesion: 0.08
Nodes (18): ref_node_http, actionsDb, catalogData, idempotencyDb, parseJsonBody(), sendJson(), server, { build } (+10 more)

### Community 59 - "Community 59"
Cohesion: 0.08
Nodes (24): @types/cors, dependencies, cors, dotenv, express, devDependencies, rimraf, ts-node (+16 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (12): ROLES_KEY, RolesGuard, Injectable, ConsumerJwt, ReportMessage, packages_contracts_dist_index_connectorauthtestinput, packages_contracts_dist_index_createconnectorinstanceinput, packages_contracts_dist_index_rotateconnectorcredentialinput (+4 more)

### Community 61 - "Community 61"
Cohesion: 0.08
Nodes (24): backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, allowBackup, blockedPermissions, package, versionCode (+16 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (19): AccountSheet(), Props, styles, KIND_LABELS, MemoryResponse, MemorySheet(), Props, Signal (+11 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (24): dependencies, cors, dotenv, express, @zayuno/contracts, zod, devDependencies, tsx (+16 more)

### Community 64 - "Community 64"
Cohesion: 0.08
Nodes (23): @types/express, dependencies, cors, dotenv, express, @zayuno/contracts, devDependencies, tsx (+15 more)

### Community 65 - "Community 65"
Cohesion: 0.09
Nodes (20): apps_api_src_common_sensitive_parameters_findforbiddenparameterkey, CacheEnvelope, CachePolicy, CATALOG_CACHE_POLICY, OFFERING_CACHE_POLICY, SEARCH_CACHE_POLICY, packages_contracts_dist_index_availabilityresult, packages_contracts_dist_index_availabilityresultschema (+12 more)

### Community 66 - "Community 66"
Cohesion: 0.15
Nodes (9): ApiKeyGuard, Injectable, JwtAuthGuard, Injectable, packages_contracts_dist_index_findprovidersinput, packages_contracts_dist_index_providerstatus, packages_contracts_dist_index_registerproviderinput, packages_contracts_dist_index_updateproviderintegrationinput (+1 more)

### Community 67 - "Community 67"
Cohesion: 0.21
Nodes (12): CatalogController, ApiOperation, ApiSecurity, ApiTags, Body, Controller, Get, Param (+4 more)

### Community 68 - "Community 68"
Cohesion: 0.12
Nodes (17): NavigationGuard(), styles, analytics, POSTHOG_API_KEY, POSTHOG_HOST, posthogClient, AuthState, clearStoredSession() (+9 more)

### Community 69 - "Community 69"
Cohesion: 0.11
Nodes (21): packages_contracts_dist_index_actionstatus, packages_contracts_dist_index_currency, packages_contracts_dist_index_paymentstatus, ActionCreatedEventPayload, ActionStatusChangedEventPayload, BaseEventPayload, PaymentStatusChangedEventPayload, ProviderErrorEventPayload (+13 more)

### Community 70 - "Community 70"
Cohesion: 0.09
Nodes (22): CompareOfferingsInput, CompareOfferingsInputSchema, CompareOfferingsResult, CompareOfferingsResultSchema, ComparisonAttribute, ComparisonAttributeSchema, ComparisonItem, ComparisonItemSchema (+14 more)

### Community 71 - "Community 71"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, declaration, declarationMap, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 72 - "Community 72"
Cohesion: 0.09
Nodes (21): @zayuno/provider-sdk, bin, zy, dependencies, @zayuno/contracts, @zayuno/provider-sdk, description, devDependencies (+13 more)

### Community 73 - "Community 73"
Cohesion: 0.20
Nodes (5): ActionsService, Injectable, main(), main(), main()

### Community 74 - "Community 74"
Cohesion: 0.19
Nodes (9): AdminController, ApiBearerAuth, ApiTags, Body, Controller, Param, Post, Put (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.10
Nodes (17): buildProperties, errors, mobileDir, requiredBuildArchs, androidResDir, assetsDir, colorForeground, featureSvg (+9 more)

### Community 76 - "Community 76"
Cohesion: 0.10
Nodes (20): @zayuno/shared, dependencies, @zayuno/contracts, @zayuno/shared, zod, devDependencies, rimraf, @types/node (+12 more)

### Community 77 - "Community 77"
Cohesion: 0.17
Nodes (3): ZayunoApiClient, ZayunoApiError, createZayunoMcpServer()

### Community 78 - "Community 78"
Cohesion: 0.16
Nodes (18): Props, styles, UniversalRenderer(), ChatInteraction, InteractionChoice, ChatMessage, ChatSession, ChatState (+10 more)

### Community 79 - "Community 79"
Cohesion: 0.21
Nodes (4): createSandboxMockApp(), SandboxMockInstance, SandboxProviderAdapter, main()

### Community 80 - "Community 80"
Cohesion: 0.14
Nodes (17): buildLegacyVerificationSql(), classifyMigrationState(), difference(), invokePrisma(), LEGACY_CORE_SIGNATURE, main(), packageDirectory, postgresTextArray() (+9 more)

### Community 81 - "Community 81"
Cohesion: 0.12
Nodes (12): ref_child_process, ref_modelcontextprotocol_sdk, ref_path, extractJsonArray(), fs, path, run(), BIN_DIR (+4 more)

### Community 82 - "Community 82"
Cohesion: 0.16
Nodes (15): apps_provider_portal_src_integrations, ConnectorDefinitionDto, ConnectorInstanceDto, connectorStatus(), createRequestGate(), formatSyncTime(), integrationsUrl(), ConnectorDefinitionDto (+7 more)

### Community 83 - "Community 83"
Cohesion: 0.13
Nodes (17): ref_node_https, actionsDb, buildCatalog(), catalogData, __dirname, DISCOVERY_CAPABILITIES, __filename, getCapabilities() (+9 more)

### Community 84 - "Community 84"
Cohesion: 0.10
Nodes (18): admin, adminAnalytics, chat, controller, dataSafety, demandMigration, history, home (+10 more)

### Community 86 - "Community 86"
Cohesion: 0.15
Nodes (14): AnalyticsModule, Global, Module, ProductAnalyticsService, Injectable, StoredUnmetDemand, UnmetDemandEvent, HistoryMessageInput (+6 more)

### Community 87 - "Community 87"
Cohesion: 0.23
Nodes (3): ConsumerAuthService, Injectable, main()

### Community 88 - "Community 88"
Cohesion: 0.18
Nodes (11): ConsumerChatController, ApiOperation, ApiTags, Body, Controller, Get, HttpCode, Post (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.23
Nodes (3): ConsumerChatService, Injectable, main()

### Community 90 - "Community 90"
Cohesion: 0.19
Nodes (14): certificationWebhookEvidence(), ActionStatus, AWAITING_PAYMENT, CANCELLED, COMPLETED, CONFIRMED, CREATED, FAILED (+6 more)

### Community 91 - "Community 91"
Cohesion: 0.16
Nodes (13): COFFEE_CATEGORIES, COFFEE_LOCATIONS, COFFEE_OFFERINGS, sizes, port, createCoffeeTimeSandboxApp(), webhook(), html() (+5 more)

### Community 92 - "Community 92"
Cohesion: 0.13
Nodes (17): packages_contracts_dist_index_mediaitemschema, packages_contracts_dist_index_safepublichttpsurlschema, ioredis, computeDeterministicMapping(), createRng(), GIFT_IMAGES, run(), args (+9 more)

### Community 93 - "Community 93"
Cohesion: 0.11
Nodes (18): dependencies, zod, zod-to-json-schema, devDependencies, rimraf, typescript, rimraf, zod (+10 more)

### Community 94 - "Community 94"
Cohesion: 0.11
Nodes (18): ProviderCategory, ACCOMMODATION, DIGITAL_SERVICES, FOOD_AND_DRINK, HEALTHCARE, HOME_SERVICES, LOGISTICS, OTHER (+10 more)

### Community 95 - "Community 95"
Cohesion: 0.15
Nodes (7): ActionCancellationError, CapacityExceededError, ProviderAuthenticationError, ProviderError, QuoteExpiredError, QuoteMismatchError, ResourceUnavailableError

### Community 96 - "Community 96"
Cohesion: 0.14
Nodes (14): EVOS_BRANCHES, EVOS_CATEGORIES, EVOS_PRODUCTS, EvosBranch, EvosCategory, EvosModifier, EvosModifierGroup, EvosProduct (+6 more)

### Community 97 - "Community 97"
Cohesion: 0.19
Nodes (11): ApiHeader, DeveloperSandboxController, ApiOperation, ApiTags, Body, Controller, Get, Headers (+3 more)

### Community 98 - "Community 98"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 99 - "Community 99"
Cohesion: 0.22
Nodes (12): ActionsController, ApiOperation, ApiSecurity, ApiTags, Body, Controller, Get, Param (+4 more)

### Community 100 - "Community 100"
Cohesion: 0.18
Nodes (6): ProviderHealthMonitorService, Injectable, packages_shared_dist_index_default_health_monitor_config, packages_shared_dist_index_evaluatehealthstatetransition, packages_shared_dist_index_healthmonitorconfig, packages_shared_dist_index_healthproberesult

### Community 101 - "Community 101"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 102 - "Community 102"
Cohesion: 0.20
Nodes (17): BaseModel, datetime, fastapi, os, auth(), catalog(), CatalogResponse, CategoryModel (+9 more)

### Community 103 - "Community 103"
Cohesion: 0.11
Nodes (17): ProviderCapability, ACTION_CANCEL, ACTION_CREATE, ACTION_STATUS, CATALOG, HEALTH, LOCATIONS, METADATA (+9 more)

### Community 104 - "Community 104"
Cohesion: 0.11
Nodes (18): $defs, longNonEmptyString, negativeTestCase, nonEmptyString, nullableString, shortNonEmptyString, maxLength, pattern (+10 more)

### Community 105 - "Community 105"
Cohesion: 0.14
Nodes (10): fullSql, LocationItem, OfferingItem, ProviderDef, PROVIDERS_25, createEcosystemApp(), EXTRA_8_PROVIDERS, LocationItem (+2 more)

### Community 106 - "Community 106"
Cohesion: 0.12
Nodes (16): @zayuno/contracts, dependencies, @zayuno/contracts, devDependencies, rimraf, typescript, rimraf, main (+8 more)

### Community 107 - "Community 107"
Cohesion: 0.29
Nodes (10): ConsumerAuthController, ApiOperation, ApiTags, Body, Controller, Get, HttpCode, Post (+2 more)

### Community 108 - "Community 108"
Cohesion: 0.12
Nodes (17): scripts, android, build:android:preview, build:android:production, build:apk, export:android, ios, lint (+9 more)

### Community 109 - "Community 109"
Cohesion: 0.12
Nodes (14): androidDir, appJsonPath, buildGradlePath, mobileApkPath, mobileDir, releaseApkPath, rootApkPath, rootApkVersionedPath (+6 more)

### Community 110 - "Community 110"
Cohesion: 0.15
Nodes (14): App(), ProviderAccount, providerProfileQuery(), ref_node_module, ref_node_vm, { build }, deferred(), main() (+6 more)

### Community 111 - "Community 111"
Cohesion: 0.12
Nodes (16): @types/node, dependencies, devDependencies, rimraf, @types/node, typescript, rimraf, main (+8 more)

### Community 112 - "Community 112"
Cohesion: 0.12
Nodes (16): dependsOn, outputs, cache, cache, persistent, dependsOn, $schema, tasks (+8 more)

### Community 114 - "Community 114"
Cohesion: 0.27
Nodes (3): LatencyMetric, MetricsCollector, main()

### Community 115 - "Community 115"
Cohesion: 0.23
Nodes (13): CONSUMER_GEMINI_MODEL, FoodConstraints, lowestAvailableFoodPrice(), normalizeFoodConstraints(), readFoodBudget(), main(), dish(), fixture() (+5 more)

### Community 116 - "Community 116"
Cohesion: 0.17
Nodes (12): ConsumerHistoryController, ApiOperation, ApiTags, Body, Controller, Delete, Get, HttpCode (+4 more)

### Community 117 - "Community 117"
Cohesion: 0.12
Nodes (15): dependencies, @modelcontextprotocol/sdk, description, engines, node, rimraf, sharp, tsx (+7 more)

### Community 118 - "Community 118"
Cohesion: 0.17
Nodes (14): packages_contracts_dist_index_providercompliancestatus, packages_contracts_dist_index_providerdiscoveryvisibility, packages_contracts_dist_index_provideroperatingprofile, asCapability(), CERTIFICATION_VERSION, evaluateProviderEligibility(), getProviderEligibilityPolicy(), getStoredProviderEligibilityPolicy() (+6 more)

### Community 119 - "Community 119"
Cohesion: 0.15
Nodes (11): isStructuredZayunoError(), ChatBody, ChatSelection, ConversationMessage, app, port, sampleOffering, packages_shared_dist_index_getagenterrorpresentation (+3 more)

### Community 120 - "Community 120"
Cohesion: 0.22
Nodes (11): projectPublicAction(), projectPublicActions(), d_works_dev_zayuno_packages_contracts_dist_index_issafepublichttpsurl, packages_contracts_dist_index, packages_contracts_dist_index_publicaction, { isSafePublicHttpsUrl }, testUrls, assertPublicAction() (+3 more)

### Community 121 - "Community 121"
Cohesion: 0.31
Nodes (4): ApiOperation, Get, Query, Res

### Community 122 - "Community 122"
Cohesion: 0.19
Nodes (3): Injectable, UnmetDemandService, testRepairPromptB()

### Community 124 - "Community 124"
Cohesion: 0.16
Nodes (10): ConsumerReportsController, ApiOperation, ApiTags, Body, Controller, Post, Req, UseGuards (+2 more)

### Community 125 - "Community 125"
Cohesion: 0.14
Nodes (11): PaymentsController, ApiOperation, ApiSecurity, ApiTags, Controller, Get, Param, Query (+3 more)

### Community 127 - "Community 127"
Cohesion: 0.20
Nodes (10): packages_database_src_index_userrole, checkReservedBrand(), extractBrandRoot(), normalizeForBrandComparison(), RESERVED_BRANDS, ReservedBrandDefinition, ReservedBrandMatchResult, ref_prisma_client (+2 more)

### Community 128 - "Community 128"
Cohesion: 0.13
Nodes (14): additionalProperties, $ref, description, $id, properties, app_info, $schema, schema_version (+6 more)

### Community 129 - "Community 129"
Cohesion: 0.13
Nodes (13): adminController, adminUi, apiReference, authentication, changelog, deploymentDoc, docsViewer, faqDoc (+5 more)

### Community 130 - "Community 130"
Cohesion: 0.20
Nodes (14): $ref, $ref, $ref, $ref, properties, properties, description, expected_output (+6 more)

### Community 131 - "Community 131"
Cohesion: 0.14
Nodes (12): accountSheet, apiClient, authController, authService, authStore, chatStore, historyController, historyService (+4 more)

### Community 132 - "Community 132"
Cohesion: 0.24
Nodes (9): devApiProxy(), docsSitePlugin(), ref_vite, ref_vitejs_plugin_react, close(), { createServer: createViteServer }, listen(), main() (+1 more)

### Community 133 - "Community 133"
Cohesion: 0.26
Nodes (9): AllExceptionsFilter, Catch, CapabilityNotSupportedError, buildAgentErrorEnvelope(), NotFoundError, ProviderIntegrationError, close(), listen() (+1 more)

### Community 134 - "Community 134"
Cohesion: 0.29
Nodes (9): ApiOperation, ApiTags, Body, Controller, Headers, Param, Post, Req (+1 more)

### Community 135 - "Community 135"
Cohesion: 0.15
Nodes (12): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 136 - "Community 136"
Cohesion: 0.33
Nodes (12): argv, baseUrl(), dev(), doctor(), has(), help(), init(), main() (+4 more)

### Community 137 - "Community 137"
Cohesion: 0.24
Nodes (10): packages_contracts_dist_index_catalogcategoryschema, packages_contracts_dist_index_issafepublichttpsurl, packages_contracts_dist_index_offeringschema, main(), sqlArray(), sqlEscape(), main(), prisma (+2 more)

### Community 138 - "Community 138"
Cohesion: 0.23
Nodes (11): packages_contracts_dist_index_paymentoption, packages_contracts_dist_index_publicpaymentoption, packages_contracts_dist_index_publicpaymentoptionschema, isSandboxPaymentOption(), toPublicPaymentOption(), toPublicPaymentOptions(), assertPublicPaymentOption(), cancelKeys (+3 more)

### Community 139 - "Community 139"
Cohesion: 0.21
Nodes (12): containsForbiddenSensitiveKey(), DynamicParameterDeclaration, DynamicParameterDeclarationSchema, DynamicParameterProperty, DynamicParameterPropertySchema, DynamicParameterPropertyType, DynamicParameterPropertyTypeSchema, findForbiddenParameterKey() (+4 more)

### Community 140 - "Community 140"
Cohesion: 0.21
Nodes (9): node-fetch, callMcp(), testCatalog(), callMcp(), runE2eTests(), callMcp(), testEcosystem(), callMcp() (+1 more)

### Community 141 - "Community 141"
Cohesion: 0.15
Nodes (8): categories, fs, fullData, outJsonPath, outMdPath, path, raw, rawDataPath

### Community 142 - "Community 142"
Cohesion: 0.24
Nodes (7): SemanticIntentResolver, SemanticTurn, packages_contracts_dist_index_semanticintent, packages_shared_dist_index_projectoffering, isDemoOrSandboxProvider(), @google/generative-ai, main()

### Community 143 - "Community 143"
Cohesion: 0.24
Nodes (9): McpToolDefinition, DEFAULT_OPENAI_APPS_CHALLENGE_TOKEN, getOpenAiAppsChallengeToken(), validateSubmissionManifest(), assertNoSecretLeakage(), EXPECTED_ANNOTATIONS, EXPECTED_TOOL_NAMES, FORBIDDEN_SECRET_KEYS (+1 more)

### Community 144 - "Community 144"
Cohesion: 0.17
Nodes (12): dependencies, clsx, lucide-react, posthog-js, react, react-dom, react-markdown, remark-gfm (+4 more)

### Community 145 - "Community 145"
Cohesion: 0.17
Nodes (12): devDependencies, ajv, dotenv, localtunnel, prettier, rimraf, sharp, tsx (+4 more)

### Community 146 - "Community 146"
Cohesion: 0.18
Nodes (11): devDependencies, @nestjs/cli, @nestjs/schematics, @nestjs/testing, rimraf, ts-node, @types/cors, @types/express (+3 more)

### Community 147 - "Community 147"
Cohesion: 0.24
Nodes (10): getDeclaredSchemas(), isNonEmptyObject(), isParameterObject(), mergeDynamicParameterDeclarations(), ParameterSchemaResolutionOptions, resolveDynamicParameterDeclaration(), unsupportedParameter(), packages_contracts_dist_index_dynamicparameterdeclaration (+2 more)

### Community 148 - "Community 148"
Cohesion: 0.24
Nodes (8): extractClientIp(), DEV_EPHEMERAL_SECRET, SimulatorSessionPayload, SimulatorSessionState, packages_contracts_dist_index_createactioninput, packages_contracts_dist_index_providercategory, packages_contracts_dist_index_providerenvironment, packages_contracts_dist_index_requestquoteinput

### Community 149 - "Community 149"
Cohesion: 0.18
Nodes (9): QuotesController, ApiOperation, ApiSecurity, ApiTags, Body, Controller, Post, Req (+1 more)

### Community 150 - "Community 150"
Cohesion: 0.22
Nodes (10): go_pkg_encoding_json, go_pkg_net_http, go_pkg_os, go_pkg_strings, go_pkg_time, net/http.Request, net/http.ResponseWriter, auth() (+2 more)

### Community 151 - "Community 151"
Cohesion: 0.29
Nodes (8): IdempotencyError, IdempotencyPayloadConflictError, controller, expectCanonicalMessage(), httpException(), HttpStatus, main(), publicErrorMessage()

### Community 152 - "Community 152"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, type, type, annotations, destructiveHint (+3 more)

### Community 154 - "Community 154"
Cohesion: 0.20
Nodes (9): assets, commands, dependencies, healthChecks, platforms, project, reactNativePath, reactNativeVersion (+1 more)

### Community 155 - "Community 155"
Cohesion: 0.44
Nodes (9): check_single_endpoint(), log_error(), log_info(), log_success(), log_warn(), main(), health-check.sh script, target_for_service() (+1 more)

### Community 156 - "Community 156"
Cohesion: 0.27
Nodes (8): packages_contracts_dist_index_catalogprojection, packages_contracts_dist_index_catalogprojectionschema, ProviderManifestSchema, profiles, projectCatalog(), projectOffering(), offering, original

### Community 157 - "Community 157"
Cohesion: 0.20
Nodes (10): additionalProperties, properties, type, enum, appInfo, $ref, category, display_name (+2 more)

### Community 158 - "Community 158"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, postcss, tailwindcss, @types/react, @types/react-dom, typescript, vite (+1 more)

### Community 159 - "Community 159"
Cohesion: 0.36
Nodes (8): ChatMarkdown, ChatMarkdownProps, getLinkTarget(), InlineContent(), LinkTarget, normalizeMarkdown(), openLink(), styles

### Community 160 - "Community 160"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, postcss, tailwindcss, @types/react, @types/react-dom, typescript, vite (+1 more)

### Community 161 - "Community 161"
Cohesion: 0.39
Nodes (7): createProviderSessionClient(), readSession(), refresh(), restore(), ProviderSession, main(), setup()

### Community 162 - "Community 162"
Cohesion: 0.25
Nodes (6): HhClientConfig, HhSearchOptions, port, HhServerConfig, packages_contracts_dist_index_catalogcategory, packages_contracts_dist_index_providertype

### Community 163 - "Community 163"
Cohesion: 0.25
Nodes (8): ref_pg, { Client }, crypto, encryptSecret(), env, envContent, fs, run()

### Community 164 - "Community 164"
Cohesion: 0.39
Nodes (8): ref_zlib, crc32(), crcTable, createPng(), main(), makeChunk(), renderZayunoIcon(), renderZayunoOgImage()

### Community 165 - "Community 165"
Cohesion: 0.22
Nodes (9): tool, additionalProperties, required, type, justifications, additionalProperties, properties, required (+1 more)

### Community 166 - "Community 166"
Cohesion: 0.22
Nodes (9): $ref, items, minItems, type, negative_test_cases, test_cases, items, minItems (+1 more)

### Community 167 - "Community 167"
Cohesion: 0.22
Nodes (8): categories, fs, fullData, outJsonPath, outMdPath, path, raw, rawPath

### Community 168 - "Community 168"
Cohesion: 0.25
Nodes (8): dependencies, clsx, lucide-react, posthog-js, react, react-dom, tailwind-merge, @tanstack/react-query

### Community 169 - "Community 169"
Cohesion: 0.25
Nodes (6): AppModule, Module, ref_cors, helmet, @nestjs/core, @nestjs/platform-express

### Community 170 - "Community 170"
Cohesion: 0.29
Nodes (5): getJwtSecret(), JwtStrategy, Injectable, @nestjs/passport, passport-jwt

### Community 171 - "Community 171"
Cohesion: 0.25
Nodes (7): compilerOptions, baseUrl, ignoreDeprecations, paths, strict, extends, expo/tsconfig.base

### Community 172 - "Community 172"
Cohesion: 0.39
Nodes (7): DEPLOY_SHA, IMAGE_PREFIX, log_error(), log_info(), log_success(), log_warn(), deploy-server.sh script

### Community 173 - "Community 173"
Cohesion: 0.25
Nodes (7): dependencies, express, express, private, scripts, dev, type

### Community 174 - "Community 174"
Cohesion: 0.32
Nodes (4): GetOfferingInput, Offering, SearchCatalogInput, SearchCapability

### Community 175 - "Community 175"
Cohesion: 0.25
Nodes (8): PaymentMethodType, CARD_ONLINE, CASH_ON_DELIVERY, CLICK, EXTERNAL_PROVIDER, INVOICE, PAYME, UZUM

### Community 177 - "Community 177"
Cohesion: 0.36
Nodes (7): extractJsonArray(), extractNextF(), fetchHtml(), fs, https, path, run()

### Community 179 - "Community 179"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 180 - "Community 180"
Cohesion: 0.29
Nodes (7): $ref, properties, $ref, destructive_justification, open_world_justification, read_only_justification, $ref

### Community 181 - "Community 181"
Cohesion: 0.38
Nodes (6): extractNextF(), fetch(), fs, https, path, run()

### Community 182 - "Community 182"
Cohesion: 0.33
Nodes (5): fs, get(), https, path, run()

### Community 183 - "Community 183"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 184 - "Community 184"
Cohesion: 0.33
Nodes (6): dependencies, cors, dotenv, express, node-fetch, @zayuno/contracts

### Community 185 - "Community 185"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 186 - "Community 186"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 187 - "Community 187"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 188 - "Community 188"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 189 - "Community 189"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 190 - "Community 190"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 191 - "Community 191"
Cohesion: 0.33
Nodes (6): PaymentStatus, AUTHORIZED, FAILED, PAID, PENDING, REFUNDED

### Community 192 - "Community 192"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 193 - "Community 193"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 194 - "Community 194"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 195 - "Community 195"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 196 - "Community 196"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 197 - "Community 197"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 198 - "Community 198"
Cohesion: 0.40
Nodes (5): fetchUrl(), fs, https, path, run()

### Community 199 - "Community 199"
Cohesion: 0.40
Nodes (5): fs, getJson(), https, path, run()

### Community 200 - "Community 200"
Cohesion: 0.40
Nodes (5): fetchHtml(), fs, https, path, run()

### Community 201 - "Community 201"
Cohesion: 0.40
Nodes (5): fetchEvosApi(), fs, https, path, run()

### Community 202 - "Community 202"
Cohesion: 0.40
Nodes (5): fetchHtml(), fs, https, path, run()

### Community 203 - "Community 203"
Cohesion: 0.40
Nodes (5): fetch(), fs, https, path, run()

### Community 204 - "Community 204"
Cohesion: 0.33
Nodes (3): apiBase, parameters, tomorrow

### Community 205 - "Community 205"
Cohesion: 0.33
Nodes (5): catalog, providers, redis, store, ticketOffering

### Community 206 - "Community 206"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 207 - "Community 207"
Cohesion: 0.60
Nodes (4): extractNextF(), fetch(), https, inspect()

### Community 208 - "Community 208"
Cohesion: 0.50
Nodes (4): fetch(), http, https, inspect()

### Community 209 - "Community 209"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 210 - "Community 210"
Cohesion: 0.50
Nodes (3): collection, $schema, sourceRoot

### Community 211 - "Community 211"
Cohesion: 0.50
Nodes (3): t, TranslationKeys, uz

### Community 213 - "Community 213"
Cohesion: 0.50
Nodes (4): $ref, tools, additionalProperties, type

### Community 214 - "Community 214"
Cohesion: 0.50
Nodes (4): nullableStringArray, type, items, type

### Community 215 - "Community 215"
Cohesion: 0.50
Nodes (4): positiveTestCase, additionalProperties, required, type

### Community 216 - "Community 216"
Cohesion: 0.67
Nodes (3): fetch(), https, run()

### Community 217 - "Community 217"
Cohesion: 0.67
Nodes (3): fetch(), https, run()

### Community 218 - "Community 218"
Cohesion: 0.67
Nodes (3): fetchHtml(), https, testNext()

### Community 219 - "Community 219"
Cohesion: 0.67
Nodes (3): get(), https, run()

## Knowledge Gaps
- **1630 isolated node(s):** `FindProvidersInput`, `FindProvidersResult`, `HealthCheckResult`, `ProviderComplianceWaiver`, `ProviderCredentials` (+1625 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2088 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `Community 19` to `Community 65`, `Community 66`, `Community 33`, `Community 36`, `Community 100`, `Community 7`, `Community 10`, `Community 170`, `Community 148`, `Community 21`, `Community 86`, `Community 119`, `Community 120`, `Community 24`, `Community 60`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `typescript` connect `Community 20` to `Community 64`, `Community 36`, `Community 39`, `Community 72`, `Community 59`, `Community 106`, `Community 76`, `Community 111`, `Community 50`, `Community 52`, `Community 117`, `Community 93`, `Community 56`, `Community 25`, `Community 27`, `Community 63`, `Community 31`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 30` to `Community 36`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `FindProvidersInput`, `FindProvidersResult`, `HealthCheckResult` to the rest of the system?**
  _1630 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08107502799552072 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.030339225991399904 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.060641627543035995 - nodes in this community are weakly interconnected._