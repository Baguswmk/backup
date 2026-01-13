// useMasterData.js - FIXED VERSION
import { useState, useCallback, useRef, useEffect } from "react";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

export const useMasterData = (category) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const { user } = useAuthStore();
  const userRole = user?.role;

  // Track if we've attempted initial load (per component instance)
  const initialLoadAttemptedRef = useRef(false);
  
  // Track pending requests to avoid duplicates
  const pendingRequestRef = useRef(null);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);

  /**
   * Load data with cache-first strategy
   */
  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!category) {
        console.warn('⚠️ loadData called without category');
        return;
      }

      // ✅ If already loading same request, return existing promise
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

          // ✅ Only update state if component is still mounted
          if (isMountedRef.current) {
            setData(result);
            setIsDataLoaded(true);
          }

          return result;
        } catch (err) {
          console.error(`❌ Failed to load ${category}:`, err);
          
          if (isMountedRef.current) {
            setError(err.message);
            
            if (forceRefresh) {
              // Only show toast on manual refresh failures
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
   * Create item
   */
  const createItem = useCallback(
    async (formData) => {
      try {
        setIsLoading(true);
        const result = await masterDataService.createData(category, formData);

        // ✅ Reload data after create (will use fresh data from API)
        await loadData(true);

        showToast.success("Data created successfully");
        return { success: true, data: result };
      } catch (err) {
        showToast.error("Failed to create data");
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [category, loadData]
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

        // ✅ Reload data after update
        await loadData(true);

        showToast.success("Data updated successfully");
        return { success: true, data: result };
      } catch (err) {
        showToast.error("Failed to update data");
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [category, loadData]
  );

  /**
   * Delete item
   */
  const deleteItem = useCallback(
    async (id) => {
      try {
        setIsLoading(true);
        await masterDataService.deleteData(category, id);

        // ✅ Update local state immediately for better UX
        setData((prev) => prev.filter((item) => item.id !== id));

        showToast.success("Data deleted successfully");
        return { success: true };
      } catch (err) {
        // ✅ Reload on error to ensure consistency
        await loadData(true);
        
        showToast.error("Failed to delete data");
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [category, loadData]
  );

  /**
   * Clear cache and reload
   */
  const clearCache = useCallback(() => {
    masterDataService.clearCache(category);
    return loadData(true);
  }, [category, loadData]);

  // ✅ INITIAL LOAD - Simplified with proper dependency
  useEffect(() => {
    if (!category) {
      console.warn('⚠️ No category provided to useMasterData');
      return;
    }

    // Only load once per category change
    if (initialLoadAttemptedRef.current) {
      return;
    }

    initialLoadAttemptedRef.current = true;

    // Load without forcing refresh - will use cache if available
    loadData(false).catch(err => {
      console.error(`❌ Initial load failed for ${category}:`, err);
    });

    // Reset flag when category changes
    return () => {
      initialLoadAttemptedRef.current = false;
    };
  }, [category]); // ✅ Only depend on category, not loadData

  // ✅ Cleanup on unmount
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
    
    // CRUD operations
    createItem,
    updateItem,
    deleteItem,
    
    // Utility functions
    refresh,
    loadData,
    clearCache,
    
    // Legacy support (if needed elsewhere)
    companies: category === 'companies' ? data : [],
    workUnits: category === 'work-units' ? data : [],
    locations: category === 'locations' ? data : [],
    users: category === 'operators' ? data : [],
  };
};