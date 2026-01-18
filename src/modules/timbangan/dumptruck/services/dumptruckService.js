import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";

// ✅ Helper function untuk extract error message
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

  // Filter measurement_type jika ada
  if (measurementType) {
    if (!filters.setting_fleet) {
      filters.setting_fleet = {};
    }
    filters.setting_fleet.measurement_type = { $eq: measurementType };
    logger.info("📊 Measurement type filter applied", { measurementType });
  }

  // Filter berdasarkan role
  switch (role) {
    case "operator_jt":
      if (user?.weigh_bridge?.id) {
        if (!filters.setting_fleet) {
          filters.setting_fleet = {};
        }
        filters.setting_fleet.weigh_bridge = {
          id: { $eq: parseInt(user.weigh_bridge.id) },
        };
      }

      if (!measurementType) {
        if (!filters.setting_fleet) {
          filters.setting_fleet = {};
        }
        filters.setting_fleet.measurement_type = { $eq: "Timbangan" };
      }
      break;

    case "ccr": {
      const subsatker = user?.work_unit?.subsatker;
      if (!subsatker) {
        return {
          needsFeedback: true,
          message:
            "Data tidak dapat difilter karena subsatker tidak ditemukan.",
        };
      }
      if (!filters.setting_fleet) {
        filters.setting_fleet = {};
      }
      filters.setting_fleet.pic_work_unit = {
        subsatker: { $eq: subsatker },
      };
      break;
    }

    case "pengawas":
    case "evaluator":
    case "pic": {
      const subsatker = user?.work_unit?.subsatker;
      if (subsatker) {
        if (!filters.setting_fleet) {
          filters.setting_fleet = {};
        }
        filters.setting_fleet.pic_work_unit = {
          subsatker: { $eq: subsatker },
        };
      }
      break;
    }

    case "admin":
    case "mitra":
    case "checker":
      if (user?.company?.id) {
        if (!filters.setting_fleet) {
          filters.setting_fleet = {};
        }
        filters.setting_fleet.unit_exca = {
          company: {
            id: { $eq: parseInt(user.company.id) },
          },
        };
      }
      break;

    case "super_admin":
      break;
  }

  logger.info("🔎 Dumptruck filters built", {
    role,
    measurementType,
    filters: JSON.stringify(filters),
  });

  return filters;
};

export const dumptruckService = {
  async fetchDumptruckSettings(options = {}) {
    try {
      const { user, forceRefresh = false, measurementType } = options;

      const roleFilters = buildFilters({
        user,
        measurementType,
      });

      if (roleFilters.needsFeedback) {
        logger.warn("⚠️ CCR subsatker validation failed", {
          message: roleFilters.message,
        });
        return {
          success: false,
          data: [],
          needsFeedback: true,
          message: roleFilters.message,
        };
      }

      const cacheKey = `dumptruck_settings_${user?.id || "nouser"}_${
        measurementType || "all"
      }`;

      const params = {
        populate: [
          "pair_dt_op",
          "pair_dt_op.dts",
          "pair_dt_op.dts.company",
          "pair_dt_op.dts.work_unit",
          "pair_dt_op.ops",
          "pair_dt_op.ops.company",

          "setting_fleet",
          "setting_fleet.unit_exca",
          "setting_fleet.unit_exca.company",
          "setting_fleet.unit_exca.work_unit",
          "setting_fleet.loading_location",
          "setting_fleet.dumping_location",
          "setting_fleet.coal_type",
          "setting_fleet.pic_work_unit",
          "setting_fleet.weigh_bridge",
          "setting_fleet.checker",
          "setting_fleet.inspector",
          "setting_fleet.created_by_user",
        ],
        sort: ["id:desc"],
        pagination: { pageSize: 500 },
        filters: roleFilters,
      };

      if (options.filters) {
        params.filters = {
          ...params.filters,
          ...options.filters,
        };
      }

      logger.info("📡 Fetching dumptruck settings", {
        role: user?.role,
        measurementType,
        cacheKey,
        forceRefresh,
      });

      const response = await offlineService.get("/setting-dump-trucks", {
        params,
        cacheKey,
        ttl: 5 * 60 * 1000,
        forceRefresh,
      });

      let operatorsMap = {};
      try {
        const ops = await masterDataService.fetchOperators();
        ops.forEach((op) => {
          operatorsMap[String(op.id)] = op.name;
        });
      } catch (err) {
        logger.warn("Failed to fetch operators for mapping", {
          error: err.message,
        });
      }

      const settings = response.data.map((item) =>
        this._transformDumptruckSetting(item, operatorsMap)
      );

      logger.info("✅ Dumptruck settings fetched", {
        count: settings.length,
        role: user?.role,
        measurementType,
      });

      return { success: true, data: settings };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("❌ Failed to fetch dumptruck settings", {
        error: errorMessage,
        details: error.response?.data,
      });
      
      return { 
        success: false, 
        data: [], 
        error: errorMessage 
      };
    }
  },

  async getFilteredUnitsByFleet(settingFleetId) {
    try {
      if (!settingFleetId) {
        throw new Error("settingFleetId is required");
      }

      const fleetResponse = await offlineService.get(
        `/setting-fleets/${settingFleetId}`,
        {
          params: {
            populate: ["unit_exca", "unit_exca.company", "unit_exca.work_unit"],
          },
          cacheKey: `fleet_${settingFleetId}`,
          ttl: 3 * 60 * 1000,
        }
      );

      const excavatorCompanyId =
        fleetResponse.data?.attributes?.unit_exca?.data?.attributes?.company
          ?.data?.id;

      if (!excavatorCompanyId) {
        logger.warn("Excavator tidak memiliki company");
        return { success: true, data: [] };
      }

      const allDTResponse = await offlineService.get("/units", {
        params: {
          filters: {
            type: { $eq: "DUMP_TRUCK" },
          },
          populate: ["company", "work_unit"],
          pagination: { pageSize: 500 },
          sort: ["hull_no:asc"],
        },
        cacheKey: "units_all_dump_trucks",
        ttl: 10 * 60 * 1000,
      });

      const units = allDTResponse.data
        .map((item) => ({
          id: item.id?.toString() || "",
          hull_no: item.attributes.hull_no || "",
          type: item.attributes.type || "DUMP_TRUCK",
          company: item.attributes.company?.data?.attributes?.name || "-",
          companyId: item.attributes.company?.data?.id?.toString() || "",
          workUnit:
            item.attributes.work_unit?.data?.attributes?.subsatker || "-",
          workUnitId: item.attributes.work_unit?.data?.id?.toString() || "",
          status: item.attributes.status || "active",
        }))
        .filter((unit) => {
          return String(unit.companyId) === String(excavatorCompanyId);
        });

      logger.info("Filtered units fetched", { count: units.length });
      return { success: true, data: units };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("Failed to get filtered units by fleet", {
        error: errorMessage,
        details: error.response?.data,
      });
      
      return { 
        success: false, 
        data: [], 
        error: errorMessage 
      };
    }
  },

  async createDumptruckSetting(data) {
    try {
      if (!data.setting_fleet_id) {
        throw new Error("setting_fleet_id is required");
      }

      const payload = {
        setting_fleet: parseInt(data.setting_fleet_id),
        pair_dt_op: data.pair_dt_op.map((pair) => ({
          truckId: parseInt(pair.truckId),
          operatorId: parseInt(pair.operatorId),
        })),
      };

      logger.info("📤 Creating dumptruck setting", {
        fleetId: payload.setting_fleet,
        pairsCount: payload.pair_dt_op.length,
      });

      const response = await offlineService.post(
        "/v1/custom/setting-dump-truck",
        payload
      );

      const settingId =
        response.data?.data?.id || response.data?.id || response.id;

      if (!settingId) {
        throw new Error("Setting ID not found in response");
      }

      logger.info("🔄 Fetching created setting with full populate", {
        settingId,
      });

      const fullResponse = await offlineService.get(
        `/setting-dump-trucks/${settingId}`,
        {
          params: {
            populate: [
              "pair_dt_op",
              "pair_dt_op.dts",
              "pair_dt_op.dts.company",
              "pair_dt_op.dts.work_unit",
              "pair_dt_op.ops",
              "pair_dt_op.ops.company",
              "setting_fleet",
              "setting_fleet.unit_exca",
              "setting_fleet.unit_exca.company",
              "setting_fleet.loading_location",
              "setting_fleet.dumping_location",
              "setting_fleet.pic_work_unit",
              "setting_fleet.weigh_bridge",
              "setting_fleet.checker",
              "setting_fleet.inspector",
            ],
          },
          forceRefresh: true,
        }
      );

      const transformedData = this._transformDumptruckSetting(
        fullResponse.data
      );

      await offlineService.clearCache("dumptruck_settings");
      await offlineService.clearCache("fleets_");

      logger.info("✅ Dumptruck setting created", {
        id: transformedData.id,
        unitsCount: transformedData.units?.length || 0,
      });

      return {
        success: true,
        data: transformedData,
      };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("❌ Failed to create dumptruck setting", {
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

  async deleteDumptruckSetting(settingId) {
    try {
      logger.info("🗑️ Deleting dumptruck setting", { settingId });

      await offlineService.delete(`/v1/custom/setting-dump-truck/${settingId}`);

      await offlineService.clearCache("dumptruck_settings");
      await offlineService.clearCache("fleets_");

      logger.info("✅ Dumptruck setting deleted", { id: settingId });
      return { success: true, message: "Setting berhasil dihapus" };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("❌ Failed to delete dumptruck setting", {
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

  async reactivateDumptruckSetting(settingId) {
    try {
      logger.info("🔄 Reactivating dumptruck setting (via backend)", {
        settingId,
      });

      const response = await offlineService.put(
        `/v1/custom/setting-dump-truck/${settingId}/reactivate`,
        {}
      );

      logger.info("🔄 Fetching reactivated setting with full populate", {
        settingId,
      });

      const fullResponse = await offlineService.get(
        `/setting-dump-trucks/${settingId}`,
        {
          params: {
            populate: [
              "pair_dt_op",
              "pair_dt_op.dts",
              "pair_dt_op.dts.company",
              "pair_dt_op.dts.work_unit",
              "pair_dt_op.ops",
              "pair_dt_op.ops.company",
              "setting_fleet",
              "setting_fleet.unit_exca",
              "setting_fleet.unit_exca.company",
              "setting_fleet.loading_location",
              "setting_fleet.dumping_location",
              "setting_fleet.pic_work_unit",
              "setting_fleet.weigh_bridge",
              "setting_fleet.checker",
              "setting_fleet.inspector",
            ],
          },
          forceRefresh: true,
        }
      );

      const transformedData = this._transformDumptruckSetting(
        fullResponse.data
      );

      await offlineService.clearCache("dumptruck_settings");
      await offlineService.clearCache("fleets_");

      logger.info("✅ Dumptruck setting reactivated", {
        id: settingId,
        fleetStatus: transformedData.fleet?.status,
      });

      return {
        success: true,
        data: transformedData,
      };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("❌ Failed to reactivate dumptruck setting", {
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

  async bulkDeleteUnits(settingId, unitIds) {
    try {
      // Validate inputs
      if (!settingId) {
        throw new Error("Setting ID tidak boleh kosong");
      }

      if (!unitIds || unitIds.length === 0) {
        throw new Error("Tidak ada unit yang dipilih untuk dihapus");
      }

      // Fetch current setting
      const currentResponse = await offlineService.get(
        `/setting-dump-trucks/${settingId}`,
        {
          params: {
            populate: ["pair_dt_op", "pair_dt_op.dts", "pair_dt_op.ops"],
          },
          forceRefresh: true,
        }
      );

      if (!currentResponse || !currentResponse.data) {
        throw new Error("Setting tidak ditemukan");
      }

      // Transform setting
      const currentSetting = this._transformDumptruckSetting(
        currentResponse.data
      );

      // Filter out units to be deleted
      const remainingUnits = (currentSetting.units || []).filter(
        (unit) => !unitIds.includes(String(unit.id))
      );

      // Validate remaining units
      if (remainingUnits.length === 0) {
        throw new Error(
          "Tidak bisa menghapus semua unit. Minimal 1 unit harus tersisa."
        );
      }

      // Prepare payload
      const payload = {
        pair_dt_op: remainingUnits.map((unit) => ({
          truckId: parseInt(unit.id),
          operatorId: parseInt(unit.operatorId),
        })),
      };

      // Update setting
      await offlineService.patch(
        `/v1/custom/setting-dump-truck/${settingId}`,
        payload
      );

      // Fetch updated setting
      const fullResponse = await offlineService.get(
        `/setting-dump-trucks/${settingId}`,
        {
          params: {
            populate: [
              "pair_dt_op",
              "pair_dt_op.dts",
              "pair_dt_op.dts.company",
              "pair_dt_op.dts.work_unit",
              "pair_dt_op.ops",
              "pair_dt_op.ops.company",
              "setting_fleet",
              "setting_fleet.unit_exca",
              "setting_fleet.unit_exca.company",
              "setting_fleet.loading_location",
              "setting_fleet.dumping_location",
              "setting_fleet.pic_work_unit",
              "setting_fleet.weigh_bridge",
              "setting_fleet.checker",
              "setting_fleet.inspector",
            ],
          },
          forceRefresh: true,
        }
      );

      const transformedData = this._transformDumptruckSetting(
        fullResponse.data
      );

      // Clear caches
      await offlineService.clearCache("dumptruck_settings");
      await offlineService.clearCache("fleets_");

      return {
        success: true,
        data: transformedData,
        deletedCount: unitIds.length,
      };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("❌ Service: Bulk delete failed", {
        settingId,
        unitIds,
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

  async updateDumptruckSetting(settingId, updates) {
    try {
      const payload = {};

      if (updates.pair_dt_op && Array.isArray(updates.pair_dt_op)) {
        payload.pair_dt_op = updates.pair_dt_op.map((pair) => ({
          truckId: parseInt(pair.truckId),
          operatorId: parseInt(pair.operatorId),
        }));
      }

      logger.info("📤 Updating dumptruck setting", {
        settingId,
        pairsCount: payload.pair_dt_op?.length,
      });

      await offlineService.patch(
        `/v1/custom/setting-dump-truck/${settingId}`,
        payload
      );

      logger.info("🔄 Fetching updated setting with full populate", {
        settingId,
      });

      const fullResponse = await offlineService.get(
        `/setting-dump-trucks/${settingId}`,
        {
          params: {
            populate: [
              "pair_dt_op",
              "pair_dt_op.dts",
              "pair_dt_op.dts.company",
              "pair_dt_op.dts.work_unit",
              "pair_dt_op.ops",
              "pair_dt_op.ops.company",
              "setting_fleet",
              "setting_fleet.unit_exca",
              "setting_fleet.unit_exca.company",
              "setting_fleet.loading_location",
              "setting_fleet.dumping_location",
              "setting_fleet.pic_work_unit",
              "setting_fleet.weigh_bridge",
              "setting_fleet.checker",
              "setting_fleet.inspector",
            ],
          },
          forceRefresh: true,
        }
      );

      const transformedData = this._transformDumptruckSetting(
        fullResponse.data
      );

      await offlineService.clearCache("dumptruck_settings");
      await offlineService.clearCache("fleets_");

      logger.info("✅ Dumptruck setting updated", {
        id: settingId,
        unitsCount: transformedData.units?.length || 0,
      });

      return {
        success: true,
        data: transformedData,
      };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("❌ Failed to update dumptruck setting", {
        settingId,
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

  async bulkMoveUnits(sourceSettingId, targetFleetId, unitIds) {
    try {
      logger.info("🔄 Bulk moving units", {
        sourceSettingId,
        targetFleetId,
        unitCount: unitIds.length,
        unitIds,
      });

      // Fetch source setting
      const sourceResponse = await offlineService.get(
        `/setting-dump-trucks/${sourceSettingId}`,
        {
          params: {
            populate: ["pair_dt_op", "pair_dt_op.dts", "pair_dt_op.ops"],
          },
          forceRefresh: true,
        }
      );

      const sourceSetting = this._transformDumptruckSetting(
        sourceResponse.data
      );

      // Separate units to move and units to keep
      const unitsToMove = (sourceSetting.units || []).filter((unit) =>
        unitIds.includes(String(unit.id))
      );

      const unitsToKeep = (sourceSetting.units || []).filter(
        (unit) => !unitIds.includes(String(unit.id))
      );

      if (unitsToMove.length === 0) {
        throw new Error("Tidak ada unit yang ditemukan untuk dipindahkan");
      }

      // Update source setting (remove moved units)
      if (unitsToKeep.length > 0) {
        const sourcePayload = {
          pair_dt_op: unitsToKeep.map((unit) => ({
            truckId: parseInt(unit.id),
            operatorId: parseInt(unit.operatorId),
          })),
        };

        await offlineService.patch(
          `/v1/custom/setting-dump-truck/${sourceSettingId}`,
          sourcePayload
        );
      } else {
        // If no units left, delete the setting
        await this.deleteDumptruckSetting(sourceSettingId);
      }

      // Check if target fleet already has a setting
      const allSettings = await this.fetchDumptruckSettings({
        forceRefresh: true,
      });

      const targetSetting = allSettings.data.find(
        (s) => String(s.fleet?.id) === String(targetFleetId)
      );

      if (targetSetting) {
        // Target has setting - append units
        const targetUnits = targetSetting.units || [];
        const mergedPairDtOp = [
          ...targetUnits.map((u) => ({
            truckId: parseInt(u.id),
            operatorId: parseInt(u.operatorId),
          })),
          ...unitsToMove.map((u) => ({
            truckId: parseInt(u.id),
            operatorId: parseInt(u.operatorId),
          })),
        ];

        await offlineService.patch(
          `/v1/custom/setting-dump-truck/${targetSetting.id}`,
          { pair_dt_op: mergedPairDtOp }
        );
      } else {
        // Target has no setting - create new
        await this.createDumptruckSetting({
          setting_fleet_id: String(targetFleetId),
          pair_dt_op: unitsToMove.map((u) => ({
            truckId: parseInt(u.id),
            operatorId: parseInt(u.operatorId),
          })),
        });
      }

      await offlineService.clearCache("dumptruck_settings");
      await offlineService.clearCache("fleets_");

      logger.info("✅ Bulk move completed", {
        movedCount: unitsToMove.length,
        sourceRemaining: unitsToKeep.length,
      });

      return {
        success: true,
        movedCount: unitsToMove.length,
        sourceRemaining: unitsToKeep.length,
      };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("❌ Failed to bulk move units", {
        error: errorMessage,
        sourceSettingId,
        targetFleetId,
        unitIds,
        details: error.response?.data,
      });
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  },

  _transformDumptruckSetting(apiResponse, operatorsMap = {}) {
    try {
      const item = apiResponse.data || apiResponse;
      const attr = item.attributes || item;

      const fleetData = attr.setting_fleet?.data;
      const fleetAttr = fleetData?.attributes;

      const pairDtOp = attr.pair_dt_op || [];

      const units = pairDtOp
        .map((pair) => {
          const truck = pair.dts?.data?.[0];
          const operator = pair.ops?.data?.[0];

          if (!truck) {
            return null;
          }

          return {
            id: truck.id?.toString() || "",
            hull_no: truck.attributes?.hull_no || "",
            type: truck.attributes?.type || "DUMP_TRUCK",
            company: truck.attributes?.company?.data?.attributes?.name || "-",
            companyId: truck.attributes?.company?.data?.id?.toString() || "",
            workUnit:
              truck.attributes?.work_unit?.data?.attributes?.subsatker || "-",
            workUnitId: truck.attributes?.work_unit?.data?.id?.toString() || "",
            status: truck.attributes?.status || "active",
            operatorId: operator?.id?.toString() || "",
            operatorName:
              operator?.attributes?.name ||
              operatorsMap[operator?.id?.toString()] ||
              "-",
          };
        })
        .filter(Boolean);

      return {
        id: item.id?.toString() || "",
        units,

        fleet: fleetData
          ? {
              id: fleetData.id?.toString() || "",
              name: `Fleet ${fleetAttr?.unit_exca?.data?.attributes?.hull_no || "N/A"}`,
              excavator: fleetAttr?.unit_exca?.data?.attributes?.hull_no || "",
              excavatorId: fleetAttr?.unit_exca?.data?.id?.toString() || "",
              excavatorCompanyId:
                fleetAttr?.unit_exca?.data?.attributes?.company?.data?.id?.toString() ||
                "",
              loadingLocation:
                fleetAttr?.loading_location?.data?.attributes?.name || "",
              dumpingLocation:
                fleetAttr?.dumping_location?.data?.attributes?.name || "",
              date: fleetAttr?.date || "",
              status: fleetAttr?.status || "INACTIVE",
              workUnit:
                fleetAttr?.pic_work_unit?.data?.attributes?.subsatker || "",
              workUnitId: fleetAttr?.pic_work_unit?.data?.id?.toString() || "",
              weighBridgeId:
                fleetAttr?.weigh_bridge?.data?.id?.toString() || "",
              weighBridge:
                fleetAttr?.weigh_bridge?.data?.attributes?.name || "",
              measurementType: fleetAttr?.measurement_type,
            }
          : null,

        createdAt: attr.createdAt,
        updatedAt: attr.updatedAt,
      };
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("❌ Transform error", {
        error: errorMessage,
        response: apiResponse,
      });
      
      throw error;
    }
  },

  clearCache() {
    try {
      offlineService.clearCache("dumptruck_settings");
      offlineService.clearCache("fleets_");
      logger.info("✅ Dumptruck cache cleared");
    } catch (error) {
      // ✅ Extract error message
      const errorMessage = extractErrorMessage(error);
      
      logger.error("Failed to clear dumptruck cache", {
        error: errorMessage,
      });
    }
  },
};