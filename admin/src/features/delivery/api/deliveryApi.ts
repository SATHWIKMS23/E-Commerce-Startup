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
  verifyRider: async (
    id: string,
    payload: {
      decision?: string;
      status?: string;
      rejectionReason?: string;
      reason?: string;
      documentApprovals?: Array<{ id: string; status: string; rejectionReason?: string }>;
    }
  ) => {
    const response = await axiosInstance.post(`/api/admin/delivery/riders/${id}/verify`, {
      decision: payload.decision || payload.status,
      rejectionReason: payload.rejectionReason || payload.reason,
      documentApprovals: payload.documentApprovals,
    });
    return response.data;
  },
  updateRiderStatus: async (id: string, payload: { status: string; reason?: string }) => {
    const response = await axiosInstance.post(`/api/admin/delivery/riders/${id}/status`, payload);
    return response.data;
  },
  issueStrike: async (
    riderId: string,
    payload: { reason: string; severity?: string; incidentId?: string }
  ) => {
    const response = await axiosInstance.post(`/api/admin/delivery/riders/${riderId}/strikes`, payload);
    return response.data;
  },
  revokeStrike: async (strikeId: string, payload?: { reason?: string }) => {
    const response = await axiosInstance.post(`/api/admin/delivery/strikes/${strikeId}/revoke`, payload || {});
    return response.data;
  },
  verifyDocument: async (
    documentId: string,
    payload: { status: "APPROVED" | "REJECTED" | "PENDING"; rejectionReason?: string }
  ) => {
    const response = await axiosInstance.post(`/api/admin/delivery/documents/${documentId}/verify`, payload);
    return response.data;
  },
  deleteRiderAadhaar: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/delivery/riders/${id}/aadhaar`);
    return response.data;
  },
  getJobs: async (params?: { page?: number; limit?: number; status?: string; riderId?: string; search?: string }) => {
    const response = await axiosInstance.get('/api/admin/delivery/jobs', { params });
    return response.data;
  },
  getJobDetail: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/delivery/jobs/${id}`);
    return response.data;
  },
  manualAssignRider: async (id: string, riderId: string) => {
    const response = await axiosInstance.post(`/api/admin/delivery/jobs/${id}/assign`, {
      riderId,
      deliveryPartnerId: riderId,
    });
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
  resolveIncident: async (
    id: string,
    payload: {
      decision?: "CONFIRMED" | "DISMISSED";
      status?: string;
      adminNotes?: string;
      resolutionNotes?: string;
      applyPenalty?: boolean;
      faultPenaltyPaise?: number;
      issueStrike?: boolean;
    }
  ) => {
    const response = await axiosInstance.post(`/api/admin/delivery/incidents/${id}/resolve`, payload);
    return response.data;
  },
  reviewStrikeAppeal: async (
    id: string,
    payload: { decision?: "UPHELD" | "OVERTURNED"; approved?: boolean; reviewNotes?: string; notes?: string }
  ) => {
    const approved = typeof payload.approved !== "undefined"
      ? payload.approved
      : payload.decision === "OVERTURNED";
    const response = await axiosInstance.post(`/api/admin/delivery/strikes/${id}/appeal`, {
      approved,
      notes: payload.notes || payload.reviewNotes,
    });
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
