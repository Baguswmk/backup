import { useState, useMemo, useCallback } from "react";

/**
 * useOfflineFilters
 * Hook untuk meng-generate AdvancedFilter filterGroups secara dinamis
 * dari raw data, membuat filter "offline-first" berdasarkan isi set data.
 * 
 * @param {Array} data - Data tabel (raw) yang sudah diload dari backend.
 * @param {Array} configs - Array dari object config: [{ key: "destination", label: "Tujuan" }, ...]
 * @returns {Object} { filteredData, filterGroups, activeFiltersCount, resetFilters }
 */
export function useOfflineFilters(data = [], configs = []) {
  // State filter = { destination: [], product: [] } // empty array means "no filter"
  const [filterState, setFilterState] = useState(() => {
    const initialState = {};
    configs.forEach((c) => {
      initialState[c.key] = [];
    });
    return initialState;
  });

  // Mengekstrak unique options berdasar DATA UNFILTERED.
  // Ini penting agar saat user memfilter sesuatu, opsi lain di dropdown tidak hilang!
  const optionsMap = useMemo(() => {
    if (!data || !Array.isArray(data)) return {};
    const map = {};
    
    configs.forEach((c) => {
      // Ambil nilai unik dari key ini
      const uniqueVals = [
        ...new Set(
          data
            .flatMap((d) => {
              const val = c.getValue ? c.getValue(d) : d[c.key];
              if (Array.isArray(val)) return val;
              return val;
            })
            .filter((v) => v !== undefined && v !== null && v !== "")
        ),
      ].sort();

      map[c.key] = uniqueVals.map((val) => ({
        value: val,
        label: String(val),
      }));
    });
    return map;
  }, [data, configs]);

  // Handle update filter (receives an array of selected values)
  const handleFilterChange = useCallback((key, values) => {
    setFilterState((prev) => ({ ...prev, [key]: values || [] }));
  }, []);

  // Reset semua filter kembali ke []
  const resetFilters = useCallback(() => {
    setFilterState((prev) => {
      const resetState = {};
      configs.forEach((c) => {
        resetState[c.key] = [];
      });
      return resetState;
    });
  }, [configs]);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filterState).filter((arr) => arr && arr.length > 0).length;
  }, [filterState]);

  // Data setelah difilter
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (activeFiltersCount === 0) return data;

    return data.filter((row) => {
      // Harus memenuhi semua KATEGORI filter yang aktif (AND antar kategori)
      return configs.every((c) => {
        const selectedVals = filterState[c.key] || [];
        if (selectedVals.length === 0) return true; // jika filter ini kosong, lolos
        
        const rowVal = c.getValue ? c.getValue(row) : row[c.key];
        
        // OR di dalam satu kategori (jika milih banyak value di satu dropdown)
        if (Array.isArray(rowVal)) {
          return selectedVals.some((sv) => rowVal.includes(sv));
        }
        return selectedVals.includes(String(rowVal));
      });
    });
  }, [data, filterState, configs, activeFiltersCount]);

  // Mapping state and options to AdvancedFilter groups
  const filterGroups = useMemo(() => {
    return configs.map((c) => ({
      id: c.key,
      label: c.label,
      placeholder: c.placeholder || `Pilih ${c.label}`,
      options: optionsMap[c.key] || [],
      value: filterState[c.key] || [],
      onChange: (vals) => handleFilterChange(c.key, vals),
    }));
  }, [configs, optionsMap, filterState, handleFilterChange]);

  return {
    filteredData,
    filterGroups,
    activeFiltersCount,
    resetFilters,
  };
}
