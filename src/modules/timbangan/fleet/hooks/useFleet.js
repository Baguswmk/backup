import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { fleetService } from "@/modules/timbangan/fleet/services/fleetService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { offlineService } from "@/shared/services/offlineService";
import { withErrorHandling } from "@/shared/utils/errorHandler";

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
        identifier: user.work_unit?.satker || "No Work Unit",
      };
    default:
      return { role: role, identifier: "Unknown" };
  }
};

export const useFleet = (userAuth = null, measurementType = null) => {
  const fleetConfigs = useRitaseStore((state) => state.fleetConfigs);
  const selectedFleetIds = useRitaseStore((state) => state.selectedFleetIds);
  const setSelectedFleets = useRitaseStore((state) => state.setSelectedFleets);
  const setDumptruckIndexFromConfigs = useRitaseStore(
    (state) => state.setDumptruckIndexFromConfigs,
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [masters, setMasters] = useState({
    excavators: [],
    loadingLocations: [],
    dumpingLocations: [],
    workUnits: [],
    companies: [],
    coalTypes: [],
    users: [],
    dumpTruck: [],
    operators: [],
  });
  const [mastersLoading, setMastersLoading] = useState(false);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [filteredUnitsByFleet, setFilteredUnitsByFleet] = useState({});

  const isInitializedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const loadingStateRef = useRef({
    masters: false,
    fleets: false,
  });

  const user = useMemo(() => userAuth?.user, [userAuth]);
  const userRoleInfo = useMemo(() => getUserRoleInfo(user), [user]);

  const dumptruckStats = useMemo(() => {
    const total = availableUnits.length;
    return { total };
  }, [availableUnits]);

  const loadMasters = useCallback(
    async (options = {}) => {
      const { forceRefresh = false } = options;

      if (loadingStateRef.current.masters && !forceRefresh) {
        return { success: true, fromCache: true };
      }

      loadingStateRef.current.masters = true;
      setMastersLoading(true);

      return await withErrorHandling(
        async () => {
          const allMasters = await masterDataService.fetchAllMasters({
            forceRefresh,
            userRole: user?.role,
            userCompanyId: user?.company?.id,
          });

          const mastersData = {
            excavators: allMasters.excavators,
            loadingLocations: allMasters.locations.filter(
              (l) => l.type === "LOADING",
            ),
            dumpingLocations: allMasters.locations.filter(
              (l) => l.type === "DUMPING",
            ),
            workUnits: allMasters.workUnits,
            companies: allMasters.companies,
            coalTypes: allMasters.coalTypes,
            users: allMasters.users,
            dumpTruck: allMasters.dumptrucks,
            weighBridges: allMasters.weighBridges,
            operators: allMasters.operators,
          };

          setMasters(mastersData);
          setAvailableUnits(allMasters.dumptrucks);

          return { success: true, fromCache: !forceRefresh };
        },
        {
          operation: "load masters",
          showSuccessToast: false,
          onError: () => {
            loadingStateRef.current.masters = false;
            setMastersLoading(false);
          },
        },
      ).finally(() => {
        loadingStateRef.current.masters = false;
        setMastersLoading(false);
      });
    },
    [user],
  );

  const preloadAllFleets = useCallback(
    async (options = {}) => {
      if (loadingStateRef.current.fleets && !options.forceRefresh) {
        return { success: true, fromCache: true };
      }

      loadingStateRef.current.fleets = true;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsLoading(true);
      setError(null);

      return withErrorHandling(
        async () => {
          if (options.forceRefresh) {
            await offlineService.clearCache(`fleets_${user?.id || "nouser"}`);
          }

          const startTime = performance.now();

          const result = await fleetService.fetchFleetConfigs({
            user,
            forceRefresh: options.forceRefresh || false,
            signal,
          });

          const duration = performance.now() - startTime;

          if (signal.aborted) {
            return { success: false, aborted: true };
          }

          if (!result.success) {
            throw new Error(result.error || "Failed to fetch fleet configs");
          }

          const newConfigs = result.data || [];

          useRitaseStore.setState({
            fleetConfigs: newConfigs,
          });

          if (!options.skipAutoActivate && !isInitializedRef.current) {
            const currentStore = useRitaseStore.getState();
            const currentSelectedIds = currentStore.selectedFleetIds || [];

            if (currentSelectedIds.length > 0) {
              const validIds = currentSelectedIds.filter((id) => {
                return newConfigs.some((c) => c.id === id);
              });

              if (validIds.length !== currentSelectedIds.length) {
                setSelectedFleets(validIds);
              }

              if (validIds.length > 0) {
                const selectedConfigs = newConfigs.filter((c) =>
                  validIds.includes(c.id),
                );
                setDumptruckIndexFromConfigs(selectedConfigs);
              }
            }
          }

          return {
            success: true,
            data: newConfigs,
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
        },
      ).finally(() => {
        loadingStateRef.current.fleets = false;
        setIsLoading(false);
        abortControllerRef.current = null;
      });
    },
    [user, setSelectedFleets, setDumptruckIndexFromConfigs],
  );

  const loadFleetConfigs = useCallback(
    async (options = {}) => {
      const loadingState = options.isRefresh ? setIsRefreshing : setIsLoading;
      loadingState(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          if (options.forceRefresh) {
            await offlineService.clearCache(`fleets_${user?.id || "nouser"}`);
          }

          const result = await fleetService.fetchFleetConfigs({
            user,
            forceRefresh: true,
          });

          if (result.success) {
            useRitaseStore.setState({
              fleetConfigs: result.data,
            });

            if (!options.skipAutoActivate && result.data.length > 0) {
              const currentSelectedIds =
                useRitaseStore.getState().selectedFleetIds;

              const finalSelection = currentSelectedIds.filter((id) => {
                return result.data.some((c) => c.id === id);
              });

              if (finalSelection.length !== currentSelectedIds.length) {
                setSelectedFleets(finalSelection);
              }

              if (finalSelection.length > 0) {
                const selectedConfigs = result.data.filter((c) =>
                  finalSelection.includes(c.id),
                );
                setDumptruckIndexFromConfigs(selectedConfigs);
              }
            } else if (result.data.length === 0) {
              setDumptruckIndexFromConfigs([]);
            }

            return { success: true, data: result.data };
          }

          throw new Error(result.error || "Failed to load fleet configs");
        },
        {
          operation: "load fleet configs",
          showSuccessToast: false,
          onError: (err) => setError(err.message),
        },
      ).finally(() => {
        loadingState(false);
      });
    },
    [user, setSelectedFleets, setDumptruckIndexFromConfigs],
  );

  const getFilteredUnitsForFleet = useCallback(async (excavatorId) => {
    try {
      const excavators = await masterDataService.fetchUnits({
        type: "EXCAVATOR",
      });
      const dumptrucks = await masterDataService.fetchUnits({
        type: "DUMP_TRUCK",
      });

      const excavator = excavators.find((e) => e.id === excavatorId);
      if (!excavator?.companyId) {
        return [];
      }

      const filtered = dumptrucks.filter(
        (dt) => String(dt.companyId) === String(excavator.companyId),
      );

      setFilteredUnitsByFleet((prev) => ({
        ...prev,
        [String(excavatorId)]: filtered,
      }));

      return filtered;
    } catch (error) {
      console.error("❌ Failed to get filtered units:", error);
      return [];
    }
  }, []);

const createFleetConfig = useCallback(
  async (configData) => {
    setIsLoading(true);
    setError(null);

    return await withErrorHandling(
      async () => {
        // CHANGED: Validate inspectorIds array
        if (!configData.inspectorIds || !Array.isArray(configData.inspectorIds) || configData.inspectorIds.length === 0) {
          throw new Error("Minimal 1 inspector wajib dipilih");
        }
        
        // CHANGED: Validate checkerIds array
        if (!configData.checkerIds || !Array.isArray(configData.checkerIds) || configData.checkerIds.length === 0) {
          throw new Error("Minimal 1 checker wajib dipilih");
        }

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
            Beltscale: "Beltscale",
          };

          const fleetType =
            configData.fleetType || measurementType || "Timbangan";
          enrichedData.measurement_type =
            fleetTypeMap[fleetType] || measurementType || "Timbangan";
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
          await offlineService.clearCache("fleets_");

          return { success: true, data: result.data };
        }

        throw new Error(
          result.error || result.message || "Failed to create config",
        );
      },
      {
        operation: "create fleet config",
        showSuccessToast: true,
        onError: (err) => setError(err.message),
      },
    ).finally(() => {
      setIsLoading(false);
    });
  },
  [user, userRoleInfo, measurementType],
);

// UPDATE: updateConfig function
const updateConfig = useCallback(async (configId, updates) => {
  setIsLoading(true);
  setError(null);

  const currentConfigs = useRitaseStore.getState().fleetConfigs;
  const optimisticConfigs = currentConfigs.map((c) =>
    c.id === configId ? { ...c, ...updates } : c,
  );

  useRitaseStore.setState({ fleetConfigs: optimisticConfigs });

  return await withErrorHandling(
    async () => {
      // CHANGED: Validate inspectorIds if provided
      if (updates.inspectorIds !== undefined) {
        if (!Array.isArray(updates.inspectorIds) || updates.inspectorIds.length === 0) {
          throw new Error("Minimal 1 inspector wajib dipilih");
        }
      }

      // CHANGED: Validate checkerIds if provided
      if (updates.checkerIds !== undefined) {
        if (!Array.isArray(updates.checkerIds) || updates.checkerIds.length === 0) {
          throw new Error("Minimal 1 checker wajib dipilih");
        }
      }

      const result = await fleetService.updateFleetConfig(configId, updates);

      if (result.success) {
        await offlineService.clearCacheByPrefix("fleets");
        await offlineService.clearCacheByPrefix("ritases");

        return { success: true, data: result.data };
      }

      useRitaseStore.setState({ fleetConfigs: currentConfigs });
      throw new Error(result.error || "Failed to update config");
    },
    {
      operation: "update fleet config",
      showSuccessToast: true,
      successMessage: "Konfigurasi fleet berhasil diperbarui",
      onError: (err) => {
        useRitaseStore.setState({ fleetConfigs: currentConfigs });
        setError(err.message);
      },
    },
  ).finally(() => {
    setIsLoading(false);
  });
}, []);

  const deleteConfig = useCallback(
    async (configId) => {
      setIsLoading(true);
      setError(null);

      const currentState = useRitaseStore.getState();
      const currentConfigs = currentState.fleetConfigs;

      const backup = {
        fleetConfigs: [...currentConfigs],
        selectedFleetIds: [...currentState.selectedFleetIds],
      };

      const optimisticConfigs = currentConfigs.filter((c) => c.id !== configId);

      useRitaseStore.setState({
        fleetConfigs: optimisticConfigs,
        selectedFleetIds: currentState.selectedFleetIds.filter(
          (id) => id !== configId,
        ),
      });

      return await withErrorHandling(
        async () => {
          const result = await fleetService.deleteFleetConfig(configId);

          if (result.success) {
            await Promise.all([
              offlineService.clearCache("fleets_"),
              offlineService.clearCache("ritases_"),
            ]);

            setTimeout(() => {
              loadFleetConfigs({
                forceRefresh: true,
                skipAutoActivate: true,
              });
            }, 500);

            return { success: true };
          }

          useRitaseStore.setState(backup);
          throw new Error(result.error || "Failed to delete config");
        },
        {
          operation: "delete fleet config",
          showSuccessToast: true,
          successMessage: "Konfigurasi fleet berhasil dihapus",
          onError: (err) => {
            useRitaseStore.setState(backup);
            setError(err.message);
          },
        },
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [loadFleetConfigs],
  );

  const getFleetById = useCallback(
    (id) => fleetConfigs.find((c) => c.id === id),
    [fleetConfigs],
  );

  // Bulk delete: hapus semua fleet sekaligus berdasarkan array of IDs
  // Dipakai untuk delete merged (split) rows dari tabel
  const bulkDeleteConfigs = useCallback(
    async (configIds) => {
      if (!Array.isArray(configIds) || configIds.length === 0) {
        return { success: false, error: "Tidak ada ID yang diberikan" };
      }

      setIsLoading(true);
      setError(null);

      const currentState = useRitaseStore.getState();
      const currentConfigs = currentState.fleetConfigs;

      const backup = {
        fleetConfigs: [...currentConfigs],
        selectedFleetIds: [...currentState.selectedFleetIds],
      };

      // Optimistic update: hapus semua ID sekaligus
      const optimisticConfigs = currentConfigs.filter(
        (c) => !configIds.includes(c.id),
      );

      useRitaseStore.setState({
        fleetConfigs: optimisticConfigs,
        selectedFleetIds: currentState.selectedFleetIds.filter(
          (id) => !configIds.includes(id),
        ),
      });

      return await withErrorHandling(
        async () => {
          const result = await fleetService.bulkDeleteFleets(configIds);

          if (result.success) {
            await Promise.all([
              offlineService.clearCache("fleets_"),
              offlineService.clearCache("ritases_"),
            ]);

            setTimeout(() => {
              loadFleetConfigs({
                forceRefresh: true,
                skipAutoActivate: true,
              });
            }, 500);

            return { success: true };
          }

          // Partial success: tetap refresh, tapi info ke user
          if (result.partialSuccess) {
            setTimeout(() => {
              loadFleetConfigs({
                forceRefresh: true,
                skipAutoActivate: true,
              });
            }, 500);

            throw new Error(result.message);
          }

          // Fully failed: rollback
          useRitaseStore.setState(backup);
          throw new Error(result.error || "Gagal menghapus fleet");
        },
        {
          operation: "bulk delete fleet configs",
          showSuccessToast: true,
          successMessage: `${configIds.length} konfigurasi fleet berhasil dihapus`,
          onError: (err) => {
            useRitaseStore.setState(backup);
            setError(err.message);
          },
        },
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [loadFleetConfigs],
  );

  const refresh = useCallback(
    async (options = {}) => {
      await offlineService.clearCache("fleets_");
      await offlineService.clearCache("ritases_");

      const result = await preloadAllFleets({
        forceRefresh: true,
        skipAutoActivate: false,
      });

      return result;
    },
    [preloadAllFleets],
  );

  const refreshMasters = useCallback(async () => {
    return loadMasters({ forceRefresh: true });
  }, [loadMasters]);

  const clearMastersCache = useCallback(() => {
    masterDataService.clearCache();
  }, []);

  useEffect(() => {
    const unsubscribe = masterDataService.onUpdate((event) => {
      if (event.category === "units" || event.category === "all") {
        loadMasters({ forceRefresh: true });
      }
    });

    return unsubscribe;
  }, [loadMasters]);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    let isMounted = true;

    const initializeData = async () => {
      try {
        await loadMasters();

        if (!isMounted) return;

        await preloadAllFleets();

        if (isMounted) {
          isInitializedRef.current = true;
        }
      } catch (error) {
        console.error("❌ Failed to initialize:", error);
      }
    };

    initializeData();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    fleetConfigs,
    selectedFleetIds,
    masters,
    user,

    userRoleInfo,

    isLoading,
    isRefreshing,
    mastersLoading,
    error,

    loadFleetConfigs,
    createFleetConfig,
    updateConfig,
    deleteConfig,
    bulkDeleteConfigs,
    getFleetById,

    refresh,
    refreshMasters,
    clearMastersCache,

    availableUnits,
    filteredUnitsByFleet,
    dumptruckStats,
    getFilteredUnitsForFleet,
  };
};