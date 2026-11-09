export interface RiderProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ACTION_REQUIRED" | "SUSPENDED" | "BANNED";
  rejectionReason?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  residentialAddress?: string;
  city?: string;
  vehicleType: "BICYCLE" | "MOTORCYCLE" | "SCOOTER" | "EV" | "CAR" | "OTHER";
  vehicleNumber?: string;
  licenseNumber?: string;
  rcNumber?: string;
  insuranceNumber?: string;
  vehiclePhotoUrl?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  aadhaarNumberMasked?: string;
  aadhaarDeletedAt?: string;
  isAvailable: boolean;
  rating: number;
  totalRatings: number;
  totalDeliveriesCount: number;
  completedDeliveriesCount: number;
  cancelledDeliveriesCount: number;
  strikeCount: number;
  documents?: Array<{
    id: string;
    documentType: string;
    documentNumber?: string;
    status: string;
    rejectionReason?: string;
    createdAt: string;
  }>;
  strikes?: Array<{
    id: string;
    strikeNumber: number;
    reason: string;
    createdAt: string;
    isAppealed: boolean;
    appealStatus?: string;
  }>;
}

export interface DeliveryAddressSnapshot {
  name?: string;
  contactPerson?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface DeliveryTimelineEvent {
  id: string;
  deliveryId: string;
  status: string;
  actorType: string;
  actorId?: string;
  actorName?: string;
  title: string;
  description?: string;
  timestamp: string;
}

export interface DeliveryJob {
  id: string;
  deliveryNumber: string;
  sellerOrderId?: string;
  externalShopId?: string;
  deliveryPartnerId?: string;
  status:
    | "REQUESTED"
    | "SEARCHING_FOR_RIDER"
    | "OFFERED_TO_RIDER"
    | "ASSIGNED"
    | "ACCEPTED"
    | "ARRIVING_AT_PICKUP"
    | "ARRIVED_AT_PICKUP"
    | "PICKUP_VERIFICATION"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "ARRIVED_AT_DROPOFF"
    | "DELIVERY_VERIFICATION"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
    | "FAILED"
    | "REASSIGNMENT_REQUIRED"
    | "DISPUTED";
  pickupAddressSnapshot: DeliveryAddressSnapshot;
  deliveryAddressSnapshot: DeliveryAddressSnapshot;
  pickupContactName?: string;
  pickupContactPhone?: string;
  dropoffContactName?: string;
  dropoffContactPhone?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  distanceKm?: number;
  estimatedDurationMins?: number;
  baseChargePaise: number;
  distanceChargePaise: number;
  additionalChargePaise: number;
  deliveryFeePaise: number;
  riderPayoutPercentage: number;
  riderPayoutPaise: number;
  platformCommissionPaise: number;
  payoutStatus: "PENDING" | "PAID" | "ADJUSTED" | "WITHHELD";
  pickupQrToken?: string;
  pickupNavUrl?: string;
  dropoffNavUrl?: string;
  requestedAt: string;
  arrivedAtPickupAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  arrivedAtDropoffAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  deliveryTimelineEvents?: DeliveryTimelineEvent[];
  externalShop?: {
    id: string;
    name: string;
    category: string;
    phone: string;
  };
}

export interface DeliveryOffer {
  assignmentId: string;
  deliveryId: string;
  deliveryNumber: string;
  distanceKm: number;
  estimatedDurationMins: number;
  riderPayoutPaise: number;
  totalDeliveryFeePaise: number;
  pickupAddress: DeliveryAddressSnapshot;
  dropoffAddress: DeliveryAddressSnapshot;
  remainingSeconds: number;
  offeredAt: string;
  expiresAt: string;
}

export interface EarningsSummary {
  todayEarningsPaise: number;
  weeklyEarningsPaise: number;
  monthlyEarningsPaise: number;
  totalLifetimePaise: number;
  pendingPayoutPaise: number;
  completedTripsCount: number;
  recentDeliveries: Array<{
    id: string;
    deliveryNumber: string;
    completedAt: string;
    distanceKm: number;
    totalDeliveryFeePaise: number;
    riderPayoutPercentage: number;
    riderPayoutPaise: number;
    payoutStatus: string;
  }>;
  payoutHistory: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    totalDeliveriesCount: number;
    netAmountPaise: number;
    status: string;
    paymentReference?: string;
    paymentMethod?: string;
    paidAt?: string;
  }>;
}

export interface SupportConversation {
  id: string;
  subject?: string;
  status: "OPEN" | "PENDING" | "RESOLVED";
  lastMessageAt: string;
  createdAt: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: "CUSTOMER" | "SELLER" | "ADMIN" | "DELIVERY_PARTNER" | "SYSTEM";
  senderId: string;
  senderName?: string;
  message: string;
  isInternal?: boolean;
  createdAt: string;
}
