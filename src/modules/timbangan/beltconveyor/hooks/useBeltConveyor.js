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

  const [filters, setFilters] = useState({
    dateRange: {
      from: workInfo.date,
      to: workInfo.date,
    },
    shift: workInfo.shift,
    ...initialFilters,
  });

  // ── Masters from fleet module (same BE DB) ────────────────────────────────
  const { masters, mastersLoading, refreshMasters } = useFleet(null, "beltscale");

  // ── Build query params matching backend contract ───────────────────────────
  const generateQueryParams = useCallback((currentFilters) => {
    const params = {};

    // Date range → dateFrom / dateTo (BE expects YYYY-MM-DD)
    if (currentFilters.dateRange?.from) params.dateFrom = currentFilters.dateRange.from;
    if (currentFilters.dateRange?.to)   params.dateTo   = currentFilters.dateRange.to;

    // Shift — skip "All" (BE interprets absence as all shifts)
    if (currentFilters.shift && currentFilters.shift !== "All") {
      params.shift = currentFilters.shift;
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
    queryKey: ["belt-conveyor", filters],
    queryFn: async () => {
      const params = generateQueryParams(filters);
      const response = await beltConveyorService.fetchData({ params });
      if (!response.success) throw new Error(response.error || "Gagal mengambil data");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  // ── Fetch latest beltscale per loader (for Tambah modal beltscale pre-fill)
  const fetchLatestBeltscale = useCallback(async (loaderNames = []) => {
    if (!loaderNames.length) return {};
    const response = await beltConveyorService.fetchLatestPerLoader(loaderNames);
    if (!response.success || !Array.isArray(response.data)) return {};

    // Build map: { "Loader A": 4100.5, "Loader B": 3980.0 }
    const map = {};
    response.data.forEach((record) => {
      if (record?.loader) map[record.loader] = record.tonnage ?? null;
    });
    return map;
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload) => beltConveyorService.createData(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["belt-conveyor"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => beltConveyorService.updateData(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["belt-conveyor"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => beltConveyorService.deleteData(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["belt-conveyor"] }),
  });

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    // Data
    data: beltConveyorData || [],
    isLoading,
    isError,
    error,

    // Filters
    filters,
    updateFilters,
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
  };
};
