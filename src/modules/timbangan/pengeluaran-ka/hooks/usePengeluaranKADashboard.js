import { useState, useCallback, useEffect, useRef } from "react";
import pengeluaranKAService from "../services/pengeluaranKAService";
import { showToast } from "@/shared/utils/toast";

/**
 * Shape BE /dashboard response into props expected by:
 *  - TlsCardsRow:     statTotal + tlsList
 *  - KpiRow:          kpiData
 *  - TopProductPanel: topProducts ([name, tonnage][] sorted desc by tonnage)
 *  - TrendChartPanel: chartData ([{ day: "DD/MM", tonnage, count }])
 */
function shapeDashboardData(raw) {
  const s = raw?.summaries || {};
  const tls = s.tls || raw?.tls || [];
  const destination = raw?.destination || [];
  const product = raw?.product || [];
  const dailyRecord = raw?.record || [];

  const statTotal = {
    totalTonnage: s.totalTonnage || 0,
    totalCount: s.count || 0,
    totalWagons: s.total_carriage || 0,
  };

  const tlsList = tls.map((t) => ({
    tls: t.tls || t.origin,
    tonnage: t.totalTonnage || t.tonnage || 0,
    count: t.count,
    totalWagons: t.total_carriage || t.totalWagons || 0,
  }));

  const avgKA =
    dailyRecord.length > 0
      ? parseFloat(
          (
            dailyRecord.reduce((acc, d) => acc + d.count_rangkaian, 0) /
            dailyRecord.length
          ).toFixed(2)
        )
      : 0;
  const maxKA =
    dailyRecord.length > 0
      ? Math.max(...dailyRecord.map((d) => d.count_rangkaian))
      : 0;
  const minKA =
    dailyRecord.length > 0
      ? Math.min(...dailyRecord.map((d) => d.count_rangkaian))
      : 0;

  const avgTonase =
    s.count > 0 ? parseFloat((s.totalTonnage / s.count).toFixed(2)) : 0;

  const kpiData = {
    avgTonase,
    avgDurasi: s.avgDuration || 0,
    avgKA,
    maxTon: s.maxTonnage || 0,
    minTon: s.minTonnage || 0,
    maxDur: s.maxDuration || 0,
    minDur: s.minDuration || 0,
    maxRng: maxKA,
    minRng: minKA,
  };

  const topProducts = product
    .sort((a, b) => b.totalTonnage - a.totalTonnage)
    .map((p) => [p.coal_type, p.totalTonnage]);

  const chartData = dailyRecord.map((d) => {
    const dateObj = new Date(d.date);
    const day =
      String(dateObj.getUTCDate()).padStart(2, "0") +
      "/" +
      String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    return {
      day,
      tonnage: d.totalTonnage,
      count: d.count_rangkaian,
    };
  });

  return { statTotal, tlsList, kpiData, topProducts, chartData, destinationData: destination };
}

/**
 * Hook dashboard KA.
 *
 * TIDAK ada reactive useEffect yang menonton dateParams.
 * Fetch hanya terjadi ketika:
 *   1. fetch(params) dipanggil langsung (dari onApply)
 *   2. refetch() dipanggil (menggunakan params terakhir)
 */
export function usePengeluaranKADashboard({ destination } = {}) {
  const [dashboardData, setDashboardData] = useState({
    statTotal: {},
    tlsList: [],
    kpiData: {},
    topProducts: [],
    chartData: [],
    destinationData: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const isMountedRef  = useRef(true);
  const lastParamsRef = useRef(null);
  const destinationRef = useRef(destination);

  // Keep destinationRef in sync so refetch always uses latest destination
  destinationRef.current = destination;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchDashboard = useCallback(async (params, dest) => {
    if (!params?.start_date || !params?.end_date) return;
    lastParamsRef.current = params;
    // Reset data dulu agar data lama tidak terlihat saat loading
    setDashboardData({
      statTotal: {},
      tlsList: [],
      kpiData: {},
      topProducts: [],
      chartData: [],
      destinationData: [],
    });
    setIsLoading(true);
    try {
      const raw = await pengeluaranKAService.getDashboard({
        ...params,
        destination: dest || destinationRef.current || "all",
      }, { forceRefresh: true });
      if (!isMountedRef.current) return;
      setDashboardData(shapeDashboardData(raw));
    } catch (err) {
      if (isMountedRef.current) {
        showToast.error(err.message || "Gagal memuat dashboard KA");
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  // refetch: pakai params + destination terakhir
  const refetch = useCallback(() => {
    if (lastParamsRef.current) {
      fetchDashboard(lastParamsRef.current, destinationRef.current);
    }
  }, [fetchDashboard]);

  return {
    ...dashboardData,
    isLoading,
    fetch: fetchDashboard, // dipanggil langsung dari onApply
    refetch,
  };
}
