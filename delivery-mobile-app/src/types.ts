export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  CompleteProfile: undefined;
  Main: undefined;
  Delivery: { deliveryId: string };
  Profile: undefined;
  History: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Offers: undefined;
  Active: undefined;
  Earnings: undefined;
  Support: undefined;
};

export interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  dateOfBirth?: string | null;
  residentialAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  drivingLicenseNumber?: string;
  licenseNumber?: string;
  rcNumber?: string;
  insuranceNumber?: string;
  drivingLicenseDocUrl?: string;
  rcDocUrl?: string;
  insuranceDocUrl?: string;
  aadhaarDocUrl?: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "BANNED";
  isAvailable: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  strikeCount?: number;
  activeStrikesCount?: number;
  bankAccountHolderName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  upiId?: string;
  aadhaarNumberMasked?: string;
  strikes?: Array<{ id: string; reason?: string; status?: string }>;
}

export interface Delivery {
  id: string;
  trackingNumber: string;
  status: string;
  pickupAddress: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress: string;
  dropoffContactName?: string;
  dropoffContactPhone?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  distanceKm?: number;
  durationMins?: number;
  riderPayoutAmountPaise: number;
  totalAmountPaise?: number;
  packageDescription?: string;
  navigationUrl?: string;
  pickupNavigationUrl?: string;
  dropoffNavigationUrl?: string;
  expiresAt?: string;
  createdAt?: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
}

export interface DashboardSummary {
  todayEarnings: number;
  pendingEarnings: number;
  todayCompletedCount: number;
  totalCompletedCount: number;
  pendingOffersCount: number;
  activeStrikesCount: number;
  activeDelivery: Delivery | null;
}

export interface Offer {
  assignmentId: string;
  deliveryId: string;
  expiresAt: string;
  delivery: Delivery;
}

export interface PublicSettings {
  brandName?: string;
  brandLogoUrl?: string | null;
  brandTagline?: string;
  riderPayoutPercentage?: number;
  baseChargePaise?: number;
  perKmChargePaise?: number;
  minDeliveryChargePaise?: number;
  activeCity?: string | null;
  activeCities?: string[];
  activeDistrictCount?: number;
  supportedVehicles?: string[];
  isDeliveryServiceEnabled?: boolean;
  hero?: {
    badge?: string;
    line1?: string;
    line2?: string;
    description?: string;
  };
  cards?: Record<string, { show?: boolean; value?: string; label?: string; desc?: string }>;
}
