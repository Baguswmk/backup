import { offlineService } from "@/shared/services/offlineService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { logger } from "@/shared/services/log";
import { buildDateRangeCacheKey } from "@/shared/utils/cache";
import { formatWeight } from "@/shared/utils/number";

const validateDateRange = (filters) => {
  if (!filters.startDate || !filters.endDate) return { valid: true };

  const start = new Date(filters.startDate);
  const end = new Date(filters.endDate);
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (diffDays > 90) {
    return {
      valid: false,
      error: `Date range terlalu besar (${diffDays} hari). Maksimal 90 hari untuk performa optimal.`,
      warning: true,
    };
  }

  if (diffDays > 30) {
    logger.warn("⚠️ Large date range requested", { days: diffDays });
  }

  return { valid: true, days: diffDays };
};

const getWorkShiftInfo = ()=> {
  const now = new Date();
  const currentHour = now.getHours();
  let workDate = new Date(now);
  let shift;
  
  if (currentHour >= 22 || currentHour < 6) {
    shift = "Shift 1";
    if (currentHour >= 22) {
      workDate.setDate(workDate.getDate() + 1);
    }
  } else if (currentHour >= 6 && currentHour < 14) {
    shift = "Shift 2";
  } else {
    shift = "Shift 3";
  }
  
  // Format tanggal ke 'YYYY-MM-DD'
  const year = workDate.getFullYear();
  const month = String(workDate.getMonth() + 1).padStart(2, "0");
  const day = String(workDate.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  
  return {
    date: formattedDate,
    shift: shift,
  };
}

export const ritaseServices = {
async fetchSummaryFleetByRitases(options = {}) {
  try {
    const { user, dateRange, shift, forceRefresh = false } = options;
    // Gunakan getWorkShiftInfo untuk mendapatkan tanggal dan shift default
    const workShiftInfo = await getWorkShiftInfo();
    
    const effectiveDateRange = dateRange || {
      from: workShiftInfo.date,
      to: workShiftInfo.date
    };
    const effectiveShift = shift || workShiftInfo.shift;

    const queryParams = {
      startDate: effectiveDateRange.from,
      endDate: effectiveDateRange.to,
      shift: effectiveShift,
    };

    const cacheKey = `summary_fleet_${queryParams.startDate}_${queryParams.endDate}_${queryParams.shift}_${user?.id || "guest"}`;

    // Cek apakah tanggal yang digunakan adalah tanggal kerja hari ini
    const isToday = effectiveDateRange.from === workShiftInfo.date;
    const ttl = isToday
      ? offlineService.CACHE_CONFIG.SHORT
      : offlineService.CACHE_CONFIG.MEDIUM;

    logger.info("📊 Fetching summary fleet by ritases", {
      queryParams,
      cacheKey,
      ttl: `${ttl / 1000}s`,
      forceRefresh,
      isToday,
      workShiftInfo, // Log info shift kerja
    });

    if (!forceRefresh) {
      const cached = await offlineService.getCache(cacheKey);
      if (cached) {
        logger.info("✅ Summary fleet loaded from cache", {
          summariesCount: cached.summaries?.length || 0,
          ritasesCount: cached.ritases?.length || 0,
        });
        return {
          success: true,
          data: cached,
          fromCache: true,
        };
      }
    }

    const response = await offlineService.get("/v1/custom/ritase/summaries", {
      params: queryParams,
      cacheKey,
      ttl,
      forceRefresh,
    });

    const data = {
      summaries: response.data?.summaries || [],
      ritases: response.data?.ritases || [],
    };

    logger.info("✅ Summary fleet fetched from API", {
      summariesCount: data.summaries.length,
      ritasesCount: data.ritases.length,
      dateRange: effectiveDateRange,
      shift: effectiveShift,
    });

    return {
      success: true,
      data,
      fromCache: false,
    };
  } catch (error) {
    logger.error("❌ Failed to fetch summary fleet", {
      error: error.message,
      details: error.response?.data,
    });

    // Gunakan getWorkShiftInfo untuk fallback cache key
    const workShiftInfo = await getWorkShiftInfo();
    const fallbackDate = options.dateRange?.from || workShiftInfo.date;
    const fallbackDateTo = options.dateRange?.to || workShiftInfo.date;
    const fallbackShift = options.shift || workShiftInfo.shift;
    
    const cacheKey = `summary_fleet_${fallbackDate}_${fallbackDateTo}_${fallbackShift}_${options.user?.id || "guest"}`;
    const stale = await offlineService.getCache(cacheKey, true);

    if (stale) {
      logger.warn("⚠️ Returning stale cache due to API error");
      return {
        success: true,
        data: stale,
        fromCache: true,
        offline: true,
      };
    }

    return {
      success: false,
      data: { summaries: [], ritases: [] },
      error: error.response?.data?.message || error.message,
    };
  }
},

  async fetchMasters(options = {}) {
    try {
      const { forceRefresh = false, userRole, userCompanyId } = options;

      logger.info("📦 Fetching masters via masterDataService", {
        forceRefresh,
        userRole,
      });

      const masters = await masterDataService.fetchAllMasters({
        forceRefresh,
        userRole,
        userCompanyId,
      });

      const ritaseMasters = {
        excavators: masters.excavators.map((e) => ({
          id: e.id,
          name: e.hull_no,
          hull_no: e.hull_no,
          company: e.company,
          companyId: e.companyId,
          work_unit: e.workUnit,
          workUnitId: e.workUnitId,
        })),

        dumptrucks: masters.dumptrucks.map((d) => ({
          id: d.id,
          hullNo: d.hull_no,
          hull_no: d.hull_no,
          label: d.hull_no,
          company: d.company,
          companyId: d.companyId,
          contractor: d.company,
          capacity: 20,
          settingDumpTruckId: d.settingDumpTruckId,
        })),

        locations: {
          loading: masters.locations.filter((l) => l.type === "LOADING"),
          dumping: masters.locations.filter((l) => l.type === "DUMPING"),
        },

        operators: masters.operators.map((o) => ({
          id: o.id,
          name: o.name,
          company: o.company,
          companyId: o.companyId,
        })),

        companies: masters.companies.map((c) => ({
          id: c.id,
          name: c.name,
        })),

        workUnits: masters.workUnits.map((w) => ({
          id: w.id,
          satker: w.satker,
          subsatker: w.subsatker,
        })),

        coalTypes: masters.coalTypes.map((ct) => ({
          id: ct.id,
          name: ct.name,
        })),

        shifts: [
          { id: "PAGI", name: "Shift Pagi", hours: "06:00-18:00" },
          { id: "MALAM", name: "Shift Malam", hours: "18:00-06:00" },
        ],
      };

      logger.info("✅ Masters fetched via centralized service", {
        excavators: ritaseMasters.excavators.length,
        dumptrucks: ritaseMasters.dumptrucks.length,
        operators: ritaseMasters.operators.length,
        fromCache: !forceRefresh,
      });

      return { success: true, data: ritaseMasters, fromCache: !forceRefresh };
    } catch (error) {
      logger.error("❌ Failed to fetch masters", {
        error: error.message,
      });

      const stale = masterDataService.getStaleCache();
      if (stale && Object.keys(stale).length > 0) {
        logger.warn("⚠️ Returning stale cache due to API error");

        const ritaseMasters = {
          excavators: (stale.excavators || []).map((e) => ({
            id: e.id,
            name: e.hull_no,
            hull_no: e.hull_no,
            company: e.company,
            companyId: e.companyId,
          })),
          dumptrucks: (stale.dumptrucks || []).map((d) => ({
            id: d.id,
            hullNo: d.hull_no,
            label: d.hull_no,
            company: d.company,
          })),
          locations: {
            loading: (stale.locations || []).filter(
              (l) => l.type === "LOADING",
            ),
            dumping: (stale.locations || []).filter(
              (l) => l.type === "DUMPING",
            ),
          },
          operators: stale.operators || [],
          companies: stale.companies || [],
          workUnits: stale.workUnits || [],
          coalTypes: stale.coalTypes || [],
          shifts: [
            { id: "PAGI", name: "Shift Pagi" },
            { id: "MALAM", name: "Shift Malam" },
          ],
        };

        return {
          success: true,
          data: ritaseMasters,
          fromCache: true,
          offline: true,
        };
      }

      throw error;
    }
  },

  async fetchOperators(options = {}) {
    try {
      const { forceRefresh = false, userRole, userCompanyId } = options;

      logger.info("👷 Fetching operators via masterDataService");

      const operators = await masterDataService.fetchOperators({
        forceRefresh,
        userRole,
        userCompanyId,
      });

      const transformed = operators.map((item) => ({
        id: item.id,
        name: item.name,
        company: item.company,
        companyId: item.companyId,
      }));

      return { success: true, data: transformed };
    } catch (error) {
      logger.error("❌ Failed to fetch operators", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  async fetchFleetConfigs(options = {}) {
    try {
      const { dateRange } = options || {};
      const filters = { status: { $ne: "CLOSED" } };

      if (dateRange?.from && dateRange?.to) {
        filters.date = {
          $gte: dateRange.from,
          $lte: dateRange.to,
        };
        logger.info("📅 Date range filter applied to fleet configs", {
          from: dateRange.from,
          to: dateRange.to,
        });
      }

      const cacheKey =
        dateRange?.from && dateRange?.to
          ? `fleet_configs_${dateRange.from}_${dateRange.to}`
          : "fleet_configs_all";

      const ttl = offlineService.getTTLForDate(dateRange, "fleet");

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
            "checker",
            "inspector",
          ],
          filters,
          sort: ["id:desc"],
          pagination: { pageSize: 100 },
        },
        cacheKey,
        ttl,
      });

      const normalizeUser = (userData) => {
        if (!userData) return { name: null, id: null };

        if (typeof userData === "number" || typeof userData === "string") {
          return { name: null, id: String(userData) };
        }

        if (userData.data) {
          const userObj = userData.data;
          return {
            name:
              userObj.username || userObj.attributes?.name || null,
            id: userObj.id ? String(userObj.id) : null,
          };
        }

        if (userData.attributes) {
          return {
            name:
              userData.attributes.username || userData.attributes.name || null,
            id: userData.id ? String(userData.id) : null,
          };
        }

        return {
          name: userData.username || userData.name || null,
          id: userData.id ? String(userData.id) : null,
        };
      };

      const configs = response.data.map((item) => {
        const inspector = normalizeUser(item.attributes.inspector);
        const checker = normalizeUser(item.attributes.checker);

        return {
          id: item.id.toString(),
          name: `Fleet ${item.attributes.shift || "-"} - ${
            item.attributes.date || "-"
          } - ${item.attributes.unit_exca?.data?.attributes?.hull_no || "N/A"}`,
          excavator: item.attributes.unit_exca?.data?.attributes?.hull_no || "",
          excavatorId: item.attributes.unit_exca?.data?.id?.toString() || "",
          loadingLocation:
            item.attributes.loading_location?.data?.attributes?.name || "",
          loadingLocationId:
            item.attributes.loading_location?.data?.id?.toString() || "",
          dumpingLocation:
            item.attributes.dumping_location?.data?.attributes?.name || "",
          dumpingLocationId:
            item.attributes.dumping_location?.data?.id?.toString() || "",
          shift: item.attributes.shift || "",
          date: item.attributes.date || "",
          coalType: item.attributes.coal_type?.data?.attributes?.name || "",
          coalTypeId: item.attributes.coal_type?.data?.id?.toString() || "",
          distance: item.attributes.distance || 0,
          status: item.attributes.status || "INACTIVE",
          workUnit:
            item.attributes.pic_work_unit?.data?.attributes?.satker ||item.attributes.pic_work_unit?.data?.attributes?.subsatker || "",
          workUnitId: item.attributes.pic_work_unit?.data?.id?.toString() || "",
          dumptruck:
            item.attributes.setting_dump_truck?.data?.attributes?.unit_dump_trucks?.data?.map(
              (unit) => ({
                id: unit.id?.toString() || "",
                hull_no: unit.attributes?.hull_no || "",
                type: unit.attributes?.type || "",
                company:
                  unit.attributes?.company?.data?.attributes?.name || "-",
                companyId: unit.attributes?.company?.data?.id?.toString() || "",
                workUnit:
                  item.attributes.pic_work_unit?.data?.attributes?.satker ||unit.attributes?.work_unit?.data?.attributes?.subsatker ||
                  "-",
                workUnitId:
                  unit.attributes?.work_unit?.data?.id?.toString() || "",
                status: unit.attributes?.status || "active",
              }),
            ) || [],
          dumptruckCount:
            item.attributes.setting_dump_truck?.data?.attributes
              ?.unit_dump_trucks?.data?.length || 0,
          settingDumpTruckId:
            item.attributes.setting_dump_truck?.data?.id?.toString() || null,
          checker: checker.name,
          checkerId: checker.id,
          inspector: inspector.name,
          inspectorId: inspector.id,
          createdAt: item.attributes.createdAt,
          updatedAt: item.attributes.updatedAt,
        };
      });

      logger.info("✅ Fleet configs fetched", {
        count: configs.length,
        cacheKey,
        ttl: `${ttl / 1000}s`,
      });
      return { success: true, data: configs };
    } catch (error) {
      logger.error("❌ Failed to fetch fleet configs", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  async fetchTimbanganData(filters = {}) {
    try {
      const { user, measurementType } = filters;

      const validation = validateDateRange(filters);
      if (!validation.valid) {
        logger.warn("⚠️ Date range validation failed", {
          error: validation.error,
        });

        if (validation.warning) {
          logger.warn(validation.error);
        } else {
          return {
            success: false,
            data: [],
            error: validation.error,
          };
        }
      }

      const apiFilters = {};

      if (measurementType) {
        apiFilters.measurement_type = { $eq: measurementType };
      }

      if (filters.startDate && filters.endDate) {
        apiFilters.date = {
          $gte: filters.startDate,
          $lte: filters.endDate,
        };
      } else if (filters.startDate) {
        apiFilters.date = { $gte: filters.startDate };
      } else if (filters.endDate) {
        apiFilters.date = { $lte: filters.endDate };
      }

      if (filters.shift && filters.shift !== "All") {
        apiFilters.shift = { $eq: filters.shift };
      }

      if (user) {
        const role = user.role?.toLowerCase();

        switch (role) {
          case "operator_jt":
            if (user.weigh_bridge?.name) {
              apiFilters.weigh_bridge = { $eq: user.weigh_bridge.name };
            }
            break;

          case "ccr":
          case "pengawas":
          case "evaluator":
          case "pic":
            if (user.work_unit?.subsatker) {
              apiFilters.pic_work_unit = { $eq: user.work_unit.subsatker };
            }
            break;

          case "mitra":
          case "checker":
          case "admin":
            break;

          case "super_admin":
            break;
        }
      }

      const params = {
        populate: ["created_by_user", "updated_by_user"],
        sort: ["createdAt:desc"],
        pagination: { pageSize: 100 },
        filters: apiFilters,
      };

      const dateRange =
        filters.startDate && filters.endDate
          ? { from: filters.startDate, to: filters.endDate }
          : null;

      const cacheKey = buildDateRangeCacheKey("ritases", dateRange, {
        userId: user?.id,
        measurementType,
        shift: filters.shift,
      });

      const ttl = offlineService.getTTLForDate(dateRange, "ritase");

      logger.info("🔍 Fetching ritase data", {
        filters: apiFilters,
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh: filters.forceRefresh,
        dateRange: validation.days ? `${validation.days} days` : "all",
        role: user?.role,
        measurementType,
        shift: filters.shift,
      });

      const response = await offlineService.get("/ritases", {
        params,
        cacheKey,
        ttl,
        forceRefresh: filters.forceRefresh || false,
      });

      const data = response.data.map((item) => {
        const attr = item.attributes;

        return {
          id: item.id.toString(),

          tare_weight: attr.tare_weight || 0,
          net_weight: attr.net_weight || 0,
          gross_weight: attr.gross_weight || 0,

          operator: attr.operator || "-",
          loading_location: attr.loading_location || "-",
          dumping_location: attr.dumping_location || "-",
          unit_dump_truck: attr.unit_dump_truck || "-",
          hull_no: attr.unit_dump_truck || "-",
          dumptruck: attr.unit_dump_truck || "-",

          unit_exca: attr.unit_exca || "-",
          excavator: attr.unit_exca || "-",

          shift: attr.shift || "-",
          coal_type: attr.coal_type || "-",
          checker: attr.checker || "-",
          inspector: attr.inspector || "-",
          pic_work_unit: attr.pic_work_unit || "-",
          work_unit: attr.pic_work_unit || "-",
          weigh_bridge: attr.weigh_bridge || "-",
          measurement_type: attr.measurement_type || "Timbangan",
          spph: attr.spph || "-",

          date: attr.date || null,
          tanggal: attr.date || attr.createdAt?.split("T")[0] || "",

          distance: attr.distance || 0,
          id_setting_fleet: attr.id_setting_fleet || null,

          operatorName: attr.operator || "-",
          operatorId: null,
          operatorCompany: "-",

          dumptruckId: null,
          dumptruckCompany: "-",

          fleet_excavator: attr.unit_exca || null,
          fleet_shift: attr.shift || null,
          fleet_date: attr.date || null,
          fleet_loading: attr.loading_location || null,
          fleet_dumping: attr.dumping_location || null,
          fleet_coal_type: attr.coal_type || null,
          fleet_checker: attr.checker || null,
          fleet_inspector: attr.inspector || null,
          fleet_work_unit: attr.pic_work_unit || null,
          fleet_weigh_bridge: attr.weigh_bridge || null,
          setting_fleet_id: attr.id_setting_fleet?.toString() || null,

          clientCreatedAt: attr.clientCreatedAt || attr.createdAt,
          timestamp: attr.createdAt,
          createdAt: attr.createdAt,
          updatedAt: attr.updatedAt,

          created_by_user: attr.created_by_user?.data?.id?.toString() || null,
          updated_by_user: attr.updated_by_user?.data?.id?.toString() || null,
        };
      });

      logger.info("✅ Timbangan data fetched successfully", {
        count: data.length,
        cacheKey,
        cached: !filters.forceRefresh,
        role: user?.role,
        measurementType,
        shift: filters.shift,
      });

      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch ritase data", {
        error: error.message,
        details: error.response?.data,
      });
      return {
        success: false,
        data: [],
        error: error.response?.data?.message || error.message,
      };
    }
  },

  async createManualRitase(data) {
    try {
      const payload = {
        date: data.date,
        shift: data.shift,

        checker: data.checker ? parseInt(data.checker) : null,
        inspector: data.inspector ? parseInt(data.inspector) : null,

        // Backend expects these exact field names:
        loading_location: parseInt(data.loading_location),
        dumping_location: parseInt(data.dumping_location),
        unit_exca: parseInt(data.unit_exca),
        measurement_type: data.measurement_type,
        distance: parseFloat(data.distance) || 0,
        coal_type: parseInt(data.coal_type),
        pic_work_unit: parseInt(data.pic_work_unit),
        unit_dump_truck: parseInt(data.unit_dump_truck),
        operator: data.operator ? parseInt(data.operator) : null,
      };

      // Handle weight based on measurement type
      if (data.measurement_type === "Bypass") {
        if (data.gross_weight) {
          payload.gross_weight = parseFloat(data.gross_weight);
        }
      } else {
        // For Timbangan
        if (data.gross_weight) {
          payload.gross_weight = parseFloat(data.gross_weight);
        } else if (data.net_weight) {
          payload.net_weight = parseFloat(data.net_weight);
        }
      }

      logger.info("📤 CREATE Manual Ritase Payload:", payload);

      const response = await offlineService.post(
        "/v1/custom/ritase/manual",
        payload,
      );

      const serverData = response.data || {};

      logger.info("✅ Manual Ritase Created:", serverData);

      return {
        success: true,
        data: {
          id: serverData.id?.toString(),
          ...serverData,
        },
        message: "Data ritase berhasil ditambahkan",
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        "Gagal menyimpan data ritase";

      logger.error("❌ Failed to create manual ritase", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  async duplicateRitase(data) {
    try {
      const payload = {
          unit_dump_truck: data.unit_dump_truck,
          operator: data.operator,
          date: data.date,
          shift: data.shift,
          company:data.company,
          tare_weight:data.tare_weight,
          pic_dumping_point: data.pic_dumping_point,
          pic_loading_point: data.pic_loading_point,
          unit_exca: data.unit_exca,
          loading_location: data.loading_location,
          dumping_location: data.dumping_location,
          measurement_type: data.measurement_type,
          coal_type: data.coal_type,
          pic_work_unit: data.pic_work_unit,
          checker: data.checker,
          inspector: data.inspector,
          created_by_user: data.created_by_user,
          distance: parseFloat(data.distance) || 0,

          id_setting_fleet: data.id_setting_fleet || null,
          weigh_bridge: data.weigh_bridge || null,
          spph: data.spph || null,
      };

      if (data.measurement_type === "Timbangan") {
        if (data.gross_weight !== undefined && data.gross_weight !== null) {
          payload.gross_weight = parseFloat(data.gross_weight);
        }
        if (data.net_weight !== undefined && data.net_weight !== null) {
          payload.net_weight = parseFloat(data.net_weight);
        }
      }

      logger.info("📤 DUPLICATE Ritase Payload:", payload);

      const response = await offlineService.post("/v1/custom/ritase/manual", payload);

      const serverData = response.data || {};

      logger.info("✅ Ritase Duplicated:", serverData);

      // Clear cache untuk refresh data
      await offlineService.clearCache("ritases_");
      await offlineService.clearCache("summary_fleet_");

      return {
        success: true,
        data: {
          id: serverData.id?.toString(),
          ...serverData,
        },
        message: "Data ritase berhasil diduplikasi",
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        "Gagal menduplikasi data ritase";

      logger.error("❌ Failed to duplicate ritase", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  async submitTimbanganForm(formData, type) {
    try {
      const now = new Date().toISOString();

      const payload = {
        setting_fleet: formData.setting_fleet
          ? parseInt(formData.setting_fleet)
          : null,
        unit_dump_truck: formData.unit_dump_truck
          ? parseInt(formData.unit_dump_truck)
          : null,
        operator: formData.operator ? parseInt(formData.operator) : null,
        created_at: formData.clientCreatedAt || now,
      };

      const measurementType = formData.measurement_type || "Timbangan";
      const hasWeighBridge = formData.has_weigh_bridge;

      if (measurementType === "Timbangan") {
        if (hasWeighBridge) {
          if (
            formData.gross_weight !== undefined &&
            formData.gross_weight !== null
          ) {
            const grossWeight = formatWeight(formData.gross_weight);
            payload.gross_weight = parseFloat(grossWeight);
          }
        } else {
          if (
            formData.net_weight !== undefined &&
            formData.net_weight !== null
          ) {
            const netWeight = formatWeight(formData.net_weight);
            payload.net_weight = parseFloat(netWeight);
          }
        }
      }

      if (formData.created_by_user) {
        payload.created_by_user = parseInt(formData.created_by_user);
      }

      if (!payload.setting_fleet)
        throw new Error("Setting fleet wajib dipilih");
      if (!payload.unit_dump_truck) throw new Error("Dump truck wajib dipilih");

      if (measurementType === "Timbangan") {
        if (hasWeighBridge) {
          if (!payload.gross_weight || payload.gross_weight <= 0)
            throw new Error("Gross weight harus lebih dari 0");
        } else {
          if (!payload.net_weight || payload.net_weight <= 0)
            throw new Error("Net weight harus lebih dari 0");
        }
      }

      logger.info("📤 CREATE Ritase Payload:", {
        ...payload,
        measurementType,
        hasWeighBridge,
        hasGrossWeight: !!payload.gross_weight,
        hasNetWeight: !!payload.net_weight,
      });

      const response = await offlineService.post("/v1/custom/ritase", payload);

      const serverData = response.data || {};

      logger.info("✅ Server Response:", serverData);

      const result = {
        id: serverData.id?.toString(),
        dumptruckId: payload.unit_dump_truck,
        operatorId: payload.operator,
        setting_fleet_id: payload.setting_fleet,

        net_weight: serverData.net_weight || formData.net_weight || 0,
        tare_weight: serverData.tare_weight || 0,
        gross_weight: serverData.gross_weight || formData.gross_weight || 0,

        hull_no: serverData.unit_dump_truck || formData.hull_no || null,
        unit_dump_truck: serverData.unit_dump_truck || formData.hull_no || null,
        dumptruck: serverData.unit_dump_truck || formData.hull_no || null,
        dumptruckCompany: formData.dumptruck_company || "-",

        operator: serverData.operator || formData.operator_name || null,
        operatorName: serverData.operator || formData.operator_name || null,
        operatorCompany: formData.operator_company || "-",

        unit_exca: serverData.unit_exca || formData.fleet_excavator || null,
        excavator: serverData.unit_exca || formData.fleet_excavator || null,
        fleet_excavator:
          serverData.unit_exca || formData.fleet_excavator || null,

        loading_location:
          serverData.loading_location || formData.fleet_loading || null,
        dumping_location:
          serverData.dumping_location || formData.fleet_dumping || null,
        fleet_loading:
          serverData.loading_location || formData.fleet_loading || null,
        fleet_dumping:
          serverData.dumping_location || formData.fleet_dumping || null,

        shift: serverData.shift || formData.fleet_shift || null,
        fleet_shift: serverData.shift || formData.fleet_shift || null,
        date: serverData.date || formData.fleet_date || null,
        fleet_date: serverData.date || formData.fleet_date || null,
        tanggal: (serverData.date || serverData.createdAt || now).split("T")[0],
        distance: serverData.distance || formData.distance || 0,

        coal_type: serverData.coal_type || formData.fleet_coal_type || null,
        fleet_coal_type:
          serverData.coal_type || formData.fleet_coal_type || null,
        pic_work_unit:
          serverData.pic_work_unit || formData.fleet_work_unit || null,
        fleet_work_unit:
          serverData.pic_work_unit || formData.fleet_work_unit || null,
        work_unit: serverData.pic_work_unit || formData.fleet_work_unit || null,

        checker: serverData.checker || formData.fleet_checker || null,
        fleet_checker: serverData.checker || formData.fleet_checker || null,
        inspector: serverData.inspector || formData.fleet_inspector || null,
        fleet_inspector:
          serverData.inspector || formData.fleet_inspector || null,

        weigh_bridge:
          serverData.weigh_bridge || formData.fleet_weigh_bridge || null,
        fleet_weigh_bridge:
          serverData.weigh_bridge || formData.fleet_weigh_bridge || null,

        measurement_type:
          serverData.measurement_type ||
          formData.measurement_type ||
          "Timbangan",

        fleet_name: formData.fleet_name || null,

        clientCreatedAt: payload.created_at,
        timestamp: serverData.createdAt || now,
        createdAt: serverData.createdAt || now,
        updatedAt: serverData.updatedAt || now,
        created_by_user: payload.created_by_user,
      };

      logger.info("✅ Ritase created with complete data for printing", {
        id: result.id,
        hull_no: result.hull_no,
        excavator: result.excavator,
        shift: result.shift,
        gross_weight: result.gross_weight,
        net_weight: result.net_weight,
        measurement_type: result.measurement_type,
        hasAllRequiredFields: !!(
          result.id &&
          result.hull_no &&
          result.excavator &&
          result.shift
        ),
      });
      return {
        success: true,
        data: result,
        message: "Data berhasil disimpan",
      };
    } catch (error) {
      const isQueued =
        error?.queued ||
        error?.message?.includes("queued for offline sync") ||
        error?.message?.includes("Request queued");

      if (isQueued) {
        logger.info("📤 Ritase queued for offline sync", {
          message: error.message,
        });

        return {
          success: true,
          queued: true,
          message: "Data disimpan offline dan akan tersinkron otomatis",
          data: null,
        };
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message ||
        "Gagal menyimpan data";

      logger.error("Failed to create ritase", {
        error: errorMessage,
        details: error.response?.data,
        status: error.response?.status,
      });

      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  },

  async editTimbanganForm(formData, editId) {
    try {
      const payload = {
        unit_dump_truck: formData.unit_dump_truck,
        unit_exca: formData.unit_exca,
        loading_location: formData.loading_location,
        dumping_location: formData.dumping_location,
        shift: formData.shift,
        date: formData.date,
        distance: parseFloat(formData.distance),
        coal_type: formData.coal_type,
        pic_work_unit: formData.pic_work_unit,
        updated_by_user: formData.updated_by_user || null,
      };

      // Handle weight based on which field is provided
      if (formData.gross_weight !== undefined && formData.gross_weight !== null) {
        const grossWeight = formatWeight(formData.gross_weight);
        payload.gross_weight = parseFloat(grossWeight);
        
        if (payload.gross_weight <= 0) {
          throw new Error("Gross weight harus lebih dari 0");
        }
      }
      
      if (formData.net_weight !== undefined && formData.net_weight !== null) {
        const netWeight = formatWeight(formData.net_weight);
        payload.net_weight = parseFloat(netWeight);
        
        if (payload.net_weight <= 0) {
          throw new Error("Net weight harus lebih dari 0");
        }
      }

      if (formData.operator) {
        payload.operator = formData.operator;
      }

      // Validations
      if (!payload.unit_dump_truck) throw new Error("Dump truck wajib dipilih");
      if (!payload.unit_exca) throw new Error("Excavator wajib dipilih");
      if (!payload.loading_location)
        throw new Error("Loading location wajib dipilih");
      if (!payload.dumping_location)
        throw new Error("Dumping location wajib dipilih");
      if (!payload.shift) throw new Error("Shift wajib dipilih");
      if (!payload.date) throw new Error("Date wajib diisi");
      if (!payload.coal_type) throw new Error("Coal type wajib dipilih");
      if (!payload.pic_work_unit) throw new Error("Work unit wajib dipilih");

      logger.info("📤 EDIT Ritase Payload (with LABELS):", {
        id: editId,
        payload,
      });

      const response = await offlineService.put(
        `/v1/custom/ritase/${editId}`,
        payload,
      );

      const result = {
        id: response.data?.id?.toString() || editId,
        net_weight: response.data?.net_weight || 0,
        tare_weight: response.data?.tare_weight || 0,
        gross_weight: response.data?.gross_weight || 0,

        hull_no:
          response.data?.unit_dump_truck || payload.unit_dump_truck,
        unit_dump_truck:
          response.data?.unit_dump_truck || payload.unit_dump_truck,
        dumptruck:
          response.data?.unit_dump_truck || payload.unit_dump_truck,
        unit_exca: response.data?.unit_exca || payload.unit_exca,
        excavator: response.data?.unit_exca || payload.unit_exca,
        loading_location:
          response.data?.loading_location ||
          payload.loading_location,
        dumping_location:
          response.data?.dumping_location ||
          payload.dumping_location,
        shift: response.data?.shift || payload.shift,
        date: response.data?.date || payload.date,
        distance: response.data?.distance || payload.distance || 0,
        coal_type: response.data?.coal_type || payload.coal_type,
        pic_work_unit:
          response.data?.pic_work_unit || payload.pic_work_unit,
        operator:
          response.data?.operator || payload.operator || null,
        checker: response.data?.checker || null,
        inspector: response.data?.inspector || null,
        weigh_bridge: response.data?.weigh_bridge || null,
        updatedAt:
          response.data?.updatedAt || new Date().toISOString(),
        updated_by_user: payload.updated_by_user,
      };

      logger.info("✅ Ritase updated successfully", {
        id: result.id,
        hull_no: result.hull_no,
        net_weight: result.net_weight,
        gross_weight: result.gross_weight,
      });

      return {
        success: true,
        data: result,
        message: "Data berhasil diperbarui",
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message ||
        "Gagal memperbarui data";

      logger.error("Failed to update ritase", {
        error: errorMessage,
        details: error.response?.data,
        editId,
      });

      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  },

  async deleteTimbanganEntry(id) {
    try {
      await offlineService.delete(`/v1/custom/ritase/${id}`);

      await offlineService.clearCache("ritases_");
      logger.info("🧹 Timbangan cache cleared after delete");

      logger.info("🗑️ Ritase deleted", { id });
      return { success: true, message: "Data berhasil dihapus" };
    } catch (error) {
      logger.error("❌ Failed to delete ritase", {
        error: error.response.data.message,
      });
      return {
        success: false,
        error: error.response.data.message,
        message: "Gagal menghapus data",
      };
    }
  },

async bulkUpdateKertasRitases(kertasData, updates, user) {
  try {
    logger.info("🔄 Starting bulk update for kertas ritases", {
      excavator: kertasData.excavator,
      totalRitases: kertasData.ritases?.length || 0,
      updates: Object.keys(updates),
    });

    if (!kertasData.ritases || kertasData.ritases.length === 0) {
      return {
        success: false,
        error: "Tidak ada ritase yang akan diupdate",
      };
    }

    // Validasi updates
    const allowedFields = [
      'shift',
      'excavator',
      'loading_location',
      'dumping_location',
      'measurement_type',
      'distance'
    ];

    const invalidFields = Object.keys(updates).filter(
      field => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return {
        success: false,
        error: `Field tidak valid: ${invalidFields.join(', ')}`,
      };
    }

    // Prepare bulk update request
    const ritaseIds = kertasData.ritases.map(r => r.id);
    const updatePromises = [];

    // Batch update - update semua ritase dengan field yang sama
    for (const ritase of kertasData.ritases) {
      const updatedData = {
        ...ritase,
        ...updates,
        // Preserve fields that shouldn't be changed
        id: ritase.id,
        time: ritase.time,
        weight: ritase.weight,
        hull_no: ritase.hull_no,
        operator: ritase.operator,
        checker: ritase.checker,
        company: ritase.company,
        // Update modified metadata
        modified_by: user?.username || user?.id,
        modified_at: new Date().toISOString(),
      };

      updatePromises.push(
        offlineService.performRequest({
          endpoint: `/ritase/${ritase.id}`,
          method: "PUT",
          body: updatedData,
          requiresAuth: true,
          user,
        })
      );
    }

    // Execute all updates
    const results = await Promise.allSettled(updatePromises);

    // Check results
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    logger.info("✅ Bulk update completed", {
      total: results.length,
      success: successCount,
      failed: failedCount,
    });

    if (failedCount > 0) {
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message || 'Unknown error')
        .join(', ');
      
      if (successCount === 0) {
        return {
          success: false,
          error: `Semua update gagal: ${errors}`,
        };
      } else {
        return {
          success: true,
          warning: `${successCount} berhasil, ${failedCount} gagal: ${errors}`,
          successCount,
          failedCount,
        };
      }
    }

    await this.invalidateRelatedCaches(kertasData, user);

    return {
      success: true,
      message: `Berhasil mengupdate ${successCount} ritase`,
      successCount,
    };

  } catch (error) {
    logger.error("❌ Bulk update failed", error);
    return {
      success: false,
      error: error.message || "Gagal melakukan bulk update",
    };
  }
},


async invalidateRelatedCaches(kertasData, user) {
  try {
    const workShiftInfo = getWorkShiftInfo();
    const patterns = [
      `summary_fleet_`,
      `ritase_list_`,
      `aggregated_ritase_`,
    ];

    for (const pattern of patterns) {
      await offlineService.invalidateCachePattern(pattern);
    }

    logger.info("✅ Related caches invalidated after bulk update");
  } catch (error) {
    logger.warn("⚠️ Failed to invalidate caches", error);
  }
},

  async clearCache() {
    try {
      await offlineService.clearCache();
      logger.info("🧹 All cache cleared");
      return true;
    } catch (error) {
      logger.error("❌ Failed to clear cache", {
        error: error.response.data.message,
      });
      return false;
    }
  },

  async refreshMasters() {
    await offlineService.clearCache("ritase_masters");
    await offlineService.clearCache("units_");
    await offlineService.clearCache("locations_");
    await offlineService.clearCache("operators");
    await offlineService.clearCache("companies");
    await offlineService.clearCache("work_units");
    await offlineService.clearCache("coal_types");

    return await this.fetchMasters();
  },
};
