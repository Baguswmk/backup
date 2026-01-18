import { useState, useEffect, useMemo } from "react";
import {
  Eye,
  Search,
  ChevronDown,
  Loader2,
  Trash2,
  ArrowRight,
  X,
} from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/shared/components/ui/dropdown-menu";
import ModalHeader from "@/shared/components/ModalHeader";
import StatusBadge from "@/shared/components/StatusBadge";
import EmptyState from "@/shared/components/EmptyState";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { cn } from "@/lib/utils";

const DumpTruckDetailModal = ({
  isOpen,
  onClose,
  setting,
  availableFleets = [],
  onMoveUnit,
  onBulkDelete,
  onRefresh, // ✅ NEW: Add refresh callback
}) => {
  const [query, setQuery] = useState("");
  const [operatorsMap, setOperatorsMap] = useState({});
  const [isLoadingOperators, setIsLoadingOperators] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [targetFleet, setTargetFleet] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ NEW: Local state to track current units
  const [localUnits, setLocalUnits] = useState([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setQuery("");
      setSelectedUnits([]);
      setShowBulkActions(false);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // ✅ NEW: Sync local units with setting prop
  useEffect(() => {
    if (setting?.units) {
      setLocalUnits(setting.units);
    }
  }, [setting?.units]);

  useEffect(() => {
    if (!isOpen) return;

    const loadOperators = async () => {
      setIsLoadingOperators(true);
      try {
        const ops = await masterDataService.fetchOperators();
        const map = {};
        ops.forEach((op) => {
          map[String(op.id)] = op.name;
        });
        setOperatorsMap(map);
      } catch (error) {
        console.error("Failed to load operators:", error);
      } finally {
        setIsLoadingOperators(false);
      }
    };

    loadOperators();
  }, [isOpen]);

  if (!setting) return null;

  // ✅ CHANGED: Use localUnits instead of setting.units
  const units = localUnits || [];
  
  const filtered = units.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.hull_no?.toLowerCase().includes(q) ||
      u.company?.toLowerCase().includes(q) ||
      u.workUnit?.toLowerCase().includes(q) ||
      (u.status || "").toLowerCase().includes(q)
    );
  });

  const currentFleetId = setting.fleet?.id;
  const availableTargetFleets = (availableFleets || []).filter(
    (f) => String(f.id) !== String(currentFleetId)
  );

  const isAllSelected =
    filtered.length > 0 && selectedUnits.length === filtered.length;
  const isSomeSelected =
    selectedUnits.length > 0 && selectedUnits.length < filtered.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedUnits([]);
    } else {
      setSelectedUnits([...filtered]);
    }
  };

  const handleToggleUnit = (unit) => {
    setSelectedUnits((prev) => {
      const exists = prev.find((u) => u.id === unit.id);
      if (exists) {
        return prev.filter((u) => u.id !== unit.id);
      } else {
        return [...prev, unit];
      }
    });
  };

  // ✅ ENHANCED: Handle bulk delete with real-time update
  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedUnits.length === 0) return;

    setIsProcessing(true);
    try {
      const result = await onBulkDelete(
        setting.id,
        selectedUnits.map((u) => u.id)
      );

      if (result?.success) {
        // ✅ Update local state immediately
        const deletedIds = selectedUnits.map(u => u.id);
        setLocalUnits(prev => prev.filter(u => !deletedIds.includes(u.id)));
        
        // Close dialog and reset state
        setShowDeleteConfirm(false);
        setSelectedUnits([]);
        setShowBulkActions(false);

        // ✅ Trigger parent refresh
        if (onRefresh) {
          await onRefresh();
        }

        // Check if all units were deleted - close modal if true
        if (units.length === selectedUnits.length) {
          setTimeout(() => {
            onClose?.();
          }, 300);
        }
      } else {
        console.error("Bulk delete failed:", result?.error);
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ ENHANCED: Handle bulk move with real-time update
  const handleBulkMove = async () => {
    if (!onMoveUnit || !targetFleet || selectedUnits.length === 0) return;

    setIsProcessing(true);
    try {
      let allSuccess = true;
      
      for (const unit of selectedUnits) {
        const result = await onMoveUnit(setting.id, unit.id, targetFleet.id);
        if (!result?.success) {
          allSuccess = false;
          break;
        }
      }

      if (allSuccess) {
        // ✅ Update local state immediately
        const movedIds = selectedUnits.map(u => u.id);
        setLocalUnits(prev => prev.filter(u => !movedIds.includes(u.id)));
        
        // Close dialogs and reset state
        setShowMoveConfirm(false);
        setTargetFleet(null);
        setSelectedUnits([]);
        setShowBulkActions(false);

        // ✅ Trigger parent refresh
        if (onRefresh) {
          await onRefresh();
        }

        // Check if all units were moved - close modal if true
        if (units.length === selectedUnits.length) {
          setTimeout(() => {
            onClose?.();
          }, 300);
        }
      }
    } catch (error) {
      console.error("Bulk move error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenMoveDialog = (fleet) => {
    setTargetFleet(fleet);
    setShowMoveConfirm(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <ModalHeader
            title={`Unit Dump Truck • ${setting.fleet?.name || "–"}`}
            subtitle={`Fleet: ${setting.fleet?.excavator || "-"} • ${setting.fleet?.workUnit || "-"}`}
            icon={Eye}
            onClose={onClose}
          />

          <div className="p-6 space-y-4">
            {/* Search and Bulk Actions Toggle */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder="Cari unit (hull_no, company, workUnit, status)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={cn(
                    "pl-10 border-none hover:bg-gray-200 cursor-pointer",
                    "dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                  )}
                />
              </div>

              <Button
                variant={showBulkActions ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowBulkActions(!showBulkActions);
                  if (showBulkActions) {
                    setSelectedUnits([]);
                  }
                }}
                className="cursor-pointer dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                {showBulkActions ? "Batal Pilih" : "Pilih Unit"}
              </Button>
            </div>

            {/* Bulk Actions Bar */}
            {showBulkActions && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        const input = el.querySelector("input");
                        if (input) {
                          input.indeterminate =
                            isSomeSelected && !isAllSelected;
                        }
                      }
                    }}
                    onCheckedChange={handleToggleAll}
                    className="dark:text-gray-200"
                  />
                  <span className="text-sm font-medium dark:text-gray-200">
                    {selectedUnits.length > 0
                      ? `${selectedUnits.length} unit dipilih`
                      : "Pilih semua unit"}
                  </span>
                </div>

                {selectedUnits.length > 0 && (
                  <div className="flex items-center gap-2">
                    {onBulkDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="cursor-pointer gap-2"
                        disabled={isProcessing}
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus ({selectedUnits.length})
                      </Button>
                    )}

                    {onMoveUnit && availableTargetFleets.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                            disabled={isProcessing}
                          >
                            <ArrowRight className="w-4 h-4" />
                            Pindah ({selectedUnits.length})
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-80 bg-white border-none dark:bg-gray-800 dark:border-gray-700"
                        >
                          <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                            Pilih Fleet Tujuan
                          </div>
                          {availableTargetFleets.map((fleet) => (
                            <DropdownMenuItem
                              key={fleet.id}
                              onClick={() => handleOpenMoveDialog(fleet)}
                              className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {fleet.excavator}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <EmptyState
                icon={Eye}
                title="Tidak ada unit"
                description={
                  query
                    ? "Tidak ada unit yang cocok dengan pencarian Anda."
                    : "Belum ada unit dump truck di fleet ini."
                }
              />
            ) : (
              <div className="rounded-md overflow-hidden border dark:border-gray-700">
                <div
                  className={cn(
                    "grid gap-2 px-3 py-2 text-xs font-medium",
                    showBulkActions ? "grid-cols-6" : "grid-cols-5",
                    "bg-gray-50 dark:bg-gray-900",
                    "text-gray-600 dark:text-gray-400"
                  )}
                >
                  {showBulkActions && <div></div>}
                  <div>Hull No</div>
                  <div>Company</div>
                  <div>Status</div>
                  <div>Operator</div>
                  {!showBulkActions && <div className="text-right">Aksi</div>}
                </div>

                <div className="max-h-96 overflow-auto">
                  {filtered.map((u) => {
                    const isSelected = selectedUnits.some(
                      (su) => su.id === u.id
                    );

                    return (
                      <div
                        key={u.id}
                        className={cn(
                          "grid gap-2 px-3 py-2 text-sm items-center",
                          showBulkActions ? "grid-cols-6" : "grid-cols-5",
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700",
                          "border-b border-gray-100 dark:border-gray-700",
                          "dark:text-gray-300"
                        )}
                      >
                        {showBulkActions && (
                          <div className="flex items-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleUnit(u)}
                              className="dark:text-gray-200"
                            />
                          </div>
                        )}

                        <div className="font-medium dark:text-gray-200">
                          {u.hull_no}
                        </div>
                        <div>{u.company || "-"}</div>
                        <div>
                          <StatusBadge status={u.status || "active"} />
                        </div>
                        <div className="text-sm">
                          {isLoadingOperators ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            operatorsMap[String(u.operatorId)] || "-"
                          )}
                        </div>

                        {!showBulkActions && (
                          <div className="text-right">
                            {onMoveUnit ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      "h-7 gap-2 cursor-pointer hover:bg-gray-200 disabled:cursor-not-allowed",
                                      "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                    )}
                                    disabled={
                                      availableTargetFleets.length === 0
                                    }
                                  >
                                    Pindah
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className={cn(
                                    "w-80 bg-white border-none",
                                    "dark:bg-gray-800 dark:border-gray-700"
                                  )}
                                >
                                  <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    Pilih Fleet Tujuan (per Unit)
                                  </div>
                                  {availableTargetFleets.map((fleet) => (
                                    <DropdownMenuItem
                                      key={fleet.id}
                                      onClick={() =>
                                        onMoveUnit?.(setting.id, u.id, fleet.id)
                                      }
                                      className={cn(
                                        "cursor-pointer",
                                        "dark:text-gray-200 dark:hover:bg-gray-700"
                                      )}
                                    >
                                     {fleet.excavator}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                –
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 flex justify-end border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={onClose}
              className={cn(
                "cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200",
                "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              )}
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Hapus Unit Terpilih"
        description={`Apakah Anda yakin ingin menghapus ${selectedUnits.length} unit dari fleet ini?`}
        confirmLabel="Hapus"
        isProcessing={isProcessing}
        icon={Trash2}
      >
        <div className="rounded-md border p-3 text-sm space-y-2 dark:border-gray-700">
          <p className="font-medium dark:text-gray-200">
            Unit yang akan dihapus:
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {selectedUnits.map((unit) => (
              <div
                key={unit.id}
                className="flex items-center gap-2 text-sm py-1 dark:text-gray-300"
              >
                <X className="w-3 h-3 text-red-500" />
                <span>{unit.hull_no}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  ({unit.company})
                </span>
              </div>
            ))}
          </div>
        </div>
      </ConfirmDialog>

      {/* Move Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showMoveConfirm}
        onClose={() => {
          setShowMoveConfirm(false);
          setTargetFleet(null);
        }}
        onConfirm={handleBulkMove}
        title="Pindahkan Unit Terpilih"
        description={`Apakah Anda yakin ingin memindahkan ${selectedUnits.length} unit ke fleet berikut?`}
        confirmLabel="Pindahkan"
        isProcessing={isProcessing}
        icon={ArrowRight}
      >
        <div className="rounded-md border p-3 text-sm space-y-3 dark:border-gray-700">
          <div>
            <p className="font-medium mb-2 dark:text-gray-200">Fleet Tujuan:</p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <p className="font-medium dark:text-gray-200">
                {targetFleet?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {targetFleet?.excavator}
              </p>
            </div>
          </div>

          <div>
            <p className="font-medium mb-2 dark:text-gray-200">
              Unit yang akan dipindahkan:
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {selectedUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center gap-2 text-sm py-1 dark:text-gray-300"
                >
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>{unit.hull_no}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    ({unit.company})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
};

export default DumpTruckDetailModal;