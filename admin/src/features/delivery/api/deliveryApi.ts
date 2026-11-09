import axiosInstance from '@/lib/axios/axiosInstance';

export const deliveryApi = {
  // ─── Deliveries Endpoints ───────────────────────────────────────────────────
  getAllDeliveries: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await axiosInstance.get('/api/admin/deliveries', { params });
    return response.data;
  },
  getDelivery: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/deliveries/${id}`);
    return response.data;
  },
  cancelDelivery: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/deliveries/${id}/cancel`, { reason });
    return response.data;
  },
  reassignDelivery: async (id: string, deliveryPartnerId?: string) => {
    const response = await axiosInstance.patch(`/api/admin/deliveries/${id}/reassign`, { deliveryPartnerId });
    return response.data;
  },
  getDeliveryAnalytics: async () => {
    const response = await axiosInstance.get('/api/admin/deliveries/analytics');
    return response.data;
  },
  getLiveDeliveries: async () => {
    const response = await axiosInstance.get('/api/admin/deliveries/live');
    return response.data;
  },
  changeDeliveryProvider: async (payload: { defaultProvider: string }) => {
    const response = await axiosInstance.patch('/api/admin/delivery-provider', payload);
    return response.data;
  },

  // ─── Central Delivery Platform Operations ──────────────────────────────────
  getOverviewStats: async () => {
    const response = await axiosInstance.get('/api/admin/delivery/stats');
    return response.data;
  },
  getSettings: async () => {
    const response = await axiosInstance.get('/api/admin/delivery/settings');
    return response.data;
  },
  updateSettings: async (settings: any) => {
    const response = await axiosInstance.put('/api/admin/delivery/settings', settings);
    return response.data;
  },
  getSettingsLogs: async () => {
    const response = await axiosInstance.get('/api/admin/delivery/settings/logs');
    return response.data;
  },
  getRiders: async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const response = await axiosInstance.get('/api/admin/delivery/riders', { params });
    return response.data;
  },
  getRiderDetail: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/delivery/riders/${id}`);
    return response.data;
  },
  verifyRider: async (id: string, payload: { status: string; rejectionReason?: string }) => {
    const response = await axiosInstance.post(`/api/admin/delivery/riders/${id}/verify`, payload);
    return response.data;
  },
  updateRiderStatus: async (id: string, payload: { status: string; reason?: string }) => {
    const response = await axiosInstance.post(`/api/admin/delivery/riders/${id}/status`, payload);
    return response.data;
  },
  deleteRiderAadhaar: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/delivery/riders/${id}/aadhaar`);
    return response.data;
  },
  getJobs: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await axiosInstance.get('/api/admin/delivery/jobs', { params });
    return response.data;
  },
  getJobDetail: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/delivery/jobs/${id}`);
    return response.data;
  },
  manualAssignRider: async (id: string, deliveryPartnerId: string) => {
    const response = await axiosInstance.post(`/api/admin/delivery/jobs/${id}/assign`, { deliveryPartnerId });
    return response.data;
  },
  adminCancelJob: async (id: string, reason: string) => {
    const response = await axiosInstance.post(`/api/admin/delivery/jobs/${id}/cancel`, { reason });
    return response.data;
  },
  getPayoutOverview: async () => {
    const response = await axiosInstance.get('/api/admin/delivery/payouts');
    return response.data;
  },
  processPayout: async (payload: { riderId: string; amountPaise: number; bankReference: string; notes?: string }) => {
    const response = await axiosInstance.post('/api/admin/delivery/payouts/process', payload);
    return response.data;
  },
  getIncidents: async () => {
    const response = await axiosInstance.get('/api/admin/delivery/incidents');
    return response.data;
  },
  resolveIncident: async (id: string, payload: { status: string; faultPenaltyPaise?: number; resolutionNotes?: string }) => {
    const response = await axiosInstance.post(`/api/admin/delivery/incidents/${id}/resolve`, payload);
    return response.data;
  },
  reviewStrikeAppeal: async (id: string, payload: { decision: "UPHELD" | "OVERTURNED"; reviewNotes?: string }) => {
    const response = await axiosInstance.post(`/api/admin/delivery/strikes/${id}/appeal`, payload);
    return response.data;
  },
  getConversations: async () => {
    const response = await axiosInstance.get('/api/admin/delivery/conversations');
    return response.data;
  },
  getExternalShops: async () => {
    const response = await axiosInstance.get('/api/admin/delivery/shops');
    return response.data;
  },
  createExternalShop: async (payload: any) => {
    const response = await axiosInstance.post('/api/admin/delivery/shops', payload);
    return response.data;
  },
  requestShopDelivery: async (shopId: string, payload: any) => {
    const response = await axiosInstance.post(`/api/admin/delivery/shops/${shopId}/request-delivery`, payload);
    return response.data;
  },
};
