import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

const CACHE_TTL = {
  UNIT_LOGS: 5 * 60 * 1000, // 5 minutes
  MMCT_LISTS: 5 * 60 * 1000,
};

const pendingRequests = new Map();

const extractErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Terjadi kesalahan"
  );
};

export const unitLogService = {
  /**
   * Create unit log (Breakdown/Service)
   */
  async createUnitLog(data) {
    try {
      logger.info("📝 Creating unit log", {
        unit: data.unit,
        status: data.status,
      });

      const payload = {
        entry_date: data.entry_date,
        status: data.status,
        unit: parseInt(data.unit),
        description: data.description,
      };

      const response = await offlineService.post(
        "/v1/custom/unit-log",
        payload,
      );

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      logger.info("✅ Unit log created successfully", {
        id: response.data.data?.id,
        unit: data.unit,
      });

      // Clear cache after create
      await this.clearCache();

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to create unit log", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Verify/Complete unit log (set completion date)
   */
  async verifyUnitLog(data) {
    try {
      logger.info("✔️ Verifying unit log", {
        id: data.id,
        completion_date: data.completion_date,
      });

      // Validate required fields
      if (!data.id) {
        throw new Error("ID tidak boleh kosong");
      }

      if (!data.completion_date) {
        throw new Error("Tanggal selesai tidak boleh kosong");
      }

      const payload = {
        id: parseInt(data.id),
        completion_date: data.completion_date,
      };

      const response = await offlineService.post(
        "/v1/custom/unit-log/verification",
        payload,
      );

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      logger.info("✅ Unit log verified successfully", {
        id: data.id,
      });

      // Clear cache after verification
      await this.clearCache();

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to verify unit log", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Get active unit logs (untuk MMCT Equipment Lists)
   */
  async fetchActiveUnitLogs(options = {}) {
    try {
      const { forceRefresh = false } = options;
      const cacheKey = "active_unit_logs";
      const requestKey = cacheKey;

      // Check pending request
      if (pendingRequests.has(requestKey) && !forceRefresh) {
        logger.info("🔄 Reusing pending request", { requestKey });
        return pendingRequests.get(requestKey);
      }

      const ttl = CACHE_TTL.UNIT_LOGS;

      logger.info("🔍 Fetching active unit logs", {
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh,
      });

      if (forceRefresh) {
        await offlineService.clearCache(cacheKey);
      }

      const requestPromise = (async () => {
        try {
          const response = await offlineService.get("/unit-logs", {
            params: {
              filters: {
                completion_date: { $null: true },
              },
              populate: ["unit", "unit.company"],
              sort: ["id:desc"],
              pagination: { pageSize: 500 },
            },
            cacheKey,
            ttl,
            forceRefresh,
          });

          // ✅ FIX: Handle different response structures
          logger.info("🔍 Unit logs response structure", {
            hasData: !!response.data,
            isArray: Array.isArray(response.data),
            dataType: typeof response.data,
            dataKeys: response.data ? Object.keys(response.data) : null,
          });

          let unitLogs = response.data;

          // If response.data is an object with nested data array (Strapi v4)
          if (!Array.isArray(response.data) && response.data?.data) {
            logger.info("📦 Detected nested data structure, extracting...");
            unitLogs = response.data.data;
          }

          // Ensure it's an array
          if (!Array.isArray(unitLogs)) {
            logger.warn("⚠️ Response is not an array, returning empty", {
              type: typeof unitLogs,
            });
            unitLogs = [];
          }

          logger.info(`✅ Active unit logs fetched: ${unitLogs.length}`, {
            cached: !forceRefresh,
          });

          return {
            success: true,
            data: unitLogs,
          };
        } finally {
          pendingRequests.delete(requestKey);
        }
      })();

      pendingRequests.set(requestKey, requestPromise);
      return requestPromise;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to fetch active unit logs", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        data: [],
        error: errorMessage,
      };
    }
  },

  /**
   * Get MMCT Equipment Lists (grouped by category)
   */
  async fetchMMCTEquipmentLists(options = {}) {
    try {
      const { forceRefresh = false } = options;
      const cacheKey = "mmct_equipment_lists";
      const requestKey = cacheKey;

      // Check pending request
      if (pendingRequests.has(requestKey) && !forceRefresh) {
        logger.info("🔄 Reusing pending request", { requestKey });
        return pendingRequests.get(requestKey);
      }

      const ttl = CACHE_TTL.MMCT_LISTS;

      logger.info("📋 Fetching MMCT equipment lists", {
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh,
      });

      if (forceRefresh) {
        await offlineService.clearCache(cacheKey);
      }

      const requestPromise = (async () => {
        try {
          // Fetch active unit logs
          const logsResult = await this.fetchActiveUnitLogs({ forceRefresh });

          if (!logsResult.success) {
            throw new Error(logsResult.error);
          }

          const unitLogs = logsResult.data;

          // Group by category
          const grouped = this._groupMMCTByCategory(unitLogs);

          logger.info("✅ MMCT equipment lists fetched", {
            dtService: grouped.dt_service.length,
            dtBd: grouped.dt_bd.length,
            excaService: grouped.exca_service.length,
            excaBd: grouped.exca_bd.length,
          });

          return {
            success: true,
            data: grouped,
          };
        } finally {
          pendingRequests.delete(requestKey);
        }
      })();

      pendingRequests.set(requestKey, requestPromise);
      return requestPromise;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to fetch MMCT equipment lists", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        data: {
          dt_service: [],
          dt_bd: [],
          exca_service: [],
          exca_bd: [],
        },
        error: errorMessage,
      };
    }
  },

  /**
   * Add equipment to MMCT list
   */
  async addToMMCTList(category, unitId, unitName, description = "") {
    try {
      logger.info("➕ Adding unit to MMCT list", { category, unitId });

      // Validate category
      const validCategories = [
        "dt_service",
        "dt_bd",
        "exca_service",
        "exca_bd",
      ];
      if (!validCategories.includes(category)) {
        throw new Error("Kategori tidak valid");
      }

      // Validate description
      if (!description || description.trim() === "") {
        throw new Error("Keterangan tidak boleh kosong");
      }

      // Determine status from category
      const status = category.includes("service") ? "SERVICE" : "BREAKDOWN";

      // Create unit log entry
      const data = {
        entry_date: new Date().toISOString(),
        status: status,
        unit: unitId,
        description: description.trim(),
      };

      const result = await this.createUnitLog(data);

      if (!result.success) {
        throw new Error(result.error);
      }

      logger.info("✅ Successfully added to MMCT list", { unitId, category });

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to add to MMCT list", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Remove equipment from MMCT list
   */
  async removeFromMMCTList(unitLogId) {
    try {
      logger.info("➖ Removing unit from MMCT list", { unitLogId });

      // Verify (complete) the unit log to mark as done
      const data = {
        id: unitLogId,
        completion_date: new Date().toISOString(),
      };

      const result = await this.verifyUnitLog(data);

      if (!result.success) {
        throw new Error(result.error);
      }

      logger.info("✅ Successfully removed from MMCT list", { unitLogId });

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to remove from MMCT list", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Bulk remove equipment from MMCT list
   */
  async bulkRemoveFromMMCTList(unitLogIds) {
    try {
      if (!Array.isArray(unitLogIds) || unitLogIds.length === 0) {
        throw new Error(
          "Daftar ID unit log harus berupa array dan tidak boleh kosong",
        );
      }

      logger.info("🗑️ Bulk removing units from MMCT list", {
        count: unitLogIds.length,
      });

      const completionDate = new Date().toISOString();
      const payload = unitLogIds.map((id) => ({
        id: parseInt(id),
        completion_date: completionDate,
      }));

      const response = await offlineService.post(
        "/v1/custom/unit-log/verification/bulk",
        payload,
      );

      if (!response?.data) {
        throw new Error("Invalid response format");
      }

      logger.info("✅ Successfully bulk removed from MMCT list", {
        count: unitLogIds.length,
      });

      // Clear cache after bulk verification
      await this.clearCache();

      return {
        success: true,
        data: response.data.data,
        message: `Berhasil menghapus ${unitLogIds.length} alat`,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to bulk remove from MMCT list", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Bulk add to MMCT list
   */
  async bulkAddToMMCTList(category, equipmentList) {
    try {
      if (!Array.isArray(equipmentList) || equipmentList.length === 0) {
        throw new Error(
          "Equipment list harus berupa array dan tidak boleh kosong",
        );
      }

      logger.info("📦 Bulk adding to MMCT list", {
        category,
        count: equipmentList.length,
      });

      // Filter and prepare payload
      const validItems = [];
      const failedValidations = [];

      for (const equipment of equipmentList) {
        let description = equipment.description
          ? equipment.description.trim()
          : "-";

        if (description === "") {
          description = "-";
        }

        const validCategories = [
          "dt_service",
          "dt_bd",
          "exca_service",
          "exca_bd",
        ];
        if (!validCategories.includes(category)) {
          failedValidations.push({
            id: equipment.equipmentId,
            name: equipment.equipmentName,
            error: "Kategori tidak valid",
          });
          continue;
        }

        const status = category.includes("service") ? "SERVICE" : "BREAKDOWN";

        validItems.push({
          entry_date: new Date().toISOString(),
          status: status,
          unit: parseInt(equipment.equipmentId),
          description: description,
        });
      }

      if (validItems.length === 0) {
        return {
          success: false,
          partialSuccess: false,
          error: "Tidak ada data yang valid untuk disimpan",
          results: {
            success: [],
            failed: failedValidations,
            total: equipmentList.length,
          },
        };
      }

      // Hit Bulk Endpoint
      logger.info("📡 Sending bulk request to API", {
        itemCount: validItems.length,
      });

      const response = await offlineService.post(
        "/v1/custom/unit-log/bulk",
        validItems,
      );

      if (!response?.data) {
        throw new Error("Invalid response format from bulk API");
      }

      // Clear cache after create
      await this.clearCache();

      const allSuccess = failedValidations.length === 0;

      return {
        success: allSuccess,
        partialSuccess: validItems.length > 0 && failedValidations.length > 0,
        results: {
          success: validItems,
          failed: failedValidations,
          total: equipmentList.length,
        },
        message: allSuccess
          ? `Berhasil menambahkan ${validItems.length} alat`
          : `${validItems.length} berhasil, ${failedValidations.length} gagal (validasi)`,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Bulk add failed", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
        results: { success: [], failed: [], total: equipmentList?.length || 0 },
      };
    }
  },

  /**
   * Get MMCT statistics
   */
  async fetchMMCTStatistics(options = {}) {
    try {
      const { forceRefresh = false } = options;

      logger.info("📊 Fetching MMCT statistics");

      const result = await this.fetchMMCTEquipmentLists({ forceRefresh });

      if (!result.success) {
        throw new Error(result.error);
      }

      const lists = result.data;

      const stats = {
        total:
          lists.dt_service.length +
          lists.dt_bd.length +
          lists.exca_service.length +
          lists.exca_bd.length,
        dt_service: lists.dt_service.length,
        dt_bd: lists.dt_bd.length,
        exca_service: lists.exca_service.length,
        exca_bd: lists.exca_bd.length,
      };

      logger.info("✅ MMCT statistics fetched", stats);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to fetch MMCT statistics", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        data: {
          total: 0,
          dt_service: 0,
          dt_bd: 0,
          exca_service: 0,
          exca_bd: 0,
        },
        error: errorMessage,
      };
    }
  },

  /**
   * Group unit logs by MMCT category
   * @private
   */
  _groupMMCTByCategory(unitLogs) {
    const result = {
      dt_service: [],
      dt_bd: [],
      exca_service: [],
      exca_bd: [],
    };

    // ✅ FIX: Validate unitLogs is an array before forEach
    if (!Array.isArray(unitLogs)) {
      logger.error("❌ unitLogs is not an array in _groupMMCTByCategory", {
        type: typeof unitLogs,
        value: unitLogs,
      });
      return result;
    }

    unitLogs.forEach((logItem) => {
      try {
        // Handle both Strapi wrapped and direct data
        const log = logItem.attributes || logItem;
        const logId = logItem.id || log.id;

        // Get unit data
        const unitData = log.unit?.data?.attributes || log.unit;
        if (!unitData) {
          logger.warn("⚠️ Unit data missing for log", { logId });
          return;
        }

        const unitId = log.unit?.data?.id || unitData.id;

        // Determine if dump truck or excavator
        const isDT = this._isDumpTruck(unitData);
        const isService = log.status === "SERVICE";

        // Determine category
        let category = "";
        if (isDT && isService) category = "dt_service";
        else if (isDT && !isService) category = "dt_bd";
        else if (!isDT && isService) category = "exca_service";
        else if (!isDT && !isService) category = "exca_bd";

        if (category && result[category]) {
          // Get company data
          const companyData =
            unitData.company?.data?.attributes || unitData.company;

          result[category].push({
            id: logId,
            equipmentType: isDT ? "DUMP_TRUCK" : "EXCAVATOR",
            equipmentId: unitId,
            equipmentName: unitData.hull_no || "Unknown",
            company: companyData?.name || "Unknown",
            status: log.status,
            description: log.description,
            entryDate: log.entry_date,
          });
        }
      } catch (error) {
        logger.error("❌ Error processing unit log item", {
          error: error.message,
          logItem,
        });
      }
    });

    return result;
  },

  /**
   * Check if unit is dump truck
   * @private
   */
  _isDumpTruck(unit) {
    // Check multiple possible indicators
    if (unit.type === "DUMP_TRUCK") return true;
    if (unit.category === "dump_truck") return true;
    if (unit.hull_no?.toUpperCase().startsWith("DT")) return true;
    if (unit.hull_no?.toUpperCase().includes("DUMP")) return true;

    // Default to false for excavators
    return false;
  },

  /**
   * Clear cache
   */
  clearCache(pattern = null) {
    logger.info("🗑️ Unit log cache cleared", {
      pattern: pattern || "all",
    });

    return Promise.all([
      offlineService.clearCache("active_unit_logs"),
      offlineService.clearCache("mmct_equipment_lists"),
      offlineService.clearCacheByPrefix("unit_logs"),
    ]);
  },
};
