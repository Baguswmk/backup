import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { X } from "lucide-react";

import CheckpointHeader from "@/modules/timbangan/checkpoint/components/CheckpointHeader";
import FleetStatusCard from "@/modules/timbangan/checkpoint/components/FleetStatusCard";
import CheckpointModals from "@/modules/timbangan/checkpoint/components/CheckpointModals";
import { CheckpointTable } from "@/modules/timbangan/checkpoint/components/CheckpointTable";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import PrintTicketButton from "@/modules/timbangan/timbangan/components/PrintTicketButton";

import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { checkpointService } from "@/modules/timbangan/checkpoint/services/checkpointService";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

import {
  getInitialDateRange,
  DEBOUNCE_TIME,
  AUTO_PRINT_DELAY,
  REOPEN_FORM_DELAY,
  FLEET_REFRESH_DELAY,
  DATE_FILTER_DEBOUNCE,
  TOAST_MESSAGES,
  FORM_MODES,
  USER_ROLES,
  KEYBOARD_SHORTCUTS,
  TIMBANGAN_TYPES,
} from "@/modules/timbangan/checkpoint/constant/checkpointConstants";

const CheckPointManagement = ({ Type }) => {
  const selectedItems = useTimbanganStore((state) => state.selectedItems);
  const error = useTimbanganStore((state) => state.error);
  const selectedFleetIds = useTimbanganStore((state) => state.selectedFleetIds);
  const fleetConfigs = useTimbanganStore((state) => state.fleetConfigs);
  const clearError = useTimbanganStore((state) => state.clearError);
  const toggleSelectItem = useTimbanganStore((state) => state.toggleSelectItem);
  const toggleSelectAll = useTimbanganStore((state) => state.toggleSelectAll);
  const loadFleetConfigsFromAPI = useTimbanganStore(
    (state) => state.loadFleetConfigsFromAPI,
  );
  const setSelectedFleets = useTimbanganStore(
    (state) => state.setSelectedFleets,
  );

  const { user } = useAuthStore();
  const userRole = user?.role;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingFleet, setIsRefreshingFleet] = useState(false);

  const [showInputForm, setShowInputForm] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showFleetDialog, setShowFleetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [formMode, setFormMode] = useState(FORM_MODES.CREATE);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [autoPrintData, setAutoPrintData] = useState(null);
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  const [lastClickTime, setLastClickTime] = useState(0);
  const [localTimbanganData, setLocalTimbanganData] = useState([]);

  const autoPrintButtonRef = useRef(null);
  const initialLoadDone = useRef(false);

  const allSelectedFleets = useMemo(() => {
    if (fleetConfigs.length === 0) return [];
    return fleetConfigs.filter((f) => selectedFleetIds.includes(f.id));
  }, [fleetConfigs, selectedFleetIds]);

  const dataFleet = allSelectedFleets.filter((f) => {
    const measurementType = f.measurementType || f.measurement_type;
    return measurementType === "Bypass";
  });

  const setSelectedFleetsByType = useTimbanganStore(
    (state) => state.setSelectedFleetsByType,
  );

  const fleetCounts = useMemo(() => {
    return {
      total: dataFleet.length,
    };
  }, [dataFleet]);

  const filteredTimbanganData = useMemo(() => {
    let filtered = localTimbanganData;

    if (dateRange.from || dateRange.to) {
      const beforeFilter = filtered.length;

      filtered = filtered.filter((item) => {
        const itemDate = new Date(
          item.tanggal || item.createdAt || item.timestamp,
        );

        if (isNaN(itemDate.getTime())) {
          console.warn("⚠️ Invalid date for item:", item.id);
          return false;
        }

        const itemDateNormalized = new Date(itemDate);
        itemDateNormalized.setHours(0, 0, 0, 0);

        const fromNormalized = dateRange.from ? new Date(dateRange.from) : null;
        const toNormalized = dateRange.to ? new Date(dateRange.to) : null;

        if (fromNormalized) fromNormalized.setHours(0, 0, 0, 0);
        if (toNormalized) toNormalized.setHours(0, 0, 0, 0);

        const passFrom =
          !fromNormalized || itemDateNormalized >= fromNormalized;
        const passTo = !toNormalized || itemDateNormalized <= toNormalized;

        return passFrom && passTo;
      });
    }

    if (dateRange.shift && dateRange.shift !== "All") {
      const beforeFilter = filtered.length;

      filtered = filtered.filter((item) => {
        const itemShift = item.shift || item.fleet_shift || "";
        return itemShift === dateRange.shift;
      });
    }

    return filtered;
  }, [localTimbanganData, dateRange]);

  const allSelected = useMemo(() => {
    return (
      filteredTimbanganData.length > 0 &&
      selectedItems.length === filteredTimbanganData.length
    );
  }, [filteredTimbanganData.length, selectedItems.length]);

  const handleOpenInputForm = useCallback(async () => {
    const now = Date.now();
    if (now - lastClickTime < DEBOUNCE_TIME) return;
    setLastClickTime(now);
    setShowInputForm(true);
  }, [lastClickTime]);

  const handleRefreshFleet = async () => {
    setIsRefreshingFleet(true);
    try {
      await loadFleetConfigsFromAPI(true);
      showToast.success(TOAST_MESSAGES.SUCCESS.FLEET_REFRESH);
    } catch (error) {
      showToast.error(TOAST_MESSAGES.ERROR.FLEET_REFRESH_FAILED);
    } finally {
      setIsRefreshingFleet(false);
    }
  };

  const loadTimbanganData = async (dateRange, forceRefresh = false) => {
    setIsRefreshing(true);
    try {
      const result = await checkpointService.fetchCheckpointData({
        startDate: dateRange?.from,
        endDate: dateRange?.to,
        user,
        forceRefresh,
      });

      if (result.success) {
        setLocalTimbanganData(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showToast.error(TOAST_MESSAGES.ERROR.LOAD_FAILED);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDateRangeChange = useCallback(
    (range) => {
      const fromDate =
        range.from || range.startDate
          ? new Date(range.from || range.startDate)
          : null;
      const toDate =
        range.to || range.endDate ? new Date(range.to || range.endDate) : null;

      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);

      const normalized = {
        from: fromDate,
        to: toDate,
        shift: range.shift || "All",
      };

      setDateRange(normalized);

      if (!isInitialLoading && initialLoadDone.current) {
        loadTimbanganData(
          {
            from: normalized.from,
            to: normalized.to,
          },
          true,
        );
      }
    },
    [isInitialLoading, loadTimbanganData],
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadTimbanganData({ from: dateRange.from, to: dateRange.to }, true),
      loadFleetConfigsFromAPI(
        true,
        { from: dateRange.from, to: dateRange.to },
        "Bypass",
      ),
    ]);
    showToast.success(TOAST_MESSAGES.SUCCESS.REFRESH);
  }, [dateRange]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedItems.length === 0) {
      showToast.warning(TOAST_MESSAGES.WARNING.NO_SELECTION);
      return;
    }

    setItemToDelete({
      isMultiple: true,
      count: selectedItems.length,
      ids: selectedItems,
    });
    setShowDeleteDialog(true);
  }, [selectedItems]);

  const handleAddShipment = useCallback(
    async (result) => {
      console.log("🔥 [CheckPoint] handleAddShipment called with:", result);

      try {
        setIsActionLoading(true);

        if (result.cancelled) {
          console.log("❌ [CheckPoint] User cancelled");
          setShowInputForm(false);
          return;
        }

        const isQueued = result?.queued === true;
        const shouldClose = result?.shouldClose === true;

        console.log("🔍 [CheckPoint] Detection:", {
          isQueued,
          shouldClose,
          hasData: !!result?.data,
          success: result?.success,
        });

        if (result.success) {
          if (isQueued || (shouldClose && !result.data)) {
            console.log(
              "📦 [CheckPoint] Data queued - CLOSING MODAL IMMEDIATELY",
            );

            setShowInputForm(false);

            console.log("✅ [CheckPoint] Modal closed, showInputForm =", false);

            showToast.info(
              "📦 Data disimpan di queue dan akan otomatis tersinkron saat online",
              { duration: 4000 },
            );

            if (userRole === USER_ROLES.OPERATOR_JT) {
              console.log(
                "⏱️ [CheckPoint] Scheduling reopen in",
                REOPEN_FORM_DELAY,
                "ms",
              );
              setTimeout(() => {
                console.log("🔄 [CheckPoint] Reopening form...");
                handleOpenInputForm();
              }, REOPEN_FORM_DELAY);
            }

            return;
          }

          if (result.data) {
            console.log("✅ [CheckPoint] Success with data");

            if (shouldClose) {
              console.log("🚪 [CheckPoint] Closing modal (success with data)");
              setShowInputForm(false);
            }

            await loadTimbanganData(
              { from: dateRange.from, to: dateRange.to },
              true,
            );

            setAutoPrintData(result.data);
            setTimeout(() => {
              if (autoPrintButtonRef.current) {
                autoPrintButtonRef.current.click();
              }
            }, AUTO_PRINT_DELAY);

            if (userRole === USER_ROLES.OPERATOR_JT) {
              setTimeout(() => {
                handleOpenInputForm();
              }, REOPEN_FORM_DELAY);
            }

            showToast.success("Data berhasil disimpan");
          }
        } else {
          console.error("❌ [CheckPoint] Submit failed:", result.error);
          showToast.error(result.error || TOAST_MESSAGES.ERROR.SAVE_FAILED);
        }
      } catch (error) {
        console.error("❌ [CheckPoint] Exception:", error);
        showToast.error(TOAST_MESSAGES.ERROR.SAVE_FAILED);
      } finally {
        setIsActionLoading(false);
        console.log("🏁 [CheckPoint] handleAddShipment finished");
      }
    },
    [dateRange, userRole, handleOpenInputForm],
  );

  const handleEditItem = useCallback((item, mode = FORM_MODES.EDIT) => {
    setEditingItem(item);
    setFormMode(mode);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormMode(FORM_MODES.CREATE);
  }, []);

  const handleEditSubmit = useCallback(
    async (result) => {
      try {
        setIsActionLoading(true);

        if (result.cancelled) {
          handleCloseForm();
          return;
        }

        if (result.success) {
          showToast.success(result.message || TOAST_MESSAGES.SUCCESS.UPDATE);
          handleCloseForm();
          await loadTimbanganData(
            { from: dateRange.from, to: dateRange.to },
            true,
          );
        } else {
          showToast.error(result.error || TOAST_MESSAGES.ERROR.UPDATE_FAILED);
        }
      } catch (error) {
        showToast.error(TOAST_MESSAGES.ERROR.UPDATE_FAILED);
      } finally {
        setIsActionLoading(false);
      }
    },
    [editingItem, handleCloseForm, dateRange],
  );

  const handleDeleteItem = useCallback((item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    try {
      if (itemToDelete.isMultiple) {
        showToast.success(`${itemToDelete.count} data berhasil dihapus`);
        setShowDeleteDialog(false);
        setItemToDelete(null);
        await loadTimbanganData(
          { from: dateRange.from, to: dateRange.to },
          true,
        );
        return;
      }

      const result = await checkpointService.deleteCheckpointEntry(
        itemToDelete.id,
      );

      if (result.success) {
        showToast.success(
          result.message || TOAST_MESSAGES.SUCCESS.DELETE_SINGLE,
        );
        setShowDeleteDialog(false);
        setItemToDelete(null);
        await loadTimbanganData(
          { from: dateRange.from, to: dateRange.to },
          true,
        );
      } else {
        throw new Error(result.error || TOAST_MESSAGES.ERROR.DELETE_FAILED);
      }
    } catch (error) {
      showToast.error(error.message || TOAST_MESSAGES.ERROR.DELETE_FAILED);
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, dateRange]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
  }, []);

  const handleSaveFleetSelection = useCallback(
    (selectedConfigs) => {
      setSelectedFleetsByType(selectedConfigs, "Bypass");

      const ids = selectedConfigs.map((c) => c.id);
      setSelectedFleets(ids);

      showToast.success(
        TOAST_MESSAGES.SUCCESS.FLEET_SELECTION(selectedConfigs.length),
      );

      setTimeout(() => {
        const state = useTimbanganStore.getState();
        const idx = state.dtIndexByType.Bypass || {};

        if (Object.keys(idx).length === 0) {
          console.warn("⚠️ Index kosong setelah save, rebuild manual...");
          const configs = state.fleetConfigsByType.Bypass || [];
          const selectedIds = state.selectedFleetIdsByType.Bypass || [];

          if (configs.length > 0 && selectedIds.length > 0) {
            state._executeIndexRebuild(configs, "Bypass");
          }
        }
      }, 300);
    },
    [setSelectedFleets, setSelectedFleetsByType],
  );

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const initializeData = async () => {
      setIsInitialLoading(true);

      try {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const initialDateRange = {
          from: startOfDay,
          to: endOfDay,
          shift: "All",
        };

        setDateRange(initialDateRange);

        await loadFleetConfigsFromAPI(
          false,
          {
            from: initialDateRange.from,
            to: initialDateRange.to,
          },
          "Bypass",
        );

        await new Promise((resolve) => setTimeout(resolve, 300));

        const data = await loadTimbanganData(
          {
            from: initialDateRange.from,
            to: initialDateRange.to,
          },
          true,
        );
      } catch (error) {
        console.error("❌ Initial load error:", error);
        showToast.error(TOAST_MESSAGES.ERROR.LOAD_FAILED);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (showInputForm || isFormOpen || showFleetDialog) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showInputForm, isFormOpen, showFleetDialog]);

  useEffect(() => {
    const handleShortcut = (e) => {
      const { key, altKey } = KEYBOARD_SHORTCUTS.INPUT_FORM;
      if (e.altKey === altKey && e.key.toLowerCase() === key) {
        e.preventDefault();
        if (!showInputForm && !isFormOpen) {
          handleOpenInputForm();
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [showInputForm, isFormOpen, handleOpenInputForm]);

  return (
    <>
      <div className="space-y-6 min-h-screen">
        <CheckpointHeader
          username={user?.username}
          onOpenInputForm={handleOpenInputForm}
          isInitialLoading={isInitialLoading}
          isCheckingConnection={false}
          type={Type}
        />

        <FleetStatusCard
          isInitialLoading={isInitialLoading}
          fleetCounts={fleetCounts}
          allSelectedFleets={dataFleet}
          onOpenFleetDialog={() => setShowFleetDialog(true)}
          onRefreshFleet={handleRefreshFleet}
          isRefreshingFleet={isRefreshingFleet}
        />

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
          <CheckpointTable
            title="Data Check Point"
            userRole={userRole}
            shipments={filteredTimbanganData}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onToggleSelect={toggleSelectItem}
            onToggleSelectAll={toggleSelectAll}
            isDeleting={isDeleting}
            isLoading={isRefreshing}
            selectedItems={selectedItems}
            allSelected={allSelected}
            dateRange={dateRange}
            onRefresh={handleRefresh}
            showSelection={true}
            showActions={true}
            deleteSelectedItems={handleDeleteSelected}
            onDateRangeChange={handleDateRangeChange}
            allTimbanganData={localTimbanganData}
            fleetCounts={fleetCounts}
            allSelectedFleets={allSelectedFleets}
            onOpenInputForm={handleOpenInputForm}
            onOpenFleetDialog={() => setShowFleetDialog(true)}
            onResetDateFilter={() => {
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              setDateRange({ from: today, to: today, shift: "All" });
            }}
          />
        )}
      </div>

      <CheckpointModals
        showInputForm={showInputForm}
        onCloseInputForm={() => setShowInputForm(false)}
        onSubmitInputForm={handleAddShipment}
        isActionLoading={isActionLoading}
        shouldAutoConnect={false}
        onAutoConnectComplete={() => {}}
        isFormOpen={isFormOpen}
        onCloseEditForm={handleCloseForm}
        onSubmitEditForm={handleEditSubmit}
        editingItem={editingItem}
        formMode={formMode}
        showDeleteDialog={showDeleteDialog}
        onCloseDeleteDialog={handleCancelDelete}
        onConfirmDelete={handleConfirmDelete}
        itemToDelete={itemToDelete}
        isDeleting={isDeleting}
        showFleetDialog={showFleetDialog}
        onCloseFleetDialog={() => setShowFleetDialog(false)}
        onSaveFleetSelection={handleSaveFleetSelection}
        measurementType="Bypass"
        timbanganType={TIMBANGAN_TYPES.CHECKPOINT}
      />

      <LoadingOverlay
        isVisible={isActionLoading && !showInputForm && !isFormOpen}
        message="Processing..."
      />

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

export default CheckPointManagement;
