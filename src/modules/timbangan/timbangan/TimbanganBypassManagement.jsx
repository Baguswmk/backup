import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { X, Plus } from "lucide-react";

// Components
import BypassScaleForm from "@/modules/timbangan/timbangan/components/BypassScaleForm";
import { TimbanganTable } from "@/modules/timbangan/timbangan/components/TimbanganTable";
import TimbanganDetailModal from "@/modules/timbangan/timbangan/components/TimbanganDetailModal";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import FleetStatusCard from "@/modules/timbangan/timbangan/components/FleetStatusCard";
import PrintTicketButton from "@/modules/timbangan/timbangan/components/PrintTicketButton";

// Store & Services
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { bypassServices } from "@/modules/timbangan/timbangan/services/bypassServices";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

// Constants
import {
  getInitialDateRange,
  AUTO_PRINT_DELAY,
  REOPEN_FORM_DELAY,
  USER_ROLES,
  TOAST_MESSAGES,
} from "@/modules/timbangan/timbangan/constant/timbanganConstants";

const TimbanganBypassManagement = () => {
  // ============================================
  // STORE & AUTH
  // ============================================
  const { user } = useAuthStore();
  const userRole = user?.role;

  const selectedFleetIds = useTimbanganStore((state) => state.selectedFleetIds);
  const fleetConfigs = useTimbanganStore((state) => state.fleetConfigs);
  const loadFleetConfigsFromAPI = useTimbanganStore((state) => state.loadFleetConfigsFromAPI);
  const error = useTimbanganStore((state) => state.error);
  const clearError = useTimbanganStore((state) => state.clearError);

  // ============================================
  // STATE
  // ============================================
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingFleet, setIsRefreshingFleet] = useState(false);

  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [bypassData, setbypassData] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [autoPrintData, setAutoPrintData] = useState(null);

  const autoPrintButtonRef = useRef(null);

  // ============================================
  // COMPUTED
  // ============================================
  const allSelectedFleets = useMemo(() => {
    if (fleetConfigs.length === 0) return [];
    return fleetConfigs.filter((f) => selectedFleetIds.includes(f.id));
  }, [fleetConfigs, selectedFleetIds]);

  const fleetCounts = useMemo(() => {
    return { total: allSelectedFleets.length };
  }, [allSelectedFleets]);

  const filteredbypassData = useMemo(() => {
    let filtered = bypassData;

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.tanggal || item.createdAt || item.timestamp);
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
  }, [bypassData, dateRange]);

  const allSelected = useMemo(() => {
    return (
      filteredbypassData.length > 0 &&
      selectedItems.length === filteredbypassData.length
    );
  }, [filteredbypassData.length, selectedItems.length]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleDateRangeChange = useCallback((range) => {
    const normalized = {
      from: range.from || range.startDate
        ? new Date(range.from || range.startDate)
        : null,
      to: range.to || range.endDate ? new Date(range.to || range.endDate) : null,
      shift: range.shift || "All",
    };

    if (normalized.from) normalized.from.setHours(0, 0, 0, 0);
    if (normalized.to) normalized.to.setHours(23, 59, 59, 999);

    setDateRange(normalized);
  }, []);

  const loadbypassData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const result = await bypassServices.fetchbypassData({
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString(),
        forceRefresh,
      });

      if (result.success) {
        setbypassData(result.data);
      } else {
        showToast.error(result.error || "Gagal memuat data");
      }
    } catch (error) {
      showToast.error("Gagal memuat data");
      console.error("Load bypass data error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const handleRefresh = useCallback(async () => {
    await loadbypassData(true);
    showToast.success("Data berhasil di-refresh");
  }, [loadbypassData]);

  const handleRefreshFleet = useCallback(async () => {
    setIsRefreshingFleet(true);
    try {
      await loadFleetConfigsFromAPI(true);
      showToast.success(TOAST_MESSAGES.SUCCESS.FLEET_REFRESH);
    } catch (error) {
      showToast.error(TOAST_MESSAGES.ERROR.FLEET_REFRESH_FAILED);
    } finally {
      setIsRefreshingFleet(false);
    }
  }, [loadFleetConfigsFromAPI]);

  const handleOpenForm = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingItem(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (submissionData) => {
      try {
        setIsActionLoading(true);

        if (submissionData.cancelled) {
          handleCloseForm();
          return { success: false };
        }

        const result = await bypassServices.submitbypassEntry(submissionData);

        if (result.success) {
          handleCloseForm();
          await loadbypassData(true);

          // Auto print
          setAutoPrintData(result.data);
          setTimeout(() => {
            if (autoPrintButtonRef.current) {
              autoPrintButtonRef.current.click();
            }
          }, AUTO_PRINT_DELAY);

          // Re-open form for operator_jt
          if (userRole === USER_ROLES.OPERATOR_JT) {
            setTimeout(() => {
              handleOpenForm();
            }, REOPEN_FORM_DELAY);
          }

          showToast.success("Data berhasil disimpan");
          return { success: true };
        }

        throw new Error(result.error || "Gagal menyimpan data");
      } catch (error) {
        showToast.error(error.message || "Gagal menyimpan data");
        return { success: false };
      } finally {
        setIsActionLoading(false);
      }
    },
    [handleCloseForm, loadbypassData, userRole, handleOpenForm]
  );

  const handleEditItem = useCallback((item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const handleCloseEditForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  const handleEditSubmit = useCallback(
    async (submissionData) => {
      try {
        setIsActionLoading(true);

        if (submissionData.cancelled) {
          handleCloseEditForm();
          return { success: false };
        }

        const result = await bypassServices.editbypassEntry(
          submissionData,
          editingItem.id
        );

        if (result.success) {
          handleCloseEditForm();
          await loadbypassData(true);
          showToast.success("Data berhasil diperbarui");
          return { success: true };
        }

        throw new Error(result.error || "Gagal memperbarui data");
      } catch (error) {
        showToast.error(error.message || "Gagal memperbarui data");
        return { success: false };
      } finally {
        setIsActionLoading(false);
      }
    },
    [editingItem, handleCloseEditForm, loadbypassData]
  );

  const handleDeleteItem = useCallback((item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    try {
      const result = await bypassServices.deletebypassEntry(itemToDelete.id);

      if (result.success) {
        setShowDeleteDialog(false);
        setItemToDelete(null);
        await loadbypassData(true);
        showToast.success("Data berhasil dihapus");
      } else {
        throw new Error(result.error || "Gagal menghapus data");
      }
    } catch (error) {
      showToast.error(error.message || "Gagal menghapus data");
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, loadbypassData]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
  }, []);

  const toggleSelectItem = useCallback((id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedItems((prev) =>
      prev.length === filteredbypassData.length
        ? []
        : filteredbypassData.map((item) => item.id)
    );
  }, [filteredbypassData]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      try {
        // Load fleet configs first
        await loadFleetConfigsFromAPI(false, {
          from: dateRange.from?.toISOString().split("T")[0],
          to: dateRange.to?.toISOString().split("T")[0],
        });

        // Load bypass data
        await loadbypassData(false);
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!isInitialLoading) {
      const timeoutId = setTimeout(() => {
        loadbypassData(true);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [dateRange.from, dateRange.to, dateRange.shift, isInitialLoading]);

  useEffect(() => {
    if (showForm || isFormOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showForm, isFormOpen]);

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
              Timbangan Bypass
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Welcome back, {user?.username}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleOpenForm} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Input Entry
            </Button>
          </div>
        </div>

        {/* Fleet Status */}
        <FleetStatusCard
          isInitialLoading={isInitialLoading}
          fleetCounts={fleetCounts}
          allSelectedFleets={allSelectedFleets}
          onOpenFleetDialog={() => {}}
          onRefreshFleet={handleRefreshFleet}
          isRefreshingFleet={isRefreshingFleet}
        />

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
            title="Data Bypass"
            shipments={filteredbypassData}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onToggleSelect={toggleSelectItem}
            onToggleSelectAll={toggleSelectAll}
            selectedItems={selectedItems}
            allSelected={allSelected}
            isLoading={isLoading}
            isDeleting={isDeleting}
            showSelection={false}
            showActions={true}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onRefresh={handleRefresh}
            allTimbanganData={bypassData}
            allSelectedFleets={allSelectedFleets}
            onOpenInputForm={handleOpenForm}
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
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between z-10 shadow-sm border-b">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                  Input bypass Entry
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Input data ritase dari bypass
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseForm}
                className="h-8 w-8 p-0 dark:text-gray-400"
                disabled={isActionLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6">
              <BypassScaleForm
                onSubmit={handleFormSubmit}
                isSubmitting={isActionLoading}
                mode="create"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isFormOpen && editingItem && (
        <TimbanganDetailModal
          item={editingItem}
          isOpen={isFormOpen}
          onClose={handleCloseEditForm}
          onEdit={handleEditSubmit}
          onDelete={handleDeleteItem}
          userRole={userRole}
        />
      )}

      {/* Delete Confirmation - You can reuse existing modal */}

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isActionLoading && !showForm && !isFormOpen}
        message="Processing..."
      />

      {/* Hidden Auto-Print Button */}
      {autoPrintData && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <PrintTicketButton
            ref={autoPrintButtonRef}
            data={autoPrintData}
            onAfterPrint={() => {
              setTimeout(() => {
                setAutoPrintData(null);
              }, 1000);
            }}
          />
        </div>
      )}
    </>
  );
};

export default TimbanganBypassManagement;