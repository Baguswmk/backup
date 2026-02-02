import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

const API_BASE = "/api/timbangan/mmct-equipment";

/**
 * Service untuk mengelola List Alat PM/BD MMCT
 * - DT Service
 * - DT BD (Breakdown)
 * - Exca Service
 * - Exca BD (Breakdown)
 */
class MMCTEquipmentService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all equipment lists
   * @returns {Promise<Object>} Object containing all 4 lists
   */
  async getAllEquipmentLists() {
    try {
      logger.info("📋 Fetching all MMCT equipment lists");

      const response = await offlineService.get(`${API_BASE}/all`, {
        cache: false,
      });

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      const equipmentData = {
        dt_service: response.data.dt_service || [],
        dt_bd: response.data.dt_bd || [],
        exca_service: response.data.exca_service || [],
        exca_bd: response.data.exca_bd || [],
      };

      logger.info("✅ Successfully fetched MMCT equipment lists", {
        dtService: equipmentData.dt_service.length,
        dtBd: equipmentData.dt_bd.length,
        excaService: equipmentData.exca_service.length,
        excaBd: equipmentData.exca_bd.length,
      });

      return equipmentData;
    } catch (error) {
      logger.error("❌ Failed to fetch MMCT equipment lists", error);
      
      // Return empty lists on error
      return {
        dt_service: [],
        dt_bd: [],
        exca_service: [],
        exca_bd: [],
      };
    }
  }

  /**
   * Get equipment list by category
   * @param {string} category - Category: dt_service, dt_bd, exca_service, exca_bd
   * @returns {Promise<Array>} List of equipment
   */
  async getEquipmentListByCategory(category) {
    try {
      logger.info("📋 Fetching MMCT equipment list by category", { category });

      const response = await offlineService.get(`${API_BASE}/${category}`, {
        cache: false,
      });

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      logger.info("✅ Successfully fetched equipment list", {
        category,
        count: response.data.length,
      });

      return response.data;
    } catch (error) {
      logger.error("❌ Failed to fetch equipment list", { category }, error);
      return [];
    }
  }

  /**
   * Save all equipment lists (bulk update)
   * @param {Object} equipmentLists - Object containing all 4 lists
   * @returns {Promise<Object>} Response data
   */
  async saveAllEquipmentLists(equipmentLists) {
    try {
      logger.info("💾 Saving all MMCT equipment lists", {
        dtService: equipmentLists.dt_service?.length || 0,
        dtBd: equipmentLists.dt_bd?.length || 0,
        excaService: equipmentLists.exca_service?.length || 0,
        excaBd: equipmentLists.exca_bd?.length || 0,
      });

      // Validate and format data
      const formattedData = this._formatEquipmentData(equipmentLists);

      const response = await offlineService.post(
        `${API_BASE}/save-all`,
        formattedData
      );

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      logger.info("✅ Successfully saved all equipment lists");
      
      // Clear cache after save
      this.cache.clear();

      return response.data;
    } catch (error) {
      logger.error("❌ Failed to save equipment lists", error);
      throw this._extractError(error);
    }
  }

  /**
   * Save equipment list for specific category
   * @param {string} category - Category: dt_service, dt_bd, exca_service, exca_bd
   * @param {Array} equipmentList - List of equipment
   * @returns {Promise<Object>} Response data
   */
  async saveEquipmentListByCategory(category, equipmentList) {
    try {
      logger.info("💾 Saving MMCT equipment list", {
        category,
        count: equipmentList.length,
      });

      const formattedList = equipmentList.map((item) => ({
        equipment_type: item.equipmentType || this._getCategoryType(category),
        equipment_id: parseInt(item.equipmentId),
        equipment_name: item.equipmentName,
        category: category,
      }));

      const response = await offlineService.post(
        `${API_BASE}/${category}`,
        { equipment_list: formattedList }
      );

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      logger.info("✅ Successfully saved equipment list", { category });
      
      // Clear cache after save
      this.cache.clear();

      return response.data;
    } catch (error) {
      logger.error("❌ Failed to save equipment list", { category }, error);
      throw this._extractError(error);
    }
  }

  /**
   * Delete equipment from list
   * @param {string} category - Category
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object>} Response data
   */
  async deleteEquipment(category, equipmentId) {
    try {
      logger.info("🗑️ Deleting equipment from MMCT list", {
        category,
        equipmentId,
      });

      const response = await offlineService.delete(
        `${API_BASE}/${category}/${equipmentId}`
      );

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      logger.info("✅ Successfully deleted equipment", {
        category,
        equipmentId,
      });
      
      // Clear cache after delete
      this.cache.clear();

      return response.data;
    } catch (error) {
      logger.error(
        "❌ Failed to delete equipment",
        { category, equipmentId },
        error
      );
      throw this._extractError(error);
    }
  }

  /**
   * Get statistics for all equipment lists
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    try {
      logger.info("📊 Fetching MMCT equipment statistics");

      const response = await offlineService.get(`${API_BASE}/statistics`, {
        cache: false,
      });

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      logger.info("✅ Successfully fetched statistics", response.data);

      return response.data;
    } catch (error) {
      logger.error("❌ Failed to fetch statistics", error);
      return {
        total: 0,
        dt_service: 0,
        dt_bd: 0,
        exca_service: 0,
        exca_bd: 0,
      };
    }
  }

  /**
   * Format equipment data for API submission
   * @private
   */
  _formatEquipmentData(equipmentLists) {
    const formatted = {};

    for (const [category, items] of Object.entries(equipmentLists)) {
      formatted[category] = items
        .filter((item) => item.equipmentId && item.equipmentName) // Only valid items
        .map((item) => ({
          equipment_type: this._getCategoryType(category),
          equipment_id: parseInt(item.equipmentId),
          equipment_name: item.equipmentName,
          category: category,
        }));
    }

    return formatted;
  }

  /**
   * Get equipment type based on category
   * @private
   */
  _getCategoryType(category) {
    if (category.startsWith("dt_")) {
      return "DUMP_TRUCK";
    } else if (category.startsWith("exca_")) {
      return "EXCAVATOR";
    }
    return "UNKNOWN";
  }

  /**
   * Extract error message from response
   * @private
   */
  _extractError(error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Terjadi kesalahan";

    return new Error(message);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info("🗑️ MMCT equipment cache cleared");
  }
}

export const mmctEquipmentService = new MMCTEquipmentService();