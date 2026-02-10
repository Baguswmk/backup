import { useState, useCallback, useRef, useEffect } from "react";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

export const useMasterData = (category) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRefreshingMasterData, setIsRefreshingMasterData] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [workUnits, setWorkUnits] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);

  const { user } = useAuthStore();
  const userRole = user?.role;
  const userCompanyId = user?.company?.id;

  const initialLoadAttemptedRef = useRef(false);
  const pendingRequestRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastRefreshTimeRef = useRef(0);

  const masterDataLoadedRef = useRef({
    companies: false,
    workUnits: false,
    locations: false,
    users: false,
  });

  const loadAllMasterData = useCallback(async () => {
    if (!isMountedRef.current) return;

    // ✅ Check apakah sudah ada yang di-load
    const alreadyLoaded =
      masterDataLoadedRef.current.companies &&
      masterDataLoadedRef.current.workUnits &&
      masterDataLoadedRef.current.locations &&
      masterDataLoadedRef.current.users;

    if (alreadyLoaded) {
      return; // Skip jika semua sudah loaded
    }

    try {
      // ✅ OPTIMIZED: Gunakan fetchAllMasters
      const allMasters = await masterDataService.fetchAllMasters({
        forceRefresh: false,
        userRole,
        userCompanyId,
      });

      if (isMountedRef.current) {
        setCompanies(allMasters.companies);
        setWorkUnits(allMasters.workUnits);
        setLocations(allMasters.locations);
        setUsers(allMasters.users);

        masterDataLoadedRef.current = {
          companies: true,
          workUnits: true,
          locations: true,
          users: true,
        };
      }
    } catch (err) {
      console.error("❌ Failed to load master data:", err);
    }
  }, [userRole, userCompanyId]);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!category) {
        console.warn("⚠️ loadData called without category");
        return;
      }

      if (pendingRequestRef.current && !forceRefresh) {
        return pendingRequestRef.current;
      }

      setIsLoading(true);
      setError(null);

      const requestPromise = (async () => {
        try {
          const fetchOptions = {
            forceRefresh,
            userRole: userRole,
            userCompanyId: userCompanyId,
          };

          if (userRole === "operator_jt" && category === "units") {
            fetchOptions.type = "DUMP_TRUCK";
          }

          const result = await masterDataService.fetchData(
            category,
            fetchOptions,
          );

          if (isMountedRef.current) {
            setData(result);
            setIsDataLoaded(true);

            if (category === "companies") {
              setCompanies(result);
              masterDataLoadedRef.current.companies = true;
            } else if (category === "work-units") {
              setWorkUnits(result);
              masterDataLoadedRef.current.workUnits = true;
            } else if (category === "locations") {
              setLocations(result);
              masterDataLoadedRef.current.locations = true;
            } else if (category === "operators") {
              setUsers(result);
              masterDataLoadedRef.current.users = true;
            }
          }

          return result;
        } catch (err) {
          console.error(`❌ Failed to load ${category}:`, err);

          if (isMountedRef.current) {
            setError(err.message);

            if (forceRefresh) {
              showToast.error(`Failed to load ${category} data`);
            }
          }

          throw err;
        } finally {
          if (isMountedRef.current) {
            setIsLoading(false);
          }
          pendingRequestRef.current = null;
        }
      })();

      pendingRequestRef.current = requestPromise;
      return requestPromise;
    },
    [category, userRole, userCompanyId],
  );

  const refresh = useCallback(async () => {
    return await loadData(true);
  }, [loadData]);

  /**
   * ✅ BARU: Refresh ALL master data dengan debounce protection
   * Mencegah spam refresh dalam 2 detik
   */
  const refreshAllMasterData = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    const DEBOUNCE_TIME = 2000; // 2 detik

    // ✅ Debounce: Cegah spam refresh
    if (timeSinceLastRefresh < DEBOUNCE_TIME) {
      const remainingTime = Math.ceil(
        (DEBOUNCE_TIME - timeSinceLastRefresh) / 1000,
      );
      showToast.info(`Tunggu ${remainingTime} detik untuk refresh lagi`);
      return;
    }

    try {
      setIsRefreshingMasterData(true);
      lastRefreshTimeRef.current = now;

      // ✅ OPTIMIZED: Gunakan fetchAllMasters untuk efficiency
      const allMasters = await masterDataService.fetchAllMasters({
        forceRefresh: true,
        userRole,
        userCompanyId,
      });

      if (isMountedRef.current) {
        setCompanies(allMasters.companies);
        setWorkUnits(allMasters.workUnits);
        setLocations(allMasters.locations);
        setUsers(allMasters.users);

        masterDataLoadedRef.current = {
          companies: true,
          workUnits: true,
          locations: true,
          users: true,
        };

        showToast.success("Master data berhasil di-refresh!");
      }
    } catch (err) {
      console.error("❌ Failed to refresh master data:", err);
      showToast.error("Gagal refresh master data");
    } finally {
      if (isMountedRef.current) {
        setIsRefreshingMasterData(false);
      }
    }
  }, [userRole, userCompanyId]);

  const createItem = useCallback(
    async (formData) => {
      try {
        setIsLoading(true);
        const result = await masterDataService.createData(category, formData);

        await loadData(true);

        await refreshAllMasterData();

        showToast.success("Data created successfully");
        return { success: true, data: result };
      } catch (err) {
        showToast.error("Failed to create data");
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [category, loadData, refreshAllMasterData],
  );

  const updateItem = useCallback(
    async (id, formData) => {
      try {
        setIsLoading(true);
        const result = await masterDataService.updateData(
          category,
          id,
          formData,
        );

        await loadData(true);

        await refreshAllMasterData();

        showToast.success("Data updated successfully");
        return { success: true, data: result };
      } catch (err) {
        showToast.error("Failed to update data");
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [category, loadData, refreshAllMasterData],
  );

  const deleteItem = useCallback(
    async (id) => {
      try {
        setIsLoading(true);
        await masterDataService.deleteData(category, id);

        setData((prev) => prev.filter((item) => item.id !== id));

        await refreshAllMasterData();

        showToast.success("Data deleted successfully");
        return { success: true };
      } catch (err) {
        await loadData(true);

        showToast.error("Failed to delete data");
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [category, loadData, refreshAllMasterData],
  );

  const clearCache = useCallback(() => {
    masterDataService.clearCache(category);
    return loadData(true);
  }, [category, loadData]);

  useEffect(() => {
    if (!category) {
      console.warn("⚠️ No category provided to useMasterData");
      return;
    }

    if (initialLoadAttemptedRef.current) {
      return;
    }

    initialLoadAttemptedRef.current = true;

    loadData(false).catch((err) => {
      console.error(`❌ Initial load failed for ${category}:`, err);
    });

    return () => {
      initialLoadAttemptedRef.current = false;
    };
  }, [category, loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAllMasterData();
    }, 500);

    return () => clearTimeout(timer);
  }, [loadAllMasterData]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      pendingRequestRef.current = null;
    };
  }, [category]);

  return {
    data,
    isLoading,
    error,
    isDataLoaded,

    createItem,
    updateItem,
    deleteItem,

    refresh,
    loadData,
    clearCache,
    refreshAllMasterData,
    isRefreshingMasterData, // ✅ BARU: Export loading state

    companies,
    workUnits,
    locations,
    users,
  };
};
