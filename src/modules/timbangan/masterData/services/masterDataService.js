import { offlineService } from "@/shared/services/offlineService";
import { buildCacheKey } from "@/shared/utils/cache";

const MASTER_DATA_CACHE = {
  data: {},
  TTL: {
    units: 30 * 60 * 1000,
    operators: 30 * 60 * 1000,
    companies: 60 * 60 * 1000,
    locations: 60 * 60 * 1000,
    "work-units": 60 * 60 * 1000,
    "coal-types": 60 * 60 * 1000,
    "weigh-bridge": 60 * 60 * 1000,
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

const getPopulateFields = (category, userRole) => {
  if (userRole === "operator_jt") {
    if (category === "units") {
      return ["company"];
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

export const masterDataService = {
  cache: MASTER_DATA_CACHE,

  clearCache(category = null) {
    MASTER_DATA_CACHE.clear(category);
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

    try {
      const response = await offlineService.get("/users", {
        params: {
          populate: "*",
          sort: "username:asc",
        },
        cacheKey: "users",
        ttl: 30 * 60 * 1000,
        forceRefresh,
      });

      const data = response.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        fullName:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.username,
        role: user.role?.name || null,
        blocked: user.blocked || false,
      }));

      MASTER_DATA_CACHE.set("users", data);

      return data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error("Failed to fetch users");
    }
  },

  async fetchCompanies(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get("companies");
      if (cached) {
        return cached;
      }
    }

    const response = await offlineService.get("/companies", {
      params: {
        pagination: { pageSize: 100 },
        sort: ["name:asc"],
      },
      cacheKey: "companies",
      ttl: 35 * 60 * 1000,
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
  },

  async createCompany(data) {
    const response = await offlineService.post("/companies", {
      data,
      clientTimestamp: new Date().toISOString(),
    });

    MASTER_DATA_CACHE.clear("companies");

    return response.data;
  },

  async updateCompany(id, data) {
    const response = await offlineService.put(`/companies/${id}`, {
      data,
      clientTimestamp: new Date().toISOString(),
    });

    MASTER_DATA_CACHE.clear("companies");

    return response.data;
  },

  async deleteCompany(id) {
    await offlineService.delete(`/companies/${id}`);

    MASTER_DATA_CACHE.clear("companies");

    return { success: true };
  },

  async fetchUnits(filters = {}) {
    const { forceRefresh = false, type, userRole } = filters;

    const cacheKey = buildCacheKey("units", { type, userRole });

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const params = {
      pagination: { pageSize: 500 },
      sort: ["hull_no:asc"],
    };

    params.populate = getPopulateFields("units", userRole);

    if (type) {
      params.filters = {
        type: { $eq: type },
      };
    }

    if (userRole === "operator_jt") {
      params.filters = {
        ...params.filters,
        type: { $eq: "DUMP_TRUCK" },
      };
      params.pagination.pageSize = 200;
    }

    const response = await offlineService.get("/units", {
      params,
      cacheKey,
      ttl: 30 * 60 * 1000,
      forceRefresh,
    });

    const data = response.data.map((item) => ({
      id: item.id,
      hull_no: item.attributes.hull_no,
      type: item.attributes.type,
      company: item.attributes.company?.data?.attributes?.name || "-",
      companyId: item.attributes.company?.data?.id,
      workUnit: item.attributes.work_unit?.data?.attributes?.subsatker || "-",
      workUnitId: item.attributes.work_unit?.data?.id,
      settingDumpTruckId: item.attributes.setting_dump_truck?.data?.id,
      tare_weight: item.attributes.tare_weight || null,
      rfid: item.attributes.rfid || null,
      bypass_tonnage: item.attributes.bypass_tonnage || null,
      updatedAt: item.attributes.updatedAt || null,
    }));

    const sorted = sortAlphabetically(data, "hull_no");

    MASTER_DATA_CACHE.set(cacheKey, sorted);

    return sorted;
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

    return response.data;
  },

  async deleteUnit(id) {
    await offlineService.delete(`/units/${id}`);

    MASTER_DATA_CACHE.clear("units");

    return { success: true };
  },

  async fetchOperators(options = {}) {
    const { forceRefresh = false, userRole } = options;

    const cacheKey = buildCacheKey("operators", { userRole });

    if (!forceRefresh) {
      const cached = MASTER_DATA_CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const params = {
      pagination: { pageSize: 200 },
      sort: ["name:asc"],
    };

    params.populate = getPopulateFields("operators", userRole);

    const response = await offlineService.get("/operators", {
      params,
      cacheKey,
      ttl: 30 * 60 * 1000,
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
  },

  async createOperator(data) {
    const payload = {
      name: data.name,
      company: data.companyId ? parseInt(data.companyId) : null,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await offlineService.post("/operators", { data: payload });

    MASTER_DATA_CACHE.clear("operators");

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

    return response.data;
  },

  async deleteOperator(id) {
    await offlineService.delete(`/operators/${id}`);

    MASTER_DATA_CACHE.clear("operators");

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

    const params = {
      pagination: { pageSize: 100 },
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
      ttl: 35 * 60 * 1000,
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
  },

  async createLocation(data) {
    const response = await offlineService.post("/locations", {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("locations");

    return response.data;
  },

  async updateLocation(id, data) {
    const response = await offlineService.put(`/locations/${id}`, {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("locations");

    return response.data;
  },

  async deleteLocation(id) {
    await offlineService.delete(`/locations/${id}`);

    MASTER_DATA_CACHE.clear("locations");

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

    const params = {
      pagination: { pageSize: 100 },
      sort: ["satker:asc"],
    };

    params.populate = getPopulateFields("work-units", userRole);

    const response = await offlineService.get("/work-units", {
      params,
      cacheKey,
      ttl: 30 * 60 * 1000,
      forceRefresh,
    });

    const data = response.data.map((item) => ({
      id: item.id,
      satker: item.attributes.satker,
      subsatker: item.attributes.subsatker,
      locationIds: item.attributes.locations?.data?.map((loc) => loc.id) || [],
    }));

    const sorted = sortAlphabetically(data, "satker");

    MASTER_DATA_CACHE.set(cacheKey, sorted);

    return sorted;
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

    return response.data;
  },

  async deleteWorkUnit(id) {
    await offlineService.delete(`/work-units/${id}`);

    MASTER_DATA_CACHE.clear("work-units");

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

    const response = await offlineService.get("/coal-types", {
      params: {
        pagination: { pageSize: 50 },
        sort: ["name:asc"],
      },
      cacheKey: "coal_types",
      ttl: 30 * 60 * 1000,
      forceRefresh,
    });

    const data = response.data.map((item) => ({
      id: item.id,
      name: item.attributes.name,
    }));

    const sorted = sortAlphabetically(data, "name");

    MASTER_DATA_CACHE.set("coal-types", sorted);

    return sorted;
  },

  async createCoalType(data) {
    const response = await offlineService.post("/coal-types", {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("coal-types");

    return response.data;
  },

  async updateCoalType(id, data) {
    const response = await offlineService.put(`/coal-types/${id}`, {
      data: { ...data, clientTimestamp: new Date().toISOString() },
    });

    MASTER_DATA_CACHE.clear("coal-types");

    return response.data;
  },

  async deleteCoalType(id) {
    await offlineService.delete(`/coal-types/${id}`);

    MASTER_DATA_CACHE.clear("coal-types");

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

    const params = {
      pagination: { pageSize: 100 },
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

    return response.data;
  },

  async deleteWeightBridge(id) {
    await offlineService.delete(`/weigh-bridges/${id}`);

    MASTER_DATA_CACHE.clear("weigh-bridge");

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
