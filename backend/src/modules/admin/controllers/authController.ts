import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../config/token.js";
import { setAuthCookie, clearAuthCookie, setRefreshCookie, clearRefreshCookie } from "../../../config/sessionCookies.js";
import { OAuth2Client } from "google-auth-library";
import EmailService from "../../../services/email/email.service.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";
import storageService from "../../storage/services/storage.service.js";
import {
    hasPermission,
    getAdminPermissions,
    invalidatePermissionCache
} from "../services/permissionService.js";
import { disconnectActorSockets } from "../../../services/chat/chat.service.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getSafeErrorMessage = (error: unknown): string => {
    const fallback = "Something went wrong. Please try again later.";

    if (error instanceof Error && error.message) {
        const normalized = error.message.replace(/\s+/g, " ").trim();
        if (!normalized) return fallback;

        const exposesPrismaError = /Invalid `prisma\.|PrismaClientKnownRequestError|P2002|P2025|P1001|PostgreSQL|column .* does not exist|database error|stack trace/i.test(normalized);
        if (exposesPrismaError) {
            return fallback;
        }

        return normalized;
    }

    if (typeof error === "string" && error.trim()) {
        const normalized = error.trim().replace(/\s+/g, " ");
        if (/Invalid `prisma\.|PrismaClientKnownRequestError|P2002|P2025|P1001|PostgreSQL|column .* does not exist|database error|stack trace/i.test(normalized)) {
            return fallback;
        }
        return normalized;
    }

    return fallback;
};

const resolveAdminRoleId = async (roleName: string): Promise<string | null> => {
    const role = await prisma.adminRole.findUnique({ where: { name: roleName } });
    return role?.id ?? null;
};

/** Role names that always carry unrestricted (Super Admin) access. */
const TOP_ROLES = ["OWNER", "SUPER_ADMIN"];

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body ?? {};

        if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

        if (!admin) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        if (!admin.isActive) {
            return res.status(403).json({ message: "Your account is disabled. Please contact an administrator." });
        }

        if (!admin.passwordHash) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const accessToken = signAccessToken(admin.id);
        const refreshToken = signRefreshToken(admin.id);
        const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

        await prisma.$transaction([
            prisma.refreshToken.create({
                data: { userId: admin.id, userType: "ADMIN", tokenHash: refreshHash, expiresAt }
            }),
            prisma.admin.update({
                where: { id: admin.id },
                data: { lastLoginAt: new Date() }
            })
        ]);

        setAuthCookie(res, "admin_session", accessToken);
        setRefreshCookie(res, refreshToken);

        return res.status(200).json({
            message: "Login successful",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role
            }
        });
    } catch (error: unknown) {
        console.error("ADMIN LOGIN ERROR:", error);
        return res.status(500).json({ message: "Unable to sign in right now. Please try again later." });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = async (req: Request, res: Response) => {
    try {
        clearAuthCookie(res, "admin_session");
        clearRefreshCookie(res);
        if (req.adminId) {
            await prisma.refreshToken.updateMany({
                where: { userId: req.adminId, userType: "ADMIN", revoked: false },
                data: { revoked: true }
            });
            disconnectActorSockets(req.adminId, "Logged out", "ADMIN");
        }
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
        console.error("ADMIN LOGOUT ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refresh = async (req: Request, res: Response) => {
    try {
        const rawToken = req.cookies?.admin_refresh || req.headers["x-refresh-token"];
        const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
        if (!token) return res.status(401).json({ message: "No refresh token" });

        let payload: any;
        try {
            payload = verifyRefreshToken(token) as any;
        } catch (err) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        const userId = payload.id as string;
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const stored = await prisma.refreshToken.findFirst({
            where: { tokenHash, userId, userType: "ADMIN", revoked: false, expiresAt: { gt: new Date() } }
        });
        if (!stored) return res.status(401).json({ message: "Refresh token invalid or revoked" });

        await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

        const newRefresh = signRefreshToken(userId);
        const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await prisma.refreshToken.create({ data: { userId, userType: "ADMIN", tokenHash: newHash, expiresAt } });

        const accessToken = signAccessToken(userId);
        setAuthCookie(res, "admin_session", accessToken);
        setRefreshCookie(res, newRefresh);

        return res.status(200).json({ message: "Refreshed" });
    } catch (err) {
        console.error("REFRESH ERROR", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ─── Setup Status ─────────────────────────────────────────────────────────────

export const getSetupStatus = async (req: Request, res: Response) => {
    try {
        const count = await prisma.admin.count();
        return res.status(200).json({ initialized: count > 0 });
    } catch (error: any) {
        console.error("GET SETUP STATUS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── First Admin Setup ────────────────────────────────────────────────────────

export const setupFirstAdmin = async (req: Request, res: Response) => {
    try {
        if (await prisma.admin.count() > 0) {
            return res.status(409).json({ message: "Administrator setup has already been completed." });
        }

        const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
        const suppliedSecret = req.get("x-admin-bootstrap-secret");
        if (!configuredSecret || Buffer.byteLength(configuredSecret, "utf8") < 32) {
            return res.status(503).json({ message: "Initial administrator setup is unavailable." });
        }

        const { name, email, password } = req.body ?? {};

        if (typeof suppliedSecret !== "string" || !suppliedSecret) {
            return res.status(403).json({ message: "Invalid setup credentials." });
        }

        const configuredDigest = crypto.createHash("sha256").update(configuredSecret).digest();
        const suppliedDigest = crypto.createHash("sha256").update(suppliedSecret).digest();
        if (!crypto.timingSafeEqual(configuredDigest, suppliedDigest)) {
            return res.status(403).json({ message: "Invalid setup credentials." });
        }

        if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedName || normalizedName.length > 201 || normalizedEmail.length > 320) {
            return res.status(400).json({ message: "Enter a valid name and email address." });
        }
        if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ message: "Password must be 12 to 72 bytes long." });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const nameParts = normalizedName.split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";
        if (firstName.length > 100 || lastName.length > 100) {
            return res.status(400).json({ message: "Name is too long." });
        }

        const newAdmin = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('admin_initial_bootstrap'))`;

            if (await tx.admin.count() > 0) {
                return null;
            }

            const superAdminRole = await tx.adminRole.findUnique({
                where: { name: "SUPER_ADMIN" },
                select: { id: true }
            });
            if (!superAdminRole) {
                throw new Error("Required SUPER_ADMIN role is not configured.");
            }

            return tx.admin.create({
                data: {
                    email: normalizedEmail,
                    passwordHash,
                    firstName,
                    lastName,
                    isSuperAdmin: true,
                    role: "SUPER_ADMIN",
                    roleId: superAdminRole.id,
                    isActive: true,
                    authProvider: "EMAIL"
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isSuperAdmin: true,
                    role: true
                }
            });
        });

        if (!newAdmin) {
            return res.status(409).json({ message: "Administrator setup has already been completed." });
        }

        await logAdminAction({
            adminId: newAdmin.id,
            actionType: AdminActionType.ADMIN_CREATED,
            targetType: "Admin",
            targetId: newAdmin.id,
            description: "Initial Super Admin account created through the one-time bootstrap flow.",
            newValue: {
                email: newAdmin.email,
                role: newAdmin.role,
                isSuperAdmin: newAdmin.isSuperAdmin
            },
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        return res.status(201).json({
            message: "Super Admin created successfully",
            admin: newAdmin
        });
    } catch (error: unknown) {
        console.error("SETUP FIRST ADMIN ERROR:", error);
        return res.status(500).json({ message: "Unable to complete administrator setup right now." });
    }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────

export const getProfile = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                avatarPublicId: true,
                isSuperAdmin: true,
                isActive: true,
                role: true,
                roleId: true,
                adminRole: { select: { name: true, displayName: true } },
                authProvider: true,
                lastLoginAt: true,
                createdAt: true
            }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin profile not found" });
        }

        const { adminRole, ...rest } = admin;
        const permissions = await getAdminPermissions(adminId);

        return res.status(200).json({
            admin: {
                ...rest,
                roleName: adminRole?.name ?? rest.role,
                permissions
            }
        });
    } catch (error: any) {
        console.error("ADMIN GET PROFILE ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Update Profile ───────────────────────────────────────────────────────────

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { name, firstName: bodyFirstName, lastName: bodyLastName, phone, avatarUrl, avatarPublicId } = req.body;

        let firstName: string | undefined = bodyFirstName;
        let lastName: string | undefined = bodyLastName;

        if (name !== undefined) {
            const nameParts = (name as string).trim().split(/\s+/);
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
        }

        const previous = await prisma.admin.findUnique({
            where: { id: adminId },
            select: { avatarPublicId: true }
        });
        const updatedAdmin = await prisma.admin.update({
            where: { id: adminId },
            data: {
                ...(firstName !== undefined ? { firstName } : {}),
                ...(lastName !== undefined ? { lastName } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {}),
                ...(avatarPublicId !== undefined ? { avatarPublicId: avatarPublicId || null } : {})
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                avatarPublicId: true,
                isSuperAdmin: true,
                isActive: true,
                role: true,
                authProvider: true,
                updatedAt: true
            }
        });

        if (previous?.avatarPublicId && previous.avatarPublicId !== updatedAdmin.avatarPublicId) {
            try {
                await storageService.deleteImage({ publicId: previous.avatarPublicId });
            } catch (error) {
                console.error("FAILED TO REMOVE REPLACED ADMIN AVATAR:", error);
            }
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            admin: updatedAdmin
        });
    } catch (error: any) {
        console.error("ADMIN UPDATE PROFILE ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Update Password ──────────────────────────────────────────────────────────

export const updatePassword = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        const admin = await prisma.admin.findUnique({ where: { id: adminId } });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (admin.passwordHash) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password is required to change password" });
            }
            const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ message: "Incorrect current password" });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const newAuthProvider =
            admin.authProvider === "GOOGLE" ? "EMAIL_AND_GOOGLE" : admin.authProvider;

        await prisma.admin.update({
            where: { id: adminId },
            data: { passwordHash, authProvider: newAuthProvider }
        });

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error: any) {
        console.error("ADMIN UPDATE PASSWORD ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export const googleOAuth = async (req: Request, res: Response) => {
    try {
        let email: string | undefined;
        let googleId: string | undefined;
        let firstName = "";
        let lastName = "";
        let avatarUrl = "";

        const {
            idToken,
            email: bodyEmail,
            name: bodyName,
            firstName: bodyFirstName,
            lastName: bodyLastName,
            avatarUrl: bodyAvatarUrl,
            providerId,
            googleId: bodyGoogleId
        } = req.body;

        if (idToken) {
            const audience = process.env.GOOGLE_CLIENT_ID;
            if (!audience) {
                return res.status(500).json({ message: "Google client ID is not configured" });
            }

            const ticket = await googleClient.verifyIdToken({ idToken, audience });
            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                return res.status(401).json({ message: "Invalid Google token" });
            }

            email = payload.email;
            googleId = payload.sub;
            firstName = payload.given_name ?? "";
            lastName = payload.family_name ?? "";
            avatarUrl = payload.picture ?? "";
        } else if (
            bodyEmail &&
            process.env.NODE_ENV !== "production" &&
            process.env.ALLOW_UNVERIFIED_GOOGLE === "true"
        ) {
            email = bodyEmail as string;
            googleId = (providerId || bodyGoogleId || `google_${bodyEmail}`) as string;
            firstName = (bodyFirstName || "") as string;
            lastName = (bodyLastName || "") as string;
            avatarUrl = (bodyAvatarUrl || "") as string;
            if (bodyName && !firstName) {
                const nameParts = (bodyName as string).trim().split(/\s+/);
                firstName = nameParts[0] || "";
                lastName = nameParts.slice(1).join(" ") || "";
            }
        } else {
            return res.status(400).json({ message: "A valid Google ID token is required" });
        }

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const count = await prisma.admin.count();
        let admin = await prisma.admin.findUnique({ where: { email } });

        if (count === 0) {
            const superAdminRoleId = await resolveAdminRoleId("SUPER_ADMIN");
            admin = await prisma.admin.create({
                data: {
                    email,
                    firstName: firstName || "Admin",
                    lastName: lastName || "",
                    avatarUrl,
                    googleId,
                    authProvider: "GOOGLE",
                    isSuperAdmin: true,
                    role: "SUPER_ADMIN",
                    ...(superAdminRoleId ? { roleId: superAdminRoleId } : {}),
                    isActive: true
                }
            });
        } else {
            if (!admin) {
                return res.status(404).json({ message: "No admin account found with this email. Please contact your Super Admin." });
            }
            if (!admin.isActive) {
                return res.status(403).json({ message: "Admin account is deactivated" });
            }

            const newAuthProvider =
                admin.authProvider === "EMAIL" ? "EMAIL_AND_GOOGLE" : admin.authProvider;

            admin = await prisma.admin.update({
                where: { id: admin.id },
                data: {
                    googleId: googleId || admin.googleId,
                    authProvider: newAuthProvider,
                    avatarUrl: avatarUrl || admin.avatarUrl
                }
            });
        }

        const accessToken = signAccessToken(admin.id);
        setAuthCookie(res, "admin_session", accessToken);

        return res.status(200).json({
            message: "Google login successful",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role
            }
        });
    } catch (error: any) {
        console.error("ADMIN GOOGLE OAUTH ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── List Admins (Super Admin only) ──────────────────────────────────────────

export const listAdmins = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const allowed = caller.isSuperAdmin || (await hasPermission(caller.id, "admin.users.manage"));
        if (!allowed) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const rows = await prisma.admin.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                isActive: true,
                isSuperAdmin: true,
                role: true,
                roleId: true,
                adminRole: { select: { name: true, displayName: true } },
                lastLoginAt: true,
                createdAt: true,
                authProvider: true
            }
        });

        const admins = rows.map(({ adminRole, ...rest }) => ({
            ...rest,
            roleName: adminRole?.name ?? rest.role
        }));

        return res.status(200).json({ admins });
    } catch (error: any) {
        console.error("LIST ADMINS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Create Admin (Super Admin only) ─────────────────────────────────────────

export const createAdmin = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const allowed = caller.isSuperAdmin || (await hasPermission(caller.id, "admin.users.manage"));
        if (!allowed) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const { name, email, password, role, roleId } = req.body;
        if (!name || !email || !(role || roleId)) {
            return res.status(400).json({ message: "Name, email, and role are required." });
        }

        const existing = await prisma.admin.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: "Admin account with this email already exists." });
        }

        let roleRow = null;
        if (roleId) {
            roleRow = await prisma.adminRole.findUnique({ where: { id: String(roleId) } });
        } else if (role) {
            roleRow = await prisma.adminRole.findUnique({ where: { name: String(role).toUpperCase() } });
        }
        if (!roleRow) {
            return res.status(400).json({ message: "Unknown role." });
        }

        const isSuper = TOP_ROLES.includes(roleRow.name);
        if (isSuper && !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        let passwordHash: string | null = null;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters." });
            }
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        const parts = (name as string).trim().split(/\s+/);
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";

        const admin = await prisma.admin.create({
            data: {
                email: (email as string).trim().toLowerCase(),
                passwordHash,
                firstName,
                lastName,
                isSuperAdmin: isSuper,
                role: roleRow.name,
                roleId: roleRow.id,
                isActive: true,
                authProvider: "EMAIL"
            }
        });

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_CREATED,
            targetType: "Admin",
            targetId: admin.id,
            description: `Admin account '${admin.email}' created with role ${roleRow.name}`,
            previousValue: null,
            newValue: { email: admin.email, role: roleRow.name, roleId: roleRow.id },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({
            message: "Admin account created successfully.",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role,
                roleId: admin.roleId,
                roleName: roleRow.name
            }
        });
    } catch (error: any) {
        console.error("CREATE ADMIN ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Update Admin Status (Super Admin only) ───────────────────────────────────

export const updateAdminStatus = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = req.params.id as string;
        const { isActive } = req.body;

        if (isActive === undefined) {
            return res.status(400).json({ message: "isActive status is required." });
        }

        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ message: "Admin account not found." });
        }

        if (!isActive && target.isSuperAdmin) {
            const activeSuperAdmins = await prisma.admin.count({
                where: { isSuperAdmin: true, isActive: true }
            });
            if (activeSuperAdmins <= 1 && target.isActive) {
                return res.status(400).json({ message: "At least one active Super Admin must remain." });
            }
        }

        const admin = await prisma.admin.update({
            where: { id },
            data: { isActive }
        });

        invalidatePermissionCache(id);

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_STATUS_CHANGED,
            targetType: "Admin",
            targetId: id,
            description: `Admin status changed to ${isActive ? "active" : "disabled"}`,
            previousValue: { isActive: target.isActive },
            newValue: { isActive: admin.isActive },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: `Admin status updated to ${isActive ? "active" : "disabled"}.`,
            admin: { id: admin.id, isActive: admin.isActive }
        });
    } catch (error: any) {
        console.error("UPDATE ADMIN STATUS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Update Admin Role (Super Admin only) ────────────────────────────────────

export const updateAdminRole = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = req.params.id as string;
        const { role, roleId } = req.body;

        if (!role && !roleId) {
            return res.status(400).json({ message: "Role is required." });
        }

        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ message: "Admin account not found." });
        }

        let roleRow = null;
        if (roleId) {
            roleRow = await prisma.adminRole.findUnique({ where: { id: String(roleId) } });
        } else if (role) {
            roleRow = await prisma.adminRole.findUnique({ where: { name: String(role).toUpperCase() } });
        }
        if (!roleRow) {
            return res.status(400).json({ message: "Unknown role." });
        }

        const isSuper = TOP_ROLES.includes(roleRow.name);

        if (!isSuper && target.isSuperAdmin && target.isActive) {
            const activeSuperAdmins = await prisma.admin.count({
                where: { isSuperAdmin: true, isActive: true }
            });
            if (activeSuperAdmins <= 1) {
                return res.status(400).json({ message: "At least one active Super Admin must remain." });
            }
        }

        const admin = await prisma.admin.update({
            where: { id },
            data: { role: roleRow.name, roleId: roleRow.id, isSuperAdmin: isSuper }
        });

        invalidatePermissionCache(target.id);

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_UPDATED,
            targetType: "Admin",
            targetId: id,
            description: `Role changed to ${roleRow.name}`,
            previousValue: { role: target.role },
            newValue: { role: roleRow.name },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Admin role updated successfully.",
            admin: {
                id: admin.id,
                role: admin.role,
                roleId: admin.roleId,
                roleName: roleRow.name,
                isSuperAdmin: admin.isSuperAdmin
            }
        });
    } catch (error: any) {
        console.error("UPDATE ADMIN ROLE ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Reset Admin Password (Super Admin only) ──────────────────────────────────

export const resetAdminPassword = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = req.params.id as string;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ message: "Admin account not found." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newAuthProvider =
            target.authProvider === "GOOGLE" ? "EMAIL_AND_GOOGLE" : target.authProvider;

        await prisma.admin.update({
            where: { id },
            data: { passwordHash, authProvider: newAuthProvider }
        });

        return res.status(200).json({ message: "Admin password reset successfully." });
    } catch (error: any) {
        console.error("RESET ADMIN PASSWORD ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Forgot Password (self-service) ───────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });

        // Always return success to prevent account enumeration
        if (!admin || !admin.isActive) {
            return res.status(200).json({
                message: "If an account exists for this email, a password reset link has been sent.",
            });
        }

        // If admin has no passwordHash (Google-only account), they can't reset via password
        if (!admin.passwordHash) {
            return res.status(200).json({
                message: "If an account exists for this email, a password reset link has been sent.",
            });
        }

        // Generate 6-digit numeric OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await prisma.otp.create({
            data: {
                entityType: "ADMIN",
                entityId: admin.id,
                email: admin.email,
                codeHash,
                purpose: "PASSWORD_RESET",
                expiresAt,
            }
        });

        const adminFrontendUrl = (process.env.ADMIN_FRONTEND_URL || "http://localhost:8001").replace(/\/$/, "");
        const resetLink = `${adminFrontendUrl}/forgot-password?otp=${code}&email=${encodeURIComponent(admin.email)}`;

        await EmailService.sendForgotPassword(admin.email, code, {
            firstName: admin.firstName,
            resetUrl: resetLink,
        });

        return res.status(200).json({
            message: "If an account exists for this email, a password reset link has been sent.",
        });
    } catch (error: any) {
        console.error("ADMIN FORGOT PASSWORD ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
        if (!admin) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const otpRecord = await prisma.otp.findFirst({
            where: {
                email: admin.email,
                purpose: "PASSWORD_RESET",
                expiresAt: { gt: new Date() },
                usedAt: null,
            },
            orderBy: { createdAt: "desc" }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
        }

        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            return res.status(400).json({ message: "Max attempts exceeded. Please request a new OTP." });
        }

        const isMatch = await bcrypt.compare(otp, otpRecord.codeHash);
        if (!isMatch) {
            await prisma.otp.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });
            return res.status(400).json({ message: "Invalid OTP code. Please try again." });
        }

        await prisma.otp.update({
            where: { id: otpRecord.id },
            data: { usedAt: new Date() }
        });

        const resetToken = jwt.sign(
            { adminId: admin.id, purpose: "reset-password" },
            process.env.JWT_SECRET_KEY!,
            { expiresIn: "10m" }
        );

        return res.status(200).json({ message: "OTP verified successfully.", resetToken });
    } catch (error: any) {
        console.error("ADMIN VERIFY OTP ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ─── Reset Password (with reset token) ────────────────────────────────────────

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ message: "Token and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        let decoded: any;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET_KEY!);
        } catch {
            return res.status(400).json({ message: "Invalid or expired password reset token." });
        }

        if (!decoded || decoded.purpose !== "reset-password" || !decoded.adminId) {
            return res.status(400).json({ message: "Invalid reset token payload." });
        }

        const admin = await prisma.admin.findUnique({ where: { id: decoded.adminId } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const newAuthProvider =
            admin.authProvider === "GOOGLE" ? "EMAIL_AND_GOOGLE" : admin.authProvider;

        await prisma.admin.update({
            where: { id: admin.id },
            data: { passwordHash, authProvider: newAuthProvider }
        });

        return res.status(200).json({
            message: "Password updated successfully. Please log in with your new password."
        });
    } catch (error: any) {
        console.error("ADMIN RESET PASSWORD ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
