import React, { useState, useMemo, useCallback } from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Lock, Info } from "lucide-react";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import { useFilteredData } from "@/shared/hooks/useFilteredData";
import { useModalState } from "@/shared/hooks/useModalState";
import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import useAuthStore from "@/modules/auth/store/authStore";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import { showToast } from "@/shared/utils/toast";
import FleetHeader from "@/modules/timbangan/fleet/components/FleetHeader";
import FleetSelectionAlert from "@/modules/timbangan/fleet/components/FleetSelectionAlert";
import FleetFilterSection from "@/modules/timbangan/fleet/components/FleetFilterSection";
import FleetTableContainer from "@/modules/timbangan/fleet/components/FleetTableContainer";
import FleetModalsManager from "@/modules/timbangan/fleet/components/FleetModalsManager";
import { useFleetWithTransfer } from "@/modules/timbangan/fleet/hooks/useFleetWithTransfer"; 
import {
  DEBOUNCE_TIME,
  TOAST_MESSAGES,
  FILTER_FIELDS,
} from "@/modules/timbangan/fleet/constant/fleetConstants";
import {
  withErrorHandling,
  validateResponse,
} from "@/shared/utils/errorHandler";
import { shallow } from "zustand/shallow";

const EMPTY_ARRAY = [];
const PAGE_SIZE = 10;

const FleetManagement = ({ Type }) => {
  const { user } = useAuthStore();

  const measurementTypeMap = {
    Timbangan: "Timbangan",
    FOB: "FOB",
    Bypass: "Bypass",
    Beltscale: "Beltscale",
  };

  const measurementType = measurementTypeMap[Type] || null;

  const {
    canCreate,
    canRead,
    canUpdate,
    canDelete: canDeletePerm,
    isReadOnly,
    filterType,
    checkDataAccess,
    getDisabledMessage,
    shouldShowButton,
    userRole,
    userSatker,
    userCompany,
    userWeighBridge,
    canAccessFleetType,
  } = useFleetPermissions();

  const canAccessType = useMemo(() => {
    return canAccessFleetType(Type);
  }, [canAccessFleetType, Type]);

  const selectedFleetIds = useRitaseStore(
    useCallback((state) => state.selectedFleetIds ?? EMPTY_ARRAY, []),
    shallow,
  );

  const setSelectedFleets = useRitaseStore((state) => state.setSelectedFleets);

  const {
    fleetConfigs,
    isLoading: fleetLoading,
    isRefreshing: fleetRefreshing,
    createFleetConfig,
    updateConfig,
    masters,
    deleteConfig,
    refresh: refreshFleet,
  } = useFleet(user ? { user } : null, measurementType);
const { handleSaveFleet } = useFleetWithTransfer(user);
  const [configSearchInput, setConfigSearchInput] = useState("");
  const configSearch = useDebouncedValue(configSearchInput, DEBOUNCE_TIME);
  const [isSaving, setIsSaving] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const allFleetConfigs = useRitaseStore(
    useCallback((state) => state.fleetConfigs ?? EMPTY_ARRAY, []),
    shallow,
  );

  const fleetConfigsByType = useMemo(() => {
    if (!measurementType) {
      return allFleetConfigs;
    }

    const filtered = allFleetConfigs.filter(
      (config) => config.measurementType === measurementType,
    );

    return filtered;
  }, [allFleetConfigs, measurementType]);

  const {
    currentPage: configPage,
    setCurrentPage: setConfigPage,
    activeFilters,
    updateFilter,
    resetFilters,
  } = useFilteredData(fleetConfigsByType, {
    searchFields: ["name", "excavator", "workUnit"],
    dateField: null,
    customFilters: {
      excavators: "excavatorId",
      workUnits: "workUnitId",
      loadingLocations: "loadingLocationId",
      dumpingLocations: "dumpingLocationId",
    },
  });

  const searchFilteredConfigs = useMemo(() => {
    if (!configSearch) return fleetConfigsByType;

    const search = configSearch.toLowerCase();
    return fleetConfigsByType.filter(
      (config) =>
        config.excavator?.toLowerCase().includes(search) ||
        config.workUnit?.toLowerCase().includes(search),
    );
  }, [fleetConfigsByType, configSearch]);

  const finalFilteredConfigs = useMemo(() => {
    let filtered = searchFilteredConfigs;
    if (activeFilters.excavators?.length > 0) {
      filtered = filtered.filter((c) =>
        activeFilters.excavators.includes(String(c.excavatorId)),
      );
    }
    if (activeFilters.workUnits?.length > 0) {
      filtered = filtered.filter((c) =>
        activeFilters.workUnits.includes(String(c.workUnitId)),
      );
    }
    if (activeFilters.loadingLocations?.length > 0) {
      filtered = filtered.filter((c) =>
        activeFilters.loadingLocations.includes(String(c.loadingLocationId)),
      );
    }
    if (activeFilters.dumpingLocations?.length > 0) {
      filtered = filtered.filter((c) =>
        activeFilters.dumpingLocations.includes(String(c.dumpingLocationId)),
      );
    }

    return filtered;
  }, [searchFilteredConfigs, activeFilters]);
  const finalPaginatedConfigs = useMemo(() => {
    const start = (configPage - 1) * PAGE_SIZE;
    return finalFilteredConfigs.slice(start, start + PAGE_SIZE);
  }, [finalFilteredConfigs, configPage]);

  const totalPages = useMemo(() => {
    const pageSize = 10;
    if (finalFilteredConfigs.length === 0) return 1;
    const calculated = Math.ceil(finalFilteredConfigs.length / pageSize);

    return calculated;
  }, [finalFilteredConfigs.length]);

  const finalHasActiveFilters = useMemo(
    () =>
      !!(
        configSearch ||
        activeFilters.shifts?.length ||
        activeFilters.excavators?.length ||
        activeFilters.workUnits?.length ||
        activeFilters.loadingLocations?.length ||
        activeFilters.dumpingLocations?.length
      ),
    [configSearch, activeFilters],
  );

  const { openModal, closeModal, getModalState } = useModalState({
    config: null,
    detail: null,
    fleetSelection: null,
    delete: null,
  });

  const isConfigsLoading = fleetLoading && !fleetRefreshing;
  const isRefreshing = fleetRefreshing;
  const mastersLoading = false;

  const getFleetDumptruckCount = useCallback(
    (fleetId) => {
      const fleetConfig = fleetConfigsByType.find((c) => c.id === fleetId);
      if (fleetConfig) {
        return fleetConfig.dumptruckCount || fleetConfig.units?.length || 0;
      }
      return 0;
    },
    [fleetConfigsByType],
  );

  const getFleetDumptruckList = useCallback((fleetConfig) => {
    if (!fleetConfig) return EMPTY_ARRAY;
    if (fleetConfig.units?.length > 0) {
      return fleetConfig.units.map((unit) => ({
        id: unit.id || unit.dumpTruckId || "",
        hull_no: unit.hull_no || "-",
        operatorName: unit.operator || "-",
        company: unit.company || "-",
        workUnit: unit.workUnit || "-",
      }));
    }

    return EMPTY_ARRAY;
  }, []);

  const filterOptions = useMemo(
    () => ({
      excavators: (masters?.excavators || EMPTY_ARRAY).map((exc) => ({
        value: String(exc.id),
        label: exc.hull_no,
        hint: exc.company || "-",
      })),
      workUnits: (masters?.workUnits || EMPTY_ARRAY).map((wu) => ({
        value: String(wu.id),
        label: wu.subsatker,
        hint: wu.subsatker || "-",
      })),
      loadingLocations: (masters?.loadingLocations || EMPTY_ARRAY).map(
        (loc) => ({
          value: String(loc.id),
          label: loc.name,
        }),
      ),
      dumpingLocations: (masters?.dumpingLocations || EMPTY_ARRAY).map(
        (loc) => ({
          value: String(loc.id),
          label: loc.name,
        }),
      ),
    }),
    [masters],
  );

  const filterGroups = useMemo(
    () => [
      {
        id: FILTER_FIELDS.EXCAVATOR,
        label: "Excavator",
        options: filterOptions.excavators,
        value: activeFilters.excavators || EMPTY_ARRAY,
        onChange: (v) => updateFilter("excavators", v),
        placeholder: "Pilih Excavator",
      },
      {
        id: FILTER_FIELDS.WORK_UNIT,
        label: "Work Unit",
        options: filterOptions.workUnits,
        value: activeFilters.workUnits || EMPTY_ARRAY,
        onChange: (v) => updateFilter("workUnits", v),
        placeholder: "Pilih Work Unit",
      },
      {
        id: FILTER_FIELDS.LOADING_LOCATION,
        label: "Loading Location",
        options: filterOptions.loadingLocations,
        value: activeFilters.loadingLocations || EMPTY_ARRAY,
        onChange: (v) => updateFilter("loadingLocations", v),
        placeholder: "Pilih Loading",
      },
      {
        id: FILTER_FIELDS.DUMPING_LOCATION,
        label: "Dumping Location",
        options: filterOptions.dumpingLocations,
        value: activeFilters.dumpingLocations || EMPTY_ARRAY,
        onChange: (v) => updateFilter("dumpingLocations", v),
        placeholder: "Pilih Dumping",
      },
    ],
    [filterOptions, activeFilters, updateFilter],
  );

  const allSelectedFleets = useMemo(() => {
    return fleetConfigsByType.filter((f) => selectedFleetIds.includes(f.id));
  }, [fleetConfigsByType, selectedFleetIds]);

  const fleetCounts = useMemo(
    () => ({
      total: allSelectedFleets.length,
      timbangan: allSelectedFleets.length,
    }),
    [allSelectedFleets],
  );

  const handleResetFilters = useCallback(() => {
    setConfigSearchInput("");
    resetFilters();
  }, [resetFilters]);

  const handleCreateConfig = useCallback(() => {
    if (isReadOnly) {
      showToast.error("Anda tidak memiliki akses untuk membuat fleet");
      return;
    }
    if (!canCreate) {
      showToast.error(getDisabledMessage("create"));
      return;
    }
    openModal("config", null);
  }, [isReadOnly, canCreate, getDisabledMessage, openModal]);

  const handleEditConfig = useCallback(
    (config) => {
      if (isReadOnly) {
        showToast.error("Anda tidak memiliki akses untuk mengedit fleet");
        return;
      }
      if (!canUpdate) {
        showToast.error(getDisabledMessage("update"));
        return;
      }
      if (!checkDataAccess(config.workUnit || config.satker|| config.subsatker)) {
        showToast.error(TOAST_MESSAGES.WARNING.NO_ACCESS);
        return;
      }

      if (getModalState("detail").isOpen) {
        closeModal("detail");
      }

      setTimeout(() => {
        openModal("config", config);
      }, 100);
    },
    [
      isReadOnly,
      canUpdate,
      checkDataAccess,
      getDisabledMessage,
      openModal,
      closeModal,
      getModalState,
    ],
  );

  const handleViewConfig = useCallback(
    (config) => {
      if (!canRead) {
        showToast.error(getDisabledMessage("read"));
        return;
      }

      if (getModalState("config").isOpen) {
        closeModal("config");
      }

      setTimeout(() => {
        openModal("detail", config);
      }, 100);
    },
    [canRead, getDisabledMessage, openModal, closeModal, getModalState],
  );

  const handleDeleteConfig = useCallback(
    (config) => {
      if (isReadOnly) {
        showToast.error("Anda tidak memiliki akses untuk menghapus fleet");
        return;
      }
      if (!canDeletePerm) {
        showToast.error(getDisabledMessage("delete"));
        return;
      }
      if (!checkDataAccess(config.workUnit|| config.satker || config.subsatker)) {
        showToast.error(TOAST_MESSAGES.WARNING.NO_ACCESS);
        return;
      }
      if (!config || config.isActive) return;

      openModal("delete", config);
    },
    [isReadOnly, canDeletePerm, checkDataAccess, getDisabledMessage, openModal],
  );
const handleSaveConfig = async (configData) => {
  const selectedConfig = getModalState("config").data;

  if (isReadOnly) {
    showToast.error("Anda tidak memiliki akses untuk menyimpan fleet");
    return { success: false };
  }

  if (selectedConfig && !canUpdate) {
    showToast.error(getDisabledMessage("update"));
    return { success: false };
  }
  if (!selectedConfig && !canCreate) {
    showToast.error(getDisabledMessage("create"));
    return { success: false };
  }

  setIsSaving(true);

  try {
    // GUNAKAN handleSaveFleet yang sudah handle transfer dump truck
    const result = await handleSaveFleet(configData, selectedConfig);

    if (result?.success) {
      closeModal("config");

      setTimeout(() => {
        refreshFleet();
      }, 500);
    }

    return result;
  } catch (error) {
    console.error("❌ Fleet save error:", error);
    showToast.error(error.message || "Gagal menyimpan fleet");
    return { success: false, error: error.message };
  } finally {
    setIsSaving(false);
  }
};
  const handleConfirmDelete = useCallback(async () => {
    const deleteTarget = getModalState("delete").data;

    if (!deleteTarget || isSaving) return;
    if (isReadOnly) {
      showToast.error("Anda tidak memiliki akses untuk menghapus fleet");
      return;
    }
    if (!canDeletePerm) {
      showToast.error(getDisabledMessage("delete"));
      return;
    }

    setIsSaving(true);
    try {
      const result = await deleteConfig(deleteTarget.id);
      if (result?.success) {
        closeModal("delete");
      }
    } catch (error) {
      showToast.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    getModalState,
    isSaving,
    isReadOnly,
    deleteConfig,
    canDeletePerm,
    getDisabledMessage,
    closeModal,
  ]);

  const handleRefresh = useCallback(async () => {
    if (!canRead) {
      showToast.error(getDisabledMessage("read"));
      return;
    }

    try {
      await refreshFleet();
      showToast.success(TOAST_MESSAGES.SUCCESS.REFRESH);
    } catch (error) {
      showToast.error(TOAST_MESSAGES.ERROR.REFRESH_FAILED);
    }
  }, [refreshFleet, canRead, getDisabledMessage]);

  const handleSaveFleetSelection = useCallback(
    (allIds) => {
      setSelectedFleets(allIds);
      showToast.success(
        TOAST_MESSAGES.SUCCESS.FLEET_SELECTION(allIds.length, 0),
      );
    },
    [setSelectedFleets],
  );
  const handleBulkDelete = useCallback(
    async (fleetIds) => {
      if (!canDeletePerm) {
        showToast.error("Anda tidak memiliki akses untuk menghapus fleet");
        return;
      }

      if (!Array.isArray(fleetIds) || fleetIds.length === 0) {
        showToast.error("Tidak ada fleet yang dipilih");
        return;
      }

      fleetConfigsByType.filter((f) => fleetIds.includes(f.id));

      setIsSaving(true);

      return await withErrorHandling(
        async () => {
          const results = [];
          const errors = [];

          for (const fleetId of fleetIds) {
            try {
              const result = await deleteConfig(fleetId);

              if (result?.success) {
                results.push(fleetId);
              } else {
                errors.push({
                  fleetId,
                  error: result?.error || "Unknown error",
                });
              }
            } catch (error) {
              errors.push({ fleetId, error: error.message });
            }
          }

          await refreshFleet();

          if (errors.length === 0) {
            showToast.success(`Berhasil menghapus ${results.length} fleet`);
          } else if (results.length > 0) {
            showToast.warning(
              `${results.length} fleet berhasil dihapus, ${errors.length} gagal`,
            );
          } else {
            showToast.error(`Gagal menghapus semua fleet`);
          }

          return {
            success: results.length > 0,
            successCount: results.length,
            errorCount: errors.length,
            errors,
          };
        },
        {
          operation: "bulk delete",
          defaultMessage: "Gagal menghapus fleet",
        },
      ).finally(() => {
        setIsSaving(false);
      });
    },
    [canDeletePerm, deleteConfig, refreshFleet, fleetConfigsByType],
  );

  if (!canAccessType) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Lock className="w-4 h-4" />
          <AlertDescription>
            Anda tidak memiliki akses ke Fleet {Type}. Silakan hubungi
            administrator untuk mendapatkan akses.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="space-y-6">
        <FleetHeader
          type={Type}
          userRole={userRole}
          isSatkerRestricted={!!filterType}
          userSatker={
            filterType === "satker"
              ? userSatker
              : filterType === "company"
                ? userCompany?.name
                : userWeighBridge?.name
          }
          isRefreshing={false}
          canRead={false}
          canCreate={false}
          shouldShowButton={() => false}
          getDisabledMessage={getDisabledMessage}
          onRefresh={() => {}}
          onCreate={() => {}}
          onManageFleet={() => {}}
          fleetCounts={{ total: 0, timbangan: 0 }}
        />

        <Alert variant="destructive">
          <Lock className="w-4 h-4" />
          <AlertDescription>{getDisabledMessage("read")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen">
      <FleetHeader
        type={Type}
        userRole={userRole}
        isSatkerRestricted={!!filterType}
        userSatker={
          filterType === "satker"
            ? userSatker
            : filterType === "company"
              ? userCompany?.name
              : userWeighBridge?.name
        }
        isRefreshing={isRefreshing}
        canRead={canRead}
        canCreate={canCreate && !isReadOnly}
        shouldShowButton={shouldShowButton}
        getDisabledMessage={getDisabledMessage}
        onRefresh={handleRefresh}
        onCreate={handleCreateConfig}
        onManageFleet={() => openModal("fleetSelection")}
        fleetCounts={fleetCounts}
      />

      {userRole?.toLowerCase() === "ccr" && !userSatker && (
        <Alert
          variant="destructive"
          className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
        >
          <Info className="w-4 h-4 text-red-600 dark:text-red-400" />
          <AlertDescription>
            <p className="text-sm text-red-900 dark:text-red-300">
              <strong>Perhatian:</strong> Data tidak dapat difilter karena
              satker tidak ditemukan pada akun Anda. Silakan hubungi admin
              untuk mengatur work unit Anda.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!isReadOnly && (
        <FleetSelectionAlert
          fleetCounts={fleetCounts}
          onEditSelection={() => openModal("fleetSelection")}
        />
      )}

      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg dark:border-gray-700 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <FleetFilterSection
              searchQuery={configSearchInput}
              onSearchChange={(value) => {
                setConfigSearchInput(value);
                setConfigPage(1);
              }}
              canRead={canRead}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              filterExpanded={filterExpanded}
              onToggleFilter={() => setFilterExpanded(!filterExpanded)}
              filterGroups={filterGroups}
              mastersLoading={mastersLoading}
              hasActiveFilters={finalHasActiveFilters}
              onResetFilters={handleResetFilters}
            />

            <FleetTableContainer
              filteredConfigs={finalFilteredConfigs}
              paginatedConfigs={finalPaginatedConfigs}
              isLoading={isConfigsLoading}
              hasActiveFilters={finalHasActiveFilters}
              onResetFilters={handleResetFilters}
              isRefreshing={isRefreshing}
              isSaving={isSaving}
              canRead={canRead}
              canUpdate={canUpdate && !isReadOnly}
              canDelete={canDeletePerm && !isReadOnly}
              onViewConfig={handleViewConfig}
              onEditConfig={!isReadOnly ? handleEditConfig : undefined}
              onDeleteConfig={!isReadOnly ? handleDeleteConfig : undefined}
              getDumptruckCount={getFleetDumptruckCount}
              getDumptruckList={getFleetDumptruckList}
              currentPage={configPage}
              onPageChange={setConfigPage}
              totalPages={totalPages}
              pageSize={10}
              enableBulkActions={true}
              onBulkDelete={handleBulkDelete}
              enableCollapsibleView={true}      
              defaultViewMode="collapsible"
            />
          </div>
        </div>
      </div>

      <FleetModalsManager
        showConfigModal={!isReadOnly && getModalState("config").isOpen}
        onCloseConfigModal={() => closeModal("config")}
        selectedConfig={getModalState("config").data}
        onSaveConfig={handleSaveConfig}
        masters={masters}
        canUpdate={canUpdate && !isReadOnly}
        fleetType={Type}
        showDetailModal={getModalState("detail").isOpen}
        onCloseDetailModal={() => closeModal("detail")}
        selectedDetailConfig={getModalState("detail").data}
        onEditConfig={!isReadOnly ? handleEditConfig : undefined}
        showFleetSelectionDialog={
          !isReadOnly && getModalState("fleetSelection").isOpen
        }
        getDumptruckList={getFleetDumptruckList}
        onCloseFleetSelectionDialog={() => closeModal("fleetSelection")}
        onSaveFleetSelection={handleSaveFleetSelection}
        showDeleteDialog={!isReadOnly && getModalState("delete").isOpen}
        onCloseDeleteDialog={() => {
          if (!isSaving) closeModal("delete");
        }}
        onConfirmDelete={handleConfirmDelete}
        deleteTarget={getModalState("delete").data}
        getDumptruckCount={getFleetDumptruckCount}
        isSaving={isSaving}
        availableDumptruckSettings={fleetConfigs}
      />
    </div>
  );
};

export default FleetManagement;
