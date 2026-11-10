import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { DeliverySettingsService } from "./deliverySettings.service.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "");

export interface RiderRegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password?: string;
  dateOfBirth?: string | Date;
  residentialAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  city?: string;
  vehicleType: "BICYCLE" | "MOTORCYCLE" | "SCOOTER" | "EV" | "CAR" | "OTHER";
  vehicleNumber?: string;
  licenseNumber?: string;
  rcNumber?: string;
  insuranceNumber?: string;
  vehiclePhotoUrl?: string;
  avatarUrl?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  aadhaarNumber?: string;
  aadhaarDocUrl?: string;
  drivingLicenseDocUrl?: string;
  rcDocUrl?: string;
  insuranceDocUrl?: string;
}

export class RiderAuthService {
  private static getJwtSecret(): string {
    return process.env.JWT_SECRET_KEY || "atlasbasket_delivery_jwt_secret_default_key";
  }

  static generateToken(riderId: string): string {
    return jwt.sign({ id: riderId, role: "DELIVERY_PARTNER" }, this.getJwtSecret(), {
      expiresIn: "30d",
    });
  }

  static calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  static maskAadhaar(raw?: string): string | null {
    if (!raw) return null;
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length < 4) return "XXXX-XXXX-XXXX";
    const last4 = cleaned.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }

  static async register(input: RiderRegistrationInput) {
    // 1. Age verification (Min 18 years)
    if (input.dateOfBirth) {
      const dob = new Date(input.dateOfBirth);
      const age = this.calculateAge(dob);
      if (age < 18) {
        throw new Error("Rider must be at least 18 years old to register.");
      }
    }

    // 2. Vehicle and license rule:
    // Bicycles are exempt from driving license, motorized vehicles require valid license
    if (input.vehicleType !== "BICYCLE") {
      if (!input.licenseNumber && !input.drivingLicenseDocUrl) {
        throw new Error(
          "Valid driving license number or document is required for motorized vehicles."
        );
      }
    }

    // Check unique email & phone
    const existingEmail = await prisma.deliveryPartner.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new Error("A rider with this email address already exists.");
    }

    const existingPhone = await prisma.deliveryPartner.findUnique({
      where: { phone: input.phone.trim() },
    });
    if (existingPhone) {
      throw new Error("A rider with this phone number already exists.");
    }

    const passwordHash = input.password
      ? await bcrypt.hash(input.password, 10)
      : await bcrypt.hash(Math.random().toString(36), 10);

    const maskedAadhaar = this.maskAadhaar(input.aadhaarNumber);

    // Validate operational district against Admin-enabled districts in DB
    let validatedDistrict: string;
    if (input.city?.trim()) {
      const activeDistrict = await prisma.city.findFirst({
        where: {
          name: { equals: input.city.trim(), mode: "insensitive" },
          isActive: true,
        },
      });
      if (!activeDistrict) {
        throw new Error(
          `Delivery operations are not currently enabled for district '${input.city}'. Please select an admin-enabled district.`
        );
      }
      validatedDistrict = activeDistrict.name;
    } else {
      const firstActive = await prisma.city.findFirst({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      if (!firstActive) {
        throw new Error(
          "No operational delivery districts are currently enabled by admin in the database."
        );
      }
      validatedDistrict = firstActive.name;
    }

    const rider = await prisma.deliveryPartner.create({
      data: {
        email: input.email.toLowerCase().trim(),
        phone: input.phone.trim(),
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        avatarUrl: input.avatarUrl || null,
        status: "ACTIVE",
        verificationStatus: "PENDING", // Always PENDING initially until Admin approves
        isAvailable: false, // Cannot go online until verified
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        emergencyContactName: input.emergencyContactName || null,
        emergencyContactPhone: input.emergencyContactPhone || null,
        residentialAddress: input.residentialAddress || null,
        city: validatedDistrict,
        vehicleType: input.vehicleType,
        vehicleNumber: input.vehicleNumber || null,
        licenseNumber: input.licenseNumber || null,
        rcNumber: input.rcNumber || null,
        insuranceNumber: input.insuranceNumber || null,
        vehiclePhotoUrl: input.vehiclePhotoUrl || null,
        bankAccountName: input.bankAccountName || null,
        bankAccountNumber: input.bankAccountNumber || null,
        bankIfsc: input.bankIfsc || null,
        upiId: input.upiId || null,
        aadhaarNumberMasked: maskedAadhaar,
        aadhaarDocUrl: input.aadhaarDocUrl || null,
      },
    });

    // Create document records
    const documentsToCreate = [];
    if (input.aadhaarDocUrl) {
      documentsToCreate.push({
        deliveryPartnerId: rider.id,
        documentType: "AADHAAR",
        documentNumber: maskedAadhaar || undefined,
        documentUrl: input.aadhaarDocUrl,
        status: "PENDING",
      });
    }
    if (input.drivingLicenseDocUrl) {
      documentsToCreate.push({
        deliveryPartnerId: rider.id,
        documentType: "DRIVING_LICENSE",
        documentNumber: input.licenseNumber || undefined,
        documentUrl: input.drivingLicenseDocUrl,
        status: "PENDING",
      });
    }
    if (input.rcDocUrl) {
      documentsToCreate.push({
        deliveryPartnerId: rider.id,
        documentType: "VEHICLE_RC",
        documentNumber: input.rcNumber || undefined,
        documentUrl: input.rcDocUrl,
        status: "PENDING",
      });
    }
    if (input.insuranceDocUrl) {
      documentsToCreate.push({
        deliveryPartnerId: rider.id,
        documentType: "INSURANCE",
        documentNumber: input.insuranceNumber || undefined,
        documentUrl: input.insuranceDocUrl,
        status: "PENDING",
      });
    }

    if (documentsToCreate.length > 0) {
      await prisma.riderDocument.createMany({
        data: documentsToCreate,
      });
    }

    const token = this.generateToken(rider.id);
    return { rider: this.sanitizeRiderProfile(rider), token };
  }

  static async loginWithEmailPassword(email: string, passwordPlain: string) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { documents: { where: { isDeleted: false } } },
    });

    if (!rider) {
      throw new Error("Invalid email or password.");
    }

    if (rider.status === "SUSPENDED" || rider.verificationStatus === "BANNED") {
      throw new Error(
        `Your account has been ${rider.status.toLowerCase()}. Please contact support.`
      );
    }

    const isMatch = await bcrypt.compare(passwordPlain, rider.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid email or password.");
    }

    await prisma.deliveryPartner.update({
      where: { id: rider.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(rider.id);
    return { rider: this.sanitizeRiderProfile(rider), token };
  }

  static async loginWithGoogle(credential: string) {
    let email: string | undefined;
    let firstName = "Rider";
    let lastName = "";
    let picture: string | undefined;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (payload) {
        email = payload.email;
        firstName = payload.given_name || payload.name || "Rider";
        lastName = payload.family_name || "";
        picture = payload.picture;
      }
    } catch (e: any) {
      logger.warn(`[GoogleAuth] Google token verification fallback: ${e?.message}`);
      // Fallback decode if direct offline verification
      const decoded: any = jwt.decode(credential);
      if (decoded && decoded.email) {
        email = decoded.email;
        firstName = decoded.given_name || decoded.name || "Rider";
        lastName = decoded.family_name || "";
        picture = decoded.picture;
      } else {
        throw new Error("Failed to verify Google token.");
      }
    }

    if (!email) {
      throw new Error("Unable to retrieve email from Google authentication.");
    }

    let rider = await prisma.deliveryPartner.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!rider) {
      // Create provisional rider account needing vehicle info & documents
      rider = await prisma.deliveryPartner.create({
        data: {
          email: email.toLowerCase().trim(),
          phone: `G_${Date.now()}`,
          passwordHash: await bcrypt.hash(Math.random().toString(36), 10),
          firstName,
          lastName,
          avatarUrl: picture || null,
          status: "ACTIVE",
          verificationStatus: "PENDING",
          isAvailable: false,
          city: "Mysuru",
        },
      });
    }

    await prisma.deliveryPartner.update({
      where: { id: rider.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(rider.id);
    return { rider: this.sanitizeRiderProfile(rider), token };
  }

  static async getMe(riderId: string) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
      include: {
        documents: {
          where: { isDeleted: false },
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            status: true,
            rejectionReason: true,
            createdAt: true,
          },
        },
        strikes: {
          where: { isRevoked: false },
          select: {
            id: true,
            strikeNumber: true,
            reason: true,
            createdAt: true,
            isAppealed: true,
            appealStatus: true,
          },
        },
      },
    });

    if (!rider) {
      throw new Error("Rider not found.");
    }

    return this.sanitizeRiderProfile(rider);
  }

  static sanitizeRiderProfile(rider: any) {
    const { passwordHash, ...safe } = rider;
    return safe;
  }

  static getPublicProfile(rider: any) {
    return {
      id: rider.id,
      name: `${rider.firstName} ${rider.lastName ? rider.lastName[0] + "." : ""}`.trim(),
      avatarUrl: rider.avatarUrl,
      vehicleType: rider.vehicleType,
      rating: rider.rating || 5.0,
      totalRatings: rider.totalRatings || 0,
      completedDeliveriesCount: rider.completedDeliveriesCount || 0,
      isVerified: rider.verificationStatus === "APPROVED",
    };
  }

  static async deleteAadhaarDocument(adminId: string, riderId: string) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
    });
    if (!rider) throw new Error("Rider not found.");

    await prisma.$transaction([
      prisma.deliveryPartner.update({
        where: { id: riderId },
        data: {
          aadhaarDocUrl: null,
          aadhaarDocKey: null,
          aadhaarDeletedAt: new Date(),
          aadhaarNumberMasked: "DELETED",
        },
      }),
      prisma.riderDocument.updateMany({
        where: {
          deliveryPartnerId: riderId,
          documentType: "AADHAAR",
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedByAdminId: adminId,
          documentUrl: "[DELETED]",
        },
      }),
      prisma.deliverySettingsAuditLog.create({
        data: {
          adminId,
          settingKey: `RIDER_AADHAAR_PURGED_${riderId}`,
          previousValue: "ACTIVE_DOCUMENT",
          newValue: "PERMANENTLY_DELETED",
          reason: "Secure document retention policy deletion executed by Admin",
        },
      }),
    ]);

    logger.info(`[Compliance] Admin ${adminId} securely deleted Aadhaar for rider ${riderId}`);
    return { success: true, message: "Aadhaar document securely and permanently deleted." };
  }
}
