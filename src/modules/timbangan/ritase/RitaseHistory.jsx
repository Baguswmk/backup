import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { X } from "lucide-react";

import RitaseHistoryHeader from "@/modules/timbangan/ritase/components/RitaseHistoryHeader";
import AggregatedRitase from "@/modules/timbangan/ritase/components/AggregatedRitase";
import RitaseList from "@/modules/timbangan/ritase/components/RitaseList";
import RitaseSummary from "@/modules/timbangan/ritase/components/RitaseSummary";

import RitaseInputModal from "@/modules/timbangan/ritase/components/RitaseInputModal";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";
import { ritaseServices } from "@/modules/timbangan/ritase/services/ritaseServices";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import {
  TOAST_MESSAGES,
  USER_ROLES,
} from "@/modules/timbangan/ritase/constant/ritaseConstants";

const RitaseHistory = () => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  const { refreshAllMasterData, isRefreshingMasterData } = useMasterData();

  const error = useRitaseStore((state) => state.error);
  const fleetConfigs = useRitaseStore((state) => state.fleetConfigs);
  const clearError = useRitaseStore((state) => state.clearError);
  const loadRitaseDataFromAPI = useRitaseStore(
    (state) => state.loadRitaseDataFromAPI,
  );
  const loadFleetConfigsFromAPI = useRitaseStore(
    (state) => state.loadFleetConfigsFromAPI,
  );
  const bulkApproveRitase = useRitaseStore(
    (state) => state.bulkApproveRitase,
  );

  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [currentRitasePage, setCurrentRitasePage] = useState(1);
  const [_, setCurrentFleetPage] = useState(1);
  const [currentAggregatedPage, setCurrentAggregatedPage] = useState(1);
  const refreshButtonRef = useRef(null);
  const [summaryData, setSummaryData] = useState({
    summaries: [],
    ritases: [],
    coal_flow: [],
  });

  // ✅ Set initial state sebagai null agar user harus pilih dulu
  const [currentDateRange, setCurrentDateRange] = useState({
    from: null,
    to: null,
  });
  const [viewingShift, setViewingShift] = useState(null);

  // Ref untuk selalu punya akses ke params terbaru (hindari stale closure)
  const latestParamsRef = useRef({
    dateRange: { from: null, to: null },
    shift: null,
  });

  const [selectedFleetCompanies] = useState([]);
  const [selectedFleetLoadingPoints] = useState([]);
  const [selectedFleetDumpingPoints] = useState([]);

  const [isRitaseFilterExpanded, setIsRitaseFilterExpanded] = useState(false);
  const [selectedRitaseCompanies, setSelectedRitaseCompanies] = useState([]);
  const [selectedRitaseLoadingPoints, setSelectedRitaseLoadingPoints] =
    useState([]);
  const [selectedRitaseDumpingPoints, setSelectedRitaseDumpingPoints] =
    useState([]);
  const [selectedRitaseExcavators, setSelectedRitaseExcavators] = useState([]);

  const handleDateRangeChange = useCallback((payload) => {
    const newDateRange = {
      from: payload.from || payload.startDate,
      to: payload.to || payload.endDate,
    };
    const newShift = payload.shift;

    setCurrentDateRange(newDateRange);
    setViewingShift(newShift);

    // Update ref agar handleRefreshAfterEdit selalu punya params terbaru
    latestParamsRef.current = { dateRange: newDateRange, shift: newShift };

    // ✅ Auto load data setelah user pilih tanggal & shift
    loadSummaryDataWithParams({
      dateRange: newDateRange,
      shift: newShift,
    });
  }, []);

  const loadSummaryDataWithParams = useCallback(
    async ({ dateRange, shift }) => {
      if (!dateRange.from || !dateRange.to) {
        showToast.error("Silakan pilih tanggal terlebih dahulu");
        return;
      }

      setIsInitialLoading(true);

      try {
        const result = await ritaseServices.fetchSummaryFleetByRitases({
          user,
          dateRange: dateRange,
          shift: shift,
          forceRefresh: true,
        });

        if (result.success) {
          setSummaryData(result.data);

          const totalRecords = result.data.ritases?.length || 0;

          if (totalRecords === 0) {
            showToast.info("Tidak ada data untuk periode yang dipilih");
          } else {
            showToast.success(`Ditemukan ${totalRecords} record ritase`);
          }
        } else {
          console.error("❌ Failed to load history:", result.error);
          showToast.error(result.error || "Gagal memuat data history");
          setSummaryData({ summaries: [], ritases: [], coal_flow: [] });
        }
      } catch (error) {
        showToast.error("Gagal memuat data history");
        setSummaryData({ summaries: [], ritases: [], coal_flow: [] });
      } finally {
        setIsInitialLoading(false);
      }
    },
    [user, currentDateRange, viewingShift],
  );

  const hasMounted = useRef(false);
  const mountCount = useRef(0);

  const isCCR = userRole === USER_ROLES.CCR;
  const isOperatorJT = userRole === USER_ROLES.OPERATOR_JT;

  const loadSummaryData = useCallback(
    async (forceRefresh = false) => {
      if (!currentDateRange.from || !currentDateRange.to || !viewingShift) {
        return { summaries: [], ritases: [], coal_flow: [] };
      }

      try {
        const result = await ritaseServices.fetchSummaryFleetByRitases({
          user,
          dateRange: currentDateRange,
          shift: viewingShift,
          forceRefresh,
        });

        if (result.success) {
          setSummaryData({ ...result.data }); // Creating new object reference explicitly
          return result.data;
        } else {
          console.error("❌ Failed to load summary data:", result.error);
          showToast.error(result.error || "Gagal memuat data summary");
          return { summaries: [], ritases: [], coal_flow: [] };
        }
      } catch (error) {
        console.error("❌ Error loading summary data:", error);
        showToast.error("Gagal memuat data summary");
        return { summaries: [], ritases: [], coal_flow: [] };
      }
    },
    [user, currentDateRange, viewingShift],
  );


  // ✅ HANYA load fleet configs saat mount, TIDAK load summary data
  useEffect(() => {
    mountCount.current += 1;
    const currentMount = mountCount.current;

    hasMounted.current && currentMount > 2;

    if (hasMounted.current && currentMount === 2) {
      return;
    }

    hasMounted.current = true;

    const initializeData = async () => {
      try {
        await loadFleetConfigsFromAPI(false, null);
      } catch (error) {
        console.error("⚠️ Initial load error:", error);
        showToast.error("Gagal memuat konfigurasi fleet");
      }
    };

    initializeData();
  }, [loadFleetConfigsFromAPI]);

  const filteredFleetConfigs = useMemo(() => {
    let filtered = fleetConfigs;

    if (userRole === USER_ROLES.OPERATOR_JT) {
      filtered = filtered.filter((fleet) => {
        const isTimbangan = fleet.measurementType === "Timbangan";

        const checker =
          fleet.checker ||
          fleet.fleet_checker ||
          fleet.checkerId ||
          fleet.checker_name;
        const normalizedChecker = String(checker || "")
          .toLowerCase()
          .trim();
        const normalizedUsername = String(user?.username || "")
          .toLowerCase()
          .trim();
        const normalizedUserId = String(user?.id || "")
          .toLowerCase()
          .trim();

        const isAssignedChecker =
          normalizedChecker === normalizedUsername ||
          normalizedChecker === normalizedUserId;

        const shouldInclude = isTimbangan && isAssignedChecker;

        return shouldInclude;
      });
    }

    if (selectedFleetCompanies.length > 0) {
      filtered = filtered.filter((fleet) => {
        const company =
          fleet.excavatorCompany || fleet.excavator_company || fleet.company;
        return selectedFleetCompanies.includes(company);
      });
    }

    if (selectedFleetLoadingPoints.length > 0) {
      filtered = filtered.filter((fleet) =>
        selectedFleetLoadingPoints.includes(fleet.loadingLocation),
      );
    }

    if (selectedFleetDumpingPoints.length > 0) {
      filtered = filtered.filter((fleet) =>
        selectedFleetDumpingPoints.includes(fleet.dumpingLocation),
      );
    }

    return filtered;
  }, [
    fleetConfigs,
    userRole,
    user,
    selectedFleetCompanies,
    selectedFleetLoadingPoints,
    selectedFleetDumpingPoints,
  ]);

  const filteredRitaseData = useMemo(() => {
    let filtered = summaryData.ritases || [];

    if (selectedRitaseExcavators.length > 0) {
      filtered = filtered.filter((r) =>
        selectedRitaseExcavators.includes(r.unit_exca),
      );
    }

    if (selectedRitaseCompanies.length > 0) {
      filtered = filtered.filter((r) =>
        selectedRitaseCompanies.includes(r.company),
      );
    }

    if (selectedRitaseLoadingPoints.length > 0) {
      filtered = filtered.filter((r) =>
        selectedRitaseLoadingPoints.includes(r.loading_location),
      );
    }

    if (selectedRitaseDumpingPoints.length > 0) {
      filtered = filtered.filter((r) =>
        selectedRitaseDumpingPoints.includes(r.dumping_location),
      );
    }

    return filtered;
  }, [
    summaryData.ritases,
    selectedRitaseExcavators,
    selectedRitaseCompanies,
    selectedRitaseLoadingPoints,
    selectedRitaseDumpingPoints,
  ]);

  const aggregatedRitaseData = useMemo(() => {
    if (!summaryData.summaries || summaryData.summaries.length === 0) {
      return [];
    }

    return summaryData.summaries.data.map((summary) => {
      const relevantRitases = summaryData.ritases.filter(
        (r) =>
          r.unit_exca === summary.unit_exca &&
          r.loading_location === summary.loading_location &&
          r.dumping_location === summary.dumping_location,
      );

      return {
        ...summary,
        ritases: relevantRitases,
      };
    });
  }, [summaryData]);

  const ritaseFilterOptions = useMemo(() => {
    const excavators = [
      ...new Set(
        (summaryData.ritases || []).map((r) => r.unit_exca).filter(Boolean),
      ),
    ].sort();

    const companies = [
      ...new Set(
        (summaryData.ritases || []).map((r) => r.company).filter(Boolean),
      ),
    ].sort();

    const loadingPoints = [
      ...new Set(
        (summaryData.ritases || [])
          .map((r) => r.loading_location)
          .filter(Boolean),
      ),
    ].sort();

    const dumpingPoints = [
      ...new Set(
        (summaryData.ritases || [])
          .map((r) => r.dumping_location)
          .filter(Boolean),
      ),
    ].sort();

    return {
      excavators,
      companies,
      loadingPoints,
      dumpingPoints,
    };
  }, [summaryData.ritases]);

  const handleAggregatedPageChange = useCallback((page) => {
    setCurrentAggregatedPage(page);
  }, []);

  const handleRitasePageChange = useCallback((page) => {
    setCurrentRitasePage(page);
  }, []);

  const handleResetRitaseFilters = useCallback(() => {
    setSelectedRitaseExcavators([]);
    setSelectedRitaseCompanies([]);
    setSelectedRitaseLoadingPoints([]);
    setSelectedRitaseDumpingPoints([]);
  }, []);

  const handleOpenInputModal = useCallback(() => {
    if (filteredFleetConfigs.length === 0) {
      showToast.error(TOAST_MESSAGES.ERROR.NO_FLEET_CONFIGS);
      return;
    }
    setShowInputModal(true);
  }, [filteredFleetConfigs]);

  const handleCloseInputModal = useCallback(() => {
    setShowInputModal(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    // ✅ Guard: jangan refresh kalau belum ada dateRange & shift
    if (!currentDateRange.from || !currentDateRange.to || !viewingShift) {
      showToast.error("Silakan pilih tanggal dan shift terlebih dahulu");
      return;
    }

    setIsRefreshing(true);
    try {
      await Promise.all([
        loadFleetConfigsFromAPI(true, null),
        loadSummaryData(true),
      ]);
    } catch (error) {
      console.error("⚠️ Refresh error:", error);
      showToast.error(TOAST_MESSAGES.ERROR.REFRESH_FAILED);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    loadFleetConfigsFromAPI,
    loadSummaryData,
    currentDateRange,
    viewingShift,
  ]);

  const handleSubmitRitase = useCallback(
    async (data) => {
      try {
        await Promise.all([
          loadFleetConfigsFromAPI(true, null),
          loadSummaryData(true),
        ]);

        setShowInputModal(false);
        return { success: true };
      } catch (error) {
        console.error("❌ Submit ritase error:", error);
        return { success: false, error: error.message };
      }
    },
    [loadFleetConfigsFromAPI, loadSummaryData],
  );

  const handleCreateRitaseFromAggregated = useCallback(
    async (fleetData) => {
      try {
        const result = await ritaseServices.createManualRitase({
          ...fleetData,
          created_by_user: user?.id || null,
        });

        if (result.success) {
          showToast.success("Data berhasil ditambahkan");

          setTimeout(async () => {
            try {
              await Promise.all([
                loadSummaryData(true),
                loadRitaseDataFromAPI(null, true),
              ]);
            } catch (error) {
              console.error("❌ Gagal reload data setelah create:", error);
            }
          }, 100);

          return { success: true, data: result.data };
        }

        showToast.error(result.error || "Gagal menambahkan data");
        return { success: false, error: result.error };
      } catch (error) {
        console.error("❌ Create ritase error:", error);
        showToast.error("Gagal menambahkan data");
        return { success: false, error: error.message };
      }
    },
    [user, loadSummaryData, loadRitaseDataFromAPI],
  );

  const handleDuplicateRitase = useCallback(
    async (duplicatedData) => {
      try {
        const result = await ritaseServices.duplicateRitase({
          ...duplicatedData,
          created_by_user: { id: user?.id || null },
        });

        if (result.success) {
          showToast.success("Data berhasil diduplikasi");

          setTimeout(async () => {
            try {
              await Promise.all([
                loadSummaryData(true),
                loadRitaseDataFromAPI(null, true),
              ]);
            } catch (error) {
              console.error("❌ Gagal reload data setelah duplikasi:", error);
            }
          }, 100);

          return { success: true, data: result.data };
        }

        console.error("❌ [4] Duplikasi gagal:", result.error);
        showToast.error(result.error || "Gagal menduplikasi data");
        return { success: false, error: result.error };
      } catch (error) {
        console.error("❌ [ERROR] Exception di handleDuplicateRitase:", error);
        showToast.error("Gagal menduplikasi data");
        return { success: false, error: error.message };
      }
    },
    [user, loadSummaryData, loadRitaseDataFromAPI],
  );

  const handleRefreshAfterEdit = useCallback(
    async (editedId, updatedData) => {
      // Optimistic update: langsung ubah item di list tanpa tunggu API
      if (editedId && updatedData) {
        setSummaryData((prev) => {
          return {
            ...prev,
            ritases: prev.ritases.map((item) =>
              item.id === String(editedId) ? { ...item, ...updatedData } : item,
            ),
          };
        });
      } else {
        console.warn(
          "⚠️ [RitaseHistory] handleRefreshAfterEdit missing editedId or updatedData",
        );
      }

      // Fetch ulang dari API di background untuk sinkronisasi data sesungguhnya
      try {
        await loadSummaryData(true);
      } catch (error) {
        console.error("❌ Gagal reload data setelah edit:", error);
      }
    },
    [loadSummaryData, setSummaryData],
  );

  const handleDeleteRitase = useCallback(
    async (ritaseData) => {
      try {
        const result = await ritaseServices.deleteTimbanganEntry(ritaseData.id);

        if (result.success) {
          showToast.success("Data berhasil dihapus");

          try {
            await Promise.all([
              loadSummaryData(true),
              loadRitaseDataFromAPI(null, true),
            ]);
          } catch (error) {
            console.error("❌ Gagal reload data setelah delete:", error);
          }

          return { success: true };
        }

        showToast.error(result.error || "Gagal menghapus data");
        return { success: false, error: result.error };
      } catch (error) {
        console.error("❌ Delete ritase error:", error);
        showToast.error("Gagal menghapus data");
        return { success: false, error: error.message };
      }
    },
    [loadSummaryData, loadRitaseDataFromAPI],
  );

  const handleApproveRitase = useCallback(
    async (item) => {
      try {
        const rawIds = Array.isArray(item?.ritase_ids)
          ? item.ritase_ids
          : Array.isArray(item?.ritases)
            ? item.ritases.map((r) => r?.id)
            : item?.id
              ? [item.id]
              : [];

        const ritaseIds = [...new Set(rawIds.filter(Boolean))];

        if (ritaseIds.length === 0) {
          showToast.error("Tidak ada data ritase untuk di-approve");
          return { success: false };
        }

        const result = await bulkApproveRitase({
          ritase_ids: ritaseIds,
          status: "APPROVED",
        });

        if (result.success) {
          showToast.success(
            `Berhasil approve ${result.count || ritaseIds.length} data ritase`,
          );
          await Promise.all([
            loadSummaryData(true),
            loadRitaseDataFromAPI(null, true),
          ]);
          return { success: true };
        }

        showToast.error(result.error || "Gagal melakukan approval");
        return { success: false, error: result.error };
      } catch (error) {
        console.error("❌ Approve ritase error:", error);
        showToast.error(error.message || "Gagal melakukan approval");
        return { success: false, error: error.message };
      }
    },
    [bulkApproveRitase, loadSummaryData, loadRitaseDataFromAPI],
  );

  const handlePrintTicket = useCallback((ritase) => {
    showToast.info("Print ticket: " + ritase.id);
  }, []);

  const hasActiveRitaseFilters =
    selectedRitaseExcavators.length > 0 ||
    selectedRitaseCompanies.length > 0 ||
    selectedRitaseLoadingPoints.length > 0 ||
    selectedRitaseDumpingPoints.length > 0;

  return (
    <>
      <div className="space-y-3 min-h-screen p-3">
        {/* Header */}
        <RitaseHistoryHeader
          user={user}
          userRole={userRole}
          dateRange={currentDateRange}
          currentShift={viewingShift}
          viewingShift={viewingShift}
          isLoading={isInitialLoading}
          isSearching={isRefreshing}
          onDateRangeChange={handleDateRangeChange}
          onRefresh={handleRefresh}
          totalRecords={filteredRitaseData.length}
          hasSearched={
            currentDateRange.from && currentDateRange.to && viewingShift
          }
        />

        {/* Error Alert */}
        {error && (
          <Alert
            variant="destructive"
            className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          >
            <AlertDescription className="flex items-center justify-between text-red-800 dark:text-red-200">
              <span>{error.message || error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800/30"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ✅ Tampilkan komponen hanya jika sudah ada data */}
        <RitaseSummary summaryData={summaryData} isLoading={isInitialLoading} />

        {isOperatorJT && (
          <RitaseList
            userRole={userRole}
            filteredRitaseData={filteredRitaseData}
            isInitialLoading={isInitialLoading}
            isRefreshing={isRefreshing}
            currentPage={currentRitasePage}
            onPageChange={handleRitasePageChange}
            onOpenInputModal={handleOpenInputModal}
            filteredFleetCount={filteredFleetConfigs.length}
            isFilterExpanded={isRitaseFilterExpanded}
            setIsFilterExpanded={setIsRitaseFilterExpanded}
            selectedExcavators={selectedRitaseExcavators}
            setSelectedExcavators={setSelectedRitaseExcavators}
            selectedCompanies={selectedRitaseCompanies}
            setSelectedCompanies={setSelectedRitaseCompanies}
            selectedLoadingPoints={selectedRitaseLoadingPoints}
            setSelectedLoadingPoints={setSelectedRitaseLoadingPoints}
            selectedDumpingPoints={selectedRitaseDumpingPoints}
            setSelectedDumpingPoints={setSelectedRitaseDumpingPoints}
            filterOptions={ritaseFilterOptions}
            onResetFilters={handleResetRitaseFilters}
            hasActiveFilters={hasActiveRitaseFilters}
            onPrintTicket={handlePrintTicket}
            onRefreshData={handleRefreshAfterEdit}
            onUpdateRitase={handleRefreshAfterEdit}
            onDeleteRitase={handleDeleteRitase}
            onDuplicateRitase={handleDuplicateRitase}
            refreshButtonRef={refreshButtonRef}
          />
        )}
        {/* Aggregated Ritase */}
        <AggregatedRitase
          aggregatedData={summaryData}
          currentShift={viewingShift}
          isInitialLoading={isInitialLoading}
          isRefreshing={isRefreshing}
          currentPage={currentAggregatedPage}
          onPageChange={handleAggregatedPageChange}
          isCCR={isCCR}
          filteredRitaseData={filteredRitaseData}
          currentRitasePage={currentRitasePage}
          onRitasePageChange={handleRitasePageChange}
          onOpenInputModal={handleOpenInputModal}
          filteredFleetCount={filteredFleetConfigs.length}
          isRitaseFilterExpanded={isRitaseFilterExpanded}
          setIsRitaseFilterExpanded={setIsRitaseFilterExpanded}
          selectedRitaseExcavators={selectedRitaseExcavators}
          setSelectedRitaseExcavators={setSelectedRitaseExcavators}
          selectedRitaseCompanies={selectedRitaseCompanies}
          setSelectedRitaseCompanies={setSelectedRitaseCompanies}
          selectedRitaseLoadingPoints={selectedRitaseLoadingPoints}
          setSelectedRitaseLoadingPoints={setSelectedRitaseLoadingPoints}
          selectedRitaseDumpingPoints={selectedRitaseDumpingPoints}
          setSelectedRitaseDumpingPoints={setSelectedRitaseDumpingPoints}
          ritaseFilterOptions={ritaseFilterOptions}
          onResetRitaseFilters={handleResetRitaseFilters}
          hasActiveRitaseFilters={hasActiveRitaseFilters}
          onCreateRitase={handleCreateRitaseFromAggregated}
          fleetConfigs={filteredFleetConfigs}
          onRefresh={handleRefresh}
          onUpdateRitase={handleRefreshAfterEdit}
          onDeleteRitase={handleDeleteRitase}
          onDuplicateRitase={handleDuplicateRitase}
          onApproveRitase={handleApproveRitase}
          refreshButtonRef={refreshButtonRef}
        />

        {/* Ritase List - Only shown for non-CCR roles */}
        {!isCCR && !isOperatorJT && (
          <RitaseList
            userRole={userRole}
            filteredRitaseData={filteredRitaseData}
            isInitialLoading={isInitialLoading}
            isRefreshing={isRefreshing}
            currentPage={currentRitasePage}
            onPageChange={handleRitasePageChange}
            onOpenInputModal={handleOpenInputModal}
            filteredFleetCount={filteredFleetConfigs.length}
            isFilterExpanded={isRitaseFilterExpanded}
            setIsFilterExpanded={setIsRitaseFilterExpanded}
            selectedExcavators={selectedRitaseExcavators}
            setSelectedExcavators={setSelectedRitaseExcavators}
            selectedCompanies={selectedRitaseCompanies}
            setSelectedCompanies={setSelectedRitaseCompanies}
            selectedLoadingPoints={selectedRitaseLoadingPoints}
            setSelectedLoadingPoints={setSelectedRitaseLoadingPoints}
            selectedDumpingPoints={selectedRitaseDumpingPoints}
            setSelectedDumpingPoints={setSelectedRitaseDumpingPoints}
            filterOptions={ritaseFilterOptions}
            onResetFilters={handleResetRitaseFilters}
            hasActiveFilters={hasActiveRitaseFilters}
            onPrintTicket={handlePrintTicket}
            onRefreshData={handleRefreshAfterEdit}
            onUpdateRitase={handleRefreshAfterEdit}
            onDeleteRitase={handleDeleteRitase}
            onDuplicateRitase={handleDuplicateRitase}
            refreshButtonRef={refreshButtonRef}
          />
        )}
      </div>

      {/* Input Modal */}
      <RitaseInputModal
        isOpen={showInputModal}
        onClose={handleCloseInputModal}
        onSubmit={handleSubmitRitase}
        fleetConfigs={filteredFleetConfigs}
        userRole={userRole}
      />

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isRefreshing} message="Memuat data..." />
    </>
  );
};

export default RitaseHistory;
