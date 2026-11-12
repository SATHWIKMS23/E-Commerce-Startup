import type { Request, Response, NextFunction } from 'express';

const normalizeOrigin = (o: string) => o.replace(/\/+$/, '').toLowerCase();

const localDevOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8001',
].map(normalizeOrigin);

const getAllowedOrigins = (): Set<string> => {
    const rawOrigins = [
        process.env.CORS_ORIGINS,
        process.env.CUSTOMER_FRONTEND_URL,
        process.env.SELLER_FRONTEND_URL,
        process.env.ADMIN_FRONTEND_URL,
        process.env.DELIVERY_FRONTEND_URL,
        process.env.FRONTEND_DELIVERY_URL,
        'https://atlasbasket.com',
        'https://www.atlasbasket.com',
        'https://seller.atlasbasket.com',
        'https://sellers.atlasbasket.com',
        'https://admin.atlasbasket.com',
        'https://delivery.atlasbasket.com',
    ].filter(Boolean).join(',').split(',').map((s) => normalizeOrigin(s.trim())).filter(Boolean);
    return new Set([...rawOrigins, ...localDevOrigins]);
};

const SESSION_COOKIES = [
    'customer_session',
    'customer_refresh',
    'seller_session',
    'seller_refresh',
    'admin_session',
    'admin_refresh',
    'delivery_partner_session'
];

/**
 * CSRF defense for cookie-authenticated, state-changing requests.
 *
 * The auth cookies are sent cross-site in production (SameSite=None is required
 * because the seller SPA calls the backend cross-origin), which makes form-based
 * CSRF possible even though the CORS whitelist blocks cross-origin fetch/XHR
 * (form posts skip preflight). Browsers always attach an Origin header to
 * cross-site POST/PUT/PATCH/DELETE, so we validate it against the allowlist.
 *
 * - Safe methods (GET/HEAD/OPTIONS) always pass.
 * - Requests without an auth cookie pass (unauthenticated CSRF is moot).
 * - Requests without an Origin/Referer pass (non-browser clients: webhooks,
 *   cron jobs, curl). Browsers cannot omit Origin on cross-site POSTs.
 * - Present-but-unallowed Origin/Referer is rejected (403).
 */
export const csrfOriginCheck = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }

    const hasAuthCookie = SESSION_COOKIES.some((name) => Boolean(req.cookies?.[name]));
    if (!hasAuthCookie) {
        return next();
    }

    const raw = (req.headers.origin as string) || (req.headers.referer as string);
    if (!raw) {
        return next();
    }

    const origin = normalizeOrigin(raw);
    if (getAllowedOrigins().has(origin)) {
        return next();
    }

    return res.status(403).json({ message: 'Cross-origin request rejected' });
};
