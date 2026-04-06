import { useState, useCallback, useEffect, useRef } from "react";
import pengeluaranKAService from "../services/pengeluaranKAService";
import { showToast } from "@/shared/utils/toast";
import { monthToDateRange } from "./useShipmentLogBase";

/**
 * Shape raw BE /report response into:
 *  - summaryData  -> SummaryOverviewCards { total, destinations }
 *  - tableData    -> PengeluaranTable row array
 */
function shapeLaporanData(raw) {
  const s = raw?.summaries || {};
  const tls = raw?.tls || [];
  const destinations = raw?.destination || [];
  const records = raw?.record || [];
  const carriages = raw?.carriage || [];

  // Group carriages by id_rangkaian for O(1) lookup
  const carriageByRangkaian = {};
  carriages.forEach((c) => {
    const key = c.id_rangkaian;
    if (!carriageByRangkaian[key]) carriageByRangkaian[key] = [];
    carriageByRangkaian[key].push(c);
  });

  const byTls = tls.map((t) => ({
    tls: t.origin,
    count: t.count,
    tonnage: t.totalTonnage,
    avgDuration: t.avgDuration,
  }));

  const summaryData = {
    total: {
      totalCount: s.count || 0,
      totalTonnage: s.totalTonnage || 0,
      avgDuration: s.avgDuration || 0,
      byTls,
    },
    destinations: destinations.map((d) => ({
      name: d.name,
      totalCount: d.totalCount,
      totalTonnage: d.totalTonnage,
      avgDuration: d.avgDuration,
      byTls: (d.tls || []).map((t) => ({
        tls: t.tls,
        count: t.count,
        tonnage: t.tonnage,
        avgDuration: t.avgDuration,
      })),
    })),
  };

  // One table row per id_rangkaian
  const tableData = records.map((r) => {
    const carriagesForRow = carriageByRangkaian[r.id_rangkaian] || [];
    const firstCarriage   = carriagesForRow[0] || null;
    return {
      id: r.id_rangkaian,
      trainId: r.id_rangkaian,
      tlsLocation: r.tls,
      stockpileLocation: r.stockpile,
      destination: r.destination,
      totalTonnage: r.totalLoadWeight,
      durationMinutes: r.duration,
      product: Array.isArray(r.coal_type) ? r.coal_type.join(", ") : r.coal_type,
      shift: r.shift ? (String(r.shift).startsWith("Shift") ? r.shift : `Shift ${r.shift}`) : "—",
      operator: r.operator,
      startTime: r.start_loading_time || firstCarriage?.start_loading_time || null,
      endTime:   r.end_loading_time   || firstCarriage?.end_loading_time   || null,
      carriages: carriagesForRow,
    };
  });

  // One table row per (id_rangkaian x coal_type)
  const tableDataByProduct = [];
  records.forEach((r) => {
    const carriagesForRecord = carriageByRangkaian[r.id_rangkaian] || [];

    if (carriagesForRecord.length === 0) {
      tableDataByProduct.push({
        ...tableData.find((td) => td.id === r.id_rangkaian),
      });
      return;
    }

    const productGroups = {};
    carriagesForRecord.forEach((c) => {
      const pt = c.coal_type || "—";
      if (!productGroups[pt]) {
        productGroups[pt] = { totalWeight: 0, count: 0 };
      }
      productGroups[pt].totalWeight += Number(c.load_weight) || 0;
      productGroups[pt].count += 1;
    });

    Object.entries(productGroups).forEach(([productName, agg]) => {
      tableDataByProduct.push({
        id: `${r.id_rangkaian}__${productName}`,
        trainId: r.id_rangkaian,
        tlsLocation: r.tls,
        stockpileLocation: r.stockpile,
        destination: r.destination,
        totalTonnage: agg.totalWeight,
        durationMinutes: r.duration,
        product: productName,
        shift: r.shift ? (String(r.shift).startsWith("Shift") ? r.shift : `Shift ${r.shift}`) : "—",
        operator: r.operator,
        startTime: r.start_loading_time || carriagesForRecord[0]?.start_loading_time || null,
        endTime:   r.end_loading_time   || carriagesForRecord[0]?.end_loading_time   || null,
        carriages: carriagesForRecord,
      });
    });
  });

  return { summaryData, tableData, tableDataByProduct };
}

/**
 * Transform Excel parsed items to API payload shape.
 */
function transformExcelPayload(items) {
  return items.map((item) => ({
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
    shift:              item.shift ? (String(item.shift).startsWith("Shift") ? String(item.shift) : `Shift ${item.shift}`) : "",
  }));
}

/**
 * Hook laporan KA.
 *
 * TIDAK ada reactive useEffect yang menonton dateParams.
 * Fetch hanya terjadi ketika:
 *   1. fetch(params) dipanggil langsung (dari onApply)
 *   2. refetch() dipanggil (menggunakan params terakhir)
 *   3. Setelah submit excel/manual/override (re-fetch dengan params terakhir)
 */
export function usePengeluaranKALaporan() {
  const [tableData,          setTableData]          = useState([]);
  const [tableDataByProduct, setTableDataByProduct] = useState([]);
  const [summaryData,        setSummaryData]        = useState({});
  const [isLoading,          setIsLoading]          = useState(false);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [duplicateError,     setDuplicateError]     = useState(null);

  const isMountedRef  = useRef(true);
  // Inisialisasi dengan bulan ini agar refetch() bekerja sebelum user tekan "Terapkan"
  const currentMonthDefault = monthToDateRange(new Date().toISOString().slice(0, 7));
  const lastParamsRef = useRef(currentMonthDefault);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchLaporan = useCallback(async (params) => {
    if (!params?.start_date || !params?.end_date) return;
    lastParamsRef.current = params;
    // Reset data dulu agar data lama tidak terlihat saat loading
    setTableData([]);
    setTableDataByProduct([]);
    setSummaryData({});
    setIsLoading(true);
    try {
      const raw = await pengeluaranKAService.getReport(params, { forceRefresh: true });
      if (!isMountedRef.current) return;
      const { summaryData: sd, tableData: td, tableDataByProduct: tdbp } = shapeLaporanData(raw);
      setSummaryData(sd);
      setTableData(td);
      setTableDataByProduct(tdbp);
    } catch (err) {
      if (isMountedRef.current) {
        showToast.error(err.message || "Gagal memuat laporan KA");
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  // refetch: pakai params terakhir
  const refetch = useCallback(() => {
    if (lastParamsRef.current) fetchLaporan(lastParamsRef.current);
  }, [fetchLaporan]);

  // ----------- Submit handlers -----------

  const submitExcel = useCallback(async (parsedItems) => {
    const loadingId = showToast.loading("Menyimpan data...");
    setIsSubmitting(true);
    setDuplicateError(null);
    try {
      const payload = transformExcelPayload(parsedItems);
      await pengeluaranKAService.create(payload);
      showToast.safeDismiss(loadingId);
      showToast.success(`✅ ${payload.length} data gerbong berhasil disimpan`);
      if (lastParamsRef.current) await fetchLaporan(lastParamsRef.current);
    } catch (err) {
      console.log(err)
      if (err.status === 409 || (err.message && err.message.toLowerCase().includes("duplikasi"))) {
        showToast.safeDismiss(loadingId);
        setDuplicateError({ payload: transformExcelPayload(parsedItems), message: err.message });
      } else {
        showToast.apiErrorWithCleanup({ message: err.message }, loadingId);
      }
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  }, [fetchLaporan]);

  const submitManual = useCallback(async (manualPayload) => {
    const loadingId = showToast.loading("Menyimpan data...");
    setIsSubmitting(true);
    setDuplicateError(null);
    try {
      await pengeluaranKAService.create(manualPayload);
      showToast.safeDismiss(loadingId);
      showToast.success(`✅ ${manualPayload.length} data gerbong berhasil disimpan`);
      if (lastParamsRef.current) await fetchLaporan(lastParamsRef.current);
    } catch (err) {
      if (err.status === 409 || (err.message && err.message.toLowerCase().includes("duplikat"))) {
        showToast.safeDismiss(loadingId);
        setDuplicateError({ payload: manualPayload, message: err.message });
      } else {
        showToast.apiErrorWithCleanup({ message: err.message }, loadingId);
      }
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  }, [fetchLaporan]);

  const submitOverride = useCallback(async (originalPayload, note, evidenceId) => {
    const loadingId = showToast.loading("Menimpa data duplikat...");
    setIsSubmitting(true);
    setDuplicateError(null);
    try {
      const overridePayload = originalPayload.map((item) => ({
        ...item,
        note,
        evidence: evidenceId,
      }));
      await pengeluaranKAService.update(overridePayload);
      showToast.safeDismiss(loadingId);
      showToast.success(`✅ ${overridePayload.length} data gerbong berhasil ditimpa (override)`);
      if (lastParamsRef.current) await fetchLaporan(lastParamsRef.current);
    } catch (err) {
      showToast.apiErrorWithCleanup({ message: err.message }, loadingId);
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  }, [fetchLaporan]);

  return {
    tableData,
    tableDataByProduct,
    summaryData,
    isLoading,
    isSubmitting,
    duplicateError,
    setDuplicateError,
    fetch: fetchLaporan, // dipanggil langsung dari onApply
    refetch,
    submitExcel,
    submitManual,
    submitOverride,
  };
}
