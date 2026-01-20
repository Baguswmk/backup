import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { History, RotateCcw } from "lucide-react";
import { useDumptruck } from "@/modules/timbangan/dumptruck/hooks/useDumptruck";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import DumpTruckDetailModal from "@/modules/timbangan/dumptruck/components/DumpTruckDetailModal";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import Pagination from "@/shared/components/Pagination";
import LoadingContent from "@/shared/components/LoadingContent";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import useAuthStore from "@/modules/auth/store/authStore";
import TableToolbar from "@/shared/components/TableToolbar";
import { showToast } from "@/shared/utils/toast";
import { getTodayDateRange, formatDate } from "@/shared/utils/date";

const DumpTruckHistory = () => {
  const { user } = useAuthStore();

  const fleetHook = useFleet(user ? { user, viewMode: "history" } : null);

  const {
    masters,
    mastersLoading,
    isLoading: fleetLoading,
    isRefreshing: fleetRefreshing,
    refresh: refreshFleet,
    filteredFleetConfigs: allFilteredFleetConfigs,
  } = fleetHook;

  const filteredFleetConfigs = useMemo(() => {
    return (allFilteredFleetConfigs || []).filter(
      (fleet) => fleet.status === "CLOSED",
    );
  }, [allFilteredFleetConfigs]);

  const dumptruckHook = useDumptruck(fleetHook);

  const {
    dumptruckSettings,
    isLoading: dumptruckLoading,
    isRefreshing: dumptruckRefreshing,
    reactivateDumptruckSetting,
    refresh: refreshDumptruck,
  } = dumptruckHook;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const [dateRange, setDateRange] = useState(getTodayDateRange());
  const [shifts, setShifts] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [workUnits, setWorkUnits] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState([]);
  const [dumpingLocations, setDumpingLocations] = useState([]);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailSetting, setDetailSetting] = useState(null);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState(null);

  const pageSize = 10;
  const isLoading = dumptruckLoading || fleetLoading;
  const isRefreshing = dumptruckRefreshing || fleetRefreshing;

  const excavatorOptions = useMemo(
    () =>
      (masters?.excavators || []).map((exc) => ({
        value: String(exc.id),
        label: exc.hull_no,
        hint: exc.company || "-",
      })),
    [masters?.excavators],
  );

  const workUnitOptions = useMemo(
    () =>
      (masters?.workUnits || []).map((wu) => ({
        value: String(wu.id),
        label: wu.subsatker,
        hint: wu.satker || "-",
      })),
    [masters?.workUnits],
  );

  const loadingLocOptions = useMemo(
    () =>
      (masters?.loadingLocations || []).map((loc) => ({
        value: String(loc.id),
        label: loc.name,
      })),
    [masters?.loadingLocations],
  );

  const dumpingLocOptions = useMemo(
    () =>
      (masters?.dumpingLocations || []).map((loc) => ({
        value: String(loc.id),
        label: loc.name,
      })),
    [masters?.dumpingLocations],
  );

  const filterGroups = useMemo(
    () => [
      {
        id: "excavator",
        label: "Excavator",
        options: excavatorOptions,
        value: excavators,
        onChange: (newExcavators) => {
          setExcavators(newExcavators);
          setCurrentPage(1);
        },
        placeholder: "Pilih Excavator",
      },
      {
        id: "workUnit",
        label: "Work Unit",
        options: workUnitOptions,
        value: workUnits,
        onChange: (newWorkUnits) => {
          setWorkUnits(newWorkUnits);
          setCurrentPage(1);
        },
        placeholder: "Pilih Work Unit",
      },
      {
        id: "loadingLocation",
        label: "Loading Location",
        options: loadingLocOptions,
        value: loadingLocations,
        onChange: (newLoadingLocs) => {
          setLoadingLocations(newLoadingLocs);
          setCurrentPage(1);
        },
        placeholder: "Pilih Loading",
      },
      {
        id: "dumpingLocation",
        label: "Dumping Location",
        options: dumpingLocOptions,
        value: dumpingLocations,
        onChange: (newDumpingLocs) => {
          setDumpingLocations(newDumpingLocs);
          setCurrentPage(1);
        },
        placeholder: "Pilih Dumping",
      },
    ],
    [
      excavatorOptions,
      workUnitOptions,
      loadingLocOptions,
      dumpingLocOptions,
      excavators,
      workUnits,
      loadingLocations,
      dumpingLocations,
    ],
  );

  const filteredFleets = useMemo(() => {
    let filtered = filteredFleetConfigs || [];

    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (fleet) =>
          fleet.excavator?.toLowerCase().includes(search) ||
          fleet.workUnit?.toLowerCase().includes(search),
      );
    }

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((fleet) => {
        if (!fleet.date) return false;
        const fleetDate = new Date(fleet.date);
        const from = dateRange.from ? new Date(dateRange.from) : null;
        const to = dateRange.to ? new Date(dateRange.to) : null;

        if (from && fleetDate < from) return false;
        if (to && fleetDate > to) return false;
        return true;
      });
    }

    if (excavators.length > 0) {
      filtered = filtered.filter((f) =>
        excavators.includes(String(f.excavatorId)),
      );
    }
    if (workUnits.length > 0) {
      filtered = filtered.filter((f) =>
        workUnits.includes(String(f.workUnitId)),
      );
    }
    if (loadingLocations.length > 0) {
      filtered = filtered.filter((f) =>
        loadingLocations.includes(String(f.loadingLocationId)),
      );
    }
    if (dumpingLocations.length > 0) {
      filtered = filtered.filter((f) =>
        dumpingLocations.includes(String(f.dumpingLocationId)),
      );
    }

    return filtered;
  }, [
    filteredFleetConfigs,
    searchQuery,
    dateRange,
    shifts,
    excavators,
    workUnits,
    loadingLocations,
    dumpingLocations,
  ]);

  const paginatedFleets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFleets.slice(start, start + pageSize);
  }, [filteredFleets, currentPage]);

  const hasActiveFilters =
    searchQuery ||
    dateRange.from ||
    dateRange.to ||
    shifts.length > 0 ||
    excavators.length > 0 ||
    workUnits.length > 0 ||
    loadingLocations.length > 0 ||
    dumpingLocations.length > 0;

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setDateRange(getTodayDateRange());
    setShifts([]);
    setExcavators([]);
    setWorkUnits([]);
    setLoadingLocations([]);
    setDumpingLocations([]);
    setCurrentPage(1);

    refreshFleet({ dateRange: null });
  }, [refreshFleet]);

  const handleDateRangeChange = useCallback(
    (newDateRange) => {
      setDateRange(newDateRange);
      setCurrentPage(1);

      refreshFleet({ dateRange: newDateRange });

      showToast.success("Memuat data history dengan filter tanggal baru...");
    },
    [refreshFleet],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateRange.from || dateRange.to) {
        refreshFleet({ dateRange });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [dateRange, refreshFleet]);

  const handleViewUnits = useCallback(
    (fleet) => {
      const existingSetting = dumptruckSettings.find(
        (s) => String(s.fleet?.id) === String(fleet.id),
      );
      if (existingSetting) {
        setDetailSetting(existingSetting);
        setShowDetailModal(true);
      }
    },
    [dumptruckSettings],
  );

  const handleReactivate = useCallback(
    (fleet) => {
      const existingSetting = dumptruckSettings.find(
        (s) => String(s.fleet?.id) === String(fleet.id),
      );

      if (!existingSetting) {
        showToast.error("Setting dump truck tidak ditemukan");
        return;
      }

      setReactivateTarget({ fleet, setting: existingSetting });
      setShowReactivateDialog(true);
    },
    [dumptruckSettings],
  );

  const handleConfirmReactivate = useCallback(async () => {
    if (!reactivateTarget) return;

    setIsSaving(true);
    try {
      const result = await reactivateDumptruckSetting(
        reactivateTarget.setting.id,
      );
      if (result?.success) {
        showToast.success("Dump truck setting berhasil direaktivasi");
        await Promise.all([
          refreshFleet({ dateRange }),
          refreshDumptruck({ dateRange }),
        ]);
        setShowReactivateDialog(false);
        setReactivateTarget(null);
      } else {
        showToast.error(result?.message || "Gagal mereaktivasi setting");
      }
    } catch (error) {
      console.error("Error reactivating setting:", error);
      showToast.error("Gagal mereaktivasi setting");
    } finally {
      setIsSaving(false);
    }
  }, [
    reactivateTarget,
    reactivateDumptruckSetting,
    refreshFleet,
    refreshDumptruck,
    dateRange,
  ]);

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        refreshFleet({ dateRange }),
        refreshDumptruck({ dateRange }),
      ]);
      showToast.success("Data berhasil di-refresh");
    } catch (error) {
      console.error("Refresh error:", error);
      showToast.error("Gagal refresh data");
    }
  }, [refreshFleet, refreshDumptruck, dateRange]);

  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return <LoadingContent />;
    }

    if (filteredFleets.length === 0) {
      return (
        <Card className="text-center py-12 dark:bg-gray-800 dark:border-gray-700">
          <CardContent>
            <History className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 dark:text-white">
              {hasActiveFilters ? "Tidak ada hasil" : "Belum Ada Riwayat"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Belum ada fleet dengan status CLOSED
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Excavator
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Work Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Loading
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Dumping
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black dark:text-gray-200">
                  Jumlah Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Ditutup Pada
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black dark:text-gray-200">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedFleets.map((fleet, index) => {
                const existingSetting = dumptruckSettings.find(
                  (s) => String(s.fleet?.id) === String(fleet.id),
                );
                const dtCount = existingSetting?.units?.length || 0;
                const hasSetting = !!existingSetting;

                return (
                  <tr
                    key={fleet.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-sm font-medium dark:text-gray-300">
                      {index + 1 + (currentPage - 1) * pageSize}
                    </td>

                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.excavator}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.workUnit}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.loadingLocation}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.dumpingLocation}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                        CLOSED
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium dark:text-gray-300">
                      {dtCount}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {formatDate(fleet.updatedAt, "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUnits(fleet)}
                          disabled={!hasSetting}
                          className="cursor-pointer disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Lihat
                        </Button>
                        {hasSetting && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivate(fleet)}
                            className="cursor-pointer gap-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reaktivasi
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredFleets.length > pageSize && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredFleets.length / pageSize)}
            onPageChange={setCurrentPage}
            isLoading={false}
          />
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <History className="w-6 h-6" />
            Riwayat Dump Truck
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Menampilkan dump truck settings dari fleet dengan status CLOSED
          </p>
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg shadow-sm dark:border-gray-700">
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <TableToolbar
              activeDateRange={false}
              searchQuery={searchQuery}
              onSearchChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              searchPlaceholder="Cari nama fleet, excavator, work unit..."
              canSearch={true}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              showFilter={true}
              filterExpanded={filterExpanded}
              onToggleFilter={() => setFilterExpanded(!filterExpanded)}
            />

            {filterExpanded && (
              <AdvancedFilter
                isExpanded={filterExpanded}
                onToggleExpand={() => setFilterExpanded(!filterExpanded)}
                filterGroups={filterGroups}
                isLoading={mastersLoading}
                hasActiveFilters={hasActiveFilters}
                onResetFilters={handleResetFilters}
              />
            )}

            {renderContent()}
          </div>
        </div>
      </div>

      <DumpTruckDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailSetting(null);
        }}
        setting={detailSetting}
        availableFleets={[]}
        onMoveUnit={null}
      />

      <ConfirmDialog
        isOpen={showReactivateDialog}
        onClose={() => {
          setShowReactivateDialog(false);
          setReactivateTarget(null);
        }}
        onConfirm={handleConfirmReactivate}
        title="Reaktivasi Setting Dump Truck"
        description="Apakah Anda yakin ingin mereaktivasi dump truck setting untuk fleet ini?"
        confirmLabel="Reaktivasi"
        isProcessing={isSaving}
        icon={RotateCcw}
      >
        {reactivateTarget && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Fleet:</span>
              <span className="font-medium">{reactivateTarget.fleet.exca}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Excavator:</span>
              <span className="font-medium">
                {reactivateTarget.fleet.excavator}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unit:</span>
              <span className="font-medium">
                {reactivateTarget.setting.units?.length || 0} dump trucks
              </span>
            </div>
          </div>
        )}
      </ConfirmDialog>

      <LoadingOverlay isVisible={isSaving} message="Memproses reaktivasi..." />
    </div>
  );
};

export default DumpTruckHistory;
