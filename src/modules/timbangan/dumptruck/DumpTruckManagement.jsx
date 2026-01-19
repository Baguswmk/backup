import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useDumptruck } from "@/modules/timbangan/dumptruck/hooks/useDumptruck";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import { useDumptruckPermissions } from "@/shared/permissions/usePermissions";
import { useModalState } from "@/shared/hooks/useModalState";
import { dumptruckService } from "@/modules/timbangan/dumptruck/services/dumptruckService";
import DumpTruckHeader from "@/modules/timbangan/dumptruck/components/DumpTruckHeader";
import DumpTruckFilters from "@/modules/timbangan/dumptruck/components/DumpTruckFilters";
import DumpTruckAlerts from "@/modules/timbangan/dumptruck/components/DumpTruckAlerts";
import DumpTruckModal from "@/modules/timbangan/dumptruck/components/DumpTruckModal";
import DumpTruckDetailModal from "@/modules/timbangan/dumptruck/components/DumpTruckDetailModal";
import DumpTruckTable from "@/modules/timbangan/dumptruck/components/DumpTruckTable";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";
import {
  DEFAULT_STATES,
  FLEET_STATUS,
  LOADING_MESSAGES,
  TOAST_MESSAGES,
  VALIDATION_MESSAGES,
} from "@/modules/timbangan/dumptruck/constant/dumptruckConstants";
import {
  withErrorHandling,
  validateResponse,
} from "@/shared/utils/errorHandler";

const DumpTruckManagement = () => {
  const { user } = useAuthStore();

  const {
    canCreate,
    canRead,
    canUpdate,
    canDelete: canDeletePerm,
    isSatkerRestricted,
    canViewAllSatker,
    checkDataAccess,
    filterDataBySatker,
    getDisabledMessage,
    shouldShowButton,
    userRole,
    userSatker,
    allowedFleetTypes,
  } = useDumptruckPermissions();

  const measurementTypeFilter = useMemo(() => {
    if (!allowedFleetTypes || allowedFleetTypes.length === 0) {
      return null;
    }

    const measurementTypeMap = {
      Jembatan: "Timbangan",
      Timbangan: "Timbangan",
      FOB: "FOB",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    };

    const allowedMeasurementTypes = [
      ...new Set(
        allowedFleetTypes.map((type) => measurementTypeMap[type] || type),
      ),
    ];

    if (allowedMeasurementTypes.length >= 4) {
      return null;
    }

    return allowedMeasurementTypes.length === 1
      ? allowedMeasurementTypes[0]
      : allowedMeasurementTypes;
  }, [allowedFleetTypes]);

  const fleetConfig = useMemo(() => (user ? { user } : null), [user]);
  const fleetHook = useFleet(fleetConfig);
  const {
    masters,
    mastersLoading,
    isLoading: fleetLoading,
    isRefreshing: fleetRefreshing,
    refresh: refreshFleet,
    userRoleInfo,
    filteredFleetConfigs: allFilteredFleetConfigs,
  } = fleetHook;

  const filteredFleetConfigs = useMemo(() => {
    if (!Array.isArray(allFilteredFleetConfigs)) {
      console.warn("⚠️ allFilteredFleetConfigs is not an array");
      return [];
    }

    let filtered = allFilteredFleetConfigs;

    filtered = filtered.filter((fleet) => {
      if (
        fleet.measurementType ||
        fleet.measurementType === null ||
        fleet.measurementType === undefined ||
        fleet.measurementType === ""
      )
        return true;
    });

    if (isSatkerRestricted && !canViewAllSatker) {
      filtered = filterDataBySatker(filtered);
    }

    if (measurementTypeFilter) {
      if (Array.isArray(measurementTypeFilter)) {
        filtered = filtered.filter((fleet) =>
          measurementTypeFilter.includes(fleet.measurementType),
        );
      } else {
        filtered = filtered.filter(
          (fleet) => fleet.measurementType === measurementTypeFilter,
        );
      }
    }
    return filtered;
  }, [
    allFilteredFleetConfigs,
    isSatkerRestricted,
    canViewAllSatker,
    filterDataBySatker,
    measurementTypeFilter,
  ]);

  const dumptruckHook = useDumptruck(fleetHook, measurementTypeFilter);
  const {
    dumptruckSettings,
    isLoading: dumptruckLoading,
    isRefreshing: dumptruckRefreshing,
    createSetting,
    updateSetting,
    deleteSetting,
    refresh: refreshDumptruck,
  } = dumptruckHook;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [shifts, setShifts] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [workUnits, setWorkUnits] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState([]);
  const [dumpingLocations, setDumpingLocations] = useState([]);
  const [statusValues, setStatusValues] = useState([]);

  const pageSize = 10;

  const filteredFleets = useMemo(() => {
    let filtered = [...filteredFleetConfigs];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (fleet) =>
          fleet.excavator?.toLowerCase().includes(q) ||
          fleet.workUnit?.toLowerCase().includes(q),
      );
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
    if (statusValues.length > 0) {
      filtered = filtered.filter((f) => statusValues.includes(f.status));
    }
    return filtered;
  }, [
    filteredFleetConfigs,
    searchQuery,
    shifts,
    excavators,
    workUnits,
    loadingLocations,
    dumpingLocations,
    statusValues,
  ]);

  const totalPages = Math.ceil(filteredFleets.length / pageSize);
  const paginatedFleets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const paginated = filteredFleets.slice(start, start + pageSize);
    return paginated;
  }, [filteredFleets, currentPage, pageSize]);

  const hasActiveFilters =
    searchQuery ||
    shifts.length > 0 ||
    excavators.length > 0 ||
    workUnits.length > 0 ||
    loadingLocations.length > 0 ||
    dumpingLocations.length > 0 ||
    statusValues.length > 0;

  const updateSearch = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const updateFilter = (filterName, value) => {
    switch (filterName) {
      case "shifts":
        setShifts(value);
        break;
      case "excavators":
        setExcavators(value);
        break;
      case "workUnits":
        setWorkUnits(value);
        break;
      case "loadingLocations":
        setLoadingLocations(value);
        break;
      case "dumpingLocations":
        setDumpingLocations(value);
        break;
      case "statusValues":
        setStatusValues(value);
        break;
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setShifts([]);
    setExcavators([]);
    setWorkUnits([]);
    setLoadingLocations([]);
    setDumpingLocations([]);
    setStatusValues([]);
    setCurrentPage(1);
  };

  const { openModal, closeModal, getModalState } = useModalState({
    config: null,
    detail: null,
    delete: null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const isLoading = dumptruckLoading || fleetLoading;
  const isRefreshing = dumptruckRefreshing || fleetRefreshing;

  const excavatorOptions = useMemo(() => {
    if (!masters?.excavators) return [];
    return masters.excavators.map((exc) => ({
      value: String(exc.id),
      label: exc.hull_no,
      hint: exc.company || "-",
    }));
  }, [masters?.excavators]);

  const workUnitOptions = useMemo(() => {
    if (!masters?.workUnits) return [];
    return masters.workUnits.map((wu) => ({
      value: String(wu.id),
      label: wu.subsatker,
      hint: wu.satker || "-",
    }));
  }, [masters?.workUnits]);

  const loadingLocOptions = useMemo(() => {
    if (!masters?.loadingLocations) return [];
    return masters.loadingLocations.map((loc) => ({
      value: String(loc.id),
      label: loc.name,
    }));
  }, [masters?.loadingLocations]);

  const dumpingLocOptions = useMemo(() => {
    if (!masters?.dumpingLocations) return [];
    return masters.dumpingLocations.map((loc) => ({
      value: String(loc.id),
      label: loc.name,
    }));
  }, [masters?.dumpingLocations]);

  const statusOptions = useMemo(() => {
    if (!masters?.status) return [];
    return masters.status.map((st) => ({
      value: st.id,
      label: st.name,
    }));
  }, [masters?.status]);

  const filterGroups = useMemo(
    () => [
      {
        id: "excavator",
        label: "Excavator",
        options: excavatorOptions,
        value: excavators,
        onChange: (val) => updateFilter("excavators", val),
        placeholder: "Pilih Excavator",
      },
      {
        id: "workUnit",
        label: "Work Unit",
        options: workUnitOptions,
        value: workUnits,
        onChange: (val) => updateFilter("workUnits", val),
        placeholder: "Pilih Work Unit",
      },
      {
        id: "loadingLocation",
        label: "Loading Location",
        options: loadingLocOptions,
        value: loadingLocations,
        onChange: (val) => updateFilter("loadingLocations", val),
        placeholder: "Pilih Loading",
      },
      {
        id: "dumpingLocation",
        label: "Dumping Location",
        options: dumpingLocOptions,
        value: dumpingLocations,
        onChange: (val) => updateFilter("dumpingLocations", val),
        placeholder: "Pilih Dumping",
      },
      {
        id: "status",
        label: "Status",
        options: statusOptions,
        value: statusValues,
        onChange: (val) => updateFilter("statusValues", val),
        placeholder: "Pilih Status",
      },
    ],
    [
      excavatorOptions,
      workUnitOptions,
      loadingLocOptions,
      dumpingLocOptions,
      statusOptions,
      excavators,
      workUnits,
      loadingLocations,
      dumpingLocations,
      statusValues,
    ],
  );

  const handleAddNewSetting = useCallback(() => {
    if (!canCreate) {
      showToast.error(getDisabledMessage("create"));
      return;
    }
    openModal("config", DEFAULT_STATES.EDITING_SETTING);
  }, [canCreate, getDisabledMessage, openModal]);

  const handleInputUpdateSetting = useCallback(
    (fleet) => {
      if (!canUpdate) {
        showToast.error(getDisabledMessage("update"));
        return;
      }

      const hasAccess = checkDataAccess(fleet.workUnit || fleet.subsatker);

      if (!hasAccess) {
        showToast.error(TOAST_MESSAGES.WARNING.NO_DATA_ACCESS);
        return;
      }

      const existingSetting = dumptruckSettings.find(
        (s) => String(s.fleet?.id) === String(fleet.id),
      );

      const settingData = existingSetting || {
        fleet,
        units: [],
        id: undefined,
      };

      openModal("config", settingData);
    },
    [
      canUpdate,
      checkDataAccess,
      dumptruckSettings,
      openModal,
      getDisabledMessage,
    ],
  );

  const handleDeleteSetting = useCallback(
    (fleet) => {
      if (!canDeletePerm) {
        showToast.error(getDisabledMessage("delete"));
        return;
      }

      if (!checkDataAccess(fleet.workUnit || fleet.subsatker)) {
        showToast.error(TOAST_MESSAGES.WARNING.NO_DATA_ACCESS);
        return;
      }

      const existingSetting = dumptruckSettings.find(
        (s) => String(s.fleet?.id) === String(fleet.id),
      );

      if (existingSetting) {
        openModal("delete", existingSetting);
      }
    },
    [
      dumptruckSettings,
      canDeletePerm,
      checkDataAccess,
      getDisabledMessage,
      openModal,
    ],
  );

  const fetchLatestSettingData = useCallback(
    async (settingId) => {
      try {
        const result = await dumptruckService.fetchDumptruckSettings({
          user,
          forceRefresh: true,
          filters: {
            id: { $eq: parseInt(settingId) },
          },
          measurementType: measurementTypeFilter,
        });

        if (
          !result ||
          !result.success ||
          !result.data ||
          result.data.length === 0
        ) {
          console.error("❌ No data returned for setting:", settingId);
          return null;
        }

        return result.data[0];
      } catch (error) {
        console.error("❌ Failed to fetch latest setting:", {
          settingId,
          error: error.message,
          response: error.response?.data,
        });
        return null;
      }
    },
    [user, measurementTypeFilter],
  );

  const handleMoveUnit = useCallback(
    async (settingId, unitId, targetFleetId) => {
      if (!canUpdate) {
        showToast.error(getDisabledMessage("update"));
        return;
      }

      setIsSaving(true);
      await withErrorHandling(
        async () => {
          const latestSource = await fetchLatestSettingData(settingId);
          if (!latestSource) {
            throw new Error(TOAST_MESSAGES.ERROR.FETCH_LATEST_FAILED);
          }

          const sourceUnits = latestSource.units || [];
          const unitToMove = sourceUnits.find(
            (u) => String(u.id) === String(unitId),
          );

          if (!unitToMove) {
            throw new Error("Unit tidak ditemukan di setting sumber");
          }

          const newSourcePairDtOp = sourceUnits
            .filter((u) => String(u.id) !== String(unitId))
            .map((u) => ({
              truckId: String(u.id),
              operatorId: String(u.operatorId),
            }));

          const resSource = await updateSetting(latestSource.id, {
            pairDtOp: newSourcePairDtOp,
          });

          validateResponse(resSource, "remove unit from source");

          const target = dumptruckSettings.find(
            (s) => String(s.fleet?.id) === String(targetFleetId),
          );

          if (target) {
            const latestTarget = await fetchLatestSettingData(target.id);
            if (!latestTarget) {
              throw new Error(TOAST_MESSAGES.ERROR.FETCH_LATEST_FAILED);
            }

            const targetUnits = latestTarget.units || [];
            const alreadyInTarget = targetUnits.some(
              (u) => String(u.id) === String(unitId),
            );

            if (!alreadyInTarget) {
              const newTargetPairDtOp = [
                ...targetUnits.map((u) => ({
                  truckId: String(u.id),
                  operatorId: String(u.operatorId),
                })),
                {
                  truckId: String(unitId),
                  operatorId: String(unitToMove.operatorId),
                },
              ];

              const resTarget = await updateSetting(latestTarget.id, {
                pairDtOp: newTargetPairDtOp,
              });

              validateResponse(resTarget, "add unit to target");
            }
          } else {
            const resNew = await createSetting({
              fleetId: String(targetFleetId),
              pairDtOp: [
                {
                  truckId: String(unitId),
                  operatorId: String(unitToMove.operatorId),
                },
              ],
            });

            validateResponse(resNew, "create new setting");
          }

          await Promise.all([refreshFleet(), refreshDumptruck()]);

          showToast.success(TOAST_MESSAGES.SUCCESS.MOVE_UNIT);
        },
        {
          operation: "move unit",
          defaultMessage: TOAST_MESSAGES.ERROR.MOVE_UNIT_FAILED,
        },
      );

      setIsSaving(false);
    },
    [
      canUpdate,
      getDisabledMessage,
      fetchLatestSettingData,
      dumptruckSettings,
      updateSetting,
      createSetting,
      refreshFleet,
      refreshDumptruck,
    ],
  );

  const handleSave = useCallback(
    async (data) => {
      const editingSetting = getModalState("config").data;

      if (!canCreate && !canUpdate) {
        const errorMsg = getDisabledMessage(
          editingSetting?.id ? "update" : "create",
        );
        showToast.error(errorMsg);

        throw new Error(errorMsg);
      }

      setIsSaving(true);
      try {
        const { fleetId, pairDtOp } = data;

        if (!fleetId) {
          throw new Error(VALIDATION_MESSAGES.INVALID_FLEET_ID);
        }

        if (!pairDtOp || pairDtOp.length === 0) {
          throw new Error(VALIDATION_MESSAGES.NO_UNITS_SELECTED);
        }

        const invalidPairs = pairDtOp.filter(
          (pair) => !pair.truckId || !pair.operatorId,
        );

        if (invalidPairs.length > 0) {
          throw new Error(
            TOAST_MESSAGES.ERROR.INVALID_PAIRS(invalidPairs.length),
          );
        }

        let result;
        if (editingSetting?.id) {
          result = await updateSetting(editingSetting.id, {
            pairDtOp,
          });
        } else {
          result = await createSetting({
            fleetId,
            pairDtOp,
          });
        }

        if (result?.success) {
          closeModal("config");
          await Promise.all([refreshFleet(), refreshDumptruck()]);
          showToast.success(
            editingSetting?.id
              ? TOAST_MESSAGES.SUCCESS.UPDATE
              : TOAST_MESSAGES.SUCCESS.SAVE,
          );

          return result;
        } else {
          throw new Error(result?.error || TOAST_MESSAGES.ERROR.SAVE_FAILED);
        }
      } catch (error) {
        console.error("Error in handleSave:", error);

        showToast.error(error.message || TOAST_MESSAGES.ERROR.SAVE_FAILED);

        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [
      getModalState,
      updateSetting,
      createSetting,
      refreshFleet,
      refreshDumptruck,
      canCreate,
      canUpdate,
      getDisabledMessage,
      closeModal,
    ],
  );

  const handleConfirmDelete = useCallback(async () => {
    const deleteTarget = getModalState("delete").data;

    if (!deleteTarget?.id) return;

    setIsSaving(true);
    try {
      await deleteSetting(deleteTarget.id);
      closeModal("delete");
      await Promise.all([refreshFleet(), refreshDumptruck()]);
      showToast.success(TOAST_MESSAGES.SUCCESS.DELETE);
    } catch (error) {
      showToast.error(TOAST_MESSAGES.ERROR.DELETE_FAILED);
    } finally {
      setIsSaving(false);
    }
  }, [
    getModalState,
    deleteSetting,
    refreshFleet,
    refreshDumptruck,
    closeModal,
  ]);

  const handleBulkDelete = useCallback(
    async (settingId, unitIds) => {
      if (!canUpdate) {
        showToast.error(getDisabledMessage("update"));
        return { success: false };
      }

      setIsSaving(true);

      try {
        if (!settingId) {
          throw new Error("Setting ID tidak valid");
        }

        if (!unitIds || unitIds.length === 0) {
          throw new Error("Tidak ada unit yang dipilih");
        }

        const latestSetting = await fetchLatestSettingData(settingId);

        if (!latestSetting) {
          throw new Error(
            "Setting tidak ditemukan. Data mungkin sudah berubah.",
          );
        }

        const currentUnits = latestSetting.units || [];

        const remainingUnits = currentUnits.filter(
          (unit) => !unitIds.includes(unit.id),
        );

        if (remainingUnits.length === 0) {
          throw new Error(
            "Tidak bisa menghapus semua unit. Minimal 1 unit harus tersisa atau hapus setting fleet.",
          );
        }

        const remainingPairDtOp = remainingUnits.map((unit) => ({
          truckId: parseInt(unit.id),
          operatorId: parseInt(unit.operatorId),
        }));

        const result = await updateSetting(settingId, {
          pairDtOp: remainingPairDtOp,
        });

        if (!result) {
          throw new Error("Tidak ada response dari server");
        }

        if (!result.success) {
          const errorMsg =
            result.error || result.message || "Gagal menghapus unit";
          throw new Error(errorMsg);
        }

        await Promise.all([refreshFleet(), refreshDumptruck()]);

        showToast.success(
          `Berhasil menghapus ${unitIds.length} unit dari fleet`,
        );

        return { success: true };
      } catch (error) {
        console.error("❌ Bulk delete error:", {
          message: error.message,
          response: error.response?.data,
          stack: error.stack,
        });

        const errorMessage =
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message ||
          "Gagal menghapus unit";

        showToast.error(errorMessage);

        return { success: false, error: errorMessage };
      } finally {
        setIsSaving(false);
      }
    },
    [
      canUpdate,
      getDisabledMessage,
      fetchLatestSettingData,
      updateSetting,
      refreshFleet,
      refreshDumptruck,
    ],
  );

  const handleViewUnits = useCallback(
    (fleet) => {
      if (!canRead) {
        showToast.error(getDisabledMessage("read"));
        return;
      }

      const existingSetting = dumptruckSettings.find(
        (s) => String(s.fleet?.id) === String(fleet.id),
      );

      if (existingSetting) {
        openModal("detail", existingSetting);
      }
    },
    [dumptruckSettings, canRead, getDisabledMessage, openModal],
  );

  const handleRefresh = useCallback(async () => {
    if (!canRead) {
      showToast.error(getDisabledMessage("read"));
      return;
    }

    await Promise.all([refreshFleet(), refreshDumptruck()]);

    showToast.success(TOAST_MESSAGES.SUCCESS.REFRESH);
  }, [refreshFleet, refreshDumptruck, canRead, getDisabledMessage]);

  const handleDetailModalRefresh = useCallback(async () => {
    await Promise.all([refreshFleet(), refreshDumptruck()]);
  }, [refreshFleet, refreshDumptruck]);

  if (!canRead) {
    return (
      <div className="space-y-6">
        <DumpTruckHeader
          userRole={userRole}
          userSatker={userSatker}
          isSatkerRestricted={isSatkerRestricted}
          onRefresh={handleRefresh}
          onAddNew={handleAddNewSetting}
          canCreate={false}
          canRead={false}
          isRefreshing={isRefreshing}
          shouldShowButton={shouldShowButton}
          getDisabledMessage={getDisabledMessage}
        />
        <DumpTruckAlerts
          canRead={false}
          hasFleets={false}
          isLoading={false}
          userRoleInfo={userRoleInfo}
          getDisabledMessage={getDisabledMessage}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen">
      <DumpTruckHeader
        userRole={userRole}
        userSatker={userSatker}
        isSatkerRestricted={isSatkerRestricted}
        onRefresh={handleRefresh}
        onAddNew={handleAddNewSetting}
        canCreate={canCreate}
        canRead={canRead}
        isRefreshing={isRefreshing}
        shouldShowButton={shouldShowButton}
        getDisabledMessage={getDisabledMessage}
      />

      <DumpTruckAlerts
        canRead={canRead}
        hasFleets={filteredFleetConfigs.length > 0}
        isLoading={isLoading}
        userRoleInfo={userRoleInfo}
        getDisabledMessage={getDisabledMessage}
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <DumpTruckFilters
              searchQuery={searchQuery}
              onSearchChange={updateSearch}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              filterExpanded={filterExpanded}
              onToggleFilter={() => setFilterExpanded(!filterExpanded)}
              filterGroups={filterGroups}
              mastersLoading={mastersLoading}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={resetFilters}
              canRead={canRead}
              canCreate={canCreate}
              shouldShowButton={shouldShowButton}
              onAddNew={handleAddNewSetting}
            />

            <DumpTruckTable
              fleets={filteredFleets}
              paginatedFleets={paginatedFleets}
              dumptruckSettings={dumptruckSettings}
              isLoading={isLoading && !isRefreshing}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={resetFilters}
              onViewUnits={canRead ? handleViewUnits : undefined}
              onInputUpdateSetting={
                canUpdate ? handleInputUpdateSetting : undefined
              }
              onDeleteSetting={canDeletePerm ? handleDeleteSetting : undefined}
              currentPage={currentPage}
              pageSize={
                totalPages > 0
                  ? Math.ceil(filteredFleets.length / totalPages)
                  : 10
              }
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              isHistoryMode={false}
              canUpdate={canUpdate}
              canDelete={canDeletePerm}
            />
          </div>
        </div>
      </div>

      {/* Modals */}

      {canUpdate && (
        <DumpTruckModal
          isOpen={getModalState("config").isOpen}
          onClose={() => closeModal("config")}
          editingSetting={getModalState("config").data}
          onSave={handleSave}
          availableFleets={filteredFleetConfigs}
          availableDumptruckSettings={dumptruckSettings}
        />
      )}

      {canRead && (
        <DumpTruckDetailModal
          isOpen={getModalState("detail").isOpen}
          onClose={() => closeModal("detail")}
          setting={getModalState("detail").data}
          availableFleets={filteredFleetConfigs}
          onMoveUnit={canUpdate ? handleMoveUnit : null}
          onBulkDelete={canUpdate ? handleBulkDelete : null}
          onRefresh={handleDetailModalRefresh}
        />
      )}

      {canDeletePerm && (
        <DeleteConfirmDialog
          isOpen={getModalState("delete").isOpen}
          onClose={() => {
            if (!isSaving) closeModal("delete");
          }}
          onConfirm={handleConfirmDelete}
          target={getModalState("delete").data}
          assignedCount={getModalState("delete").data?.units?.length || 0}
          isProcessing={isSaving}
        />
      )}

      <LoadingOverlay
        isVisible={isSaving}
        message={LOADING_MESSAGES.PROCESSING}
      />
    </div>
  );
};

export default DumpTruckManagement;
