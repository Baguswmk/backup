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
  async fetchMasters() {
    try {
      const cacheKey = "timbangan_masters";

      const cached = await offlineService.getCache(cacheKey);
      if (cached) {
        logger.info("✅ Masters loaded from cache");
        return { success: true, data: cached, fromCache: true };
      }

      const results = await Promise.allSettled([
        offlineService.get("/units", {
          params: {
            filters: { type: { $eq: "EXCAVATOR" } },
            populate: ["company", "work_unit"],
            pagination: { pageSize: 100 },
            sort: ["id:asc"],
          },
          cacheKey: "units_excavator",
          ttl: offlineService.CACHE_CONFIG.MASTERS,
        }),
        offlineService.get("/units", {
          params: {
            filters: { type: { $eq: "DUMP_TRUCK" } },
            populate: ["company", "work_unit", "setting_dump_truck"],
            pagination: { pageSize: 500 },
            sort: ["id:asc"],
          },
          cacheKey: "units_dumptruck",
          ttl: offlineService.CACHE_CONFIG.MASTERS,
        }),
        offlineService.get("/locations", {
          params: {
            filters: { type: { $eq: "LOADING" } },
            pagination: { pageSize: 50 },
            sort: ["id:asc"],
          },
          cacheKey: "locations_loading",
          ttl: offlineService.CACHE_CONFIG.MASTERS,
        }),
        offlineService.get("/locations", {
          params: {
            filters: { type: { $eq: "DUMPING" } },
            pagination: { pageSize: 50 },
            sort: ["id:asc"],
          },
          cacheKey: "locations_dumping",
          ttl: offlineService.CACHE_CONFIG.MASTERS,
        }),
        offlineService.get("/operators", {
          params: {
            populate: ["company"],
            pagination: { pageSize: 200 },
            sort: ["id:asc"],
          },
          cacheKey: "operators",
          ttl: offlineService.CACHE_CONFIG.MASTERS,
        }),
        offlineService.get("/companies", {
          params: {
            pagination: { pageSize: 50 },
            sort: ["id:asc"],
          },
          cacheKey: "companies",
          ttl: offlineService.CACHE_CONFIG.MASTERS,
        }),
        offlineService.get("/work-units", {
          params: {
            pagination: { pageSize: 50 },
            sort: ["id:asc"],
          },
          cacheKey: "work_units",
          ttl: offlineService.CACHE_CONFIG.MASTERS,
        }),
        offlineService.get("/coal-types", {
          params: {
            pagination: { pageSize: 10 },
            sort: ["id:asc"],
          },
          cacheKey: "coal_types",
          ttl: offlineService.CACHE_CONFIG.MASTERS,
        }),
      ]);

      // ✅ Extract values and handle rejected promises gracefully
      const extractValue = (result) =>
        result.status === "fulfilled" ? result.value : { data: [] };
      const excavatorsRes = extractValue(results[0]);
      const dumptrucksRes = extractValue(results[1]);
      const loadingLocationsRes = extractValue(results[2]);
      const dumpingLocationsRes = extractValue(results[3]);
      const operatorsRes = extractValue(results[4]);
      const companiesRes = extractValue(results[5]);
      const workUnitsRes = extractValue(results[6]);
      const coalTypesRes = extractValue(results[7]);

      // ✅ Log any failed requests for debugging
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const requestNames = [
            "excavators",
            "dumptrucks",
            "loadingLocations",
            "dumpingLocations",
            "operators",
            "companies",
            "workUnits",
            "coalTypes",
          ];
          logger.warn(
            `⚠️ Failed to fetch ${requestNames[index]}:`,
            result.reason.message
          );
        }
      });

      const masters = {
        excavators: excavatorsRes.data.map((item) => ({
          id: item.id.toString(),
          name: item.attributes.hull_no,
          hull_no: item.attributes.hull_no,
          company: item.attributes.company?.data?.attributes?.name || "-",
          companyId: item.attributes.company?.data?.id,
          work_unit:
            item.attributes.work_unit?.data?.attributes?.subsatker || "-",
          workUnitId: item.attributes.work_unit?.data?.id,
        })),

        dumptrucks: dumptrucksRes.data.map((item) => ({
          id: item.id.toString(),
          hullNo: item.attributes.hull_no,
          hull_no: item.attributes.hull_no,
          label: item.attributes.hull_no,
          company: item.attributes.company?.data?.attributes?.name || "-",
          companyId: item.attributes.company?.data?.id,
          contractor: item.attributes.company?.data?.attributes?.name || "-",
          capacity: 20,
          settingDumpTruckId: item.attributes.setting_dump_truck?.data?.id,
        })),

        locations: {
          loading: loadingLocationsRes.data.map((item) => ({
            id: item.id.toString(),
            name: item.attributes.name,
            type: item.attributes.type,
          })),
          dumping: dumpingLocationsRes.data.map((item) => ({
            id: item.id.toString(),
            name: item.attributes.name,
            type: item.attributes.type,
          })),
        },

        operators: operatorsRes.data.map((item) => ({
          id: item.id.toString(),
          name: item.attributes.name,
          company: item.attributes.company?.data?.attributes?.name || "-",
          companyId: item.attributes.company?.data?.id,
        })),

        companies: companiesRes.data.map((item) => ({
          id: item.id.toString(),
          name: item.attributes.name,
        })),

        workUnits: workUnitsRes.data.map((item) => ({
          id: item.id.toString(),
          satker: item.attributes.satker,
          subsatker: item.attributes.subsatker,
        })),

        coalTypes: coalTypesRes.data.map((item) => ({
          id: item.id.toString(),
          name: item.attributes.name,
        })),

        shifts: [
          { id: "PAGI", name: "Shift Pagi", hours: "06:00-18:00" },
          { id: "MALAM", name: "Shift Malam", hours: "18:00-06:00" },
        ],
      };

      await offlineService.setCache(
        cacheKey,
        masters,
        offlineService.CACHE_CONFIG.MASTERS
      );

      logger.info("✅ Masters fetched from API", {
        excavators: masters.excavators.length,
        dumptrucks: masters.dumptrucks.length,
        operators: masters.operators.length,
      });

      return { success: true, data: masters, fromCache: false };
    } catch (error) {
      logger.error("❌ Failed to fetch masters", { error: error.message });

      const stale = await offlineService.getCache("timbangan_masters", true);
      if (stale) {
        logger.warn("⚠️ Returning stale cache due to API error");
        return { success: true, data: stale, fromCache: true, offline: true };
      }

      throw error;
    }
  },

  async fetchOperators() {
    try {
      const response = await offlineService.get("/operators", {
        params: {
          populate: ["company"],
          pagination: { pageSize: 200 },
          sort: ["id:asc"],
        },
        cacheKey: "operators",
        ttl: offlineService.CACHE_CONFIG.MASTERS,
      });

      const operators = response.data.map((item) => ({
        id: item.id.toString(),
        name: item.attributes.name,
        company: item.attributes.company?.data?.attributes?.name || "-",
        companyId: item.attributes.company?.data?.id,
      }));

      return { success: true, data: operators };
    } catch (error) {
      logger.error("❌ Failed to fetch operators", { error: error.message });
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

      // ✅ Build smart cache key with date range
      const cacheKey =
        dateRange?.from && dateRange?.to
          ? `fleet_configs_${dateRange.from}_${dateRange.to}`
          : "fleet_configs_all";

      // ✅ Get dynamic TTL based on date
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
              userObj.attributes?.username || userObj.attributes?.name || null,
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
            item.attributes.pic_work_unit?.data?.attributes?.subsatker || "",
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
                  unit.attributes?.work_unit?.data?.attributes?.subsatker ||
                  "-",
                workUnitId:
                  unit.attributes?.work_unit?.data?.id?.toString() || "",
                status: unit.attributes?.status || "active",
              })
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
        const operator = attr.operator?.data;
        const settingFleet = attr.setting_fleet?.data;
        const fleetAttr = settingFleet?.attributes;

        return {
          id: item.id.toString(),

          tare_weight: attr.tare_weight || 0,
          net_weight: attr.net_weight || 0,
          gross_weight: attr.gross_weight || 0,
          operator: attr.operator || "-",
          loading_location: attr.loading_location || "-",
          dumping_location: attr.dumping_location || "-",
          unit_dump_truck: attr.unit_dump_truck || "-",
          unit_exca: attr.unit_exca || "-",
          shift: attr.shift || "-",
          coal_type: attr.coal_type || "-",
          checker: attr.checker || "-",
          inspector: attr.inspector || "-",
          pic_work_unit: attr.pic_work_unit || "-",
          weigh_bridge: attr.weigh_bridge || "-",
          measurement_type: attr.measurement_type || "-",
          date: attr.date || null,
          tanggal: attr.date || attr.createdAt?.split("T")[0] || "",

          distance: attr.distance || 0,
          id_df_setting_fleet: attr.id_df_setting_fleet || null,
          id_df_setting_dump_truck: attr.id_df_setting_dump_truck || null,

          hull_no:
            attr.unit_dump_truck || unitDumpTruck?.attributes?.hull_no || "-",

          dumptruck:
            unitDumpTruck?.attributes?.hull_no || attr.unit_dump_truck || "-",
          dumptruckId: unitDumpTruck?.id?.toString() || "",
          dumptruckCompany:
            unitDumpTruck?.attributes?.company?.data?.attributes?.name || "-",

          operatorId: operator?.id?.toString() || "",
          operatorName: operator?.attributes?.name || attr.operator || "-",
          operatorCompany:
            operator?.attributes?.company?.data?.attributes?.name || "-",

          setting_fleet_id: settingFleet?.id?.toString() || null,
          fleet_name: fleetAttr?.shift
            ? `Fleet ${fleetAttr.shift} - ${fleetAttr.date || "-"}`
            : null,
          fleet_excavator:
            fleetAttr?.unit_exca?.data?.attributes?.hull_no ||
            attr.unit_exca ||
            null,
          fleet_shift: fleetAttr?.shift || attr.shift || null,
          fleet_date: fleetAttr?.date || attr.date || null,
          fleet_loading:
            fleetAttr?.loading_location?.data?.attributes?.name ||
            attr.loading_location ||
            null,
          fleet_dumping:
            fleetAttr?.dumping_location?.data?.attributes?.name ||
            attr.dumping_location ||
            null,
          fleet_coal_type:
            fleetAttr?.coal_type?.data?.attributes?.name ||
            attr.coal_type ||
            null,
          fleet_checker:
            fleetAttr?.checker?.data?.attributes?.username ||
            attr.checker ||
            null,
          fleet_inspector:
            fleetAttr?.inspector?.data?.attributes?.username ||
            attr.inspector ||
            null,
          fleet_work_unit:
            fleetAttr?.pic_work_unit?.data?.attributes?.subsatker ||
            attr.pic_work_unit ||
            null,
          fleet_weigh_bridge:
            fleetAttr?.weigh_bridge?.data?.attributes?.name ||
            attr.weigh_bridge ||
            null,

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
      const grossWeight = formatWeight(formData.grosss_weight);
      const now = new Date().toISOString();

      const payload = {
        setting_fleet: formData.setting_fleet
          ? parseInt(formData.setting_fleet)
          : null,
        unit_dump_truck: formData.unit_dump_truck
          ? parseInt(formData.unit_dump_truck)
          : null,
        operator: formData.operator ? parseInt(formData.operator) : null,
        gross_weight: grossWeight,
        // created_by_user: formData.created_by_user || null,
        created_at: formData.clientCreatedAt || now,
      };

      if (!payload.setting_fleet)
        throw new Error("Setting fleet wajib dipilih");
      if (!payload.unit_dump_truck) throw new Error("Dump truck wajib dipilih");
      if (payload.gross_weight <= 0)
        throw new Error("Gross weight harus lebih dari 0");

      logger.info("📤 CREATE Ritase Payload:", payload);

      // Hit API utama: POST /v1/custom/ritase
      const response = await offlineService.post("/v1/custom/ritase", payload);

      // 🎯 PENTING: Gunakan data langsung dari response.data (bukan response.data.data)
      const serverData = response.data || {};

      logger.info("✅ Server Response:", serverData);

      // 🖨️ Build complete result object menggunakan data dari server
      const result = {
        // IDs
        id: serverData.id?.toString(),
        dumptruckId: payload.unit_dump_truck,
        operatorId: payload.operator,
        setting_fleet_id: payload.setting_fleet,

        // Weights dari server response
        net_weight: serverData.net_weight ,
        tare_weight: serverData.tare_weight || 0,
        gross_weight:
          serverData.gross_weight,
          

        // Data dump truck
        hull_no: serverData.unit_dump_truck || formData.hull_no || null,
        unit_dump_truck: serverData.unit_dump_truck || formData.hull_no || null,
        dumptruck: serverData.unit_dump_truck || formData.hull_no || null,
        dumptruckCompany: formData.dumptruck_company || "-",

        // Data operator
        operator: serverData.operator || formData.operator_name || null,
        operatorName: serverData.operator || formData.operator_name || null,
        operatorCompany: formData.operator_company || "-",

        // Data excavator
        unit_exca: serverData.unit_exca || formData.fleet_excavator || null,
        excavator: serverData.unit_exca || formData.fleet_excavator || null,
        fleet_excavator:
          serverData.unit_exca || formData.fleet_excavator || null,

        // Locations
        loading_location:
          serverData.loading_location || formData.fleet_loading || null,
        dumping_location:
          serverData.dumping_location || formData.fleet_dumping || null,
        fleet_loading:
          serverData.loading_location || formData.fleet_loading || null,
        fleet_dumping:
          serverData.dumping_location || formData.fleet_dumping || null,

        // Shift, Date, Distance
        shift: serverData.shift || formData.fleet_shift || null,
        fleet_shift: serverData.shift || formData.fleet_shift || null,
        date: serverData.date || formData.fleet_date || null,
        fleet_date: serverData.date || formData.fleet_date || null,
        tanggal: (serverData.date || serverData.createdAt || now).split("T")[0],
        distance: serverData.distance || formData.distance || 0,

        // Coal & Work Unit
        coal_type: serverData.coal_type || formData.fleet_coal_type || null,
        fleet_coal_type:
          serverData.coal_type || formData.fleet_coal_type || null,
        pic_work_unit:
          serverData.pic_work_unit || formData.fleet_work_unit || null,
        fleet_work_unit:
          serverData.pic_work_unit || formData.fleet_work_unit || null,
        work_unit: serverData.pic_work_unit || formData.fleet_work_unit || null,

        // Personnel
        checker: serverData.checker || formData.fleet_checker || null,
        fleet_checker: serverData.checker || formData.fleet_checker || null,
        inspector: serverData.inspector || formData.fleet_inspector || null,
        fleet_inspector:
          serverData.inspector || formData.fleet_inspector || null,

        // Weigh Bridge
        weigh_bridge:
          serverData.weigh_bridge || formData.fleet_weigh_bridge || null,
        fleet_weigh_bridge:
          serverData.weigh_bridge || formData.fleet_weigh_bridge || null,

        // Fleet Info
        fleet_name: formData.fleet_name || null,

        // Timestamps
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
        net_weight: result.net_weight,
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
      logger.error("Failed to create ritase", {
        error: error.message,
      });
      throw error;
    }
  },

  async editTimbanganForm(formData, editId) {
    try {
      const grossWeight = formatWeight(formData.grosss_weight);

      const payload = {
        gross_weight: grossWeight,
        unit_dump_truck: formData.unit_dump_truck, // ✅ Expect LABEL (string)
        unit_exca: formData.unit_exca, // ✅ Expect LABEL (string)
        loading_location: formData.loading_location, // ✅ Expect LABEL (string)
        dumping_location: formData.dumping_location, // ✅ Expect LABEL (string)
        shift: formData.shift, // ✅ LABEL (string like "Shift Pagi")
        date: formData.date,
        distance: parseFloat(formData.distance),
        coal_type: formData.coal_type, // ✅ Expect LABEL (string)
        pic_work_unit: formData.pic_work_unit, // ✅ Expect LABEL (string)
        updated_by_user: formData.updated_by_user || null,
      };

      // Optional operator
      if (formData.operator) {
        payload.operator = formData.operator; // ✅ Expect LABEL (string)
      }

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
      if (payload.gross_weight <= 0)
        throw new Error("Gross weight harus lebih dari 0");

      logger.info("📤 EDIT Ritase Payload (with LABELS):", {
        id: editId,
        payload,
      });

      const response = await offlineService.put(
        `/v1/custom/ritase/${editId}`,
        payload
      );

      const result = {
        id: response.data?.id?.toString() || editId,
        net_weight: response.data?.attributes?.net_weight || 0,
        tare_weight: response.data?.attributes?.tare_weight || 0,
        gross_weight:
          response.data?.attributes?.gross_weight ,
         
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
      };

      logger.info("✅ Ritase updated successfully", {
        id: result.id,
        hull_no: result.hull_no,
        net_weight: result.net_weight,
      });

      return {
        success: true,
        data: result,
        message: "Data berhasil diperbarui",
      };
    } catch (error) {
      logger.error("Failed to update ritase", {
        error: error.message,
        editId,
      });
      throw error;
    }
  },
  async deleteTimbanganEntry(id) {
    try {
      await offlineService.delete(`/v1/custom/ritase/${id}`);

      // ✅ Clear timbangan cache after delete
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

  async refreshMasters() {
    await offlineService.clearCache("timbangan_masters");
    await offlineService.clearCache("units_");
    await offlineService.clearCache("locations_");
    await offlineService.clearCache("operators");
    await offlineService.clearCache("companies");
    await offlineService.clearCache("work_units");
    await offlineService.clearCache("coal_types");

    return await this.fetchMasters();
  },
};
