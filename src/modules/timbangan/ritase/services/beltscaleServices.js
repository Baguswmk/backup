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

      logger.info("📥 Getting fleet by Beltscale", {
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
        },
      );

      const fleets = response.data || response || [];

      logger.info("✅ Fleet by Beltscale fetched", {
        count: fleets.length,
        total_tonnage: fleets.reduce(
          (sum, f) => sum + (f.total_tonnage || 0),
          0,
        ),
      });

      return { success: true, data: fleets };
    } catch (error) {
      logger.error("❌ Failed to get fleet by Beltscale", {
        error: error.message,
        params,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  /**
   * Submit Beltscale adjustment ke backend
   * Endpoint: /v1/custom/ritase/calculate-beltscale
   * @param {Object} adjustmentData - {setting_fleet: Array<number>, beltscale: number, created_by_user}
   */
  async submitBeltscaleAdjustment(adjustmentData) {
    try {
      const { date, shift, dumping_location, beltscale, created_by_user } =
        adjustmentData;

      if (!date) {
        throw new Error("Tanggal wajib diisi");
      }
      if (!shift) {
        throw new Error("Shift wajib dipilih");
      }
      if (!dumping_location) {
        throw new Error("Dumping location wajib dipilih");
      }
      if (isNaN(beltscale) || beltscale <= 0) {
        throw new Error("Beltscale tidak valid atau harus lebih dari 0");
      }

      const payload = {
        date,
        shift,
        dumping_location,
        beltscale: parseFloat(beltscale),
      };

      logger.info("📤 Submitting Beltscale adjustment", {
        date,
        shift,
        dumping_location,
        beltscale: payload.beltscale,
      });

      const response = await offlineService.post(
        "/v1/custom/ritase/calculate-beltscale",
        payload,
      );

      const result = response.data || response || [];

      logger.info("✅ Beltscale adjustment submitted", {
        fleets: result.length,
        total_tonnage_after: result.reduce(
          (sum, fleet) => sum + (fleet.total_tonnage || 0),
          0,
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
              0,
            ),
            updated_count: result.reduce(
              (sum, fleet) => sum + (fleet.ritase_count || 0),
              0,
            ),
          },
        },
        message: `Beltscale adjustment berhasil untuk ${result.length} fleet`,
      };
    } catch (error) {
      logger.error("❌ Failed to submit Beltscale adjustment", {
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Get Beltscale adjustment history (optional - if you want to show history)
   */
  async getBeltscaleHistory(filters = {}) {
    try {
      const params = {
        filters: {
          measurement_type: { $eq: "Beltscale" },
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
      logger.error("❌ Failed to fetch Beltscale history", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },
};
