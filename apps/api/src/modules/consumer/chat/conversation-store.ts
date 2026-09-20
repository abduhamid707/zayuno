import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ConversationState, emptyConversationState } from '@zayuno/contracts';
import { RedisService } from '../../../common/services/redis.service';

/** Critical state uses direct Redis commands: cache helpers intentionally swallow failures. */
export class ConversationStore {
  constructor(private readonly redis: RedisService) {}
  async run<T>(userId: string, conversationId: string | undefined,
    task: (state: ConversationState, save: () => Promise<void>) => Promise<T>): Promise<T> {
    const scope = createHash('sha256').update(JSON.stringify([userId, conversationId || 'default'])).digest('hex');
    const key = `conversation:v1:${scope}`;
    const lock = `${key}:lock`;
    const token = randomUUID();
    const client = this.redis.getClient();
    if (!client || client.status !== 'ready') throw new ServiceUnavailableException('Conversation storage unavailable');
    let acquired: string | null;
    try { acquired = await client.set(lock, token, 'EX', 180, 'NX'); }
    catch { throw new ServiceUnavailableException('Conversation storage unavailable'); }
    if (acquired !== 'OK') throw new ConflictException('Conversation is processing another message');
    try {
      const raw = await client.get(key);
      const state: ConversationState = raw ? JSON.parse(raw) : emptyConversationState();
      if (state.version !== 1) throw new ServiceUnavailableException('Unsupported conversation state');
      const save = async () => {
        state.updatedAt = new Date().toISOString();
        const saved = await client.eval(
          "if redis.call('get',KEYS[2])~=ARGV[1] then return 0 end redis.call('set',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1",
          2, key, lock, token, JSON.stringify(state), 86400 * 7);
        if (saved !== 1) throw new ConflictException('Conversation lease expired');
      };
      const result = await task(state, save);
      await save();
      return result;
    } finally {
      await client.eval("if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) end return 0", 1, lock, token);
    }
  }
}
