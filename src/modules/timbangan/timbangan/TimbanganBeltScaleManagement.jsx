import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { X, Plus, History, TrendingUp } from "lucide-react";

// Components
import BypassAdjustmentForm from "@/modules/timbangan/timbangan/components/BeltScaleAdjustmentForm";
import { TimbanganTable } from "@/modules/timbangan/timbangan/components/TimbanganTable";
import BypassHistoryModal from "@/modules/timbangan/timbangan/components/BeltScaleHistoryModal";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

// Store & Services
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { beltScaleServices } from "@/modules/timbangan/timbangan/services/beltscaleServices";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

// Constants
import { getInitialDateRange } from "@/modules/timbangan/timbangan/constant/timbanganConstants";

const TimbanganBeltScaleManagement = () => {
  // ============================================
  // STORE & AUTH
  // ============================================
  const { user } = useAuthStore();
  const timbanganData = useTimbanganStore((state) => state.timbanganData);
  const loadTimbanganDataFromAPI = useTimbanganStore(
    (state) => state.loadTimbanganDataFromAPI
  );
  const error = useTimbanganStore((state) => state.error);
  const clearError = useTimbanganStore((state) => state.clearError);

  // ============================================
  // STATE
  // ============================================
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [adjustedRitases, setAdjustedRitases] = useState([]);

  // ============================================
  // COMPUTED
  // ============================================
  const filteredTimbanganData = useMemo(() => {
    let filtered = timbanganData;

    // Filter by date range
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(
          item.tanggal || item.createdAt || item.timestamp
        );
        if (isNaN(itemDate.getTime())) return false;
        if (dateRange.from && itemDate < dateRange.from) return false;
        if (dateRange.to && itemDate > dateRange.to) return false;
        return true;
      });
    }

    // Filter by shift
    if (dateRange.shift && dateRange.shift !== "All") {
      filtered = filtered.filter((item) => {
        const itemShift = item.shift || item.fleet_shift || "";
        return itemShift === dateRange.shift;
      });
    }

    return filtered;
  }, [timbanganData, dateRange]);

  // Merge with adjusted data
  const displayData = useMemo(() => {
    if (adjustedRitases.length === 0) return filteredTimbanganData;

    return filteredTimbanganData.map((ritase) => {
      const adjusted = adjustedRitases.find((adj) => adj.id === ritase.id);
      if (adjusted) {
        return {
          ...ritase,
          net_weight: adjusted.net_weight_adjusted,
          gross_weight: adjusted.gross_weight_adjusted,
          isAdjusted: true,
          original_net_weight: ritase.net_weight,
        };
      }
      return ritase;
    });
  }, [filteredTimbanganData, adjustedRitases]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleDateRangeChange = useCallback((range) => {
    const normalized = {
      from: range.from || range.startDate
        ? new Date(range.from || range.startDate)
        : null,
      to: range.to || range.endDate
        ? new Date(range.to || range.endDate)
        : null,
      shift: range.shift || "All",
    };

    if (normalized.from) normalized.from.setHours(0, 0, 0, 0);
    if (normalized.to) normalized.to.setHours(23, 59, 59, 999);

    setDateRange(normalized);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadTimbanganDataFromAPI(
        { from: dateRange.from, to: dateRange.to },
        true
      );
      showToast.success("Data berhasil di-refresh");
    } catch (error) {
      showToast.error("Gagal refresh data");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, loadTimbanganDataFromAPI]);

  const handleFormSubmit = useCallback(
    async (result) => {
      if (result.success) {
        setShowForm(false);

        // Refresh data
        await loadTimbanganDataFromAPI(
          { from: dateRange.from, to: dateRange.to },
          true
        );

        showToast.success("Adjustment berhasil disimpan");
      }
    },
    [dateRange, loadTimbanganDataFromAPI]
  );

  const handleOpenForm = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      try {
        await loadTimbanganDataFromAPI(
          { from: dateRange.from, to: dateRange.to },
          false
        );
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Prevent body scroll when form is open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showForm]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <div className="space-y-6 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Timbangan BeltScale - Adjustment
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Welcome back, {user?.username}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenForm}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buat Adjustment
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Tentang BeltScale Adjustment
                </h3>
                <p className="text-xs text-blue-700">
                  Fitur ini digunakan untuk menyesuaikan tonnage ritase
                  berdasarkan data aktual dari timbangan BeltScale. Pilih
                  tanggal, shift, dan dumping point, lalu masukkan total net
                  weight BeltScale untuk mendistribusikan secara proporsional ke
                  semua ritase dalam shift tersebut.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message || error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Data Table */}
        {isInitialLoading ? (
          <Card className="border-none">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="grid grid-cols-7 gap-4 py-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                        <div
                          key={col}
                          className="h-4 bg-gray-200 rounded animate-pulse"
                        ></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <TimbanganTable
            title="Data Ritase (BeltScale Adjusted)"
            shipments={displayData}
            onEdit={() => {}} // Read-only for BeltScale
            onDelete={() => {}} // Read-only for BeltScale
            onToggleSelect={() => {}}
            onToggleSelectAll={() => {}}
            selectedItems={[]}
            allSelected={false}
            isLoading={isLoading}
            isDeleting={false}
            showSelection={false}
            showActions={false}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onRefresh={handleRefresh}
            allTimbanganData={timbanganData}
            allSelectedFleets={[]}
            onOpenInputForm={() => {}}
            onOpenFleetDialog={() => {}}
            onResetDateFilter={() => {
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              setDateRange({ from: today, to: today, shift: "All" });
            }}
          />
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="detail-modal fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between z-10 shadow-sm ">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                  <TrendingUp className="w-5 h-5" />
                  Buat BeltScale Adjustment
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Sesuaikan tonnage ritase berdasarkan data BeltScale
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseForm}
                className="h-8 w-8 p-0 dark:text-gray-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6">
              <BypassAdjustmentForm
                onSubmit={handleFormSubmit}
                isSubmitting={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <BypassHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} message="Loading..." />
    </>
  );
};

export default TimbanganBeltScaleManagement;