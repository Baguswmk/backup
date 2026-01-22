import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { RefreshCw, Settings, CheckCircle2, Search, Loader2, Calendar, Truck, MapPin } from "lucide-react";
import EmptyState from "@/shared/components/EmptyState";
import ModalHeader from "@/shared/components/ModalHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { showToast } from "@/shared/utils/toast";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

const FleetSelectionDialog = ({ 
  isOpen, 
  onClose, 
  onSave,
  measurementType = "Timbangan"
}) => {
  const fleetConfigs = useRitaseStore((state) => state.fleetConfigs);
  const selectedFleetIds = useRitaseStore((state) => state.selectedFleetIds);
  const loadFleetConfigsFromAPI = useRitaseStore((state) => state.loadFleetConfigsFromAPI);
  const [tempSelectedIds, setTempSelectedIds] = useState([...selectedFleetIds]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshingFleet, setIsRefreshingFleet] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);

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
    loadFleetConfigsFromAPI(true, measurementType) 
      .catch((error) => {
        console.error("❌ Failed to load fleet data:", error);
        showToast.error("Gagal memuat data fleet");
      })
      .finally(() => {
        setIsLoadingInitial(false);
      });
  }, [isOpen, measurementType, loadFleetConfigsFromAPI]);

  const { filterDataBySatker } = useFleetPermissions();

  const { filteredFleets, counts } = useMemo(() => {
    // Filter by satker permission
    const accessibleFleets = filterDataBySatker(fleetConfigs);

    // Filter by measurement type only
    const measurementFilteredFleets = accessibleFleets.filter((fleet) => {
      const fleetMeasurementType = fleet.measurementType || fleet.measurement_type;
      return fleetMeasurementType === measurementType;
    });
    
    const countsData = {
      all: measurementFilteredFleets.length,
      selected: tempSelectedIds.filter((id) =>
        measurementFilteredFleets.some((f) => f.id === id)
      ).length,
    };

    return { filteredFleets: measurementFilteredFleets, counts: countsData };
  }, [fleetConfigs, tempSelectedIds, filterDataBySatker, measurementType]);

  const searchedFleets = useMemo(() => {
    if (!debouncedSearch.trim()) return filteredFleets;

    const query = debouncedSearch.toLowerCase();
    return filteredFleets.filter(
      (fleet) =>
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

// Di FleetSelectionDialog.jsx - UPDATE handleSave

const handleSave = useCallback(() => {
    const selectedConfigs = searchedFleets.filter(f => 
      tempSelectedIds.includes(f.id)
    );
    
    onSave(selectedConfigs);
    onClose();
}, [tempSelectedIds, searchedFleets, onSave, onClose]);

  const handleRefreshFleet = useCallback(async () => {
    setIsRefreshingFleet(true);
    try {
      await loadFleetConfigsFromAPI(true, measurementType); 
      showToast.success("Data fleet berhasil diperbarui");
    } catch (error) {
      showToast.error("Gagal memperbarui data fleet");
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshingFleet(false);
    }
  }, [loadFleetConfigsFromAPI, measurementType]);

  if (!isOpen) return null;

  const getTitle = () => {
    switch(measurementType) {
      case "Bypass":
        return "Pilih Fleet Bypass";
      case "Beltscale":
        return "Pilih Fleet Beltscale";
      default:
        return "Pilih Fleet Timbangan";
    }
  };

  return (
    <div className="detail-modal fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col dark:border dark:border-gray-700">
        <ModalHeader
          title={getTitle()}
          subtitle={`Pilih fleet yang ingin ditampilkan (Filter: Satker & ${measurementType})`}
          icon={Settings}
          onClose={onClose}
        />

        <div className="px-6 py-4 shadow-sm space-y-3">
          <div className="flex gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                placeholder="Cari fleet (nama, excavator, shift, work unit)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-none hover:bg-gray-200 cursor-pointer focus:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-200 dark:focus:bg-slate-700"
                disabled={isLoadingInitial}
              />
            </div>
            
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
                  ? `Tidak ada fleet ${measurementType}`
                  : "Tidak ditemukan fleet yang sesuai pencarian"
              }
              description={
                filteredFleets.length === 0
                  ? `Tidak ada fleet dengan tipe ${measurementType} atau Anda tidak memiliki akses.`
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
                                 <Badge
                                  variant="outline"
                                  className="text-xs border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300"
                                >
                                  {measurementType}
                                </Badge>
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                               
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

        <div className="sticky bottom-0 bg-neutral-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t dark:border-gray-700">
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
              className="cursor-pointer hover:bg-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-200"
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