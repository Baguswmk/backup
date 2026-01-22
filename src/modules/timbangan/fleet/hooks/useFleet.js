// useFleet.js - CLEANED VERSION (removed fleetConfigsByType)

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
        identifier: user.work_unit?.subsatker || "No Work Unit",
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
            loadingLocations: allMasters.locations.filter(l => l.type === 'LOADING'),
            dumpingLocations: allMasters.locations.filter(l => l.type === 'DUMPING'),
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
    [user]
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
          // ✅ Tidak ada lagi filter by type di sini, ambil semua
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

          // ✅ SIMPLIFIED: Langsung set, tidak ada by-type grouping
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
                const selectedConfigs = newConfigs.filter(c => 
                  validIds.includes(c.id)
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
            // ✅ SIMPLIFIED: Langsung set
            useRitaseStore.setState({
              fleetConfigs: result.data,
            });

            if (!options.skipAutoActivate && result.data.length > 0) {
              const currentSelectedIds = useRitaseStore.getState().selectedFleetIds;

              const finalSelection = currentSelectedIds.filter((id) => {
                return result.data.some((c) => c.id === id);
              });

              if (finalSelection.length !== currentSelectedIds.length) {
                setSelectedFleets(finalSelection);
              }

              if (finalSelection.length > 0) {
                const selectedConfigs = result.data.filter(c => 
                  finalSelection.includes(c.id)
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
      console.log('🔍 Filtering units for excavator', { excavatorId });

      const excavators = await masterDataService.fetchUnits({ 
        type: 'EXCAVATOR' 
      });
      const dumptrucks = await masterDataService.fetchUnits({ 
        type: 'DUMP_TRUCK' 
      });

      const excavator = excavators.find(e => e.id === excavatorId);
      if (!excavator?.companyId) {
        console.log('⚠️ Excavator has no company');
        return [];
      }

      const filtered = dumptrucks.filter(
        dt => String(dt.companyId) === String(excavator.companyId)
      );

      setFilteredUnitsByFleet((prev) => ({
        ...prev,
        [String(excavatorId)]: filtered,
      }));

      console.log('✅ Units filtered', { 
        excavatorId, 
        companyId: excavator.companyId,
        count: filtered.length 
      });

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
            Beltscale: "Beltscale",
          };

          const fleetType = configData.fleetType || measurementType || "Timbangan";
          enrichedData.measurement_type = fleetTypeMap[fleetType] || measurementType || "Timbangan";
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
          // ✅ HANYA clear cache, JANGAN fetch
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

const updateConfig = useCallback(
  async (configId, updates) => {
    setIsLoading(true);
    setError(null);

    const currentConfigs = useRitaseStore.getState().fleetConfigs;
    const optimisticConfigs = currentConfigs.map((c) =>
      c.id === configId ? { ...c, ...updates } : c,
    );

    useRitaseStore.setState({ fleetConfigs: optimisticConfigs });

    return await withErrorHandling(
      async () => {
        const result = await fleetService.updateFleetConfig(
          configId,
          updates,
        );

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
  },
  [],
);

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

      // ✅ SIMPLIFIED: Langsung filter tanpa by-type
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

  const refreshMasters = useCallback(
    async () => {
      console.log('🔄 Refreshing masters via masterDataService');
      return loadMasters({ forceRefresh: true });
    },
    [loadMasters]
  );

  const clearMastersCache = useCallback(() => {
    console.log('🗑️ Clearing masters cache');
    masterDataService.clearCache();
  }, []);

  useEffect(() => {
    const unsubscribe = masterDataService.onUpdate((event) => {
      console.log('📢 Master data updated:', event);
      
      if (event.category === 'units' || event.category === 'all') {
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
        console.log('🚀 Starting initialization sequence...');
        
        await loadMasters();
        
        if (!isMounted) return;

        await preloadAllFleets();
        
        if (isMounted) {
          isInitializedRef.current = true;
          console.log('✅ Initialization complete');
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