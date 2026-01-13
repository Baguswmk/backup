import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { RefreshCw, Settings, CheckCircle2, Search, Loader2, Calendar, Truck, MapPin } from "lucide-react";
import EmptyState from "@/shared/components/EmptyState";
import ModalHeader from "@/shared/components/ModalHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { DateRangePicker } from "@/shared/components/DateRangePicker";
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { showToast } from "@/shared/utils/toast";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import { getTodayDateRange } from "@/shared/utils/date";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

const FleetSelectionDialog = ({ isOpen, onClose, onSave }) => {
  const fleetConfigs = useTimbanganStore((state) => state.fleetConfigs);
  const selectedFleetIds = useTimbanganStore((state) => state.selectedFleetIds);
  const loadFleetConfigsFromAPI = useTimbanganStore((state) => state.loadFleetConfigsFromAPI);
  const persistedDateRange = useTimbanganStore((state) => state.fleetSelectionDateRange);
  const setFleetSelectionDateRange = useTimbanganStore((state) => state.setFleetSelectionDateRange);

  const [tempSelectedIds, setTempSelectedIds] = useState([...selectedFleetIds]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshingFleet, setIsRefreshingFleet] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);

  const [dateRange, setDateRange] = useState(() => {
    if (persistedDateRange) return persistedDateRange;
    return getTodayDateRange();
  });

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "unset";
      }
  
      return () => {
        document.body.style.overflow = "unset";
      };
    }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTempSelectedIds([...selectedFleetIds]);
    }
  }, [isOpen, selectedFleetIds]);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingInitial(true);
    loadFleetConfigsFromAPI(true, dateRange)
      .catch((error) => {
        console.error("❌ Failed to load fleet data:", error);
        showToast.error("Gagal memuat data fleet");
      })
      .finally(() => {
        setIsLoadingInitial(false);
      });
  }, [isOpen, dateRange.from, dateRange.to, dateRange.shift, loadFleetConfigsFromAPI]);

  const { filterDataBySatker } = useFleetPermissions();

  const { filteredFleets, counts } = useMemo(() => {
    const accessibleFleets = filterDataBySatker(fleetConfigs);
    
    const activeFleets = accessibleFleets.filter((fleet) => fleet.status === "ACTIVE");
    
    const countsData = {
      all: activeFleets.length,
      selected: tempSelectedIds.filter((id) =>
        accessibleFleets.some((f) => f.id === id)
      ).length,
    };

    return { filteredFleets: activeFleets, counts: countsData };
  }, [fleetConfigs, tempSelectedIds, filterDataBySatker]);

  const searchedFleets = useMemo(() => {
    if (!debouncedSearch.trim()) return filteredFleets;

    const query = debouncedSearch.toLowerCase();
    return filteredFleets.filter(
      (fleet) =>
        fleet.name?.toLowerCase().includes(query) ||
        fleet.excavator?.toLowerCase().includes(query) ||
        fleet.shift?.toLowerCase().includes(query) ||
        fleet.workUnit?.toLowerCase().includes(query)
    );
  }, [filteredFleets, debouncedSearch]);

  const handleToggle = useCallback((fleetId) => {
    setTempSelectedIds((prev) => {
      if (prev.includes(fleetId)) {
        return prev.filter((id) => id !== fleetId);
      }
      return [...prev, fleetId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (tempSelectedIds.length === searchedFleets.length) {
      setTempSelectedIds([]);
    } else {
      setTempSelectedIds(searchedFleets.map((f) => f.id));
    }
  }, [tempSelectedIds.length, searchedFleets]);

  const handleSave = useCallback(() => {
    setFleetSelectionDateRange(dateRange);
    onSave(tempSelectedIds);
    onClose();
  }, [dateRange, tempSelectedIds, setFleetSelectionDateRange, onSave, onClose]);

  const handleRefreshFleet = useCallback(async () => {
    setIsRefreshingFleet(true);
    try {
      await loadFleetConfigsFromAPI(true, dateRange);
      showToast.success("Data fleet berhasil diperbarui");
    } catch (error) {
      showToast.error("Gagal memperbarui data fleet");
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshingFleet(false);
    }
  }, [loadFleetConfigsFromAPI, dateRange]);

  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col dark:border dark:border-gray-700">
        <ModalHeader
          title="Pilih Fleet Timbangan"
          subtitle="Pilih fleet yang ingin ditampilkan - status ACTIVE only"
          icon={Settings}
          onClose={onClose}
        />

        <div className="px-6 py-4 shadow-sm space-y-3">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block dark:text-gray-200">
                Filter Tanggal & Shift
              </label>
              <DateRangePicker
                dateRange={dateRange}
                isLoading={isLoadingInitial || isRefreshingFleet}
                onDateRangeChange={(newRange) => {
                  const updatedRange = {
                    from: newRange.from,
                    to: newRange.to,
                    shift: newRange.shift,
                  };
                  setDateRange(updatedRange);

                  setIsRefreshingFleet(true);
                  loadFleetConfigsFromAPI(true, updatedRange).finally(() =>
                    setIsRefreshingFleet(false)
                  );
                }}
                shiftOptions={[
                  { value: "all", label: "Semua Shift" },
                  { value: "Shift 1", label: "Shift 1" },
                  { value: "Shift 2", label: "Shift 2" },
                  { value: "Shift 3", label: "Shift 3" },
                ]}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-200"
              disabled={isLoadingInitial}
            >
              Fleet Timbangan ({counts.all})
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshFleet}
              disabled={isRefreshingFleet || isLoadingInitial}
              className="cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              title="Refresh data fleet dari server"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshingFleet ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Cari fleet (nama, excavator, shift, work unit)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-none hover:bg-gray-200 cursor-pointer focus:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-200"
              disabled={isLoadingInitial}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  searchedFleets.length > 0 &&
                  tempSelectedIds.length === searchedFleets.length
                }
                onCheckedChange={handleSelectAll}
                disabled={isLoadingInitial || searchedFleets.length === 0}
                className="dark:text-gray-200"
              />
              <span className="text-sm font-medium dark:text-gray-200">
                Pilih Semua ({searchedFleets.length} fleet)
              </span>
            </div>

            <Badge
              variant="secondary"
              className="dark:bg-gray-700 dark:text-gray-200"
            >
              {counts.selected} fleet dipilih
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 dark:bg-gray-900">
          {isLoadingInitial ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Memuat data fleet...
              </p>
            </div>
          ) : searchedFleets.length === 0 ? (
            <EmptyState
              icon={Settings}
              title={
                filteredFleets.length === 0
                  ? "Tidak ada fleet ACTIVE"
                  : "Tidak ditemukan fleet yang sesuai pencarian"
              }
              description={
                filteredFleets.length === 0
                  ? "Semua fleet sedang INACTIVE atau CLOSED. Aktifkan fleet terlebih dahulu di Fleet Management."
                  : "Coba ubah kata kunci pencarian"
              }
            />
          ) : (
            <div className="space-y-3">
              {searchedFleets.map((fleet) => {
                const isSelected = tempSelectedIds.includes(fleet.id);
                const dtCount = fleet.dumptruckCount || fleet.dumptruck?.length || 0;

                return (
                  <Card
                    key={fleet.id}
                    className={`cursor-pointer transition-all dark:bg-gray-800 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    onClick={() => handleToggle(fleet.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(fleet.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 dark:text-gray-200"
                        />

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-base dark:text-gray-200">
                                {fleet.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant="ghost"
                                  className="text-xs dark:border-gray-600 dark:text-gray-300"
                                >
                                  {fleet.shift}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className="text-xs dark:bg-gray-700 dark:text-gray-300"
                                >
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(fleet.date).toLocaleDateString(
                                    "id-ID"
                                  )}
                                </Badge>
                                <Badge
                                  variant="success"
                                  className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {fleet.status}
                                </Badge>
                              </div>
                            </div>

                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Settings className="w-3 h-3" />
                              <span>Excavator: {fleet.excavator}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Truck className="w-3 h-3" />
                              <span>DT: {dtCount} unit</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>Load: {fleet.loadingLocation}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <MapPin className="w-3 h-3 text-red-600 dark:text-red-400" />
                              <span>Dump: {fleet.dumpingLocation}</span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Work Unit: {fleet.workUnit || "-"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {counts.selected > 0 ? (
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {counts.selected} fleet dipilih
              </span>
            ) : (
              <span>Belum ada fleet yang dipilih</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="cursor-pointer hover:bg-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              className="cursor-pointer hover:bg-gray-200 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-200"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Simpan Pilihan ({counts.selected})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetSelectionDialog;