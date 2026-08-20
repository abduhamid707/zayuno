import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { parseTelegramChannelPost, parseTelegramChannelHtml } from './parser.js';
import { ParsedRecruitmentPost } from './types.js';

export interface TelegramChannelFetchOptions {
  channelName?: string;
  limit?: number;
}

export class TelegramChannelFetcher {
  private apiId: number;
  private apiHash: string;
  private sessionString: string;
  private allowWebFallback: boolean;
  private requireMtproto: boolean;
  private client: TelegramClient | null = null;
  private isConnecting = false;

  constructor() {
    // Read ONLY from environment variables (Zero hardcoded secrets in source code)
    this.apiId = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
    this.apiHash = process.env.TELEGRAM_API_HASH || '';
    this.sessionString = process.env.TELEGRAM_SESSION || '';
    this.allowWebFallback = process.env.TELEGRAM_ALLOW_WEB_FALLBACK !== 'false';
    this.requireMtproto = process.env.TELEGRAM_REQUIRE_MTPROTO === 'true';
  }

  private async getClient(): Promise<TelegramClient | null> {
    if (this.client && this.client.connected) {
      return this.client;
    }

    if (!this.apiId || !this.apiHash) {
      return null;
    }

    if (this.isConnecting) return null;

    try {
      this.isConnecting = true;
      const session = new StringSession(this.sessionString);
      const client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 2,
        timeout: 8000,
        useIPV6: false
      });

      await client.connect();
      this.client = client;
      return this.client;
    } catch (err) {
      console.warn('[TelegramChannelFetcher] MTProto connect warning:', err instanceof Error ? err.message : err);
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Fetches real-time public channel posts.
   * Flow:
   * 1. If authenticated MTProto session is available, fetch via MTProto client.
   * 2. If MTProto session is not configured and web fallback is allowed, fetch via live public channel web reader.
   * 3. If MTProto is strictly required or both fail, return empty list [].
   * STRICT: Never returns hardcoded fake demo data.
   */
  async fetchChannelPosts(options: TelegramChannelFetchOptions = {}): Promise<ParsedRecruitmentPost[]> {
    const channel = options.channelName || 'UstozShogird';
    const limit = options.limit || 50;

    // 1. Try MTProto if session string is configured in env
    if (this.apiId > 0 && this.apiHash && this.sessionString && this.sessionString.trim().length > 0) {
      const mtprotoClient = await this.getClient();
      if (mtprotoClient && mtprotoClient.connected) {
        try {
          const messages = await mtprotoClient.getMessages(channel, { limit });
          const posts: ParsedRecruitmentPost[] = [];

          for (const msg of messages) {
            if (msg && msg.message && typeof msg.message === 'string') {
              const postUrl = `https://t.me/${channel}/${msg.id}`;
              const postedAt = msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString();
              const parsed = parseTelegramChannelPost(msg.message, postUrl, postedAt);
              if (parsed) {
                parsed.channel = channel;
                posts.push(parsed);
              }
            }
          }

          if (posts.length > 0) {
            return posts;
          }
        } catch (err) {
          console.warn('[TelegramChannelFetcher] MTProto query failed:', err instanceof Error ? err.message : err);
        }
      }
    }

    // 2. If MTProto is strictly required, do not fallback to web
    if (this.requireMtproto) {
      console.warn(`[TelegramChannelFetcher] TELEGRAM_REQUIRE_MTPROTO is true and MTProto session unavailable for channel @${channel}. Returning empty list.`);
      return [];
    }

    // 3. Fetch via Live Telegram Public Web Preview (if allowed in env)
    if (this.allowWebFallback) {
      try {
        const webUrl = `https://t.me/s/${channel}`;
        const res = await fetch(webUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (res.ok) {
          const html = await res.text();
          const posts = parseTelegramChannelHtml(html, channel);
          if (posts.length > 0) {
            return posts;
          }
        }
      } catch (err) {
        console.warn('[TelegramChannelFetcher] Web reader error:', err instanceof Error ? err.message : err);
      }
    }

    // 4. Return clean empty list if unreachable
    return [];
  }
}
