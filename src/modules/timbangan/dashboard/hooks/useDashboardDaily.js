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

  const memoizedParams = useMemo(
    () => ({
      startDate: params.startDate,
      endDate: params.endDate,
      shift: params.shift || "All",
    }),
    [params.startDate, params.endDate, params.shift],
  );

  const paramsSignature = useMemo(() => {
    return `${memoizedParams.startDate}|${memoizedParams.endDate}|${memoizedParams.shift}`;
  }, [memoizedParams]);

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
            startDate: params.startDate,
            endDate: params.endDate,
            shift: params.shift || "All",
            forceRefresh,
          });

          if (!isMountedRef.current) {
            throw new Error("Component unmounted");
          }

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

            if (
              err.name === "AbortError" ||
              err?.message === "Component unmounted"
            ) {
              return;
            }

            // ✅ FIX: Extract error message safely
            const errorMessage = 
              err?.response?.data?.message || 
              err?.message || 
              err?.error || 
              String(err) || 
              "Terjadi kesalahan";

            setData(null);
            setError(errorMessage);

            // Only show toast for unexpected errors
            if (
              !errorMessage.includes("tidak ditemukan") &&
              !errorMessage.includes("harus diisi") &&
              !errorMessage.includes("tidak valid")
            ) {
              showToast.error(errorMessage);
            }
          },
        },
      ).finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        abortControllerRef.current = null;
      });
    },
    [params.startDate, params.endDate, params.shift, paramsSignature],
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
      },
    );
  }, [refresh]);

  useEffect(() => {
    if (!autoFetch) return;
    if (!memoizedParams.startDate || !memoizedParams.endDate) return;

    const lastParams = lastFetchedParamsRef.current;
    const currentParams = paramsSignature;

    const shouldFetch =
      isInitialMountRef.current || lastParams !== currentParams;

    if (!shouldFetch) {
      return;
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }

    if (isMountedRef.current) {
      fetchDashboard(false);
    }
  }, [
    paramsSignature,
    autoFetch,
    fetchDashboard,
    memoizedParams.startDate,
    memoizedParams.endDate,
  ]);

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

  return {
    data,
    isLoading,
    error,
    lastFetch,

    fetchDashboard,
    refresh,
    clearData,
    clearCache,

    hasData: data !== null && data?.success && data?.data !== null,
    isEmpty: data?.data?.data?.tableData?.length === 0,
   summaryData: data?.data?.summary || null,
tableData: data?.data?.tableData || [],
  };
};

export default useDashboardDaily; 