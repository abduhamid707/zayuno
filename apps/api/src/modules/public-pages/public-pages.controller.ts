import { Controller, Get, Res, Param, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class PublicPagesController {
  // 1. Health check: /health
  @Get('health')
  @ApiExcludeEndpoint()
  health() {
    return { status: 'ok', service: 'zayuno-api', timestamp: new Date().toISOString() };
  }

  // 2. Static Asset Serving: /assets/:filename
  @Get('assets/:filename')
  @ApiExcludeEndpoint()
  serveAsset(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const assetPath = path.join(process.cwd(), 'apps/api/public/assets', safeName);

    if (fs.existsSync(assetPath)) {
      if (safeName.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (safeName.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      else if (safeName.endsWith('.ico')) res.setHeader('Content-Type', 'image/x-icon');
      else if (safeName.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
      
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      return res.sendFile(assetPath);
    }
    return res.status(404).send('Asset not found');
  }

  // 3. Favicon: /favicon.ico
  @Get('favicon.ico')
  @ApiExcludeEndpoint()
  serveFavicon(@Res() res: Response) {
    const faviconPath = path.join(process.cwd(), 'apps/api/public/assets/favicon.ico');
    if (fs.existsSync(faviconPath)) {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      return res.sendFile(faviconPath);
    }
    return res.status(404).send('Not found');
  }

  // 3.1. Yandex Verification: /yandex_f58af2445b7b4bbf.html
  @Get('yandex_f58af2445b7b4bbf.html')
  @ApiExcludeEndpoint()
  getYandexVerification(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(`<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>Verification: f58af2445b7b4bbf</body>
</html>`);
  }

  // 4. Robots.txt: /robots.txt
  @Get('robots.txt')
  @ApiExcludeEndpoint()
  getRobotsTxt(@Req() req: Request, @Res() res: Response) {
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().toLowerCase();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // api.zayuno.uz and mcp.zayuno.uz must not be indexed by search engines
    if (host.includes('api.zayuno.uz') || host.includes('mcp.zayuno.uz')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return res.send(`User-agent: *\nDisallow: /\n`);
    }

    // zayuno.uz and public developer landing
    return res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /health

Sitemap: https://zayuno.uz/sitemap.xml
`);
  }

  // 5. Sitemap.xml: /sitemap.xml
  @Get('sitemap.xml')
  @ApiExcludeEndpoint()
  getSitemapXml(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>https://zayuno.uz/</loc>
    <lastmod>2026-08-19</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://zayuno.uz/support</loc>
    <lastmod>2026-08-19</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://zayuno.uz/privacy</loc>
    <lastmod>2026-08-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://zayuno.uz/terms</loc>
    <lastmod>2026-08-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

    res.send(sitemap);
  }

  // 6. Main Landing Page: /
  @Get()
  @ApiExcludeEndpoint()
  getLandingPage(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderLandingHtml());
  }

  // 7. Privacy Policy: /privacy
  @Get('privacy')
  @ApiExcludeEndpoint()
  getPrivacyPolicy(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderPrivacyHtml());
  }

  // 8. Terms of Service: /terms
  @Get('terms')
  @ApiExcludeEndpoint()
  getTermsOfService(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderTermsHtml());
  }

  // 9. Customer Support: /support
  @Get('support')
  @ApiExcludeEndpoint()
  getCustomerSupport(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderSupportHtml());
  }

  // =========================================================================
  // SHARED TEMPLATES & SEO HEAD
  // =========================================================================

  private getSharedHead(
    title: string,
    description: string,
    canonicalPath: string,
    schemaObjects: object[] = [],
  ): string {
    const canonicalUrl = `https://zayuno.uz${canonicalPath === '/' ? '' : canonicalPath}`;
    const ogImageUrl = 'https://zayuno.uz/assets/og-image.png';

    // Base organization schema
    const orgSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Zayuno',
      url: 'https://zayuno.uz',
      logo: 'https://zayuno.uz/assets/logo.svg',
      description:
        'Capability-based action infrastructure connecting conversational AI agents (ChatGPT, Claude) to verified real-world business providers.',
      sameAs: [
        'https://github.com/abduhamid707/zayuno',
        'https://developers.zayuno.uz',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@zayuno.uz',
        contactType: 'technical support',
        areaServed: 'UZ',
        availableLanguage: ['English', 'Uzbek', 'Russian'],
      },
    };

    const webSiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Zayuno Action Infrastructure',
      url: 'https://zayuno.uz',
      description: description,
      publisher: {
        '@type': 'Organization',
        name: 'Zayuno',
        logo: {
          '@type': 'ImageObject',
          url: 'https://zayuno.uz/assets/logo.svg',
        },
      },
    };

    const allSchemas = [orgSchema, webSiteSchema, ...schemaObjects];
    const schemaScriptTags = allSchemas
      .map(
        (schema) =>
          `  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>`,
      )
      .join('\n');

    return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="AI action infrastructure, Model Context Protocol, MCP server, ChatGPT actions, Claude tools, provider integration, verified quotes, conversational AI commerce, local commerce AI, Uzbekistan AI">
  <meta name="author" content="Zayuno Action Infrastructure">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="google-site-verification" content="nFHDr-mb60LexlEBpCEqJWhMHzECXekSZRKJkbDtsRE">
  <meta name="yandex-verification" content="f58af2445b7b4bbf">
  <meta name="theme-color" content="#020617">

  <!-- Canonical URL -->
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Favicons & Icons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="128x128" href="/assets/icon-128.png">
  <link rel="apple-touch-icon" sizes="512x512" href="/assets/icon-512.png">

  <!-- Open Graph / Facebook -->
  <meta property="og:site_name" content="Zayuno">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Zayuno — Action Infrastructure for AI Agents">
  <meta property="og:locale" content="en_US">

  <!-- Twitter Meta -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImageUrl}">
  <meta name="twitter:image:alt" content="Zayuno — Action Infrastructure for AI Agents">

  <!-- Performance & Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            brand: {
              50: '#ecfdf5',
              400: '#34d399',
              500: '#10b981',
              600: '#059669',
            }
          }
        }
      }
    }
  </script>

  <!-- Structured Data JSON-LD -->
${schemaScriptTags}

  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .glow-bg {
      background: radial-gradient(circle at 50% -10%, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.08) 35%, transparent 70%);
    }
    .card-glass {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51, 65, 85, 0.6);
    }
    .card-glass:hover {
      border-color: rgba(52, 211, 153, 0.4);
    }
  </style>`;
  }

  private getSharedNavbar(): string {
    return `
  <header class="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3 group" aria-label="Zayuno Home">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
          Z
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-xl font-extrabold tracking-tight text-white">ZAYUNO</span>
            <span class="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTION INFRASTRUCTURE</span>
          </div>
        </div>
      </a>

      <!-- Desktop Nav Links -->
      <nav class="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
        <a href="/#protocol" class="hover:text-emerald-400 transition-colors">Protocol</a>
        <a href="/#architecture" class="hover:text-emerald-400 transition-colors">Architecture</a>
        <a href="/#sandboxes" class="hover:text-emerald-400 transition-colors">Sandboxes</a>
        <a href="/#faq" class="hover:text-emerald-400 transition-colors">FAQ</a>
        <a href="https://developers.zayuno.uz/docs" class="hover:text-emerald-400 transition-colors flex items-center gap-1">
          Docs <span class="text-xs text-slate-500">↗</span>
        </a>
      </nav>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <a href="https://developers.zayuno.uz" class="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all duration-150">
          Developer Portal
        </a>
        <a href="/mcp" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition flex items-center gap-2" title="Model Context Protocol Endpoint">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          /mcp
        </a>
        <!-- Mobile Menu Toggle -->
        <button id="mobileMenuBtn" aria-label="Toggle Navigation" class="md:hidden p-2 text-slate-400 hover:text-white focus:outline-none">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Nav Drawer -->
    <div id="mobileMenu" class="hidden md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-5 space-y-3 text-sm font-medium">
      <a href="/#protocol" class="block text-slate-300 hover:text-emerald-400 py-1">Protocol Flow</a>
      <a href="/#architecture" class="block text-slate-300 hover:text-emerald-400 py-1">Architecture & Guardrails</a>
      <a href="/#sandboxes" class="block text-slate-300 hover:text-emerald-400 py-1">Testing Sandboxes</a>
      <a href="/#faq" class="block text-slate-300 hover:text-emerald-400 py-1">FAQ</a>
      <a href="/support" class="block text-slate-300 hover:text-emerald-400 py-1">Customer Support</a>
      <a href="https://developers.zayuno.uz/docs" class="block text-emerald-400 font-semibold py-1">Developer Documentation ↗</a>
      <a href="https://developers.zayuno.uz" class="block w-full text-center py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs mt-2">Open Developer Portal</a>
    </div>
  </header>
  <script>
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (btn && menu) {
      btn.addEventListener('click', () => menu.classList.toggle('hidden'));
    }
  </script>`;
  }

  private getSharedFooter(): string {
    return `
  <footer class="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-14">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        
        <!-- Brand Summary -->
        <div class="space-y-4 md:col-span-1">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm">Z</div>
            <span class="text-lg font-bold text-white tracking-tight">ZAYUNO</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Standardized action infrastructure connecting conversational AI agents (ChatGPT, Claude, Gemini) with verified real-world business providers.
          </p>
          <div class="flex items-center gap-2 text-xs text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="font-mono font-medium">All Core Systems Operational</span>
          </div>
        </div>

        <!-- Protocol & Developer Endpoints -->
        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Protocol & Endpoints</h4>
          <ul class="space-y-2.5 text-xs">
            <li><a href="/mcp" class="hover:text-emerald-400 transition-colors font-mono">Streamable HTTP (/mcp)</a></li>
            <li><a href="/sse" class="hover:text-emerald-400 transition-colors font-mono">SSE Streaming (/sse)</a></li>
            <li><a href="https://developers.zayuno.uz/docs#sandbox" class="hover:text-emerald-400 transition-colors">Developer Sandbox Harness</a></li>
            <li><a href="https://developers.zayuno.uz/docs" class="hover:text-emerald-400 transition-colors">Developer Documentation</a></li>
            <li><a href="https://partners.zayuno.uz" class="hover:text-emerald-400 transition-colors">Provider Moderation Portal</a></li>
          </ul>
        </div>

        <!-- Legal & Governance -->
        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Trust & Governance</h4>
          <ul class="space-y-2.5 text-xs">
            <li><a href="/privacy" class="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
            <li><a href="/terms" class="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
            <li><a href="/support" class="hover:text-emerald-400 transition-colors">Support & Help Desk</a></li>
            <li><a href="/#architecture" class="hover:text-emerald-400 transition-colors">Confirmation Guardrails</a></li>
            <li><a href="/#architecture" class="hover:text-emerald-400 transition-colors">Zero-Card Data Policy</a></li>
          </ul>
        </div>

        <!-- Security & Architecture Guarantee -->
        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Security Boundary</h4>
          <p class="text-xs text-slate-400 leading-relaxed mb-3">
            Zayuno acts strictly as capability-based action middleware. Payments occur exclusively via provider-supplied external checkout handoffs. Banking credentials and payment cards are never stored or processed in chat.
          </p>
          <div class="text-[11px] font-mono text-slate-500">
            Protocol Spec: <span class="text-slate-400">OpenAI Apps SDK & MCP 1.0</span>
          </div>
        </div>
      </div>

      <div class="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 Zayuno Action Infrastructure. All rights reserved.</p>
        <div class="flex items-center gap-6">
          <span class="font-mono">Tashkent, Uzbekistan</span>
          <span class="font-mono text-slate-600">•</span>
          <a href="https://github.com/abduhamid707/zayuno" target="_blank" rel="noopener noreferrer" class="hover:text-slate-300 transition-colors">GitHub Repository</a>
        </div>
      </div>
    </div>
  </footer>`;
  }

  // =========================================================================
  // PAGE RENDERERS
  // =========================================================================

  private renderLandingHtml(): string {
    const landingFaqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Zayuno and how does it connect AI agents to businesses?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Zayuno is capability-based action infrastructure that connects conversational AI agents (such as ChatGPT, Claude, or custom autonomous agents) to real-world business services through the Model Context Protocol (MCP) and standardized capability contracts. It allows AI models to discover catalogs, request exact itemized quotes, and trigger actions with explicit user confirmation.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does Zayuno ensure AI agents do not make unintended purchases or hallucinate prices?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Zayuno enforces a mandatory 3-step guardrail protocol. An AI agent must first call request_quote to compute real-time itemized prices, delivery fees, and taxes from the provider API. An action cannot be executed until the user explicitly confirms the quoted price in chat. Furthermore, payments occur via provider-owned checkout links.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Zayuno collect or store credit card credentials in chat?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Zayuno has a strict Zero Card Data Policy. Credit card numbers, CVVs, OTPs, and banking credentials are never requested, stored, or processed by Zayuno or conversational AI chat. Payment happens on the provider external checkout link via secure HTTPS handoff.',
          },
        },
        {
          '@type': 'Question',
          name: 'How can service providers integrate with Zayuno?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Providers implement the lightweight TypeScript or HTTP adapter interface defined in @zayuno/provider-sdk. Once integrated, providers submit their adapter for verification via the Provider Moderation Portal (partners.zayuno.uz) and become immediately discoverable to AI agents.',
          },
        },
      ],
    };

    const softwareAppSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Zayuno Action Layer',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cloud / Remote MCP / REST',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Standardized action middleware and execution engine bridging LLMs with transactional business APIs.',
    };

    return `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  ${this.getSharedHead(
    'Zayuno — Action Infrastructure for AI Agents & Businesses',
    'Zayuno connects conversational AI agents (ChatGPT, Claude) to real-world businesses. Discover offerings, calculate itemized quotes, and execute confirmed actions with zero hallucination.',
    '/',
    [softwareAppSchema, landingFaqSchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  ${this.getSharedNavbar()}

  <main class="flex-grow">
    
    <!-- 1. Hero Section -->
    <section class="relative overflow-hidden pt-20 pb-20 lg:pt-28 lg:pb-28 border-b border-slate-900 glow-bg">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        <!-- Live Protocol Badge -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-8 shadow-sm">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Model Context Protocol (MCP) Standard & OpenAI Apps SDK Protocol</span>
        </div>

        <!-- Primary Hero H1 -->
        <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.12] mb-6">
          Action Infrastructure for <br class="hidden sm:inline">
          <span class="bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">Conversational AI</span>
        </h1>

        <!-- Subheadline (Value in 3 seconds) -->
        <p class="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 leading-relaxed mb-10 font-normal">
          Connecting ChatGPT, Claude, and autonomous agents to verified real-world businesses. Discover live offerings, compute exact verified quotes, and execute confirmed actions with zero hallucination.
        </p>

        <!-- Primary Call to Actions -->
        <div class="flex flex-wrap items-center justify-center gap-4 mb-12">
          <a href="https://developers.zayuno.uz/docs#sandbox" class="px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all duration-150 flex items-center gap-2">
            <span>Explore Developer Sandbox</span>
            <span>→</span>
          </a>
          <a href="https://developers.zayuno.uz/docs" class="px-7 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition-all duration-150 flex items-center gap-2">
            <span>Read Developer Documentation</span>
            <span class="text-slate-400">↗</span>
          </a>
        </div>

        <!-- Sandbox Notice -->
        <div class="max-w-2xl mx-auto p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-left flex items-start gap-3.5 shadow-lg">
          <span class="text-xl">🧪</span>
          <div class="text-slate-300">
            <strong class="font-bold text-emerald-400">Interactive Testing Environment:</strong>
            Explore the domain-neutral <code class="text-cyan-300 font-mono px-1 py-0.5 bg-slate-800 rounded">sandbox-provider</code> or food-delivery simulators. All simulations run in isolated sandbox environments with zero risk to real funds.
          </div>
        </div>

      </div>
    </section>

    <!-- 2. The 3-Step Protocol: Discover -> Decide -> Act -->
    <section id="protocol" class="py-20 bg-slate-950 border-b border-slate-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-16">
          <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 font-mono">EXECUTION WORKFLOW</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">The 3-Step Agentic Action Lifecycle</p>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">Designed to guarantee deterministic pricing, user control, and secure provider handoff.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <!-- Step 1: Discover -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden group">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xl mb-6">
              01
            </div>
            <h3 class="text-xl font-bold text-white mb-3 flex items-center justify-between">
              <span>1. Discover</span>
              <span class="text-xs font-mono font-normal text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded">get_catalog</span>
            </h3>
            <p class="text-sm text-slate-300 leading-relaxed mb-4">
              AI agents query live provider capabilities, available offerings, branches, menus, and operating hours dynamically without caching stale data.
            </p>
            <div class="p-3 rounded-lg bg-slate-950/80 font-mono text-[11px] text-slate-400 border border-slate-800">
              <span class="text-blue-400">→</span> get_catalog(providerSlug)
            </div>
          </div>

          <!-- Step 2: Decide & Quote -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden group">
            <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xl mb-6">
              02
            </div>
            <h3 class="text-xl font-bold text-white mb-3 flex items-center justify-between">
              <span>2. Decide & Quote</span>
              <span class="text-xs font-mono font-normal text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded">request_quote</span>
            </h3>
            <p class="text-sm text-slate-300 leading-relaxed mb-4">
              Zayuno verifies item availability and calculates exact subtotal, taxes, delivery fees, and discounts directly from the provider API.
            </p>
            <div class="p-3 rounded-lg bg-slate-950/80 font-mono text-[11px] text-slate-400 border border-slate-800">
              <span class="text-amber-400">→</span> request_quote(items, locationId)
            </div>
          </div>

          <!-- Step 3: Confirm & Act -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden group">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xl mb-6">
              03
            </div>
            <h3 class="text-xl font-bold text-white mb-3 flex items-center justify-between">
              <span>3. Confirm & Act</span>
              <span class="text-xs font-mono font-normal text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded">create_action</span>
            </h3>
            <p class="text-sm text-slate-300 leading-relaxed mb-4">
              With explicit user consent, the action is dispatched idempotently. The agent receives a provider-owned checkout URL for secure payment.
            </p>
            <div class="p-3 rounded-lg bg-slate-950/80 font-mono text-[11px] text-slate-400 border border-slate-800">
              <span class="text-emerald-400">→</span> create_action(quoteId, userConfirmed)
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- 3. Protocol Architecture & Security Guardrails -->
    <section id="architecture" class="py-20 bg-slate-900/30 border-b border-slate-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-16">
          <h2 class="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">SECURITY FIRST</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Engineered for Zero-Hallucination & Trust</p>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">Robust boundaries ensure safety for both consumers and integrated business providers.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div class="card-glass p-6 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4">🔒</div>
            <h3 class="text-base font-bold text-white mb-2">Zero Card Data Policy</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Zayuno never collects or stores banking credentials, CVV, or card numbers. Payment occurs via provider-owned HTTPS redirection.
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg mb-4">🛡️</div>
            <h3 class="text-base font-bold text-white mb-2">Mandatory Confirmation</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Actions cannot be triggered without verified quotes and explicit affirmative confirmation from the user in chat.
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg mb-4">🔑</div>
            <h3 class="text-base font-bold text-white mb-2">HMAC Signed Webhooks</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Provider callbacks are verified with constant-time SHA-256 HMAC signatures to prevent replay attacks and forgery.
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-lg mb-4">⚡</div>
            <h3 class="text-base font-bold text-white mb-2">Idempotent Execution</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Every action requires an <code class="text-sky-300 font-mono">idempotencyKey</code>, preventing duplicate orders or accidental re-billing.
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- 4. Interactive Protocol & Code Visualizer -->
    <section class="py-20 bg-slate-950 border-b border-slate-900">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Interactive Protocol Inspection</h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-2">See how conversational AI interacts with Zayuno through the Model Context Protocol.</p>
        </div>

        <div class="card-glass rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
          
          <!-- Terminal Header -->
          <div class="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-green-500/80"></span>
              <span class="text-xs font-mono text-slate-400 ml-2">zayuno-mcp-protocol.json</span>
            </div>
            <span class="text-[11px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">STREAMABLE HTTP / SSE</span>
          </div>

          <!-- Code Content -->
          <div class="p-6 font-mono text-xs overflow-x-auto space-y-4 text-slate-300">
            <div>
              <span class="text-slate-500">// 1. AI Assistant calls MCP tool to request verified quote</span>
              <div class="text-emerald-400 mt-1">{</div>
              <div class="pl-4">
                <span class="text-cyan-400">"tool"</span>: <span class="text-amber-300">"request_quote"</span>,<br>
                <span class="text-cyan-400">"arguments"</span>: {<br>
                &nbsp;&nbsp;<span class="text-cyan-400">"providerSlug"</span>: <span class="text-amber-300">"sandbox-provider"</span>,<br>
                &nbsp;&nbsp;<span class="text-cyan-400">"items"</span>: [{ <span class="text-cyan-400">"offeringId"</span>: <span class="text-amber-300">"standard_pkg"</span>, <span class="text-cyan-400">"quantity"</span>: <span class="text-purple-400">1</span> }]<br>
                }
              </div>
              <div class="text-emerald-400">}</div>
            </div>

            <div class="pt-2 border-t border-slate-800/80">
              <span class="text-slate-500">// 2. Zayuno returns verified price breakdown and unique quote ID</span>
              <div class="text-emerald-400 mt-1">{</div>
              <div class="pl-4">
                <span class="text-cyan-400">"quoteId"</span>: <span class="text-amber-300">"quot_9a8b7c6d5e4f"</span>,<br>
                <span class="text-cyan-400">"total"</span>: <span class="text-purple-400">60000</span>,<br>
                <span class="text-cyan-400">"currency"</span>: <span class="text-amber-300">"UZS"</span>,<br>
                <span class="text-cyan-400">"expiresAt"</span>: <span class="text-amber-300">"2026-08-19T14:30:00.000Z"</span>
              </div>
              <div class="text-emerald-400">}</div>
            </div>

            <div class="pt-2 border-t border-slate-800/80">
              <span class="text-slate-500">// 3. After user explicitly confirms, AI initiates confirmed action</span>
              <div class="text-emerald-400 mt-1">{</div>
              <div class="pl-4">
                <span class="text-cyan-400">"tool"</span>: <span class="text-amber-300">"create_action"</span>,<br>
                <span class="text-cyan-400">"arguments"</span>: {<br>
                &nbsp;&nbsp;<span class="text-cyan-400">"quoteId"</span>: <span class="text-amber-300">"quot_9a8b7c6d5e4f"</span>,<br>
                &nbsp;&nbsp;<span class="text-cyan-400">"userConfirmed"</span>: <span class="text-purple-400">true</span>,<br>
                &nbsp;&nbsp;<span class="text-cyan-400">"idempotencyKey"</span>: <span class="text-amber-300">"user_session_act_12345"</span><br>
                }
              </div>
              <div class="text-emerald-400">}</div>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- 5. Developer Testing Sandboxes -->
    <section id="sandboxes" class="py-20 bg-slate-900/30 border-b border-slate-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-16">
          <h2 class="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 font-mono">PRE-ENGINEERED ENVIRONMENTS</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Available Developer Sandboxes</p>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">Test your AI agents against pre-built simulated providers with zero setup.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div class="card-glass p-7 rounded-2xl">
            <div class="text-2xl mb-4">🛍️</div>
            <h3 class="text-lg font-bold text-white mb-2">Neutral Sandbox Provider</h3>
            <p class="text-xs text-slate-400 leading-relaxed mb-4">
              Domain-neutral commerce, appointment booking, and fulfillment sandbox with customizable catalogs and dynamic parameters.
            </p>
            <div class="text-xs font-mono text-cyan-400">providerSlug: "sandbox-provider"</div>
          </div>

          <div class="card-glass p-7 rounded-2xl">
            <div class="text-2xl mb-4">🍔</div>
            <h3 class="text-lg font-bold text-white mb-2">Food Delivery Simulator</h3>
            <p class="text-xs text-slate-400 leading-relaxed mb-4">
              Fast-food ordering and interactive checkout simulator with categorized menus, delivery fee calculation, and order tracking.
            </p>
            <div class="text-xs font-mono text-cyan-400">providerSlug: "mock-evos" / "mock-coffee-time"</div>
          </div>

          <div class="card-glass p-7 rounded-2xl">
            <div class="text-2xl mb-4">🚆</div>
            <h3 class="text-lg font-bold text-white mb-2">Railway Ticketing Simulator</h3>
            <p class="text-xs text-slate-400 leading-relaxed mb-4">
              Dynamic multi-route transport reservation and booking simulator with secure provider-owned payment handoff verification.
            </p>
            <div class="text-xs font-mono text-cyan-400">providerSlug: "mock-poyez"</div>
          </div>

        </div>

        <div class="mt-12 text-center">
          <a href="https://developers.zayuno.uz/docs#sandbox" class="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition">
            <span>Learn how to configure MCP clients for Sandboxes</span>
            <span>→</span>
          </a>
        </div>

      </div>
    </section>

    <!-- 6. Real FAQ Section -->
    <section id="faq" class="py-20 bg-slate-950 border-b border-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center mb-16">
          <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 font-mono">FAQ</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Frequently Asked Questions</p>
        </div>

        <div class="space-y-6">
          
          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">What is Zayuno and how does it connect AI agents to businesses?</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Zayuno is capability-based action infrastructure that connects conversational AI agents (such as ChatGPT, Claude, or custom autonomous agents) to real-world business services through the Model Context Protocol (MCP) and standardized capability contracts. It allows AI models to discover catalogs, request exact itemized quotes, and trigger actions with explicit user confirmation.
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">How does Zayuno ensure AI agents do not make unintended purchases or hallucinate prices?</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Zayuno enforces a mandatory 3-step guardrail protocol. An AI agent must first call <code>request_quote</code> to compute real-time itemized prices, delivery fees, and taxes from the provider API. An action cannot be executed until the user explicitly confirms the quoted price in chat. Furthermore, payments occur via provider-owned checkout links.
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">Does Zayuno collect or store credit card credentials in chat?</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              No. Zayuno has a strict Zero Card Data Policy. Credit card numbers, CVVs, OTPs, and banking credentials are never requested, stored, or processed by Zayuno or conversational AI chat. Payment happens on the provider external checkout link via secure HTTPS handoff.
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">How can service providers integrate with Zayuno?</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Providers implement the lightweight TypeScript or HTTP adapter interface defined in <code>@zayuno/provider-sdk</code>. Once integrated, providers submit their adapter for verification via the Provider Moderation Portal (<a href="https://partners.zayuno.uz" class="text-emerald-400 underline">partners.zayuno.uz</a>) and become immediately discoverable to AI agents.
            </p>
          </div>

        </div>

      </div>
    </section>

    <!-- 7. Call To Action Banner -->
    <section class="py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-cyan-950/60 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
          <div class="relative z-10 max-w-2xl mx-auto">
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">Ready to Connect Your AI Agent or Service?</h2>
            <p class="text-sm sm:text-base text-slate-300 mb-8 leading-relaxed">
              Start building with the pre-configured developer sandboxes or connect your business through our open adapter SDK.
            </p>
            <div class="flex flex-wrap items-center justify-center gap-4">
              <a href="https://developers.zayuno.uz" class="px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition">
                Open Developer Portal →
              </a>
              <a href="/support" class="px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition">
                Contact Support
              </a>
            </div>
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
    const privacySchema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Privacy Policy — Zayuno Action Infrastructure',
      url: 'https://zayuno.uz/privacy',
      description:
        'Privacy Policy for Zayuno: how operational action parameters, customer details, and provider checkout redirection are handled.',
    };

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  ${this.getSharedHead(
    'Privacy Policy — Zayuno Action Infrastructure',
    'Privacy Policy for Zayuno: how operational action parameters, customer contact details, and provider checkout redirection are handled under a Zero-Card-Data policy.',
    '/privacy',
    [privacySchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-10">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        <p class="text-xs text-slate-400 mt-2 font-mono">Effective Date: August 19, 2026</p>
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
    const termsSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Terms of Service — Zayuno Action Infrastructure',
      url: 'https://zayuno.uz/terms',
      description:
        'Terms of Service governing the use of Zayuno Action Infrastructure and provider integrations.',
    };

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  ${this.getSharedHead(
    'Terms of Service — Zayuno Action Infrastructure',
    'Terms of Service governing the use of Zayuno Action Infrastructure, conversational AI plugins, and provider integrations.',
    '/terms',
    [termsSchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-10">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
        <p class="text-xs text-slate-400 mt-2 font-mono">Effective Date: August 19, 2026</p>
      </div>

      <div class="prose prose-invert max-w-none text-slate-300 text-sm space-y-8 leading-relaxed">
        
        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">1. Agreement to Terms</h2>
          <p>
            By accessing or using the Zayuno Action Infrastructure through conversational AI plugins, ChatGPT apps, Claude tools, or direct developer APIs, you agree to be bound by these Terms of Service.
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
            Demonstrations utilizing the sandbox provider (<code>sandbox-provider</code>) or mock demo providers operate within a simulated testing sandbox for technical validation and protocol verification.
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
    const supportSchema = {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Customer Support & Help Desk — Zayuno',
      url: 'https://zayuno.uz/support',
      description:
        'Customer Support and Help Desk for Zayuno Action Infrastructure: action tracking, payment troubleshooting, cancellation, and provider integration inquiries.',
    };

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  ${this.getSharedHead(
    'Customer Support & Help Desk — Zayuno Action Infrastructure',
    'Customer Support and Help Desk for Zayuno Action Infrastructure: action tracking, payment troubleshooting, cancellation, and provider integration inquiries.',
    '/support',
    [supportSchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div class="mb-10 text-center sm:text-left">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Customer Support & Help Desk</h1>
        <p class="text-sm text-slate-400 mt-2">Assistance with actions, orders, and technical integrations placed through AI agents.</p>
      </div>

      <!-- Quick Contact Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">✉️</span>
          <h3 class="font-bold text-white text-sm">General & User Support</h3>
          <p class="text-xs text-slate-400 mt-1 font-mono text-emerald-400 font-bold">support@zayuno.uz</p>
          <p class="text-[11px] text-slate-500 mt-2">Action & order assistance</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">💬</span>
          <h3 class="font-bold text-white text-sm">Developer & Provider Desk</h3>
          <p class="text-xs text-slate-400 mt-1 font-mono text-cyan-400 font-bold">dev@zayuno.uz</p>
          <p class="text-[11px] text-slate-500 mt-2">SDK & protocol onboarding</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">📍</span>
          <h3 class="font-bold text-white text-sm">Operations Headquarters</h3>
          <p class="text-xs text-slate-400 mt-1">Tashkent, Uzbekistan</p>
          <p class="text-[11px] text-slate-500 mt-2">Zayuno Action Infrastructure</p>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="space-y-6">
        <h2 class="text-xl font-bold text-white tracking-tight mb-4">Frequently Asked Questions</h2>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 class="font-bold text-white text-sm mb-1.5">How do I track my active action or order?</h3>
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
