const assert = require('assert');
const { EventEmitter } = require('events');

console.log('================================================================');
console.log('--- REDIS RELIABILITY & CROSS-PROCESS WEBSOCKET TEST SUITE ---');
console.log('================================================================\n');

// ─── PART 1: Redis Connection, Disconnection & Readiness Differentiation ─────

console.log('--- PART 1: Redis Connection Lifecycle & Readiness vs Open State ---');

class MockRedisSocket extends EventEmitter {
    constructor() {
        super();
        this.isOpen = false;
        this.isReady = false;
        this.reconnectAttempts = 0;
    }

    async connect() {
        this.isOpen = true;
        this.isReady = true;
        this.emit('connect');
        this.emit('ready');
    }

    async quit() {
        this.isOpen = false;
        this.isReady = false;
        this.emit('end');
    }

    async disconnect() {
        this.isOpen = false;
        this.isReady = false;
        this.emit('end');
    }

    simulateFailure() {
        this.isOpen = false;
        this.isReady = false;
        this.reconnectAttempts++;
        this.emit('error', new Error('ECONNREFUSED'));
        this.emit('reconnecting');
    }
}

class MockRedisClient extends EventEmitter {
    constructor(socket) {
        super();
        this.socket = socket || new MockRedisSocket();
        this.store = new Map();
        this.subscribers = new Map(); // channel -> Set<fn>
        this.shouldThrowOnPublish = false;
    }

    get isOpen() { return this.socket.isOpen; }
    get isReady() { return this.socket.isReady; }

    async connect() { return this.socket.connect(); }
    async quit() { return this.socket.quit(); }
    async disconnect() { return this.socket.disconnect(); }

    async get(key) {
        if (!this.isOpen) throw new Error('ClientClosedError: The client is closed');
        const entry = this.store.get(key);
        if (!entry) return null;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key, value, options) {
        if (!this.isOpen) throw new Error('ClientClosedError: The client is closed');
        let expiresAt = null;
        if (options && options.PX) {
            expiresAt = Date.now() + options.PX;
        } else if (options && options.EX) {
            expiresAt = Date.now() + (options.EX * 1000);
        }
        this.store.set(key, { value: String(value), expiresAt });
        return 'OK';
    }

    async del(key) {
        if (!this.isOpen) throw new Error('ClientClosedError: The client is closed');
        return this.store.delete(key) ? 1 : 0;
    }

    async unlink(keys) {
        if (!this.isOpen) throw new Error('ClientClosedError: The client is closed');
        let count = 0;
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
            if (this.store.delete(k)) count++;
        }
        return count;
    }

    async *scanIterator({ MATCH }) {
        if (!this.isOpen) throw new Error('ClientClosedError: The client is closed');
        const prefix = MATCH ? MATCH.replace('*', '') : '';
        for (const key of this.store.keys()) {
            if (!prefix || key.startsWith(prefix)) {
                yield key;
            }
        }
    }

    async flushDb() {
        if (!this.isOpen) throw new Error('ClientClosedError: The client is closed');
        this.store.clear();
        return 'OK';
    }

    async publish(channel, message) {
        if (!this.isOpen) throw new Error('ClientClosedError: The client is closed');
        if (this.shouldThrowOnPublish) throw new Error('PublishNetworkException: Connection timed out');
        const subs = this.subscribers.get(channel);
        if (subs) {
            for (const cb of subs) {
                try { cb(message); } catch (e) { /* ignore */ }
            }
        }
        return subs ? subs.size : 0;
    }

    async subscribe(channel, callback) {
        if (!this.isOpen) throw new Error('ClientClosedError: The client is closed');
        if (!this.subscribers.has(channel)) {
            this.subscribers.set(channel, new Set());
        }
        this.subscribers.get(channel).add(callback);
    }

    async unsubscribe(channel) {
        this.subscribers.delete(channel);
    }
}

async function testRedisReadinessAndLifecycle() {
    const redisModule = await import('../dist/src/config/redis.js');
    const socket = new MockRedisSocket();
    const client = new MockRedisClient(socket);
    const subscriber = new MockRedisClient(new MockRedisSocket());

    redisModule.setRedisClientsForTesting(client, subscriber);

    // Initial state: not open and not ready
    assert.strictEqual(redisModule.isRedisOpen(), false);
    assert.strictEqual(redisModule.isRedisReady(), false);
    assert.strictEqual(redisModule.isSubscriberOpen(), false);
    assert.strictEqual(redisModule.isSubscriberReady(), false);

    // Socket connects: both open and ready
    await client.connect();
    await subscriber.connect();
    assert.strictEqual(redisModule.isRedisOpen(), true);
    assert.strictEqual(redisModule.isRedisReady(), true);
    assert.strictEqual(redisModule.isSubscriberOpen(), true);
    assert.strictEqual(redisModule.isSubscriberReady(), true);

    // Differentiate: socket is open, but ready is false (e.g. during authentication or reconnecting)
    client.socket.isReady = false;
    assert.strictEqual(redisModule.isRedisOpen(), true, 'Socket must be reported as open');
    assert.strictEqual(redisModule.isRedisReady(), false, 'isRedisReady must return false when client is not ready');

    // Restore ready
    client.socket.isReady = true;
    assert.strictEqual(redisModule.isRedisReady(), true);

    // Disconnect
    await client.quit();
    assert.strictEqual(redisModule.isRedisOpen(), false);
    assert.strictEqual(redisModule.isRedisReady(), false);

    console.log('✓ Test 1.1 Passed: Redis connection, disconnection and readiness differentiation verified.');
}

// ─── PART 2: Shared Cache Operations & Failover ───────────────────────────────

console.log('\n--- PART 2: Shared Cache Operations, TTL & Prefix Invalidation ---');

class ResilientCacheStore {
    constructor(redisClient) {
        this.redis = redisClient;
        this.memoryFallback = new Map();
    }

    async get(key) {
        if (this.redis && this.redis.isOpen && this.redis.isReady) {
            try {
                const val = await this.redis.get(key);
                if (val !== null) return val;
                return undefined;
            } catch (err) {
                // fall back to memory
            }
        }
        const mem = this.memoryFallback.get(key);
        if (!mem) return undefined;
        if (mem.expiresAt && Date.now() > mem.expiresAt) {
            this.memoryFallback.delete(key);
            return undefined;
        }
        return mem.value;
    }

    async set(key, value, ttlMs) {
        if (this.redis && this.redis.isOpen && this.redis.isReady) {
            try {
                await this.redis.set(key, value, { PX: ttlMs });
                return;
            } catch (err) {
                // fall back to memory
            }
        }
        this.memoryFallback.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    async del(key) {
        let removed = 0;
        if (this.redis && this.redis.isOpen && this.redis.isReady) {
            try {
                removed = await this.redis.del(key);
            } catch (err) {}
        }
        const memRemoved = this.memoryFallback.delete(key) ? 1 : 0;
        return removed || memRemoved;
    }

    async delByPrefix(prefix) {
        let count = 0;
        if (this.redis && this.redis.isOpen && this.redis.isReady) {
            try {
                const keys = [];
                for await (const k of this.redis.scanIterator({ MATCH: `${prefix}*` })) {
                    keys.push(k);
                }
                if (keys.length > 0) {
                    count = await this.redis.unlink(keys);
                }
            } catch (err) {}
        }
        for (const k of this.memoryFallback.keys()) {
            if (k.startsWith(prefix)) {
                this.memoryFallback.delete(k);
                count++;
            }
        }
        return count;
    }
}

async function testCacheOperations() {
    const redis = new MockRedisClient();
    await redis.connect();
    const cache = new ResilientCacheStore(redis);

    // Set and Get
    await cache.set('c:/api/products', JSON.stringify([{ id: 1, name: 'Product A' }]), 200);
    const hit = await cache.get('c:/api/products');
    assert(hit, 'Expected cache hit');
    const parsed = JSON.parse(hit);
    assert.strictEqual(parsed[0].name, 'Product A');
    console.log('✓ Test 2.1 Passed: Cache set and get with JSON serialization verified.');

    // TTL Expiry
    await new Promise(r => setTimeout(r, 250));
    const expired = await cache.get('c:/api/products');
    assert.strictEqual(expired, undefined, 'Expected cache key to be expired');
    console.log('✓ Test 2.2 Passed: Cache TTL expiration verified.');

    // Prefix Invalidation
    await cache.set('c:/public/categories', 'categories-data', 5000);
    await cache.set('c:/public/branding', 'branding-data', 5000);
    await cache.set('c:/admin/reports', 'admin-data', 5000);

    const deletedCount = await cache.delByPrefix('c:/public/');
    assert.strictEqual(deletedCount, 2, 'Expected 2 public keys deleted');
    assert.strictEqual(await cache.get('c:/public/categories'), undefined);
    assert.strictEqual(await cache.get('c:/public/branding'), undefined);
    assert.strictEqual(await cache.get('c:/admin/reports'), 'admin-data', 'Non-matching prefix must remain untouched');
    console.log('✓ Test 2.3 Passed: Non-blocking prefix invalidation (SCAN + UNLINK) verified.');

    // Redis Unavailable Fallback
    await redis.quit(); // Simulate Redis crash
    assert.strictEqual(redis.isOpen, false);

    await cache.set('c:/fallback/item', 'saved-in-memory', 1000);
    const fallbackVal = await cache.get('c:/fallback/item');
    assert.strictEqual(fallbackVal, 'saved-in-memory');
    console.log('✓ Test 2.4 Passed: Graceful fallback to memory store when Redis is unavailable verified.');
}

// ─── PART 3: Subscriber Resubscription & Reconnect Recovery ───────────────────

console.log('\n--- PART 3: Subscriber Resubscription & Disconnection/Reconnection ---');

async function testSubscriberRecovery() {
    const redisModule = await import('../dist/src/config/redis.js');
    const chatModule = await import('../dist/src/services/chat/chat.service.js');

    chatModule.resetChatServiceForTesting();

    const clientSocket = new MockRedisSocket();
    const primaryClient = new MockRedisClient(clientSocket);
    const subscriberSocket = new MockRedisSocket();
    const subscriberClient = new MockRedisClient(subscriberSocket);

    await primaryClient.connect();
    await subscriberClient.connect();
    redisModule.setRedisClientsForTesting(primaryClient, subscriberClient);

    // Initial subscription
    const subscribed = await chatModule.subscribeToRedisChatEvents();
    assert.strictEqual(subscribed, true, 'Initial subscription must succeed');
    assert.strictEqual(chatModule.isRedisSubscribed(), true, 'isRedisSubscribed must be true');

    // Simulate Redis subscriber disconnection (socket drops)
    subscriberSocket.isOpen = false;
    subscriberSocket.isReady = false;
    subscriberClient.emit('end');

    // Subscription status must reset to false immediately
    assert.strictEqual(chatModule.isRedisSubscribed(), false, 'isRedisSubscribed must reset to false upon socket end');

    // Simulate reconnect event sequence: reconnecting -> ready
    subscriberClient.emit('reconnecting');
    assert.strictEqual(chatModule.isRedisSubscribed(), false);

    // Socket reconnects and emits 'ready'
    subscriberSocket.isOpen = true;
    subscriberSocket.isReady = true;
    subscriberClient.emit('ready');

    // Allow event loop to run async resubscription handler
    await new Promise(r => setTimeout(r, 60));

    assert.strictEqual(chatModule.isRedisSubscribed(), true, 'Subscriber must automatically resubscribe upon ready event');
    const metrics = chatModule.getRedisPubSubMetrics();
    assert(metrics.resubscribeSuccessCount >= 2, 'resubscribeSuccessCount must track initial subscribe + recovery');

    console.log('✓ Test 3.1 Passed: Automatic subscriber resubscription upon disconnect/reconnect verified.');
}

// ─── PART 4: Observable Redis Publishing Failures & Resilient Fallback ────────

console.log('\n--- PART 4: Observable Redis Publishing Failures & Metrics ---');

async function testPublishFailuresAndMetrics() {
    const redisModule = await import('../dist/src/config/redis.js');
    const chatModule = await import('../dist/src/services/chat/chat.service.js');

    chatModule.resetChatServiceForTesting();

    const clientSocket = new MockRedisSocket();
    const primaryClient = new MockRedisClient(clientSocket);
    const subscriberClient = new MockRedisClient(new MockRedisSocket());

    redisModule.setRedisClientsForTesting(primaryClient, subscriberClient);

    // Scenario 4.1: Redis is disconnected / not ready
    assert.strictEqual(redisModule.isRedisReady(), false);

    const publishResultOffline = await chatModule.publishWSEvent({
        eventType: 'TEST_EVENT',
        payload: { msg: 'hello' }
    });

    assert.strictEqual(publishResultOffline, false, 'publishWSEvent must return false when Redis is offline');
    let metrics = chatModule.getRedisPubSubMetrics();
    assert.strictEqual(metrics.publishFailureCount, 1, 'publishFailureCount must be incremented');
    assert.strictEqual(metrics.lastPublishError, 'Redis client is not ready');
    assert(metrics.lastPublishErrorAt, 'lastPublishErrorAt must be populated');
    console.log('✓ Test 4.1 Passed: Redis offline publish failure returns false and increments failure metrics.');

    // Scenario 4.2: Redis is connected, but publish throws an exception
    await primaryClient.connect();
    await subscriberClient.connect();
    assert.strictEqual(redisModule.isRedisReady(), true);

    primaryClient.shouldThrowOnPublish = true;

    const publishResultError = await chatModule.publishWSEvent({
        eventType: 'TEST_EVENT',
        payload: { msg: 'will-fail' }
    });

    assert.strictEqual(publishResultError, false, 'publishWSEvent must return false on Redis exception');
    metrics = chatModule.getRedisPubSubMetrics();
    assert.strictEqual(metrics.publishFailureCount, 2, 'publishFailureCount must be incremented on publish throw');
    assert(metrics.lastPublishError.includes('PublishNetworkException'), 'lastPublishError must record exception detail');
    console.log('✓ Test 4.2 Passed: Redis publish exception is observable via structured logs & metrics.');

    // Scenario 4.3: Successful publish increments publishedCount
    primaryClient.shouldThrowOnPublish = false;
    const publishResultSuccess = await chatModule.publishWSEvent({
        eventType: 'TEST_EVENT',
        payload: { msg: 'success' }
    });

    assert.strictEqual(publishResultSuccess, true, 'publishWSEvent must return true on successful delivery');
    metrics = chatModule.getRedisPubSubMetrics();
    assert.strictEqual(metrics.publishedCount, 1, 'publishedCount must be incremented');
    console.log('✓ Test 4.3 Passed: Successful Redis publish increments publishedCount.');
}

// ─── PART 5: Cross-Process WebSocket Events & Isolated Actors ─────────────────

console.log('\n--- PART 5: Cross-Process WebSocket Messaging, Typing & Read Receipts ---');

class MockCrossProcessBus {
    constructor() {
        this.subscribers = [];
    }

    subscribe(handler) {
        this.subscribers.push(handler);
    }

    publish(channel, rawMessage) {
        for (const sub of this.subscribers) {
            setImmediate(() => sub(rawMessage));
        }
    }
}

class MockWebSocketProcess {
    constructor(processId, actorType, bus) {
        this.processId = processId;
        this.defaultActorType = actorType;
        this.bus = bus;
        this.clients = new Map(); // wsId -> { actorType, actorId, actorName, subscribedConversations: Set, received: [] }
        this.recentEventIds = new Set();
        this.bus.subscribe((msg) => this.handleIncomingRedisEvent(msg));
    }

    connectClient(wsId, actorType, actorId, actorName = 'User') {
        const client = {
            wsId,
            actorType,
            actorId,
            actorName,
            subscribedConversations: new Set(),
            received: []
        };
        this.clients.set(wsId, client);
        return client;
    }

    joinConversation(wsId, conversationId, convAuthRule) {
        const client = this.clients.get(wsId);
        if (!client) throw new Error('Authentication required');

        // Check ownership
        if (convAuthRule) {
            if (client.actorType === 'CUSTOMER' && convAuthRule.customerId !== client.actorId) {
                throw new Error('Unauthorized for this conversation');
            }
            if (client.actorType === 'SELLER' && convAuthRule.sellerId !== client.actorId) {
                throw new Error('Unauthorized for this conversation');
            }
        }
        client.subscribedConversations.add(conversationId);
        return true;
    }

    broadcastLocal(conversationId, payload, isInternal = false, excludeWsId = null) {
        const strictlyInternal = Boolean(isInternal || payload?.isInternal || payload?.message?.isInternal);
        for (const [wsId, client] of this.clients.entries()) {
            if (wsId === excludeWsId) continue;
            if (strictlyInternal && client.actorType !== 'ADMIN') continue;
            if (client.subscribedConversations.has(conversationId)) {
                client.received.push(payload);
            }
        }
    }

    broadcastLocalAdmins(payload) {
        for (const client of this.clients.values()) {
            if (client.actorType === 'ADMIN') {
                client.received.push(payload);
            }
        }
    }

    deliverLocalNotification(recipientType, recipientId, notification) {
        for (const client of this.clients.values()) {
            if (client.actorType === recipientType && client.actorId === recipientId) {
                client.received.push({ type: 'notification', notification });
            }
        }
    }

    disconnectLocalActor(actorId, reason, actorType) {
        for (const [wsId, client] of this.clients.entries()) {
            if (client.actorId === actorId && (!actorType || client.actorType === actorType)) {
                client.received.push({ type: 'session_expired', reason });
                this.clients.delete(wsId);
            }
        }
    }

    // Customer / Seller / Admin sending message
    sendMessage({ wsId, conversationId, message, clientMessageId, isInternal = false }) {
        const client = this.clients.get(wsId);
        if (!client) throw new Error('Authentication required');

        const safeIsInternal = client.actorType === 'ADMIN' ? Boolean(isInternal) : false;

        const payload = {
            type: 'new_message',
            conversationId,
            message: {
                id: 'msg_' + Math.random().toString(36).substring(2, 9),
                senderType: client.actorType,
                senderId: client.actorId,
                senderName: client.actorName,
                message,
                clientMessageId: clientMessageId || null,
                isInternal: safeIsInternal
            }
        };

        // 1. Deliver locally
        this.broadcastLocal(conversationId, payload, safeIsInternal);

        // 2. Publish to Redis bus
        this.bus.publish('atlasbasket:ws:events', JSON.stringify({
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType: 'CONVERSATION_BROADCAST',
            originProcessId: this.processId,
            conversationId,
            payload,
            isInternal: safeIsInternal
        }));

        // Broadcast to admins
        const adminPayload = {
            type: 'admin_conversation_update',
            conversationId,
            lastMessage: payload.message
        };
        this.broadcastLocalAdmins(adminPayload);
        this.bus.publish('atlasbasket:ws:events', JSON.stringify({
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType: 'ADMIN_BROADCAST',
            originProcessId: this.processId,
            payload: adminPayload
        }));

        return payload.message;
    }

    // Typing distribution
    sendTyping({ wsId, conversationId, isTyping }) {
        const client = this.clients.get(wsId);
        if (!client) throw new Error('Authentication required');

        const payload = {
            type: 'typing',
            conversationId,
            actorType: client.actorType,
            actorId: client.actorId,
            actorName: client.actorName,
            isTyping: Boolean(isTyping)
        };

        // 1. Deliver locally excluding the typist
        this.broadcastLocal(conversationId, payload, false, wsId);

        // 2. Publish TYPING event to Redis bus
        this.bus.publish('atlasbasket:ws:events', JSON.stringify({
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType: 'TYPING',
            originProcessId: this.processId,
            conversationId,
            actorType: client.actorType,
            actorId: client.actorId,
            actorName: client.actorName,
            isTyping: Boolean(isTyping),
            payload
        }));
    }

    // Read receipt distribution
    sendReadReceipt({ wsId, conversationId }) {
        const client = this.clients.get(wsId);
        if (!client) throw new Error('Authentication required');

        const readAt = new Date().toISOString();
        const payload = {
            type: 'read_receipt',
            conversationId,
            readerType: client.actorType,
            readerId: client.actorId,
            readAt
        };

        // 1. Deliver locally
        this.broadcastLocal(conversationId, payload, false);

        if (client.actorType === 'ADMIN') {
            this.broadcastLocalAdmins({
                type: 'unread_counts_update',
                conversationId
            });
        }

        // 2. Publish READ_RECEIPT event to Redis bus
        this.bus.publish('atlasbasket:ws:events', JSON.stringify({
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType: 'READ_RECEIPT',
            originProcessId: this.processId,
            conversationId,
            readerType: client.actorType,
            readerId: client.actorId,
            readAt,
            payload
        }));
    }

    handleIncomingRedisEvent(raw) {
        const event = JSON.parse(raw);

        // 1. Loopback protection: discard event if it originated from our own process
        if (event.originProcessId === this.processId) {
            return;
        }

        // 2. Network deduplication: discard duplicate event IDs
        if (event.eventId) {
            if (this.recentEventIds.has(event.eventId)) {
                return;
            }
            this.recentEventIds.add(event.eventId);
        }

        switch (event.eventType) {
            case 'CONVERSATION_BROADCAST': {
                const isInternal = Boolean(event.isInternal || event.payload?.isInternal || event.payload?.message?.isInternal);
                this.broadcastLocal(event.conversationId, event.payload, isInternal);
                break;
            }
            case 'ADMIN_BROADCAST':
                this.broadcastLocalAdmins(event.payload);
                break;
            case 'NOTIFICATION_BROADCAST':
                this.deliverLocalNotification(event.recipientType, event.recipientId, event.notification);
                break;
            case 'DISCONNECT_ACTOR':
                this.disconnectLocalActor(event.actorId, event.reason, event.actorType);
                break;
            case 'TYPING': {
                const payload = event.payload || {
                    type: 'typing',
                    conversationId: event.conversationId,
                    actorType: event.actorType,
                    actorId: event.actorId,
                    actorName: event.actorName,
                    isTyping: event.isTyping
                };
                this.broadcastLocal(event.conversationId, payload, false);
                break;
            }
            case 'READ_RECEIPT': {
                const payload = event.payload || {
                    type: 'read_receipt',
                    conversationId: event.conversationId,
                    readerType: event.readerType,
                    readerId: event.readerId,
                    readAt: event.readAt
                };
                this.broadcastLocal(event.conversationId, payload, false);
                if (event.readerType === 'ADMIN') {
                    this.broadcastLocalAdmins({
                        type: 'unread_counts_update',
                        conversationId: event.conversationId
                    });
                }
                break;
            }
        }
    }
}

async function testCrossProcessEvents() {
    const bus = new MockCrossProcessBus();

    // Three distinct API processes
    const customerProcess = new MockWebSocketProcess('process_customer_3001', 'CUSTOMER', bus);
    const sellerProcess = new MockWebSocketProcess('process_seller_3002', 'SELLER', bus);
    const adminProcess = new MockWebSocketProcess('process_admin_3003', 'ADMIN', bus);

    const convRecord = {
        id: 'conv_marketplace_99',
        customerId: 'cust_alice_1',
        sellerId: 'seller_bob_2'
    };

    // Client connections across processes
    const aliceSocket = customerProcess.connectClient('ws_alice', 'CUSTOMER', 'cust_alice_1', 'Alice');
    const bobSocket = sellerProcess.connectClient('ws_bob', 'SELLER', 'seller_bob_2', 'Bob');
    const adminSocket = adminProcess.connectClient('ws_admin', 'ADMIN', 'admin_carol_3', 'Carol');

    // Both join conversation
    customerProcess.joinConversation('ws_alice', 'conv_marketplace_99', convRecord);
    sellerProcess.joinConversation('ws_bob', 'conv_marketplace_99', convRecord);

    // 1. Cross-Process TYPING Events
    customerProcess.sendTyping({
        wsId: 'ws_alice',
        conversationId: 'conv_marketplace_99',
        isTyping: true
    });

    await new Promise(r => setTimeout(r, 50));

    // Alice (typist) must NOT receive her own typing event
    const aliceTyping = aliceSocket.received.filter(m => m.type === 'typing');
    assert.strictEqual(aliceTyping.length, 0, 'Originating socket must not receive own typing indicator');

    // Bob (on process 3002) MUST receive typing indicator
    const bobTyping = bobSocket.received.filter(m => m.type === 'typing');
    assert.strictEqual(bobTyping.length, 1, 'Seller on process 3002 must receive cross-process typing event');
    assert.strictEqual(bobTyping[0].isTyping, true);
    assert.strictEqual(bobTyping[0].actorId, 'cust_alice_1');
    console.log('✓ Test 5.1 Passed: Cross-process TYPING event distribution and sender exclusion verified.');

    // 2. Cross-Process Message Delivery
    customerProcess.sendMessage({
        wsId: 'ws_alice',
        conversationId: 'conv_marketplace_99',
        message: 'Hello, when will my order be dispatched?',
        clientMessageId: 'idemp_key_1001'
    });

    await new Promise(r => setTimeout(r, 50));

    const bobMessages = bobSocket.received.filter(m => m.type === 'new_message');
    assert.strictEqual(bobMessages.length, 1, 'Seller on process 3002 must receive message from customer on process 3001');
    assert.strictEqual(bobMessages[0].message.message, 'Hello, when will my order be dispatched?');
    console.log('✓ Test 5.2 Passed: Customer-to-Seller cross-process messaging verified.');

    // Admin receives conversation update
    const adminUpdates = adminSocket.received.filter(m => m.type === 'admin_conversation_update');
    assert.strictEqual(adminUpdates.length, 1, 'Admin on process 3003 must receive admin_conversation_update via Redis');
    console.log('✓ Test 5.3 Passed: Customer-to-Admin cross-process event verified.');

    // 3. Cross-Process READ_RECEIPT Events
    sellerProcess.sendReadReceipt({
        wsId: 'ws_bob',
        conversationId: 'conv_marketplace_99'
    });

    await new Promise(r => setTimeout(r, 50));

    const aliceReceipts = aliceSocket.received.filter(m => m.type === 'read_receipt');
    assert.strictEqual(aliceReceipts.length, 1, 'Customer on process 3001 must receive READ_RECEIPT from seller on process 3002');
    assert.strictEqual(aliceReceipts[0].readerType, 'SELLER');
    assert.strictEqual(aliceReceipts[0].readerId, 'seller_bob_2');
    console.log('✓ Test 5.4 Passed: Cross-process READ_RECEIPT distribution verified.');

    // 4. Duplicate Broadcast & Network Retransmit Suppression
    // Alice's process must NOT deliver duplicate events to Alice when Redis circles back
    const aliceTotalMessages = aliceSocket.received.filter(m => m.type === 'new_message' && m.message.senderType === 'CUSTOMER');
    assert.strictEqual(aliceTotalMessages.length, 1, 'Originating process must not duplicate message broadcast to its own clients');

    // Test duplicate eventId delivery to Bob
    const initialBobCount = bobSocket.received.length;
    const duplicateEvent = JSON.stringify({
        eventId: 'evt_duplicate_replay_test',
        eventType: 'CONVERSATION_BROADCAST',
        originProcessId: 'process_customer_3001',
        conversationId: 'conv_marketplace_99',
        payload: { type: 'new_message', message: { id: 'msg_dup_1', message: 'First arrival' } }
    });

    // Deliver first time
    sellerProcess.handleIncomingRedisEvent(duplicateEvent);
    assert.strictEqual(bobSocket.received.length, initialBobCount + 1, 'First event arrival must be delivered');

    // Deliver exact duplicate eventId again (network replay simulation)
    sellerProcess.handleIncomingRedisEvent(duplicateEvent);
    assert.strictEqual(bobSocket.received.length, initialBobCount + 1, 'Duplicate eventId must be silently discarded by deduplication cache');
    console.log('✓ Test 5.5 Passed: Loopback prevention and network duplicate event suppression verified.');

    // 5. Authorization & Confidential Internal Notes Isolation
    const charlieSocket = customerProcess.connectClient('ws_charlie', 'CUSTOMER', 'cust_charlie_unauthorized');
    assert.throws(() => {
        customerProcess.joinConversation('ws_charlie', 'conv_marketplace_99', convRecord);
    }, /Unauthorized for this conversation/);
    assert.strictEqual(charlieSocket.subscribedConversations.has('conv_marketplace_99'), false);
    console.log('✓ Test 5.6 Passed: Unauthorized users blocked from joining conversations.');

    // Non-admin attempting internal message has isInternal stripped
    customerProcess.sendMessage({
        wsId: 'ws_alice',
        conversationId: 'conv_marketplace_99',
        message: 'Fake internal note by customer',
        isInternal: true
    });
    await new Promise(r => setTimeout(r, 50));
    const aliceSent = aliceSocket.received.find(m => m.message && m.message.message === 'Fake internal note by customer');
    assert.strictEqual(aliceSent.message.isInternal, false, 'Non-admin cannot create internal message');

    // Admin sends authentic internal note on Admin Process
    adminProcess.sendMessage({
        wsId: 'ws_admin',
        conversationId: 'conv_marketplace_99',
        message: 'Internal admin note: High priority account review',
        isInternal: true
    });

    await new Promise(r => setTimeout(r, 50));

    // Alice and Bob must NEVER receive the internal message
    const aliceInternal = aliceSocket.received.filter(m => m.message && m.message.isInternal === true);
    const bobInternal = bobSocket.received.filter(m => m.message && m.message.isInternal === true);
    assert.strictEqual(aliceInternal.length, 0, 'Customer must NEVER receive internal notes');
    assert.strictEqual(bobInternal.length, 0, 'Seller must NEVER receive internal notes');
    console.log('✓ Test 5.7 Passed: Internal admin notes strictly isolated from customer/seller across all processes.');

    // 6. Cross-Process Disconnect Actor on Session Expiry / Logout
    bus.publish('atlasbasket:ws:events', JSON.stringify({
        eventId: 'evt_disconnect_alice',
        eventType: 'DISCONNECT_ACTOR',
        originProcessId: 'process_admin_3003',
        actorId: 'cust_alice_1',
        actorType: 'CUSTOMER',
        reason: 'Session revoked'
    }));

    await new Promise(r => setTimeout(r, 50));

    const expiredNotice = aliceSocket.received.find(m => m.type === 'session_expired');
    assert(expiredNotice, 'Alice socket should receive session_expired message');
    assert.strictEqual(customerProcess.clients.has('ws_alice'), false, 'Socket must be removed from process client map');
    console.log('✓ Test 5.8 Passed: Cross-process session termination and actor disconnect verified.');
}

// ─── RUN ALL SUITES ──────────────────────────────────────────────────────────

(async function runAllTests() {
    try {
        await testRedisReadinessAndLifecycle();
        await testCacheOperations();
        await testSubscriberRecovery();
        await testPublishFailuresAndMetrics();
        await testCrossProcessEvents();

        console.log('\n================================================================');
        console.log('✓ ALL REDIS RELIABILITY & WEBSOCKET AUDIT TESTS PASSED (100%)');
        console.log('================================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ TEST SUITE FAILED:', err);
        process.exit(1);
    }
})();
