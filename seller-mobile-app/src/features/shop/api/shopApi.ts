import axiosInstance from '@/lib/axios/axiosInstance';

export interface ShopAddress {
  id: string;
  fullName: string;
  contactName?: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  placeId?: string;
}

export interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  status: string;
  rejectionReason?: string;
  defaultPickupAddress?: ShopAddress;
  commissionPercentage?: number;
  commissionNotes?: string;
  packingFeeApproved?: boolean;
  enablePackingFee?: boolean;
  packingFeeEnabled?: boolean;
  packingFeeAmount?: number;
  packingFeeApprovedMaxAmount?: number;
  packingFeeApprovalStatus?: string;
  packingFeeRequestedAt?: string;
  packingFeeApprovedAt?: string;
  packingFeeRejectedReason?: string;
  packingFeeRequests?: any[];
}

export interface BankAccountDetails {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface ShopSetupPayload {
  shopName: string;
  slug: string;
  description?: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  placeId?: string;
  type?: string;
  label?: string;
  contactName?: string;
  gstRegistered?: boolean;
  gstNumber?: string;
}

export const shopApi = {
  getShop: async (): Promise<{ shop: ShopInfo }> => {
    const response = await axiosInstance.get('/seller/api/shop');
    return response.data;
  },

  createShop: async (payload: ShopSetupPayload): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.post('/seller/api/shop', payload);
    return response.data;
  },

  updateShop: async (payload: Partial<ShopSetupPayload>): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.put('/seller/api/shop', payload);
    return response.data;
  },

  getBankAccount: async (): Promise<{ bankAccount: BankAccountDetails[] }> => {
    const response = await axiosInstance.get('/seller/api/shop/bank-account');
    return response.data;
  },

  addBankAccount: async (payload: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  }): Promise<{ message: string; bankAccount: BankAccountDetails }> => {
    const response = await axiosInstance.post('/seller/api/shop/bank-account', payload);
    return response.data;
  },

  updateBanner: async (bannerUrl: string): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.put('/seller/api/shop/banner', { bannerUrl });
    return response.data;
  },

  updateLogo: async (logoUrl: string): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.put('/seller/api/shop/logo', { logoUrl });
    return response.data;
  },

  submitBanAppeal: async (payload: { subject: string; description: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/seller/api/shop/ban-appeal', payload);
    return response.data;
  },

  deleteShop: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete('/seller/api/shop');
    return response.data;
  },

  requestPackingFeeApproval: async (payload: {
    reason: string;
    requestedMaxFee: number;
    supportingNotes?: string;
  }): Promise<{ message: string; request: any }> => {
    const response = await axiosInstance.post('/seller/api/shop/packing-fee-approval-request', payload);
    return response.data;
  },

  togglePackingFee: async (payload: {
    enabled: boolean;
    amount?: number;
  }): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.patch('/seller/api/shop/packing-fee', payload);
    return response.data;
  },

  getLocationsStates: async (): Promise<{
    states: string[];
    allStates: Array<{ id: string; name: string; isEnabled: boolean }>;
    districtRequired: boolean;
  }> => {
    const response = await axiosInstance.get('/api/locations/states');
    return response.data;
  },

  getLocationsDistricts: async (stateName: string): Promise<{
    districts: string[];
    allDistricts: Array<{ id: string; name: string; isEnabled: boolean }>;
  }> => {
    const response = await axiosInstance.get(`/api/locations/states/${encodeURIComponent(stateName)}/districts`);
    return response.data;
  },
};
