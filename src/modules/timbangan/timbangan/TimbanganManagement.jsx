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

import TimbanganHeader from "@/modules/timbangan/timbangan/components/TimbanganHeader";
import FleetStatusCard from "@/modules/timbangan/timbangan/components/FleetStatusCard";
import TimbanganModals from "@/modules/timbangan/timbangan/components/TimbanganModals";
import { TimbanganTable } from "@/modules/timbangan/timbangan/components/TimbanganTable";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import PrintTicketButton from "@/modules/timbangan/timbangan/components/PrintTicketButton";

import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { timbanganServices } from "@/modules/timbangan/timbangan/services/timbanganServices";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

import {
  getInitialDateRange,
  DEBOUNCE_TIME,
  AUTO_OPEN_DELAY,
  AUTO_PRINT_DELAY,
  REOPEN_FORM_DELAY,
  FLEET_REFRESH_DELAY,
  CONNECTION_CHECK_TIMEOUT,
  TOAST_MESSAGES,
  FORM_MODES,
  USER_ROLES,
  KEYBOARD_SHORTCUTS,
  TIMBANGAN_TYPES,
} from "@/modules/timbangan/timbangan/constant/timbanganConstants";

const TimbanganManagement = ({ Type }) => {
  const selectedItems = useTimbanganStore((state) => state.selectedItems);
  const error = useTimbanganStore((state) => state.error);
  const timbanganData = useTimbanganStore((state) => state.timbanganData);
  const selectedFleetIds = useTimbanganStore((state) => state.selectedFleetIds);
  const fleetConfigs = useTimbanganStore((state) => state.fleetConfigs);
  const clearError = useTimbanganStore((state) => state.clearError);
  const toggleSelectItem = useTimbanganStore((state) => state.toggleSelectItem);
  const toggleSelectAll = useTimbanganStore((state) => state.toggleSelectAll);
  const addTimbanganEntry = useTimbanganStore(
    (state) => state.addTimbanganEntry,
  );
  const updateTimbanganEntry = useTimbanganStore(
    (state) => state.updateTimbanganEntry,
  );
  const deleteTimbanganEntry = useTimbanganStore(
    (state) => state.deleteTimbanganEntry,
  );
  const deleteMultipleTimbanganEntries = useTimbanganStore(
    (state) => state.deleteMultipleTimbanganEntries,
  );
  const loadTimbanganDataFromAPI = useTimbanganStore(
    (state) => state.loadTimbanganDataFromAPI,
  );
  const loadFleetConfigsFromAPI = useTimbanganStore(
    (state) => state.loadFleetConfigsFromAPI,
  );
  const setSelectedFleets = useTimbanganStore(
    (state) => state.setSelectedFleets,
  );
  const setSelectedFleetsByType = useTimbanganStore(
    (state) => state.setSelectedFleetsByType,
  );

  const hideDumptruck = useTimbanganStore((state) => state.hideDumptruck);
  const unhideDumptruck = useTimbanganStore((state) => state.unhideDumptruck);

  const { user } = useAuthStore();
  const userRole = user?.role;

  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingFleet, setIsRefreshingFleet] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const [showInputForm, setShowInputForm] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showFleetDialog, setShowFleetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [formMode, setFormMode] = useState(FORM_MODES.CREATE);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [shouldAutoConnect, setShouldAutoConnect] = useState(false);
  const [autoPrintData, setAutoPrintData] = useState(null);
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  const [lastClickTime, setLastClickTime] = useState(0);

  const autoOpenTriggeredRef = useRef(false);
  const autoPrintButtonRef = useRef(null);
  const initialLoadDone = useRef(false);
  const firstDateRangeSet = useRef(false);

  const allSelectedFleets = useMemo(() => {
    if (fleetConfigs.length === 0) return [];
    return fleetConfigs.filter((f) => selectedFleetIds.includes(f.id));
  }, [fleetConfigs, selectedFleetIds]);

  const dataFleet = allSelectedFleets.filter((f) => {
    const measurementType = f.measurementType || f.measurement_type;
    return measurementType === "Timbangan";
  });

  const fleetCounts = useMemo(() => {
    return {
      total: dataFleet.length,
    };
  }, [dataFleet]);

  const filteredTimbanganData = useMemo(() => {
    let filtered = timbanganData;

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(
          item.tanggal || item.createdAt || item.timestamp,
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
  }, [timbanganData, dateRange]);

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

    if (!navigator.serial) {
      showToast.warning(TOAST_MESSAGES.WARNING.NO_WEBSERIAL);
      setShowInputForm(true);
      setShouldAutoConnect(false);
      return;
    }

    setIsCheckingConnection(true);

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout")),
          CONNECTION_CHECK_TIMEOUT,
        ),
      );
      const portsPromise = navigator.serial.getPorts();
      const ports = await Promise.race([portsPromise, timeoutPromise]);

      setShouldAutoConnect(ports.length > 0);
      setShowInputForm(true);
    } catch (error) {
      console.warn("⚠️ Failed to check ports:", error.message);
      setShouldAutoConnect(false);
      setShowInputForm(true);
    } finally {
      setIsCheckingConnection(false);
    }
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

    const { loadTimbanganDataFromAPI } = useTimbanganStore.getState();

    setIsRefreshing(true);

    loadTimbanganDataFromAPI(
      { from: normalized.from, to: normalized.to },
      true,
      "Timbangan",
    )
      .then(() => {
        showToast.success("Data berhasil dimuat");
      })
      .catch((error) => {
        console.error("❌ Failed to load Timbangan data:", error);
        showToast.error("Gagal memuat data");
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormMode(FORM_MODES.CREATE);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadTimbanganDataFromAPI(
          { from: dateRange.from, to: dateRange.to },
          true,
          "Timbangan",
        ),
        loadFleetConfigsFromAPI(
          true,
          {
            from: dateRange.from,
            to: dateRange.to,
          },
          "Timbangan",
        ),
      ]);
      showToast.success(TOAST_MESSAGES.SUCCESS.REFRESH);
    } catch (error) {
      showToast.error(TOAST_MESSAGES.ERROR.REFRESH_FAILED);
    } finally {
      setIsRefreshing(false);
    }
  }, [dateRange, loadTimbanganDataFromAPI, loadFleetConfigsFromAPI]);

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
      console.log(
        "📥 [TimbanganManagement] handleAddShipment called with:",
        result,
      );

      try {
        setIsActionLoading(true);

        if (result.cancelled) {
          console.log("❌ [TimbanganManagement] User cancelled");
          setShowInputForm(false);
          setShouldAutoConnect?.(false);
          return;
        }

        const isQueued = result?.queued === true;
        const shouldClose = result?.shouldClose === true;

        console.log("🔍 [TimbanganManagement] Detection:", {
          isQueued,
          shouldClose,
          hasData: !!result?.data,
          success: result?.success,
        });

        if (result.success) {
          if (isQueued || (shouldClose && !result.data)) {
            console.log(
              "📤 [TimbanganManagement] Data queued - CLOSING MODAL IMMEDIATELY",
            );

            setShowInputForm(false);
            setShouldAutoConnect?.(false);

            console.log(
              "✅ [TimbanganManagement] Modal closed, showInputForm =",
              false,
            );

            showToast.info(
              "📤 Data disimpan di queue dan akan otomatis tersinkron saat online",
              { duration: 4000 },
            );

            if (userRole === USER_ROLES.OPERATOR_JT) {
              console.log(
                "⏱️ [TimbanganManagement] Scheduling reopen in",
                REOPEN_FORM_DELAY,
                "ms",
              );
              setTimeout(() => {
                console.log("🔄 [TimbanganManagement] Reopening form...");
                handleOpenInputForm();
              }, REOPEN_FORM_DELAY);
            }

            return;
          }

          if (result.data) {
            console.log("✅ [TimbanganManagement] Success with data");

            if (shouldClose) {
              console.log(
                "🚪 [TimbanganManagement] Closing modal (success with data)",
              );
              setShowInputForm(false);
              setShouldAutoConnect?.(false);
            }

            if (result.data.hull_no) {
              hideDumptruck(result.data.hull_no, "submitted");
            }

            try {
              await loadTimbanganDataFromAPI(
                { from: dateRange.from, to: dateRange.to },
                true,
              );
            } catch (error) {
              console.error("⚠️ Gagal reload data setelah submit:", error);
              addTimbanganEntry?.(result.data);
            }

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
          console.error(
            "❌ [TimbanganManagement] Submit failed:",
            result.error,
          );
          showToast.error(result.error || "Gagal menyimpan data");
        }
      } catch (error) {
        console.error("❌ [TimbanganManagement] Exception:", error);
        showToast.error("Gagal menyimpan data");
      } finally {
        setIsActionLoading(false);
        console.log("🏁 [TimbanganManagement] handleAddShipment finished");
      }
    },
    [
      dateRange,
      userRole,
      handleOpenInputForm,
      hideDumptruck,
      loadTimbanganDataFromAPI,
      addTimbanganEntry,
    ],
  );

  const handleEditSubmit = useCallback(
    async (result) => {
      try {
        setIsActionLoading(true);

        if (result.cancelled) {
          handleCloseForm();
          return;
        }

        const isQueued = result?.queued || false;

        if (result.success) {
          if (result.shouldClose || result.data) {
            handleCloseForm();
          }

          if (isQueued) {
            showToast.info(
              "📤 Perubahan disimpan offline dan akan tersinkron otomatis saat online",
              { duration: 4000 },
            );
            return;
          }

          if (result.data) {
            showToast.success(result.message || "Data berhasil diperbarui");

            try {
              await loadTimbanganDataFromAPI(
                { from: dateRange.from, to: dateRange.to },
                true,
              );
            } catch (error) {
              console.error("⚠️ Gagal reload data setelah edit:", error);
              updateTimbanganEntry?.(editingItem.id, result.data);
            }
          }
        } else {
          showToast.error(result.error || "Gagal memperbarui data");
        }
      } catch (error) {
        console.error("❌ Error in handleEditSubmit:", error);
        showToast.error("Gagal memperbarui data");
      } finally {
        setIsActionLoading(false);
      }
    },
    [
      editingItem,
      handleCloseForm,
      dateRange,
      loadTimbanganDataFromAPI,
      updateTimbanganEntry,
    ],
  );

  const handleEditItem = useCallback((item, mode = FORM_MODES.EDIT) => {
    setEditingItem(item);
    setFormMode(mode);
    setIsFormOpen(true);
  }, []);

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

        try {
          await loadTimbanganDataFromAPI(
            {
              from: dateRange.from,
              to: dateRange.to,
              user,
            },
            true,
          );
        } catch (error) {
          console.error("⚠️ Gagal reload data setelah delete:", error);
          deleteMultipleTimbanganEntries(itemToDelete.ids);
        }
        return;
      }

      const result = await timbanganServices.deleteTimbanganEntry(
        itemToDelete.id,
      );

      if (result.success) {
        if (itemToDelete.hull_no) {
          unhideDumptruck(itemToDelete.hull_no);
        }

        showToast.success(
          result.message || TOAST_MESSAGES.SUCCESS.DELETE_SINGLE,
        );
        setShowDeleteDialog(false);
        setItemToDelete(null);

        try {
          await loadTimbanganDataFromAPI(
            {
              from: dateRange.from,
              to: dateRange.to,
              user,
            },
            true,
          );
        } catch (error) {
          console.error("⚠️ Gagal reload data setelah delete:", error);
          deleteTimbanganEntry(itemToDelete.id);
        }
      } else {
        throw new Error(result.error || TOAST_MESSAGES.ERROR.DELETE_FAILED);
      }
    } catch (error) {
      showToast.error(error.message || TOAST_MESSAGES.ERROR.DELETE_FAILED);
    } finally {
      setIsDeleting(false);
    }
  }, [
    itemToDelete,
    loadTimbanganDataFromAPI,
    dateRange.from,
    dateRange.to,
    user,
    deleteMultipleTimbanganEntries,
    unhideDumptruck,
    deleteTimbanganEntry,
  ]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
  }, []);

  const handleSaveFleetSelection = useCallback(
    (selectedConfigs) => {
      setSelectedFleetsByType(selectedConfigs, "Timbangan");

      const ids = selectedConfigs.map((c) => c.id);
      setSelectedFleets(ids);

      showToast.success(
        TOAST_MESSAGES.SUCCESS.FLEET_SELECTION(selectedConfigs.length),
      );

      setTimeout(() => {
        const state = useTimbanganStore.getState();
        const idx = state.dtIndexByType.Timbangan || {};

        if (Object.keys(idx).length === 0) {
          console.warn("⚠️ Index kosong setelah save, rebuild manual...");
          const configs = state.fleetConfigsByType.Timbangan || [];
          const selectedIds = state.selectedFleetIdsByType.Timbangan || [];

          if (configs.length > 0 && selectedIds.length > 0) {
            state._executeIndexRebuild(configs, "Timbangan");
          }
        }
      }, 300);
    },
    [setSelectedFleets],
  );

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    setIsInitialLoading(true);

    const initializeData = async () => {
      try {
        const currentState = useTimbanganStore.getState();
        const hasExistingFleets = currentState.fleetConfigs.length > 0;
        const hasSelectedFleets = currentState.selectedFleetIds.length > 0;

        if (!hasExistingFleets && !hasSelectedFleets) {
          const today = new Date();
          const todayStr = today.toISOString().split("T")[0];

          await loadFleetConfigsFromAPI(
            false,
            { from: todayStr, to: todayStr },
            "Timbangan",
          );

          await new Promise((resolve) =>
            setTimeout(resolve, FLEET_REFRESH_DELAY),
          );
        }

        await loadTimbanganDataFromAPI(
          { from: dateRange.from, to: dateRange.to },
          false,
          "Timbangan",
        );

        firstDateRangeSet.current = true;
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
    if (
      autoOpenTriggeredRef.current ||
      userRole !== USER_ROLES.OPERATOR_JT ||
      isInitialLoading ||
      fleetCounts.total === 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      handleOpenInputForm();
      autoOpenTriggeredRef.current = true;
    }, AUTO_OPEN_DELAY);

    return () => clearTimeout(timer);
  }, [userRole, isInitialLoading, fleetCounts.total, handleOpenInputForm]);

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
        if (!showInputForm && !isFormOpen && !isCheckingConnection) {
          handleOpenInputForm();
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [showInputForm, isFormOpen, isCheckingConnection, handleOpenInputForm]);

  return (
    <>
      <div className="space-y-6 min-h-screen">
        {/* Header */}
        <TimbanganHeader
          username={user?.username}
          onOpenInputForm={handleOpenInputForm}
          isInitialLoading={isInitialLoading}
          isCheckingConnection={isCheckingConnection}
          type={Type}
        />

        {/* Fleet Status */}
        <FleetStatusCard
          isInitialLoading={isInitialLoading}
          fleetCounts={fleetCounts}
          allSelectedFleets={dataFleet}
          onOpenFleetDialog={() => setShowFleetDialog(true)}
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

        {/* Loading Skeleton or Data Table */}
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
            title="Data Timbangan"
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
            allTimbanganData={timbanganData}
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

      {/* All Modals */}
      <TimbanganModals
        showInputForm={showInputForm}
        onCloseInputForm={() => {
          setShowInputForm(false);
          setShouldAutoConnect(false);
        }}
        onSubmitInputForm={handleAddShipment}
        isActionLoading={isActionLoading}
        shouldAutoConnect={shouldAutoConnect}
        onAutoConnectComplete={() => setShouldAutoConnect(false)}
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
        measurementType="Timbangan"
        timbanganType={TIMBANGAN_TYPES.INTERNAL}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isActionLoading && !showInputForm && !isFormOpen}
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

export default TimbanganManagement;
