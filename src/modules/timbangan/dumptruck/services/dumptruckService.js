import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { validateDateRange } from "@/shared/utils/date"; 

/**
 *   BUILD FILTERS - Support Role-Based Access
 */
const buildFilters = (options = {}) => {
  const { user, dateRange } = options; 
  const filters = {};

  if (!user) {
    logger.warn("⚠️ No user provided for filter");
    return filters;
  }

  const role = user.role?.toLowerCase();

  logger.info("🔒 Building dumptruck filters", {
    role,
    userId: user.id,
    weighBridgeId: user.weigh_bridge?.id,
  });

  // Role-based filters
  switch (role) {
    case "mitra":
    case "pengawas":
    case "checker":
      if (user.company?.id) {
        filters.setting_fleet = {
          unit_exca: {
            company: {
              id: { $eq: parseInt(user.company.id) },
            },
          },
        };
        logger.info("🏢 Filtering by company (from excavator)", {
          companyId: user.company.id,
        });
      }
      break;

    case "admin":
    case "pic":
    case "evaluator":
      if (user.work_unit?.id) {
        filters.setting_fleet = {
          pic_work_unit: {
            id: { $eq: parseInt(user.work_unit.id) },
          },
        };
        logger.info("🗃️ Filtering by work unit", {
          workUnitId: user.work_unit.id,
        });
      }
      break;

    case "operator_jt":
      logger.info("⚖️ Operator JT - will filter by weigh_bridge only");
      break;

    case "super_admin":
      logger.info("👑 Super Admin - no role-specific filters");
      break;

    default:
      logger.warn("⚠️ Unknown role, returning empty filters", { role });
      break;
  }

  // Weigh bridge filter
  if (role !== "super_admin" && user.weigh_bridge?.id) {
    if (filters.setting_fleet) {
      filters.setting_fleet = {
        $and: [
          filters.setting_fleet,
          {
            weigh_bridge: {
              id: { $eq: parseInt(user.weigh_bridge.id) },
            },
          },
        ],
      };
    } else {
      filters.setting_fleet = {
        weigh_bridge: {
          id: { $eq: parseInt(user.weigh_bridge.id) },
        },
      };
    }

    logger.info("⚖️ Weigh_bridge filter applied", {
      weighBridgeId: user.weigh_bridge.id,
    });
  }

  // ✅ IMPROVED - Use validateDateRange utility
  if (dateRange?.from && dateRange?.to) {
    const validation = validateDateRange(dateRange);
    
    if (!validation.valid) {
      logger.warn("⚠️ Invalid date range", { error: validation.error });
      return filters; // Return without date filter if invalid
    }

    if (filters.setting_fleet) {
      filters.setting_fleet = {
        $and: [
          filters.setting_fleet,
          {
            date: {
              $gte: dateRange.from,
              $lte: dateRange.to
            }
          }
        ]
      };
    } else {
      filters.setting_fleet = {
        date: {
          $gte: dateRange.from,
          $lte: dateRange.to
        }
      };
    }
    
    logger.info("📅 Date range filter applied to dumptruck", { 
      from: dateRange.from, 
      to: dateRange.to 
    });
  }

  return filters;
};

export const dumptruckService = {
  async fetchDumptruckSettings(options = {}) {
    try {
      const { user, forceRefresh = false, dateRange } = options;

      const roleFilters = buildFilters({ user, dateRange });

      // ✅ Build cache key that includes dateRange
      const cacheKey = dateRange?.from && dateRange?.to
        ? `dumptruck_settings_${dateRange.from}_${dateRange.to}`
        : "dumptruck_settings_all";

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
        pagination: { pageSize: 100 },
        filters: roleFilters,
      };

      if (options.filters) {
        params.filters = {
          ...params.filters,
          ...options.filters,
        };
      }

      logger.info("📡 Fetching dumptruck settings with FULL populate", {
        filters: params.filters,
        role: user?.role,
        populateCount: params.populate.length,
      });

      const response = await offlineService.get("/setting-dump-trucks", {
        params,
        cacheKey,  // ✅ Use dateRange-specific cache key
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

      logger.info("✅ Dumptruck settings fetched with full data", {
        count: settings.length,
        role: user?.role,
        sampleUnits: settings[0]?.units?.length || 0,
      });

      return { success: true, data: settings };
    } catch (error) {
      logger.error("❌ Failed to fetch dumptruck settings", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
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
      logger.error("Failed to get filtered units by fleet", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  async createDumptruckSetting(data) {
    try {
      if (!data.setting_fleet_id) {
        throw new Error("setting_fleet_id is required");
      }

      const now = new Date().toISOString();
      let payload;

      if (data.pair_dt_op && Array.isArray(data.pair_dt_op)) {
        payload = {
          setting_fleet: parseInt(data.setting_fleet_id),
          pair_dt_op: data.pair_dt_op.map((pair) => ({
            truckId: parseInt(pair.truckId),
            operatorId: parseInt(pair.operatorId),
          })),
        };
      } else if (data.unit_ids && Array.isArray(data.unit_ids)) {
        payload = {
          unit_dump_trucks: data.unit_ids.map((id) => parseInt(id)),
          setting_fleet: parseInt(data.setting_fleet_id),
        };
      } else {
        throw new Error("Either pair_dt_op or unit_ids must be provided");
      }

      logger.info("Creating dumptruck setting with payload:", payload);

      const response = await offlineService.post(
        "/v1/custom/setting-dump-truck",
        payload
      );

      const settingId =
        response.data?.data?.id || response.data?.id || response.id;

      if (!settingId) {
        throw new Error("Setting ID not found in response");
      }

      logger.info("🔄 Fetching created setting with full populate...", {
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

      logger.info("✅ Dumptruck setting created with clientCreatedAt", {
        id: transformedData.id,
        unitsCount: transformedData.units?.length || 0,
        clientCreatedAt: now,
      });

      return {
        success: true,
        data: transformedData,
        message: "Setting dump truck berhasil dibuat",
      };
    } catch (error) {
      console.error("❌ Create dumptruck setting error:", error);
      logger.error("Failed to create dumptruck setting", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
        message: "Gagal membuat setting dump truck",
      };
    }
  },

  async updateDumptruckSetting(settingId, updates) {
    try {
      const payload = {
        data: {}
      };

      if (
        updates.pair_dt_op !== undefined &&
        Array.isArray(updates.pair_dt_op)
      ) {
        payload.data.pair_dt_op = updates.pair_dt_op.map((pair) => ({
          dts: parseInt(pair.truckId),
          ops: parseInt(pair.operatorId),
        }));
      } else if (
        updates.unit_ids !== undefined &&
        Array.isArray(updates.unit_ids)
      ) {
        payload.data.unit_dump_trucks = updates.unit_ids.map((id) =>
          parseInt(id)
        );
      }

      logger.info("Updating dumptruck setting:", payload);

      await offlineService.put(`/setting-dump-trucks/${settingId}`, payload);

      logger.info("🔄 Fetching updated setting with full populate...", {
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

      logger.info("✅ Dumptruck setting updated with full data", {
        id: settingId,
        unitsCount: transformedData.units?.length || 0,
      });

      return {
        success: true,
        data: transformedData,
        message: "Setting dump truck berhasil diupdate",
      };
    } catch (error) {
      logger.error("Failed to update dumptruck setting", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
        message: "Gagal mengupdate setting dump truck",
      };
    }
  },

  async deleteDumptruckSetting(settingId) {
    try {
      await offlineService.delete(`/setting-dump-trucks/${settingId}`);

      logger.info("Dumptruck setting deleted", { id: settingId });
      return { success: true, message: "Setting berhasil dihapus" };
    } catch (error) {
      logger.error("Failed to delete dumptruck setting", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
        message: "Gagal menghapus setting dump truck",
      };
    }
  },

  async reactivateDumptruckSetting(settingId) {
    try {
      const settingResponse = await offlineService.get(
        `/setting-dump-trucks/${settingId}`,
        {
          params: {
            populate: ["setting_fleet"],
          },
        }
      );

      const fleetId = settingResponse.data?.attributes?.setting_fleet?.data?.id;

      if (!fleetId) {
        throw new Error("Fleet ID tidak ditemukan di setting");
      }

      logger.info("🔄 Reactivating fleet by updating status", {
        settingId,
        fleetId,
      });

      const updatePayload = {
        data: {
          status: "ACTIVE",
        },
      };

      await offlineService.put(`/setting-fleets/${fleetId}`, updatePayload);

      logger.info("✅ Fleet status changed to ACTIVE", { fleetId });

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

      return {
        success: true,
        data: transformedData,
        message: "Fleet berhasil direaktivasi",
      };
    } catch (error) {
      logger.error("❌ Failed to reactivate dumptruck setting", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
        message: "Gagal mereaktivasi fleet",
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
              name: `Fleet ${fleetAttr?.shift || "-"} - ${
                fleetAttr?.date || "-"
              } - ${fleetAttr?.unit_exca?.data?.attributes?.hull_no || "N/A"}`,
              excavator: fleetAttr?.unit_exca?.data?.attributes?.hull_no || "",
              excavatorId: fleetAttr?.unit_exca?.data?.id?.toString() || "",
              excavatorCompanyId:
                fleetAttr?.unit_exca?.data?.attributes?.company?.data?.id?.toString() ||
                "",
              loadingLocation:
                fleetAttr?.loading_location?.data?.attributes?.name || "",
              dumpingLocation:
                fleetAttr?.dumping_location?.data?.attributes?.name || "",
              shift: fleetAttr?.shift || "",
              date: fleetAttr?.date || "",
              status: fleetAttr?.status || "INACTIVE",
              workUnit:
                fleetAttr?.pic_work_unit?.data?.attributes?.subsatker || "",
              workUnitId: fleetAttr?.pic_work_unit?.data?.id?.toString() || "",
              weighBridgeId:
                fleetAttr?.weigh_bridge?.data?.id?.toString() || "",
              weighBridge:
                fleetAttr?.weigh_bridge?.data?.attributes?.name || "",
            }
          : null,

        createdAt: attr.createdAt,
        updatedAt: attr.updatedAt,
      };
    } catch (error) {
      console.error("❌ Transform error:", error, "Response:", apiResponse);
      throw error;
    }
  },

  // ✅ NEW: Clear transaction data cache (NOT masters)
  clearCache() {
    try {
      offlineService.clearCache();
      logger.info("✅ Dumptruck cache cleared");
    } catch (error) {
      logger.error("Failed to clear dumptruck cache", { error: error.message });
    }
  },
};
