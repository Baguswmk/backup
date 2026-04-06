import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { beltConveyorService } from "../services/beltConveyorService";
import { getWorkShiftInfo } from "@/shared/utils/date";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";

/**
 * useBeltConveyor
 *
 * Manages Belt Conveyor data fetching, filtering, and CRUD mutations.
 * Masters (coalTypes, loadingLocations, dumpingLocations) are shared from
 * the fleet module since they live in the same backend DB.
 *
 * Delta calculation is done entirely in the FE (BE does not compute it).
 * Each modal (Tambah / Edit) must compute: delta = tonase - beltscale
 * and include it in the payload before calling createData / updateData.
 */
export const useBeltConveyor = (initialFilters = {}) => {
  const queryClient = useQueryClient();
  const workInfo = getWorkShiftInfo();

  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // Base defaults — setiap consumer bisa override via initialFilters
  const baseFilters = {
    filterMode: "month",
    month: currentMonth,
    dateRange: { from: workInfo.date, to: workInfo.date },
    shift: workInfo.shift,   // default: shift saat ini
  };

  const [filters, setFilters] = useState({ ...baseFilters, ...initialFilters });
  const [committedFilters, setCommittedFilters] = useState({ ...baseFilters, ...initialFilters });

  // ── Masters from fleet module (same BE DB) ────────────────────────────────
  const { masters, mastersLoading, refreshMasters } = useFleet(null, "beltscale");

  // ── Build query params matching backend contract ───────────────────────────
  const generateQueryParams = useCallback((currentFilters) => {
    const params = {};

    // Handle date ranges based on filterMode
    if (currentFilters.filterMode === "month" && currentFilters.month) {
      const [y, m] = currentFilters.month.split("-").map(Number);
      // Construct exact YYYY-MM-DD
      const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().split("T")[0];
      const end = new Date(Date.UTC(y, m, 0)).toISOString().split("T")[0];
      params.dateFrom = start;
      params.dateTo = end;
    } else {
      if (currentFilters.dateRange?.from) params.dateFrom = currentFilters.dateRange.from;
      if (currentFilters.dateRange?.to)   params.dateTo   = currentFilters.dateRange.to;
    }

    // Shift — selalu kirim ke BE (BE wajib menerima shift).
    params.shift = currentFilters.shift || workInfo.shift;

    // Status — pass as is if not "All"
    if (currentFilters.status && currentFilters.status !== "All") {
      params.status = currentFilters.status;
    }

    return params;
  }, []);

  // ── Main data query ────────────────────────────────────────────────────────
  const {
    data: beltConveyorData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["belt-conveyor", committedFilters],
    queryFn: async () => {
      const params = generateQueryParams(committedFilters);
      const response = await beltConveyorService.fetchData({ params });
      if (!response.success) throw new Error(response.error || "Gagal mengambil data");
      return response.data;
    },
  });

  // ── Fetch latest beltscale per loader
  const fetchLatestBeltscale = useCallback(async (loaderNames = [], customFilters = {}) => {
    if (!loaderNames.length) return {};
    const response = await beltConveyorService.fetchLatestPerLoader(loaderNames, customFilters);
    if (!response.success || !Array.isArray(response.data)) return {};

    const map = {};
    response.data.forEach((record) => {
      if (record?.loader) {
         const entry = {
           settingId: record.id ?? null,  // ID setting untuk PATCH coal_type
           beltscale: record.beltscale ?? null,
           coal_type: record.coal_type || null,
         };

         if (record?.hauler) {
            const key = `${record.loader}_${record.hauler}`;
            if (!map[key]) map[key] = entry;
         }
         if (!map[record.loader]) map[record.loader] = entry;
      }
    });
    return map;
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload) => beltConveyorService.createData(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["belt-conveyor"] });
      queryClient.invalidateQueries({ queryKey: ["latest-beltscales"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => beltConveyorService.updateData(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["belt-conveyor"] });
      queryClient.invalidateQueries({ queryKey: ["latest-beltscales"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => beltConveyorService.deleteData(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["belt-conveyor"] });
      queryClient.invalidateQueries({ queryKey: ["latest-beltscales"] });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ id, payload }) => beltConveyorService.updateSetting(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setting-belt-conveyor"] }),
  });

  const createSettingMutation = useMutation({
    mutationFn: (payload) => beltConveyorService.createSetting(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setting-belt-conveyor"] }),
  });

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };

      // Saat switch mode: pastikan kita tidak pakai "All" karena BC tidak support "All" shift
      if (newFilters.filterMode !== undefined && newFilters.filterMode !== prev.filterMode) {
        next.shift = workInfo.shift;
      }

      // Daily mode: auto-commit so data refreshes immediately
      if (next.filterMode === "daily") {
        setCommittedFilters(next);
      }
      return next;
    });
  }, [workInfo.shift]);

  // Explicitly commit current filters → triggers fetch (used by "Terapkan" button)
  const commit = useCallback(() => {
    setCommittedFilters((prev) => ({ ...filters }));
  }, [filters]);

  // onApply: called by the date-filter "Terapkan" button in the management component
  const onApply = useCallback(() => {
    commit();
  }, [commit]);

  return {
    // Data
    data: beltConveyorData || [],
    isLoading,
    isError,
    error,

    // Filters
    filters,
    updateFilters,
    onApply,
    refetch,

    // Masters
    masters,
    mastersLoading,
    refreshMasters,

    // Helpers
    fetchLatestBeltscale,

    // CRUD mutations
    createData: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateData: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteData: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // Setting CRUD
    updateSetting: updateSettingMutation.mutateAsync,
    createSetting: createSettingMutation.mutateAsync,
    isUpdatingSetting: updateSettingMutation.isPending,
  };
};
