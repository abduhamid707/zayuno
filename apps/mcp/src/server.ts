import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { ZayunoApiClient } from './client.js';
import { registerZayunoTools, ZAYUNO_MCP_TOOLS } from './tools.js';
import { getWelcomeMessage, formatCustomerError, getOpenAiAppsChallengeToken, stripSensitiveSecrets } from '@zayuno/shared';

export const ZAYUNO_MCP_PROMPTS = [
  {
    name: 'welcome',
    description: 'Dynamic customer welcome message and initial conversation starter for Zayuno marketplace assistant.',
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: getWelcomeMessage(null)
        }
      }
    ]
  },
  {
    name: 'customer_assistant_instructions',
    description: 'Complete system guidelines and conversational rules for serving customers in natural Uzbek without developer jargon.',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Siz Zayuno platformasining tabiiy marketplace yordamchisisiz.
Mijozga do‘stona, qisqa va tabiiy o‘zbek tilida xizmat qilasiz.

ZAYUNO CUSTOMER MODE QOIDALARI:
1. Tool’larni jim ishlatish va bitta yakuniy javob:
   - Tool’larni orqa fonda jim chaqiring. Har bir oraliq qadamni yoki ichki mulohazani mijozga aytmang.
   - Avval barcha kerakli tool chaqiruvlarini to‘liq tugating.
   - Keyin mijozga faqat bitta qisqa, tayyor natija yozing.
   - Tool qaytargan \`customerMessage\` mijoz uchun canonical tayyor matndir va uni ustuvor (deyarli to‘g‘ridan-to‘g‘ri) ishlating.

2. Birinchi salomlashuv:
   - Mijoz birinchi marta yozganda yoki "nima qila olasan?" deb so‘raganda:
     HAR DOIM get_welcome_message toolini chaqirib, undan olingan dynamic welcomeMessage matnidan foydalaning.
     Agar get_welcome_message dan count olinmasa yoki xatolik bo‘lsa, quyidagi xabarni bering:
     "Zayuno sizga uzoqni yaqin qiladi. Nima qilishni xohlaysiz?

Men ovqat buyurtma qilish, poyez yoki aviachipta topish, turli xizmatlarni qidirish va buyurtmalarni kuzatishda yordam bera olaman. Bir qancha yo‘nalishlarda yordam bera olaman."

3. Natijaga yo‘naltirilgan muloqot:
   - Har bir javobni natija bilan boshlang, keyin faqat kerakli tafsilotlarni bering.
   - Mijoz "ovqat xohlayman" desa: kategoriya, budjet yoki joylashuvni so‘rang.
   - Mijoz "chipta olmoqchiman" desa: jo‘nash joyi, manzil, sana va yo‘lovchilar sonini so‘rang.

4. Buyurtma, Kotirovka va Confirmation (Quote -> Confirm -> Action):
   - Buyurtma yaratishdan (create_action) oldin HAR DOIM kotirovka (request_quote) hisoblang.
   - Kotirovkani mijozga aniq ko‘rsating (masalan: "3 ta Large Cappuccino, vanil siropi bilan\nJami: 91 000 so‘m\nYetkazish: taxminan 25 daqiqa\nTasdiqlaysizmi?").
   - QAT'IY QOIDA: Mijoz "ha", "tasdiqlayman", "xa" deb aniq tasdiqlamaguncha create_action chaqirmang.
   - create_action chaqiruvida idempotencyKey ixtiyoriy, server uni xavfsiz generatsiya qiladi.

5. To‘lov va Statuslar:
   - Buyurtma yaratilgach:
     "Buyurtmangiz yaratildi. To‘lov kutilmoqda.
[To‘lov sahifasini ochish](url)"
   - Agar sandbox/demo provider bo‘lsa, to‘lov linki oldidan bir marta: "Bu sandbox buyurtmasi, haqiqiy to‘lov qilinmaydi." deb ayting (real provider uchun sandbox/demo so‘zini ishlatmang).
   - To‘lov kutilayotganda: "Buyurtmangiz qabul qilingan, lekin to‘lov hali qilinmagan. [To‘lovni yakunlash](url)".
   - To‘lov qabul qilingach: "To‘lov qabul qilindi. Buyurtmangiz tasdiqlandi."
   - Bekor qilinganda: "Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman." (yoki "boshqa taklif topib beraman.")

6. Xatoliklar va Qayta urinish:
   - Agar biror tool xato bersa, texnik sababni (HTTP, stream, UUID, endpoint) aslo yozmang.
   - Faqat do‘stona va qisqa matn yozing: "Hozir buyurtmani yakunlay olmadim. Qayta urinib ko‘raymi?"

7. QAT'IYAN TAQIQLANGAN:
   - Texnik commentary, mulohaza yoki ichki jarayonni ("tekshiraman", "qayta yuboraman", "generator yo‘q", "endpoint xato berdi", "quote orqali davom etaman") mijozga chiqarish;
   - Raw statuslarni ko‘rsatish (AWAITING_PAYMENT, PENDING, CONFIRMED, CANCELLED o‘rniga insoniy o‘zbekcha matn ishlating);
   - Endpoint nomlari, HTTP statuslari, request/response, stack trace, Body stream xatolarini chiqarish;
   - Action ID, Order ID, Quote ID, Public ID, UUID, idempotency key larni mijozga ko‘rsatish;
   - Webhook, API, MCP, certification, idempotency kabi texnik so‘zlarni ishlatish;
   - Mijozning telefon raqami, email yoki to‘liq manzilini qayta echo qilib ko‘rsatish.`
        }
      }
    ]
  }
];

export function createZayunoMcpServer() {
  const server = new McpServer({
    name: 'zayuno-action-server',
    version: '1.0.0'
  });

  const apiClient = new ZayunoApiClient();
  registerZayunoTools(server, apiClient);

  server.prompt('welcome', 'Dynamic customer welcome message for Zayuno marketplace assistant', async () => {
    try {
      const welcomeInfo = await apiClient.getWelcome();
      return {
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: welcomeInfo.customerMessage || welcomeInfo.welcomeMessage || getWelcomeMessage(welcomeInfo.availableServiceCount)
            }
          }
        ]
      };
    } catch {
      return {
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: getWelcomeMessage(null)
            }
          }
        ]
      };
    }
  });

  server.prompt('customer_assistant_instructions', 'System instructions for conversational customer assistant', () => ({
    messages: ZAYUNO_MCP_PROMPTS[1].messages as any
  }));

  return { server, apiClient };
}

export async function runStdioServer() {
  const { server } = createZayunoMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Zayuno MCP Server running on stdio');
}

export function runHttpSseServer(port = 4002): Express {
  const app = express();

  app.use((req: Request, res: Response, next: express.NextFunction) => {
    const origin = (req.headers.origin as string) || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, x-api-key, *');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '1mb', type: ['application/json', 'application/json-rpc', 'application/*+json'] }));

  // Sliding-window IP rate limiter guardrail (120 req/min for public MCP endpoints)
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const mcpRateLimit = (req: Request, res: Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (entry.count >= 120) {
      res.status(429).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Too many requests from this IP. Rate limit: 120 requests/minute.' }
      });
      return;
    }
    entry.count += 1;
    return next();
  };

  // Store active SSE sessions
  const sseTransports = new Map<string, SSEServerTransport>();

  // Helper to process a single JSON-RPC 2.0 message
  const processSingleJsonRpc = async (msg: any, _sessionId?: string): Promise<{ response?: any; isNotification: boolean }> => {
    if (!msg || typeof msg !== 'object') {
      return {
        response: { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } },
        isNotification: false
      };
    }

    const { id, method, params } = msg;
    const isNotification = id === undefined || id === null;

    // 1. initialize
    if (method === 'initialize') {
      const requestedVersion = params?.protocolVersion || '2024-11-05';
      return {
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: requestedVersion,
            capabilities: {
              tools: { listChanged: false },
              prompts: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              logging: {}
            },
            serverInfo: {
              name: 'zayuno-action-server',
              version: '1.0.0'
            }
          }
        },
        isNotification: false
      };
    }

    // 2. notifications/initialized and any other MCP notifications
    if (method === 'notifications/initialized' || (typeof method === 'string' && method.startsWith('notifications/'))) {
      return {
        response: isNotification ? undefined : { jsonrpc: '2.0', id, result: {} },
        isNotification: true
      };
    }

    // 3. ping
    if (method === 'ping') {
      return {
        response: { jsonrpc: '2.0', id, result: {} },
        isNotification: false
      };
    }

    // 4. tools/list
    if (method === 'tools/list') {
      return {
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            tools: ZAYUNO_MCP_TOOLS.map(t => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
              outputSchema: t.outputSchema,
              annotations: t.annotations
            }))
          }
        },
        isNotification: false
      };
    }

    // 5. tools/call
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      try {
        const tool = ZAYUNO_MCP_TOOLS.find(candidate => candidate.name === toolName);
        if (!tool) {
          return {
            response: {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Tool not found: ${toolName}` }
            },
            isNotification: false
          };
        }

        const apiClient = new ZayunoApiClient();
        const rawResult = await tool.handler(toolArgs, apiClient);
        const result = stripSensitiveSecrets(rawResult);

        return {
          response: {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                }
              ]
            }
          },
          isNotification: false
        };
      } catch (err: any) {
        const friendlyMessage = formatCustomerError(err);
        return {
          response: {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    isError: true,
                    customerMessage: friendlyMessage,
                    message: friendlyMessage
                  }, null, 2)
                }
              ]
            }
          },
          isNotification: false
        };
      }
    }

    // 6. prompts/list
    if (method === 'prompts/list') {
      return {
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: ZAYUNO_MCP_PROMPTS.map(p => ({
              name: p.name,
              description: p.description
            }))
          }
        },
        isNotification: false
      };
    }

    // 7. prompts/get
    if (method === 'prompts/get') {
      const promptName = params?.name;
      const prompt = ZAYUNO_MCP_PROMPTS.find(p => p.name === promptName);
      if (!prompt) {
        return {
          response: {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Prompt not found: ${promptName}` }
          },
          isNotification: false
        };
      }

      if (promptName === 'welcome') {
        const apiClient = new ZayunoApiClient();
        let welcomeText = getWelcomeMessage(null);
        try {
          const welcomeInfo = await apiClient.getWelcome();
          welcomeText = welcomeInfo.customerMessage || welcomeInfo.welcomeMessage || getWelcomeMessage(welcomeInfo.availableServiceCount);
        } catch {
          welcomeText = getWelcomeMessage(null);
        }
        return {
          response: {
            jsonrpc: '2.0',
            id,
            result: {
              description: prompt.description,
              messages: [{ role: 'assistant', content: { type: 'text', text: welcomeText } }]
            }
          },
          isNotification: false
        };
      }

      return {
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            description: prompt.description,
            messages: prompt.messages
          }
        },
        isNotification: false
      };
    }

    // 8. resources/list
    if (method === 'resources/list') {
      return {
        response: {
          jsonrpc: '2.0',
          id,
          result: { resources: [] }
        },
        isNotification: false
      };
    }

    // 9. resources/templates/list
    if (method === 'resources/templates/list') {
      return {
        response: {
          jsonrpc: '2.0',
          id,
          result: { resourceTemplates: [] }
        },
        isNotification: false
      };
    }

    // 10. logging/setLevel
    if (method === 'logging/setLevel') {
      return {
        response: { jsonrpc: '2.0', id, result: {} },
        isNotification: false
      };
    }

    // 11. completion/complete
    if (method === 'completion/complete') {
      return {
        response: {
          jsonrpc: '2.0',
          id,
          result: { completion: { values: [], hasMore: false } }
        },
        isNotification: false
      };
    }

    // If client sent an unhandled notification without id, silently accept
    if (isNotification) {
      return { response: undefined, isNotification: true };
    }

    // Unsupported method with id
    return {
      response: {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unsupported method: ${method}` }
      },
      isNotification: false
    };
  };

  // 0. OpenAI Domain Verification Challenge: GET /.well-known/openai-apps-challenge
  app.get('/.well-known/openai-apps-challenge', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(getOpenAiAppsChallengeToken());
  });

  // 1. Health Endpoint: GET /health
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      server: 'Zayuno MCP Action Infrastructure Server',
      protocol: 'Model Context Protocol (MCP) Streamable HTTP + SSE',
      toolsCount: ZAYUNO_MCP_TOOLS.length,
      activeSseSessions: sseTransports.size,
      timestamp: new Date().toISOString()
    });
  });

  // 2. Introspection endpoint: GET /tools
  app.get('/tools', (req: Request, res: Response) => {
    res.json({
      tools: ZAYUNO_MCP_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: tool.annotations
      }))
    });
  });

  // 3. Streamable HTTP JSON-RPC Endpoint: POST /mcp & GET /mcp
  app.all('/mcp', mcpRateLimit, async (req: Request, res: Response) => {
    // Standard CORS & headers for MCP clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, x-api-key, *');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        status: 'online',
        transport: 'streamable-http',
        protocolVersion: '2024-11-05',
        toolsCount: ZAYUNO_MCP_TOOLS.length,
        version: '1.0.0',
        serverInfo: {
          name: 'zayuno-action-server',
          version: '1.0.0'
        }
      });
      return;
    }

    if (req.method === 'POST') {
      const sessionId = (req.headers['mcp-session-id'] as string) || randomUUID();
      res.setHeader('Mcp-Session-Id', sessionId);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');

      const body = req.body;

      // Handle batch JSON-RPC requests
      if (Array.isArray(body)) {
        const results = await Promise.all(body.map(item => processSingleJsonRpc(item, sessionId)));
        const responses = results.map(r => r.response).filter(Boolean);
        if (responses.length === 0) {
          res.status(204).end();
        } else {
          res.json(responses);
        }
        return;
      }

      // Handle single JSON-RPC request / notification
      const { response, isNotification } = await processSingleJsonRpc(body, sessionId);

      if (isNotification && response === undefined) {
        res.status(200).json({ jsonrpc: '2.0' });
        return;
      }

      if (response?.error && !response.id) {
        res.status(400).json(response);
        return;
      }

      res.status(200).json(response);
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  });

  // 4. SSE Streaming Transport: GET /sse & POST /messages
  app.get('/sse', async (req: Request, res: Response) => {
    const host = req.get('host') || `localhost:${port}`;
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    const messagesUrl = `${proto}://${host}/messages`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const transport = new SSEServerTransport(messagesUrl, res);
    sseTransports.set(transport.sessionId, transport);

    res.on('close', () => {
      console.log(`[MCP Server] SSE session closed: ${transport.sessionId}`);
      sseTransports.delete(transport.sessionId);
    });

    const { server } = createZayunoMcpServer();
    await server.connect(transport);
  });

  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = (req.query.sessionId as string) || (req.headers['mcp-session-id'] as string);

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId query parameter. Connect via GET /sse first.' });
      return;
    }

    const transport = sseTransports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `SSE Session ${sessionId} not found or expired. Re-connect via GET /sse.` });
      return;
    }

    await transport.handlePostMessage(req, res, req.body);
  });

  // 5. Interactive Welcome & Verification Webpage: GET /
  app.get('/', (req: Request, res: Response) => {
    const host = req.get('host') || `localhost:${port}`;
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    const baseUrl = `${proto}://${host}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zayuno MCP Server — Action Infrastructure for AI Agents</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style> body { font-family: 'Plus Jakarta Sans', sans-serif; } </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6">
  <div class="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-2xl shadow-lg shadow-emerald-900/30">
        ⚡
      </div>
      <div>
        <h1 class="text-xl font-extrabold text-white">Zayuno MCP Remote Server</h1>
        <p class="text-xs text-emerald-400 font-semibold">Model Context Protocol for ChatGPT & AI Agents</p>
      </div>
    </div>

    <div class="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono">
      <div class="flex justify-between">
        <span class="text-slate-500">Status:</span>
        <span class="text-emerald-400 font-bold">ONLINE (Streamable HTTP & SSE)</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-500">Streamable HTTP:</span>
        <span class="text-teal-400 font-bold">${baseUrl}/mcp</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-500">SSE Endpoint:</span>
        <span class="text-amber-400 font-bold">${baseUrl}/sse</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-500">Registered Tools:</span>
        <span class="text-white font-bold">12 Capability Tools</span>
      </div>
    </div>

    <div class="space-y-2 text-xs text-slate-300">
      <h2 class="font-bold text-white uppercase text-[11px] tracking-wider text-slate-400">OpenAI ChatGPT Setup URL</h2>
      <p>Use your public HTTPS URL with <code>/mcp</code> in ChatGPT Apps & Plugins:</p>
      <div class="p-3 bg-slate-800/80 rounded-xl font-mono text-emerald-300 text-xs select-all break-all">
        ${baseUrl}/mcp
      </div>
    </div>

    <div class="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
      <a href="/health" class="text-slate-400 hover:text-white font-semibold">/health</a>
      <a href="/tools" class="text-emerald-400 hover:underline font-bold">Inspect Tools JSON (${ZAYUNO_MCP_TOOLS.length}) →</a>
    </div>
  </div>
</body>
</html>
    `;
    res.send(html);
  });

  app.listen(port, () => {
    console.log(`🤖 Zayuno MCP Server listening on http://localhost:${port}`);
    console.log(`🌐 Streamable HTTP: http://localhost:${port}/mcp`);
    console.log(`📡 SSE Endpoint: http://localhost:${port}/sse`);
    console.log(`🩺 Health & Tools: http://localhost:${port}/health & /tools`);
  });

  return app;
}

// Direct execution support if run directly as script
if (process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts')) {
  const port = parseInt(process.env.PORT || '4002', 10);
  runHttpSseServer(port);
}
