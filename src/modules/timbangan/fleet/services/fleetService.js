import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { buildDateRangeCacheKey } from "@/shared/utils/cache";

const CACHE_TTL = {
  FLEET_TODAY: 5 * 60 * 1000,
  FLEET_HISTORY: 30 * 60 * 1000,
  MASTERS: 30 * 60 * 1000,
};

const isToday = (dateRange) => {
  if (!dateRange?.from || !dateRange?.to) return false;

  const today = new Date().toISOString().split("T")[0];
  return dateRange.from === today && dateRange.to === today;
};

const getTTL = (dateRange) => {
  return isToday(dateRange) ? CACHE_TTL.FLEET_TODAY : CACHE_TTL.FLEET_HISTORY;
};

const buildFilters = (options = {}) => {
  const { user, dateRange, shift, measurementType } = options;
  const filters = {};

  if (dateRange !== null && dateRange !== undefined) {
    if (dateRange?.from && dateRange?.to) {
      filters.date = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
      logger.info("📅 Date range filter applied", {
        from: dateRange.from,
        to: dateRange.to,
      });
    } else if (dateRange?.from) {
      filters.date = { $gte: dateRange.from };
      logger.info("📅 Date from filter applied", { from: dateRange.from });
    } else if (dateRange?.to) {
      filters.date = { $lte: dateRange.to };
      logger.info("📅 Date to filter applied", { to: dateRange.to });
    }
  } else {
    logger.info("📅 No date filter - showing ALL ACTIVE fleet");
  }

  if (shift && shift !== "all") {
    filters.shift = { $eq: shift };
    logger.info("🔄 Shift filter applied", { shift });
  }

  if (user?.weigh_bridge?.id) {
    filters.weigh_bridge = {
      id: { $eq: parseInt(user.weigh_bridge.id) },
    };
    logger.info("Filter weigh_bridge applied", {
      weighBridgeId: user.weigh_bridge.id,
    });
  }

  // ✅ NEW: Measurement Type Filter
  if (measurementType) {
    filters.measurement_type = { $eq: measurementType };
    logger.info("📏 Measurement type filter applied", { measurementType });
  }

  logger.info("📋 buildFilters result", filters);
  return filters;
};

export const fleetService = {
 async fetchFleetConfigs(options = {}) {
    try {
      const {
        user,
        viewMode = "normal",
        forceRefresh = false,
        dateRange = null,
        shift = null,
        measurementType = null, // ✅ NEW parameter
      } = options;

      const filters = buildFilters({
        user,
        viewMode,
        dateRange,
        shift,
        measurementType, // ✅ Pass to buildFilters
      });
      
      const cacheKey = buildDateRangeCacheKey("fleets", dateRange, {
        userId: user?.id || "nouser",
        mode: viewMode,
        shift: shift && shift !== "all" ? shift : undefined,
        measurementType: measurementType || undefined, // ✅ Include in cache key
      });
      
      const ttl = getTTL(dateRange);

      logger.info("🔍 Fetching fleet configs", {
        viewMode,
        dateRange,
        measurementType, // ✅ Log measurement type
        filters: JSON.stringify(filters),
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh,
      });

      if (forceRefresh && dateRange) {
        await offlineService.clearCache(cacheKey);
      }

      const response = await offlineService.get("/setting-fleets", {
        params: {
          populate: [
            "unit_exca",
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
          pagination: { pageSize: 100 },
        },
        cacheKey,
        ttl,
        forceRefresh,
      });

      const configs = response.data.map((item) =>
        this._transformFleetConfig(item)
      );

      logger.info(`✅ Fleet configs fetched: ${configs.length}`, {
        viewMode,
        dateRange,
        measurementType, // ✅ Log measurement type
        cached: !forceRefresh,
      });

      return { success: true, data: configs };
    } catch (error) {
      logger.error("❌ Failed to fetch fleet configs", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  async reactivateFleet(configId, newStatus = "INACTIVE") {
    try {
      if (!["ACTIVE", "INACTIVE"].includes(newStatus)) {
        throw new Error("Status harus ACTIVE atau INACTIVE");
      }

      const getCurrentResponse = await offlineService.get(
        `/setting-fleets/${configId}`,
        { params: { populate: ["unit_exca"] } }
      );

      const currentStatus = getCurrentResponse.data?.attributes?.status;

      if (currentStatus !== "CLOSED") {
        throw new Error(
          `Fleet dengan status ${currentStatus} tidak bisa direaktivasi`
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
      logger.error("❌ Failed to reactivate fleet", { error: error.message });
      return {
        success: false,
        error: error.message,
        message: error.message || "Gagal mereaktivasi fleet",
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

      if (configData.weightBridgeId) {
        payload.weigh_bridge = parseInt(configData.weightBridgeId);
      }

      const response = await offlineService.post(
        "/v1/custom/setting-fleet",
        payload
      );

      await offlineService.clearCache("fleets_");

      logger.info("✅ Fleet config created with clientCreatedAt", {
        id: response.data?.data?.id || response.data?.id,
        clientCreatedAt: now,
      });

      return {
        success: true,
        data: this._transformFleetConfig(response.data),
        setting_fleet_id: response.data?.data?.id || response.data?.id,
      };
    } catch (error) {
      logger.error("❌ Failed to create fleet config", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
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
      if (updates.shift !== undefined) {
        payload.data.shift = updates.shift;
      }
      if (updates.date !== undefined) {
        payload.data.date = updates.date;
      }
      if (updates.status !== undefined) {
        payload.data.status = updates.status;
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

      await offlineService.clearCache("fleets_");

      logger.info("✅ Fleet config updated", {
        id: configId,
        endpoint,
      });

      return {
        success: true,
        data: this._transformFleetConfig(response.data),
      };
    } catch (error) {
      logger.error("❌ Failed to update fleet config", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  },

  async deleteFleetConfig(configId) {
    try {
      await offlineService.delete(`/setting-fleets/${configId}`);

      await offlineService.clearCache("fleets_");

      logger.info("🗑️ Fleet config deleted", { id: configId });
      return { success: true, message: "Konfigurasi berhasil dihapus" };
    } catch (error) {
      logger.error("❌ Failed to delete fleet config", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
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
        (c) => c.status === "ACTIVE" && c.id !== configId.toString()
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
      logger.error("❌ Failed to set active fleet config", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
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

      /**
       * ================================
       * DUMP TRUCK & OPERATOR (PAIR)
       * ================================
       */
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

      return {
        id: item.id.toString(),

        name: `Fleet ${attr.shift || "-"} - ${attr.date || "-"} - ${
          attr.unit_exca?.data?.attributes?.hull_no || "N/A"
        }`,

        excavator: attr.unit_exca?.data?.attributes?.hull_no || "",
        excavatorId: attr.unit_exca?.data?.id?.toString() || "",

        loadingLocation: attr.loading_location?.data?.attributes?.name || "",
        loadingLocationId: attr.loading_location?.data?.id?.toString() || "",

        dumpingLocation: attr.dumping_location?.data?.attributes?.name || "",
        dumpingLocationId: attr.dumping_location?.data?.id?.toString() || "",

        shift: attr.shift || "",
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