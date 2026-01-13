import { offlineService } from "@/shared/services/offlineService";
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

export const bypassServices = {
  /**
   * Fetch belt scale data
   */
  async fetchBeltScaleData(filters = {}) {
    try {
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
        ],
        sort: ["createdAt:desc"],
        pagination: { pageSize: 100 },
      };

      if (filters.startDate || filters.endDate) {
        params.filters = {};
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

      const cacheKey = buildDateRangeCacheKey("belt_scale_ritases", dateRange, filters);
      const ttl = offlineService.getTTLForDate(dateRange, "beltscale");

      logger.info("📊 Fetching belt scale data", {
        filters: params.filters,
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh: filters.forceRefresh,
        dateRange: validation.days ? `${validation.days} days` : "all",
      });

      const response = await offlineService.get("/belt-scale-ritases", {
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

          // Main data
          net_weight: attr.net_weight || 0,
          operator: attr.operator || "-",
          unit_dump_truck: attr.unit_dump_truck || "-",
          unit_exca: attr.unit_exca || "-",
          shift: attr.shift || "-",
          coal_type: attr.coal_type || "-",
          loading_location: attr.loading_location || "-",
          dumping_location: attr.dumping_location || "-",

          date: attr.date || null,
          tanggal: attr.date || attr.createdAt?.split("T")[0] || "",

          // Dump truck info
          hull_no: attr.unit_dump_truck || unitDumpTruck?.attributes?.hull_no || "-",
          dumptruck: unitDumpTruck?.attributes?.hull_no || attr.unit_dump_truck || "-",
          dumptruckId: unitDumpTruck?.id?.toString() || "",
          dumptruckCompany: unitDumpTruck?.attributes?.company?.data?.attributes?.name || "-",

          // Operator info
          operatorId: operator?.id?.toString() || "",
          operatorName: operator?.attributes?.name || attr.operator || "-",
          operatorCompany: operator?.attributes?.company?.data?.attributes?.name || "-",

          // Fleet info
          setting_fleet_id: settingFleet?.id?.toString() || null,
          fleet_name: fleetAttr?.shift
            ? `Fleet ${fleetAttr.shift} - ${fleetAttr.date || "-"}`
            : null,
          fleet_excavator: fleetAttr?.unit_exca?.data?.attributes?.hull_no || attr.unit_exca || null,
          fleet_shift: fleetAttr?.shift || attr.shift || null,
          fleet_date: fleetAttr?.date || attr.date || null,
          fleet_loading: fleetAttr?.loading_location?.data?.attributes?.name || attr.loading_location || null,
          fleet_dumping: fleetAttr?.dumping_location?.data?.attributes?.name || attr.dumping_location || null,
          fleet_coal_type: fleetAttr?.coal_type?.data?.attributes?.name || attr.coal_type || null,

          // Timestamps
          clientCreatedAt: attr.clientCreatedAt || attr.createdAt,
          timestamp: attr.createdAt,
          createdAt: attr.createdAt,
          updatedAt: attr.updatedAt,

          created_by_user: attr.created_by_user?.data?.id?.toString() || null,
          updated_by_user: attr.updated_by_user?.data?.id?.toString() || null,
        };
      });

      logger.info("✅ Belt scale data fetched successfully", {
        count: data.length,
        cacheKey,
        cached: !filters.forceRefresh,
      });

      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch belt scale data", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  /**
   * Submit belt scale entry
   */
  async submitBeltScaleEntry(formData) {
    try {
      const netWeight = formatWeight(formData.net_weight);
      const now = new Date().toISOString();

      const payload = {
        setting_fleet: formData.setting_fleet ? parseInt(formData.setting_fleet) : null,
        unit_dump_truck: formData.unit_dump_truck ? parseInt(formData.unit_dump_truck) : null,
        operator: formData.operator ? parseInt(formData.operator) : null,
        net_weight: netWeight,
        created_at: formData.clientCreatedAt || now,
      };

      if (!payload.setting_fleet) throw new Error("Setting fleet wajib dipilih");
      if (!payload.unit_dump_truck) throw new Error("Dump truck wajib dipilih");
      if (payload.net_weight <= 0) throw new Error("Net weight harus lebih dari 0");

      logger.info("📤 CREATE Belt Scale Entry:", payload);

      const response = await offlineService.post("/v1/custom/belt-scale-ritase", payload);

      const serverData = response.data || {};

      logger.info("✅ Server Response:", serverData);

      const result = {
        id: serverData.id?.toString(),
        dumptruckId: payload.unit_dump_truck,
        operatorId: payload.operator,
        setting_fleet_id: payload.setting_fleet,

        net_weight: serverData.net_weight || netWeight,

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

        fleet_name: formData.fleet_name || null,

        clientCreatedAt: payload.created_at,
        timestamp: serverData.createdAt || now,
        createdAt: serverData.createdAt || now,
        updatedAt: serverData.updatedAt || now,
        created_by_user: formData.created_by_user,
      };

      logger.info("✅ Belt scale entry created", {
        id: result.id,
        hull_no: result.hull_no,
        net_weight: result.net_weight,
      });

      return {
        success: true,
        data: result,
        message: "Data berhasil disimpan",
      };
    } catch (error) {
      logger.error("Failed to create belt scale entry", {
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Edit belt scale entry
   */
  async editBeltScaleEntry(formData, editId) {
    try {
      const netWeight = formatWeight(formData.net_weight);

      const payload = {
        net_weight: netWeight,
        unit_dump_truck: formData.unit_dump_truck,
        operator: formData.operator,
        updated_by_user: formData.updated_by_user || null,
      };

      if (!payload.unit_dump_truck) throw new Error("Dump truck wajib dipilih");
      if (payload.net_weight <= 0) throw new Error("Net weight harus lebih dari 0");

      logger.info("📤 EDIT Belt Scale Entry:", { id: editId, payload });

      const response = await offlineService.put(
        `/v1/custom/belt-scale-ritase/${editId}`,
        payload
      );

      const result = {
        id: response.data?.id?.toString() || editId,
        net_weight: response.data?.attributes?.net_weight || netWeight,
        hull_no: response.data?.attributes?.unit_dump_truck || payload.unit_dump_truck,
        unit_dump_truck: response.data?.attributes?.unit_dump_truck || payload.unit_dump_truck,
        dumptruck: response.data?.attributes?.unit_dump_truck || payload.unit_dump_truck,
        operator: response.data?.attributes?.operator || payload.operator,
        updatedAt: response.data?.attributes?.updatedAt || new Date().toISOString(),
        updated_by_user: payload.updated_by_user,
      };

      logger.info("✅ Belt scale entry updated", {
        id: result.id,
        net_weight: result.net_weight,
      });

      return {
        success: true,
        data: result,
        message: "Data berhasil diperbarui",
      };
    } catch (error) {
      logger.error("Failed to update belt scale entry", {
        error: error.message,
        editId,
      });
      throw error;
    }
  },

  /**
   * Delete belt scale entry
   */
  async deleteBeltScaleEntry(id) {
    try {
      await offlineService.delete(`/v1/custom/belt-scale-ritase/${id}`);

      await offlineService.clearCache("belt_scale_ritases_");
      logger.info("🧹 Belt scale cache cleared after delete");

      logger.info("🗑️ Belt scale entry deleted", { id });
      return { success: true, message: "Data berhasil dihapus" };
    } catch (error) {
      logger.error("❌ Failed to delete belt scale entry", { error: error.message });
      return {
        success: false,
        error: error.message,
        message: "Gagal menghapus data",
      };
    }
  },

  /**
   * Clear cache
   */
  async clearCache() {
    try {
      await offlineService.clearCache("belt_scale_");
      logger.info("🧹 Belt scale cache cleared");
      return true;
    } catch (error) {
      logger.error("❌ Failed to clear cache", { error: error.message });
      return false;
    }
  },
};