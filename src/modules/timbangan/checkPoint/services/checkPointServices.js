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

export const timbanganServices = {
  // Fetch available units for selection
  async fetchUnits() {
    try {
      const cacheKey = "checkpoint_units";
      
      const cached = await offlineService.getCache(cacheKey);
      if (cached) {
        logger.info("✅ Units loaded from cache");
        return { success: true, data: cached, fromCache: true };
      }

      const response = await offlineService.get("/units", {
        params: {
          filters: { type: { $eq: "DUMP_TRUCK" } },
          populate: ["company", "work_unit"],
          pagination: { pageSize: 500 },
          sort: ["hull_no:asc"],
        },
        cacheKey,
        ttl: offlineService.CACHE_CONFIG.MASTERS,
      });

      const units = response.data.map((item) => ({
        id: item.id.toString(),
        hull_no: item.attributes.hull_no,
        company: item.attributes.company?.data?.attributes?.name || "-",
        companyId: item.attributes.company?.data?.id,
        work_unit: item.attributes.work_unit?.data?.attributes?.subsatker || "-",
        workUnitId: item.attributes.work_unit?.data?.id,
        tare_weight: item.attributes.tare_weight || 0,
      }));

      await offlineService.setCache(
        cacheKey,
        units,
        offlineService.CACHE_CONFIG.MASTERS
      );

      logger.info("✅ Units fetched from API", { count: units.length });
      return { success: true, data: units, fromCache: false };
    } catch (error) {
      logger.error("❌ Failed to fetch units", { error: error.message });
      
      const stale = await offlineService.getCache("checkpoint_units", true);
      if (stale) {
        logger.warn("⚠️ Returning stale cache due to API error");
        return { success: true, data: stale, fromCache: true, offline: true };
      }

      throw error;
    }
  },

  async fetchTimbanganData(filters = {}) {
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
          "unit_dump_truck.work_unit",
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

      const cacheKey = buildDateRangeCacheKey("ritases", dateRange, filters);
      const ttl = offlineService.getTTLForDate(dateRange, "timbangan");

      logger.info("🔍 Fetching timbangan data", {
        filters: params.filters,
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh: filters.forceRefresh,
        dateRange: validation.days ? `${validation.days} days` : "all",
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

        return {
          id: item.id.toString(),
          
          // Weight data
          net_weight: attr.net_weight || 0,
          tare_weight: attr.tare_weight || 0,
          gross_weight: parseFloat(attr.tare_weight || 0) + parseFloat(attr.net_weight || 0),

          // Unit data
          hull_no: unitDumpTruck?.attributes?.hull_no || attr.unit_dump_truck || "-",
          unit_dump_truck: unitDumpTruck?.attributes?.hull_no || attr.unit_dump_truck || "-",
          unit_dump_truck_id: unitDumpTruck?.id?.toString() || "",
          dumptruckId: unitDumpTruck?.id?.toString() || "",
          dumptruckCompany: unitDumpTruck?.attributes?.company?.data?.attributes?.name || "-",
          work_unit: unitDumpTruck?.attributes?.work_unit?.data?.attributes?.subsatker || "-",

          // Timestamps
          tanggal: attr.date || attr.createdAt?.split("T")[0] || "",
          clientCreatedAt: attr.clientCreatedAt || attr.createdAt,
          timestamp: attr.createdAt,
          createdAt: attr.createdAt,
          updatedAt: attr.updatedAt,

          // User tracking
          created_by_user: attr.created_by_user?.data?.id?.toString() || null,
          updated_by_user: attr.updated_by_user?.data?.id?.toString() || null,
        };
      });

      logger.info("✅ Timbangan data fetched successfully", {
        count: data.length,
        cacheKey,
        cached: !filters.forceRefresh,
      });

      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch timbangan data", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },

  async submitTimbanganForm(formData) {
    try {
      const netWeight = formatWeight(formData.net_weight);
      const now = new Date().toISOString();

      const payload = {
        unit_dump_truck: formData.unit_dump_truck ? parseInt(formData.unit_dump_truck) : null,
        net_weight: netWeight,
        created_by_user: formData.created_by_user || null,
        created_at: formData.clientCreatedAt || now,
      };

      if (!payload.unit_dump_truck) throw new Error("Unit dump truck wajib dipilih");
      if (payload.net_weight <= 0) throw new Error("Net weight harus lebih dari 0");

      logger.info("📤 CREATE Ritase Payload:", payload);

      const response = await offlineService.post("/v1/custom/ritase", payload);
      const serverData = response.data || {};

      logger.info("✅ Server Response:", serverData);

      const result = {
        id: serverData.id?.toString(),
        unit_dump_truck_id: payload.unit_dump_truck,
        dumptruckId: payload.unit_dump_truck,

        net_weight: serverData.net_weight || netWeight,
        tare_weight: serverData.tare_weight || 0,
        gross_weight: serverData.gross_weight || parseFloat(serverData.tare_weight || 0) + parseFloat(netWeight),

        hull_no: serverData.unit_dump_truck || formData.hull_no || null,
        unit_dump_truck: serverData.unit_dump_truck || formData.hull_no || null,
        dumptruckCompany: formData.dumptruck_company || "-",
        work_unit: formData.work_unit || "-",

        tanggal: (serverData.date || serverData.createdAt || now).split("T")[0],
        clientCreatedAt: payload.created_at,
        timestamp: serverData.createdAt || now,
        createdAt: serverData.createdAt || now,
        updatedAt: serverData.updatedAt || now,
        created_by_user: payload.created_by_user,
      };

      logger.info("✅ Ritase created successfully", {
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
      logger.error("Failed to create ritase", { error: error.message });
      throw error;
    }
  },

  async editTimbanganForm(formData, editId) {
    try {
      const netWeight = formatWeight(formData.net_weight);

      const payload = {
        net_weight: netWeight,
        updated_by_user: formData.updated_by_user || null,
      };

      if (payload.net_weight <= 0) throw new Error("Net weight harus lebih dari 0");

      logger.info("📤 EDIT Ritase Payload:", { id: editId, payload });

      const response = await offlineService.put(`/v1/custom/ritase/${editId}`, payload);

      const result = {
        id: response.data?.id?.toString() || editId,
        net_weight: response.data?.attributes?.net_weight || netWeight,
        tare_weight: response.data?.attributes?.tare_weight || 0,
        gross_weight: response.data?.attributes?.gross_weight || 
          parseFloat(response.data?.attributes?.tare_weight || 0) + parseFloat(netWeight),
        updatedAt: response.data?.attributes?.updatedAt || new Date().toISOString(),
        updated_by_user: payload.updated_by_user,
      };

      logger.info("✅ Ritase updated successfully", {
        id: result.id,
        net_weight: result.net_weight,
      });

      return {
        success: true,
        data: result,
        message: "Data berhasil diperbarui",
      };
    } catch (error) {
      logger.error("Failed to update ritase", { error: error.message, editId });
      throw error;
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
      logger.error("❌ Failed to delete ritase", { error: error.message });
      return {
        success: false,
        error: error.message,
        message: "Gagal menghapus data",
      };
    }
  },

  async clearCache() {
    try {
      await offlineService.clearCache();
      logger.info("🧹 All cache cleared");
      return true;
    } catch (error) {
      logger.error("❌ Failed to clear cache", { error: error.message });
      return false;
    }
  },

  async refreshUnits() {
    await offlineService.clearCache("checkpoint_units");
    return await this.fetchUnits();
  },
};