import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { buildDateRangeCacheKey } from "@/shared/utils/cache";
import { formatWeight } from "@/shared/utils/number";

/**
 * Service khusus untuk Timbangan Manual
 * Perbedaan utama: User input NET_WEIGHT langsung, bukan gross_weight
 * Sistem akan menghitung gross_weight = net_weight + tare_weight
 */
export const timbanganManualService = {
  /**
   * Submit form timbangan manual
   * @param {Object} formData - { setting_fleet, unit_dump_truck, operator, net_weight, created_by_user }
   */

  async submitForm(formData) {
    try {
      const netWeight = formatWeight(formData.net_weight);
      const now = new Date().toISOString();

      const payload = {
        setting_fleet: formData.setting_fleet
          ? parseInt(formData.setting_fleet)
          : null,
        unit_dump_truck: formData.unit_dump_truck
          ? parseInt(formData.unit_dump_truck)
          : null,
        operator: formData.operator ? parseInt(formData.operator) : null,
        net_weight: parseFloat(netWeight),
        created_at: formData.clientCreatedAt || now,
      };

      if (formData.created_by_user) {
        payload.created_by_user = parseInt(formData.created_by_user);
      }

      if (!payload.setting_fleet)
        throw new Error("Setting fleet wajib dipilih");
      if (!payload.unit_dump_truck) throw new Error("Dump truck wajib dipilih");
      if (payload.net_weight <= 0)
        throw new Error("Net weight harus lebih dari 0");

      logger.info("📤 CREATE Timbangan Manual Payload:", payload);

      const response = await offlineService.post("/v1/custom/ritase", payload);

      const serverData = response.data || {};

      logger.info("✅ Timbangan Manual Server Response:", serverData);

      const result = {
        id: serverData.id?.toString(),
        dumptruckId: payload.unit_dump_truck,
        operatorId: payload.operator,
        setting_fleet_id: payload.setting_fleet,

        net_weight: serverData.net_weight,
        tare_weight: serverData.tare_weight || 0,
        gross_weight: serverData.gross_weight || serverData.net_weight,

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

        measurement_type: serverData.measurement_type || "Manual",

        fleet_name: formData.fleet_name || null,

        clientCreatedAt: payload.created_at,
        timestamp: serverData.createdAt || now,
        createdAt: serverData.createdAt || now,
        updatedAt: serverData.updatedAt || now,
        created_by_user: payload.created_by_user,
        timbangan_type: "manual",
      };

      logger.info("✅ Timbangan Manual created successfully", {
        id: result.id,
        hull_no: result.hull_no,
        net_weight: result.net_weight,
      });

      return {
        success: true,
        data: result,
        message: "Data Timbangan Manual berhasil disimpan",
      };
    } catch (error) {
      const isQueued =
        error?.queued ||
        error?.message?.includes("queued for offline sync") ||
        error?.message?.includes("Request queued");

      if (isQueued) {
        logger.info("📤 Timbangan Manual queued for offline sync", {
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

      logger.error("Failed to create Timbangan Manual", {
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
   * Edit form timbangan manual
   */
  async editForm(formData, editId) {
    try {
      const netWeight = formatWeight(formData.net_weight);

      const payload = {
        net_weight: netWeight,
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

      if (formData.operator) {
        payload.operator = formData.operator;
      }

      logger.info("📤 EDIT Timbangan Manual Payload:", {
        id: editId,
        payload,
      });

      const response = await offlineService.put(
        `/v1/custom/ritase/${editId}`,
        payload,
      );

      const result = {
        id: response.data?.id?.toString() || editId,
        net_weight: response.data?.attributes?.net_weight || 0,
        tare_weight: response.data?.attributes?.tare_weight || 0,
        gross_weight: response.data?.attributes?.gross_weight,

        hull_no:
          response.data?.attributes?.unit_dump_truck || payload.unit_dump_truck,
        unit_dump_truck:
          response.data?.attributes?.unit_dump_truck || payload.unit_dump_truck,
        dumptruck:
          response.data?.attributes?.unit_dump_truck || payload.unit_dump_truck,
        unit_exca: response.data?.attributes?.unit_exca || payload.unit_exca,
        excavator: response.data?.attributes?.unit_exca || payload.unit_exca,
        loading_location:
          response.data?.attributes?.loading_location ||
          payload.loading_location,
        dumping_location:
          response.data?.attributes?.dumping_location ||
          payload.dumping_location,
        shift: response.data?.attributes?.shift || payload.shift,
        date: response.data?.attributes?.date || payload.date,
        distance: response.data?.attributes?.distance || payload.distance || 0,
        coal_type: response.data?.attributes?.coal_type || payload.coal_type,
        pic_work_unit:
          response.data?.attributes?.pic_work_unit || payload.pic_work_unit,
        operator:
          response.data?.attributes?.operator || payload.operator || null,
        checker: response.data?.attributes?.checker || null,
        inspector: response.data?.attributes?.inspector || null,
        weigh_bridge: response.data?.attributes?.weigh_bridge || null,
        updatedAt:
          response.data?.attributes?.updatedAt || new Date().toISOString(),
        updated_by_user: payload.updated_by_user,
        timbangan_type: "manual",
      };

      logger.info("✅ Timbangan Manual updated successfully", {
        id: result.id,
        net_weight: result.net_weight,
      });

      return {
        success: true,
        data: result,
        message: "Data Timbangan Manual berhasil diperbarui",
      };
    } catch (error) {
      logger.error("Failed to update Timbangan Manual", {
        error: error.message,
        editId,
      });
      throw error;
    }
  },

  /**
   * Delete entry
   */
  async deleteEntry(id) {
    try {
      await offlineService.delete(`/v1/custom/ritase${id}`);

      await offlineService.clearCache("manual_");
      logger.info("🧹 Timbangan Manual cache cleared after delete");

      logger.info("🗑️ Timbangan Manual deleted", { id });
      return { success: true, message: "Data berhasil dihapus" };
    } catch (error) {
      logger.error("❌ Failed to delete Timbangan Manual", {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
        message: "Gagal menghapus data",
      };
    }
  },

  /**
   * Fetch data - PENTING: Tidak ada filter measurement_type di sini
   * Filter akan dilakukan di component level
   */
  async fetchData(filters = {}) {
    try {
      const { user, forceRefresh, dateRange } = filters;

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
        filters: {
          measurement_type: { $eq: "Timbangan" },
        },
      };

      if (filters.startDate || filters.endDate) {
        if (filters.startDate) {
          params.filters.createdAt = { $gte: filters.startDate };
        }
        if (filters.endDate) {
          if (!params.filters.createdAt) params.filters.createdAt = {};
          params.filters.createdAt.$lte = filters.endDate;
        }
      }

      const cacheKey = buildDateRangeCacheKey("ritases", dateRange, {
        userId: user?.id,
      });

      const ttl = offlineService.getTTLForDate(dateRange, "manual");

      logger.info("🔍 Fetching Timbangan Manual data", {
        cacheKey,
        ttl: `${ttl / 1000}s`,
        forceRefresh,
      });

      const response = await offlineService.get("/ritases", {
        params,
        cacheKey,
        ttl,
        forceRefresh: forceRefresh || false,
      });

      const data = response.data.map((item) => {
        const attr = item.attributes;
        const unitDumpTruck = attr.unit_dump_truck?.data;
        const operator = attr.operator?.data;
        const settingFleet = attr.setting_fleet?.data;
        const fleetAttr = settingFleet?.attributes;

        return {
          id: item.id.toString(),
          tare_weight: attr.tare_weight || 0,
          net_weight: attr.net_weight || 0,
          gross_weight: attr.gross_weight || 0,
          hull_no:
            attr.unit_dump_truck || unitDumpTruck?.attributes?.hull_no || "-",
          dumptruck:
            unitDumpTruck?.attributes?.hull_no || attr.unit_dump_truck || "-",
          operator: attr.operator || "-",
          operatorName: operator?.attributes?.name || attr.operator || "-",
          unit_exca: attr.unit_exca || "-",
          excavator:
            fleetAttr?.unit_exca?.data?.attributes?.hull_no ||
            attr.unit_exca ||
            null,
          loading_location: attr.loading_location || "-",
          dumping_location: attr.dumping_location || "-",
          shift: attr.shift || "-",
          date: attr.date || null,
          tanggal: attr.date || attr.createdAt?.split("T")[0] || "",
          distance: attr.distance || 0,
          coal_type: attr.coal_type || "-",
          pic_work_unit: attr.pic_work_unit || "-",
          measurement_type: attr.measurement_type || "Timbangan",
          timbangan_type: "manual",
          setting_fleet_id: settingFleet?.id?.toString() || null,
          fleet_name: fleetAttr?.shift
            ? `Fleet ${fleetAttr.shift} - ${fleetAttr.date || "-"}`
            : null,
          fleet_shift: fleetAttr?.shift || attr.shift || null,
          fleet_excavator:
            fleetAttr?.unit_exca?.data?.attributes?.hull_no ||
            attr.unit_exca ||
            null,
          fleet_loading:
            fleetAttr?.loading_location?.data?.attributes?.name ||
            attr.loading_location ||
            null,
          fleet_dumping:
            fleetAttr?.dumping_location?.data?.attributes?.name ||
            attr.dumping_location ||
            null,
          createdAt: attr.createdAt,
          updatedAt: attr.updatedAt,
          clientCreatedAt: attr.clientCreatedAt || attr.createdAt,
        };
      });

      logger.info("✅ Timbangan Manual data fetched successfully", {
        count: data.length,
      });

      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch Timbangan Manual data", {
        error: error.message,
      });
      return { success: false, data: [], error: error.message };
    }
  },
};
