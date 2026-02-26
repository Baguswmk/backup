import { logger } from "@/shared/services/log";
import { offlineService } from "@/shared/services/offlineService";

const extractErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Terjadi kesalahan"
  );
};

const buildRitaseFilters = (options = {}) => {
  const { user } = options;
  const filters = {};
  const role = user?.role?.toLowerCase();

  switch (role) {
    case "ccr":
      logger.info("👑 No role-specific filter for CCR");
      break;

    default:
      if (user?.id) {
        filters.created_by_user = {
          id: { $eq: parseInt(user.id) },
        };

        logger.info("🔍 created_by_user filter applied", {
          userId: user.id,
          role: role || "unknown",
        });
      } else {
        logger.warn("⚠️ Unknown role or missing user id, no filter applied", {
          role,
        });
      }
      break;
  }

  logger.info("📋 Final buildRitaseFilters result", filters);
  return filters;
};

export const ritasePendingService = {
  async fetchPendingRitase(options = {}) {
    try {
      const { user, forceRefresh = false } = options;

      const filters = buildRitaseFilters({ user });

      logger.info("🔍 Fetching pending ritase", {
        filters: JSON.stringify(filters),
        forceRefresh,
      });

      const response = await offlineService.get("/v1/custom/ritase/status", {
        params: { filters },
        forceRefresh,
      });

      logger.info("✅ Pending ritase fetched", {
        success: response.success,
      });

      return response;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to fetch pending ritase", {
        error: errorMessage,
        details: error.response?.data,
      });

      return { success: false, error: errorMessage };
    }
  },

  async syncSingleRitase(ritase) {
    try {
      logger.info("🔄 Syncing single ritase", { id: ritase.id });

      const response = await offlineService.put(
        "/v1/custom/ritase/offline/sync",
        { id: ritase.id },
      );

      logger.info("✅ Ritase synced", { id: ritase.id });

      return { ...response };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to sync ritase", {
        id: ritase.id,
        error: errorMessage,
        details: error.response?.data,
      });

      return { success: false, error: errorMessage };
    }
  },

  async syncBulkRitase(ritases) {
    try {
      logger.info("🔄 Syncing bulk ritase", { count: ritases.length });

      const ids = ritases.map((r) => r.id);

      const response = await offlineService.put(
        "/v1/custom/ritase/offline/sync",
        { id: ids },
      );

      logger.info("✅ Bulk ritase synced", {
        count: ritases.length,
        ids,
      });

      return { ...response };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to sync bulk ritase", {
        error: errorMessage,
        details: error.response?.data,
      });

      return { success: false, error: errorMessage };
    }
  },
};
