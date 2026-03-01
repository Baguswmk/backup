import { offlineService } from "@/shared/services/offlineService";
import { buildCacheKey } from "@/shared/utils/cache";

const MASTER_DATA_CACHE = {
  data: {},
  TTL: {
    all: offlineService.CACHE_CONFIG.SHORT, // Cache untuk semua data master
    units: offlineService.CACHE_CONFIG.SHORT,
    operators: offlineService.CACHE_CONFIG.SHORT,
    companies: offlineService.CACHE_CONFIG.MASTERS,
    locations: offlineService.CACHE_CONFIG.MASTERS,
    "work-units": offlineService.CACHE_CONFIG.SHORT,
    "coal-types": offlineService.CACHE_CONFIG.MASTERS,
    "weigh-bridge": offlineService.CACHE_CONFIG.MASTERS,
    users: offlineService.CACHE_CONFIG.SHORT,
  },

  isValid(category) {
    const cached = this.data[category];
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    const ttl = this.TTL[category] || 30 * 60 * 1000;

    return age < ttl;
  },

  get(category) {
    if (!this.isValid(category)) return null;
    return this.data[category].data;
  },

  set(category, data) {
    this.data[category] = {
      data,
      timestamp: Date.now(),
    };
  },

  clear(category = null) {
    if (category) {
      delete this.data[category];
    } else {
      this.data = {};
    }
  },

  getInfo() {
    return Object.keys(this.data).map((category) => ({
      category,
      age: Math.round((Date.now() - this.data[category].timestamp) / 1000),
      ttl: Math.round((this.TTL[category] || 30 * 60 * 1000) / 1000),
      count: this.data[category].data?.length || 0,
    }));
  },
};

const sortAlphabetically = (data, key = "name") => {
  return [...data].sort((a, b) => {
    const valA = String(a[key] || "").toLowerCase();
    const valB = String(b[key] || "").toLowerCase();
    return valA.localeCompare(valB);
  });
};

const shouldFilterByCompany = (userRole) => {
  return ["admin", "evaluator", "operator_jt", "checker"].includes(userRole);
};

const cacheUpdateListeners = new Set();

const emitCacheUpdate = (category, action = "updated", id = null) => {
  const event = { category, action, id, timestamp: Date.now() };
  cacheUpdateListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("❌ Cache update listener error:", error);
    }
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("masterData:updated", {
        detail: event,
      }),
    );
  }
};

const pendingRequests = new Map();

export const masterDataService = {
  cache: MASTER_DATA_CACHE,

  async _fetchWithDeduplication(cacheKey, fetchFn) {
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    const promise = (async () => {
      try {
        return await fetchFn();
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, promise);
    return promise;
  },

  onUpdate(callback) {
    cacheUpdateListeners.add(callback);
    return () => cacheUpdateListeners.delete(callback);
  },

  /**
   * ✅ NEW: Fetch semua master data sekaligus dari endpoint baru
   * Endpoint: GET /v1/custom/master-data
   */
  async fetchAllMastersFromNewAPI(options = {}) {
    const { forceRefresh = false } = options;
    const cacheKey = "all_master_data";

    // Check cache jika tidak force refresh
    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication(cacheKey, async () => {
      try {
        const response = await offlineService.get("/v1/custom/master-data", {
          cacheKey,
          ttl: offlineService.CACHE_CONFIG.SHORT,
          forceRefresh,
        });

        const masterData = response.data?.data || response.data || response;

        const excavators =
          masterData.units
            ?.filter((unit) => unit.type === "EXCAVATOR")
            .sort((a, b) => (a.hull_no || "").localeCompare(b.hull_no || "")) ||
          [];

        const dumptrucks =
          masterData.units
            ?.filter((unit) => unit.type === "DUMP_TRUCK")
            .sort((a, b) => (a.hull_no || "").localeCompare(b.hull_no || "")) ||
          [];

        // Sort data
        const locations = sortAlphabetically(
          masterData.locations || [],
          "name",
        );
        const operators = sortAlphabetically(
          masterData.operators || [],
          "name",
        );
        const companies = sortAlphabetically(
          masterData.companies || [],
          "name",
        );
        const coalTypes = sortAlphabetically(
          masterData.coal_types || [],
          "name",
        );
        const users = (masterData.users || []).sort((a, b) =>
          (a.username || "").localeCompare(b.username || ""),
        );
        const workUnits = (masterData.work_units || []).sort((a, b) =>
          (a.satker || "").localeCompare(b.satker || ""),
        );

        // Cache individual categories
        MASTER_DATA_CACHE.set("units_EXCAVATOR", excavators);
        MASTER_DATA_CACHE.set("units_DUMP_TRUCK", dumptrucks);
        MASTER_DATA_CACHE.set("locations", locations);
        MASTER_DATA_CACHE.set("operators", operators);
        MASTER_DATA_CACHE.set("companies", companies);
        MASTER_DATA_CACHE.set("work_units", workUnits);
        MASTER_DATA_CACHE.set("coal-types", coalTypes);
        MASTER_DATA_CACHE.set("users", users);

        const result = {
          excavators,
          dumptrucks,
          locations,
          operators,
          companies,
          workUnits,
          coalTypes,
          users,
        };

        // Cache hasil gabungan
        MASTER_DATA_CACHE.set(cacheKey, result);

        return result;
      } catch (error) {
        console.error("❌ Error fetching master data from new API:", error);
        throw new Error("Failed to fetch master data: " + error.message);
      }
    });
  },

  /**
   * ✅ UPDATED: fetchAllMasters sekarang menggunakan API baru
   */
  async fetchAllMasters(options = {}) {
    return this.fetchAllMastersFromNewAPI(options);
  },

  _isAllCached() {
    const categories = [
      "units_EXCAVATOR",
      "units_DUMP_TRUCK",
      "locations",
      "operators",
      "companies",
      "work_units",
      "coal-types",
      "users",
    ];

    return categories.every((cat) => this.cache.isValid(cat));
  },

  getStaleCache() {
    return {
      excavators: this.cache.data["units_EXCAVATOR"]?.data || [],
      dumptrucks: this.cache.data["units_DUMP_TRUCK"]?.data || [],
      locations: this.cache.data["locations"]?.data || [],
      operators: this.cache.data["operators"]?.data || [],
      companies: this.cache.data["companies"]?.data || [],
      workUnits: this.cache.data["work_units"]?.data || [],
      coalTypes: this.cache.data["coal-types"]?.data || [],
      users: this.cache.data["users"]?.data || [],
    };
  },

  clearCache(category = null) {
    MASTER_DATA_CACHE.clear(category);
    emitCacheUpdate(category || "all", "cleared");
  },

  getCacheInfo() {
    return MASTER_DATA_CACHE.getInfo();
  },

  /**
   * ✅ UPDATED: Fetch individual data dengan fallback ke API baru
   */
  async fetchUsers(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("users");
      if (cached) {
        return cached;
      }
    }

    // Coba ambil dari cache all_master_data dulu
    const allMasterData = MASTER_DATA_CACHE.get("all_master_data");
    if (allMasterData?.users && !forceRefresh) {
      MASTER_DATA_CACHE.set("users", allMasterData.users);
      return allMasterData.users;
    }

    // Jika tidak ada, fetch semua master data
    const result = await this.fetchAllMastersFromNewAPI(options);
    return result.users;
  },

  async fetchCompanies(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("companies");
      if (cached) {
        return cached;
      }
    }

    const allMasterData = MASTER_DATA_CACHE.get("all_master_data");
    if (allMasterData?.companies && !forceRefresh) {
      MASTER_DATA_CACHE.set("companies", allMasterData.companies);
      return allMasterData.companies;
    }

    const result = await this.fetchAllMastersFromNewAPI(options);
    return result.companies;
  },

  async fetchLocations(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("locations");
      if (cached) {
        return cached;
      }
    }

    const allMasterData = MASTER_DATA_CACHE.get("all_master_data");
    if (allMasterData?.locations && !forceRefresh) {
      MASTER_DATA_CACHE.set("locations", allMasterData.locations);
      return allMasterData.locations;
    }

    const result = await this.fetchAllMastersFromNewAPI(options);
    return result.locations;
  },

  async fetchOperators(options = {}) {
    const { forceRefresh = false, userRole, userCompanyId } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("operators");
      if (cached) {
        // Filter by company jika diperlukan
        if (shouldFilterByCompany(userRole) && userCompanyId) {
          return cached.filter((op) => op.id_company === userCompanyId);
        }
        return cached;
      }
    }

    const allMasterData = MASTER_DATA_CACHE.get("all_master_data");
    if (allMasterData?.operators && !forceRefresh) {
      let operators = allMasterData.operators;

      if (shouldFilterByCompany(userRole) && userCompanyId) {
        operators = operators.filter((op) => op.id_company === userCompanyId);
      }

      MASTER_DATA_CACHE.set("operators", operators);
      return operators;
    }

    const result = await this.fetchAllMastersFromNewAPI(options);
    let operators = result.operators;

    if (shouldFilterByCompany(userRole) && userCompanyId) {
      operators = operators.filter((op) => op.id_company === userCompanyId);
    }

    return operators;
  },

  async fetchUnits(options = {}) {
    const { forceRefresh = false, type, userRole, userCompanyId } = options;
    const cacheKey = type ? `units_${type}` : "units";

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        // Filter by company jika diperlukan
        if (shouldFilterByCompany(userRole) && userCompanyId) {
          return cached.filter((unit) => unit.id_company === userCompanyId);
        }
        return cached;
      }
    }

    const allMasterData = MASTER_DATA_CACHE.get("all_master_data");
    if (allMasterData && !forceRefresh) {
      let units =
        type === "EXCAVATOR"
          ? allMasterData.excavators
          : type === "DUMP_TRUCK"
            ? allMasterData.dumptrucks
            : [
                ...(allMasterData.excavators || []),
                ...(allMasterData.dumptrucks || []),
              ];

      if (shouldFilterByCompany(userRole) && userCompanyId) {
        units = units.filter((unit) => unit.id_company === userCompanyId);
      }

      MASTER_DATA_CACHE.set(cacheKey, units);
      return units;
    }

    const result = await this.fetchAllMastersFromNewAPI(options);
    let units =
      type === "EXCAVATOR"
        ? result.excavators
        : type === "DUMP_TRUCK"
          ? result.dumptrucks
          : [...(result.excavators || []), ...(result.dumptrucks || [])];

    if (shouldFilterByCompany(userRole) && userCompanyId) {
      units = units.filter((unit) => unit.id_company === userCompanyId);
    }

    return units;
  },

  async fetchWorkUnits(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("work_units");
      if (cached) {
        return cached;
      }
    }

    const allMasterData = MASTER_DATA_CACHE.get("all_master_data");
    if (allMasterData?.workUnits && !forceRefresh) {
      MASTER_DATA_CACHE.set("work_units", allMasterData.workUnits);
      return allMasterData.workUnits;
    }

    const result = await this.fetchAllMastersFromNewAPI(options);
    return result.workUnits;
  },

  async fetchCoalTypes(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("coal-types");
      if (cached) {
        return cached;
      }
    }

    const allMasterData = MASTER_DATA_CACHE.get("all_master_data");
    if (allMasterData?.coalTypes && !forceRefresh) {
      MASTER_DATA_CACHE.set("coal-types", allMasterData.coalTypes);
      return allMasterData.coalTypes;
    }

    const result = await this.fetchAllMastersFromNewAPI(options);
    return result.coalTypes;
  },

  /**
   * ⚠️ DEPRECATED: fetchWeightBridges tidak ada di API baru
   * Keeping for backward compatibility
   */
  async fetchWeightBridges(options = {}) {
    const { forceRefresh = false, userRole } = options;
    const cacheKey = buildCacheKey("weight_bridges", { userRole });

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication(cacheKey, async () => {
      const params = {
        pagination: { pageSize: 1000 },
        sort: ["name:asc"],
        populate: ["operators"],
      };

      const response = await offlineService.get("/weigh-bridges", {
        params,
        cacheKey,
        ttl: 35 * 60 * 1000,
        forceRefresh,
      });

      const data = response.data.map((item) => {
        const operators =
          item.attributes.operators?.data?.map((op) => ({
            id: op.id,
            username: op.attributes.username,
            name: op.attributes.name,
            email: op.attributes.email,
          })) || [];

        return {
          id: item.id,
          name: item.attributes.name,
          createdAt: item.attributes.createdAt,
          operators,
        };
      });

      const sorted = sortAlphabetically(data, "name");
      MASTER_DATA_CACHE.set(cacheKey, sorted);

      return sorted;
    });
  },

  // =====================================
  // CREATE, UPDATE, DELETE METHODS
  // (Tetap menggunakan endpoint individual)
  // =====================================

  async createCompany(data) {
    const response = await offlineService.post("/companies", {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("companies");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("companies", "created", response.data.id);

    return response.data;
  },

  async updateCompany(id, data) {
    const response = await offlineService.put(`/companies/${id}`, {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("companies");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("companies", "updated", id);

    return response.data;
  },

  async deleteCompany(id) {
    await offlineService.delete(`/companies/${id}`);

    MASTER_DATA_CACHE.clear("companies");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("companies", "deleted", id);

    return { success: true };
  },

  async createUnit(data) {
    const payload = {
      hull_no: data.hull_no,
      type: data.type,
      tare_weight: parseFloat(data.tare_weight) || 0,
      rfid: data.rfid || null,
      bypass_tonnage: parseFloat(data.bypass_tonnage) || 0,
      spph: data.spph || null,
      type_dt: data.type_dt || null,
      status: data.status || "ACTIVE",
      company: data.companyId ? parseInt(data.companyId) : null,
      work_unit: data.workUnitId ? parseInt(data.workUnitId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.post("/units", { data: payload });

    MASTER_DATA_CACHE.clear("units");
    MASTER_DATA_CACHE.clear("units_EXCAVATOR");
    MASTER_DATA_CACHE.clear("units_DUMP_TRUCK");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("units", "created", response.data.id);

    return response.data;
  },

  async updateUnit(id, data) {
    const payload = {
      hull_no: data.hull_no,
      type: data.type,
      tare_weight: parseFloat(data.tare_weight) || 0,
      rfid: data.rfid || null,
      bypass_tonnage: parseFloat(data.bypass_tonnage) || 0,
      spph: data.spph || null,
      type_dt: data.type_dt || null,
      status: data.status || "ACTIVE",
      company: data.companyId ? parseInt(data.companyId) : null,
      work_unit: data.workUnitId ? parseInt(data.workUnitId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.put(`/units/${id}`, {
      data: payload,
    });

    MASTER_DATA_CACHE.clear("units");
    MASTER_DATA_CACHE.clear("units_EXCAVATOR");
    MASTER_DATA_CACHE.clear("units_DUMP_TRUCK");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("units", "updated", id);

    return response.data;
  },

  async deleteUnit(id) {
    await offlineService.delete(`/units/${id}`);

    MASTER_DATA_CACHE.clear("units");
    MASTER_DATA_CACHE.clear("units_EXCAVATOR");
    MASTER_DATA_CACHE.clear("units_DUMP_TRUCK");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("units", "deleted", id);

    return { success: true };
  },

  async createOperator(data) {
    const payload = {
      name: data.name,
      company: data.companyId ? parseInt(data.companyId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.post("/operators", { data: payload });

    MASTER_DATA_CACHE.clear("operators");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("operators", "created", response.data.id);

    return response.data;
  },

  async updateOperator(id, data) {
    const payload = {
      name: data.name,
      company: data.companyId ? parseInt(data.companyId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.put(`/operators/${id}`, {
      data: payload,
    });

    MASTER_DATA_CACHE.clear("operators");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("operators", "updated", id);

    return response.data;
  },

  async deleteOperator(id) {
    await offlineService.delete(`/operators/${id}`);

    MASTER_DATA_CACHE.clear("operators");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("operators", "deleted", id);

    return { success: true };
  },

  async createLocation(data) {
    const response = await offlineService.post("/locations", {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("locations");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("locations", "created", response.data.id);

    return response.data;
  },

  async updateLocation(id, data) {
    const response = await offlineService.put(`/locations/${id}`, {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("locations");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("locations", "updated", id);

    return response.data;
  },

  async deleteLocation(id) {
    await offlineService.delete(`/locations/${id}`);

    MASTER_DATA_CACHE.clear("locations");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("locations", "deleted", id);

    return { success: true };
  },

  async createWorkUnit(data) {
    const payload = {
      satker: data.satker,
      subsatker: data.subsatker,
      locations: data.locationIds || [],
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.post("/work-units", {
      data: payload,
    });

    MASTER_DATA_CACHE.clear("work-units");
    MASTER_DATA_CACHE.clear("work_units");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("work-units", "created", response.data.id);

    return response.data;
  },

  async updateWorkUnit(id, data) {
    const payload = {
      satker: data.satker,
      subsatker: data.subsatker,
      locations: data.locationIds || [],
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.put(`/work-units/${id}`, {
      data: payload,
    });

    MASTER_DATA_CACHE.clear("work-units");
    MASTER_DATA_CACHE.clear("work_units");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("work-units", "updated", id);

    return response.data;
  },

  async deleteWorkUnit(id) {
    await offlineService.delete(`/work-units/${id}`);

    MASTER_DATA_CACHE.clear("work-units");
    MASTER_DATA_CACHE.clear("work_units");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("work-units", "deleted", id);

    return { success: true };
  },

  async createCoalType(data) {
    const response = await offlineService.post("/coal-types", {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("coal-types");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("coal-types", "created", response.data.id);

    return response.data;
  },

  async updateCoalType(id, data) {
    const response = await offlineService.put(`/coal-types/${id}`, {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("coal-types");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("coal-types", "updated", id);

    return response.data;
  },

  async deleteCoalType(id) {
    await offlineService.delete(`/coal-types/${id}`);

    MASTER_DATA_CACHE.clear("coal-types");
    MASTER_DATA_CACHE.clear("all_master_data");
    emitCacheUpdate("coal-types", "deleted", id);

    return { success: true };
  },

  async createWeightBridge(data) {
    const payload = {
      name: data.name,
      user: data.userId ? parseInt(data.userId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.post("/weigh-bridges", {
      data: payload,
    });

    MASTER_DATA_CACHE.clear("weigh-bridge");
    emitCacheUpdate("weigh-bridge", "created", response.data.id);

    return response.data;
  },

  async updateWeightBridge(id, data) {
    const payload = {
      name: data.name,
      user: data.userId ? parseInt(data.userId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.put(`/weigh-bridges/${id}`, {
      data: payload,
    });

    MASTER_DATA_CACHE.clear("weigh-bridge");
    emitCacheUpdate("weigh-bridge", "updated", id);

    return response.data;
  },

  async deleteWeightBridge(id) {
    await offlineService.delete(`/weigh-bridges/${id}`);

    MASTER_DATA_CACHE.clear("weigh-bridge");
    emitCacheUpdate("weigh-bridge", "deleted", id);

    return { success: true };
  },

  // =====================================
  // GENERIC METHODS
  // =====================================

  async fetchData(category, filters = {}) {
    const methodMap = {
      companies: () => this.fetchCompanies(filters),
      units: () => this.fetchUnits(filters),
      operators: () => this.fetchOperators(filters),
      locations: () => this.fetchLocations(filters),
      "work-units": () => this.fetchWorkUnits(filters),
      "coal-types": () => this.fetchCoalTypes(filters),
      "weigh-bridge": () => this.fetchWeightBridges(filters),
      users: () => this.fetchUsers(filters),
    };

    const method = methodMap[category];
    if (!method) throw new Error(`Unknown category: ${category}`);
    return await method();
  },

  async createData(category, data) {
    const methodMap = {
      companies: this.createCompany,
      units: this.createUnit,
      operators: this.createOperator,
      locations: this.createLocation,
      "work-units": this.createWorkUnit,
      "coal-types": this.createCoalType,
      "weigh-bridge": this.createWeightBridge,
    };

    const method = methodMap[category];
    if (!method) throw new Error(`Unknown category: ${category}`);
    return await method.call(this, data);
  },

  async updateData(category, id, data) {
    const methodMap = {
      companies: this.updateCompany,
      units: this.updateUnit,
      operators: this.updateOperator,
      locations: this.updateLocation,
      "work-units": this.updateWorkUnit,
      "coal-types": this.updateCoalType,
      "weigh-bridge": this.updateWeightBridge,
    };

    const method = methodMap[category];
    if (!method) throw new Error(`Unknown category: ${category}`);
    return await method.call(this, id, data);
  },

  async deleteData(category, id) {
    const methodMap = {
      companies: this.deleteCompany,
      units: this.deleteUnit,
      operators: this.deleteOperator,
      locations: this.deleteLocation,
      "work-units": this.deleteWorkUnit,
      "coal-types": this.deleteCoalType,
      "weigh-bridge": this.deleteWeightBridge,
    };

    const method = methodMap[category];
    if (!method) throw new Error(`Unknown category: ${category}`);
    return await method.call(this, id);
  },
};
