import { logger } from "@/shared/services/log";
import { offlineService } from "@/shared/services/offlineService";

export const ritasePendingService = {
  fetchPendingRitase: async (forceRefresh) => {
    try {
      const response = await offlineService.get("/v1/custom/ritase/status", {
        forceRefresh: forceRefresh || false,
      });
      return response;
    } catch (error) {
      logger.error("❌ Failed to fetch timbangan data", error);
      return { success: false, error };
    }
  },

  syncSingleRitase: async (ritase) => {
    try {
      const response = await offlineService.put("/v1/custom/ritase/offline/sync", {
        id: ritase.id,
      });
      return { success: response.success };

    } catch (error) {
      logger.error("❌ Failed to sync ritase", { id: ritase.id, error });
      return { success: false, error };
    }
  },

  syncBulkRitase: async (ritases) => {
    try {
      const response = await offlineService.put("/v1/custom/ritase/offline/sync-bulk", {
        ritases, // id : []
      });
      return { success: response.success };
    } catch (error) {
      logger.error("❌ Failed to sync ritases", { error });
      return { success: false, error };
    }
  },
};
