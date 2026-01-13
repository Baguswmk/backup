// src/services/dashboardService.js

import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { buildCacheKey } from "@/shared/utils/cache";

// ✅ Using buildCacheKey from @/shared/utils/cache
// Removed duplicate buildCacheKey function (~5 lines)

/**
 * Dashboard Service - Overview Daily Dashboard
 * Hanya 1 endpoint: GET /v1/overview/dashboard-daily
 */
export const dashboardService = {
  /**
   * GET Dashboard Daily Data
   * Endpoint: GET /v1/overview/dashboard-daily
   * @param {Object} params - { start_date, end_date, shift }
   * @returns {Promise<Object>} Dashboard data with summary and tableData
   */
  async getDashboardDaily(params = {}) {
    try {
      const {
        start_date,
        end_date,
        shift = "All",
        forceRefresh = false,
      } = params;

      // Validasi required params
      if (!start_date || !end_date) {
        throw new Error("Parameter start_date dan end_date harus diisi");
      }

      // Validasi format tanggal (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
        throw new Error("Format tanggal harus YYYY-MM-DD");
      }

      // Build query params
      const queryParams = new URLSearchParams();
      queryParams.append("start_date", start_date);
      queryParams.append("end_date", end_date);

      if (shift && shift !== "All") {
        queryParams.append("shift", shift);
      }

      // Build cache key
      const cacheKey = buildCacheKey("dashboard_daily", {
        start: start_date,
        end: end_date,
        shift: shift && shift !== "All" ? shift : undefined,
      });

      logger.info("📊 Fetching dashboard daily data", {
        start_date,
        end_date,
        shift,
        cacheKey,
        forceRefresh,
      });

      // Fetch data dengan offline service (support caching & offline queue)
      const response = await offlineService.get(
        `/v1/overview/dashboard-daily?${queryParams.toString()}`,
        {
          cacheKey,
          ttl: 2 * 60 * 1000, // 2 minutes cache
          forceRefresh,
        }
      );

      // Transform response jika perlu
      const transformedData = this._transformDashboardData(response);

      logger.info("✅ Dashboard daily data fetched", {
        start_date,
        end_date,
        shift,
        summary: transformedData.data?.summary,
        tableDataCount: transformedData.data?.tableData?.length || 0,
      });

      return transformedData;
    } catch (error) {
      logger.error("❌ Failed to fetch dashboard daily data", {
        error: error.message,
        params,
      });

      // Return structure yang konsisten
      return {
        success: false,
        data: null,
        error: error.message,
        message: error.message || "Gagal mengambil data dashboard",
      };
    }
  },

  /**
   * GET Dashboard Daily Data dengan Date Range
   * Helper function untuk kemudahan penggunaan
   * @param {Object} dateRange - { startDate, endDate, shift }
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
   * @param {Object} params - { start_date, end_date, shift }
   */
  async refreshDashboard(params = {}) {
    logger.info("🔄 Force refreshing dashboard data");

    return this.getDashboardDaily({
      ...params,
      forceRefresh: true,
    });
  },

  /**
   * Transform Dashboard Data dari Backend
   * Normalisasi structure response
   * @private
   */
  _transformDashboardData(apiResponse) {
    try {
      // Jika response sudah dalam format yang benar
      if (apiResponse.success !== undefined) {
        return apiResponse;
      }

      // Jika response data langsung dari Strapi
      if (apiResponse.data) {
        return {
          success: true,
          data: apiResponse.data,
          message: apiResponse.message || "Data berhasil dimuat",
        };
      }

      // Default return
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
   * Clear Dashboard Cache
   * Hapus semua cache yang terkait dengan dashboard
   */
  async clearDashboardCache() {
    try {
      logger.info("🗑️ Clearing dashboard cache");

      // Clear all cache
      await offlineService.clearCache();

      logger.info("✅ Dashboard cache cleared");
      return { success: true, message: "Cache berhasil dibersihkan" };
    } catch (error) {
      logger.error("❌ Failed to clear dashboard cache", {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  },
};
