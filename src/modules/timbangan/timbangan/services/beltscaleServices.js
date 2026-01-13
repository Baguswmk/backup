import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

export const beltScaleServices = {
  /**
   * Fetch ritase data untuk preview sebelum adjustment
   * @param {Object} filters - {date, shift, dumping_point}
   */
  async fetchRitasesForAdjustment(filters) {
    try {
      const params = {
        populate: [
          "unit_dump_truck",
          "operator",
          "setting_fleet",
          "setting_fleet.unit_exca",
          "setting_fleet.dumping_location",
        ],
        filters: {
          date: { $eq: filters.date },
          shift: { $eq: filters.shift },
        },
        sort: ["createdAt:asc"],
        pagination: { pageSize: 1000 },
      };

      // Filter by dumping point if provided
      if (filters.dumping_point) {
        params.filters.dumping_location = { $eq: filters.dumping_point };
      }

      const response = await offlineService.get("/ritases", { params });

      const ritases = response.data.map((item) => ({
        id: item.id.toString(),
        hull_no: item.attributes.unit_dump_truck?.data?.attributes?.hull_no || "-",
        operator: item.attributes.operator?.data?.attributes?.name || "-",
        excavator: item.attributes.setting_fleet?.data?.attributes?.unit_exca?.data?.attributes?.hull_no || "-",
        dumping_location: item.attributes.dumping_location || "-",
        net_weight_original: parseFloat(item.attributes.net_weight || 0),
        gross_weight: parseFloat(item.attributes.gross_weight || 0),
        tare_weight: parseFloat(item.attributes.tare_weight || 0),
        shift: item.attributes.shift,
        date: item.attributes.date,
        createdAt: item.attributes.createdAt,
      }));

      logger.info("✅ Fetched ritases for adjustment", {
        count: ritases.length,
        filters,
      });

      return { success: true, data: ritases };
    } catch (error) {
      logger.error("❌ Failed to fetch ritases for adjustment", {
        error: error.message,
        filters,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  /**
   * Calculate adjustment preview
   * @param {Array} ritases - Original ritases
   * @param {Number} targetNetWeight - Total net weight BeltScale
   */
  calculateAdjustment(ritases, targetNetWeight) {
    if (!ritases || ritases.length === 0) {
      return { success: false, error: "No ritases to adjust" };
    }

    const totalOriginal = ritases.reduce(
      (sum, r) => sum + r.net_weight_original,
      0
    );

    if (totalOriginal === 0) {
      return { success: false, error: "Total original weight is 0" };
    }

    // Calculate adjustment factor
    const adjustmentFactor = targetNetWeight / totalOriginal;

    // Apply adjustment to each ritase
    const adjusted = ritases.map((ritase) => {
      const adjustedNetWeight = ritase.net_weight_original * adjustmentFactor;
      const adjustedGrossWeight = adjustedNetWeight + ritase.tare_weight;

      return {
        ...ritase,
        net_weight_adjusted: parseFloat(adjustedNetWeight.toFixed(2)),
        gross_weight_adjusted: parseFloat(adjustedGrossWeight.toFixed(2)),
        adjustment_factor: parseFloat(adjustmentFactor.toFixed(4)),
        difference: parseFloat(
          (adjustedNetWeight - ritase.net_weight_original).toFixed(2)
        ),
      };
    });

    const totalAdjusted = adjusted.reduce(
      (sum, r) => sum + r.net_weight_adjusted,
      0
    );

    return {
      success: true,
      data: {
        ritases: adjusted,
        summary: {
          total_original: parseFloat(totalOriginal.toFixed(2)),
          total_adjusted: parseFloat(totalAdjusted.toFixed(2)),
          target: parseFloat(targetNetWeight),
          adjustment_factor: parseFloat(adjustmentFactor.toFixed(4)),
          difference: parseFloat((totalAdjusted - totalOriginal).toFixed(2)),
          count: ritases.length,
        },
      },
    };
  },

  /**
   * Submit BeltScale adjustment
   * @param {Object} adjustmentData - {date, shift, dumping_point, net_weight_bypass, ritases}
   */
  async submitBypassAdjustment(adjustmentData) {
    try {
      const payload = {
        date: adjustmentData.date,
        shift: adjustmentData.shift,
        dumping_point: adjustmentData.dumping_point,
        net_weight_bypass: parseFloat(adjustmentData.net_weight_bypass),
        ritases: adjustmentData.ritases.map((r) => ({
          id: r.id,
          net_weight_adjusted: r.net_weight_adjusted,
          gross_weight_adjusted: r.gross_weight_adjusted,
        })),
        created_by_user: adjustmentData.created_by_user || null,
      };

      logger.info("📤 Submitting BeltScale adjustment", payload);

      // Hit custom endpoint untuk batch update
      const response = await offlineService.post(
        "/v1/custom/BeltScale-adjustment",
        payload
      );

      logger.info("✅ BeltScale adjustment submitted", {
        affected: response.data?.affected_count || 0,
      });

      return {
        success: true,
        data: response.data,
        message: `${response.data?.affected_count || 0} ritase berhasil di-adjust`,
      };
    } catch (error) {
      logger.error("❌ Failed to submit BeltScale adjustment", {
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Get BeltScale adjustment history
   */
  async getBypassHistory(filters = {}) {
    try {
      const params = {
        filters: {},
        sort: ["createdAt:desc"],
        pagination: { pageSize: 50 },
      };

      if (filters.startDate) {
        params.filters.date = { $gte: filters.startDate };
      }
      if (filters.endDate) {
        if (!params.filters.date) params.filters.date = {};
        params.filters.date.$lte = filters.endDate;
      }

      const response = await offlineService.get("/BeltScale-adjustments", {
        params,
      });

      return { success: true, data: response.data };
    } catch (error) {
      logger.error("❌ Failed to fetch BeltScale history", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },
};