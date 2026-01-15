/* eslint-disable no-unused-vars */
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

// Components
import TimbanganHeader from "@/modules/timbangan/timbangan/components/TimbanganHeader";
import FleetStatusCard from "@/modules/timbangan/timbangan/components/FleetStatusCard";
import TimbanganModals from "@/modules/timbangan/timbangan/components/TimbanganModals";
import { TimbanganTable } from "@/modules/timbangan/timbangan/components/TimbanganTable";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import PrintTicketButton from "@/modules/timbangan/timbangan/components/PrintTicketButton";

// Store & Services
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { timbanganServices } from "@/modules/timbangan/timbangan/services/timbanganServices";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

// Constants
import {
  getInitialDateRange,
  DEBOUNCE_TIME,
  AUTO_OPEN_DELAY,
  AUTO_PRINT_DELAY,
  REOPEN_FORM_DELAY,
  FLEET_REFRESH_DELAY,
  DATE_FILTER_DEBOUNCE,
  CONNECTION_CHECK_TIMEOUT,
  TOAST_MESSAGES,
  FORM_MODES,
  USER_ROLES,
  KEYBOARD_SHORTCUTS,
} from "@/modules/timbangan/timbangan/constant/timbanganConstants";

const CheckPointManagement = () => {
  // ============================================
  // ZUSTAND STORE
  // ============================================
  const selectedItems = useTimbanganStore((state) => state.selectedItems);
  const error = useTimbanganStore((state) => state.error);
  const timbanganData = useTimbanganStore((state) => state.timbanganData);
  const selectedFleetIds = useTimbanganStore((state) => state.selectedFleetIds);
  const digifleetSelectedIds = useTimbanganStore(
    (state) => state.digifleetSelectedIds || []
  );
  const fleetConfigs = useTimbanganStore((state) => state.fleetConfigs);
  const clearError = useTimbanganStore((state) => state.clearError);
  const toggleSelectItem = useTimbanganStore((state) => state.toggleSelectItem);
  const toggleSelectAll = useTimbanganStore((state) => state.toggleSelectAll);
  const addTimbanganEntry = useTimbanganStore(
    (state) => state.addTimbanganEntry
  );
  const updateTimbanganEntry = useTimbanganStore(
    (state) => state.updateTimbanganEntry
  );
  const deleteTimbanganEntry = useTimbanganStore(
    (state) => state.deleteTimbanganEntry
  );
  const deleteMultipleTimbanganEntries = useTimbanganStore(
    (state) => state.deleteMultipleTimbanganEntries
  );
  const loadTimbanganDataFromAPI = useTimbanganStore(
    (state) => state.loadTimbanganDataFromAPI
  );
  const loadFleetConfigsFromAPI = useTimbanganStore(
    (state) => state.loadFleetConfigsFromAPI
  );
  const autoFetchTimbanganData = useTimbanganStore(
    (state) => state.autoFetchTimbanganData
  );
  const setSelectedFleets = useTimbanganStore(
    (state) => state.setSelectedFleets
  );
  const setDigifleetSelected = useTimbanganStore(
    (state) => state.setDigifleetSelected
  );
  const hideDumptruck = useTimbanganStore((state) => state.hideDumptruck);
  const unhideDumptruck = useTimbanganStore((state) => state.unhideDumptruck);

  // ============================================
  // AUTH & USER
  // ============================================
  const { user } = useAuthStore();
  const userRole = user?.role;

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingFleet, setIsRefreshingFleet] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Form & Modal States
  const [showInputForm, setShowInputForm] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showFleetDialog, setShowFleetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Data States
  const [editingItem, setEditingItem] = useState(null);
  const [formMode, setFormMode] = useState(FORM_MODES.CREATE);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [shouldAutoConnect, setShouldAutoConnect] = useState(false);
  const [autoPrintData, setAutoPrintData] = useState(null);
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  // UI States
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isFleetInitialized, setIsFleetInitialized] = useState(false);

  // ============================================
  // REFS
  // ============================================
  const autoOpenTriggeredRef = useRef(false);
  const autoPrintButtonRef = useRef(null);
  const initialLoadDone = useRef(false);
  const firstDateRangeSet = useRef(false);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const allSelectedFleets = useMemo(() => {
    if (fleetConfigs.length === 0) return [];

    const timbangan = fleetConfigs.filter(
      (f) => selectedFleetIds.includes(f.id) && !f.id_digifleet
    );
    const digifleet = fleetConfigs.filter(
      (f) => digifleetSelectedIds.includes(f.id) && f.id_digifleet
    );

    return [...timbangan, ...digifleet];
  }, [fleetConfigs, selectedFleetIds, digifleetSelectedIds]);

  const fleetCounts = useMemo(() => {
    const timbangan = allSelectedFleets.filter((f) => !f.id_digifleet);
    const digifleet = allSelectedFleets.filter((f) => f.id_digifleet);

    return {
      total: allSelectedFleets.length,
      timbangan: timbangan.length,
      digifleet: digifleet.length,
    };
  }, [allSelectedFleets]);

  const filteredTimbanganData = useMemo(() => {
    let filtered = timbanganData;

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

  // ============================================
  // HANDLERS
  // ============================================
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
        setTimeout(() => reject(new Error("Timeout")), CONNECTION_CHECK_TIMEOUT)
      );
      const portsPromise = navigator.serial.getPorts();
      const ports = await Promise.race([portsPromise, timeoutPromise]);

      setShouldAutoConnect(ports.length > 0);
      setShowInputForm(true);
    } catch (error) {
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
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadTimbanganDataFromAPI({ from: dateRange.from, to: dateRange.to }, true),
        loadFleetConfigsFromAPI(true, { from: dateRange.from, to: dateRange.to }),
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
      try {
        setIsActionLoading(true);

        if (result.cancelled) {
          setShowInputForm(false);
          setShouldAutoConnect(false);
          return;
        }

        if (result.success && result.data) {
          setShowInputForm(false);
          setShouldAutoConnect(false);

          if (result.data.hull_no) {
            hideDumptruck(result.data.hull_no, "submitted");
          }

          try {
            await loadTimbanganDataFromAPI(
              { from: dateRange.from, to: dateRange.to },
              true
            );
          } catch (error) {
            addTimbanganEntry(result.data);
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
        } else {
          showToast.error(result.error || TOAST_MESSAGES.ERROR.SAVE_FAILED);
        }
      } catch (error) {
        showToast.error(TOAST_MESSAGES.ERROR.SAVE_FAILED);
      } finally {
        setIsActionLoading(false);
      }
    },
    [
      addTimbanganEntry,
      dateRange,
      loadTimbanganDataFromAPI,
      hideDumptruck,
      userRole,
      handleOpenInputForm,
    ]
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

          try {
            await loadTimbanganDataFromAPI(
              { from: dateRange.from, to: dateRange.to },
              true
            );
          } catch (error) {
            updateTimbanganEntry(editingItem.id, result.data);
          }
        } else {
          showToast.error(result.error || TOAST_MESSAGES.ERROR.UPDATE_FAILED);
        }
      } catch (error) {
        showToast.error(TOAST_MESSAGES.ERROR.UPDATE_FAILED);
      } finally {
        setIsActionLoading(false);
      }
    },
    [editingItem, updateTimbanganEntry, handleCloseForm, dateRange, loadTimbanganDataFromAPI]
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

        try {
          await loadTimbanganDataFromAPI(
            { from: dateRange.from, to: dateRange.to },
            true
          );
        } catch (error) {
          deleteMultipleTimbanganEntries(itemToDelete.ids);
        }
        return;
      }

      const result = await timbanganServices.deleteTimbanganEntry(itemToDelete.id);

      if (result.success) {
        if (itemToDelete.hull_no) {
          unhideDumptruck(itemToDelete.hull_no);
        }

        showToast.success(result.message || TOAST_MESSAGES.SUCCESS.DELETE_SINGLE);
        setShowDeleteDialog(false);
        setItemToDelete(null);

        try {
          await loadTimbanganDataFromAPI(
            { from: dateRange.from, to: dateRange.to },
            true
          );
        } catch (error) {
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
    deleteTimbanganEntry,
    deleteMultipleTimbanganEntries,
    unhideDumptruck,
    dateRange,
    loadTimbanganDataFromAPI,
  ]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
  }, []);

  const handleSaveFleetSelection = useCallback(
    (allIds) => {
      const fleetConfigs = useTimbanganStore.getState().fleetConfigs;

      const timbanganIds = allIds.filter((id) => {
        const fleet = fleetConfigs.find((f) => f.id === id);
        return fleet && !fleet.id_digifleet;
      });

      const digifleetIds = allIds.filter((id) => {
        const fleet = fleetConfigs.find((f) => f.id === id);
        return fleet && fleet.id_digifleet;
      });

      setSelectedFleets(timbanganIds);
      setDigifleetSelected(digifleetIds);

      showToast.success(
        TOAST_MESSAGES.SUCCESS.FLEET_SELECTION(timbanganIds.length, digifleetIds.length)
      );
    },
    [setSelectedFleets, setDigifleetSelected]
  );

  // ============================================
  // EFFECTS
  // ============================================

  // Initial data load
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    setIsInitialLoading(true);

    const initializeData = async () => {
      try {
        const currentState = useTimbanganStore.getState();
        const hasExistingFleets = currentState.fleetConfigs.length > 0;
        const hasSelectedFleets =
          currentState.selectedFleetIds.length > 0 ||
          currentState.digifleetSelectedIds.length > 0;

        if (!hasExistingFleets && !hasSelectedFleets) {
          const today = new Date();
          const todayStr = today.toISOString().split("T")[0];

          await loadFleetConfigsFromAPI(false, {
            from: todayStr,
            to: todayStr,
          });

          await new Promise((resolve) => setTimeout(resolve, FLEET_REFRESH_DELAY));
        }

        await autoFetchTimbanganData({
          from: dateRange.from,
          to: dateRange.to,
        });

        firstDateRangeSet.current = true;
        setIsFleetInitialized(true);
      } catch (error) {
        showToast.error(TOAST_MESSAGES.ERROR.LOAD_FAILED);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initializeData();
  }, []);

  // Date range change effect
  useEffect(() => {
    if (!isInitialLoading && initialLoadDone.current && firstDateRangeSet.current) {
      const timeoutId = setTimeout(() => {
        loadTimbanganDataFromAPI(
          { from: dateRange.from, to: dateRange.to },
          true
        );
      }, DATE_FILTER_DEBOUNCE);

      return () => clearTimeout(timeoutId);
    }
  }, [dateRange.from, dateRange.to, dateRange.shift]);

  // Auto-open form for operator_jt
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

  // Prevent body scroll when modals open
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

  // Keyboard shortcuts
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

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <div className="space-y-6 min-h-screen">
        {/* Header */}
        <TimbanganHeader
          username={user?.username}
          onOpenInputForm={handleOpenInputForm}
          isInitialLoading={isInitialLoading}
          isCheckingConnection={isCheckingConnection}
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
        // Input Form
        showInputForm={showInputForm}
        onCloseInputForm={() => {
          setShowInputForm(false);
          setShouldAutoConnect(false);
        }}
        onSubmitInputForm={handleAddShipment}
        isActionLoading={isActionLoading}
        shouldAutoConnect={shouldAutoConnect}
        onAutoConnectComplete={() => setShouldAutoConnect(false)}
        // Edit Form
        isFormOpen={isFormOpen}
        onCloseEditForm={handleCloseForm}
        onSubmitEditForm={handleEditSubmit}
        editingItem={editingItem}
        formMode={formMode}
        // Delete
        showDeleteDialog={showDeleteDialog}
        onCloseDeleteDialog={handleCancelDelete}
        onConfirmDelete={handleConfirmDelete}
        itemToDelete={itemToDelete}
        isDeleting={isDeleting}
        // Fleet
        showFleetDialog={showFleetDialog}
        onCloseFleetDialog={() => setShowFleetDialog(false)}
        onSaveFleetSelection={handleSaveFleetSelection}
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

export default CheckPointManagement;