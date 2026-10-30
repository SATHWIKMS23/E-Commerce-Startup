import { createClient, type RedisClientType } from 'redis';
import { logger } from './logger.js';

let primaryClient: RedisClientType | null = null;
let subscriberClient: RedisClientType | null = null;
let isInitializing = false;

function buildClient(label: string): RedisClientType {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    const client: RedisClientType = createClient({
        url: redisUrl,
        socket: {
            reconnectStrategy: (retries: number) => {
                // Exponential backoff capped at 3000ms
                const delay = Math.min(Math.pow(2, Math.min(retries, 8)) * 50, 3000);
                logger.warn(`[Redis:${label}] Reconnecting in ${delay}ms (attempt #${retries})...`);
                return delay;
            }
        }
    });

    client.on('error', (err) => {
        logger.error(`[Redis:${label}] Error:`, { error: err?.message ?? String(err) });
    });

    client.on('connect', () => {
        logger.info(`[Redis:${label}] Socket connected.`);
    });

    client.on('ready', () => {
        logger.info(`[Redis:${label}] Client ready.`);
    });

    client.on('reconnecting', () => {
        logger.warn(`[Redis:${label}] Reconnecting...`);
    });

    client.on('end', () => {
        logger.info(`[Redis:${label}] Connection closed.`);
    });

    return client;
}

/**
 * Initializes primary and subscriber Redis clients.
 * Gracefully handles offline Redis without crashing the process.
 */
export async function initRedis(): Promise<{ client: RedisClientType; subscriber: RedisClientType } | null> {
    if (primaryClient && subscriberClient) {
        return { client: primaryClient, subscriber: subscriberClient };
    }

    if (isInitializing) {
        // Wait briefly if initialization is already in flight
        return primaryClient && subscriberClient
            ? { client: primaryClient, subscriber: subscriberClient }
            : null;
    }

    isInitializing = true;

    try {
        if (!primaryClient) {
            primaryClient = buildClient('primary');
        }
        if (!subscriberClient) {
            subscriberClient = buildClient('subscriber');
        }

        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        await Promise.allSettled([
            primaryClient.connect().catch((err) => {
                logger.warn(`[Redis:primary] Initial connection failed to ${redisUrl}. Continuing with fallback. Error: ${err.message}`);
            }),
            subscriberClient.connect().catch((err) => {
                logger.warn(`[Redis:subscriber] Initial connection failed to ${redisUrl}. Continuing with fallback. Error: ${err.message}`);
            })
        ]);

        return { client: primaryClient, subscriber: subscriberClient };
    } catch (err: any) {
        logger.error('[Redis] Unexpected error during initialization:', err?.message ?? err);
        return null;
    } finally {
        isInitializing = false;
    }
}

/**
 * Returns the primary Redis client for caching and publishing.
 */
export function getRedisClient(): RedisClientType | null {
    return primaryClient;
}

/**
 * Returns the dedicated Redis subscriber client.
 */
export function getRedisSubscriber(): RedisClientType | null {
    return subscriberClient;
}

/**
 * Checks whether the primary Redis client socket is open.
 * Note: An open socket does not guarantee Redis readiness to accept commands.
 */
export function isRedisOpen(): boolean {
    return Boolean(primaryClient && primaryClient.isOpen);
}

/**
 * Checks whether the subscriber Redis client socket is open.
 */
export function isSubscriberOpen(): boolean {
    return Boolean(subscriberClient && subscriberClient.isOpen);
}

/**
 * Checks whether the primary Redis client is open and ready to process commands.
 */
export function isRedisReady(): boolean {
    return Boolean(primaryClient && primaryClient.isReady);
}

/**
 * Checks whether the subscriber Redis client is open and ready to receive pub/sub commands.
 */
export function isSubscriberReady(): boolean {
    return Boolean(subscriberClient && subscriberClient.isReady);
}

/**
 * Allows injecting mock or test Redis clients during unit and integration tests.
 */
export function setRedisClientsForTesting(
    client: RedisClientType | null,
    subscriber: RedisClientType | null
): void {
    primaryClient = client;
    subscriberClient = subscriber;
}

/**
 * Gracefully shuts down both Redis connections.
 */
export async function closeRedis(): Promise<void> {
    const clientsToClose = [
        { name: 'primary', client: primaryClient },
        { name: 'subscriber', client: subscriberClient }
    ];

    primaryClient = null;
    subscriberClient = null;

    for (const { name, client } of clientsToClose) {
        if (client && client.isOpen) {
            try {
                await client.quit();
                logger.info(`[Redis:${name}] Gracefully disconnected.`);
            } catch (err) {
                try {
                    await client.disconnect();
                } catch {
                    // Ignore disconnect error during shutdown
                }
            }
        }
    }
}

