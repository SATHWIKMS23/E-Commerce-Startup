import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import type { Request, Response, NextFunction } from "express";
import { getJwtSecret, verifyAccessToken } from "../config/token.js";
import { verifySupabaseAccessToken } from "../config/supabase.js";

declare global {
  namespace Express {
    interface Request {
      sellerId?: string;
    }
  }
}

/**
 * Resolve the Seller record from an authenticated identity.
 *
 * identity is the primary lookup value; email is an optional fallback used when
 * authenticating with a Supabase access token (whose `sub` is the Supabase user
 * id, which we store in Seller.googleId during Google sync).
 */
async function resolveSeller(identity: string, email?: string) {
  const byId = await prisma.seller.findUnique({ where: { id: identity } });
  if (byId) return byId;

  const byGoogleId = await prisma.seller.findUnique({ where: { googleId: identity } });
  if (byGoogleId) return byGoogleId;

  if (email) {
    const byEmail = await prisma.seller.findUnique({ where: { email } });
    if (byEmail) return byEmail;
  }

  return null;
}

export const sellerAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // The frontend authenticates with a Bearer app JWT (Authorization header),
    // so a fresh header token MUST take precedence over any (possibly stale)
    // seller_session cookie. Preferring the cookie would let an expired cookie
    // from a previous login override a freshly-issued, valid header token and
    // produce spurious 401s on /seller/api/auth/profile.
    const cookieToken = req.cookies?.seller_session;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : (req.headers["x-seller-token"] as string | undefined);

    const token = headerToken || cookieToken;

    // TEMPORARY SAFE DIAGNOSTICS — do not log any token value.
    console.log("[sellerAuth:debug]", JSON.stringify({
      path: req.originalUrl,
      hasAuthorizationHeader: !!req.headers.authorization,
      hasBearerToken: typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer "),
      hasXSellertoken: !!req.headers["x-seller-token"],
      hasCookie: !!req.cookies?.seller_session,
      tokenSource: headerToken ? "header" : (cookieToken ? "cookie" : "none"),
    }));

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - missing seller token" });
    }

    let identity: string | null = null;
    let fallbackEmail: string | undefined;
    let isExpired = false;

    // 1) Try the app-signed JWT (returned by login / register / google sync).
    try {
      const decoded: any = verifyAccessToken(token);
      identity = decoded?.id || decoded?.userId || decoded?.sellerId || decoded?.sub || null;
    } catch (err: any) {
      if (err?.name === "TokenExpiredError") isExpired = true;
      try {
        const decoded: any = jwt.verify(token, getJwtSecret());
        identity = decoded?.id || decoded?.userId || decoded?.sellerId || decoded?.sub || null;
      } catch (innerErr: any) {
        if (innerErr?.name === "TokenExpiredError") isExpired = true;
        identity = null;
      }
    }

    // 2) Optional legacy Supabase token verification fallback (only if SUPABASE_URL configured)
    if (!identity && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)) {
      try {
        const supabasePayload: any = await verifySupabaseAccessToken(token);
        identity = supabasePayload?.sub || supabasePayload?.user_id || null;
        fallbackEmail = supabasePayload?.email || supabasePayload?.user_metadata?.email || undefined;
      } catch (supabaseErr: any) {
        if (supabaseErr?.name === "TokenExpiredError" || supabaseErr?.message?.includes("expired")) {
          isExpired = true;
        }
        console.warn("[sellerAuth] Supabase token verification failed:", supabaseErr?.message);
      }
    }

    if (!identity) {
      return res.status(401).json({
        message: isExpired ? "Session expired" : "JWT verification failed",
        isExpired
      });
    }

    const seller = await resolveSeller(identity, fallbackEmail);

    if (!seller) {
      return res.status(401).json({
        message: "Seller not found",
      });
    }

    if (seller.isDeactivated) {
      return res.status(403).json({
        message: "Account is deactivated",
      });
    }

    const isSuspended = seller.isBanned || seller.status === "DISABLED" || seller.status === "BANNED";
    if (isSuspended) {
      // Check if current path is a permitted route for suspended sellers
      const permittedPrefixes = [
        "/seller/api/auth/profile",
        "/seller/api/auth/logout",
        "/seller/api/appeals",
        "/seller/api/guidelines",
        "/seller/api/policy-notices",
        "/seller/api/commission-statements",
        "/seller/api/conversations",
        "/seller/api/notifications",
        "/seller/api/enforcement",
        "/seller/api/branding"
      ];

      const currentPath = req.originalUrl.split("?")[0];
      const isPermitted = permittedPrefixes.some((prefix) => currentPath.startsWith(prefix));

      if (!isPermitted) {
        return res.status(403).json({
          message: "Account access restricted. Only appeals, guidelines, policy notices, statements, and support messaging are available.",
          isSuspended: true
        });
      }
    }

    req.sellerId = seller.id;

    next();
  } catch (err) {
    console.error("[sellerAuth] Unexpected error:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
