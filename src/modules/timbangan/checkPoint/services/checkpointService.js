import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { buildDateRangeCacheKey } from "@/shared/utils/cache";

const CHECKPOINT_ENDPOINT = "/v1/custom/checkpoint";
const CHECKPOINT_TYPE = "checkpoint";

/**
 * Validate date range for checkpoint data
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
 * Build filters for checkpoint data based on user role
 */
const buildFilters = (options = {}) => {
  const { user, dateRange } = options;
  const filters = {};
  const role = user?.role?.toLowerCase();

  if (!user) {
    logger.warn("⚠️ No user provided for filter");
    return filters;
  }

  logger.info("🔒 Building checkpoint filters", {
    role,
    userId: user.id,
  });

  // Checkpoint always uses measurement_type = "Checkpoint"
  filters.measurement_type = { $eq: "Checkpoint" };

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

    logger.info("📅 Date range filter applied to checkpoint", {
      from: dateRange.from,
      to: dateRange.to,
    });
  }

  logger.info("🔍 Final checkpoint filters", JSON.stringify(filters, null, 2));

  return filters;
};

export const checkpointService = {
  /**
   * Submit new checkpoint entry (simplified - only hull_no)
   */
  async submitCheckpoint(formData) {
    try {
      const now = new Date().toISOString();

      const payload = {
        setting_fleet: formData.setting_fleet ? parseInt(formData.setting_fleet) : null,
        unit_dump_truck: formData.unit_dump_truck ? parseInt(formData.unit_dump_truck) : null,
        operator: formData.operator ? parseInt(formData.operator) : null,
        clientCreatedAt: formData.clientCreatedAt || now,
        measurement_type: "Checkpoint",
      };

      if (formData.created_by_user) {
        payload.created_by_user = parseInt(formData.created_by_user);
      }

      if (!payload.setting_fleet) throw new Error("Setting fleet wajib dipilih");
      if (!payload.unit_dump_truck) throw new Error("Dump truck wajib dipilih");

      logger.info("📤 CREATE Checkpoint Payload:", payload);

      const response = await offlineService.post(CHECKPOINT_ENDPOINT, payload);
      const serverData = response.data || {};

      logger.info("✅ Checkpoint Server Response:", serverData);

      const result = {
        id: serverData.id?.toString(),
        dumptruckId: payload.unit_dump_truck,
        operatorId: payload.operator,
        setting_fleet_id: payload.setting_fleet,
        
        hull_no: serverData.unit_dump_truck || formData.hull_no || null,
        unit_dump_truck: serverData.unit_dump_truck || formData.hull_no || null,
        dumptruck: serverData.unit_dump_truck || formData.hull_no || null,
        dumptruckCompany: formData.dumptruck_company || "-",
        
        operator: serverData.operator || formData.operator_name || null,
        operatorName: serverData.operator || formData.operator_name || null,
        operatorCompany: formData.operator_company || "-",
        
        unit_exca: serverData.unit_exca || formData.fleet_excavator || null,
        excavator: serverData.unit_exca || formData.fleet_excavator || null,
        fleet_excavator: serverData.unit_exca || formData.fleet_excavator || null,
        
        loading_location: serverData.loading_location || formData.fleet_loading || null,
        dumping_location: serverData.dumping_location || formData.fleet_dumping || null,
        fleet_loading: serverData.loading_location || formData.fleet_loading || null,
        fleet_dumping: serverData.dumping_location || formData.fleet_dumping || null,
        
        shift: serverData.shift || formData.fleet_shift || null,
        fleet_shift: serverData.shift || formData.fleet_shift || null,
        date: serverData.date || formData.fleet_date || null,
        fleet_date: serverData.date || formData.fleet_date || null,
        tanggal: (serverData.date || serverData.createdAt || now).split("T")[0],
        
        coal_type: serverData.coal_type || formData.fleet_coal_type || null,
        fleet_coal_type: serverData.coal_type || formData.fleet_coal_type || null,
        pic_work_unit: serverData.pic_work_unit || formData.fleet_work_unit || null,
        fleet_work_unit: serverData.pic_work_unit || formData.fleet_work_unit || null,
        work_unit: serverData.pic_work_unit || formData.fleet_work_unit || null,
        
        checker: serverData.checker || formData.fleet_checker || null,
        fleet_checker: serverData.checker || formData.fleet_checker || null,
        inspector: serverData.inspector || formData.fleet_inspector || null,
        fleet_inspector: serverData.inspector || formData.fleet_inspector || null,
        
        weigh_bridge: serverData.weigh_bridge || formData.fleet_weigh_bridge || null,
        fleet_weigh_bridge: serverData.weigh_bridge || formData.fleet_weigh_bridge || null,
        
        measurement_type: "Checkpoint",
        fleet_name: formData.fleet_name || null,
        
        clientCreatedAt: payload.clientCreatedAt,
        timestamp: serverData.createdAt || now,
        createdAt: serverData.createdAt || now,
        updatedAt: serverData.updatedAt || now,
        created_by_user: payload.created_by_user,
      };

      logger.info("✅ Checkpoint created successfully", {
        id: result.id,
        hull_no: result.hull_no,
        hasAllRequiredFields: !!(result.id && result.hull_no),
      });

      return {
        success: true,
        data: result,
        message: "Data checkpoint berhasil disimpan",
      };
    } catch (error) {
      logger.error("Failed to create checkpoint", {
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Fetch checkpoint data with filters
   */
  async fetchCheckpointData(filters = {}) {
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
        : { measurement_type: { $eq: "Checkpoint" } };

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

      const cacheKey = buildDateRangeCacheKey(CHECKPOINT_TYPE, dateRange, {
        userId: user?.id,
      });

      const ttl = offlineService.getTTLForDate(dateRange, CHECKPOINT_TYPE);

      logger.info("🔍 Fetching checkpoint data", {
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
          
          hull_no: attr.unit_dump_truck || unitDumpTruck?.attributes?.hull_no || "-",
          unit_dump_truck: attr.unit_dump_truck || unitDumpTruck?.attributes?.hull_no || "-",
          dumptruck: unitDumpTruck?.attributes?.hull_no || attr.unit_dump_truck || "-",
          dumptruckId: unitDumpTruck?.id?.toString() || "",
          dumptruckCompany: unitDumpTruck?.attributes?.company?.data?.attributes?.name || "-",
          
          operator: attr.operator || "-",
          operatorId: operator?.id?.toString() || "",
          operatorName: operator?.attributes?.name || attr.operator || "-",
          operatorCompany: operator?.attributes?.company?.data?.attributes?.name || "-",
          
          unit_exca: attr.unit_exca || "-",
          excavator: fleetAttr?.unit_exca?.data?.attributes?.hull_no || attr.unit_exca || null,
          fleet_excavator: fleetAttr?.unit_exca?.data?.attributes?.hull_no || attr.unit_exca || null,
          
          loading_location: attr.loading_location || "-",
          dumping_location: attr.dumping_location || "-",
          fleet_loading: fleetAttr?.loading_location?.data?.attributes?.name || attr.loading_location || null,
          fleet_dumping: fleetAttr?.dumping_location?.data?.attributes?.name || attr.dumping_location || null,
          
          shift: attr.shift || "-",
          fleet_shift: fleetAttr?.shift || attr.shift || null,
          date: attr.date || null,
          fleet_date: fleetAttr?.date || attr.date || null,
          tanggal: attr.date || attr.createdAt?.split("T")[0] || "",
          
          coal_type: attr.coal_type || "-",
          fleet_coal_type: fleetAttr?.coal_type?.data?.attributes?.name || attr.coal_type || null,
          
          checker: attr.checker || "-",
          fleet_checker: fleetAttr?.checker?.data?.attributes?.username || attr.checker || null,
          
          inspector: attr.inspector || "-",
          fleet_inspector: fleetAttr?.inspector?.data?.attributes?.username || attr.inspector || null,
          
          pic_work_unit: attr.pic_work_unit || "-",
          fleet_work_unit: fleetAttr?.pic_work_unit?.data?.attributes?.subsatker || attr.pic_work_unit || null,
          work_unit: attr.pic_work_unit || "-",
          
          weigh_bridge: attr.weigh_bridge || "-",
          fleet_weigh_bridge: fleetAttr?.weigh_bridge?.data?.attributes?.name || attr.weigh_bridge || null,
          
          measurement_type: "Checkpoint",
          
          setting_fleet_id: settingFleet?.id?.toString() || null,
          fleet_name: fleetAttr?.shift ? `Fleet ${fleetAttr.shift} - ${fleetAttr.date || "-"}` : null,
          
          clientCreatedAt: attr.clientCreatedAt || attr.createdAt,
          timestamp: attr.createdAt,
          createdAt: attr.createdAt,
          updatedAt: attr.updatedAt,
          
          created_by_user: attr.created_by_user?.data?.id?.toString() || null,
          updated_by_user: attr.updated_by_user?.data?.id?.toString() || null,
        };
      });

      logger.info("✅ Checkpoint data fetched successfully", {
        count: data.length,
        cacheKey,
        cached: !filters.forceRefresh,
        role: user?.role,
      });

      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch checkpoint data", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  /**
   * Delete checkpoint entry
   */
  async deleteCheckpointEntry(id) {
    try {
      await offlineService.delete(`${CHECKPOINT_ENDPOINT}/${id}`);

      await offlineService.clearCache(`${CHECKPOINT_TYPE}_`);
      logger.info("🧹 Checkpoint cache cleared after delete");

      logger.info("🗑️ Checkpoint deleted", { id });
      return { success: true, message: "Data checkpoint berhasil dihapus" };
    } catch (error) {
      logger.error("❌ Failed to delete checkpoint", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
        message: "Gagal menghapus data checkpoint",
      };
    }
  },

  /**
   * Clear checkpoint cache
   */
  async clearCache() {
    try {
      await offlineService.clearCache(`${CHECKPOINT_TYPE}_`);
      logger.info("🧹 Checkpoint cache cleared");
      return true;
    } catch (error) {
      logger.error("❌ Failed to clear checkpoint cache", {
        error: error.message,
      });
      return false;
    }
  },
};