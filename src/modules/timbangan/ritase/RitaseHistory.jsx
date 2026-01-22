import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { X } from "lucide-react";

// Import komponen yang sama dengan RitaseManagement
import RitaseHistoryHeader from "@/modules/timbangan/ritase/components/RitaseHistoryHeader";
import AggregatedRitase from "@/modules/timbangan/ritase/components/AggregatedRitase";
import RitaseList from "@/modules/timbangan/ritase/components/RitaseList";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import RitaseSummary from "@/modules/timbangan/ritase/components/RitaseSummary";

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

const RitaseHistory = ({ Type = TIMBANGAN_TYPES.INTERNAL }) => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  const error = useRitaseStore((state) => state.error);
  const clearError = useRitaseStore((state) => state.clearError);

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentRitasePage, setCurrentRitasePage] = useState(1);
  const [currentAggregatedPage, setCurrentAggregatedPage] = useState(1);

  // History data state
  const [summaryData, setSummaryData] = useState({ summaries: [], ritases: [] });
  const [currentDateRange, setCurrentDateRange] = useState(getTodayDateRange());
  const [viewingShift, setViewingShift] = useState(getCurrentShift());
  const currentShift = getCurrentShift();

  // Ritase filter states (sama seperti RitaseManagement)
  const [isRitaseFilterExpanded, setIsRitaseFilterExpanded] = useState(false);
  const [selectedRitaseCompanies, setSelectedRitaseCompanies] = useState([]);
  const [selectedRitaseLoadingPoints, setSelectedRitaseLoadingPoints] = useState([]);
  const [selectedRitaseDumpingPoints, setSelectedRitaseDumpingPoints] = useState([]);
  const [selectedRitaseExcavators, setSelectedRitaseExcavators] = useState([]);

  // Check if user is CCR
  const isCCR = userRole === USER_ROLES.CCR;

  // Handle date range change
  const handleDateRangeChange = useCallback((payload) => {
    setCurrentDateRange({
      from: payload.from || payload.startDate,
      to: payload.to || payload.endDate,
    });
    setViewingShift(payload.shift);
  }, []);

  // Load summary data
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
        
        const totalRecords = (result.data.ritases?.length || 0);

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

  // Handle search button
  const handleSearch = useCallback(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  // Filter ritase data (sama seperti RitaseManagement)
  const filteredRitaseData = useMemo(() => {
    let filtered = summaryData.ritases || [];

    if (selectedRitaseExcavators.length > 0) {
      filtered = filtered.filter(r =>
        selectedRitaseExcavators.includes(r.unit_exca)
      );
    }

    if (selectedRitaseCompanies.length > 0) {
      filtered = filtered.filter(r =>
        selectedRitaseCompanies.includes(r.company)
      );
    }

    if (selectedRitaseLoadingPoints.length > 0) {
      filtered = filtered.filter(r =>
        selectedRitaseLoadingPoints.includes(r.loading_location)
      );
    }

    if (selectedRitaseDumpingPoints.length > 0) {
      filtered = filtered.filter(r =>
        selectedRitaseDumpingPoints.includes(r.dumping_location)
      );
    }

    return filtered;
  }, [summaryData.ritases, selectedRitaseExcavators, selectedRitaseCompanies, selectedRitaseLoadingPoints, selectedRitaseDumpingPoints]);

  // Get filter options
  const ritaseFilterOptions = useMemo(() => {
    const ritases = summaryData.ritases || [];
    const excavators = [...new Set(ritases.map(r => r.unit_exca).filter(Boolean))];
    const companies = [...new Set(ritases.map(r => r.company).filter(Boolean))];
    const loadingPoints = [...new Set(ritases.map(r => r.loading_location).filter(Boolean))];
    const dumpingPoints = [...new Set(ritases.map(r => r.dumping_location).filter(Boolean))];

    return {
      excavators: excavators.map(e => ({ value: e, label: e })),
      companies: companies.map(c => ({ value: c, label: c })),
      loadingPoints: loadingPoints.map(l => ({ value: l, label: l })),
      dumpingPoints: dumpingPoints.map(d => ({ value: d, label: d })),
    };
  }, [summaryData.ritases]);

  // Aggregated data
  const aggregatedRitaseData = useMemo(() => {
    return summaryData.summaries || [];
  }, [summaryData.summaries]);

  // Handle page changes
  const handleRitasePageChange = useCallback((page) => {
    setCurrentRitasePage(page);
    const ritaseCard = document.querySelector('[data-ritase-list]');
    if (ritaseCard) {
      ritaseCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleAggregatedPageChange = useCallback((page) => {
    setCurrentAggregatedPage(page);
    const aggregatedCard = document.querySelector('[data-aggregated-list]');
    if (aggregatedCard) {
      aggregatedCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Reset pages when data changes
  useEffect(() => {
    setCurrentRitasePage(1);
  }, [filteredRitaseData.length]);

  useEffect(() => {
    setCurrentAggregatedPage(1);
  }, [aggregatedRitaseData.length]);

  // Reset filters
  const handleResetRitaseFilters = useCallback(() => {
    setSelectedRitaseExcavators([]);
    setSelectedRitaseCompanies([]);
    setSelectedRitaseLoadingPoints([]);
    setSelectedRitaseDumpingPoints([]);
  }, []);

  const hasActiveRitaseFilters = selectedRitaseExcavators.length > 0 ||
    selectedRitaseCompanies.length > 0 ||
    selectedRitaseLoadingPoints.length > 0 ||
    selectedRitaseDumpingPoints.length > 0;

  // Export function
  const handleExport = useCallback(() => {
    showToast.info("Export feature coming soon...");
    // TODO: Implement export logic
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
          <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
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


        <RitaseSummary 
          summaryData={summaryData} 
        />

        {/* Aggregated Ritase - Sama persis */}
        <AggregatedRitase
          aggregatedData={aggregatedRitaseData}
          isInitialLoading={false}
          isRefreshing={isSearching}
          currentPage={currentAggregatedPage}
          onPageChange={handleAggregatedPageChange}
          isCCR={isCCR}
          // Props untuk all-shipment tab (CCR only)
          filteredRitaseData={filteredRitaseData}
          currentRitasePage={currentRitasePage}
          onRitasePageChange={handleRitasePageChange}
          onOpenInputModal={null} // ❌ No input in history
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
            onOpenInputModal={null} // ❌ No input in history
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