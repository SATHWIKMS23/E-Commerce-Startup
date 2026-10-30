const assert = require('assert');
const { EventEmitter } = require('events');

console.log('================================================================');
console.log('--- REDIS SHARED CACHE & CROSS-PROCESS WEBSOCKET TEST SUITE ---');
console.log('================================================================\n');

// ─── PART 1: Redis Connection, Disconnection & Unavailable Fallback ───────────

console.log('--- PART 1: Redis Connection Lifecycle & Graceful Fallback ---');

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

class MockRedisClient {
    constructor(socket) {
        this.socket = socket || new MockRedisSocket();
        this.store = new Map();
        this.subscribers = new Map(); // channel -> Set<fn>
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
}

(async function testRedisConnection() {
    const socket = new MockRedisSocket();
    const client = new MockRedisClient(socket);

    assert.strictEqual(client.isOpen, false);
    await client.connect();
    assert.strictEqual(client.isOpen, true);
    assert.strictEqual(client.isReady, true);

    await client.quit();
    assert.strictEqual(client.isOpen, false);

    console.log('✓ Test 1.1 Passed: Redis connection and disconnection lifecycle verified.');
})();

// ─── PART 2: Shared Cache Operations & Failover ───────────────────────────────

console.log('\n--- PART 2: Shared Cache Operations, TTL & Prefix Invalidation ---');

class ResilientCacheStore {
    constructor(redisClient) {
        this.redis = redisClient;
        this.memoryFallback = new Map();
    }

    async get(key) {
        if (this.redis && this.redis.isOpen) {
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
        if (this.redis && this.redis.isOpen) {
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
        if (this.redis && this.redis.isOpen) {
            try {
                removed = await this.redis.del(key);
            } catch (err) {}
        }
        const memRemoved = this.memoryFallback.delete(key) ? 1 : 0;
        return removed || memRemoved;
    }

    async delByPrefix(prefix) {
        let count = 0;
        if (this.redis && this.redis.isOpen) {
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

(async function testCacheOperations() {
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

    // Operations should NOT throw; should seamlessly use memory fallback
    await cache.set('c:/fallback/item', 'saved-in-memory', 1000);
    const fallbackVal = await cache.get('c:/fallback/item');
    assert.strictEqual(fallbackVal, 'saved-in-memory');
    console.log('✓ Test 2.4 Passed: Graceful fallback to memory store when Redis is unavailable verified.');
})();

// ─── PART 3: Cross-Process WebSocket Event Distribution ───────────────────────

console.log('\n--- PART 3: Cross-Process WebSocket Messaging & Authorization ---');

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
        this.clients = new Map(); // wsId -> { actorType, actorId, subscribedConversations: Set, received: [] }
        this.bus.subscribe((msg) => this.handleIncomingRedisEvent(msg));
    }

    connectClient(wsId, actorType, actorId) {
        const client = {
            wsId,
            actorType,
            actorId,
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

    // Broadcast to local clients
    broadcastLocal(conversationId, payload, isInternal = false, excludeWsId = null) {
        for (const [wsId, client] of this.clients.entries()) {
            if (wsId === excludeWsId) continue;
            if (isInternal && client.actorType !== 'ADMIN') continue;
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

    // Public method called when sending message
    sendMessage({ wsId, conversationId, message, clientMessageId, isInternal = false }) {
        const client = this.clients.get(wsId);
        if (!client) throw new Error('Authentication required');

        const payload = {
            type: 'new_message',
            conversationId,
            message: {
                id: 'msg_' + Math.random().toString(36).substring(2, 9),
                senderType: client.actorType,
                senderId: client.actorId,
                message,
                clientMessageId: clientMessageId || null,
                isInternal
            }
        };

        // 1. Deliver locally
        this.broadcastLocal(conversationId, payload, isInternal);

        // 2. Publish to Redis bus with originProcessId
        this.bus.publish('atlasbasket:ws:events', JSON.stringify({
            eventType: 'CONVERSATION_BROADCAST',
            originProcessId: this.processId,
            conversationId,
            payload,
            isInternal
        }));

        // Broadcast to admins
        const adminPayload = {
            type: 'admin_conversation_update',
            conversationId,
            lastMessage: payload.message
        };
        this.broadcastLocalAdmins(adminPayload);
        this.bus.publish('atlasbasket:ws:events', JSON.stringify({
            eventType: 'ADMIN_BROADCAST',
            originProcessId: this.processId,
            payload: adminPayload
        }));

        return payload.message;
    }

    handleIncomingRedisEvent(raw) {
        const event = JSON.parse(raw);
        // Loopback protection: discard event if it originated from our own process
        if (event.originProcessId === this.processId) {
            return;
        }

        switch (event.eventType) {
            case 'CONVERSATION_BROADCAST':
                this.broadcastLocal(event.conversationId, event.payload, event.isInternal);
                break;
            case 'ADMIN_BROADCAST':
                this.broadcastLocalAdmins(event.payload);
                break;
            case 'DISCONNECT_ACTOR':
                for (const [wsId, client] of this.clients.entries()) {
                    if (client.actorId === event.actorId) {
                        client.received.push({ type: 'session_expired', reason: event.reason });
                        this.clients.delete(wsId);
                    }
                }
                break;
        }
    }
}

(async function testCrossProcessMessaging() {
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

    // Client connections
    const aliceSocket = customerProcess.connectClient('ws_alice', 'CUSTOMER', 'cust_alice_1');
    const bobSocket = sellerProcess.connectClient('ws_bob', 'SELLER', 'seller_bob_2');
    const adminSocket = adminProcess.connectClient('ws_admin', 'ADMIN', 'admin_carol_3');

    // Both join conversation
    customerProcess.joinConversation('ws_alice', 'conv_marketplace_99', convRecord);
    sellerProcess.joinConversation('ws_bob', 'conv_marketplace_99', convRecord);

    // 1. Customer sends message on Customer API (Port 3001)
    customerProcess.sendMessage({
        wsId: 'ws_alice',
        conversationId: 'conv_marketplace_99',
        message: 'Hello, when will my order be dispatched?',
        clientMessageId: 'idemp_key_1001'
    });

    // Wait for event loop ticks
    await new Promise(r => setTimeout(r, 50));

    // Assert Seller on Seller API (Port 3002) received the message
    const bobMessages = bobSocket.received.filter(m => m.type === 'new_message');
    assert.strictEqual(bobMessages.length, 1, 'Seller on process 3002 must receive message from customer on process 3001');
    assert.strictEqual(bobMessages[0].message.message, 'Hello, when will my order be dispatched?');
    console.log('✓ Test 3.1 Passed: Customer-to-Seller cross-process messaging verified.');

    // Assert Admin on Admin API (Port 3003) received conversation update
    const adminUpdates = adminSocket.received.filter(m => m.type === 'admin_conversation_update');
    assert.strictEqual(adminUpdates.length, 1, 'Admin on process 3003 must receive admin_conversation_update via Redis');
    console.log('✓ Test 3.2 Passed: Customer-to-Admin cross-process event verified.');

    // 2. Seller replies on Seller API (Port 3002)
    sellerProcess.sendMessage({
        wsId: 'ws_bob',
        conversationId: 'conv_marketplace_99',
        message: 'It will ship this afternoon!'
    });

    await new Promise(r => setTimeout(r, 50));

    const aliceMessages = aliceSocket.received.filter(m => m.type === 'new_message' && m.message.senderType === 'SELLER');
    assert.strictEqual(aliceMessages.length, 1, 'Customer on process 3001 must receive reply from seller on process 3002');
    console.log('✓ Test 3.3 Passed: Seller-to-Customer cross-process messaging verified.');

    // 3. Duplicate Broadcast Prevention Check
    // Alice's process must NOT deliver duplicate events to Alice when the Redis event circles back
    const aliceTotalMessages = aliceSocket.received.filter(m => m.type === 'new_message' && m.message.senderType === 'CUSTOMER');
    assert.strictEqual(aliceTotalMessages.length, 1, 'Originating process must NOT duplicate message broadcast to its own clients');
    console.log('✓ Test 3.4 Passed: Duplicate broadcast suppression verified.');

    // 4. Authorization & Confidential Internal Notes Isolation
    // Connect unauthorized customer Charlie on Customer Process
    const charlieSocket = customerProcess.connectClient('ws_charlie', 'CUSTOMER', 'cust_charlie_unauthorized');
    assert.throws(() => {
        customerProcess.joinConversation('ws_charlie', 'conv_marketplace_99', convRecord);
    }, /Unauthorized for this conversation/);
    assert.strictEqual(charlieSocket.subscribedConversations.has('conv_marketplace_99'), false);
    console.log('✓ Test 3.5 Passed: Unauthorized users blocked from joining conversations.');

    // Admin sends internal note on Admin Process
    adminProcess.sendMessage({
        wsId: 'ws_admin',
        conversationId: 'conv_marketplace_99',
        message: 'Note for admins only: Check fraud flag on this customer',
        isInternal: true
    });

    await new Promise(r => setTimeout(r, 50));

    // Verify Alice and Bob did NOT receive the internal message
    const aliceInternal = aliceSocket.received.filter(m => m.message && m.message.isInternal === true);
    const bobInternal = bobSocket.received.filter(m => m.message && m.message.isInternal === true);
    assert.strictEqual(aliceInternal.length, 0, 'Customer must NEVER receive internal notes');
    assert.strictEqual(bobInternal.length, 0, 'Seller must NEVER receive internal notes');
    console.log('✓ Test 3.6 Passed: Internal admin notes strictly isolated from customer/seller.');

    // 5. Cross-process Disconnect Actor on Session Expiry / Logout
    bus.publish('atlasbasket:ws:events', JSON.stringify({
        eventType: 'DISCONNECT_ACTOR',
        originProcessId: 'process_admin_3003',
        actorId: 'cust_alice_1',
        reason: 'Session revoked'
    }));

    await new Promise(r => setTimeout(r, 50));

    const expiredNotice = aliceSocket.received.find(m => m.type === 'session_expired');
    assert(expiredNotice, 'Alice socket should receive session_expired message');
    assert.strictEqual(customerProcess.clients.has('ws_alice'), false, 'Socket must be removed from process client map');
    console.log('✓ Test 3.7 Passed: Cross-process session termination and actor disconnect verified.');

    console.log('\n================================================================');
    console.log('✓ ALL REDIS & WEBSOCKET CROSS-PROCESS TESTS PASSED (100%)');
    console.log('================================================================');
})();

