import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { fleetService } from "@/modules/timbangan/fleet/services/fleetService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { offlineService } from "@/shared/services/offlineService";
import { format } from "date-fns";
import { getCurrentShift } from "@/shared/utils/shift";
import { getTodayDateRange, isDateRangeToday } from "@/shared/utils/date";
import { withErrorHandling } from "@/shared/utils/errorHandler";

const CACHE_CONFIG = {
  MASTERS_CACHE_DURATION: 30 * 60 * 1000,
};

let mastersCache = {
  data: null,
  timestamp: null,
  loading: false,
};

const getUserRoleInfo = (user) => {
  if (!user) return { role: "Unknown", identifier: "N/A" };

  const role = user.role?.toLowerCase();

  switch (role) {
    case "super_admin":
      return { role: "Super Admin", identifier: "All Data" };
    case "mitra":
    case "pengawas":
    case "checker":
      return {
        role: role.charAt(0).toUpperCase() + role.slice(1),
        identifier: user.company?.name || "No Company",
      };
    case "operator_jt":
      return {
        role: "Operator JT",
        identifier: user.weigh_bridge?.name || "No Bridge",
      };
    case "admin":
    case "pic":
    case "evaluator":
      return {
        role: role.charAt(0).toUpperCase() + role.slice(1),
        identifier: user.work_unit?.subsatker || "No Work Unit",
      };
    default:
      return { role: role, identifier: "Unknown" };
  }
};

export const useFleet = (userAuth = null, measurementType = null) => {
  const fleetConfigs = useTimbanganStore((state) => state.fleetConfigs);
  const selectedFleetIds = useTimbanganStore((state) => state.selectedFleetIds);
  const setSelectedFleets = useTimbanganStore(
    (state) => state.setSelectedFleets
  );
  const setDumptruckIndexFromConfigs = useTimbanganStore(
    (state) => state.setDumptruckIndexFromConfigs
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [masters, setMasters] = useState({
    excavators: [],
    loadingLocations: [],
    dumpingLocations: [],
    shifts: [],
    status: [],
    workUnits: [],
    companies: [],
    coalTypes: [],
    users: [],
    dumpTruck: [],
  });
  const [mastersLoading, setMastersLoading] = useState(false);

  const [viewMode, setViewMode] = useState("normal");
  const [currentShift, setCurrentShift] = useState(() => getCurrentShift());
  const [viewingShift, setViewingShift] = useState(() => getCurrentShift());
  const [viewingDateRange, setViewingDateRange] = useState(getTodayDateRange());
  const previousViewingDateRangeRef = useRef(viewingDateRange);
  const isInitializedRef = useRef(false);
  const abortControllerRef = useRef(null);
  const pendingFleetRequestRef = useRef(null);

  const user = useMemo(() => userAuth?.user, [userAuth]);
  const userRoleInfo = useMemo(() => getUserRoleInfo(user), [user]);

  const filteredFleetConfigs = useMemo(() => fleetConfigs, [fleetConfigs]);

  const activeFleetConfigs = useMemo(() => {
    return filteredFleetConfigs.filter((f) => f.status === "ACTIVE");
  }, [filteredFleetConfigs]);

  const loadMasters = useCallback(
    async (options = {}) => {
      const { forceRefresh = false } = options;

      const now = Date.now();
      const cacheAge = mastersCache.timestamp
        ? now - mastersCache.timestamp
        : Infinity;
      const isCacheValid = cacheAge < CACHE_CONFIG.MASTERS_CACHE_DURATION;

      if (!forceRefresh && mastersCache.data && isCacheValid) {
        setMasters(mastersCache.data);
        return { success: true, fromCache: true };
      }

      if (mastersCache.loading) {
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!mastersCache.loading) {
              clearInterval(checkInterval);
              setMasters(mastersCache.data || masters);
              resolve({ success: true, fromCache: true });
            }
          }, 100);
        });
      }

      mastersCache.loading = true;
      setMastersLoading(true);

      return await withErrorHandling(
        async () => {
          const [
            excavators,
            loadingLocs,
            dumpingLocs,
            workUnits,
            companies,
            coalTypes,
            users,
            dumpTruck,
            weighBridges,
          ] = await Promise.all([
            masterDataService.fetchUnits({ type: "EXCAVATOR" }),
            masterDataService.fetchLocations({ type: "LOADING" }),
            masterDataService.fetchLocations({ type: "DUMPING" }),
            masterDataService.fetchWorkUnits(),
            masterDataService.fetchCompanies(),
            masterDataService.fetchCoalTypes(),
            masterDataService.fetchUsers(),
            masterDataService.fetchUnits({ type: "DUMP_TRUCK" }),
            masterDataService.fetchWeightBridges(),
          ]);

          const shifts = [
            { id: "shift-1", name: "Shift 1" },
            { id: "shift-2", name: "Shift 2" },
            { id: "shift-3", name: "Shift 3" },
          ];

          const status = [
            { id: "ACTIVE", name: "Active" },
            { id: "INACTIVE", name: "Inactive" },
            { id: "CLOSED", name: "Closed" },
          ];

          const mastersData = {
            excavators,
            loadingLocations: loadingLocs,
            dumpingLocations: dumpingLocs,
            shifts,
            status,
            workUnits,
            companies,
            coalTypes,
            users,
            dumpTruck,
            weighBridges,
          };

          mastersCache.data = mastersData;
          mastersCache.timestamp = Date.now();
          mastersCache.loading = false;

          setMasters(mastersData);

          return { success: true, fromCache: false };
        },
        {
          operation: "load masters",
          showSuccessToast: false,
          onError: () => {
            mastersCache.loading = false;
            setMastersLoading(false);
          },
        }
      ).finally(() => {
        setMastersLoading(false);
      });
    },
    [masters]
  );

  const preloadAllFleets = useCallback(
    async (options = {}) => {
      if (pendingFleetRequestRef.current && !options.forceRefresh) {
        return pendingFleetRequestRef.current;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsLoading(true);
      setError(null);

      const requestPromise = withErrorHandling(
        async () => {
          const effectiveDateRange = options.dateRange || viewingDateRange;
          const effectiveShift =
            options.shift || viewingShift || getCurrentShift();
          const effectiveMeasurementType =
            measurementType || options.measurementType || "Timbangan";

          if (options.forceRefresh) {
            if (isDateRangeToday(effectiveDateRange)) {
              await offlineService.clearCache("fleets_");
            } else {
              await offlineService.clearCache(
                `fleets_${effectiveDateRange.from}_${effectiveDateRange.to}`
              );
            }
          }

          const result = await fleetService.fetchFleetConfigs({
            user,
            forceRefresh: options.forceRefresh || false,
            dateRange: effectiveDateRange,
            shift: effectiveShift,
            measurementType: effectiveMeasurementType,
            signal,
          });

          if (!result.success) {
            throw new Error(result.error || "Failed to fetch fleet configs");
          }

          const allConfigs = result.data || [];

          const currentStore = useTimbanganStore.getState();
          const existingSelectedIds = currentStore.selectedFleetIds || [];

          const existingSelectedFleets = currentStore.fleetConfigs.filter((f) =>
            existingSelectedIds.includes(f.id)
          );

          const mergedConfigs = [...existingSelectedFleets, ...allConfigs];
          const uniqueConfigs = Array.from(
            new Map(mergedConfigs.map((c) => [c.id, c])).values()
          );

          const store = useTimbanganStore.getState();
          store.setDumptruckIndexFromConfigs(uniqueConfigs, measurementType);

          const byType = {
            Timbangan: [],
            FOB: [],
            Bypass: [],
            BeltScale: [],
          };

          uniqueConfigs.forEach((config) => {
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

          useTimbanganStore.setState({
            fleetConfigs: uniqueConfigs,
            fleetConfigsByType: byType,
          });

          const isViewingToday = isDateRangeToday(effectiveDateRange);

          if (
            viewMode === "normal" &&
            isViewingToday &&
            !options.skipAutoActivate
          ) {
            const today = format(new Date(), "yyyy-MM-dd");
            const activeToday = allConfigs.filter(
              (c) => c.status === "ACTIVE" && c.date === today
            );

            if (activeToday.length > 0) {
              const activeIds = activeToday.map((c) => c.id);
              setSelectedFleets(activeIds);
              setDumptruckIndexFromConfigs(uniqueConfigs);
            }
          } else {
            setDumptruckIndexFromConfigs(uniqueConfigs);
          }

          return {
            success: true,
            data: allConfigs,
          };
        },
        {
          operation: "preload fleets",
          showSuccessToast: false,
          onError: (err) => {
            if (err.name !== "AbortError") {
              setError(err.message);
            }
          },
        }
      ).finally(() => {
        setIsLoading(false);
        abortControllerRef.current = null;
        pendingFleetRequestRef.current = null;
      });

      pendingFleetRequestRef.current = requestPromise;
      return requestPromise;
    },
    [
      user,
      viewMode,
      setSelectedFleets,
      setDumptruckIndexFromConfigs,
      viewingDateRange,
      viewingShift,
      measurementType,
    ]
  );

  const loadFleetConfigs = useCallback(
    async (options = {}) => {
      const loadingState = options.isRefresh ? setIsRefreshing : setIsLoading;
      loadingState(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          const effectiveDateRange = options.dateRange || viewingDateRange;
          const effectiveShift =
            options.shift || viewingShift || getCurrentShift();
          const effectiveMeasurementType =
            measurementType || options.measurementType || "Timbangan";

          const isViewingToday = isDateRangeToday(effectiveDateRange);

          if (options.forceRefresh) {
            if (isViewingToday) {
              fleetService.clearCache();
            } else {
              offlineService.clearCache(
                `fleets_${effectiveDateRange.from}_${effectiveDateRange.to}`
              );
            }
          }

          const result = await fleetService.fetchFleetConfigs({
            user,
            forceRefresh: true,
            dateRange: effectiveDateRange,
            shift: effectiveShift,
            measurementType: effectiveMeasurementType,
          });

          if (result.success) {
            const currentConfigs = useTimbanganStore.getState().fleetConfigs;
            const uniqueConfigs = Array.from(
              new Map(
                [...currentConfigs, ...result.data].map((c) => [c.id, c])
              ).values()
            );

            const byType = {
              Timbangan: [],
              FOB: [],
              Bypass: [],
              BeltScale: [],
            };

            uniqueConfigs.forEach((config) => {
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

            useTimbanganStore.setState({
              fleetConfigs: uniqueConfigs,
              fleetConfigsByType: byType,
            });

            if (
              viewMode === "normal" &&
              isViewingToday &&
              !options.skipAutoActivate &&
              result.data.length > 0
            ) {
              const today = format(new Date(), "yyyy-MM-dd");
              const activeToday = result.data.filter(
                (c) => c.status === "ACTIVE" && c.date === today
              );

              if (activeToday.length > 0) {
                const activeIds = activeToday.map((c) => c.id);
                const currentSelectedIds =
                  useTimbanganStore.getState().selectedFleetIds;

                const updatedSelection = Array.from(
                  new Set([...currentSelectedIds, ...activeIds])
                );

                const finalSelection = updatedSelection.filter((id) => {
                  const fleet = uniqueConfigs.find((c) => c.id === id);
                  return (
                    fleet && fleet.status === "ACTIVE" && fleet.date === today
                  );
                });

                if (finalSelection.length !== currentSelectedIds.length) {
                  setSelectedFleets(finalSelection);
                }

                setDumptruckIndexFromConfigs(uniqueConfigs);
              }
            } else if (result.data.length === 0) {
              setDumptruckIndexFromConfigs(uniqueConfigs);
            }
            return { success: true, data: result.data };
          }

          throw new Error(result.error || "Failed to load fleet configs");
        },
        {
          operation: "load fleet configs",
          showSuccessToast: false,
          onError: (err) => setError(err.message),
        }
      ).finally(() => {
        loadingState(false);
      });
    },
    [
      user,
      viewMode,
      viewingDateRange,
      setSelectedFleets,
      viewingShift,
      setDumptruckIndexFromConfigs,
      measurementType,
    ]
  );

  const createFleetConfig = useCallback(
    async (configData) => {
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          if (!configData.inspectorId)
            throw new Error("Inspector wajib dipilih");
          if (!configData.checkerId) throw new Error("Checker wajib dipilih");

          const enrichedData = {
            ...configData,
            createdByUserId: user?.id || null,
          };

          if (!enrichedData.measurement_type) {
            const fleetTypeMap = {
              Jembatan: "Timbangan",
              Timbangan: "Timbangan",
              FOB: "FOB",
              Bypass: "Bypass",
              BeltScale: "BeltScale",
            };

            const fleetType =
              configData.fleetType || measurementType || "Timbangan";
            enrichedData.measurement_type =
              fleetTypeMap[fleetType] || measurementType || "Timbangan";
          }

          const isTimbangan = enrichedData.measurement_type === "Timbangan";

          if (isTimbangan) {
            if (
              (userRoleInfo.role === "Operator JT" ||
                user?.role === "operator_jt") &&
              !enrichedData.weightBridgeId
            ) {
              throw new Error("Weigh bridge tidak ditemukan untuk operator JT");
            }

            if (
              (user?.role === "ccr" || user?.role === "super_admin") &&
              !enrichedData.weightBridgeId
            ) {
              throw new Error(
                "Jembatan timbang wajib dipilih untuk fleet Timbangan"
              );
            }
          }

          const satkerId = user?.work_unit?.id || user?.workUnit?.id;
          if (
            (userRoleInfo.role === "Admin" || user?.role === "admin") &&
            satkerId
          ) {
            enrichedData.workUnitId = satkerId;
          }

          const result = await fleetService.createFleetConfig(enrichedData);

          if (result.success) {
            await new Promise((resolve) => setTimeout(resolve, 500));

            await loadFleetConfigs({
              forceRefresh: true,
              skipAutoActivate: false,
            });

            return { success: true, data: result.data };
          }

          throw new Error(
            result.error || result.message || "Failed to create config"
          );
        },
        {
          operation: "create fleet config",
          showSuccessToast: true,
          onError: (err) => setError(err.message),
        }
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [loadFleetConfigs, user, userRoleInfo, measurementType]
  );

  const updateConfig = useCallback(
    async (configId, updates) => {
      setIsLoading(true);
      setError(null);

      const currentConfigs = useTimbanganStore.getState().fleetConfigs;
      const optimisticConfigs = currentConfigs.map((c) =>
        c.id === configId ? { ...c, ...updates } : c
      );

      useTimbanganStore.setState({ fleetConfigs: optimisticConfigs });

      return await withErrorHandling(
        async () => {
          const result = await fleetService.updateFleetConfig(
            configId,
            updates
          );

          if (result.success) {
            setTimeout(() => {
              loadFleetConfigs({
                forceRefresh: true,
                skipAutoActivate: false,
              });
            }, 300);

            return { success: true, data: result.data };
          }

          useTimbanganStore.setState({ fleetConfigs: currentConfigs });
          throw new Error(result.error || "Failed to update config");
        },
        {
          operation: "update fleet config",
          showSuccessToast: true,
          successMessage: "Konfigurasi fleet berhasil diperbarui",
          onError: (err) => {
            useTimbanganStore.setState({ fleetConfigs: currentConfigs });
            setError(err.message);
          },
        }
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [loadFleetConfigs]
  );

  const deleteConfig = useCallback(
    async (configId) => {
      setIsLoading(true);
      setError(null);

      const currentState = useTimbanganStore.getState();
      const currentConfigs = currentState.fleetConfigs;

      const backup = {
        fleetConfigs: [...currentConfigs],
        fleetConfigsByType: { ...currentState.fleetConfigsByType },
        selectedFleetIds: [...currentState.selectedFleetIds],
        selectedFleetIdsByType: { ...currentState.selectedFleetIdsByType },
      };

      const optimisticConfigs = currentConfigs.filter((c) => c.id !== configId);

      let foundType = null;
      for (const [type, configs] of Object.entries(
        currentState.fleetConfigsByType
      )) {
        if (configs.some((c) => c.id === configId)) {
          foundType = type;
          break;
        }
      }

      if (foundType) {
        const optimisticByType = {
          ...currentState.fleetConfigsByType,
          [foundType]: currentState.fleetConfigsByType[foundType].filter(
            (c) => c.id !== configId
          ),
        };

        const optimisticSelectedByType = {
          ...currentState.selectedFleetIdsByType,
          [foundType]: currentState.selectedFleetIdsByType[foundType].filter(
            (id) => id !== configId
          ),
        };

        useTimbanganStore.setState({
          fleetConfigs: optimisticConfigs,
          fleetConfigsByType: optimisticByType,
          selectedFleetIdsByType: optimisticSelectedByType,
          selectedFleetIds: currentState.selectedFleetIds.filter(
            (id) => id !== configId
          ),
        });
      }

      return await withErrorHandling(
        async () => {
          const result = await fleetService.deleteFleetConfig(configId);

          if (result.success) {
            await Promise.all([
              offlineService.clearCache("fleets_"),
              offlineService.clearCache("ritases_"),
              foundType
                ? offlineService.clearCache(`fleets_${foundType}`)
                : Promise.resolve(),
            ]);

            setTimeout(() => {
              loadFleetConfigs({
                forceRefresh: true,
                skipAutoActivate: true,
              });
            }, 500);

            return { success: true };
          }

          useTimbanganStore.setState(backup);
          throw new Error(result.error || "Failed to delete config");
        },
        {
          operation: "delete fleet config",
          showSuccessToast: true,
          successMessage: "Konfigurasi fleet berhasil dihapus",
          onError: (err) => {
            useTimbanganStore.setState(backup);
            setError(err.message);
          },
        }
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [loadFleetConfigs]
  );

  const reactivateFleet = useCallback(
    async (configId, newStatus = "ACTIVE") => {
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          if (configId === undefined || configId === null || configId === "") {
            throw new Error("Config ID tidak valid");
          }

          const result = await fleetService.reactivateFleet(
            configId,
            newStatus
          );

          if (result.success) {
            fleetService.clearCache();
            offlineService.clearCache();

            await loadFleetConfigs({
              forceRefresh: true,
              viewMode: "normal",
            });

            return {
              success: true,
              data: result.data,
              message: result.message,
            };
          }

          throw new Error(result.error || "Failed to reactivate fleet");
        },
        {
          operation: "reactivate fleet",
          showSuccessToast: true,
          successMessage: "Fleet berhasil direaktivasi",
          onError: (err) => setError(err.message),
        }
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [loadFleetConfigs]
  );

  const activateConfig = useCallback(
    async (configId) => {
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          const result = await fleetService.setActiveFleetConfig(configId);

          if (result.success) {
            await loadFleetConfigs({ forceRefresh: true });
            return { success: true };
          }

          throw new Error(result.error || "Failed to activate config");
        },
        {
          operation: "activate config",
          showSuccessToast: true,
          successMessage: "Konfigurasi berhasil diaktifkan",
          onError: (err) => setError(err.message),
        }
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [loadFleetConfigs]
  );

  const getFleetById = useCallback(
    (id) => fleetConfigs.find((c) => c.id === id),
    [fleetConfigs]
  );

  const switchViewMode = useCallback(
    (mode) => {
      if (!["normal", "history"].includes(mode)) {
        console.error("❌ Invalid view mode:", mode);
        return;
      }

      setViewMode(mode);
      setTimeout(() => preloadAllFleets({ forceRefresh: true }), 0);
    },
    [preloadAllFleets]
  );

  const refresh = useCallback(
    async (options = {}) => {
      const targetDateRange =
        options.dateRange !== undefined ? options.dateRange : viewingDateRange;
      const targetShift =
        options.shift !== undefined
          ? options.shift
          : viewingShift || currentShift;

      if (isDateRangeToday(targetDateRange)) {
        await offlineService.clearCache("fleets_");
        await offlineService.clearCache("ritases_");
      } else {
        await offlineService.clearCache(
          `fleets_${targetDateRange.from}_${targetDateRange.to}`
        );
        await offlineService.clearCache(
          `ritases_${targetDateRange.from}_${targetDateRange.to}`
        );
      }

      const result = await preloadAllFleets({
        forceRefresh: true,
        dateRange: targetDateRange,
        shift: targetShift,
        skipAutoActivate: !isDateRangeToday(targetDateRange),
      });

      return result;
    },
    [preloadAllFleets, viewingDateRange, viewingShift, currentShift]
  );

  const refreshMasters = useCallback(
    async () => loadMasters({ forceRefresh: true }),
    [loadMasters]
  );

  const clearMastersCache = useCallback(() => {
    mastersCache.data = null;
    mastersCache.timestamp = null;
  }, []);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    const initializeData = async () => {
      await loadMasters();

      const todayRange = getTodayDateRange();
      await preloadAllFleets({ dateRange: todayRange });

      isInitializedRef.current = true;
    };

    initializeData();
  }, [loadMasters, preloadAllFleets]);

  useEffect(() => {
    const prev = previousViewingDateRangeRef.current;
    const curr = viewingDateRange;

    if (prev.from !== curr.from || prev.to !== curr.to) {
      if (isDateRangeToday(prev)) {
        offlineService.clearCache("fleets_");
      } else {
        offlineService.clearCache(`fleets_${prev.from}_${prev.to}`);
      }

      previousViewingDateRangeRef.current = curr;

      if (isInitializedRef.current) {
        queueMicrotask(() => {
          loadFleetConfigs({
            forceRefresh: true,
            dateRange: curr,
            skipAutoActivate: true,
          });
        });
      }
    }
  }, [viewingDateRange, loadFleetConfigs]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      pendingFleetRequestRef.current = null;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newShift = getCurrentShift();
      if (newShift !== currentShift) {
        setCurrentShift(newShift);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentShift]);

  return {
    fleetConfigs,
    selectedFleetIds,
    masters,
    user,

    filteredFleetConfigs,
    activeFleetConfigs,
    userRoleInfo,

    isLoading,
    isRefreshing,
    mastersLoading,
    error,

    viewMode,
    viewingDateRange,
    setViewingDateRange,
    switchViewMode,

    loadFleetConfigs,
    createFleetConfig,
    updateConfig,
    deleteConfig,
    reactivateFleet,
    activateConfig,
    getFleetById,

    currentShift,
    viewingShift,
    setViewingShift,

    refresh,
    refreshMasters,
    clearMastersCache,
  };
};
