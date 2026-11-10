import type { Request, Response } from "express";
import { RiderAuthService } from "../services/riderAuth.service.js";
import { logger } from "../../../config/logger.js";

export const registerRider = async (req: Request, res: Response) => {
  try {
    const result = await RiderAuthService.register(req.body);

    res.cookie("delivery_partner_session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Registration submitted successfully. Pending Admin verification.",
      rider: result.rider,
      token: result.token,
    });
  } catch (err: any) {
    logger.error(`[RiderAuth] Register error: ${err?.message}`);
    return res.status(400).json({ success: false, message: err?.message || "Registration failed" });
  }
};

export const loginRider = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const result = await RiderAuthService.loginWithEmailPassword(email, password);

    res.cookie("delivery_partner_session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      rider: result.rider,
      token: result.token,
    });
  } catch (err: any) {
    return res.status(401).json({ success: false, message: err?.message || "Invalid credentials" });
  }
};

export const googleLoginRider = async (req: Request, res: Response) => {
  try {
    const credential = req.body.credential || req.body.idToken || req.body.token;
    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential token required." });
    }

    const result = await RiderAuthService.loginWithGoogle(credential);

    res.cookie("delivery_partner_session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Google login successful.",
      rider: result.rider,
      token: result.token,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || "Google login failed" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const updated = await RiderAuthService.updateProfile(riderId, req.body);
    return res.status(200).json({
      success: true,
      message: "Profile details updated successfully. Pending Admin verification.",
      rider: updated,
    });
  } catch (err: any) {
    logger.error(`[RiderAuth] Update profile error: ${err?.message}`);
    return res.status(400).json({ success: false, message: err?.message || "Failed to update profile" });
  }
};

export const logoutRider = async (req: Request, res: Response) => {
  res.clearCookie("delivery_partner_session");
  return res.status(200).json({ success: true, message: "Logged out successfully." });
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const riderId = req.deliveryPartnerId;
    if (!riderId) return res.status(401).json({ message: "Unauthorized" });

    const rider = await RiderAuthService.getMe(riderId);
    return res.status(200).json({ success: true, rider });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err?.message || "Rider not found" });
  }
};

export const getPublicProfile = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const rider = await RiderAuthService.getMe(id);
    const publicProfile = RiderAuthService.getPublicProfile(rider);
    return res.status(200).json({ success: true, profile: publicProfile });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: "Rider profile not found" });
  }
};
