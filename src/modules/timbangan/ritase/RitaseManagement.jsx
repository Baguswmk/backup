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

import RitaseHeader from "@/modules/timbangan/ritase/components/RitaseHeader";
import AggregatedRitase from "@/modules/timbangan/ritase/components/AggregatedRitase";
import RitaseList from "@/modules/timbangan/ritase/components/RitaseList";
import RitaseSummary from "@/modules/timbangan/ritase/components/RitaseSummary";

import RitaseInputModal from "@/modules/timbangan/ritase/components/RitaseInputModal";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";
import { ritaseServices } from "@/modules/timbangan/ritase/services/ritaseServices";
import { getTodayDateRange } from "@/shared/utils/date";
import { getCurrentShift } from "@/shared/utils/shift";

import {
  TOAST_MESSAGES,
  USER_ROLES,
  TIMBANGAN_TYPES,
} from "@/modules/timbangan/ritase/constant/ritaseConstants";

const RitaseManagement = () => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  const error = useRitaseStore((state) => state.error);
  const fleetConfigs = useRitaseStore((state) => state.fleetConfigs);
  const clearError = useRitaseStore((state) => state.clearError);
  const loadRitaseDataFromAPI = useRitaseStore(
    (state) => state.loadRitaseDataFromAPI,
  );
  const loadFleetConfigsFromAPI = useRitaseStore(
    (state) => state.loadFleetConfigsFromAPI,
  );

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [currentRitasePage, setCurrentRitasePage] = useState(1);
  const [currentFleetPage, setCurrentFleetPage] = useState(1);
  const [currentAggregatedPage, setCurrentAggregatedPage] = useState(1);

  const [summaryData, setSummaryData] = useState({
    summaries: [],
    ritases: [],
  });
  const [currentDateRange] = useState(getTodayDateRange());
  const [currentShift] = useState(getCurrentShift());

  const [isFleetFilterExpanded, setIsFleetFilterExpanded] = useState(false);
  const [selectedFleetCompanies, setSelectedFleetCompanies] = useState([]);
  const [selectedFleetLoadingPoints, setSelectedFleetLoadingPoints] = useState(
    [],
  );
  const [selectedFleetDumpingPoints, setSelectedFleetDumpingPoints] = useState(
    [],
  );

  const [isRitaseFilterExpanded, setIsRitaseFilterExpanded] = useState(false);
  const [selectedRitaseCompanies, setSelectedRitaseCompanies] = useState([]);
  const [selectedRitaseLoadingPoints, setSelectedRitaseLoadingPoints] =
    useState([]);
  const [selectedRitaseDumpingPoints, setSelectedRitaseDumpingPoints] =
    useState([]);
  const [selectedRitaseExcavators, setSelectedRitaseExcavators] = useState([]);

  const hasMounted = useRef(false);
  const mountCount = useRef(0);

  const isCCR = userRole === USER_ROLES.CCR;

  const loadSummaryData = useCallback(
    async (forceRefresh = false) => {
      console.log("📥 Loading summary data...", {
        forceRefresh,
        currentDateRange,
        currentShift,
      });
      try {
        const result = await ritaseServices.fetchSummaryFleetByRitases({
          user,
          dateRange: currentDateRange,
          shift: currentShift,
          forceRefresh,
        });

        console.log("📦 Summary API result:", result);

        if (result.success) {
          console.log("✅ Summary data loaded:", {
            summariesCount: result.data.summaries?.length || 0,
            ritasesCount: result.data.ritases?.length || 0,
            data: result.data,
          });
          setSummaryData(result.data);
          return result.data;
        } else {
          console.error("❌ Failed to load summary data:", result.error);
          showToast.error(result.error || "Gagal memuat data summary");
          return { summaries: [], ritases: [] };
        }
      } catch (error) {
        console.error("❌ Error loading summary data:", error);
        showToast.error("Gagal memuat data summary");
        return { summaries: [], ritases: [] };
      }
    },
    [user, currentDateRange, currentShift],
  );

  useEffect(() => {
    mountCount.current += 1;
    const currentMount = mountCount.current;

    console.log(`🔄 Component mounted (mount #${currentMount})`, {
      hasMountedBefore: hasMounted.current,
      user: user?.username,
      dateRange: currentDateRange,
      shift: currentShift,
    });

    const isRemount = hasMounted.current && currentMount > 2;

    console.log(`🎯 Load decision:`, {
      isRemount,
      hasMounted: hasMounted.current,
      currentMount,
      willLoad: !hasMounted.current || isRemount,
    });

    if (hasMounted.current && currentMount === 2) {
      console.log("⏭️ Skipping duplicate Strict Mode mount");
      return;
    }

    hasMounted.current = true;
    setIsInitialLoading(true);

    const initializeData = async () => {
      try {
       const response = await Promise.all([
          loadFleetConfigsFromAPI(false, null),
          loadSummaryData(true),
        ]);
      } catch (error) {
        console.error("⚠️ Initial load error:", error);
        showToast.error(TOAST_MESSAGES.ERROR.LOAD_FAILED);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initializeData();
   
  }, []);

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
      const matchingRitase = ritases.find(
        (r) =>
          r.unit_exca === summary.unit_exca &&
          r.loading_location === summary.loading_location &&
          r.dumping_location === summary.dumping_location &&
          r.measurement_type === summary.measurement_type,
      );

      return {
        ...summary,
        checker: matchingRitase?.checker || summary.checker,
        company: matchingRitase?.company || summary.company,

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
    setCurrentFleetPage(1);
  }, [filteredFleetConfigs.length]);

  useEffect(() => {
    setCurrentAggregatedPage(1);
  }, [aggregatedRitaseData.length]);

  const handleOpenInputModal = useCallback(() => {
    setShowInputModal(true);
  }, []);

  const handleCloseInputModal = useCallback(() => {
    setShowInputModal(false);
  }, []);

  const handleSubmitRitase = useCallback(
    async (result) => {
      if (result.cancelled) {
        handleCloseInputModal();
        return;
      }

      if (result.success) {
        showToast.success("Data berhasil disimpan");
        handleCloseInputModal();

        try {
          await Promise.all([
            loadSummaryData(true),
            loadRitaseDataFromAPI(null, true),
          ]);
        } catch (error) {
          console.error("⚠️ Gagal reload data setelah submit:", error);
        }
      }
    },
    [handleCloseInputModal, loadSummaryData, loadRitaseDataFromAPI],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadSummaryData(true),
        loadFleetConfigsFromAPI(true, null),
      ]);

      showToast.success("Data berhasil di-refresh");
    } catch (error) {
      showToast.error("Gagal refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, [loadSummaryData, loadFleetConfigsFromAPI]);

  const handleResetFleetFilters = useCallback(() => {
    setSelectedFleetCompanies([]);
    setSelectedFleetLoadingPoints([]);
    setSelectedFleetDumpingPoints([]);
  }, []);

  const handleResetRitaseFilters = useCallback(() => {
    setSelectedRitaseExcavators([]);
    setSelectedRitaseCompanies([]);
    setSelectedRitaseLoadingPoints([]);
    setSelectedRitaseDumpingPoints([]);
  }, []);

  const hasActiveRitaseFilters =
    selectedRitaseExcavators.length > 0 ||
    selectedRitaseCompanies.length > 0 ||
    selectedRitaseLoadingPoints.length > 0 ||
    selectedRitaseDumpingPoints.length > 0;

  return (
    <>
      <div className="space-y-6 min-h-screen p-6">
        {/* Header */}
        <RitaseHeader
          user={user}
          userRole={userRole}
          filteredFleetCount={filteredFleetConfigs.length}
          isRefreshing={isRefreshing}
          isInitialLoading={isInitialLoading}
          onRefresh={handleRefresh}
          onOpenInputModal={handleOpenInputModal}
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

        <RitaseSummary summaryData={summaryData} isLoading={isInitialLoading} />

        {/* Aggregated Ritase - Always shown */}
        <AggregatedRitase
          aggregatedData={aggregatedRitaseData}
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
        />

        {/* Ritase List - Only shown for non-CCR roles */}
        {!isCCR && (
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

export default RitaseManagement;
