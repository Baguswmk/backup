import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

const CACHE_TTL = {
  FLEET_DATA: 5 * 60 * 1000,
  MASTERS: 30 * 60 * 1000,
};

const extractErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Terjadi kesalahan"
  );
};

const buildFilters = (options = {}) => {
  const { user, measurementType } = options;
  const filters = {};
  const role = user?.role?.toLowerCase();

  if (role === "super_admin") {
    logger.info("⭐️ Skipping measurement_type filter", {
      role,
      reason: "super_admin can see all types",
    });
  } else if (measurementType) {
    filters.measurement_type = { $eq: measurementType };
    logger.info("📊 Measurement type filter applied", {
      measurementType,
      role,
    });
  }

  switch (role) {
    case "operator_jt":
      if (!filters.measurement_type) {
        filters.measurement_type = { $eq: "Timbangan" };
        logger.info("📊 Auto measurement_type: Timbangan (operator_jt)");
      }
      break;

    case "ccr": {
      const subsatker = user?.work_unit?.subsatker;
      if (!subsatker) {
        logger.warn("⚠️ CCR: subsatker tidak ditemukan", { userId: user.id });
        return {
          needsFeedback: true,
          message:
            "Data tidak dapat difilter karena subsatker tidak ditemukan. Silakan hubungi admin.",
        };
      }
      filters.pic_work_unit = {
        subsatker: { $eq: subsatker },
      };
      logger.info("🏢 Subsatker filter applied (CCR)", { subsatker });
      break;
    }

    case "pengawas":
    case "evaluator":
    case "pic": {
      const userSubsatker = user?.work_unit?.subsatker;
      if (userSubsatker) {
        filters.pic_work_unit = {
          subsatker: { $eq: userSubsatker },
        };
        logger.info("🏢 Subsatker filter applied", {
          role,
          subsatker: userSubsatker,
        });
      }
      break;
    }

    case "admin":
      if (user?.company?.id) {
        filters.unit_exca = {
          company: {
            id: { $eq: parseInt(user.company.id) },
          },
        };
        logger.info("🏢 Company filter applied (admin)", {
          companyId: user.company.id,
          filterPath: "unit_exca.company.id",
        });
      } else {
        logger.warn("⚠️ Admin: company.id tidak ditemukan", {
          userId: user.id,
          company: user.company,
        });
      }
      break;

    case "mitra":
    case "checker":
      if (user?.company?.id) {
        filters.unit_exca = {
          company: {
            id: { $eq: parseInt(user.company.id) },
          },
        };
        logger.info("🏢 Company filter applied", {
          role,
          companyId: user.company.id,
          filterPath: "unit_exca.company.id",
        });
      } else {
        logger.warn(`⚠️ ${role}: company.id tidak ditemukan`, {
          userId: user.id,
          company: user.company,
        });
      }
      break;

    case "super_admin":
      logger.info("👑 Super Admin - no role filter");
      break;

    default:
      logger.warn("⚠️ Unknown role, no role-specific filter", { role });
      break;
  }

  logger.info("📋 Final buildFilters result", filters);
  return filters;
};

export const fleetService = {
  async fetchFleetConfigs(options = {}) {
    try {
      const {
        user,
        viewMode = "normal",
        forceRefresh = false,
        measurementType = null,
      } = options;

      const filterResult = buildFilters({
        user,
        viewMode,
        measurementType,
      });

      if (filterResult.needsFeedback) {
        return {
          success: false,
          data: [],
          feedback: filterResult.message,
        };
      }

      const filters = filterResult;

      const cacheKey = `fleets_${user?.id || "nouser"}_${
        measurementType || "all"
      }`;

      const ttl = CACHE_TTL.FLEET_DATA;

      logger.info("🔍 Fetching fleet configs", {
        viewMode,
        measurementType,
        filters: JSON.stringify(filters),
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh,
      });

      if (forceRefresh) {
        await offlineService.clearCache(cacheKey);
      }

      const response = await offlineService.get("/setting-fleets", {
        params: {
          populate: [
            "unit_exca",
            "unit_exca.company",
            "unit_exca.work_unit",
            "loading_location",
            "dumping_location",
            "coal_type",
            "pic_work_unit",
            "setting_dump_truck",
            "setting_dump_truck.unit_dump_trucks",
            "setting_dump_truck.unit_dump_trucks.company",
            "setting_dump_truck.unit_dump_trucks.work_unit",
            "checker",
            "inspector",
            "created_by_user",
            "weigh_bridge",
            "setting_dump_truck.pair_dt_op",
            "setting_dump_truck.pair_dt_op.dts",
            "setting_dump_truck.pair_dt_op.dts.company",
            "setting_dump_truck.pair_dt_op.dts.work_unit",
            "setting_dump_truck.pair_dt_op.ops",
          ],
          sort: ["id:desc"],
          filters,
          pagination: { pageSize: 500 },
        },
        cacheKey,
        ttl,
        forceRefresh,
      });

      const configs = response.data.map((item) =>
        this._transformFleetConfig(item),
      );

      logger.info(`✅ Fleet configs fetched: ${configs.length}`, {
        viewMode,
        measurementType,
        cached: !forceRefresh,
      });

      return { success: true, data: configs };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to fetch fleet configs", {
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

  async createFleetConfig(configData) {
    try {
      const now = new Date().toISOString();
      const payload = {
        unit_exca: configData.excavatorId
          ? parseInt(configData.excavatorId)
          : null,
        loading_location: configData.loadingLocationId
          ? parseInt(configData.loadingLocationId)
          : null,
        dumping_location: configData.dumpingLocationId
          ? parseInt(configData.dumpingLocationId)
          : null,
        coal_type: configData.coalTypeId
          ? parseInt(configData.coalTypeId)
          : null,
        distance: configData.distance || 0,
        pic_work_unit: configData.workUnitId
          ? parseInt(configData.workUnitId)
          : null,
        created_at: now,
        measurement_type: configData.measurement_type,
      };

      if (configData.inspectorId) {
        payload.inspector = parseInt(configData.inspectorId);
      } else {
        throw new Error("Inspector is required");
      }

      if (configData.checkerId) {
        payload.checker = parseInt(configData.checkerId);
      } else {
        throw new Error("Checker is required");
      }

      if (configData.createdByUserId) {
        payload.created_by_user = parseInt(configData.createdByUserId);
      }

      if (
        configData.measurement_type === "Timbangan" &&
        configData.weightBridgeId
      ) {
        payload.weigh_bridge = parseInt(configData.weightBridgeId);
      }

      const response = await offlineService.post(
        "/v1/custom/setting-fleet",
        payload,
      );

      await offlineService.clearCache("fleets_");

      logger.info("✅ Fleet config created", {
        id: response.data?.data?.id || response.data?.id,
        measurement_type: configData.measurement_type,
        has_weigh_bridge: !!payload.weigh_bridge,
      });

      return {
        success: true,
        data: this._transformFleetConfig(response.data),
        setting_fleet_id: response.data?.data?.id || response.data?.id,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to create fleet config", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  async reactivateFleet(configId, newStatus = "INACTIVE") {
    try {
      if (!["ACTIVE", "INACTIVE"].includes(newStatus)) {
        throw new Error("Status harus ACTIVE atau INACTIVE");
      }

      const getCurrentResponse = await offlineService.get(
        `/setting-fleets/${configId}`,
        { params: { populate: ["unit_exca"] } },
      );

      const currentStatus = getCurrentResponse.data?.attributes?.status;

      if (currentStatus !== "CLOSED") {
        throw new Error(
          `Fleet dengan status ${currentStatus} tidak bisa direaktivasi`,
        );
      }

      const result = await this.updateFleetConfig(configId, {
        status: "ACTIVE",
      });

      if (result.success) {
        logger.info("✅ Fleet reactivated successfully", {
          configId,
          oldStatus: currentStatus,
          newStatus,
        });

        return {
          success: true,
          data: result.data,
          message: `Fleet berhasil direaktivasi dengan status ${newStatus}`,
        };
      }

      throw new Error(result.error || "Gagal mereaktivasi fleet");
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to reactivate fleet", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  },

  async updateFleetConfig(configId, updates) {
    try {
      const payload = { data: {} };

      if (updates.excavatorId !== undefined) {
        payload.data.unit_exca = updates.excavatorId
          ? parseInt(updates.excavatorId)
          : null;
      }
      if (updates.loadingLocationId !== undefined) {
        payload.data.loading_location = updates.loadingLocationId
          ? parseInt(updates.loadingLocationId)
          : null;
      }
      if (updates.dumpingLocationId !== undefined) {
        payload.data.dumping_location = updates.dumpingLocationId
          ? parseInt(updates.dumpingLocationId)
          : null;
      }
      if (updates.coalTypeId !== undefined) {
        payload.data.coal_type = updates.coalTypeId
          ? parseInt(updates.coalTypeId)
          : null;
      }
      if (updates.distance !== undefined) {
        payload.data.distance = updates.distance;
      }
      if (updates.date !== undefined) {
        payload.data.date = updates.date;
      }

      if (updates.workUnitId !== undefined) {
        payload.data.pic_work_unit = updates.workUnitId
          ? parseInt(updates.workUnitId)
          : null;
      }
      if (updates.inspectorId !== undefined) {
        payload.data.inspector = updates.inspectorId
          ? parseInt(updates.inspectorId)
          : null;
      }
      if (updates.checkerId !== undefined) {
        payload.data.checker = updates.checkerId
          ? parseInt(updates.checkerId)
          : null;
      }

      const endpoint = `/setting-fleets/${configId}`;

      const response = await offlineService.put(endpoint, payload);

      await offlineService.clearCacheByPrefix("fleets");
      await offlineService.clearCacheByPrefix("ritases");

      logger.info("✅ Fleet config updated", {
        id: configId,
        endpoint,
      });

      return {
        success: true,
        data: this._transformFleetConfig(response.data),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to update fleet config", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  async deleteFleetConfig(configId) {
    try {
      await offlineService.delete(`/setting-fleets/${configId}`);

      await Promise.all([
        offlineService.clearCache("fleets_"),
        offlineService.clearCache(`fleets_${configId}`),
        offlineService.clearCache("ritases_"),
        offlineService.clearCacheByPrefix?.("fleets"),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 200));

      logger.info("🗑️ Fleet config deleted + cache cleared", { id: configId });

      return {
        success: true,
        message: "Konfigurasi berhasil dihapus",
        deletedId: configId,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to delete fleet config", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  async bulkUpdateStatus(fleetIds, newStatus) {
    try {
      if (!Array.isArray(fleetIds) || fleetIds.length === 0) {
        throw new Error("Fleet IDs harus berupa array dan tidak boleh kosong");
      }

      if (!["ACTIVE", "INACTIVE", "CLOSED"].includes(newStatus)) {
        throw new Error("Status tidak valid");
      }

      logger.info("🔄 Bulk updating fleet status", {
        count: fleetIds.length,
        newStatus,
      });

      const results = {
        success: [],
        failed: [],
        total: fleetIds.length,
      };

      for (const fleetId of fleetIds) {
        try {
          const response = await offlineService.put(
            `/setting-fleets/${fleetId}`,
            {
              data: { status: newStatus },
            },
          );

          results.success.push({
            id: fleetId,
            data: this._transformFleetConfig(response.data),
          });

          logger.info(`✅ Fleet ${fleetId} status updated to ${newStatus}`);
        } catch (error) {
          const errorMessage = extractErrorMessage(error);

          results.failed.push({
            id: fleetId,
            error: errorMessage,
          });

          logger.error(`❌ Failed to update fleet ${fleetId}`, {
            error: errorMessage,
          });
        }
      }

      await Promise.all([
        offlineService.clearCacheByPrefix("fleets"),
        offlineService.clearCacheByPrefix("ritases"),
      ]);

      const allSuccess = results.failed.length === 0;

      logger.info("📊 Bulk status update summary", {
        total: results.total,
        success: results.success.length,
        failed: results.failed.length,
        newStatus,
      });

      return {
        success: allSuccess,
        partialSuccess: results.success.length > 0 && results.failed.length > 0,
        results,
        message: allSuccess
          ? `Berhasil mengubah status ${results.success.length} fleet`
          : `${results.success.length} berhasil, ${results.failed.length} gagal`,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Bulk status update failed", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
        results: { success: [], failed: [], total: 0 },
      };
    }
  },

  async bulkDeleteFleets(fleetIds) {
    try {
      if (!Array.isArray(fleetIds) || fleetIds.length === 0) {
        throw new Error("Fleet IDs harus berupa array dan tidak boleh kosong");
      }

      logger.info("🗑️ Bulk deleting fleets", {
        count: fleetIds.length,
      });

      const results = {
        success: [],
        failed: [],
        total: fleetIds.length,
      };

      const validationErrors = [];
      for (const fleetId of fleetIds) {
        try {
          const response = await offlineService.get(
            `/setting-fleets/${fleetId}`,
          );
          const fleet = response.data;
          const status = fleet?.attributes?.status;

          if (status === "ACTIVE") {
            validationErrors.push({
              id: fleetId,
              error: "Tidak dapat menghapus fleet dengan status ACTIVE",
            });
          }
        } catch (error) {
          logger.warn(`⚠️ Could not validate fleet ${fleetId}`, {
            error: error.message,
          });
        }
      }

      if (validationErrors.length > 0) {
        logger.warn("⚠️ Bulk delete validation failed", {
          errors: validationErrors.length,
        });

        return {
          success: false,
          error: `${validationErrors.length} fleet masih berstatus ACTIVE`,
          results: {
            success: [],
            failed: validationErrors,
            total: fleetIds.length,
          },
        };
      }

      for (const fleetId of fleetIds) {
        try {
          await offlineService.delete(`/setting-fleets/${fleetId}`);

          results.success.push({ id: fleetId });

          logger.info(`✅ Fleet ${fleetId} deleted`);
        } catch (error) {
          const errorMessage = extractErrorMessage(error);

          results.failed.push({
            id: fleetId,
            error: errorMessage,
          });

          logger.error(`❌ Failed to delete fleet ${fleetId}`, {
            error: errorMessage,
          });
        }
      }

      await Promise.all([
        offlineService.clearCache("fleets_"),
        offlineService.clearCacheByPrefix("fleets"),
        offlineService.clearCacheByPrefix("ritases"),
      ]);

      const allSuccess = results.failed.length === 0;

      logger.info("📊 Bulk delete summary", {
        total: results.total,
        success: results.success.length,
        failed: results.failed.length,
      });

      return {
        success: allSuccess,
        partialSuccess: results.success.length > 0 && results.failed.length > 0,
        results,
        message: allSuccess
          ? `Berhasil menghapus ${results.success.length} fleet`
          : `${results.success.length} berhasil, ${results.failed.length} gagal`,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Bulk delete failed", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
        results: { success: [], failed: [], total: 0 },
      };
    }
  },

  async validateBulkOperation(fleetIds, operation = "delete") {
    try {
      const validations = {
        valid: [],
        invalid: [],
        total: fleetIds.length,
      };

      for (const fleetId of fleetIds) {
        try {
          const response = await offlineService.get(
            `/setting-fleets/${fleetId}`,
          );
          const fleet = response.data;
          const status = fleet?.attributes?.status;

          const validation = {
            id: fleetId,
            status,
            canDelete: status !== "ACTIVE",
            canUpdate: true,
          };

          if (operation === "delete" && status === "ACTIVE") {
            validations.invalid.push({
              ...validation,
              reason: "Fleet dengan status ACTIVE tidak dapat dihapus",
            });
          } else {
            validations.valid.push(validation);
          }
        } catch (error) {
          const errorMessage = extractErrorMessage(error);

          validations.invalid.push({
            id: fleetId,
            error: errorMessage,
            reason: "Fleet tidak ditemukan atau error",
          });
        }
      }

      return {
        success: true,
        validations,
        allValid: validations.invalid.length === 0,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Validation failed", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  async setActiveFleetConfig(configId) {
    try {
      const result = await this.fetchFleetConfigs({
        forceRefresh: true,
      });

      if (!result.success) {
        throw new Error("Failed to fetch configs");
      }

      const activeConfigs = result.data.filter(
        (c) => c.status === "ACTIVE" && c.id !== configId.toString(),
      );

      for (const config of activeConfigs) {
        await offlineService.put(`/setting-fleets/${config.id}`, {
          data: { status: "INACTIVE" },
        });
      }

      await offlineService.put(`/setting-fleets/${configId}`, {
        data: { status: "ACTIVE" },
      });

      await offlineService.clearCache("fleets_");

      logger.info("✅ Active fleet config changed", { id: configId });
      return { success: true, message: "Konfigurasi berhasil diaktifkan" };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to set active fleet config", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  _transformFleetConfig(apiResponse) {
    try {
      const item = apiResponse.data || apiResponse;
      const attr = item.attributes || item;

      const normalizeUser = (userData) => {
        if (!userData) return { name: null, id: null };

        if (userData.data) {
          return {
            name:
              userData.data.attributes?.username ||
              userData.data.attributes?.name ||
              null,
            id: userData.data.id?.toString() || null,
          };
        }

        return {
          name: userData.username || userData.name || null,
          id: userData.id?.toString() || null,
        };
      };

      const inspector = normalizeUser(attr.inspector);
      const checker = normalizeUser(attr.checker);

      const pairs = attr.setting_dump_truck?.data?.attributes?.pair_dt_op || [];

      const dumptrucks = pairs.flatMap((pair) => {
        const dts = pair.dts?.data || [];
        const ops = pair.ops?.data || [];

        return dts.map((dt) => ({
          pairId: pair.id?.toString() || "",
          dumpTruckId: dt.id?.toString() || "",
          hull_no: dt.attributes?.hull_no || "",
          type: dt.attributes?.type || "DUMP_TRUCK",
          tareWeight: dt.attributes?.tare_weight ?? null,
          company: dt.attributes?.company?.data?.attributes?.name || "-",
          companyId: dt.attributes?.company?.data?.id?.toString() || "",
          operator: ops[0]?.attributes?.name || null,
          operatorId: ops[0]?.id?.toString() || null,
        }));
      });

      const excavatorCompanyData =
        attr.unit_exca?.data?.attributes?.company?.data;
      const excavatorCompanyId = excavatorCompanyData?.id?.toString() || null;
      const excavatorCompany = excavatorCompanyData?.attributes?.name || null;

      return {
        id: item.id.toString(),

        excavator: attr.unit_exca?.data?.attributes?.hull_no || "",
        excavatorId: attr.unit_exca?.data?.id?.toString() || "",

        excavatorCompanyId,
        excavatorCompany,

        loadingLocation: attr.loading_location?.data?.attributes?.name || "",
        loadingLocationId: attr.loading_location?.data?.id?.toString() || "",

        dumpingLocation: attr.dumping_location?.data?.attributes?.name || "",
        dumpingLocationId: attr.dumping_location?.data?.id?.toString() || "",

        date: attr.date || "",
        status: attr.status || "INACTIVE",

        coalType: attr.coal_type?.data?.attributes?.name || "",
        coalTypeId: attr.coal_type?.data?.id?.toString() || "",
        distance: attr.distance || 0,

        workUnit: attr.pic_work_unit?.data?.attributes?.subsatker || "",
        workUnitId: attr.pic_work_unit?.data?.id?.toString() || "",

        weightBridgeId: attr.weigh_bridge?.data?.id?.toString() || "",
        weightBridge: attr.weigh_bridge?.data?.attributes?.name || "",

        checker: checker.name,
        checkerId: checker.id,
        inspector: inspector.name,
        inspectorId: inspector.id,

        settingDumpTruckId: attr.setting_dump_truck?.data?.id?.toString() || "",
        dumptruckCount: dumptrucks.length,
        units: dumptrucks,

        measurementType: attr.measurement_type,

        createdAt: attr.createdAt,
        updatedAt: attr.updatedAt,
      };
    } catch (error) {
      console.error("❌ Error transforming fleet config:", error, apiResponse);
      throw error;
    }
  },

  clearCache(pattern = null) {
    logger.info("🗑️ Fleet service cache cleared", {
      pattern: pattern || "all",
    });
    return offlineService.clearCache(pattern);
  },
};
