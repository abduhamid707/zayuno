import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { ZayunoApiClient } from './client.js';
import { registerZayunoTools, ZAYUNO_MCP_TOOLS } from './tools.js';
import { getWelcomeMessage } from '@zayuno/shared';

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

ASOSIY QOIDALAR:
1. Birinchi salomlashuv:
   Mijoz birinchi marta yozganda yoki "nima qila olasan?" deb so‘raganda:
   HAR DOIM get_welcome_message toolini chaqirib, undan olingan dynamic welcomeMessage matnidan foydalaning.
   Agar get_welcome_message dan count olinmasa yoki xatolik bo‘lsa, quyidagi xabarni bering:
   "Zayuno sizga uzoqni yaqin qiladi. Nima qilishni xohlaysiz?

Men ovqat buyurtma qilish, poyez yoki aviachipta topish, turli xizmatlarni qidirish va buyurtmalarni kuzatishda yordam bera olaman. Bir qancha yo‘nalishlarda yordam bera olaman."

2. Natijaga yo‘naltirilgan muloqot:
   - Har bir javobni natija bilan boshlang, keyin faqat kerakli tafsilotlarni bering.
   - Mijoz "ovqat xohlayman" desa: kategoriya, budjet yoki joylashuvni so‘rang.
   - Mijoz "chipta olmoqchiman" desa: jo‘nash joyi, manzil, sana va yo‘lovchilar sonini so‘rang.

3. Buyurtma va Kotirovka (Quote & Action):
   - Buyurtma yaratishdan (create_action) oldin HAR DOIM kotirovka (request_quote) hisoblang.
   - Kotirovkani mijozga aniq ko‘rsating (masalan: "Chipta topildi: Toshkent Janubiy → Guliston, Bugun 16:00, Platskart 10-vagon 1-joy, Jami: 118 000 so‘m. Shu chiptani band qilaymi?").
   - QAT'IY QOIDA: Mijoz "ha", "tasdiqlayman", "xa" deb aniq tasdiqlamaguncha create_action chaqirmang.

4. To‘lov va Statuslar:
   - Buyurtma yaratilgach, to‘lov linkini bering: "[To‘lov sahifasini ochish](url)".
   - To‘lov qabul qilinmaguncha "to‘landi" yoki "tasdiqlandi" deb aytmang.
   - To‘lov kutilayotganda: "Chipta band qilingan, lekin to‘lov hali qilinmagan. [To‘lovni yakunlash](url)".
   - To‘lov qabul qilingach: "Zo‘r, to‘lov qabul qilindi. Chiptangiz tasdiqlandi."
   - Bekor qilinganda: "Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman."
   - Agar provider sandbox/demo bo‘lsa, to‘lov linki oldidan bir marta: "Bu demo buyurtma, haqiqiy to‘lov olinmaydi." deb ayting (real provider uchun demo so‘zini ishlatmang).

5. CustomerMessage va Maxfiylik:
   - Har bir tool qaytargan \`customerMessage\` mijozga ko‘rsatilishi kerak bo‘lgan yagona tayyor matndir. Model \`customerMessage\`ni ustuvor va deyarli to‘g‘ridan-to‘g‘ri (verbatim) ishlatishi shart.
   - Tool natijasidagi texnik maydonlar (\`actionId\`, \`quoteId\`, \`status\`, \`publicId\`, \`idempotencyKey\`) faqat keyingi tool chaqiruvlari uchun model xotirasida saqlanadi, mijozga hech qachon ko‘rsatilmaydi.

6. QAT'IYAN TAQIQLANGAN:
   - Raw statuslarni ko‘rsatmang (AWAITING_PAYMENT, PENDING, CONFIRMED, CANCELLED o‘rniga insoniy o‘zbekcha matn ishlating).
   - Action ID, Order ID, Quote ID, External ID larni mijozga ko‘rsatmang.
   - Webhook, API, MCP, certification, idempotency kabi texnik so‘zlarni ishlatmang.
   - Mijozning telefon raqami, email yoki to‘liq manzilini qayta echo qilib ko‘rsatmang.
   - Ichki xatoliklar yoki debug ma’lumotlarini chiqarib bermang.`
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
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Store active SSE sessions
  const sseTransports = new Map<string, SSEServerTransport>();

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
        outputSchema: (tool as any).outputSchema,
        annotations: tool.annotations
      }))
    });
  });

  // 3. Streamable HTTP JSON-RPC Endpoint: POST /mcp & GET /mcp
  app.all('/mcp', async (req: Request, res: Response) => {
    if (req.method === 'GET') {
      res.json({
        status: 'online',
        transport: 'streamable-http',
        toolsCount: ZAYUNO_MCP_TOOLS.length,
        version: '1.0.0'
      });
      return;
    }

    if (req.method === 'POST') {
      const { id, method, params } = req.body || {};

      if (method === 'initialize') {
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              prompts: { listChanged: false }
            },
            serverInfo: {
              name: 'zayuno-action-server',
              version: '1.0.0'
            }
          }
        });
        return;
      }

      if (method === 'prompts/list') {
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            prompts: ZAYUNO_MCP_PROMPTS.map(p => ({
              name: p.name,
              description: p.description
            }))
          }
        });
        return;
      }

      if (method === 'prompts/get') {
        const promptName = params?.name;
        const prompt = ZAYUNO_MCP_PROMPTS.find(p => p.name === promptName);
        if (!prompt) {
          res.status(404).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Prompt not found: ${promptName}` }
          });
          return;
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
          res.json({
            jsonrpc: '2.0',
            id,
            result: {
              description: prompt.description,
              messages: [{ role: 'assistant', content: { type: 'text', text: welcomeText } }]
            }
          });
          return;
        }

        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            description: prompt.description,
            messages: prompt.messages
          }
        });
        return;
      }

      if (method === 'tools/list') {
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: ZAYUNO_MCP_TOOLS.map(t => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
              annotations: t.annotations
            }))
          }
        });
        return;
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const apiClient = new ZayunoApiClient();

        try {
          const tool = ZAYUNO_MCP_TOOLS.find(candidate => candidate.name === toolName);
          if (!tool) {
            res.status(404).json({
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Tool not found: ${toolName}` }
            });
            return;
          }

          // Tool discovery and execution share the same definition. This prevents
          // an advertised MCP tool from being omitted from a separate dispatcher.
          const result = await tool.handler(toolArgs, apiClient);

          res.json({
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
          });
        } catch (err: any) {
          res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32000, message: err.message || 'Internal tool execution error' }
          });
        }
        return;
      }

      res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unsupported method: ${method}` }
      });
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
