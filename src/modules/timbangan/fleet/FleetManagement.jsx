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
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import FleetHeader from "@/modules/timbangan/fleet/components/FleetHeader";
import FleetSelectionAlert from "@/modules/timbangan/fleet/components/FleetSelectionAlert";
import FleetFilterSection from "@/modules/timbangan/fleet/components/FleetFilterSection";
import FleetTableContainer from "@/modules/timbangan/fleet/components/FleetTableContainer";
import FleetModalsManager from "@/modules/timbangan/fleet/components/FleetModalsManager";
import InformationDays from "@/modules/timbangan/fleet/components/InformationDays";
import FleetSettingTable from "@/modules/timbangan/fleet/components/FleetSettingTable";
import MMCTAdditionalSections from "@/modules/timbangan/fleet/components/MMCTAdditionalSections";
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
import { useFleetSplit } from "./hooks/useFleetSplit";
import { logger } from "@/shared/services/log";

const EMPTY_ARRAY = [];
const PAGE_SIZE = 10;

const FleetManagement = ({ Type }) => {
  const { user } = useAuthStore();
  const { handleCreateSplitFleets } = useFleetSplit(user);
  const [deleteActionType, setDeleteActionType] = useState("delete");

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

  // Get master data for dropdowns
  const { workUnits, isLoading: masterDataLoading } = useMasterData(null);

  // State for Information Days
  const [selectedSatker, setSelectedSatker] = useState("");
  const [selectedUrutkan, setSelectedUrutkan] = useState("");
  const [showSplitModal, setShowSplitModal] = useState(false);
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
    mastersLoading,
    deleteConfig,
    refresh: refreshFleet,
  } = useFleet(user ? { user } : null, measurementType);

  // ✅ UPDATED: Use hooks with refetch callback
  const {
    handleSaveFleet,
    handleBulkEditFleets,
    handleBulkDeleteFleets,
    isSaving: isSavingTransfer,
  } = useFleetWithTransfer(user, refreshFleet);

  const [configSearchInput, setConfigSearchInput] = useState("");
  const configSearch = useDebouncedValue(configSearchInput, DEBOUNCE_TIME);
  const [isSaving, setIsSaving] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [pageSize, setPageSize] = useState(10); // Added pageSize state

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

  // Filter fleet data by selected satker
  const filteredFleetData = useMemo(() => {
    if (!selectedSatker) return [];

    return fleetConfigsByType.filter(
      (config) => config.workUnit === selectedSatker,
    );
  }, [fleetConfigsByType, selectedSatker]);

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
    const start = (configPage - 1) * pageSize;
    return finalFilteredConfigs.slice(start, start + pageSize);
  }, [finalFilteredConfigs, configPage, pageSize]);

  const totalPages = useMemo(() => {
    if (finalFilteredConfigs.length === 0) return 1;
    const calculated = Math.ceil(finalFilteredConfigs.length / pageSize);

    return calculated;
  }, [finalFilteredConfigs.length, pageSize]);

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

  const getFleetDumptruckList = useCallback((fleet) => {
    if (!fleet) return [];

    // If fleet is an array, it's a split group
    if (Array.isArray(fleet)) {
      // Aggregate all units from all fleets in the split group
      return fleet.reduce((acc, f) => {
        const units = f.units || [];
        return [...acc, ...units];
      }, []);
    }

    // Single fleet
    return fleet.units || [];
  }, []);

  const filterOptions = useMemo(() => {
    const excavatorsSet = new Set();
    const workUnitsSet = new Set();
    const loadingLocationsSet = new Set();
    const dumpingLocationsSet = new Set();

    fleetConfigsByType.forEach((config) => {
      if (config.excavator && config.excavatorId) {
        excavatorsSet.add(
          JSON.stringify({ id: config.excavatorId, label: config.excavator }),
        );
      }
      if (config.workUnit && config.workUnitId) {
        workUnitsSet.add(
          JSON.stringify({ id: config.workUnitId, label: config.workUnit }),
        );
      }
      if (config.loadingLocation && config.loadingLocationId) {
        loadingLocationsSet.add(
          JSON.stringify({
            id: config.loadingLocationId,
            label: config.loadingLocation,
          }),
        );
      }
      if (config.dumpingLocation && config.dumpingLocationId) {
        dumpingLocationsSet.add(
          JSON.stringify({
            id: config.dumpingLocationId,
            label: config.dumpingLocation,
          }),
        );
      }
    });

    return {
      excavators: Array.from(excavatorsSet)
        .map((s) => JSON.parse(s))
        .sort((a, b) => a.label.localeCompare(b.label)),
      workUnits: Array.from(workUnitsSet)
        .map((s) => JSON.parse(s))
        .sort((a, b) => a.label.localeCompare(b.label)),
      loadingLocations: Array.from(loadingLocationsSet)
        .map((s) => JSON.parse(s))
        .sort((a, b) => a.label.localeCompare(b.label)),
      dumpingLocations: Array.from(dumpingLocationsSet)
        .map((s) => JSON.parse(s))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [fleetConfigsByType]);

  const fleetCounts = useMemo(() => {
    const totalCount = selectedFleetIds?.length || 0;
    const timbanganCount = selectedFleetIds?.filter((id) => {
      const fleet = allFleetConfigs.find((c) => c.id === id);
      return fleet?.measurementType === "Timbangan";
    }).length;

    return {
      total: totalCount,
      timbangan: timbanganCount || 0,
    };
  }, [selectedFleetIds, allFleetConfigs]);

  const filterGroups = useMemo(() => {
    const groups = [];

    if (filterOptions.excavators.length > 0) {
      groups.push({
        id: "excavators",
        label: "Excavators",
        options: filterOptions.excavators,
        value: activeFilters.excavators || [],
        onChange: (value) => updateFilter("excavators", value),
      });
    }

    if (filterOptions.workUnits.length > 0) {
      groups.push({
        id: "workUnits",
        label: "Work Units",
        options: filterOptions.workUnits,
        value: activeFilters.workUnits || [],
        onChange: (value) => updateFilter("workUnits", value),
      });
    }

    if (filterOptions.loadingLocations.length > 0) {
      groups.push({
        id: "loadingLocations",
        label: "Loading Locations",
        options: filterOptions.loadingLocations,
        value: activeFilters.loadingLocations || [],
        onChange: (value) => updateFilter("loadingLocations", value),
      });
    }

    if (filterOptions.dumpingLocations.length > 0) {
      groups.push({
        id: "dumpingLocations",
        label: "Dumping Locations",
        options: filterOptions.dumpingLocations,
        value: activeFilters.dumpingLocations || [],
        onChange: (value) => updateFilter("dumpingLocations", value),
      });
    }

    return groups;
  }, [filterOptions, activeFilters, updateFilter]);

  const handleResetFilters = useCallback(() => {
    setConfigSearchInput("");
    resetFilters();
    setConfigPage(1);
  }, [resetFilters, setConfigPage]);

  const handleCreateConfig = useCallback(() => {
    if (!canCreate) {
      showToast.error(getDisabledMessage("create"));
      return;
    }

    if (isReadOnly) {
      showToast.error("Tidak dapat membuat konfigurasi dalam mode read-only");
      return;
    }

    openModal("config", null);
  }, [canCreate, isReadOnly, getDisabledMessage, openModal]);

  const handleRefresh = useCallback(async () => {
    await refreshFleet();
  }, [refreshFleet]);

  const handleSaveConfig = useCallback(
    async (config, transferInfo) => {
      // ✅ FIX: If no config provided (e.g., from FleetModal's onSave callback after create),
      // just refresh the fleet data
      if (!config) {
        await refreshFleet();
        return;
      }

      if (config.id) {
        if (!canUpdate) {
          showToast.error(getDisabledMessage("update"));
          return;
        }

        if (isReadOnly) {
          showToast.error("Tidak dapat update dalam mode read-only");
          return;
        }

        if (!checkDataAccess(config)) {
          showToast.error("Anda tidak memiliki akses untuk update fleet ini");
          return;
        }
      } else {
        if (!canCreate) {
          showToast.error(getDisabledMessage("create"));
          return;
        }

        if (isReadOnly) {
          showToast.error("Tidak dapat create dalam mode read-only");
          return;
        }
      }

      setIsSaving(true);
      return withErrorHandling(
        async () => {
          const result = await handleSaveFleet(
            config,
            transferInfo,
            config.id ? "update" : "create",
          );

          validateResponse(result, {
            operation: config.id ? "update" : "create",
            entityName: "Fleet",
          });

          closeModal("config");
          await refreshFleet();

          showToast.success(
            config.id
              ? TOAST_MESSAGES.UPDATE_SUCCESS
              : TOAST_MESSAGES.CREATE_SUCCESS,
          );

          return result;
        },
        {
          operation: config.id ? "update" : "create",
          defaultMessage: config.id
            ? "Gagal update konfigurasi fleet"
            : "Gagal membuat konfigurasi fleet",
        },
      ).finally(() => {
        setIsSaving(false);
      });
    },
    [
      canUpdate,
      canCreate,
      isReadOnly,
      checkDataAccess,
      getDisabledMessage,
      handleSaveFleet,
      closeModal,
      refreshFleet,
    ],
  );

  const handleViewConfig = useCallback(
    (config) => {
      openModal("detail", config);
    },
    [openModal],
  );

  const handleEditConfig = useCallback(
    (config) => {
      if (!canUpdate) {
        showToast.error(getDisabledMessage("update"));
        return;
      }

      if (isReadOnly) {
        showToast.error("Tidak dapat mengedit dalam mode read-only");
        return;
      }

      if (!checkDataAccess(config)) {
        showToast.error("Anda tidak memiliki akses untuk mengedit fleet ini");
        return;
      }

      // ✅ FIX: Group split fleets by isSplit + excavatorId + loadingLocationId
      let fleetsToEdit = config;

      if (config.isSplit) {
        const relatedFleets = fleetConfigs.filter(
          (fleet) =>
            fleet.isSplit === true &&
            fleet.excavatorId === config.excavatorId &&
            fleet.loadingLocationId === config.loadingLocationId,
        );

        if (relatedFleets.length > 0) {
          fleetsToEdit = relatedFleets;
        } else {
          console.warn(
            "⚠️ No related split fleets found, editing single fleet",
          );
        }
      }

      openModal("config", fleetsToEdit);
    },
    [
      canUpdate,
      isReadOnly,
      checkDataAccess,
      getDisabledMessage,
      openModal,
      fleetConfigs,
    ],
  );

  const handleDeleteConfig = useCallback(
    (config) => {
      if (!canDeletePerm) {
        showToast.error(getDisabledMessage("delete"));
        return;
      }

      if (isReadOnly) {
        showToast.error("Tidak dapat menghapus dalam mode read-only");
        return;
      }

      if (!checkDataAccess(config)) {
        showToast.error("Anda tidak memiliki akses untuk menghapus fleet ini");
        return;
      }

      openModal("delete", config);
    },
    [canDeletePerm, isReadOnly, checkDataAccess, getDisabledMessage, openModal],
  );

  /**
   * ✅ UPDATED: Handle confirm delete dengan support untuk bulk delete via hooks
   */
  const handleConfirmDelete = useCallback(
    async (reasons) => {
      const deleteData = getModalState("delete").data;

      if (!deleteData) {
        console.error("No delete data found");
        return { success: false };
      }

      setIsSaving(true);

      return withErrorHandling(
        async () => {
          // ✅ Handle split group deletion using BULK DELETE
          if (Array.isArray(deleteData)) {
            logger.info("🔀 Deleting split group via BULK endpoint", {
              fleetsCount: deleteData.length,
              fleetIds: deleteData.map((f) => f.id),
            });

            const fleetIds = deleteData.map((f) => f.id);
            const result = await handleBulkDeleteFleets(fleetIds);

            if (result.success) {
              closeModal("delete");
              setDeleteActionType("delete");
              // Refresh sudah dipanggil di dalam handleBulkDeleteFleets
              // await refreshFleet();

              return result;
            } else {
              throw new Error(result.error || "Gagal delete fleet group");
            }
          }

          // Handle single fleet deletion
          const result = await deleteConfig(deleteData.id);

          validateResponse(result, {
            operation: "delete",
            entityName: "Fleet",
          });

          closeModal("delete");
          setDeleteActionType("delete");
          await refreshFleet();
          showToast.success(TOAST_MESSAGES.DELETE_SUCCESS);

          return result;
        },
        {
          operation: "delete",
          defaultMessage: "Gagal menghapus konfigurasi fleet",
        },
      ).finally(() => {
        setIsSaving(false);
      });
    },
    [
      deleteConfig,
      refreshFleet,
      closeModal,
      getModalState,
      handleBulkDeleteFleets,
    ],
  );

  const handleSaveFleetSelection = useCallback(
    async (selectedIds) => {
      setIsSaving(true);
      return withErrorHandling(
        async () => {
          setSelectedFleets(selectedIds);
          closeModal("fleetSelection");
          await refreshFleet();

          showToast.success("Pemilihan fleet berhasil disimpan");

          return { success: true };
        },
        {
          operation: "save fleet selection",
          defaultMessage: "Gagal menyimpan pemilihan fleet",
        },
      ).finally(() => {
        setIsSaving(false);
      });
    },
    [setSelectedFleets, closeModal, refreshFleet],
  );

  /**
   * ✅ UPDATED: Handle bulk delete menggunakan hooks
   */
  const handleBulkDelete = useCallback(
    async (configIds) => {
      if (!canDeletePerm) {
        showToast.error(getDisabledMessage("delete"));
        return;
      }

      if (isReadOnly) {
        showToast.error("Tidak dapat menghapus dalam mode read-only");
        return;
      }

      // Validate access for all configs
      const invalidConfigs = [];
      for (const id of configIds) {
        const config = fleetConfigsByType.find((c) => c.id === id);
        if (!config) {
          invalidConfigs.push({ id, reason: "Config not found" });
          continue;
        }
        if (!checkDataAccess(config)) {
          invalidConfigs.push({ id, reason: "Access denied" });
        }
      }

      if (invalidConfigs.length > 0) {
        logger.error("❌ Some configs failed validation", { invalidConfigs });
        showToast.error(
          `Tidak dapat menghapus ${invalidConfigs.length} fleet karena akses ditolak`,
        );
        return;
      }

      setIsSaving(true);
      return withErrorHandling(
        async () => {
          logger.info("🗑️ Bulk deleting fleets via hook", {
            count: configIds.length,
          });

          const result = await handleBulkDeleteFleets(configIds);

          // Refresh sudah dipanggil di dalam handleBulkDeleteFleets
          // await refreshFleet();

          return result;
        },
        {
          operation: "bulk delete",
          defaultMessage: "Gagal menghapus fleet",
        },
      ).finally(() => {
        setIsSaving(false);
      });
    },
    [
      canDeletePerm,
      isReadOnly,
      checkDataAccess,
      getDisabledMessage,
      handleBulkDeleteFleets,
      fleetConfigsByType,
    ],
  );

  // Handlers for Information Days
  const handleSatkerChange = useCallback((satker) => {
    setSelectedSatker(satker);
    setSelectedUrutkan(""); // Reset urutkan when satker changes
  }, []);

  const handleUrutkanChange = useCallback((urutkan) => {
    setSelectedUrutkan(urutkan);
  }, []);

  // Handlers for Fleet Setting Table Actions
  const handleViewFleetSetting = useCallback(
    (fleet) => {
      // Open detail modal with fleet data
      openModal("detail", fleet);
    },
    [openModal],
  );

  /**
   * ✅ UPDATED: Handle edit fleet setting dengan support untuk bulk edit
   */
  const handleEditFleetSetting = useCallback(
    (fleet) => {
      if (!canUpdate) {
        showToast.error(getDisabledMessage("update"));
        return;
      }

      if (isReadOnly) {
        showToast.error("Tidak dapat mengedit dalam mode read-only");
        return;
      }

      // ✅ Check if it's a split/merged group (array) or single fleet
      const isSplitGroup = Array.isArray(fleet);

      if (isSplitGroup) {
        // Validate access for all fleets in the group
        const hasAccessToAll = fleet.every((f) => checkDataAccess(f));

        if (!hasAccessToAll) {
          showToast.error(
            "Anda tidak memiliki akses untuk mengedit salah satu atau lebih fleet dalam grup ini",
          );
          return;
        }

        logger.info("✏️ Editing split/merged group", {
          fleetsCount: fleet.length,
          fleetIds: fleet.map((f) => f.id),
        });
      } else {
        // Single fleet
        if (!checkDataAccess(fleet)) {
          showToast.error("Anda tidak memiliki akses untuk mengedit fleet ini");
          return;
        }

        logger.info("✏️ Editing single fleet", {
          fleetId: fleet.id,
        });
      }

      // Open modal with fleet data (can be single or array)
      openModal("config", fleet);
    },
    [canUpdate, isReadOnly, checkDataAccess, getDisabledMessage, openModal],
  );

  /**
   * ✅ UPDATED: Handle delete fleet setting dengan bulk delete support
   */
  const handleDeleteFleetSetting = useCallback(
    (fleet) => {
      if (!canDeletePerm) {
        showToast.error(getDisabledMessage("delete"));
        return;
      }

      if (isReadOnly) {
        showToast.error("Tidak dapat menghapus dalam mode read-only");
        return;
      }

      // ✅ Detect if fleet is split group (array) or single fleet
      const isSplitGroup = Array.isArray(fleet);

      if (isSplitGroup) {
        // Validate access for all fleets in the group
        const hasAccessToAll = fleet.every((f) => checkDataAccess(f));

        if (!hasAccessToAll) {
          showToast.error(
            "Anda tidak memiliki akses untuk menghapus salah satu atau lebih fleet dalam grup ini",
          );
          return;
        }

        logger.info("🗑️ Preparing to delete split/merged group", {
          fleetsCount: fleet.length,
          fleetIds: fleet.map((f) => f.id),
        });

        // Set action type to delete-split-group
        setDeleteActionType("delete-split-group");
      } else {
        // Single fleet deletion
        if (!checkDataAccess(fleet)) {
          showToast.error(
            "Anda tidak memiliki akses untuk menghapus fleet ini",
          );
          return;
        }

        logger.info("🗑️ Preparing to delete single fleet", {
          fleetId: fleet.id,
        });

        // Set action type to delete
        setDeleteActionType("delete");
      }

      openModal("delete", fleet);
    },
    [canDeletePerm, isReadOnly, checkDataAccess, getDisabledMessage, openModal],
  );

  const handleOpenSplitModal = (fleet) => setShowSplitModal(true);

  const handleCloseSplitModal = () => {
    setShowSplitModal(false);
  };

  const handleSaveSplit = async (splitData) => {
    const result = await handleCreateSplitFleets(splitData);
    if (result.success) {
      handleCloseSplitModal();
      // Refresh fleet data after successful split
      await refreshFleet();
    }
    return result;
  };

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
          onRefresh={handleRefresh}
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
      {/* 1. Fleet Header */}
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
        fleetData={finalFilteredConfigs}
        masters={masters}
        mastersLoading={mastersLoading}
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
              satker tidak ditemukan pada akun Anda. Silakan hubungi admin untuk
              mengatur work unit Anda.
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

      {/* 2. Information Days - NEW */}
      <InformationDays
        selectedSatker={selectedSatker}
        selectedUrutkan={selectedUrutkan}
        onSatkerChange={handleSatkerChange}
        onUrutkanChange={handleUrutkanChange}
        workUnits={workUnits}
      />

      {/* 3. Fleet Setting Table - NEW */}
      <FleetSettingTable
        fleetData={finalFilteredConfigs}
        selectedSatker={selectedSatker}
        selectedUrutkan={selectedUrutkan}
        onSplitFleet={handleOpenSplitModal}
        isLoading={isConfigsLoading || masterDataLoading}
        onViewFleet={handleViewFleetSetting}
        onEditFleet={!isReadOnly ? handleEditFleetSetting : undefined}
        onDeleteFleet={!isReadOnly ? handleDeleteFleetSetting : undefined}
        itemsPerPage={pageSize}
        onItemsPerPageChange={setPageSize}
      />

      {/* 4. MMCT Additional Sections - Only shown when MMCT is selected */}
      <MMCTAdditionalSections
        selectedSatker={selectedSatker}
        fleetData={filteredFleetData}
      />

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
          if (!isSaving) {
            closeModal("delete");
            setDeleteActionType("delete"); // Reset action type when closing
          }
        }}
        onConfirmDelete={handleConfirmDelete}
        deleteTarget={getModalState("delete").data}
        getDumptruckCount={getFleetDumptruckCount}
        isSaving={isSaving}
        availableDumptruckSettings={fleetConfigs}
        showSplitModal={showSplitModal}
        onCloseSplitModal={handleCloseSplitModal}
        onSaveSplit={handleSaveSplit}
        deleteActionType={deleteActionType}
      />
    </div>
  );
};

export default FleetManagement;
