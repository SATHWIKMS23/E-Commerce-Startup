/**
 * Shared Cache Service with Redis and in-memory fallback.
 *
 * Production note:
 * - Backed by Redis with automatic failover to an in-memory LRU-like Map.
 * - Only public, idempotent GET responses are cached. Auth, payments, orders,
 *   checkout and admin mutations are NEVER cached (see src/middleware/cache.ts).
 * - Prefix deletion uses Redis SCAN + UNLINK to prevent event-loop blocking.
 */

import { getRedisClient, isRedisReady } from "../../config/redis.js";
import { logger } from "../../config/logger.js";

export interface CacheStore {
  get(key: string): Promise<string | undefined> | string | undefined;
  set(key: string, value: string, ttlMs: number): Promise<void> | void;
  del(key: string): Promise<number> | number;
  delByPrefix(prefix: string): Promise<number> | number;
  flush(): Promise<void> | void;
  readonly size?: number;
}

export class MemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();
  private readonly maxEntries = 5000;

  get(key: string): string | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  del(key: string): number {
    return this.store.delete(key) ? 1 : 0;
  }

  delByPrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  flush(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export class RedisCacheStore implements CacheStore {
  private readonly memoryFallback = new MemoryCacheStore();

  async get(key: string): Promise<string | undefined> {
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          const val = await client.get(key);
          if (val !== null) return val;
          return undefined;
        }
      } catch (err: any) {
        logger.warn(`[Cache:Redis] get("${key}") failed, falling back to memory: ${err?.message ?? err}`);
      }
    }
    return this.memoryFallback.get(key);
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          if (ttlMs > 0) {
            await client.set(key, value, { PX: ttlMs });
          } else {
            await client.set(key, value);
          }
          return;
        }
      } catch (err: any) {
        logger.warn(`[Cache:Redis] set("${key}") failed, falling back to memory: ${err?.message ?? err}`);
      }
    }
    this.memoryFallback.set(key, value, ttlMs);
  }

  async del(key: string): Promise<number> {
    let removed = 0;
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          removed = await client.del(key);
        }
      } catch (err: any) {
        logger.warn(`[Cache:Redis] del("${key}") failed, falling back to memory: ${err?.message ?? err}`);
      }
    }
    const memRemoved = this.memoryFallback.del(key);
    return removed || memRemoved;
  }

  async delByPrefix(prefix: string): Promise<number> {
    let removed = 0;
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          const keysToDelete: string[] = [];
          for await (const key of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
            keysToDelete.push(typeof key === 'string' ? key : String(key));
            if (keysToDelete.length >= 100) {
              const deleted = await client.unlink(keysToDelete);
              removed += deleted;
              keysToDelete.length = 0;
            }
          }
          if (keysToDelete.length > 0) {
            const deleted = await client.unlink(keysToDelete);
            removed += deleted;
          }
        }
      } catch (err: any) {
        logger.warn(`[Cache:Redis] delByPrefix("${prefix}") failed, falling back to memory: ${err?.message ?? err}`);
      }
    }
    const memRemoved = this.memoryFallback.delByPrefix(prefix);
    return removed + memRemoved;
  }

  async flush(): Promise<void> {
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          await client.flushDb();
        }
      } catch (err: any) {
        logger.warn(`[Cache:Redis] flush() failed: ${err?.message ?? err}`);
      }
    }
    this.memoryFallback.flush();
  }

  get size(): number {
    return this.memoryFallback.size;
  }
}

/**
 * Safe JSON serialization helpers with error handling.
 */
export function safeJsonStringify<T>(data: T): string | null {
  try {
    return JSON.stringify(data);
  } catch (err: any) {
    logger.error("[Cache] Failed to serialize JSON:", err?.message ?? err);
    return null;
  }
}

export function safeJsonParse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch (err: any) {
    logger.error("[Cache] Failed to parse JSON:", err?.message ?? err);
    return null;
  }
}

export const cacheStore: CacheStore = new RedisCacheStore();
