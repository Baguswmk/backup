import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { X } from "lucide-react";

import RitaseHistoryHeader from "@/modules/timbangan/ritase/components/RitaseHistoryHeader";
import AggregatedRitase from "@/modules/timbangan/ritase/components/AggregatedRitase";
import RitaseList from "@/modules/timbangan/ritase/components/RitaseList";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import RitaseSummary from "@/modules/timbangan/ritase/components/RitaseSummary";

import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";
import { ritaseServices } from "@/modules/timbangan/ritase/services/ritaseServices";
import { getWorkShiftInfo } from "@/shared/utils/date";
import { getCurrentShift } from "@/shared/utils/shift";

import {
  USER_ROLES,
  TIMBANGAN_TYPES,
} from "@/modules/timbangan/ritase/constant/ritaseConstants";

const RitaseHistory = () => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  const error = useRitaseStore((state) => state.error);
  const clearError = useRitaseStore((state) => state.clearError);

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentRitasePage, setCurrentRitasePage] = useState(1);
  const [currentAggregatedPage, setCurrentAggregatedPage] = useState(1);

  const [summaryData, setSummaryData] = useState({
    summaries: [],
    ritases: [],
  });
  const [currentDateRange, setCurrentDateRange] = useState(getWorkShiftInfo());
  const [viewingShift, setViewingShift] = useState(getCurrentShift());
  const currentShift = getCurrentShift();

  const [isRitaseFilterExpanded, setIsRitaseFilterExpanded] = useState(false);
  const [selectedRitaseCompanies, setSelectedRitaseCompanies] = useState([]);
  const [selectedRitaseLoadingPoints, setSelectedRitaseLoadingPoints] =
    useState([]);
  const [selectedRitaseDumpingPoints, setSelectedRitaseDumpingPoints] =
    useState([]);
  const [selectedRitaseExcavators, setSelectedRitaseExcavators] = useState([]);

  const [selectedFleetCompanies] = useState([]);
  const [selectedFleetLoadingPoints] = useState([]);
  const [selectedFleetDumpingPoints] = useState([]);
  const isCCR = userRole === USER_ROLES.CCR;
  const fleetConfigs = useRitaseStore((state) => state.fleetConfigs);
  const loadRitaseDataFromAPI = useRitaseStore(
    (state) => state.loadRitaseDataFromAPI,
  );
  const loadFleetConfigsFromAPI = useRitaseStore(
    (state) => state.loadFleetConfigsFromAPI,
  );
  const handleDateRangeChange = useCallback((payload) => {
    setCurrentDateRange({
      from: payload.from || payload.startDate,
      to: payload.to || payload.endDate,
    });
    setViewingShift(payload.shift);

    loadSummaryDataWithParams({
      dateRange: {
        from: payload.from || payload.startDate,
        to: payload.to || payload.endDate,
      },
      shift: payload.shift,
    });
  }, []);

  const loadSummaryDataWithParams = useCallback(
    async ({ dateRange, shift }) => {
      if (!dateRange.from || !dateRange.to) {
        showToast.error("Silakan pilih tanggal terlebih dahulu");
        return;
      }

      setIsSearching(true);
      try {
        const result = await ritaseServices.fetchSummaryFleetByRitases({
          user,
          dateRange: dateRange,
          shift: shift,
          forceRefresh: true,
        });

        if (result.success) {
          setSummaryData(result.data);
          setHasSearched(true);

          const totalRecords = result.data.ritases?.length || 0;

          if (totalRecords === 0) {
            showToast.info("Tidak ada data untuk periode yang dipilih");
          } else {
            showToast.success(`Ditemukan ${totalRecords} record ritase`);
          }
        } else {
          console.error("❌ Failed to load history:", result.error);
          showToast.error(result.error || "Gagal memuat data history");
          setSummaryData({ summaries: [], ritases: [] });
          setHasSearched(true);
        }
      } catch (error) {
        console.error("❌ Error loading history:", error);
        showToast.error("Gagal memuat data history");
        setSummaryData({ summaries: [], ritases: [] });
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    },
    [user],
  );

  const loadSummaryData = useCallback(async () => {
    if (!currentDateRange.from || !currentDateRange.to) {
      showToast.error("Silakan pilih tanggal terlebih dahulu");
      return;
    }

    setIsSearching(true);
    try {
      const result = await ritaseServices.fetchSummaryFleetByRitases({
        user,
        dateRange: currentDateRange,
        shift: viewingShift,
        forceRefresh: true,
      });

      if (result.success) {
        setSummaryData(result.data);
        setHasSearched(true);

        const totalRecords = result.data.ritases?.length || 0;

        if (totalRecords === 0) {
          showToast.info("Tidak ada data untuk periode yang dipilih");
        } else {
          showToast.success(`Ditemukan ${totalRecords} record ritase`);
        }
      } else {
        console.error("❌ Failed to load history:", result.error);
        showToast.error(result.error || "Gagal memuat data history");
        setSummaryData({ summaries: [], ritases: [] });
        setHasSearched(true);
      }
    } catch (error) {
      console.error("❌ Error loading history:", error);
      showToast.error("Gagal memuat data history");
      setSummaryData({ summaries: [], ritases: [] });
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, [user, currentDateRange, viewingShift]);

  const handleSearch = useCallback(() => {
    loadSummaryData();
  }, [loadSummaryData]);

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

  const ritaseFilterOptions = useMemo(() => {
    const ritases = summaryData.ritases || [];
    const excavators = [
      ...new Set(ritases.map((r) => r.unit_exca).filter(Boolean)),
    ];
    const companies = [
      ...new Set(ritases.map((r) => r.company).filter(Boolean)),
    ];
    const loadingPoints = [
      ...new Set(ritases.map((r) => r.loading_location).filter(Boolean)),
    ];
    const dumpingPoints = [
      ...new Set(ritases.map((r) => r.dumping_location).filter(Boolean)),
    ];

    return {
      excavators: excavators.map((e) => ({ value: e, label: e })),
      companies: companies.map((c) => ({ value: c, label: c })),
      loadingPoints: loadingPoints.map((l) => ({ value: l, label: l })),
      dumpingPoints: dumpingPoints.map((d) => ({ value: d, label: d })),
    };
  }, [summaryData.ritases]);

  const aggregatedRitaseData = useMemo(() => {
    const summaries = summaryData.summaries || [];
    const ritases = summaryData.ritases || [];

    return summaries.map((summary) => {
      const matchingRitases = ritases.filter(
        (r) =>
          r.unit_exca === summary.unit_exca &&
          r.loading_location === summary.loading_location &&
          r.dumping_location === summary.dumping_location &&
          r.measurement_type === summary.measurement_type,
      );

      const firstMatch = matchingRitases[0];

      return {
        ...summary,
        checker: firstMatch?.checker || "Unknown Checker",
        company: firstMatch?.company || "Unknown Company",
        tripCount: summary.total_ritase,
        totalWeight: summary.total_tonase,
      };
    });
  }, [summaryData.summaries, summaryData.ritases]);

  const handleRitasePageChange = useCallback((page) => {
    setCurrentRitasePage(page);
    const ritaseCard = document.querySelector("[data-ritase-list]");
    if (ritaseCard) {
      ritaseCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleAggregatedPageChange = useCallback((page) => {
    setCurrentAggregatedPage(page);
    const aggregatedCard = document.querySelector("[data-aggregated-list]");
    if (aggregatedCard) {
      aggregatedCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    setCurrentRitasePage(1);
  }, [filteredRitaseData.length]);

  useEffect(() => {
    setCurrentAggregatedPage(1);
  }, [aggregatedRitaseData.length]);

  const handleResetRitaseFilters = useCallback(() => {
    setSelectedRitaseExcavators([]);
    setSelectedRitaseCompanies([]);
    setSelectedRitaseLoadingPoints([]);
    setSelectedRitaseDumpingPoints([]);
  }, []);

  const handleCreateRitaseFromAggregated = useCallback(
    async (ritaseData) => {
      try {
        const result = await ritaseServices.createManualRitase(ritaseData);

        if (result.success) {
          await Promise.all([
            loadSummaryData(true),
            loadRitaseDataFromAPI(null, true),
          ]);

          return { success: true, data: result.data };
        }

        return {
          success: false,
          error: result.error || "Gagal menyimpan data",
        };
      } catch (error) {
        console.error("❌ Create ritase error:", error);
        return {
          success: false,
          error: error.message || "Gagal menyimpan data",
        };
      }
    },
    [loadSummaryData, loadRitaseDataFromAPI],
  );

  const handleDuplicateRitase = useCallback(
    async (duplicatedData) => {
      try {
        const result = await ritaseServices.duplicateRitase(duplicatedData);

        if (result.success) {
          showToast.success("Data berhasil diduplikasi");

          setTimeout(async () => {
            try {
              await Promise.all([
                loadSummaryData(true),
                loadRitaseDataFromAPI(null, true),
              ]);
            } catch (error) {
              console.error("❌ [6] Gagal reload data:", error);
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
    [loadSummaryData, loadRitaseDataFromAPI],
  );

  const handleUpdateRitase = useCallback(
    async (updatedData) => {
      try {
        const result = await ritaseServices.updateRitase(
          updatedData.id,
          updatedData,
        );

        if (result.success) {
          showToast.success("Data berhasil diupdate");

          setTimeout(async () => {
            try {
              await Promise.all([
                loadSummaryData(true),
                loadRitaseDataFromAPI(null, true),
              ]);
            } catch (error) {
              console.error("❌ Gagal reload data setelah update:", error);
            }
          }, 100);

          return { success: true, data: result.data };
        }

        showToast.error(result.error || "Gagal mengupdate data");
        return { success: false, error: result.error };
      } catch (error) {
        console.error("❌ Update ritase error:", error);
        showToast.error("Gagal mengupdate data");
        return { success: false, error: error.message };
      }
    },
    [loadSummaryData, loadRitaseDataFromAPI],
  );

  const handleDeleteRitase = useCallback(
    async (ritaseData) => {
      try {
        const result = await ritaseServices.deleteRitase(ritaseData.id);

        if (result.success) {
          showToast.success("Data berhasil dihapus");

          setTimeout(async () => {
            try {
              await Promise.all([
                loadSummaryData(true),
                loadRitaseDataFromAPI(null, true),
              ]);
            } catch (error) {
              console.error("❌ Gagal reload data setelah delete:", error);
            }
          }, 100);

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

  const handlePrintTicket = useCallback((ritase) => {
    showToast.info("Print ticket: " + ritase.id);
  }, []);

  const hasActiveRitaseFilters =
    selectedRitaseExcavators.length > 0 ||
    selectedRitaseCompanies.length > 0 ||
    selectedRitaseLoadingPoints.length > 0 ||
    selectedRitaseDumpingPoints.length > 0;

  const handleExport = useCallback(() => {
    showToast.info("Export feature coming soon...");
  }, []);

  return (
    <>
      <div className="space-y-6 min-h-screen p-6">
        {/* Header - Sama seperti RitaseManagement tapi pakai RitaseHistoryHeader */}
        <RitaseHistoryHeader
          user={user}
          userRole={userRole}
          dateRange={currentDateRange}
          currentShift={currentShift}
          viewingShift={viewingShift}
          isLoading={false}
          isSearching={isSearching}
          onDateRangeChange={handleDateRangeChange}
          onSearch={handleSearch}
          onExport={handleExport}
          totalRecords={filteredRitaseData.length}
          hasSearched={hasSearched}
        />

        {/* Error Alert - Sama persis */}
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

        <RitaseSummary summaryData={summaryData} />

        {/* Aggregated Ritase - Sama persis */}
        <AggregatedRitase
          aggregatedData={aggregatedRitaseData}
          isInitialLoading={false}
          isRefreshing={isSearching}
          currentPage={currentAggregatedPage}
          onPageChange={handleAggregatedPageChange}
          isCCR={isCCR}
          filteredRitaseData={filteredRitaseData}
          currentRitasePage={currentRitasePage}
          onRitasePageChange={handleRitasePageChange}
          onOpenInputModal={null}
          filteredFleetCount={0}
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
          onUpdateRitase={handleUpdateRitase}
          onDeleteRitase={handleDeleteRitase}
          onDuplicateRitase={handleDuplicateRitase}
        />

        {/* Ritase List - Sama persis (untuk non-CCR) */}
        {!isCCR && (
          <RitaseList
            userRole={userRole}
            filteredRitaseData={filteredRitaseData}
            isInitialLoading={false}
            isRefreshing={isSearching}
            currentPage={currentRitasePage}
            onPageChange={handleRitasePageChange}
            onOpenInputModal={null}
            filteredFleetCount={0}
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
            onUpdateRitase={handleUpdateRitase}
            onDeleteRitase={handleDeleteRitase}
            onDuplicateRitase={handleDuplicateRitase}
          />
        )}
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isSearching}
        message="Memuat data history..."
      />
    </>
  );
};

export default RitaseHistory;