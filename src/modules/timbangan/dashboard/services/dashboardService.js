import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { buildCacheKey } from "@/shared/utils/cache";

export const dashboardService = {
  /**
   * GET Dashboard Daily Data
   * @param {Object} params - { start_date, end_date, shift, forceRefresh }
   * @returns {Promise<Object>} Dashboard data with summary and tableData
   */
  async getDashboardDaily(params = {}) {
    try {
      const {
        startDate,
        endDate,
        shift = "All",
        forceRefresh = false,
      } = params;

      if (!startDate || !endDate) {
        throw new Error("Parameter startDate dan endDate harus diisi");
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        throw new Error("Format tanggal harus YYYY-MM-DD");
      }

      const queryParams = new URLSearchParams();
      queryParams.append("startDate", startDate);
      queryParams.append("endDate", endDate);
      queryParams.append("shift", shift);

      if (shift && shift !== "All") {
        queryParams.append("shift", shift);
      }

      const cacheKey = buildCacheKey("dashboard_daily", {
        start: startDate,
        end: endDate,
        shift: shift && shift !== "All" ? shift : undefined,
      });

      logger.info("📊 Fetching dashboard daily data", {
        startDate,
        endDate,
        shift,
        cacheKey,
        forceRefresh,
      });

      const response = await offlineService.get(
        `/v1/overview/dashboard-daily?${queryParams.toString()}`,
        {
          cacheKey,
          ttl: 2 * 60 * 1000,
          forceRefresh,
        },
      );

      const transformedData = this._transformDashboardData(response);

      logger.info("✅ Dashboard daily data fetched", {
        startDate,
        endDate,
        shift,
        hasData: transformedData.success,
        summaryData: transformedData.data?.summary,
        tableDataCount: transformedData.data?.tableData?.length || 0,
      });

      return transformedData;
    } catch (error) {
      logger.error("❌ Failed to fetch dashboard daily data", {
        error: error?.response?.data?.message || error.message,
        params,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal mengambil data dashboard",
      );
    }
  },

  /**
   * Transform Dashboard Data dari Backend
   * Sesuai dengan response structure BE
   * @private
   */
  _transformDashboardData(apiResponse) {
    try {
      if (apiResponse?.success !== undefined) {
        return apiResponse;
      }

      if (apiResponse?.data) {
        return {
          success: true,
          data: apiResponse.data,
          message: apiResponse.message || "Data berhasil dimuat",
        };
      }

      return {
        success: true,
        data: apiResponse,
        message: "Data berhasil dimuat",
      };
    } catch (error) {
      logger.error("❌ Error transforming dashboard data", {
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * GET Dashboard Daily Data dengan Date Range
   * Helper function untuk kemudahan penggunaan
   */
  async getDashboardByDateRange(dateRange = {}) {
    const { startDate, endDate, shift = "All" } = dateRange;

    return this.getDashboardDaily({
      start_date: startDate,
      end_date: endDate,
      shift,
    });
  },

  /**
   * Refresh Dashboard Data
   * Force refresh tanpa cache
   */
  async refreshDashboard(params = {}) {
    logger.info("🔄 Force refreshing dashboard data");

    return this.getDashboardDaily({
      ...params,
      forceRefresh: true,
    });
  },

  /**
   * Clear Dashboard Cache
   */
  async clearDashboardCache() {
    try {
      logger.info("🗑️ Clearing dashboard cache");

      await offlineService.clearCache();

      logger.info("✅ Dashboard cache cleared");
      return { success: true, message: "Cache berhasil dibersihkan" };
    } catch (error) {
      logger.error("❌ Failed to clear dashboard cache", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  },
};
