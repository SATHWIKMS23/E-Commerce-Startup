import axios from "axios";
import * as SecureStore from "expo-secure-store";
import type { Delivery, Rider } from "./types";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

if (!apiBaseUrl) {
  console.error("EXPO_PUBLIC_API_URL is missing; API requests cannot be made.");
}

export const TOKEN_KEY = "delivery_partner_token";
export const RIDER_KEY = "delivery_partner_rider";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers["x-delivery-token"] = token;
  }
  return config;
});

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function addressText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";
  return [
    value.addressLine1,
    value.addressLine2,
    value.city,
    value.state,
    value.postalCode,
  ].filter((part): part is string => typeof part === "string" && Boolean(part.trim())).join(", ");
}

function coordinate(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeRider(value: unknown, fallback?: Rider): Rider | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    ...fallback,
    ...value,
    id: value.id,
    firstName: typeof value.firstName === "string" ? value.firstName : fallback?.firstName || "Rider",
    lastName: typeof value.lastName === "string" ? value.lastName : fallback?.lastName || "",
    email: typeof value.email === "string" ? value.email : fallback?.email || "",
    phone: typeof value.phone === "string" ? value.phone : fallback?.phone || "",
    verificationStatus: value.verificationStatus === "APPROVED" ||
      value.verificationStatus === "REJECTED" ||
      value.verificationStatus === "SUSPENDED" ||
      value.verificationStatus === "BANNED"
      ? value.verificationStatus
      : fallback?.verificationStatus || "PENDING",
    isAvailable: typeof value.isAvailable === "boolean" ? value.isAvailable : fallback?.isAvailable || false,
    ratingAverage: Number(value.ratingAverage ?? value.rating ?? fallback?.ratingAverage ?? 0),
    ratingCount: Number(value.ratingCount ?? value.totalRatings ?? fallback?.ratingCount ?? 0),
    strikeCount: Number(value.strikeCount ?? value.activeStrikesCount ?? fallback?.strikeCount ?? 0),
  } as Rider;
}

export function normalizeDelivery(value: unknown): Delivery | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const pickup = isRecord(value.pickupAddressSnapshot) ? value.pickupAddressSnapshot : {};
  const dropoff = isRecord(value.deliveryAddressSnapshot) ? value.deliveryAddressSnapshot : {};
  return {
    id: value.id,
    trackingNumber: String(value.trackingNumber || value.deliveryNumber || value.id.slice(0, 8)),
    status: String(value.status || "UNKNOWN"),
    pickupAddress: addressText(value.pickupAddress ?? value.pickupAddressSnapshot),
    pickupContactName: typeof value.pickupContactName === "string"
      ? value.pickupContactName
      : typeof pickup.contactPerson === "string" ? pickup.contactPerson : typeof pickup.name === "string" ? pickup.name : undefined,
    pickupContactPhone: typeof value.pickupContactPhone === "string"
      ? value.pickupContactPhone
      : typeof pickup.phone === "string" ? pickup.phone : undefined,
    pickupLatitude: coordinate(value.pickupLatitude ?? value.pickupLat ?? pickup.latitude),
    pickupLongitude: coordinate(value.pickupLongitude ?? value.pickupLng ?? pickup.longitude),
    dropoffAddress: addressText(value.dropoffAddress ?? value.deliveryAddressSnapshot),
    dropoffContactName: typeof value.dropoffContactName === "string"
      ? value.dropoffContactName
      : typeof dropoff.name === "string" ? dropoff.name : undefined,
    dropoffContactPhone: typeof value.dropoffContactPhone === "string"
      ? value.dropoffContactPhone
      : typeof dropoff.phone === "string" ? dropoff.phone : undefined,
    dropoffLatitude: coordinate(value.dropoffLatitude ?? value.dropoffLat ?? dropoff.latitude),
    dropoffLongitude: coordinate(value.dropoffLongitude ?? value.dropoffLng ?? dropoff.longitude),
    distanceKm: Number(value.distanceKm) || undefined,
    durationMins: Number(value.durationMins ?? value.estimatedDurationMins) || undefined,
    riderPayoutAmountPaise: Number(value.riderPayoutAmountPaise ?? value.riderPayoutPaise ?? 0),
    totalAmountPaise: Number(value.totalAmountPaise ?? value.deliveryFeePaise ?? 0),
    packageDescription: typeof value.packageDescription === "string" ? value.packageDescription : undefined,
    navigationUrl: typeof value.navigationUrl === "string"
      ? value.navigationUrl
      : typeof value.pickupNavUrl === "string" ? value.pickupNavUrl : undefined,
    pickupNavigationUrl: typeof value.pickupNavUrl === "string" ? value.pickupNavUrl : undefined,
    dropoffNavigationUrl: typeof value.dropoffNavUrl === "string" ? value.dropoffNavUrl : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
    cancelledAt: typeof value.cancelledAt === "string" ? value.cancelledAt : null,
  };
}
