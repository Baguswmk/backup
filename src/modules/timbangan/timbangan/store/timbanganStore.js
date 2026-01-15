import { create } from "zustand";
import { persist } from "zustand/middleware";
import { timbanganServices } from "@/modules/timbangan/timbangan/services/timbanganServices";
import { showToast } from "@/shared/utils/toast";
import { fleetService } from "@/modules/timbangan/fleet/services/fleetService";
import useAuthStore from "@/modules/auth/store/authStore";
import { secureStorage } from "@/shared/storage/secureStorage";

const uid = () => Math.random().toString(36).slice(2, 10);

const debounceTimers = new Map();

const debounceIndexRebuild = (key, callback, delay = 100) => {
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key));
  }

  const timer = setTimeout(() => {
    callback();
    debounceTimers.delete(key);
  }, delay);

  debounceTimers.set(key, timer);
};

let isRebuilding = false;
let pendingRebuild = null;

const queueIndexRebuild = async (rebuildFn) => {
  pendingRebuild = rebuildFn;

  if (isRebuilding) {
    return;
  }

  isRebuilding = true;

  while (pendingRebuild) {
    const currentRebuild = pendingRebuild;
    pendingRebuild = null;

    try {
      await currentRebuild();
    } catch (error) {
      console.error("❌ Index rebuild error:", error);
    }
  }

  isRebuilding = false;
};

const normalizeHull = (hullNo) => {
  if (!hullNo) return "";

  return String(hullNo)
    .replace(/[\s\-_]+/g, "")
    .toUpperCase()
    .slice(0, 50);
};

const normalizeDateRange = (range) => {
  if (
    !range ||
    (!range.from && !range.to && !range.startDate && !range.endDate)
  ) {
    return null;
  }
  const fromDate = new Date(range.from || range.startDate);
  const toDate = new Date(range.to || range.endDate);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return null;
  }
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);
  return { from: fromDate, to: toDate };
};

const createEmptyFleet = () => ({
  excavator: "",
  loadingLocation: "",
  dumpingLocation: "",
  shift: "",
});

const createEmptyDumptruckSetup = () => ({
  pool: [],
  selectedIds: [],
});

const createEmptyMasters = () => ({
  excavators: [],
  loadingLocations: [],
  dumpingLocations: [],
  shifts: [],
  dumptrucks: [],
});

const createMastersMeta = () => ({
  loading: false,
  loaded: false,
  error: null,
});

const initialState = {
  currentStep: 1,
  setupComplete: false,
  setupData: {
    fleet: createEmptyFleet(),
    dumptrucks: createEmptyDumptruckSetup(),
  },

  fleetConfigs: [],
  activeFleetConfigId: null,
  selectedFleetIds: [],

  fleetConfigsByType: {
    Timbangan: [],
    Bypass: [],
    BeltScale: [],
    FOB: [],
  },
  selectedFleetIdsByType: {
    Timbangan: [],
    Bypass: [],
    BeltScale: [],
    FOB: [],
  },

  fleetSelectionDateRange: null,
  dtIndex: {},
  dtIndexByType: {
    Timbangan: {},
    Bypass: {},
    BeltScale: {},
    FOB: {},
  },
  hiddenDumptrucks: {},
  masters: createEmptyMasters(),
  mastersMeta: createMastersMeta(),

  timbanganData: [],
  selectedItems: [],

  rfidEnabled: false,
  lastRfidScan: null,
  rfidScanHistory: [],

  isLoading: false,
  error: null,
  lastFetchTimestamp: null,
  autoFetchEnabled: true,

  indexRebuildTimestamp: null,
  indexRebuildCount: 0,
};

const encryptedStorage = {
  getItem: (name) => {
    try {
      const value = secureStorage.getItem(name);

      if (value) {
        const jsonString = JSON.stringify(value);
        return jsonString;
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to get encrypted item: ${name}`, error);
      return null;
    }
  },

  setItem: (name, value) => {
    try {
      let objectToEncrypt;

      if (typeof value === "string") {
        objectToEncrypt = JSON.parse(value);
      } else if (typeof value === "object") {
        objectToEncrypt = value;
      } else {
        objectToEncrypt = value;
      }

      secureStorage.setItem(name, objectToEncrypt);
    } catch (error) {
      console.error(`❌ Failed to set encrypted item: ${name}`, error);
      console.error("Value type:", typeof value);
      console.error("Value:", value);
    }
  },

  removeItem: (name) => {
    try {
      secureStorage.removeItem(name);
    } catch (error) {
      console.error(`❌ Failed to remove encrypted item: ${name}`, error);
    }
  },
};

export const useTimbanganStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      hideDumptruck: (hullNo, reason = "submitted") => {
        const key = normalizeHull(hullNo);
        if (!key) return;

        set((state) => ({
          hiddenDumptrucks: {
            ...state.hiddenDumptrucks,
            [key]: {
              timestamp: new Date().toISOString(),
              reason,
              originalHullNo: hullNo,
            },
          },
        }));
      },

      unhideDumptruck: (hullNo) => {
        const key = normalizeHull(hullNo);
        if (!key) return;

        set((state) => {
          const { [key]: _, ...rest } = state.hiddenDumptrucks;
          return { hiddenDumptrucks: rest };
        });
      },

      isHiddenDumptruck: (hullNo) => {
        const state = get();
        const key = normalizeHull(hullNo);
        return !!state.hiddenDumptrucks[key];
      },

      clearHiddenDumptrucks: () => {
        set({ hiddenDumptrucks: {} });
      },

      getHiddenDumptrucks: () => {
        return Object.entries(get().hiddenDumptrucks).map(([key, data]) => ({
          key,
          ...data,
        }));
      },

      cleanupOldHiddenDumptrucks: () => {
        const state = get();
        const now = new Date().getTime();
        const CLEANUP_THRESHOLD = 24 * 60 * 60 * 1000;

        const cleaned = Object.entries(state.hiddenDumptrucks).reduce(
          (acc, [key, data]) => {
            const hiddenTime = new Date(data.timestamp).getTime();
            if (now - hiddenTime < CLEANUP_THRESHOLD) {
              acc[key] = data;
            }
            return acc;
          },
          {}
        );

        set({ hiddenDumptrucks: cleaned });
      },

      _scheduleIndexRebuild: (measurementType = null) => {
        const key = measurementType ? `rebuild-${measurementType}` : "main";
        debounceIndexRebuild(
          key,
          () => {
            const state = get();
            const configs = measurementType
              ? state.fleetConfigsByType[measurementType] || []
              : state.fleetConfigs;

            queueIndexRebuild(() => {
              return get()._executeIndexRebuild(configs, measurementType);
            });
          },
          150
        );
      },

      _executeIndexRebuild: (configs, measurementType = null) => {
        if (!Array.isArray(configs)) {
          console.warn("⚠️ _executeIndexRebuild: configs must be array");
          return;
        }

        const state = get();
        const rebuildId = Date.now();

        const selectedIds = measurementType
          ? state.selectedFleetIdsByType[measurementType] || []
          : state.selectedFleetIds || [];

        let filteredConfigs = configs.filter((cfg) => cfg.status === "ACTIVE");

        if (selectedIds.length > 0) {
          filteredConfigs = filteredConfigs.filter((cfg) =>
            selectedIds.includes(cfg.id)
          );
        } else {
          console.warn(
            `⚠️ No selected fleets for ${
              measurementType || "legacy"
            }, fallback to ALL ACTIVE fleets`
          );
        }

        const idx = {};

        filteredConfigs.forEach((cfg) => {
          const fleetId = String(cfg.id || "");
          const units = Array.isArray(cfg.units) ? cfg.units : [];

          units.forEach((unit) => {
            const dumpTruckId = String(unit.dumpTruckId || "");
            const hull_no = unit.hull_no || "";

            if (!dumpTruckId || !hull_no) {
              console.warn(`⚠️ [${rebuildId}] Skip invalid unit`, unit);
              return;
            }

            const key = normalizeHull(hull_no);
            if (!key) return;

            idx[key] = {
              dumptruckId: dumpTruckId,
              hull_no,
              operator_id: unit.operatorId || null,
              operator_name: unit.operator || null,
              setting_fleet_id: fleetId,
              fleet_name: cfg.name,
              fleet_status: cfg.status,
              measurement_type: cfg.measurementType,
              excavator: cfg.excavator,
              excavatorId: cfg.excavatorId,
              shift: cfg.shift,
              date: cfg.date,
              loading_location: cfg.loadingLocation,
              loadingLocationId: cfg.loadingLocationId,
              dumping_location: cfg.dumpingLocation,
              dumpingLocationId: cfg.dumpingLocationId,
              coal_type: cfg.coalType,
              coalTypeId: cfg.coalTypeId,
              distance: cfg.distance,
              work_unit: cfg.workUnit,
              workUnitId: cfg.workUnitId,
              checker_name: cfg.checker,
              checkerId: cfg.checkerId,
              inspector_name: cfg.inspector,
              inspectorId: cfg.inspectorId,
              company: unit.company,
              companyId: unit.companyId,
              tareWeight: unit.tareWeight ?? null,
              isHidden: !!state.hiddenDumptrucks[key],
            };
          });
        });

        if (measurementType) {
          set((state) => ({
            dtIndexByType: {
              ...state.dtIndexByType,
              [measurementType]: idx,
            },
            indexRebuildTimestamp: new Date().toISOString(),
            indexRebuildCount: state.indexRebuildCount + 1,
          }));
        } else {
          set({
            dtIndex: idx,
            indexRebuildTimestamp: new Date().toISOString(),
            indexRebuildCount: state.indexRebuildCount + 1,
          });
        }
      },

      setDumptruckIndexFromConfigs: (configs, measurementType = null) => {
        if (!Array.isArray(configs)) {
          console.warn(
            "⚠️ setDumptruckIndexFromConfigs: configs must be array"
          );
          return;
        }

        const byType = {
          Timbangan: [],
          FOB: [],
          Bypass: [],
          BeltScale: [],
        };

        configs.forEach((config) => {
          const type = config.measurementType;

          if (type === "Timbangan") {
            byType["Timbangan"].push(config);
          } else if (type === "FOB") {
            byType["FOB"].push(config);
          } else if (type === "Bypass") {
            byType["Bypass"].push(config);
          } else if (type === "BeltScale") {
            byType["BeltScale"].push(config);
          }
        });

        set({
          fleetConfigs: configs,
          fleetConfigsByType: byType,
        });

        const state = get();
        const selectedIds = measurementType
          ? state.selectedFleetIdsByType[measurementType] || []
          : state.selectedFleetIds || [];

        if (selectedIds.length > 0) {
          get()._executeIndexRebuild(configs, measurementType);
        } else {
          get()._scheduleIndexRebuild(measurementType);
        }
      },

      setSelectedFleetsByType: (fleetIds, measurementType) => {
        const ids = Array.isArray(fleetIds) ? fleetIds : [];

        set((state) => ({
          selectedFleetIdsByType: {
            ...state.selectedFleetIdsByType,
            [measurementType]: ids,
          },
        }));

        const configs = get().fleetConfigsByType[measurementType] || [];
        if (ids.length > 0) {
          get()._executeIndexRebuild(configs, measurementType);
        } else {
          get()._scheduleIndexRebuild(measurementType);
        }
      },

      getSelectedFleetsByType: (measurementType) => {
        return get().selectedFleetIdsByType[measurementType] || [];
      },

      setSelectedFleets: (fleetIds) => {
        const ids = Array.isArray(fleetIds) ? fleetIds : [];
        set({ selectedFleetIds: ids });

        const state = get();
        if (ids.length > 0) {
          get()._executeIndexRebuild(state.fleetConfigs);
        } else {
          get()._scheduleIndexRebuild();
        }
      },

      addSelectedFleet: (fleetId) => {
        set((state) => {
          const newIds = [...new Set([...state.selectedFleetIds, fleetId])];
          return { selectedFleetIds: newIds };
        });
        get()._scheduleIndexRebuild();
      },

      removeSelectedFleet: (fleetId) => {
        set((state) => {
          const newIds = state.selectedFleetIds.filter((id) => id !== fleetId);
          return { selectedFleetIds: newIds };
        });
        get()._scheduleIndexRebuild();
      },

      toggleSelectedFleet: (fleetId) => {
        set((state) => {
          const isSelected = state.selectedFleetIds.includes(fleetId);
          const newIds = isSelected
            ? state.selectedFleetIds.filter((id) => id !== fleetId)
            : [...state.selectedFleetIds, fleetId];
          return { selectedFleetIds: newIds };
        });
        get()._scheduleIndexRebuild();
      },

      clearSelectedFleets: () => {
        set({ selectedFleetIds: [] });
        get()._scheduleIndexRebuild();
      },

      getSelectedFleets: () => {
        const state = get();
        return state.fleetConfigs.filter((f) =>
          state.selectedFleetIds.includes(f.id)
        );
      },

      findByHullNo: (hullNo, includeHidden = false, measurementType = null) => {
        const state = get();

        const index = measurementType
          ? state.dtIndexByType[measurementType] || {}
          : state.dtIndex;

        if (Object.keys(index).length === 0) {
          return null;
        }

        const key = normalizeHull(hullNo);
        if (!key) {
          return null;
        }

        const result = index[key] || null;

        if (result) {
          if (!includeHidden && state.hiddenDumptrucks[key]) {
            return null;
          }
        }
        return result;
      },

      addFleetConfig: (config) =>
        set((state) => {
          const newConfig = {
            ...config,
            id: config.id || `fleet-${Date.now()}`,
            createdAt: config.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const measurementType = newConfig.measurementType;

          if (measurementType && state.fleetConfigsByType[measurementType]) {
            const updatedConfigs = [
              ...state.fleetConfigsByType[measurementType],
              newConfig,
            ];

            if (newConfig.status === "ACTIVE") {
              const newSelectedIds = [
                ...new Set([
                  ...state.selectedFleetIdsByType[measurementType],
                  newConfig.id,
                ]),
              ];

              get().setSelectedFleetsByType(newSelectedIds, measurementType);
            }

            get().setDumptruckIndexFromConfigs(updatedConfigs, measurementType);

            return {
              fleetConfigsByType: {
                ...state.fleetConfigsByType,
                [measurementType]: updatedConfigs,
              },
            };
          }

          const newConfigs = [...state.fleetConfigs, newConfig];
          if (newConfig.status === "ACTIVE") {
            const newSelectedIds = [
              ...new Set([...state.selectedFleetIds, newConfig.id]),
            ];
            get().setSelectedFleets(newSelectedIds);
            get().setDumptruckIndexFromConfigs(newConfigs);
            return {
              fleetConfigs: newConfigs,
              selectedFleetIds: newSelectedIds,
            };
          }

          get().setDumptruckIndexFromConfigs(newConfigs);
          return { fleetConfigs: newConfigs };
        }),

      updateFleetConfig: (configId, updates) =>
        set((state) => {
          let foundType = null;
          for (const [type, configs] of Object.entries(
            state.fleetConfigsByType
          )) {
            if (configs.some((c) => c.id === configId)) {
              foundType = type;
              break;
            }
          }

          if (foundType) {
            const updatedConfigs = state.fleetConfigsByType[foundType].map(
              (config) =>
                config.id === configId
                  ? {
                      ...config,
                      ...updates,
                      updatedAt: new Date().toISOString(),
                    }
                  : config
            );

            let newSelectedIds = [...state.selectedFleetIdsByType[foundType]];
            const updatedConfig = updatedConfigs.find((c) => c.id === configId);

            if (
              updatedConfig?.status === "ACTIVE" &&
              !newSelectedIds.includes(configId)
            ) {
              newSelectedIds = [...new Set([...newSelectedIds, configId])];
            }

            if (
              updatedConfig?.status !== "ACTIVE" &&
              newSelectedIds.includes(configId)
            ) {
              newSelectedIds = newSelectedIds.filter((id) => id !== configId);
            }

            if (
              newSelectedIds.length !==
              state.selectedFleetIdsByType[foundType].length
            ) {
              get().setSelectedFleetsByType(newSelectedIds, foundType);
            }
            get().setDumptruckIndexFromConfigs(updatedConfigs, foundType);

            return {
              fleetConfigsByType: {
                ...state.fleetConfigsByType,
                [foundType]: updatedConfigs,
              },
              selectedFleetIdsByType: {
                ...state.selectedFleetIdsByType,
                [foundType]: newSelectedIds,
              },
            };
          }

          const newConfigs = state.fleetConfigs.map((config) =>
            config.id === configId
              ? { ...config, ...updates, updatedAt: new Date().toISOString() }
              : config
          );

          let newSelectedIds = [...state.selectedFleetIds];
          const updatedConfig = newConfigs.find((c) => c.id === configId);

          if (
            updatedConfig?.status === "ACTIVE" &&
            !newSelectedIds.includes(configId)
          ) {
            newSelectedIds = [...new Set([...newSelectedIds, configId])];
          }

          if (
            updatedConfig?.status !== "ACTIVE" &&
            newSelectedIds.includes(configId)
          ) {
            newSelectedIds = newSelectedIds.filter((id) => id !== configId);
          }

          if (newSelectedIds.length !== state.selectedFleetIds.length) {
            get().setSelectedFleets(newSelectedIds);
          }
          get().setDumptruckIndexFromConfigs(newConfigs);

          return {
            fleetConfigs: newConfigs,
            selectedFleetIds: newSelectedIds,
          };
        }),

      deleteFleetConfig: (configId) =>
        set((state) => {
          let foundType = null;
          for (const [type, configs] of Object.entries(
            state.fleetConfigsByType
          )) {
            if (configs.some((c) => c.id === configId)) {
              foundType = type;
              break;
            }
          }

          if (foundType) {
            const newConfigs = state.fleetConfigsByType[foundType].filter(
              (c) => c.id !== configId
            );
            const newSelectedFleetIds = state.selectedFleetIdsByType[
              foundType
            ].filter((id) => id !== configId);

            get().setDumptruckIndexFromConfigs(newConfigs, foundType);

            return {
              fleetConfigsByType: {
                ...state.fleetConfigsByType,
                [foundType]: newConfigs,
              },
              selectedFleetIdsByType: {
                ...state.selectedFleetIdsByType,
                [foundType]: newSelectedFleetIds,
              },
            };
          }

          const isActive = state.activeFleetConfigId === configId;
          const newConfigs = state.fleetConfigs.filter(
            (c) => c.id !== configId
          );
          const newSelectedFleetIds = state.selectedFleetIds.filter(
            (id) => id !== configId
          );

          get().setDumptruckIndexFromConfigs(newConfigs);

          return {
            fleetConfigs: newConfigs,
            selectedFleetIds: newSelectedFleetIds,
            activeFleetConfigId: isActive ? null : state.activeFleetConfigId,
            setupComplete: isActive ? false : state.setupComplete,
          };
        }),

      loadFleetConfigsFromAPI: async (
        forceRefresh = false,
        dateRange = null,
        measurementType = null
      ) => {
        set({ isLoading: true, error: null });

        try {
          const { user } = useAuthStore.getState();

          if (!user) {
            throw new Error("User belum login");
          }

          const weighBridgeId =
            user.weigh_bridge?.id || user.weigh_bridge || null;

          const effectiveDateRange =
            dateRange === null
              ? null
              : dateRange ||
                (() => {
                  const today = new Date();
                  const iso = today.toISOString().slice(0, 10);
                  return { from: iso, to: iso };
                })();

          const result = await fleetService.fetchFleetConfigs({
            user,
            viewMode: "normal",
            weighBridgeId,
            forceRefresh,
            dateRange: effectiveDateRange,
            measurementType,
            skipAutoActivate: true,
          });

          if (result.success) {
            if (measurementType) {
              set((state) => ({
                fleetConfigsByType: {
                  ...state.fleetConfigsByType,
                  [measurementType]: result.data,
                },
                isLoading: false,
                error: null,
                lastFetchTimestamp: new Date().toISOString(),
              }));

              get().setDumptruckIndexFromConfigs(result.data, measurementType);
            } else {
              const state = get();
              const existingSelectedIds = state.selectedFleetIds || [];
              const existingSelectedFleets = state.fleetConfigs.filter((f) =>
                existingSelectedIds.includes(f.id)
              );

              const mergedConfigs = [...existingSelectedFleets, ...result.data];
              const uniqueConfigs = Array.from(
                new Map(mergedConfigs.map((c) => [c.id, c])).values()
              );

              set({
                fleetConfigs: uniqueConfigs,
                isLoading: false,
                error: null,
                lastFetchTimestamp: new Date().toISOString(),
              });

              get().setDumptruckIndexFromConfigs(uniqueConfigs);
            }

            get().cleanupOldHiddenDumptrucks();

            return { success: true, data: result.data };
          }

          throw new Error(result.error || "Gagal memuat konfigurasi fleet");
        } catch (error) {
          console.error("❌ loadFleetConfigsFromAPI error:", error);
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      syncFleetConfigToAPI: async (configId) => {
        const config = get().fleetConfigs.find((c) => c.id === configId);
        if (!config) return { success: false, error: "Config not found" };

        try {
          const result = await timbanganServices.updateFleetConfig(
            configId,
            config
          );
          return result;
        } catch (error) {
          showToast.error("Failed to sync fleet config", {
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      },

      loadTimbanganDataFromAPI: async (
        dateRange = null,
        forceRefresh = true
      ) => {
        set({ isLoading: true });

        try {
          const filters = { forceRefresh };

          if (dateRange) {
            filters.startDate =
              dateRange.from?.toISOString?.() || dateRange.from;
            filters.endDate = dateRange.to?.toISOString?.() || dateRange.to;
          }

          const result = await timbanganServices.fetchTimbanganData(filters);
          if (result.success) {
            set({
              timbanganData: result.data,
              isLoading: false,
              lastFetchTimestamp: new Date().toISOString(),
            });

            return { success: true };
          }

          throw new Error(result.error);
        } catch (error) {
          console.error("❌ loadTimbanganDataFromAPI error:", error);
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      autoFetchTimbanganData: async (dateRange = null) => {
        const state = get();

        if (!state.autoFetchEnabled) {
          return { success: false, reason: "disabled" };
        }

        const result = await get().loadTimbanganDataFromAPI(dateRange, true);
        return result;
      },

      setActiveFleetConfig: (configId) =>
        set((state) => {
          const config = state.fleetConfigs.find((c) => c.id === configId);
          if (!config) return state;

          const updatedConfigs = state.fleetConfigs.map((c) => ({
            ...c,
          }));

          return {
            fleetConfigs: updatedConfigs,
            activeFleetConfigId: configId,
            setupComplete: true,
            setupData: {
              fleet: {
                excavator: config.excavator,
                loadingLocation: config.loadingLocation,
                dumpingLocation: config.dumpingLocation,
                shift: config.shift,
              },
              dumptrucks: {
                ...state.setupData.dumptrucks,
                selectedIds: config.dumptrucks || [],
              },
            },
          };
        }),

      getActiveFleetConfig: () => {
        const state = get();
        return state.fleetConfigs.find(
          (c) => c.id === state.activeFleetConfigId
        );
      },

      setFleetField: (key, value) => {
        const safeValue =
          typeof value === "string" ? value.trim() : value ?? "";
        set((state) => ({
          setupData: {
            ...state.setupData,
            fleet: {
              ...state.setupData.fleet,
              [key]: safeValue,
            },
          },
        }));
      },

      setDumptruckPool: (list) => {
        const safePool = Array.isArray(list)
          ? list.map((item) => ({ ...item }))
          : [];
        set((state) => {
          const selectedIds = state.setupData.dumptrucks.selectedIds.filter(
            (id) => safePool.some((dt) => dt.id === id)
          );
          return {
            setupData: {
              ...state.setupData,
              dumptrucks: {
                pool: safePool,
                selectedIds,
              },
            },
          };
        });
      },

      setDumptruckSelection: (ids) =>
        set((state) => {
          const poolIds = new Set(
            state.setupData.dumptrucks.pool.map((dt) => dt.id)
          );
          const uniqueIds = Array.from(new Set(ids || [])).filter((id) =>
            poolIds.has(id)
          );

          return {
            setupData: {
              ...state.setupData,
              dumptrucks: {
                ...state.setupData.dumptrucks,
                selectedIds: uniqueIds,
              },
            },
          };
        }),

      toggleDumptruck: (id) => {
        if (!id) return;
        const state = get();
        if (!state.setupData.dumptrucks.pool.some((dt) => dt.id === id)) {
          return;
        }
        const selectedSet = new Set(state.setupData.dumptrucks.selectedIds);
        if (selectedSet.has(id)) {
          selectedSet.delete(id);
        } else {
          selectedSet.add(id);
        }
        get().setDumptruckSelection([...selectedSet]);
      },

      addManualDumptruck: (dt) => {
        if (!dt?.id) return;
        set((state) => {
          const exists = state.setupData.dumptrucks.pool.some(
            (item) => item.id === dt.id
          );
          if (exists) return state;

          const newEntry = {
            id: dt.id,
            hullNo: dt.hullNo ?? dt.id,
            plateNo: dt.plateNo ?? dt.plate ?? "",
            label: dt.label ?? dt.hullNo ?? dt.id,
            capacity: dt.capacity ?? 20,
            contractor: dt.contractor ?? "-",
          };

          return {
            setupData: {
              ...state.setupData,
              dumptrucks: {
                ...state.setupData.dumptrucks,
                pool: [...state.setupData.dumptrucks.pool, newEntry],
              },
            },
            masters: {
              ...state.masters,
              dumptrucks: [...state.masters.dumptrucks, newEntry],
            },
          };
        });
      },

      setFleetSelectionDateRange: (dateRange) =>
        set({ fleetSelectionDateRange: dateRange }),
      getFleetSelectionDateRange: () => get().fleetSelectionDateRange,

      setMasters: (masters) => {
        if (!masters) return;
        set((state) => ({
          masters: {
            excavators: masters.excavators ?? state.masters.excavators,
            loadingLocations:
              masters.loadingLocations ?? state.masters.loadingLocations,
            dumpingLocations:
              masters.dumpingLocations ?? state.masters.dumpingLocations,
            shifts: masters.shifts ?? state.masters.shifts,
            dumptrucks: masters.dumptrucks ?? state.masters.dumptrucks,
            companies: masters.companies ?? state.masters.companies,
            workUnits: masters.workUnits ?? state.masters.workUnits,
            coalTypes: masters.coalTypes ?? state.masters.coalTypes,
            users: masters.users ?? state.masters.users,
          },
          mastersMeta: {
            ...state.mastersMeta,
            loading: false,
            loaded: true,
            error: null,
          },
        }));
      },

      setMastersLoading: (loading) =>
        set((state) => ({
          mastersMeta: {
            ...state.mastersMeta,
            loading,
            error: loading ? null : state.mastersMeta.error,
          },
        })),

      setMastersError: (errorMessage) =>
        set((state) => ({
          mastersMeta: {
            ...state.mastersMeta,
            loading: false,
            error: errorMessage ?? null,
          },
        })),

      addTimbanganEntry: (entry) =>
        set((state) => ({
          timbanganData: [
            ...state.timbanganData,
            {
              id: entry.id || uid(),
              ...entry,
              timestamp: entry.timestamp || new Date().toISOString(),
              createdAt: entry.createdAt || new Date().toISOString(),
            },
          ],
        })),

      updateTimbanganEntry: (id, updatedData) =>
        set((state) => ({
          timbanganData: state.timbanganData.map((item) =>
            item.id === id
              ? { ...item, ...updatedData, updatedAt: new Date().toISOString() }
              : item
          ),
        })),

      deleteTimbanganEntry: (id) =>
        set((state) => ({
          timbanganData: state.timbanganData.filter((item) => item.id !== id),
        })),

      deleteMultipleTimbanganEntries: (ids) =>
        set((state) => ({
          timbanganData: state.timbanganData.filter(
            (item) => !ids.includes(item.id)
          ),
          selectedItems: [],
        })),

      toggleSelectItem: (id) =>
        set((state) => ({
          selectedItems: state.selectedItems.includes(id)
            ? state.selectedItems.filter((itemId) => itemId !== id)
            : [...state.selectedItems, id],
        })),

      toggleSelectAll: () =>
        set((state) => ({
          selectedItems:
            state.selectedItems.length === state.timbanganData.length
              ? []
              : state.timbanganData.map((item) => item.id),
        })),

      getTimbanganData: (dateRange = null) => {
        const data = get().timbanganData;

        const normalizedRange = normalizeDateRange(dateRange);
        if (!normalizedRange) {
          return data;
        }

        return data.filter((item) => {
          const itemDate = new Date(item.tanggal);
          if (isNaN(itemDate.getTime())) return false;

          return (
            itemDate >= normalizedRange.from && itemDate <= normalizedRange.to
          );
        });
      },
      setRfidEnabled: (enabled) => set({ rfidEnabled: enabled }),
      recordRfidScan: (hullNo) => {
        const scan = {
          hullNo,
          timestamp: new Date().toISOString(),
          success: false,
        };

        const state = get();
        const found = state.findByHullNo(hullNo, false);

        if (found) {
          scan.success = true;
          scan.fleetId = found.setting_fleet_id;
          scan.excavator = found.excavator;
        }

        set((state) => ({
          lastRfidScan: scan,
          rfidScanHistory: [scan, ...state.rfidScanHistory].slice(0, 20),
        }));

        return scan;
      },

      clearLastRfidScan: () => set({ lastRfidScan: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      resetSetup: () =>
        set({
          ...initialState,
          masters: get().masters,
          mastersMeta: get().mastersMeta,
          selectedFleetIds: get().selectedFleetIds,
          hiddenDumptrucks: get().hiddenDumptrucks,
        }),

      restoreSetup: (setupData) => {
        if (!setupData) return;

        set((state) => ({
          ...state,
          setupComplete: setupData.isComplete || false,
          setupData: {
            fleet: setupData.fleet || createEmptyFleet(),
            dumptrucks: {
              pool: Array.isArray(setupData.dumptrucks?.pool)
                ? setupData.dumptrucks.pool
                : [],
              selectedIds: Array.isArray(setupData.dumptrucks?.selectedIds)
                ? setupData.dumptrucks.selectedIds
                : [],
            },
          },
        }));
      },
    }),
    {
      name: "timbangan-store",
      version: 1,

      partialize: (state) => ({
        selectedFleetIds: state.selectedFleetIds,
        masters: state.masters,
        mastersMeta: state.mastersMeta,
        fleetConfigs: state.fleetConfigs,
        fleetConfigsByType: state.fleetConfigsByType,
        selectedFleetIdsByType: state.selectedFleetIdsByType,
        hiddenDumptrucks: state.hiddenDumptrucks,
        setupComplete: state.setupComplete,
        setupData: state.setupData,
        lastFetchTimestamp: state.lastFetchTimestamp,
        fleetSelectionDateRange: state.fleetSelectionDateRange,
        dtIndex: state.dtIndex,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.fleetConfigs && state.fleetConfigs.length > 0) {
          const hasDtIndex =
            state.dtIndex && Object.keys(state.dtIndex).length > 0;
          if (!hasDtIndex) {
            state.setDumptruckIndexFromConfigs(state.fleetConfigs);
          }
        }
      },
      migrate: (persistedState) => {
        return persistedState;
      },
    }
  )
);

export { normalizeDateRange, normalizeHull };
