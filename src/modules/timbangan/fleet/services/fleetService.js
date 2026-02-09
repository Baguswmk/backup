import { offlineService } from "@/shared/services/offlineService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { logger } from "@/shared/services/log";

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
    case "checker":
      if (user?.id) {
        filters.$and = [
          {
            $or: [
              { measurement_type: { $eq: "Timbangan" } },
              { measurement_type: { $eq: "Bypass" } },
              { measurement_type: { $eq: "Beltscale" } },
            ],
          },
          {
            checkers: {
              id: {
                $in: [parseInt(user.id)],
              },
            },
          },
        ];

        logger.info("📊 Checker Filter Applied", {
          userId: user.id,
          condition:
            "measurement_type in [Timbangan, Bypass, Beltscale] AND user in checkers",
        });
      }
      break;

    case "operator_jt":
      if (user?.id) {
        filters.$and = [
          { measurement_type: { $eq: "Timbangan" } },
          {
            checkers: {
              id: {
                $in: [parseInt(user.id)],
              },
            },
          },
        ];

        logger.info("📊 Operator JT Filter Applied", {
          userId: user.id,
          condition: "measurement_type=Timbangan AND user in pair_dt_op.ops",
        });
      }
      break;

    case "ccr":
    case "pengawas":
    case "evaluator":
    case "pic":
    case "admin":
    case "mitra":
    case "super_admin":
      logger.info("👑 No role-specific filter");
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
      const { user, forceRefresh = false } = options;

      const filterResult = buildFilters({ user });

      if (filterResult.needsFeedback) {
        return {
          success: false,
          data: [],
          feedback: filterResult.message,
        };
      }

      const filters = filterResult;
      const cacheKey = `fleets_${user?.id || "nouser"}`;

      const requestKey = `${cacheKey}_${JSON.stringify(filters)}`;

      if (pendingRequests.has(requestKey)) {
        logger.info("🔄 Reusing pending request", { requestKey });
        return pendingRequests.get(requestKey);
      }

      logger.info("🔍 Fetching fleet configs", {
        filters: JSON.stringify(filters),
        cacheKey,
        forceRefresh,
      });

      if (forceRefresh) {
        logger.info("🗑️ Force refresh: clearing all fleet cache");

        await Promise.all([
          offlineService.clearCache(cacheKey),
          offlineService.clearCacheByPrefix("fleets_"),
          offlineService.clearCacheByPrefix("setting-fleets"),
        ]);

        logger.info("✅ Fleet cache cleared");
      }

      const requestPromise = (async () => {
        try {
          const response = await offlineService.get("/setting-fleets", {
            params: {
              populate: [
                "unit_exca",
                "unit_exca.company",
                "loading_location",
                "dumping_location",
                "coal_type",
                "pic_work_unit",
                "weigh_bridge",
                "setting_dump_truck",
                "setting_dump_truck.pair_dt_op",
                "setting_dump_truck.pair_dt_op.dts",
                "setting_dump_truck.pair_dt_op.dts.company",
                "setting_dump_truck.pair_dt_op.dts.unit_logs",
                "setting_dump_truck.pair_dt_op.ops",
                "checkers",
                "inspectors",
              ],
              sort: ["id:desc"],
              filters,
              pagination: { pageSize: 500 },
            },
            cacheKey,
            forceRefresh,
          });

          const configs = response.data.map((item) =>
            this._transformFleetConfig(item),
          );

          logger.info(`✅ Fleet configs fetched: ${configs.length}`, {
            cached: !forceRefresh,
            sampleConfig: configs[0]
              ? {
                  id: configs[0].id,
                  hasCheckers: !!configs[0].checkers,
                  hasInspectors: !!configs[0].inspectors,
                  checkersCount: configs[0].checkers?.length || 0,
                  inspectorsCount: configs[0].inspectors?.length || 0,
                }
              : null,
          });

          return { success: true, data: configs };
        } finally {
          pendingRequests.delete(requestKey);
        }
      })();

      pendingRequests.set(requestKey, requestPromise);
      return requestPromise;
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
        measurement_type: configData.measurementType,
        pair_dt_op: configData.pairDtOp.map((pair) => ({
          truckId: parseInt(pair.truckId),
          operatorId: parseInt(pair.operatorId),
        })),
      };

      if (
        configData.inspectorIds &&
        Array.isArray(configData.inspectorIds) &&
        configData.inspectorIds.length > 0
      ) {
        payload.inspectors = configData.inspectorIds.map((id) => parseInt(id));
      }

      if (
        configData.checkerIds &&
        Array.isArray(configData.checkerIds) &&
        configData.checkerIds.length > 0
      ) {
        payload.checkers = configData.checkerIds.map((id) => parseInt(id));
      }

      if (configData.isSplit) {
        payload.isSplit = true;
      }

      if (configData.createdByUserId) {
        payload.created_by_user = parseInt(configData.createdByUserId);
      }

      // ✅ NEW: Add transfer metadata
      if (configData.isTransfer) {
        payload.isTransfer = true;
      }

      if (
        configData.moveFromFleets &&
        Array.isArray(configData.moveFromFleets) &&
        configData.moveFromFleets.length > 0
      ) {
        payload.moveFromFleets = configData.moveFromFleets;
      }

      logger.info("📡 Creating fleet config", {
        excavatorId: payload.unit_exca,
        pairsCount: payload.pair_dt_op.length,
        isTransfer: payload.isTransfer || false,
        transfersCount: payload.moveFromFleets?.length || 0,
      });

      const response = await offlineService.post(
        "/v1/custom/setting-fleet",
        payload,
      );

      if (response.status === "success") {
        const fleetId =
          response.data?.data?.id_setting_fleet ||
          response.data?.id_setting_fleet;

        logger.info("✅ Fleet created, ID:", fleetId);

        await offlineService.clearCache("fleets_");

        try {
          const detailResponse = await offlineService.get(
            `/setting-fleets/${fleetId}`,
            {
              params: {
                populate: [
                  "unit_exca",
                  "unit_exca.company",
                  "loading_location",
                  "dumping_location",
                  "coal_type",
                  "pic_work_unit",
                  "weigh_bridge",
                  "setting_dump_truck",
                  "setting_dump_truck.pair_dt_op",
                  "setting_dump_truck.pair_dt_op.dts.company",
                  "setting_dump_truck.pair_dt_op.ops",
                  "checkers",
                  "inspectors",
                ],
              },
            },
          );

          const transformedData = this._transformFleetConfig(
            detailResponse.data,
          );

          return {
            success: true,
            data: transformedData,
            setting_fleet_id: fleetId,
          };
        } catch (fetchError) {
          logger.warn("⚠️ Could not fetch created fleet details", {
            fleetId,
            error: fetchError.message,
          });

          return {
            success: true,
            data: {
              id: fleetId.toString(),
              distance:
                response.data?.data?.distance || response.data?.distance || 0,
              measurementType:
                response.data?.data?.measurement_type ||
                response.data?.measurement_type,
            },
            setting_fleet_id: fleetId,
          };
        }
      }

      return {
        success: false,
        error: "Failed to create fleet config",
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

  async updateFleetConfig(configId, updates) {
    try {
      const payload = {};

      if (updates.excavatorId !== undefined) {
        payload.unit_exca = updates.excavatorId
          ? parseInt(updates.excavatorId)
          : null;
      }
      if (updates.loadingLocationId !== undefined) {
        payload.loading_location = updates.loadingLocationId
          ? parseInt(updates.loadingLocationId)
          : null;
      }
      if (updates.dumpingLocationId !== undefined) {
        payload.dumping_location = updates.dumpingLocationId
          ? parseInt(updates.dumpingLocationId)
          : null;
      }
      if (updates.coalTypeId !== undefined) {
        payload.coal_type = updates.coalTypeId
          ? parseInt(updates.coalTypeId)
          : null;
      }
      if (updates.distance !== undefined) {
        payload.distance = updates.distance;
      }

      if (updates.workUnitId !== undefined) {
        payload.pic_work_unit = updates.workUnitId
          ? parseInt(updates.workUnitId)
          : null;
      }

      if (updates.inspectorIds !== undefined) {
        if (
          Array.isArray(updates.inspectorIds) &&
          updates.inspectorIds.length > 0
        ) {
          payload.inspectors = updates.inspectorIds.map((id) => parseInt(id));
          logger.info("📝 Updating inspectors", {
            configId,
            count: payload.inspectors.length,
            ids: payload.inspectors,
          });
        } else {
          logger.warn("⚠️ inspectorIds is empty or invalid", {
            inspectorIds: updates.inspectorIds,
          });
        }
      }

      if (updates.checkerIds !== undefined) {
        if (
          Array.isArray(updates.checkerIds) &&
          updates.checkerIds.length > 0
        ) {
          payload.checkers = updates.checkerIds.map((id) => parseInt(id));
          logger.info("📝 Updating checkers", {
            configId,
            count: payload.checkers.length,
            ids: payload.checkers,
          });
        } else {
          logger.warn("⚠️ checkerIds is empty or invalid", {
            checkerIds: updates.checkerIds,
          });
        }
      }

      if (updates.measurementType !== undefined) {
        payload.measurement_type = updates.measurementType;
      }

      if (updates.pairDtOp !== undefined && Array.isArray(updates.pairDtOp)) {
        if (updates.pairDtOp.length === 0) {
          throw new Error("Minimal 1 dump truck harus dipilih");
        }

        payload.pair_dt_op = updates.pairDtOp.map((pair) => ({
          truckId: parseInt(pair.truckId),
          operatorId: parseInt(pair.operatorId),
        }));

        logger.info("🚛 Updating dump trucks", {
          configId,
          pairsCount: payload.pair_dt_op.length,
          pairs: payload.pair_dt_op,
        });
      }

      // ✅ NEW: Add transfer metadata for EDIT mode
      if (updates.isTransfer) {
        payload.isTransfer = true;
      }

      if (
        updates.moveFromFleets &&
        Array.isArray(updates.moveFromFleets) &&
        updates.moveFromFleets.length > 0
      ) {
        payload.moveFromFleets = updates.moveFromFleets;
      }

      const endpoint = `/v1/custom/setting-fleet/${configId}`;

      logger.info("📡 Sending update request", {
        endpoint,
        payload,
        hasPairDtOp: !!payload.pair_dt_op,
        hasInspectors: !!payload.inspectors,
        hasCheckers: !!payload.checkers,
        isTransfer: payload.isTransfer || false,
        transfersCount: payload.moveFromFleets?.length || 0,
      });

      const response = await offlineService.put(endpoint, payload);

      logger.info("✅ Update response received", {
        status: response.status,
        hasData: !!response.data,
      });

      await offlineService.clearCacheByPrefix("fleets");
      await offlineService.clearCacheByPrefix("ritases");

      logger.info("✅ Fleet config updated", {
        id: configId,
        endpoint,
        fieldsUpdated: Object.keys(payload),
        hasDumptrucks: !!payload.pair_dt_op,
        hasInspectors: !!payload.inspectors,
        hasCheckers: !!payload.checkers,
      });

      try {
        const detailResponse = await offlineService.get(
          `/setting-fleets/${configId}`,
          {
            params: {
              populate: [
                "unit_exca",
                "unit_exca.company",
                "loading_location",
                "dumping_location",
                "coal_type",
                "pic_work_unit",
                "weigh_bridge",
                "setting_dump_truck",
                "setting_dump_truck.pair_dt_op",
                "setting_dump_truck.pair_dt_op.dts",
                "setting_dump_truck.pair_dt_op.dts.company",
                "setting_dump_truck.pair_dt_op.ops",
                "checkers",
                "inspectors",
              ],
            },
          },
        );

        logger.info("📦 Detail response received", {
          hasCheckers: !!detailResponse.data?.attributes?.checkers,
          hasInspectors: !!detailResponse.data?.attributes?.inspectors,
          checkersCount:
            detailResponse.data?.attributes?.checkers?.data?.length || 0,
          inspectorsCount:
            detailResponse.data?.attributes?.inspectors?.data?.length || 0,
        });

        const transformedData = this._transformFleetConfig(detailResponse.data);

        logger.info("✅ Updated fleet data transformed", {
          id: transformedData.id,
          unitsCount: transformedData.units?.length || 0,
          checkersCount: transformedData.checkers?.length || 0,
          inspectorsCount: transformedData.inspectors?.length || 0,
          checkerIds: transformedData.checkerIds,
          inspectorIds: transformedData.inspectorIds,
        });

        return {
          success: true,
          data: transformedData,
        };
      } catch (fetchError) {
        logger.error("❌ Could not fetch updated fleet details", {
          configId,
          error: fetchError.message,
        });

        return {
          success: true,
          data: {
            id: configId.toString(),
            ...updates,
          },
        };
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to update fleet config", {
        error: errorMessage,
        details: error.response?.data,
        configId,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  async getFilteredUnitsByFleet(excavatorId) {
    try {
      if (!excavatorId) {
        throw new Error("excavatorId is required");
      }

      logger.info("🔍 Getting filtered units for excavator", { excavatorId });

      const excavators = await masterDataService.fetchUnits({
        type: "EXCAVATOR",
        forceRefresh: false,
      });

      const excavator = excavators.find(
        (e) => String(e.id) === String(excavatorId),
      );

      if (!excavator?.companyId) {
        logger.warn("⚠️ Excavator has no company");
        return { success: true, data: [] };
      }

      const allDumptrucks = await masterDataService.fetchUnits({
        type: "DUMP_TRUCK",
        forceRefresh: false,
      });

      const filteredUnits = allDumptrucks.filter(
        (dt) => String(dt.companyId) === String(excavator.companyId),
      );

      logger.info("✅ Filtered units fetched from cache", {
        excavatorId,
        companyId: excavator.companyId,
        count: filteredUnits.length,
      });

      return { success: true, data: filteredUnits };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      logger.error("❌ Failed to get filtered units by excavator", {
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

  async deleteFleetConfig(configId) {
    try {
      await offlineService.delete(`/v1/custom/setting-fleet/${configId}`);

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

          logger.info("Berhasil menghapus data");
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
          error: `${validationErrors.length}`,
          results: {
            success: [],
            failed: validationErrors,
            total: fleetIds.length,
          },
        };
      }

      for (const fleetId of fleetIds) {
        try {
          await offlineService.delete(`/v1/custom/setting-fleet/${fleetId}`);

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

  _transformFleetConfig(apiResponse) {
    try {
      const item = apiResponse.data || apiResponse;
      const attr = item.attributes || item;

      // ✅ CRITICAL FIX: Validate item has id before proceeding
      if (!item || !item.id) {
        console.error("❌ Invalid fleet item - missing id:", item);
        throw new Error("Fleet data is missing required id field");
      }

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

      const normalizeUserArray = (userData) => {
        if (!userData) return [];

        if (Array.isArray(userData.data)) {
          // ✅ FIX: Filter out undefined/null objects before mapping
          return userData.data
            .filter((user) => user && user.id) // Skip undefined/null objects
            .map((user) => ({
              name: user.attributes?.username || user.attributes?.name || null,
              id: user.id?.toString() || null,
            }));
        }

        const single = normalizeUser(userData);
        return single.id ? [single] : [];
      };

      const inspectors = attr.inspectors
        ? normalizeUserArray(attr.inspectors)
        : attr.inspector
          ? [normalizeUser(attr.inspector)]
          : [];

      const checkers = attr.checkers
        ? normalizeUserArray(attr.checkers)
        : attr.checker
          ? [normalizeUser(attr.checker)]
          : [];

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
          tareWeightUpdatedDate:
            dt.attributes?.tare_weight_updated_date ?? null,
          company: dt.attributes?.company?.data?.attributes?.name || "-",
          companyId: dt.attributes?.company?.data?.id?.toString() || "",
          operator: ops[0]?.attributes?.name || null,
          operatorId: ops[0]?.id?.toString() || null,
          status: dt.attributes?.status || "ON DUTY",
          type_dt: dt.attributes?.type_dt || "Tronton",
          unit_logs: dt.attributes?.unit_logs?.data || [],
          workUnit: dt.attributes?.work_unit?.data?.attributes?.name || "",
          workUnitId: dt.attributes?.work_unit?.data?.id?.toString() || "",
        }));
      });

      const excavatorCompanyData =
        attr.unit_exca?.data?.attributes?.company?.data;
      const excavatorCompanyId = excavatorCompanyData?.id?.toString() || null;
      const excavatorCompany = excavatorCompanyData?.attributes?.name || null;

      return {
        id: item.id?.toString() || "", // ✅ FIX: Added optional chaining

        excavator: attr.unit_exca?.data?.attributes?.hull_no || "",
        excavatorId: attr.unit_exca?.data?.id?.toString() || "",

        excavatorCompanyId,
        excavatorCompany,

        loadingLocation: attr.loading_location?.data?.attributes?.name || "",
        loadingLocationId: attr.loading_location?.data?.id?.toString() || "",

        dumpingLocation: attr.dumping_location?.data?.attributes?.name || "",
        dumpingLocationId: attr.dumping_location?.data?.id?.toString() || "",

        coalType: attr.coal_type?.data?.attributes?.name || "",
        coalTypeId: attr.coal_type?.data?.id?.toString() || "",
        distance: attr.distance || 0,

        workUnit:
          attr.pic_work_unit?.data?.attributes?.satker ||
          attr.pic_work_unit?.data?.attributes?.subsatker ||
          "",
        workUnitId: attr.pic_work_unit?.data?.id?.toString() || "",

        weightBridgeId: attr.weigh_bridge?.data?.id?.toString() || "",
        weightBridge: attr.weigh_bridge?.data?.attributes?.name || "",

        checker: checkers.length > 0 ? checkers[0].name : null,
        checkerId: checkers.length > 0 ? checkers[0].id : null,
        checkers: checkers,
        checkerIds: checkers.map((c) => c.id).filter(Boolean),

        inspector: inspectors.length > 0 ? inspectors[0].name : null,
        inspectorId: inspectors.length > 0 ? inspectors[0].id : null,
        inspectors: inspectors,
        inspectorIds: inspectors.map((i) => i.id).filter(Boolean),

        settingDumpTruckId: attr.setting_dump_truck?.data?.id?.toString() || "",
        dumptruckCount: dumptrucks.length,
        units: dumptrucks,

        measurementType: attr.measurement_type,

        isSplit: attr.isSplit === true || attr.isSplit === "true",

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
