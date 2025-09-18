// main/helpers/redisClient.ts
import Redis, { RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || undefined;

let redis: Redis;
if (REDIS_URL) {
  redis = new Redis(REDIS_URL);
} else {
  const redisConfig: RedisOptions = {
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || '',
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    tls: process.env.REDIS_TLS === 'true' ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10000,
    maxRetriesPerRequest: 20,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  };
  redis = new Redis(redisConfig);
}

// Logging
redis.on('connect', () => console.log('✅ Verbonden met Redis'));
redis.on('ready', () => console.log('🚀 Redis is ready'));
redis.on('error', (err) => console.error('❌ Redis error:', err));
redis.on('end', () => console.warn('⚠️ Redis connection closed'));

let isOfflineMode = false;
const offlineCache = new Map<string, string>();

export async function ensureConnection(): Promise<boolean> {
  if (isOfflineMode) return false;
  try {
    if ((redis as any).status !== 'ready') {
      if (typeof (redis as any).connect === 'function') await (redis as any).connect();
    }
    await redis.ping();
    isOfflineMode = false;
    return true;
  } catch (err) {
    console.error('Redis connection failed:', err);
    isOfflineMode = true;
    return false;
  }
}

export const db = {
  async get(key: string): Promise<string | null> {
    const ok = await ensureConnection();
    if (!ok) return offlineCache.get(key) ?? null;
    try {
      return await redis.get(key);
    } catch (err) {
      console.error('db.get error for', key, err);
      return offlineCache.get(key) ?? null;
    }
  },

  async set(key: string, value: string): Promise<'OK' | null> {
    const ok = await ensureConnection();
    if (!ok) { offlineCache.set(key, value); return 'OK'; }
    try {
      return await redis.set(key, value);
    } catch (err) {
      console.error('db.set error for', key, err);
      offlineCache.set(key, value);
      return 'OK';
    }
  },

  async del(...keys: string[]): Promise<number> {
    const ok = await ensureConnection();
    if (!ok) {
      let deleted = 0;
      for (const k of keys) if (offlineCache.delete(k)) deleted++;
      return deleted;
    }
    try {
      return await redis.del(...keys);
    } catch (err) {
      console.error('db.del error', err);
      return 0;
    }
  },

  async keys(pattern: string): Promise<string[]> {
    const ok = await ensureConnection();
    if (!ok) {
      const p = pattern.replace('*', '');
      return Array.from(offlineCache.keys()).filter(k => k.includes(p));
    }
    try {
      return await redis.keys(pattern);
    } catch (err) {
      console.error('db.keys error', err);
      return [];
    }
  },
};

export { redis };