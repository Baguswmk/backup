import { offlineService } from "@/shared/services/offlineService";
import { buildCacheKey } from "@/shared/utils/cache";

const MASTER_DATA_CACHE = {
  data: {},
  TTL: {
    units: offlineService.CACHE_CONFIG.SHORT,
    operators: offlineService.CACHE_CONFIG.SHORT,
    companies: offlineService.CACHE_CONFIG.MASTERS,
    locations: offlineService.CACHE_CONFIG.MASTERS,
    "work-units": offlineService.CACHE_CONFIG.SHORT,
    "coal-types": offlineService.CACHE_CONFIG.MASTERS,
    "weigh-bridge": offlineService.CACHE_CONFIG.MASTERS,
    users: offlineService.CACHE_CONFIG.SHORT,
  },

  //   TTL: {
  //   units: 15 * 1000,              // 15 detik
  //   operators: 15 * 1000,          // 15 detik
  //   companies: 30 * 1000,          // 30 detik
  //   locations: 30 * 1000,          // 30 detik
  //   "work-units": 15 * 1000,       // 15 detik
  //   "coal-types": 30 * 1000,       // 30 detik
  //   "weigh-bridge": 30 * 1000,     // 30 detik
  //   users: 15 * 1000,              // 15 detik
  // },

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

const getPopulateFields = (category, userRole) => {
  if (userRole === "operator_jt") {
    if (category === "units") {
      return ["company", "work_unit"];
    }
  }

  const populateMap = {
    units: ["company", "work_unit"],
    operators: ["company", "ritases"],
    "work-units": ["locations"],
    "weigh-bridge": ["operators"],
  };

  return populateMap[category] || ["*"];
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

  _isAllCached() {
    const categories = [
      "units_EXCAVATOR",
      "units_DUMP_TRUCK",
      "locations",
      "operators",
      "companies",
      "work_units",
      "coal-types",
      "weight_bridges",
      "users",
    ];

    return categories.every((cat) => this.cache.isValid(cat));
  },

  async fetchAllMasters(options = {}) {
    const { forceRefresh = false, userRole, userCompanyId } = options;

    if (!forceRefresh && this._isAllCached()) {
      return {
        excavators: this.cache.get("units_EXCAVATOR"),
        dumptrucks: this.cache.get("units_DUMP_TRUCK"),
        locations: this.cache.get("locations"),
        operators: this.cache.get("operators"),
        companies: this.cache.get("companies"),
        workUnits: this.cache.get("work_units"),
        coalTypes: this.cache.get("coal-types"),
        weighBridges: this.cache.get("weight_bridges"),
        users: this.cache.get("users"),
      };
    }

    const [
      excavators,
      dumptrucks,
      locations,
      operators,
      companies,
      workUnits,
      coalTypes,
      weighBridges,
      users,
    ] = await Promise.all([
      this.fetchUnits({
        type: "EXCAVATOR",
        forceRefresh,
        userRole,
        userCompanyId,
      }),
      this.fetchUnits({
        type: "DUMP_TRUCK",
        forceRefresh,
        userRole,
        userCompanyId,
      }),
      this.fetchLocations({ forceRefresh, userRole }),
      this.fetchOperators({ forceRefresh, userRole, userCompanyId }),
      this.fetchCompanies({ forceRefresh }),
      this.fetchWorkUnits({ forceRefresh, userRole }),
      this.fetchCoalTypes({ forceRefresh }),
      this.fetchWeightBridges({ forceRefresh, userRole }),
      this.fetchUsers({ forceRefresh, userRole }),
    ]);

    return {
      excavators,
      dumptrucks,
      locations,
      operators,
      companies,
      workUnits,
      coalTypes,
      weighBridges,
      users,
    };
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
      weighBridges: this.cache.data["weight_bridges"]?.data || [],
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

  async fetchUsers(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("users");
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication("users", async () => {
      try {
        const response = await offlineService.get("/users", {
          params: {
            populate: ["role", "username"],
            sort: "username:asc",
          },
          cacheKey: "users",
          ttl: offlineService.CACHE_CONFIG.SHORT,
          forceRefresh,
        });

        const data = response.map((user) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role?.name || null,
          blocked: user.blocked || false,
        }));

        MASTER_DATA_CACHE.set("users", data);

        return data;
      } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users");
      }
    });
  },

  async fetchCompanies(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("companies");
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication("companies", async () => {
      const response = await offlineService.get("/companies", {
        params: {
          pagination: { pageSize: 100 },
          sort: ["name:asc"],
        },
        cacheKey: "companies",
        ttl: offlineService.CACHE_CONFIG.MASTERS,
        forceRefresh,
      });

      const data = response.data.map((item) => ({
        id: item.id,
        name: item.attributes.name,
        createdAt: item.attributes.createdAt,
      }));

      const sorted = sortAlphabetically(data, "name");

      MASTER_DATA_CACHE.set("companies", sorted);

      return sorted;
    });
  },

  async createCompany(data) {
    const response = await offlineService.post("/companies", {
      data,
      clientTimestamp: new Date().toISOString(),
    });

    MASTER_DATA_CACHE.clear("companies");
    emitCacheUpdate("companies", "created", response.data.id);

    return response.data;
  },

  async updateCompany(id, data) {
    const response = await offlineService.put(`/companies/${id}`, {
      data,
      clientTimestamp: new Date().toISOString(),
    });

    MASTER_DATA_CACHE.clear("companies");
    emitCacheUpdate("companies", "updated", id);

    return response.data;
  },

  async deleteCompany(id) {
    await offlineService.delete(`/companies/${id}`);

    MASTER_DATA_CACHE.clear("companies");
    emitCacheUpdate("companies", "deleted", id);

    return { success: true };
  },

  async fetchUnits(filters = {}) {
    const { forceRefresh = false, type, userRole, userCompanyId } = filters;

    const cacheKey = buildCacheKey("units", { type, userRole, userCompanyId });

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication(cacheKey, async () => {
      const params = {
        pagination: { pageSize: 7500 },
        sort: ["hull_no:asc"],
      };

      params.populate = getPopulateFields("units", userRole);

      if (type) {
        params.filters = {
          type: { $eq: type },
        };
      }

      if (userRole === "operator_jt") {
        if (!type || type === "DUMP_TRUCK") {
          params.filters = {
            ...params.filters,
            type: { $eq: "DUMP_TRUCK" },
          };
        }
        params.pagination.pageSize = 200;
      }

      if (shouldFilterByCompany(userRole) && userCompanyId) {
        params.filters = {
          ...params.filters,
          company: { id: { $eq: userCompanyId } },
        };
      }

      const response = await offlineService.get("/units", {
        params,
        cacheKey,
        ttl: offlineService.CACHE_CONFIG.SHORT,
        forceRefresh,
      });

      const data = response.data.map((item) => ({
        id: item.id,
        hull_no: item.attributes.hull_no,
        type: item.attributes.type,
        company: item.attributes.company?.data?.attributes?.name || "-",
        companyId: item.attributes.company?.data?.id,
        workUnit:
          item.attributes.work_unit?.data?.attributes?.satker ||
          item.attributes.work_unit?.data?.attributes?.subsatker ||
          "-",
        workUnitId: item.attributes.work_unit?.data?.id,
        settingDumpTruckId: item.attributes.setting_dump_truck?.data?.id,
        tare_weight: item.attributes.tare_weight || null,
        tare_weight_updated_date:
          item.attributes.tare_weight_updated_date || null,
        rfid: item.attributes.rfid || null,
        bypass_tonnage: item.attributes.bypass_tonnage || null,
        updatedAt: item.attributes.updatedAt || null,
      }));

      const sorted = sortAlphabetically(data, "hull_no");

      MASTER_DATA_CACHE.set(cacheKey, sorted);

      return sorted;
    });
  },

  async createUnit(data) {
    const payload = {
      hull_no: data.hull_no,
      type: data.type,
      company: data.companyId ? parseInt(data.companyId) : null,
      work_unit: data.workUnitId ? parseInt(data.workUnitId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    if (data.settingDumpTruckId) {
      payload.setting_dump_truck = parseInt(data.settingDumpTruckId);
    }

    if (data.tare_weight !== undefined && data.tare_weight !== null) {
      payload.tare_weight = parseFloat(data.tare_weight);
    }

    if (
      data.rfid !== undefined &&
      data.rfid !== null &&
      data.rfid.trim() !== ""
    ) {
      payload.rfid = data.rfid.trim();
    }

    if (
      data.bypass_tonnage !== undefined &&
      data.bypass_tonnage !== null &&
      data.bypass_tonnage !== ""
    ) {
      payload.bypass_tonnage = parseFloat(data.bypass_tonnage);
    }

    const response = await offlineService.post("/units", { data: payload });

    MASTER_DATA_CACHE.clear("units");
    emitCacheUpdate("units", "created", response.data.id);

    return response.data;
  },

  async updateUnit(id, data) {
    const payload = {
      clientTimestamp: new Date().toISOString(),
    };

    if (data.hull_no !== undefined) {
      payload.hull_no = data.hull_no;
    }

    if (data.type !== undefined) {
      payload.type = data.type;
    }

    if (data.companyId !== undefined) {
      payload.company = data.companyId ? parseInt(data.companyId) : null;
    }

    if (data.workUnitId !== undefined) {
      payload.work_unit = data.workUnitId ? parseInt(data.workUnitId) : null;
    }

    if (data.settingDumpTruckId !== undefined) {
      payload.setting_dump_truck = data.settingDumpTruckId
        ? parseInt(data.settingDumpTruckId)
        : null;
    }

    if (data.tare_weight !== undefined) {
      payload.tare_weight =
        data.tare_weight !== null ? parseFloat(data.tare_weight) : null;
    }

    if (data.rfid !== undefined) {
      payload.rfid =
        data.rfid && data.rfid.trim() !== "" ? data.rfid.trim() : null;
    }

    if (data.bypass_tonnage !== undefined) {
      payload.bypass_tonnage =
        data.bypass_tonnage !== null && data.bypass_tonnage !== ""
          ? parseFloat(data.bypass_tonnage)
          : null;
    }

    const response = await offlineService.put(`/units/${id}`, {
      data: payload,
    });

    MASTER_DATA_CACHE.clear("units");
    emitCacheUpdate("units", "updated", id);

    return response.data;
  },

  async deleteUnit(id) {
    await offlineService.delete(`/units/${id}`);

    MASTER_DATA_CACHE.clear("units");
    emitCacheUpdate("units", "deleted", id);

    return { success: true };
  },

  async fetchOperators(options = {}) {
    const { forceRefresh = false, userRole, userCompanyId } = options;

    const cacheKey = buildCacheKey("operators", { userRole, userCompanyId });

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication(cacheKey, async () => {
      const params = {
        pagination: { pageSize: 7500 },
        sort: ["name:asc"],
      };

      params.populate = getPopulateFields("operators", userRole);

      if (shouldFilterByCompany(userRole) && userCompanyId) {
        params.filters = {
          company: { id: { $eq: userCompanyId } },
        };
      }

      const response = await offlineService.get("/operators", {
        params,
        cacheKey,
        ttl: offlineService.CACHE_CONFIG.SHORT,
        forceRefresh,
      });

      const data = response.data.map((item) => ({
        id: item.id,
        name: item.attributes.name,
        company: item.attributes.company?.data?.attributes?.name || "-",
        companyId: item.attributes.company?.data?.id,
        ritaseCount: item.attributes.ritases?.data?.length || 0,
      }));

      const sorted = sortAlphabetically(data, "name");

      MASTER_DATA_CACHE.set(cacheKey, sorted);

      return sorted;
    });
  },

  async createOperator(data) {
    const payload = {
      name: data.name,
      company: data.companyId ? parseInt(data.companyId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.post("/operators", { data: payload });

    MASTER_DATA_CACHE.clear("operators");
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
    emitCacheUpdate("operators", "updated", id);

    return response.data;
  },

  async deleteOperator(id) {
    await offlineService.delete(`/operators/${id}`);

    MASTER_DATA_CACHE.clear("operators");
    emitCacheUpdate("operators", "deleted", id);

    return { success: true };
  },

  async fetchLocations(filters = {}) {
    const { forceRefresh = false, type, userRole } = filters;

    const cacheKey = buildCacheKey("locations", { type, userRole });

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication(cacheKey, async () => {
      const params = {
        pagination: { pageSize: 7500 },
        sort: ["name:asc"],
      };

      if (type) {
        params.filters = {
          type: { $eq: type },
        };
      }

      const response = await offlineService.get("/locations", {
        params,
        cacheKey,
        ttl: offlineService.CACHE_CONFIG.MASTERS,
        forceRefresh,
      });

      const data = response.data.map((item) => ({
        id: item.id,
        name: item.attributes.name,
        type: item.attributes.type,
      }));

      const sorted = sortAlphabetically(data, "name");

      MASTER_DATA_CACHE.set(cacheKey, sorted);

      return sorted;
    });
  },

  async createLocation(data) {
    const response = await offlineService.post("/locations", {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("locations");
    emitCacheUpdate("locations", "created", response.data.id);

    return response.data;
  },

  async updateLocation(id, data) {
    const response = await offlineService.put(`/locations/${id}`, {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("locations");
    emitCacheUpdate("locations", "updated", id);

    return response.data;
  },

  async deleteLocation(id) {
    await offlineService.delete(`/locations/${id}`);

    MASTER_DATA_CACHE.clear("locations");
    emitCacheUpdate("locations", "deleted", id);

    return { success: true };
  },

  async fetchWorkUnits(options = {}) {
    const { forceRefresh = false, userRole } = options;

    const cacheKey = buildCacheKey("work_units", { userRole });

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication(cacheKey, async () => {
      const params = {
        pagination: { pageSize: 7500 },
        sort: ["satker:asc"],
      };

      params.populate = getPopulateFields("work-units", userRole);

      const response = await offlineService.get("/work-units", {
        params,
        cacheKey,
        ttl: offlineService.CACHE_CONFIG.MEDIUM,
        forceRefresh,
      });

      const data = response.data.map((item) => ({
        id: item.id,
        satker: item.attributes.satker,
        subsatker: item.attributes.subsatker,
        locationIds:
          item.attributes.locations?.data?.map((loc) => loc.id) || [],
      }));

      const sorted = sortAlphabetically(data, "satker");

      MASTER_DATA_CACHE.set(cacheKey, sorted);

      return sorted;
    });
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
    emitCacheUpdate("work-units", "updated", id);

    return response.data;
  },

  async deleteWorkUnit(id) {
    await offlineService.delete(`/work-units/${id}`);

    MASTER_DATA_CACHE.clear("work-units");
    emitCacheUpdate("work-units", "deleted", id);

    return { success: true };
  },

  async fetchCoalTypes(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("coal-types");
      if (cached) {
        return cached;
      }
    }

    return this._fetchWithDeduplication("coal-types", async () => {
      const response = await offlineService.get("/coal-types", {
        params: {
          pagination: { pageSize: 1000 },
          sort: ["name:asc"],
        },
        cacheKey: "coal_types",
        ttl: offlineService.CACHE_CONFIG.MEDIUM,
        forceRefresh,
      });

      const data = response.data.map((item) => ({
        id: item.id,
        name: item.attributes.name,
      }));

      const sorted = sortAlphabetically(data, "name");

      MASTER_DATA_CACHE.set("coal-types", sorted);

      return sorted;
    });
  },

  async createCoalType(data) {
    const response = await offlineService.post("/coal-types", {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("coal-types");
    emitCacheUpdate("coal-types", "created", response.data.id);

    return response.data;
  },

  async updateCoalType(id, data) {
    const response = await offlineService.put(`/coal-types/${id}`, {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("coal-types");
    emitCacheUpdate("coal-types", "updated", id);

    return response.data;
  },

  async deleteCoalType(id) {
    await offlineService.delete(`/coal-types/${id}`);

    MASTER_DATA_CACHE.clear("coal-types");
    emitCacheUpdate("coal-types", "deleted", id);

    return { success: true };
  },

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
      };

      params.populate = getPopulateFields("weigh-bridge", userRole);

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
