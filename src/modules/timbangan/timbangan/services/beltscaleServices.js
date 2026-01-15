import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

export const beltScaleServices = {
  async getFleetByBeltscale(params) {
    try {
      const { date, shift, dumping_location, user } = params;

      if (!date) {
        throw new Error("Tanggal wajib diisi");
      }
      if (!shift) {
        throw new Error("Shift wajib dipilih");
      }
      if (!dumping_location) {
        throw new Error("Dumping location wajib dipilih");
      }

      logger.info("📥 Getting fleet by BeltScale", {
        date,
        shift,
        dumping_location,
      });

      const response = await offlineService.get(
        "/v1/custom/setting-fleet/beltscale",
        {
          params: {
            date,
            shift,
            dumping_location,
          },
        }
      );

      const fleets = response.data || response || [];

      logger.info("✅ Fleet by BeltScale fetched", {
        count: fleets.length,
        total_tonnage: fleets.reduce(
          (sum, f) => sum + (f.total_tonnage || 0),
          0
        ),
      });

      return { success: true, data: fleets };
    } catch (error) {
      logger.error("❌ Failed to get fleet by BeltScale", {
        error: error.response.data.message,
        params,
      });
      return { success: false, data: [], error: error.response.data.message };
    }
  },

  /**
   * Submit BeltScale adjustment ke backend
   * Endpoint: /v1/custom/ritase/calculate-beltscale
   * @param {Object} adjustmentData - {setting_fleet: Array<number>, beltscale: number, created_by_user}
   */
  async submitBeltscaleAdjustment(adjustmentData) {
    try {
      const { setting_fleet, beltscale, created_by_user } = adjustmentData;

      if (
        !setting_fleet ||
        !Array.isArray(setting_fleet) ||
        setting_fleet.length === 0
      ) {
        throw new Error("Setting fleet wajib dipilih (minimal 1)");
      }

      if (isNaN(beltscale) || beltscale <= 0) {
        throw new Error("Beltscale tidak valid atau harus lebih dari 0");
      }

      const payload = {
        setting_fleet: setting_fleet.map((id) => parseInt(id)),
        beltscale: parseFloat(beltscale),
      };

      if (created_by_user) {
        payload.created_by_user = parseInt(created_by_user);
      }

      logger.info("📤 Submitting BeltScale adjustment", {
        fleet_count: payload.setting_fleet.length,
        beltscale: payload.beltscale,
      });

      const response = await offlineService.post(
        "/v1/custom/ritase/calculate-beltscale",
        payload
      );

      const result = response.data || response || [];

      logger.info("✅ BeltScale adjustment submitted", {
        fleets: result.length,
        total_tonnage_after: result.reduce(
          (sum, fleet) => sum + (fleet.total_tonnage || 0),
          0
        ),
      });

      return {
        success: true,
        data: {
          fleets: result,
          summary: {
            beltscale: payload.beltscale,
            total_after: result.reduce(
              (sum, fleet) => sum + (fleet.total_tonnage || 0),
              0
            ),
            updated_count: result.length,
          },
        },
        message: `BeltScale adjustment berhasil untuk ${result.length} fleet`,
      };
    } catch (error) {
      logger.error("❌ Failed to submit BeltScale adjustment", {
        error: error.response.data.message,
      });
      throw error;
    }
  },

  /**
   * Get BeltScale adjustment history (optional - if you want to show history)
   */
  async getBeltscaleHistory(filters = {}) {
    try {
      const params = {
        filters: {
          measurement_type: { $eq: "BeltScale" },
        },
        sort: ["createdAt:desc"],
        pagination: { pageSize: 50 },
        populate: [
          "setting_fleet",
          "setting_fleet.unit_exca",
          "created_by_user",
        ],
      };

      if (filters.startDate) {
        params.filters.date = { $gte: filters.startDate };
      }
      if (filters.endDate) {
        if (!params.filters.date) params.filters.date = {};
        params.filters.date.$lte = filters.endDate;
      }

      const response = await offlineService.get("/ritases", {
        params,
      });

      return { success: true, data: response.data };
    } catch (error) {
      logger.error("❌ Failed to fetch BeltScale history", {
        error: error.response.data.message,
      });
      return { success: false, data: [], error: error.response.data.message };
    }
  },
};
