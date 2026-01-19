import React, { useState, useMemo, useCallback } from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Lock, Info } from "lucide-react";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import { useDumptruck } from "@/modules/timbangan/dumptruck/hooks/useDumptruck";
import { useFilteredData } from "@/shared/hooks/useFilteredData";
import { useModalState } from "@/shared/hooks/useModalState";
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import useAuthStore from "@/modules/auth/store/authStore";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import { showToast } from "@/shared/utils/toast";
import FleetHeader from "@/modules/timbangan/fleet/components/FleetHeader";
import FleetSelectionAlert from "@/modules/timbangan/fleet/components/FleetSelectionAlert";
import FleetFilterSection from "@/modules/timbangan/fleet/components/FleetFilterSection";
import FleetTableContainer from "@/modules/timbangan/fleet/components/FleetTableContainer";
import FleetModalsManager from "@/modules/timbangan/fleet/components/FleetModalsManager";
import {
  DEBOUNCE_TIME,
  TOAST_MESSAGES,
  FILTER_FIELDS,
} from "@/modules/timbangan/fleet/constant/fleetConstants";
import {
  withErrorHandling,
  validateResponse,
} from "@/shared/utils/errorHandler";

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
    filterDataBySatker,
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

  const selectedFleetIds = useTimbanganStore(
    (state) => state.selectedFleetIds || [],
  );
  const setSelectedFleets = useTimbanganStore(
    (state) => state.setSelectedFleets,
  );

  const fleetHook = useFleet(user ? { user } : null, measurementType);
  const {
    isLoading: fleetLoading,
    isRefreshing: fleetRefreshing,
    createFleetConfig,
    updateConfig,
    masters,
    deleteConfig,
    refresh: refreshFleet,
  } = fleetHook;

  const dumptruckHook = useDumptruck(fleetHook);
  const {
    dumptruckSettings,
    refresh: refreshDumptruck,
    isRefreshing: dumptruckRefreshing,
  } = dumptruckHook;

  const [configSearchInput, setConfigSearchInput] = useState("");
  const configSearch = useDebouncedValue(configSearchInput, DEBOUNCE_TIME);
  const [isSaving, setIsSaving] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const fleetConfigsByType = useTimbanganStore(
    (state) => state.fleetConfigsByType[Type] || [],
  );

  const filteredFleetConfigs = useMemo(() => {
    if (!Array.isArray(fleetConfigsByType)) return [];

    let filtered = fleetConfigsByType.filter(
      (fleet) => fleet.status !== "CLOSED",
    );

    filtered = filterDataBySatker(filtered);

    return filtered;
  }, [fleetConfigsByType, filterDataBySatker]);

  const {
    currentPage: configPage,
    setCurrentPage: setConfigPage,
    activeFilters,
    updateFilter,
    resetFilters,
  } = useFilteredData(filteredFleetConfigs, {
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
    if (!configSearch) return filteredFleetConfigs;

    const search = configSearch.toLowerCase();
    return filteredFleetConfigs.filter(
      (config) =>
        config.excavator?.toLowerCase().includes(search) ||
        config.workUnit?.toLowerCase().includes(search),
    );
  }, [filteredFleetConfigs, configSearch]);

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
    const pageSize = 10;
    const start = (configPage - 1) * pageSize;
    return finalFilteredConfigs.slice(start, start + pageSize);
  }, [finalFilteredConfigs, configPage]);

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
  const isRefreshing = fleetRefreshing || dumptruckRefreshing;
  const mastersLoading = false;

  const getFleetDumptruckCount = useCallback(
    (fleetId) => {
      const setting = dumptruckSettings.find((s) => s.fleet?.id === fleetId);
      if (setting?.units?.length) return setting.units.length;

      const fleetConfig = filteredFleetConfigs.find((c) => c.id === fleetId);
      if (fleetConfig) {
        if (fleetConfig.dumptruck && Array.isArray(fleetConfig.dumptruck)) {
          return fleetConfig.dumptruck.length;
        }
        let pairData = fleetConfig.pair_dt_op;
        if (typeof pairData === "string") {
          try {
            pairData = JSON.parse(pairData);
          } catch (e) {
            return 0;
          }
        }
        if (pairData && Array.isArray(pairData)) {
          return pairData.length;
        }
      }
      return 0;
    },
    [dumptruckSettings, filteredFleetConfigs],
  );

  const getFleetDumptruckList = useCallback(
    (fleetConfig) => {
      if (!fleetConfig) return [];

      const setting = dumptruckSettings.find(
        (s) => String(s.fleet?.id) === String(fleetConfig.id),
      );

      if (setting?.units?.length > 0) {
        return setting.units.map((unit) => ({
          id: unit.id || "",
          hull_no: unit.hull_no || "-",
          operatorName: unit.operatorName || "-",
          company: unit.company || "-",
          workUnit: unit.workUnit || "-",
        }));
      }

      if (fleetConfig.dumptruck?.length > 0) {
        return fleetConfig.dumptruck.map((dt) => ({
          id: dt.id || "",
          hull_no: dt.hull_no || "-",
          operatorName: dt.operatorName || "-",
          company: dt.company || "-",
          workUnit: dt.workUnit || "-",
        }));
      }

      let pairData = fleetConfig.pair_dt_op;
      if (typeof pairData === "string") {
        try {
          pairData = JSON.parse(pairData);
        } catch (e) {
          return [];
        }
      }

      if (pairData?.length > 0) {
        return pairData
          .map((pair) => {
            const truck = pair.dts?.data?.[0];
            if (!truck) return null;
            return {
              id: truck?.id || "",
              hull_no: truck?.attributes?.hull_no || "-",
              operatorName: pair.ops?.data?.[0]?.attributes?.name || "-",
              company:
                truck?.attributes?.company?.data?.attributes?.name || "-",
              workUnit:
                truck?.attributes?.work_unit?.data?.attributes?.subsatker ||
                "-",
            };
          })
          .filter((dt) => dt && dt.id);
      }

      return [];
    },
    [dumptruckSettings],
  );

  const filterOptions = useMemo(
    () => ({
      excavators: (masters?.excavators || []).map((exc) => ({
        value: String(exc.id),
        label: exc.hull_no,
        hint: exc.company || "-",
      })),
      workUnits: (masters?.workUnits || []).map((wu) => ({
        value: String(wu.id),
        label: wu.subsatker,
        hint: wu.satker || "-",
      })),
      loadingLocations: (masters?.loadingLocations || []).map((loc) => ({
        value: String(loc.id),
        label: loc.name,
      })),
      dumpingLocations: (masters?.dumpingLocations || []).map((loc) => ({
        value: String(loc.id),
        label: loc.name,
      })),
    }),
    [masters],
  );

  const filterGroups = useMemo(
    () => [
      {
        id: FILTER_FIELDS.EXCAVATOR,
        label: "Excavator",
        options: filterOptions.excavators,
        value: activeFilters.excavators || [],
        onChange: (v) => updateFilter("excavators", v),
        placeholder: "Pilih Excavator",
      },
      {
        id: FILTER_FIELDS.WORK_UNIT,
        label: "Work Unit",
        options: filterOptions.workUnits,
        value: activeFilters.workUnits || [],
        onChange: (v) => updateFilter("workUnits", v),
        placeholder: "Pilih Work Unit",
      },
      {
        id: FILTER_FIELDS.LOADING_LOCATION,
        label: "Loading Location",
        options: filterOptions.loadingLocations,
        value: activeFilters.loadingLocations || [],
        onChange: (v) => updateFilter("loadingLocations", v),
        placeholder: "Pilih Loading",
      },
      {
        id: FILTER_FIELDS.DUMPING_LOCATION,
        label: "Dumping Location",
        options: filterOptions.dumpingLocations,
        value: activeFilters.dumpingLocations || [],
        onChange: (v) => updateFilter("dumpingLocations", v),
        placeholder: "Pilih Dumping",
      },
    ],
    [filterOptions, activeFilters, updateFilter],
  );

  const allSelectedFleets = useMemo(() => {
    return filteredFleetConfigs.filter((f) => selectedFleetIds.includes(f.id));
  }, [filteredFleetConfigs, selectedFleetIds]);

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
      if (!checkDataAccess(config.workUnit || config.subsatker)) {
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
      if (!checkDataAccess(config.workUnit || config.subsatker)) {
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
      return;
    }

    if (selectedConfig && !canUpdate) {
      showToast.error(getDisabledMessage("update"));
      return;
    }
    if (!selectedConfig && !canCreate) {
      showToast.error(getDisabledMessage("create"));
      return;
    }

    setIsSaving(true);

    return await withErrorHandling(
      async () => {
        const result = selectedConfig
          ? await updateConfig(selectedConfig.id, configData)
          : await createFleetConfig(configData);

        validateResponse(
          result,
          selectedConfig ? "update fleet" : "create fleet",
        );

        if (result?.success) {
          closeModal("config");
        }

        return result;
      },
      {
        operation: selectedConfig ? "update fleet" : "create fleet",
        defaultMessage: TOAST_MESSAGES.ERROR.UPDATE_FAILED,
        onError: (error) => {
          if (!error.message?.includes("wajib") && !error.validationError) {
            const isQueued =
              error?.queued ||
              error?.message?.includes("queued for offline sync");
            if (!isQueued) {
              closeModal("config");
            }
          }
        },
      },
    ).finally(() => {
      setIsSaving(false);
    });
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
      if (refreshDumptruck) await refreshDumptruck();
      showToast.success(TOAST_MESSAGES.SUCCESS.REFRESH);
    } catch (error) {
      showToast.error(TOAST_MESSAGES.ERROR.REFRESH_FAILED);
    }
  }, [refreshFleet, refreshDumptruck, canRead, getDisabledMessage]);

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

      const selectedFleets = filteredFleetConfigs.filter((f) =>
        fleetIds.includes(f.id),
      );

      const activeFleets = selectedFleets.filter((f) => f.status === "ACTIVE");

      if (activeFleets.length > 0) {
        showToast.error(
          `Tidak dapat menghapus ${activeFleets.length} fleet dengan status ACTIVE. Ubah status terlebih dahulu.`,
        );
        return;
      }

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
    [canDeletePerm, deleteConfig, refreshFleet, filteredFleetConfigs],
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
            filterType === "subsatker"
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
          filterType === "subsatker"
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
              subsatker tidak ditemukan pada akun Anda. Silakan hubungi admin
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

      <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700 shadow-sm">
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
              enableBulkActions={true}
              onBulkDelete={handleBulkDelete}
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
      />
    </div>
  );
};

export default FleetManagement;
