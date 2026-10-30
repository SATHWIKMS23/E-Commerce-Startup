import type { Request, Response, NextFunction } from "express";
import { cacheStore } from "../services/cache/cache.service.js";

const CACHE_PREFIX = "c:";

/**
 * Response-cache middleware for public, idempotent GET endpoints.
 *
 * - Keys are the full request URL (path + query), so distinct queries are
 *   cached separately.
 * - Only successful (2xx) JSON responses are stored.
 * - Emits `Cache-Control: public, max-age=<ttl>` plus an `X-Cache` header for
 *   observability (HIT / MISS).
 * - MUST NOT be applied to endpoints that return user-specific data.
 */
export const cache = (ttlSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();

    const key = `${CACHE_PREFIX}${req.originalUrl}`;
    try {
      const hit = await cacheStore.get(key);
      if (hit !== undefined) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Cache-Control", `public, max-age=${ttlSeconds}`);
        res.status(200);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.send(hit);
      }
    } catch {
      // In case of unexpected cache lookup error, gracefully bypass to database handler
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      res.removeHeader("X-Cache");
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const serialized = JSON.stringify(body);
          Promise.resolve(cacheStore.set(key, serialized, ttlSeconds * 1000)).catch(() => {});
        } catch {
          // Circular structure or serialization error; ignore safely
        }
        res.setHeader("X-Cache", "MISS");
      }
      res.setHeader("Cache-Control", `public, max-age=${ttlSeconds}`);
      return originalJson(body);
    }) as typeof res.json;

    return next();
  };
};

/** Invalidate every cached public response (called after public-facing mutations). */
export const invalidatePublicCache = (): void => {
  Promise.resolve(cacheStore.delByPrefix(CACHE_PREFIX)).catch((err) => {
    console.error("[Cache] Invalidation error:", err);
  });
};

/** Async version for callers and tests that want to await invalidation completion. */
export const invalidatePublicCacheAsync = async (): Promise<number> => {
  try {
    return await cacheStore.delByPrefix(CACHE_PREFIX);
  } catch (err) {
    console.error("[Cache] Async invalidation error:", err);
    return 0;
  }
};
