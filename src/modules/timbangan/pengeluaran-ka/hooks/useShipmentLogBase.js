import { useState, useCallback, useRef } from "react";
import pengeluaranKAService from "../services/pengeluaranKAService";

/**
 * Convert a "YYYY-MM" month string to { start_date, end_date } ISO strings
 * covering the full month.
 * e.g. "2026-04" -> { start_date: "2026-04-01T00:00:00.000Z", end_date: "2026-04-30T23:59:59.999Z" }
 */
export function monthToDateRange(month) {
  if (!month) return { start_date: null, end_date: null };
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // last day of month
  return {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  };
}

/**
 * Convert a "YYYY-MM-DD" date string to the start/end of that day (UTC).
 */
function dayToRange(dateStr) {
  if (!dateStr) return { start_date: null, end_date: null };
  const [y, m, d] = dateStr.split("-").map(Number);
  return {
    start_date: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString(),
    end_date: new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString(),
  };
}

/**
 * Base hook: owns filter UI state + destination options.
 *
 * Tidak ada useMemo, tidak ada reactive fetch.
 * Data hanya di-fetch ketika user eksplisit tekan Terapkan
 * → PengeluaranKAManagement.onApply panggil getDateParams() lalu fetch.
 */
export function useShipmentLogBase() {
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const initialFilters = {
    month: currentMonth,
    startDate: "",
    endDate: "",
    destination: "all",
  };

  const [filterMode, setFilterMode] = useState("month");
  const [filters, setFilters] = useState(initialFilters);

  // Refs — selalu up-to-date secara synchronous
  const filtersRef = useRef(initialFilters);
  const filterModeRef = useRef("month");

  const [destinationOptions, setDestinationOptions] = useState([]);
  const [isFetchingDestinations, setIsFetchingDestinations] = useState(false);

  const fetchDestinationOptions = useCallback(async (paramsForDest) => {
    if (!paramsForDest?.start_date || !paramsForDest?.end_date) return;
    setIsFetchingDestinations(true);
    try {
      const data = await pengeluaranKAService.getDashboard({
        ...paramsForDest,
        destination: "all",
      });
      const names = (data?.destination || [])
        .map((d) => d.name)
        .filter(Boolean)
        .sort();
      setDestinationOptions(names);
    } catch {
      // silently fail
    } finally {
      setIsFetchingDestinations(false);
    }
  }, []);

  // updateFilter: update UI state + ref synchronously
  const updateFilter = useCallback((key, value) => {
    filtersRef.current = { ...filtersRef.current, [key]: value };
    setFilters(filtersRef.current);
  }, []);

  const onModeChange = useCallback((mode) => {
    filterModeRef.current = mode;
    setFilterMode(mode);
  }, []);

  /**
   * Hitung params API dari state filter saat ini.
   * Dipanggil di onApply — bukan reactive, hanya on-demand.
   */
  const getDateParams = useCallback(() => {
    const mode = filterModeRef.current;
    const f = filtersRef.current;
    if (mode === "month") {
      return monthToDateRange(f.month);
    }
    const { start_date } = dayToRange(f.startDate);
    const { end_date } = dayToRange(f.endDate);
    return { start_date, end_date };
  }, []);

  return {
    filterMode,
    onModeChange,
    filters,
    updateFilter,
    getDateParams,      // caller compute params on demand, lalu langsung fetch
    destinationOptions,
    isFetchingDestinations,
    fetchDestinationOptions,
  };
}
