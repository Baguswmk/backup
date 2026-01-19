import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { History, RotateCcw, Lock } from "lucide-react";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import useAuthStore from "@/modules/auth/store/authStore";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import FleetDetailModal from "@/modules/timbangan/fleet/components/FleetDetailModal";
import FleetTable from "@/modules/timbangan/fleet/components/FleetTable";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import TableToolbar from "@/shared/components/TableToolbar";
import { handleError } from "@/shared/utils/errorHandler";
import { showToast } from "@/shared/utils/toast";
import {
  DEBOUNCE_TIME,
  SEARCH_PLACEHOLDERS,
  TOAST_MESSAGES,
  FILTER_FIELDS,
} from "@/modules/timbangan/fleet/constant/fleetConstants";

const FleetHistory = ({ Type }) => {
  const { user } = useAuthStore();
  const permissions = useFleetPermissions();
  const measurementTypeMap = {
    Timbangan: "Timbangan",
    FOB: "FOB",
    Bypass: "Bypass",
    Beltscale: "Beltscale",
  };

  const measurementType = measurementTypeMap[Type] || "Timbangan";
  const {
    fleetConfigs,
    masters,
    mastersLoading,
    isLoading: fleetLoading,
    isRefreshing: fleetRefreshing,
    reactivateFleet,
    refresh: refreshFleet,
  } = useFleet(user ? { user, viewMode: "history" } : null, measurementType);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [configPage, setConfigPage] = useState(1);

  const [configSearchInput, setConfigSearchInput] = useState("");
  const configSearch = useDebouncedValue(configSearchInput, DEBOUNCE_TIME);

  const [isSaving, setIsSaving] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState(null);

  const [shifts, setShifts] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [workUnits, setWorkUnits] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState([]);
  const [dumpingLocations, setDumpingLocations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [weighBridges, setWeighBridges] = useState([]);

  const configPageSize = 10;
  const isConfigsLoading = fleetLoading && !fleetRefreshing;
  const isRefreshing = fleetRefreshing;

  const filteredByRole = useMemo(() => {
    let filtered = (fleetConfigs || []).filter((c) => c.status === "CLOSED");

    const role = user?.role?.toLowerCase();

    switch (role) {
      case "mitra":
      case "pengawas":
      case "checker":
        if (user?.company?.id) {
          filtered = filtered.filter(
            (c) => c.excavatorCompanyId === String(user.company.id),
          );
        }
        break;

      case "operator_jt":
        if (user?.weigh_bridge?.id) {
          filtered = filtered.filter(
            (c) => c.weightBridgeId === String(user.weigh_bridge.id),
          );
        }
        break;

      case "admin":
      case "pic":
      case "evaluator":
        if (user?.work_unit?.id) {
          filtered = filtered.filter(
            (c) => c.workUnitId === String(user.work_unit.id),
          );
        }
        break;

      case "super_admin":
        break;

      default:
        filtered = [];
    }

    return filtered;
  }, [fleetConfigs, user]);

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

  const companyOptions = useMemo(
    () =>
      (masters?.companies || []).map((comp) => ({
        value: String(comp.id),
        label: comp.name,
      })),
    [masters?.companies],
  );

  const filterGroups = useMemo(
    () => [
      {
        id: FILTER_FIELDS.EXCAVATOR,
        label: "Excavator",
        options: excavatorOptions,
        value: excavators,
        onChange: (newExcavators) => {
          setExcavators(newExcavators);
          setConfigPage(1);
        },
        placeholder: "Pilih Excavator",
      },
      {
        id: FILTER_FIELDS.WORK_UNIT,
        label: "Work Unit",
        options: workUnitOptions,
        value: workUnits,
        onChange: (newWorkUnits) => {
          setWorkUnits(newWorkUnits);
          setConfigPage(1);
        },
        placeholder: "Pilih Work Unit",
      },
      {
        id: FILTER_FIELDS.LOADING_LOCATION,
        label: "Loading Location",
        options: loadingLocOptions,
        value: loadingLocations,
        onChange: (newLoadingLocs) => {
          setLoadingLocations(newLoadingLocs);
          setConfigPage(1);
        },
        placeholder: "Pilih Loading",
      },
      {
        id: FILTER_FIELDS.DUMPING_LOCATION,
        label: "Dumping Location",
        options: dumpingLocOptions,
        value: dumpingLocations,
        onChange: (newDumpingLocs) => {
          setDumpingLocations(newDumpingLocs);
          setConfigPage(1);
        },
        placeholder: "Pilih Dumping",
      },
      {
        id: FILTER_FIELDS.COMPANY,
        label: "Company",
        options: companyOptions,
        value: companies,
        onChange: (newCompanies) => {
          setCompanies(newCompanies);
          setConfigPage(1);
        },
        placeholder: "Pilih Company",
      },
    ],
    [
      excavatorOptions,
      workUnitOptions,
      loadingLocOptions,
      dumpingLocOptions,
      companyOptions,
      excavators,
      workUnits,
      loadingLocations,
      dumpingLocations,
      companies,
    ],
  );

  const filteredConfigs = useMemo(() => {
    let filtered = filteredByRole;

    if (configSearch) {
      const search = configSearch.toLowerCase();
      filtered = filtered.filter(
        (config) =>
          config.excavator?.toLowerCase().includes(search) ||
          config.workUnit?.toLowerCase().includes(search),
      );
    }

    if (measurementType) {
      filtered = filtered.filter((c) => c.measurementType === measurementType);
    }

    if (excavators.length > 0) {
      filtered = filtered.filter((c) =>
        excavators.includes(String(c.excavatorId)),
      );
    }

    if (workUnits.length > 0) {
      filtered = filtered.filter((c) =>
        workUnits.includes(String(c.workUnitId)),
      );
    }

    if (loadingLocations.length > 0) {
      filtered = filtered.filter((c) =>
        loadingLocations.includes(String(c.loadingLocationId)),
      );
    }

    if (dumpingLocations.length > 0) {
      filtered = filtered.filter((c) =>
        dumpingLocations.includes(String(c.dumpingLocationId)),
      );
    }

    if (companies.length > 0) {
      filtered = filtered.filter((c) =>
        companies.includes(String(c.excavatorCompanyId)),
      );
    }

    if (weighBridges.length > 0) {
      filtered = filtered.filter((c) =>
        weighBridges.includes(String(c.weightBridgeId)),
      );
    }

    return filtered;
  }, [
    filteredByRole,
    configSearch,
    excavators,
    workUnits,
    measurementType,
    loadingLocations,
    dumpingLocations,
    companies,
    weighBridges,
  ]);

  const paginatedConfigs = useMemo(() => {
    const start = (configPage - 1) * configPageSize;
    return filteredConfigs.slice(start, start + configPageSize);
  }, [filteredConfigs, configPage]);

  const hasActiveFilters =
    configSearch ||
    excavators.length > 0 ||
    workUnits.length > 0 ||
    loadingLocations.length > 0 ||
    dumpingLocations.length > 0 ||
    companies.length > 0 ||
    weighBridges.length > 0;

  const handleResetFilters = useCallback(() => {
    setConfigSearchInput("");
    setExcavators([]);
    setWorkUnits([]);
    setLoadingLocations([]);
    setDumpingLocations([]);
    setCompanies([]);
    setWeighBridges([]);
    setConfigPage(1);

    refreshFleet({ dateRange: null });
  }, [refreshFleet]);

  const handleViewConfig = useCallback((config) => {
    setSelectedConfig(config);
    setShowDetailModal(true);
  }, []);

  const handleReactivate = useCallback(
    (config) => {
      if (!permissions.canUpdate) {
        showToast.error(permissions.getDisabledMessage("update"));
        return;
      }
      setReactivateTarget(config);
      setShowReactivateDialog(true);
    },
    [permissions],
  );

  const handleConfirmReactivate = useCallback(async () => {
    if (!reactivateTarget || isSaving) return;

    if (!permissions.canUpdate) {
      showToast.error(permissions.getDisabledMessage("update"));
      return;
    }

    setIsSaving(true);
    try {
      const result = await reactivateFleet(reactivateTarget.id, "ACTIVE");

      if (result?.success) {
        setShowReactivateDialog(false);
        setReactivateTarget(null);
      } else {
        handleError(result?.error || TOAST_MESSAGES.ERROR.REACTIVATE_FAILED, {
          operation: "reactivate fleet",
        });
      }
    } catch (error) {
      handleError(error, {
        operation: "reactivate fleet",
        defaultMessage: TOAST_MESSAGES.ERROR.REACTIVATE_FAILED,
      });
    } finally {
      setIsSaving(false);
    }
  }, [reactivateTarget, isSaving, reactivateFleet, permissions]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshFleet();
      showToast.success(TOAST_MESSAGES.SUCCESS.REFRESH);
    } catch (e) {
      handleError(e, {
        operation: "refresh",
        defaultMessage: TOAST_MESSAGES.ERROR.REFRESH_FAILED,
      });
    }
  }, [refreshFleet]);

  const canShowReactivateButton = permissions.canUpdate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <History className="w-6 h-6" />
            Riwayat Fleet - {Type}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Menampilkan fleet dengan status CLOSED
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className="text-xs dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
            >
              <Lock className="w-3 h-3 mr-1" />
              {permissions.userRole}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {permissions.roleDescription}
            </span>
          </div>
        </div>
      </div>

      {/* Read Only Alert */}
      {/* {!permissions.canUpdate && (
        <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription>
            <p className="text-sm text-orange-900 dark:text-orange-300">
              <strong>Mode Baca Saja:</strong> Anda hanya dapat melihat riwayat
              fleet. Fitur reaktivasi tidak tersedia untuk role{" "}
              {permissions.userRole}.
            </p>
          </AlertDescription>
        </Alert>
      )} */}

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:border-gray-700">
        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <TableToolbar
              activeDateRange={false}
              searchQuery={configSearchInput}
              onSearchChange={(value) => {
                setConfigSearchInput(value);
                setConfigPage(1);
              }}
              searchPlaceholder={SEARCH_PLACEHOLDERS.FLEET}
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

            <FleetTable
              configs={filteredConfigs}
              isRefreshing={isRefreshing}
              isSaving={isSaving}
              paginatedConfigs={paginatedConfigs}
              isLoading={isConfigsLoading}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={handleResetFilters}
              onViewConfig={handleViewConfig}
              onReactivate={canShowReactivateButton ? handleReactivate : null}
              currentPage={configPage}
              pageSize={configPageSize}
              totalPages={Math.ceil(filteredConfigs.length / configPageSize)}
              onPageChange={setConfigPage}
              isHistoryMode={true}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <FleetDetailModal
        isOpen={showDetailModal}
        config={selectedConfig}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedConfig(null);
        }}
        onEdit={null}
        readOnly={true}
      />

      {canShowReactivateButton && (
        <ConfirmDialog
          isOpen={showReactivateDialog}
          onClose={() => {
            if (isSaving) return;
            setShowReactivateDialog(false);
            setReactivateTarget(null);
          }}
          onConfirm={handleConfirmReactivate}
          title="Reaktivasi Fleet"
          description="Apakah Anda yakin ingin mereaktivasi fleet ini? Fleet akan diaktifkan kembali dengan status INACTIVE."
          confirmLabel="Reaktivasi"
          isProcessing={isSaving}
          icon={RotateCcw}
        >
          {reactivateTarget && (
            <div className="rounded-md border p-3 text-sm space-y-1 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Fleet:</span>
                <span className="font-medium dark:text-gray-200">
                  {reactivateTarget.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Excavator:
                </span>
                <span className="font-medium dark:text-gray-200">
                  {reactivateTarget.excavator}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Status:
                </span>
                <span className="font-medium dark:text-gray-200">
                  CLOSED → ACTIVE
                </span>
              </div>
            </div>
          )}
        </ConfirmDialog>
      )}

      <LoadingOverlay isVisible={isSaving} message="Memproses reaktivasi..." />
    </div>
  );
};

export default FleetHistory;
