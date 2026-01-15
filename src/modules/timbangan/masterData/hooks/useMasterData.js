import { useState, useCallback, useRef, useEffect } from "react";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

export const useMasterData = (category) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [workUnits, setWorkUnits] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);

  const { user } = useAuthStore();
  const userRole = user?.role;

  const initialLoadAttemptedRef = useRef(false);
  const pendingRequestRef = useRef(null);
  const isMountedRef = useRef(true);

  const masterDataLoadedRef = useRef({
    companies: false,
    workUnits: false,
    locations: false,
    users: false,
  });

  /**
   * ✅ NEW: Load all master data needed for forms
   */
  const loadAllMasterData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      if (!masterDataLoadedRef.current.companies) {
        const companiesData = await masterDataService.fetchCompanies({
          forceRefresh: false,
        });
        if (isMountedRef.current) {
          setCompanies(companiesData);
          masterDataLoadedRef.current.companies = true;
        }
      }

      if (!masterDataLoadedRef.current.workUnits) {
        const workUnitsData = await masterDataService.fetchWorkUnits({
          forceRefresh: false,
          userRole,
        });
        if (isMountedRef.current) {
          setWorkUnits(workUnitsData);
          masterDataLoadedRef.current.workUnits = true;
        }
      }

      if (!masterDataLoadedRef.current.locations) {
        const locationsData = await masterDataService.fetchLocations({
          forceRefresh: false,
          userRole,
        });
        if (isMountedRef.current) {
          setLocations(locationsData);
          masterDataLoadedRef.current.locations = true;
        }
      }

      if (!masterDataLoadedRef.current.users) {
        const usersData = await masterDataService.fetchUsers({
          forceRefresh: false,
        });
        if (isMountedRef.current) {
          setUsers(usersData);
          masterDataLoadedRef.current.users = true;
        }
      }
    } catch (err) {
      console.error("❌ Failed to load master data:", err);
    }
  }, [userRole]);

  /**
   * Load data with cache-first strategy
   */
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
          };

          if (userRole === "operator_jt" && category === "units") {
            fetchOptions.type = "DUMP_TRUCK";
          }

          const result = await masterDataService.fetchData(
            category,
            fetchOptions
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
    [category, userRole]
  );

  /**
   * Refresh data (force fetch from API)
   */
  const refresh = useCallback(async () => {
    return await loadData(true);
  }, [loadData]);

  /**
   * ✅ NEW: Refresh all master data
   */
  const refreshAllMasterData = useCallback(async () => {
    try {
      const [companiesData, workUnitsData, locationsData, usersData] =
        await Promise.all([
          masterDataService.fetchCompanies({ forceRefresh: true }),
          masterDataService.fetchWorkUnits({ forceRefresh: true, userRole }),
          masterDataService.fetchLocations({ forceRefresh: true, userRole }),
          masterDataService.fetchUsers({ forceRefresh: true }),
        ]);

      if (isMountedRef.current) {
        setCompanies(companiesData);
        setWorkUnits(workUnitsData);
        setLocations(locationsData);
        setUsers(usersData);

        masterDataLoadedRef.current = {
          companies: true,
          workUnits: true,
          locations: true,
          users: true,
        };
      }
    } catch (err) {
      console.error("❌ Failed to refresh master data:", err);
    }
  }, [userRole]);

  /**
   * Create item
   */
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
    [category, loadData, refreshAllMasterData]
  );

  /**
   * Update item
   */
  const updateItem = useCallback(
    async (id, formData) => {
      try {
        setIsLoading(true);
        const result = await masterDataService.updateData(
          category,
          id,
          formData
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
    [category, loadData, refreshAllMasterData]
  );

  /**
   * Delete item
   */
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
    [category, loadData, refreshAllMasterData]
  );

  /**
   * Clear cache and reload
   */
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
    loadAllMasterData();
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

    companies,
    workUnits,
    locations,
    users,
  };
};
