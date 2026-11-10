import axiosInstance from './api.service';
import { API_ROUTES } from '../config/api';

export interface StateInfo {
  name: string;
  isEnabled: boolean;
}

export interface DistrictInfo {
  name: string;
  isEnabled: boolean;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  postalCode: string;
  country?: string;
  type?: string;
  label?: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export const locationService = {
  getStates: async (): Promise<{ states: StateInfo[]; allStates: StateInfo[]; districtRequired: boolean }> => {
    try {
      const res = await axiosInstance.get(API_ROUTES.addresses.states);
      return {
        states: res.data?.states || [],
        allStates: res.data?.allStates || res.data?.states || [],
        districtRequired: res.data?.districtRequired !== false,
      };
    } catch {
      return {
        states: [{ name: 'Karnataka', isEnabled: true }],
        allStates: [{ name: 'Karnataka', isEnabled: true }],
        districtRequired: true,
      };
    }
  },

  getDistricts: async (state: string): Promise<{ districts: DistrictInfo[]; allDistricts: DistrictInfo[] }> => {
    try {
      const res = await axiosInstance.get(API_ROUTES.addresses.districts(state));
      return {
        districts: res.data?.districts || [],
        allDistricts: res.data?.allDistricts || res.data?.districts || [],
      };
    } catch {
      return { districts: [], allDistricts: [] };
    }
  },

  getAddresses: async (): Promise<Address[]> => {
    try {
      const res = await axiosInstance.get(API_ROUTES.addresses.list);
      return res.data?.addresses || res.data || [];
    } catch {
      return [];
    }
  },

  createAddress: async (payload: Partial<Address>): Promise<Address> => {
    const res = await axiosInstance.post(API_ROUTES.addresses.create, payload);
    return res.data?.address || res.data;
  },

  updateAddress: async (id: string, payload: Partial<Address>): Promise<Address> => {
    const res = await axiosInstance.put(API_ROUTES.addresses.byId(id), payload);
    return res.data?.address || res.data;
  },

  setDefaultAddress: async (id: string): Promise<any> => {
    const res = await axiosInstance.post(API_ROUTES.addresses.setDefault(id));
    return res.data;
  },

  deleteAddress: async (id: string): Promise<any> => {
    const res = await axiosInstance.delete(API_ROUTES.addresses.byId(id));
    return res.data;
  },
};
