import { apiClient } from "@/shared/services/api";
import { offlineService } from "@/shared/services/offlineService";
import { apiConfig } from "@/shared/config/env";

const BASE_URL = "/v1/custom/ritase/manual-weigh";

export const manualWeighService = {
  createGrossWeigh: async (payload) => {
    try {
      const response = await apiClient.post(BASE_URL, payload, {
        timeout: apiConfig.timbanganTimeout,
      });
      return response.data;
    } catch (error) {
      // Network error (no response) or offline → queue for retry
      const isNetworkError = !error.response && (error.request || !navigator.onLine);
      if (isNetworkError) {
        await offlineService.addToQueue({
          url: BASE_URL,
          method: "POST",
          data: payload,
        });
        return { queued: true, status: "queued", offline: true };
      }

      if (error.response?.status === 409) {
        return { duplicate: true, status: "sent", note: "Data sudah ada di server" };
      }

      throw error;
    }
  },

  updateTareWeigh: async (id, payload) => {
    try {
      const response = await apiClient.put(`${BASE_URL}/${id}`, payload, {
        timeout: apiConfig.timbanganTimeout,
      });
      return response.data;
    } catch (error) {
      const isNetworkError = !error.response && (error.request || !navigator.onLine);
      if (isNetworkError) {
        await offlineService.addToQueue({
          url: `${BASE_URL}/${id}`,
          method: "PUT",
          data: payload,
        });
        return { queued: true, status: "queued", offline: true };
      }

      throw error;
    }
  },

  getAllWeighs: async () => {
    const response = await apiClient.get(BASE_URL, {
      timeout: apiConfig.timbanganTimeout,
    });
    return response.data;
  },
};
