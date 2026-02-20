import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

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

const getWorkShiftInfo = () => {
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
};

export const ritaseServices = {
  async fetchSummaryFleetByRitases(options = {}) {
    try {
      const { user, dateRange, shift } = options;
      // Gunakan getWorkShiftInfo untuk mendapatkan tanggal dan shift default
      const workShiftInfo = await getWorkShiftInfo();

      const effectiveDateRange = dateRange || {
        from: workShiftInfo.date,
        to: workShiftInfo.date,
      };
      const effectiveShift = shift || workShiftInfo.shift;

      const queryParams = {
        startDate: effectiveDateRange.from,
        endDate: effectiveDateRange.to,
        shift: effectiveShift,
      };

      logger.info("📊 Fetching summary fleet by ritases", {
        queryParams,
        workShiftInfo, // Log info shift kerja
      });

      const response = await offlineService.get("/v1/custom/ritase/summaries", {
        params: queryParams,
        forceRefresh: true,
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

      return {
        success: false,
        data: { summaries: [], ritases: [] },
        error: error.response?.data?.message || error.message,
      };
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

      logger.info("🔍 Fetching ritase data", {
        filters: apiFilters,
        dateRange: validation.days ? `${validation.days} days` : "all",
        role: user?.role,
        measurementType,
        shift: filters.shift,
      });

      const response = await offlineService.get("/ritases", {
        params,
        forceRefresh: true,
      });

      // ✅ FIX: Handle different response structures
      logger.info("🔍 Ritase response structure", {
        hasData: !!response.data,
        isArray: Array.isArray(response.data),
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data).slice(0, 5) : null,
      });

      let dataArray = response.data;

      // If response.data is an object with nested data array (Strapi v4)
      if (!Array.isArray(response.data) && response.data?.data) {
        logger.info(
          "📦 Detected nested data structure in ritases, extracting...",
        );
        dataArray = response.data.data;
      }

      // Ensure it's an array
      if (!Array.isArray(dataArray)) {
        logger.warn("⚠️ Ritase response is not an array, returning empty", {
          type: typeof dataArray,
          value: dataArray,
        });
        return { success: true, data: [] };
      }

      const data = dataArray.map((item) => {
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
        cached: false,
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
        created_at: data.created_at,
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
        company: data.company,
        tare_weight: data.tare_weight,
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
        created_at: data.created_at,

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

      const response = await offlineService.post(
        "/v1/custom/ritase/manual",
        payload,
      );

      const serverData = response.data || {};

      logger.info("✅ Ritase Duplicated:", serverData);

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
        createdAt: formData.createdAt,
        net_weight: formData.net_weight,
        gross_weight: formData.gross_weight,
        tare_weight: formData.tare_weight,
        measurement_type: formData.measurement_type,
      };

      // Handle weight based on which field is provided
      if (
        formData.gross_weight !== undefined &&
        formData.gross_weight !== null
      ) {
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

        hull_no: response.data?.unit_dump_truck || payload.unit_dump_truck,
        unit_dump_truck:
          response.data?.unit_dump_truck || payload.unit_dump_truck,
        dumptruck: response.data?.unit_dump_truck || payload.unit_dump_truck,
        unit_exca: response.data?.unit_exca || payload.unit_exca,
        excavator: response.data?.unit_exca || payload.unit_exca,
        loading_location:
          response.data?.loading_location || payload.loading_location,
        dumping_location:
          response.data?.dumping_location || payload.dumping_location,
        shift: response.data?.shift || payload.shift,
        date: response.data?.date || payload.date,
        distance: response.data?.distance || payload.distance || 0,
        coal_type: response.data?.coal_type || payload.coal_type,
        pic_work_unit: response.data?.pic_work_unit || payload.pic_work_unit,
        operator: response.data?.operator || payload.operator || null,
        checker: response.data?.checker || null,
        inspector: response.data?.inspector || null,
        weigh_bridge: response.data?.weigh_bridge || null,
        updatedAt: response.data?.updatedAt || new Date().toISOString(),
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
        "shift",
        "excavator",
        "loading_location",
        "dumping_location",
        "measurement_type",
        "distance",
      ];

      const invalidFields = Object.keys(updates).filter(
        (field) => !allowedFields.includes(field),
      );

      if (invalidFields.length > 0) {
        return {
          success: false,
          error: `Field tidak valid: ${invalidFields.join(", ")}`,
        };
      }

      // Prepare bulk update request
      const ritaseIds = kertasData.ritases.map((r) => r.id);
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
          }),
        );
      }

      // Execute all updates
      const results = await Promise.allSettled(updatePromises);

      // Check results
      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failedCount = results.filter((r) => r.status === "rejected").length;

      logger.info("✅ Bulk update completed", {
        total: results.length,
        success: successCount,
        failed: failedCount,
      });

      if (failedCount > 0) {
        const errors = results
          .filter((r) => r.status === "rejected")
          .map((r) => r.reason?.message || "Unknown error")
          .join(", ");

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
};