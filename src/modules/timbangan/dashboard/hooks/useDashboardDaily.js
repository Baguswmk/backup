import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { dashboardService } from "@/modules/timbangan/dashboard/services/dashboardService";
import { showToast } from "@/shared/utils/toast";
import { withErrorHandling } from "@/shared/utils/errorHandler";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

export const useDashboardDaily = (params = {}, autoFetch = true) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const lastFetchedParamsRef = useRef(null);

  // ✅ Use memoized params
  const memoizedParams = useMemo(
    () => ({
      startDate: params.startDate,
      endDate: params.endDate,
      shift: params.shift || "All",
    }),
    [params.startDate, params.endDate, params.shift]
  );

  // ✅ ADDED - Use debounced params to prevent excessive API calls
  const debouncedParams = useDebouncedValue(memoizedParams, 300);

  // ✅ REFACTORED - Use withErrorHandling
  const fetchDashboard = useCallback(
    async (forceRefresh = false) => {
      if (!params.startDate || !params.endDate) {
        const errorMsg = "Tanggal mulai dan akhir harus diisi";
        setError(errorMsg);
        console.warn("Dashboard fetch skipped:", errorMsg);
        return { success: false, error: errorMsg };
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          const response = await dashboardService.getDashboardDaily({
            start_date: params.startDate,
            end_date: params.endDate,
            shift: params.shift || "All",
            forceRefresh,
          });

          if (!isMountedRef.current) {
            throw new Error("Component unmounted");
          }

          setData(response);
          setLastFetch(new Date());
          setError(null);
          lastFetchedParamsRef.current = memoizedParams;

          return { success: true, data: response };
        },
        {
          operation: "fetch dashboard",
          showSuccessToast: false,
          onError: (err) => {
            if (!isMountedRef.current) return;

            if (err.name === "AbortError" || err.message === "Component unmounted") {
              return;
            }

            setData(null);
            setError(err.message);

            // Only show toast for non-expected errors
            if (
              !err.message.includes("tidak ditemukan") &&
              !err.message.includes("harus diisi") &&
              !err.message.includes("400")
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
    [params.startDate, params.endDate, params.shift, memoizedParams]
  );

  const refresh = useCallback(() => {
    return fetchDashboard(true);
  }, [fetchDashboard]);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
    setLastFetch(null);
    lastFetchedParamsRef.current = null;
  }, []);

  // ✅ REFACTORED - Use withErrorHandling
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

  // ✅ IMPROVED - Use debounced params instead of manual setTimeout
  useEffect(() => {
    if (!autoFetch) return;
    if (!debouncedParams.startDate || !debouncedParams.endDate) return;

    const lastParams = lastFetchedParamsRef.current;

    // Skip if params haven't changed and we have data
    if (
      lastParams &&
      lastParams.startDate === debouncedParams.startDate &&
      lastParams.endDate === debouncedParams.endDate &&
      lastParams.shift === debouncedParams.shift &&
      data !== null
    ) {
      return;
    }

    if (isMountedRef.current) {
      fetchDashboard(false);
    }
  }, [debouncedParams, autoFetch, fetchDashboard, data]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    lastFetch,

    fetchDashboard,
    refresh,
    clearData,
    clearCache,

    hasData: data !== null && data?.data !== null,
    isEmpty: data?.data?.tableData?.length === 0,
    summaryData: data?.data?.summary || null,
    tableData: data?.data?.tableData || [],
  };
};

export default useDashboardDaily;