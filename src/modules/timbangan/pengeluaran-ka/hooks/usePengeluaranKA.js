import { useState, useCallback, useEffect, useRef } from "react";
import { showToast } from "@/shared/utils/toast";
import pengeluaranKAService from "../services/pengeluaranKAService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Group flat carriage records by id_rangkaian and build table rows.
 * Each train (id_rangkaian) becomes one row with aggregated totalTonnage
 * and a durationMinutes derived from start/end times.
 */
const groupCarriageRecords = (records) => {
  const groups = {};

  records.forEach((record) => {
    const key = record.id_rangkaian;
    if (!groups[key]) {
      groups[key] = {
        id: key,
        trainId: key,
        destination: record.destination,
        product: record.coal_type,
        stockpileLocation: record.origin,
        tlsLocation: record.origin,
        startTime: record.start_loading_time,
        endTime: record.end_loading_time,
        shift: record.shift,
        wagons: [],
        totalTonnage: 0,
      };
    }
    groups[key].wagons.push(record);
    groups[key].totalTonnage += Number(record.load_weight) || 0;
  });

  return Object.values(groups).map((group) => ({
    ...group,
    totalTonnage: Number(group.totalTonnage.toFixed(4)),
    durationMinutes:
      group.startTime && group.endTime
        ? Math.round(
            (new Date(group.endTime) - new Date(group.startTime)) / 60000
          )
        : 0,
  }));
};

/**
 * Compute summary statistics from grouped train records.
 */
const computeSummary = (grouped) => {
  if (!grouped || grouped.length === 0) {
    return { total: { totalCount: 0, totalTonnage: 0, avgDuration: 0 }, destinations: [] };
  }

  const total = {
    totalCount: grouped.length,
    totalTonnage: Number(
      grouped.reduce((sum, g) => sum + g.totalTonnage, 0).toFixed(4)
    ),
    avgDuration:
      grouped.length > 0
        ? Math.round(
            grouped.reduce((sum, g) => sum + g.durationMinutes, 0) /
              grouped.length
          )
        : 0,
  };

  const byDest = {};
  grouped.forEach((g) => {
    const key = g.destination || "—";
    if (!byDest[key]) {
      byDest[key] = {
        name: key,
        totalCount: 0,
        totalTonnage: 0,
        durations: [],
      };
    }
    byDest[key].totalCount++;
    byDest[key].totalTonnage = Number(
      (byDest[key].totalTonnage + g.totalTonnage).toFixed(4)
    );
    byDest[key].durations.push(g.durationMinutes);
  });

  const destinations = Object.values(byDest).map((d) => ({
    name: d.name,
    totalCount: d.totalCount,
    totalTonnage: d.totalTonnage,
    avgDuration:
      d.durations.length > 0
        ? Math.round(d.durations.reduce((a, b) => a + b, 0) / d.durations.length)
        : 0,
  }));

  return { total, destinations };
};

/**
 * Transform parsed Excel items (from excelKaParser) to API payload format.
 */
const transformExcelPayload = (items) =>
  items.map((item) => ({
    id_rangkaian:       item.bbr,
    carriage_number:    item.nomor_gerbong,
    start_loading_time: item.mulai,
    end_loading_time:   item.selesai,
    origin:             item.loading_location,
    destination:        item.tujuan,
    capasity:           Number(item.kapasitas) || 0,
    load_weight:        Number(item.tonase)    || 0,
    coal_type:          item.jenis_bb,
    seq_no:             Number(item.urut)      || 0,
    operator:           item.operator,
    shift:              Number(item.shift)     || 0,
  }));

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const usePengeluaranKA = () => {
  const [tableData,    setTableData]    = useState([]);
  const [summaryData,  setSummaryData]  = useState({});
  const [isLoading,    setIsLoading]    = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters,      setFilters]      = useState({ month: "", destination: "" });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ----- fetch ---------------------------------------------------------------

  const fetchLaporan = useCallback(async (params = {}) => {
    setIsLoading(true);
    try {
      const raw = await pengeluaranKAService.getAll(params);
      let records = [];
      if (Array.isArray(raw)) {
        records = raw;
      } else if (raw && Array.isArray(raw.record)) {
        records = raw.record;
      }

      if (isMountedRef.current) {
        const grouped = groupCarriageRecords(records);
        setTableData(grouped);
        setSummaryData(computeSummary(grouped));
      }
    } catch (err) {
      if (isMountedRef.current) {
        showToast.error(err.message || "Gagal memuat data pengeluaran KA");
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchLaporan(filters);
  }, [filters, fetchLaporan]);

  // ----- submit: excel -------------------------------------------------------

  const submitExcel = useCallback(
    async (parsedItems) => {
      const loadingId = showToast.loading("Menyimpan data...");
      setIsSubmitting(true);
      try {
        const payload = transformExcelPayload(parsedItems);
        await pengeluaranKAService.create(payload);
        showToast.safeDismiss(loadingId);
        showToast.success(
          `✅ ${payload.length} data gerbong berhasil disimpan`
        );
        // Re-fetch to reflect new data
        await fetchLaporan(filters);
      } catch (err) {
        showToast.apiErrorWithCleanup({ message: err.message }, loadingId);
      } finally {
        if (isMountedRef.current) setIsSubmitting(false);
      }
    },
    [filters, fetchLaporan]
  );

  // ----- submit: manual ------------------------------------------------------

  const submitManual = useCallback(
    async (manualPayload) => {
      const loadingId = showToast.loading("Menyimpan data...");
      setIsSubmitting(true);
      try {
        await pengeluaranKAService.create(manualPayload);
        showToast.safeDismiss(loadingId);
        showToast.success(
          `✅ ${manualPayload.length} data gerbong berhasil disimpan`
        );
        await fetchLaporan(filters);
      } catch (err) {
        showToast.apiErrorWithCleanup({ message: err.message }, loadingId);
      } finally {
        if (isMountedRef.current) setIsSubmitting(false);
      }
    },
    [filters, fetchLaporan]
  );

  // ----- filter helpers ------------------------------------------------------

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const refetch = useCallback(() => fetchLaporan(filters), [filters, fetchLaporan]);

  return {
    tableData,
    summaryData,
    isLoading,
    isSubmitting,
    filters,
    updateFilter,
    submitExcel,
    submitManual,
    refetch,
  };
};
