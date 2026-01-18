import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { dashboardService } from "@/modules/timbangan/dashboard/services/dashboardService";
import { showToast } from "@/shared/utils/toast";
import { withErrorHandling } from "@/shared/utils/errorHandler";

export const useDashboardDaily = (params = {}, autoFetch = true) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const lastFetchedParamsRef = useRef(null);
  const isInitialMountRef = useRef(true);

  // ✅ Memoized params dengan stable reference
  const memoizedParams = useMemo(
    () => ({
      startDate: params.startDate,
      endDate: params.endDate,
      shift: params.shift || "All",
    }),
    [params.startDate, params.endDate, params.shift]
  );

  // ✅ Create params signature untuk comparison
  const paramsSignature = useMemo(() => {
    return `${memoizedParams.startDate}|${memoizedParams.endDate}|${memoizedParams.shift}`;
  }, [memoizedParams]);

  /**
   * Fetch Dashboard Data
   * @param {boolean} forceRefresh - Force refresh bypass cache
   */
  const fetchDashboard = useCallback(
    async (forceRefresh = false) => {
      // ✅ Validasi params
      if (!params.startDate || !params.endDate) {
        const errorMsg = "Tanggal mulai dan akhir harus diisi";
        setError(errorMsg);
        console.warn("Dashboard fetch skipped:", errorMsg);
        return { success: false, error: errorMsg };
      }

      // ✅ Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          // ✅ Call service dengan params yang sesuai BE
          const response = await dashboardService.getDashboardDaily({
            start_date: params.startDate,
            end_date: params.endDate,
            shift: params.shift || "All", // BE default "All"
            forceRefresh,
          });

          if (!isMountedRef.current) {
            throw new Error("Component unmounted");
          }

          // ✅ Set data dari response
          setData(response);
          setLastFetch(new Date());
          setError(null);
          lastFetchedParamsRef.current = paramsSignature;

          return { success: true, data: response };
        },
        {
          operation: "fetch dashboard",
          showSuccessToast: false,
          onError: (err) => {
            if (!isMountedRef.current) return;

            // ✅ Skip abort errors
            if (err.name === "AbortError" || err.message === "Component unmounted") {
              return;
            }

            setData(null);
            setError(err.message);

            // ✅ Only show toast for unexpected errors
            // Sesuai dengan error message BE
            if (
              !err.message.includes("tidak ditemukan") &&
              !err.message.includes("harus diisi") &&
              !err.message.includes("tidak valid")
            ) {
              showToast.error(err.message);
            }
          }
        }
      ).finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        abortControllerRef.current = null;
      });
    },
    [params.startDate, params.endDate, params.shift, paramsSignature]
  );

  /**
   * Refresh - Force refresh dengan bypass cache
   */
  const refresh = useCallback(() => {
    return fetchDashboard(true);
  }, [fetchDashboard]);

  /**
   * Clear Data
   */
  const clearData = useCallback(() => {
    setData(null);
    setError(null);
    setLastFetch(null);
    lastFetchedParamsRef.current = null;
  }, []);

  /**
   * Clear Cache
   */
  const clearCache = useCallback(async () => {
    return await withErrorHandling(
      async () => {
        const result = await dashboardService.clearDashboardCache();
        await refresh();
        return result;
      },
      {
        operation: "clear dashboard cache",
        showSuccessToast: true,
        successMessage: "Cache berhasil dibersihkan",
      }
    );
  }, [refresh]);

  // ✅ Auto fetch effect
  useEffect(() => {
    if (!autoFetch) return;
    if (!memoizedParams.startDate || !memoizedParams.endDate) return;

    const lastParams = lastFetchedParamsRef.current;
    const currentParams = paramsSignature;

    // ✅ Kondisi fetch:
    // 1. Initial mount - always fetch
    // 2. Params changed - fetch
    const shouldFetch = 
      isInitialMountRef.current || 
      lastParams !== currentParams;

    if (!shouldFetch) {
      return;
    }
    
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }

    if (isMountedRef.current) {
      fetchDashboard(false);
    }
  }, [paramsSignature, autoFetch, fetchDashboard, memoizedParams.startDate, memoizedParams.endDate]);

  // ✅ Mount/unmount effect
  useEffect(() => {
    isMountedRef.current = true;
    isInitialMountRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ✅ Return values sesuai dengan struktur BE response
  return {
    // Raw data
    data,
    isLoading,
    error,
    lastFetch,

    // Actions
    fetchDashboard,
    refresh,
    clearData,
    clearCache,

    // Computed values - sesuai struktur BE
    hasData: data !== null && data?.success && data?.data !== null,
    isEmpty: data?.data?.tableData?.length === 0,
    summaryData: data?.data?.summary || null,
    tableData: data?.data?.tableData || [],
  };
};

export default useDashboardDaily;