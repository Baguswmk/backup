import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { buildDateRangeCacheKey } from "@/shared/utils/cache";

const BYPASS_ENDPOINT = "/v1/custom/ritase";
const BYPASS_TYPE = "bypass";

/**
 * Validate date range for bypass data
 */
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

/**
 * Build filters for bypass data based on user role
 */
const buildFilters = (options = {}) => {
  const { user, dateRange } = options;
  const filters = {};
  const role = user?.role?.toLowerCase();

  if (!user) {
    logger.warn("⚠️ No user provided for filter");
    return filters;
  }

  logger.info("🔒 Building bypass filters", {
    role,
    userId: user.id,
  });

  filters.measurement_type = { $eq: "Bypass" };

  switch (role) {
    case "operator_jt":
      if (user.weigh_bridge?.id) {
        filters.weigh_bridge = {
          id: { $eq: parseInt(user.weigh_bridge.id) },
        };
        logger.info("⚖️ Weigh_bridge filter applied (operator_jt)", {
          weighBridgeId: user.weigh_bridge.id,
        });
      }
      break;

    case "ccr": {
      const subsatker = user?.work_unit?.subsatker;
      if (subsatker) {
        filters.setting_fleet = {
          pic_work_unit: {
            subsatker: { $eq: subsatker },
          },
        };
        logger.info("🏢 Subsatker filter applied (CCR)", { subsatker });
      }
      break;
    }

    case "pengawas":
    case "evaluator":
    case "pic":
      if (user.work_unit?.subsatker) {
        filters.setting_fleet = {
          pic_work_unit: {
            subsatker: { $eq: user.work_unit.subsatker },
          },
        };
        logger.info("🏢 Subsatker filter applied", {
          role,
          subsatker: user.work_unit.subsatker,
        });
      }
      break;

    case "mitra":
    case "checker":
    case "admin":
      if (user.company?.id) {
        filters.unit_dump_truck = {
          company: {
            id: { $eq: parseInt(user.company.id) },
          },
        };
        logger.info("🏢 Company filter applied (from dump truck)", {
          role,
          companyId: user.company.id,
        });
      }
      break;

    case "super_admin":
      logger.info("👑 Super Admin - minimal role-specific filters");
      break;

    default:
      logger.warn("⚠️ Unknown role, returning current filters", { role });
      break;
  }

  if (dateRange?.from && dateRange?.to) {
    const validation = validateDateRange(dateRange);

    if (!validation.valid) {
      logger.warn("⚠️ Invalid date range", { error: validation.error });
      return filters;
    }

    filters.date = {
      $gte: dateRange.from,
      $lte: dateRange.to,
    };

    logger.info("📅 Date range filter applied to bypass", {
      from: dateRange.from,
      to: dateRange.to,
    });
  }

  logger.info("📋 Final bypass filters", JSON.stringify(filters, null, 2));

  return filters;
};

export const timbanganBypassService = {
  /**
   * Edit bypass entry (only net_weight)
   */
  async editBypass(formData, editId) {
    try {
      const payload = {
        net_weight: parseFloat(formData.net_weight),
      };

      if (!payload.net_weight || payload.net_weight <= 0) {
        throw new Error("Net weight harus lebih dari 0");
      }

      logger.info("📤 EDIT Bypass Payload:", {
        id: editId,
        payload,
      });

      const response = await offlineService.put(
        `${BYPASS_ENDPOINT}/${editId}`,
        payload,
      );

      const serverData = response.data || {};

      logger.info("✅ Bypass updated successfully", {
        id: editId,
        net_weight: payload.net_weight,
      });

      const result = {
        id: editId,
        net_weight: serverData.net_weight || payload.net_weight,
        updatedAt: serverData.updatedAt || new Date().toISOString(),
      };

      return {
        success: true,
        data: result,
        message: "Data bypass berhasil diperbarui",
      };
    } catch (error) {
      logger.error("Failed to update bypass", {
        error: error.message,
        editId,
      });
      throw error;
    }
  },

  /**
   * Submit new bypass entry (simplified - only hull_no, NO net_weight)
   * ✅ FIXED: Handle queued offline sync sama seperti Manual
   */
  async submitBypass(formData) {
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
        measurement_type: "Bypass",
      };

      if (formData.created_by_user) {
        payload.created_by_user = parseInt(formData.created_by_user);
      }

      if (!payload.setting_fleet)
        throw new Error("Setting fleet wajib dipilih");
      if (!payload.unit_dump_truck) throw new Error("Dump truck wajib dipilih");

      logger.info("📤 CREATE Bypass Payload:", payload);

      const response = await offlineService.post(BYPASS_ENDPOINT, payload);
      const serverData = response.data || {};

      logger.info("✅ Bypass Server Response:", serverData);

      const result = {
        id: serverData.id?.toString(),
        dumptruckId: payload.unit_dump_truck,
        operatorId: payload.operator,
        setting_fleet_id: payload.setting_fleet,

        net_weight: serverData.net_weight || 0,

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

        measurement_type: "Bypass",
        fleet_name: formData.fleet_name || null,

        clientCreatedAt: payload.clientCreatedAt,
        timestamp: serverData.createdAt || now,
        createdAt: serverData.createdAt || now,
        updatedAt: serverData.updatedAt || now,
        created_by_user: payload.created_by_user,
      };

      logger.info("✅ Bypass created successfully", {
        id: result.id,
        hull_no: result.hull_no,
        hasAllRequiredFields: !!(result.id && result.hull_no),
      });

      return {
        success: true,
        data: result,
        message: "Data bypass berhasil disimpan",
      };
    } catch (error) {
      const isQueued =
        error?.queued ||
        error?.message?.includes("queued for offline sync") ||
        error?.message?.includes("Request queued");

      if (isQueued) {
        logger.info("📦 Bypass queued for offline sync", {
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
        "Gagal menyimpan data bypass";

      logger.error("Failed to create bypass", {
        error: errorMessage,
        details: error.response?.data,
      });

      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  },

  /**
   * Fetch bypass data with filters
   */
  async fetchData(filters = {}) {
    try {
      const { user, forceRefresh } = filters;

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

      const roleFilters = user
        ? buildFilters({
            user,
            dateRange:
              filters.startDate && filters.endDate
                ? {
                    from: filters.startDate,
                    to: filters.endDate,
                  }
                : null,
          })
        : { measurement_type: { $eq: "Bypass" } };

      const params = {
        populate: [
          "unit_dump_truck",
          "unit_dump_truck.company",
          "operator",
          "operator.company",
          "setting_fleet",
          "setting_fleet.unit_exca",
          "setting_fleet.loading_location",
          "setting_fleet.dumping_location",
          "setting_fleet.pic_work_unit",
          "setting_fleet.weigh_bridge",
        ],
        sort: ["createdAt:desc"],
        pagination: { pageSize: 100 },
        filters: roleFilters,
      };

      if (!roleFilters.date && (filters.startDate || filters.endDate)) {
        if (filters.startDate) {
          params.filters.createdAt = { $gte: filters.startDate };
        }
        if (filters.endDate) {
          if (!params.filters.createdAt) params.filters.createdAt = {};
          params.filters.createdAt.$lte = filters.endDate;
        }
      }

      const dateRange =
        filters.startDate && filters.endDate
          ? { from: filters.startDate, to: filters.endDate }
          : null;

      const cacheKey = buildDateRangeCacheKey(BYPASS_TYPE, dateRange, {
        userId: user?.id,
      });

      const ttl = offlineService.getTTLForDate(dateRange, BYPASS_TYPE);

      logger.info("🔍 Fetching bypass data", {
        filters: params.filters,
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh: filters.forceRefresh,
        dateRange: validation.days ? `${validation.days} days` : "all",
        role: user?.role,
      });

      const response = await offlineService.get("/ritases", {
        params,
        cacheKey,
        ttl,
        forceRefresh: filters.forceRefresh || false,
      });

      const data = response.data.map((item) => {
        const attr = item.attributes;
        const unitDumpTruck = attr.unit_dump_truck?.data;
        const operator = attr.operator?.data;
        const settingFleet = attr.setting_fleet?.data;
        const fleetAttr = settingFleet?.attributes;

        return {
          id: item.id.toString(),

          net_weight: attr.net_weight || 0,

          hull_no:
            attr.unit_dump_truck || unitDumpTruck?.attributes?.hull_no || "-",
          unit_dump_truck:
            attr.unit_dump_truck || unitDumpTruck?.attributes?.hull_no || "-",
          dumptruck:
            unitDumpTruck?.attributes?.hull_no || attr.unit_dump_truck || "-",
          dumptruckId: unitDumpTruck?.id?.toString() || "",
          dumptruckCompany:
            unitDumpTruck?.attributes?.company?.data?.attributes?.name || "-",

          operator: attr.operator || "-",
          operatorId: operator?.id?.toString() || "",
          operatorName: operator?.attributes?.name || attr.operator || "-",
          operatorCompany:
            operator?.attributes?.company?.data?.attributes?.name || "-",

          unit_exca: attr.unit_exca || "-",
          excavator:
            fleetAttr?.unit_exca?.data?.attributes?.hull_no ||
            attr.unit_exca ||
            null,
          fleet_excavator:
            fleetAttr?.unit_exca?.data?.attributes?.hull_no ||
            attr.unit_exca ||
            null,

          loading_location: attr.loading_location || "-",
          dumping_location: attr.dumping_location || "-",
          fleet_loading:
            fleetAttr?.loading_location?.data?.attributes?.name ||
            attr.loading_location ||
            null,
          fleet_dumping:
            fleetAttr?.dumping_location?.data?.attributes?.name ||
            attr.dumping_location ||
            null,

          shift: attr.shift || "-",
          fleet_shift: fleetAttr?.shift || attr.shift || null,
          date: attr.date || null,
          fleet_date: fleetAttr?.date || attr.date || null,
          tanggal: attr.date || attr.createdAt?.split("T")[0] || "",

          coal_type: attr.coal_type || "-",
          fleet_coal_type:
            fleetAttr?.coal_type?.data?.attributes?.name ||
            attr.coal_type ||
            null,

          checker: attr.checker || "-",
          fleet_checker:
            fleetAttr?.checker?.data?.attributes?.username ||
            attr.checker ||
            null,

          inspector: attr.inspector || "-",
          fleet_inspector:
            fleetAttr?.inspector?.data?.attributes?.username ||
            attr.inspector ||
            null,

          pic_work_unit: attr.pic_work_unit || "-",
          fleet_work_unit:
            fleetAttr?.pic_work_unit?.data?.attributes?.subsatker ||
            attr.pic_work_unit ||
            null,
          work_unit: attr.pic_work_unit || "-",

          weigh_bridge: attr.weigh_bridge || "-",
          fleet_weigh_bridge:
            fleetAttr?.weigh_bridge?.data?.attributes?.name ||
            attr.weigh_bridge ||
            null,

          measurement_type: "Bypass",

          setting_fleet_id: settingFleet?.id?.toString() || null,
          fleet_name: fleetAttr?.shift
            ? `Fleet ${fleetAttr.shift} - ${fleetAttr.date || "-"}`
            : null,

          clientCreatedAt: attr.clientCreatedAt || attr.createdAt,
          timestamp: attr.createdAt,
          createdAt: attr.createdAt,
          updatedAt: attr.updatedAt,

          created_by_user: attr.created_by_user?.data?.id?.toString() || null,
          updated_by_user: attr.updated_by_user?.data?.id?.toString() || null,
        };
      });

      logger.info("✅ Bypass data fetched successfully", {
        count: data.length,
        cacheKey,
        cached: !filters.forceRefresh,
        role: user?.role,
      });

      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch bypass data", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  /**
   * Delete bypass entry
   */
  async deleteEntry(id) {
    try {
      await offlineService.delete(`${BYPASS_ENDPOINT}/${id}`);

      await offlineService.clearCache(`${BYPASS_TYPE}_`);
      logger.info("🧹 Bypass cache cleared after delete");

      logger.info("🗑️ Bypass deleted", { id });
      return { success: true, message: "Data bypass berhasil dihapus" };
    } catch (error) {
      logger.error("❌ Failed to delete bypass", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
        message: "Gagal menghapus data bypass",
      };
    }
  },

  /**
   * Clear bypass cache
   */
  async clearCache() {
    try {
      await offlineService.clearCache(`${BYPASS_TYPE}_`);
      logger.info("🧹 Bypass cache cleared");
      return true;
    } catch (error) {
      logger.error("❌ Failed to clear bypass cache", {
        error: error.message,
      });
      return false;
    }
  },
};
