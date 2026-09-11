# Zayuno provider workspace

Provider-facing UI plus the canonical developer and AI-agent documentation site.

## Run and verify

From the repository root:

~~~sh
pnpm install --frozen-lockfile
pnpm --filter @zayuno/provider-portal dev
pnpm --filter @zayuno/provider-portal build
pnpm test:provider-portal-docs
pnpm test:docs-contract
pnpm test:review
~~~

Development: http://localhost:3001. Core API defaults to http://localhost:4000
locally or https://api.zayuno.uz on the production domain; VITE_API_URL can
override it. Browser testing of public pages does not require an account.
Authenticated provider operations require the actual backend and a test account.

## Where to edit

| Concern | Source |
| --- | --- |
| Shell, navigation, responsive sidebar | src/WorkspaceShell.tsx, src/workspace.css |
| Overview and next steps | src/WorkspaceOverview.tsx, src/workspace-model.ts |
| Provider state, API calls, dashboard, existing workflows | src/App.tsx |
| Canonical guide content | ../../docs/*.md |
| Guide routes, search keywords and heading IDs | src/docs-catalog.ts |
| Search and reader UI | src/DocsViewer.tsx, src/DocMarkdown.tsx, src/docs.css |
| Generated endpoint reference | src/contract-docs.ts |
| Static/agent resource generation | scripts/docs-site.ts, vite.config.ts |
| AI task and provider contract export | src/ai-integration-kit.ts |
| Protocol schemas and canonical examples | ../../packages/contracts/src |

Do not add a second copy of guide text inside JSX. Add a Markdown guide and its
entry in docs-catalog.ts. Contract examples must come from the canonical
provider-protocol definitions, not a hand-maintained document.

## Public documentation surfaces

- /?doc=base-url: interactive reader; legacy query-based links are preserved.
- /docs/: static index; /docs/{id}/: readable HTML without JavaScript.
- /docs/{id}.md: one plain Markdown guide.
- /llms.txt: compact AI-agent entry point.
- /llms-full.txt: combined documentation with source links.
- /docs/search-index.json: titles, keywords and guide text.
- /openapi.json and /postman.json: generated contract resources.
- /sitemap.xml and /robots.txt: discovery metadata.

The Vite plugin serves these in development and emits them into dist for
production. Do not hand-edit dist or commit generated copies into public.
infra/docker/Dockerfile.provider-portal copies the root docs folder before
building. New guide links and anchors are verified by test:provider-portal-docs.

## Workflow invariants

Next steps derive from provider facts, not the currently selected tab. Demo
sandbox, actual provider certification, review and ACTIVE publication are
different states. Preserve auth, tenant isolation, credential handoff, explicit
confirmation and idempotency.

Never show missing metrics as zero. Keep loading, error, empty and actual results
distinct. AI Kit copy success must follow the clipboard operation; failure offers
the Markdown download. Document completed and remaining work in root TASKS.md.
