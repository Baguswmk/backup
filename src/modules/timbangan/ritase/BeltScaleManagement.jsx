import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { X, Plus, TrendingUp, AlertCircle } from "lucide-react";

import BeltScaleAdjustmentForm from "@/modules/timbangan/ritase/components/BeltScaleAdjustmentForm";
import { RitaseTable } from "@/modules/timbangan/ritase/components/RitaseTable";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

import { getInitialDateRange } from "@/modules/timbangan/ritase/constant/ritaseConstants";

const BeltscaleManagement = () => {
  const { user } = useAuthStore();
  const ritaseData = useRitaseStore((state) => state.ritaseData);
  const loadRitaseDataFromAPI = useRitaseStore(
    (state) => state.loadRitaseDataFromAPI,
  );
  const error = useRitaseStore((state) => state.error);
  const clearError = useRitaseStore((state) => state.clearError);

  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [adjustmentSummary, setAdjustmentSummary] = useState(null);

  const filteredRitaseData = useMemo(() => {
    let filtered = ritaseData;

    filtered = filtered.filter((item) => item.measurement_type === "Beltscale");

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(
          item.tanggal || item.date || item.createdAt || item.timestamp,
        );
        if (isNaN(itemDate.getTime())) return false;
        if (dateRange.from && itemDate < dateRange.from) return false;
        if (dateRange.to && itemDate > dateRange.to) return false;
        return true;
      });
    }

    if (dateRange.shift && dateRange.shift !== "All") {
      filtered = filtered.filter((item) => {
        const itemShift = item.shift || item.fleet_shift || "";
        return itemShift === dateRange.shift;
      });
    }

    return filtered;
  }, [ritaseData, dateRange]);

  const handleDateRangeChange = useCallback((range) => {
    const normalized = {
      from:
        range.from || range.startDate
          ? new Date(range.from || range.startDate)
          : null,
      to:
        range.to || range.endDate ? new Date(range.to || range.endDate) : null,
      shift: range.shift || "All",
    };

    if (normalized.from) normalized.from.setHours(0, 0, 0, 0);
    if (normalized.to) normalized.to.setHours(23, 59, 59, 999);

    setDateRange(normalized);

    const { loadRitaseDataFromAPI } = useRitaseStore.getState();

    setIsLoading(true);

    loadRitaseDataFromAPI(
      { from: normalized.from, to: normalized.to },
      true,
      "Beltscale",
    )
      .then(() => {
        showToast.success("Data berhasil dimuat");
      })
      .catch((error) => {
        console.error("❌ Failed to load Beltscale data:", error);
        showToast.error("Gagal memuat data");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadRitaseDataFromAPI(
        { from: dateRange.from, to: dateRange.to },
        true,
        "Beltscale",
      );
      showToast.success("Data berhasil di-refresh");
    } catch (error) {
      showToast.error("Gagal refresh data");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, loadRitaseDataFromAPI]);

  const handleFormSubmit = useCallback(
    async (result) => {
      if (result.success) {
        setShowForm(false);

        if (result.data && result.data.summary) {
          setAdjustmentSummary(result.data.summary);
        }

        await loadRitaseDataFromAPI(
          { from: dateRange.from, to: dateRange.to },
          true,
          "Beltscale",
        );

        showToast.success(
          result.message || "Beltscale adjustment berhasil disimpan",
        );
      }
    },
    [dateRange, loadRitaseDataFromAPI],
  );

  const handleOpenForm = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleClearSummary = useCallback(() => {
    setAdjustmentSummary(null);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      try {
        await loadRitaseDataFromAPI(
          { from: dateRange.from, to: dateRange.to },
          false,
          "Beltscale",
        );
      } catch (error) {
        console.error("❌ Failed to load initial Beltscale data:", error);
        showToast.error("Gagal memuat data awal");
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

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

  return (
    <>
      <div className="space-y-6 min-h-screen p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Beltscale - Adjustment
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              Welcome back,{" "}
              <span className="font-medium dark:text-gray-300">
                {user?.username}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenForm}
              className="flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm dark:shadow-blue-900/50 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Hitung Beltscale
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800/50 shadow-sm dark:shadow-lg dark:shadow-blue-900/20 transition-all duration-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 shadow-sm dark:shadow-blue-800/50">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Tentang Beltscale Adjustment
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Fitur ini digunakan untuk menghitung ulang tonnage ritase
                  berdasarkan data aktual dari timbangan Beltscale. Pilih
                  setting fleet, lalu masukkan total berat Beltscale untuk
                  mendistribusikan secara proporsional ke semua ritase dalam
                  fleet tersebut. Sistem akan menghitung rasio berdasarkan
                  net_weight original setiap ritase.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert
            variant="destructive"
            className="bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/50 shadow-sm dark:shadow-red-900/20"
          >
            <AlertDescription className="flex items-center justify-between text-red-800 dark:text-red-200">
              <span>{error.message || error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Data Table */}
        {isInitialLoading ? (
          <Card className="border-none shadow-sm dark:shadow-lg dark:shadow-gray-900/50 bg-neutral-50 dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="grid grid-cols-7 gap-4 py-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                        <div
                          key={col}
                          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                        ></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <RitaseTable
            title="Data Ritase Beltscale"
            shipments={filteredRitaseData}
            allSelected={false}
            isLoading={isLoading}
            isDeleting={false}
            showSelection={false}
            showActions={false}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onRefresh={handleRefresh}
            allTimbanganData={ritaseData}
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
        <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-200">
          <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-neutral-50 dark:bg-gray-800 px-6 py-4 flex items-center justify-between z-10 shadow-sm border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Hitung Beltscale Adjustment
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Sesuaikan tonnage ritase berdasarkan data Beltscale aktual
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseForm}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900">
              <BeltScaleAdjustmentForm
                onSubmit={handleFormSubmit}
                isSubmitting={false}
                user={user}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} message="Loading..." />
    </>
  );
};

export default BeltscaleManagement;
