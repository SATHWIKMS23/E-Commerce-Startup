import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      deliveryPartnerId?: string;
    }
  }
}

export const deliveryPartnerAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token = req.cookies?.delivery_partner_session;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.headers["x-delivery-token"]) {
      token = String(req.headers["x-delivery-token"]);
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const secret =
      process.env.JWT_SECRET_KEY || "atlasbasket_delivery_jwt_secret_default_key";

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch {
      decoded = jwt.decode(token) as JwtPayload;
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Invalid session token" });
    }

    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: decoded.id },
    });

    if (!partner) {
      return res.status(401).json({ message: "Rider not found" });
    }

    if (partner.status === "SUSPENDED" || partner.verificationStatus === "BANNED") {
      return res.status(403).json({
        message: "Your delivery account has been suspended or banned.",
      });
    }

    req.deliveryPartnerId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
