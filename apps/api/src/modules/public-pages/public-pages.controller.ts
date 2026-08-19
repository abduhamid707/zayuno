import { Controller, Get, Res, Param } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class PublicPagesController {
  @Get('health')
  @ApiExcludeEndpoint()
  health() {
    return { status: 'ok', service: 'zayuno-api', timestamp: new Date().toISOString() };
  }
  
  // 1. Static Asset Serving: /assets/:filename
  @Get('assets/:filename')
  @ApiExcludeEndpoint()
  serveAsset(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const assetPath = path.join(process.cwd(), 'apps/api/public/assets', safeName);
    
    if (fs.existsSync(assetPath)) {
      if (safeName.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (safeName.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      else if (safeName.endsWith('.ico')) res.setHeader('Content-Type', 'image/x-icon');
      return res.sendFile(assetPath);
    }
    return res.status(404).send('Asset not found');
  }

  // 2. Favicon
  @Get('favicon.ico')
  @ApiExcludeEndpoint()
  serveFavicon(@Res() res: Response) {
    const faviconPath = path.join(process.cwd(), 'apps/api/public/assets/favicon.ico');
    if (fs.existsSync(faviconPath)) {
      res.setHeader('Content-Type', 'image/x-icon');
      return res.sendFile(faviconPath);
    }
    return res.status(404).send('Not found');
  }

  // 3. Main Landing Page: /
  @Get()
  @ApiExcludeEndpoint()
  getLandingPage(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.renderLandingHtml());
  }

  // 4. Privacy Policy: /privacy
  @Get('privacy')
  @ApiExcludeEndpoint()
  getPrivacyPolicy(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.renderPrivacyHtml());
  }

  // 5. Terms of Service: /terms
  @Get('terms')
  @ApiExcludeEndpoint()
  getTermsOfService(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.renderTermsHtml());
  }

  // 6. Customer Support: /support
  @Get('support')
  @ApiExcludeEndpoint()
  getCustomerSupport(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.renderSupportHtml());
  }

  // =========================================================================
  // SHARED TEMPLATES
  // =========================================================================

  private getSharedHead(title: string, description: string): string {
    return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>`;
  }

  private getSharedNavbar(): string {
    return `
  <header class="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3 group">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
          Z
        </div>
        <span class="text-xl font-extrabold tracking-tight text-white">ZAYUNO</span>
        <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTION INFRASTRUCTURE</span>
      </a>

      <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <a href="/" class="hover:text-white transition">Platform</a>
        <a href="/tools" class="hover:text-white transition">MCP Tools</a>
        <a href="/support" class="hover:text-white transition">Support</a>
        <a href="/privacy" class="hover:text-white transition">Privacy</a>
        <a href="/terms" class="hover:text-white transition">Terms</a>
      </nav>

      <div class="flex items-center gap-3">
        <a href="/mcp" class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          /mcp
        </a>
      </div>
    </div>
  </header>`;
  }

  private getSharedFooter(): string {
    return `
  <footer class="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">Z</div>
            <span class="text-base font-bold text-white tracking-tight">ZAYUNO</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Capability-based action infrastructure enabling conversational AI agents to discover providers, request quotes, execute confirmed actions, and track fulfillment.
          </p>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Endpoints</h4>
          <ul class="space-y-2 text-xs">
            <li><a href="/tools" class="hover:text-white transition">MCP Tool Discovery (/tools)</a></li>
            <li><a href="/mcp" class="hover:text-white transition">Streamable HTTP (/mcp)</a></li>
            <li><a href="/sse" class="hover:text-white transition">SSE Streaming (/sse)</a></li>
            <li><a href="/api/v1/providers" class="hover:text-white transition">Providers Registry API</a></li>
          </ul>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Legal & Governance</h4>
          <ul class="space-y-2 text-xs">
            <li><a href="/privacy" class="hover:text-white transition">Privacy Policy</a></li>
            <li><a href="/terms" class="hover:text-white transition">Terms of Service</a></li>
            <li><a href="/support" class="hover:text-white transition">Customer Support</a></li>
          </ul>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Architecture Notice</h4>
          <p class="text-xs text-slate-500 leading-relaxed">
            Zayuno acts as a neutral action middleware. Payments occur directly on provider-supplied external checkout links. Card credentials are never handled by Zayuno.
          </p>
        </div>
      </div>

      <div class="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 Zayuno Action Infrastructure. All rights reserved.</p>
        <p class="font-mono">Tashkent, Uzbekistan</p>
      </div>
    </div>
  </footer>`;
  }

  // =========================================================================
  // PAGE RENDERERS
  // =========================================================================

  private renderLandingHtml(): string {
    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  ${this.getSharedHead('Zayuno — Capability-Based Action Infrastructure for AI Agents', 'Zayuno is the capability-based action infrastructure connecting conversational AI agents (ChatGPT, Claude) to independently integrated providers.')}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  ${this.getSharedNavbar()}

  <main class="flex-grow">
    <!-- Hero Section -->
    <section class="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24 border-b border-slate-900">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]"></div>
      
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          OpenAI Apps SDK & Remote MCP Ready
        </div>

        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-6">
          Action Infrastructure for <br class="hidden sm:inline">
          <span class="bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">Conversational AI</span>
        </h1>

        <p class="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed mb-8">
          Zayuno connects AI assistants to verified external providers through standardized capability contracts. Discover offerings, calculate itemized quotes, execute explicitly confirmed actions, and track fulfillment in real time.
        </p>

        <!-- Sandbox Provider Notice -->
        <div class="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm text-left mb-8 flex items-start gap-3">
          <span class="text-lg">🧪</span>
          <div>
            <strong class="font-bold text-amber-300 block mb-0.5">Developer Sandbox & Testing Environment:</strong>
            Try the domain-neutral <code>sandbox-provider</code> or the clearly labelled <code>mock-evos</code> food-delivery demo. Both use simulated actions and provider-owned sandbox checkout handoffs; no real payment is processed.
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <a href="https://developers.zayuno.uz" class="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition duration-150">
            Explore Developer Portal →
          </a>
          <a href="https://developers.zayuno.uz/docs" class="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition duration-150">
            View Documentation →
          </a>
          <a href="https://developers.zayuno.uz/docs#sandbox" class="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition duration-150">
            Try the Sandbox →
          </a>
        </div>
      </div>
    </section>

    <!-- Architecture & Features Grid -->
    <section class="py-16 bg-slate-900/40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Core Architecture Principles</h2>
          <p class="text-sm text-slate-400 mt-2">Engineered for high-reliability, zero-hallucination agentic action execution.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4">🛡️</div>
            <h3 class="text-base font-bold text-white mb-2">Explicit Confirmation Guardrail</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Agents are strictly required by MCP tool definitions to run <code>request_quote</code> first, display line-item breakdowns, and obtain explicit user consent before calling <code>create_action</code>.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg mb-4">💳</div>
            <h3 class="text-base font-bold text-white mb-2">Provider-Supplied Payment Links</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Zayuno never requests or stores payment card credentials in chat. Actions return secure external checkout URLs directly from the provider.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg mb-4">⚡</div>
            <h3 class="text-base font-bold text-white mb-2">Capability-Based Architecture</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Providers implement only the capabilities they support (e.g. Catalog, Quote, Create, Status, Cancel, Locations). The core dynamically verifies capabilities before execution.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive E2E Flow Visualizer -->
    <section class="py-16 border-t border-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-xl sm:text-2xl font-bold text-white text-center mb-8">Standard Agent Action Execution Flow</h2>

        <div class="space-y-4 font-mono text-xs">
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md font-bold">1. Discovery</span>
              <span class="text-slate-300">get_catalog(providerSlug: "sandbox-provider")</span>
            </div>
            <span class="text-emerald-400 font-bold">200 OK • Live Offerings</span>
          </div>

          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md font-bold">2. Quote</span>
              <span class="text-slate-300">request_quote(items: [1x standard_pkg])</span>
            </div>
            <span class="text-emerald-400 font-bold">Total: 60,000 UZS (Verified)</span>
          </div>

          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md font-bold">3. Confirm & Execute</span>
              <span class="text-slate-300">create_action(idempotencyKey, quoteId)</span>
            </div>
            <span class="text-emerald-400 font-bold">Status: AWAITING_PAYMENT</span>
          </div>

          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md font-bold">4. Payment URL</span>
              <span class="text-slate-300">get_payment_options(actionId)</span>
            </div>
            <span class="text-cyan-400 font-bold">Provider-supplied HTTPS URL</span>
          </div>

          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-md font-bold">5. Webhook Ingest</span>
              <span class="text-slate-300">POST /api/v1/webhooks/sandbox-provider</span>
            </div>
            <span class="text-emerald-400 font-bold">Action: ACCEPTED / COMPLETED</span>
          </div>
        </div>
      </div>
    </section>
  </main>

  ${this.getSharedFooter()}
</body>
</html>`;
  }

  private renderPrivacyHtml(): string {
    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  ${this.getSharedHead('Privacy Policy — Zayuno Action Infrastructure', 'Privacy Policy for Zayuno: how we process action parameters, customer details, and provider checkout redirection.')}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-10">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        <p class="text-xs text-slate-400 mt-2 font-mono">Effective Date: August 17, 2026</p>
      </div>

      <div class="prose prose-invert max-w-none text-slate-300 text-sm space-y-8 leading-relaxed">
        
        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">1. Overview & Scope</h2>
          <p>
            Zayuno ("we", "us", "our") provides capability-based action infrastructure and middleware connecting conversational AI applications (such as ChatGPT, Claude, and autonomous agents) with independently integrated external provider adapters.
          </p>
          <p>
            This Privacy Policy explains how data is handled when you interact with Zayuno through conversational AI interfaces or direct API endpoints.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">2. Information We Process</h2>
          <p>When an AI agent executes an action or requests a quote on your behalf, Zayuno processes minimal operational data necessary for fulfillment:</p>
          <ul class="list-disc pl-5 space-y-1.5 text-slate-300">
            <li><strong>Customer Contact Details:</strong> Name, phone number, and optional email provided to the conversational agent for action fulfillment.</li>
            <li><strong>Action Specifications:</strong> Selected offerings, variants, custom options, and quantity.</li>
            <li><strong>Fulfillment Destination:</strong> Optional destination address or location metadata necessary for dispatch.</li>
            <li><strong>Technical Interaction Data:</strong> Unique action identifiers, idempotency keys, and server timestamps.</li>
          </ul>
        </section>

        <section class="space-y-3 p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h2 class="text-base font-bold text-emerald-400 flex items-center gap-2">
            <span>🔒</span> 3. Payment Processing & Zero Card Data Policy
          </h2>
          <p class="text-slate-300">
            <strong>Zayuno NEVER collects, processes, transmits, or stores sensitive payment card credentials</strong> (including credit/debit card numbers, CVV/CVC codes, passwords, OTPs, or banking logins).
          </p>
          <p class="text-slate-300">
            Payment transactions occur exclusively on provider-supplied external checkout links via secure HTTPS redirection. Zayuno receives only a cryptographically signed HMAC webhook indicating whether the transaction was completed or failed.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">4. Third-Party Provider Data Transmission</h2>
          <p>
            To fulfill actions, contact details and action parameters are transmitted strictly to the designated provider adapter chosen by the user.
          </p>
          <p>
            We do not sell, rent, or monetize personal information to data brokers or third-party advertisers.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">5. Data Retention & Deletion Rights</h2>
          <p>
            Transaction audit records are retained for customer support and dispute verification purposes, after which identifying information is purged. Users may request data review or deletion by contacting our privacy desk.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">6. Contact & Inquiries</h2>
          <p>For questions or privacy requests regarding the platform, please contact our support desk at:</p>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
            <p>Zayuno Platform Operations</p>
            <p>Support Desk: <span class="text-emerald-400 font-bold">support@zayuno.uz</span></p>
            <p>Location: Tashkent, Uzbekistan</p>
          </div>
        </section>

      </div>
    </div>
  </main>

  ${this.getSharedFooter()}
</body>
</html>`;
  }

  private renderTermsHtml(): string {
    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  ${this.getSharedHead('Terms of Service — Zayuno Action Infrastructure', 'Terms of Service governing the use of Zayuno Action Infrastructure and provider integrations.')}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-10">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
        <p class="text-xs text-slate-400 mt-2 font-mono">Effective Date: August 17, 2026</p>
      </div>

      <div class="prose prose-invert max-w-none text-slate-300 text-sm space-y-8 leading-relaxed">
        
        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">1. Agreement to Terms</h2>
          <p>
            By accessing or using the Zayuno Action Infrastructure through conversational AI plugins, ChatGPT apps, or developer APIs, you agree to be bound by these Terms of Service.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">2. Intermediary Status & Neutral Protocol Nature</h2>
          <p>
            Zayuno operates strictly as a <strong>capability-based technology platform and action protocol intermediary</strong>. Zayuno is not a merchant, seller, fulfillment carrier, or financial institution.
          </p>
          <p>
            All physical goods, professional services, scheduling, delivery, and quality assurance are the responsibility of the executing provider.
          </p>
        </section>

        <section class="space-y-3 p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h2 class="text-base font-bold text-amber-400 flex items-center gap-2">
            <span>🛡️</span> 3. Quotation & Explicit Confirmation Guardrail
          </h2>
          <p class="text-slate-300">
            To prevent unintended action execution through conversational AI, all Zayuno integrations enforce a mandatory protocol:
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-slate-300">
            <li>The model must first compute an itemized <code>request_quote</code> displaying subtotal, fees, and grand total.</li>
            <li>No action is executed until the user provides <strong>explicit affirmative confirmation</strong> (e.g. "Yes, proceed with action").</li>
          </ol>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">4. Sandbox & Testing Notice</h2>
          <p>
            Demonstrations utilizing the sandbox provider (<code>sandbox-provider</code>) operate within a test sandbox environment for technical validation and protocol verification.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">5. Cancellations & Disputes</h2>
          <p>
            Eligible actions may be cancelled via the <code>cancel_action</code> tool prior to provider dispatch or processing lock. Subsequent disputes are governed by individual provider policies.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Zayuno shall not be liable for indirect, incidental, or consequential damages resulting from provider fulfillment delays or third-party service interruptions.
          </p>
        </section>

      </div>
    </div>
  </main>

  ${this.getSharedFooter()}
</body>
</html>`;
  }

  private renderSupportHtml(): string {
    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  ${this.getSharedHead('Customer Support — Zayuno Action Infrastructure', 'Get help with action execution, payment troubleshooting, cancellation, and provider integration inquiries.')}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div class="mb-10 text-center sm:text-left">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Customer Support & Help Desk</h1>
        <p class="text-sm text-slate-400 mt-2">Assistance with actions and technical integrations placed through AI agents.</p>
      </div>

      <!-- Quick Contact Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">✉️</span>
          <h3 class="font-bold text-white text-sm">Support Email</h3>
          <p class="text-xs text-slate-400 mt-1 font-mono text-emerald-400 font-bold">support@zayuno.uz</p>
          <p class="text-[11px] text-slate-500 mt-2">Monitored operations desk</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">💬</span>
          <h3 class="font-bold text-white text-sm">Developer Desk</h3>
          <p class="text-xs text-slate-400 mt-1 font-mono text-cyan-400 font-bold">dev@zayuno.uz</p>
          <p class="text-[11px] text-slate-500 mt-2">Protocol & adapter support</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">📍</span>
          <h3 class="font-bold text-white text-sm">Platform Operations</h3>
          <p class="text-xs text-slate-400 mt-1">Tashkent, Uzbekistan</p>
          <p class="text-[11px] text-slate-500 mt-2">Zayuno Action Infrastructure</p>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="space-y-6">
        <h2 class="text-xl font-bold text-white tracking-tight mb-4">Frequently Asked Questions</h2>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 class="font-bold text-white text-sm mb-1.5">How do I track my active action?</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            You can query status directly through ChatGPT using the <code>get_action</code> tool (e.g., <em>"Check status of ZY-SANDBOX-XXXXX"</em>) to see real-time updates and timeline events.
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 class="font-bold text-white text-sm mb-1.5">How are payments handled?</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Payments occur directly on provider-supplied external checkout links via secure HTTPS redirection. Zayuno does not store or process card information.
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 class="font-bold text-white text-sm mb-1.5">How do I cancel an action?</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Actions can be cancelled prior to fulfillment lock using the <code>cancel_action</code> tool in ChatGPT or via API.
          </p>
        </div>
      </div>

    </div>
  </main>

  ${this.getSharedFooter()}
</body>
</html>`;
  }
}
