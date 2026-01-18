// FleetBulkOperations.jsx - Enhanced Bulk Operations
import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  CheckSquare,
  Square,
  Trash2,
  XCircle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

const FleetBulkOperations = ({
  fleets = [],
  selectedIds = [],
  onSelectionChange,
  onBulkStatusChange,
  onBulkDelete,
  canUpdate = false,
  canDelete = false,
  isProcessing = false,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);
  const [localProcessing, setLocalProcessing] = useState(false);

  // Memoized selected fleets
  const selectedFleets = useMemo(() => {
    return fleets.filter((fleet) => selectedIds.includes(fleet.id));
  }, [fleets, selectedIds]);

  // Check if all fleets on current page are selected
  const allSelected = useMemo(() => {
    return fleets.length > 0 && selectedIds.length === fleets.length;
  }, [fleets.length, selectedIds.length]);

  // Check if some (but not all) fleets are selected
  const someSelected = useMemo(() => {
    return selectedIds.length > 0 && !allSelected;
  }, [selectedIds.length, allSelected]);

  // Count fleets by status
  const statusCounts = useMemo(() => {
    const counts = { ACTIVE: 0, INACTIVE: 0, CLOSED: 0 };
    selectedFleets.forEach((fleet) => {
      if (counts[fleet.status] !== undefined) {
        counts[fleet.status]++;
      }
    });
    return counts;
  }, [selectedFleets]);

  // Validate if delete operation is allowed
  const deleteValidation = useMemo(() => {
    const activeFleets = selectedFleets.filter(f => f.status === "ACTIVE");
    const hasActiveFleets = activeFleets.length > 0;
    
    return {
      isValid: !hasActiveFleets,
      message: hasActiveFleets 
        ? `Tidak dapat menghapus ${activeFleets.length} fleet dengan status ACTIVE. Ubah status terlebih dahulu.`
        : null,
      activeCount: activeFleets.length,
    };
  }, [selectedFleets]);

  // Handle select all toggle
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(fleets.map((f) => f.id));
    }
  }, [allSelected, fleets, onSelectionChange]);

  // Handle status change
  const handleStatusChange = useCallback((status) => {
    setTargetStatus(status);
    setShowStatusDialog(true);
  }, []);

  // Confirm status change
  const confirmStatusChange = useCallback(async () => {
    if (!onBulkStatusChange) return;
    
    setLocalProcessing(true);
    try {
      await onBulkStatusChange(selectedIds, targetStatus);
      setShowStatusDialog(false);
      onSelectionChange([]);
    } catch (error) {
      console.error("Error bulk status change:", error);
    } finally {
      setLocalProcessing(false);
    }
  }, [selectedIds, targetStatus, onBulkStatusChange, onSelectionChange]);

  // Confirm delete
  const confirmDelete = useCallback(async () => {
    if (!onBulkDelete || !deleteValidation.isValid) return;
    
    setLocalProcessing(true);
    try {
      await onBulkDelete(selectedIds);
      setShowDeleteDialog(false);
      onSelectionChange([]);
    } catch (error) {
      console.error("Error bulk delete:", error);
    } finally {
      setLocalProcessing(false);
    }
  }, [selectedIds, onBulkDelete, onSelectionChange, deleteValidation.isValid]);

  // Handle delete click with validation
  const handleDeleteClick = useCallback(() => {
    if (!deleteValidation.isValid) {
      // Show validation error in dialog
      setShowDeleteDialog(true);
    } else {
      setShowDeleteDialog(true);
    }
  }, [deleteValidation.isValid]);

  const processing = isProcessing || localProcessing;

  // Empty state - no selection
  if (selectedIds.length === 0) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 ">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected || undefined}
          onCheckedChange={handleSelectAll}
          className="dark:border-gray-600 "
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Pilih fleet untuk operasi bulk (ubah status atau hapus)
        </span>
      </div>
    );
  }

  // Active state - with selections
  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        {/* Selection Info */}
        <div className="flex items-center gap-3 flex-1 dark:text-gray-200">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onCheckedChange={handleSelectAll}
            className="dark:border-blue-600"
            disabled={processing}
          />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-300">
              {selectedIds.length} fleet dipilih
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {statusCounts.ACTIVE > 0 && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  {statusCounts.ACTIVE} Active
                </Badge>
              )}
              {statusCounts.INACTIVE > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  {statusCounts.INACTIVE} Inactive
                </Badge>
              )}
              {statusCounts.CLOSED > 0 && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  {statusCounts.CLOSED} Closed
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Status Change Dropdown */}
          {/* {canUpdate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Ubah Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                <DropdownMenuItem
                  onClick={() => handleStatusChange("ACTIVE")}
                  className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700"
                  disabled={processing}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  Set ke Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange("INACTIVE")}
                  className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700"
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                  Set ke Inactive
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-gray-700" />
                <DropdownMenuItem
                  onClick={() => handleStatusChange("CLOSED")}
                  className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700"
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                  Set ke Closed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )} */}

          {/* Delete Button */}
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              className="cursor-pointer dark:bg-red-600 dark:hover:bg-red-700"
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Hapus ({selectedIds.length})
            </Button>
          )}

          {/* Cancel Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
            className="cursor-pointer dark:text-gray-300 dark:hover:bg-gray-700"
            disabled={processing}
          >
            Batalkan
          </Button>
        </div>
      </div>

      {/* Status Change Dialog */}
      <ConfirmDialog
        isOpen={showStatusDialog}
        onClose={() => !processing && setShowStatusDialog(false)}
        onConfirm={confirmStatusChange}
        title="Konfirmasi Perubahan Status"
        description={`Anda akan mengubah status ${selectedIds.length} fleet menjadi ${targetStatus}. Apakah Anda yakin?`}
        confirmLabel="Ya, Ubah Status"
        isProcessing={processing}
        icon={CheckCircle2}
      >
        <div className="my-4">
          <p className="text-sm font-medium mb-2 dark:text-gray-200">
            Fleet yang akan diubah:
          </p>
          <div className="max-h-60 overflow-y-auto space-y-1 border dark:border-gray-700 rounded p-2">
            {selectedFleets.slice(0, 15).map((fleet) => (
              <div
                key={fleet.id}
                className="text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded dark:text-gray-300 flex items-center justify-between"
              >
                <span className="flex-1">{fleet.excavator}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {fleet.status} → {targetStatus}
                </span>
              </div>
            ))}
            {selectedFleets.length > 15 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Dan {selectedFleets.length - 15} fleet lainnya...
              </p>
            )}
          </div>
        </div>
      </ConfirmDialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => !processing && setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan"
        description={
          deleteValidation.isValid
            ? `Anda akan menghapus ${selectedIds.length} fleet. Tindakan ini tidak dapat dibatalkan.`
            : "Tidak dapat melanjutkan penghapusan"
        }
        confirmLabel={deleteValidation.isValid ? "Ya, Hapus Semua" : "  "}
        isProcessing={processing}
        variant={deleteValidation.isValid ? "destructive" : "default"}
        icon={deleteValidation.isValid ? Trash2 : AlertTriangle}
        confirmDisabled={!deleteValidation.isValid}
      >
        <div className="my-4 space-y-3">
          {/* Validation Error */}
          {!deleteValidation.isValid && (
            <Alert variant="destructive" className="border-red-200 dark:border-red-800 text-slate-700">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <p className="text-sm font-medium">{deleteValidation.message}</p>
                <p className="text-xs mt-1">
                  Ubah status fleet menjadi INACTIVE atau CLOSED terlebih dahulu sebelum menghapus.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Fleet List */}
          <div>
            <p className="text-sm font-medium mb-2 dark:text-gray-200">
              Fleet yang akan dihapus:
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 border dark:border-gray-700 rounded p-2">
              {selectedFleets.slice(0, 15).map((fleet) => (
                <div
                  key={fleet.id}
                  className={`text-sm p-2 rounded dark:text-gray-300 flex items-center justify-between ${
                    fleet.status === "ACTIVE"
                      ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      : "bg-gray-50 dark:bg-gray-900"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{fleet.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {fleet.excavator} 
                    </div>
                  </div>
                  <Badge
                    className={
                      fleet.status === "ACTIVE"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        : fleet.status === "INACTIVE"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                    }
                  >
                    {fleet.status}
                  </Badge>
                </div>
              ))}
              {selectedFleets.length > 15 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Dan {selectedFleets.length - 15} fleet lainnya...
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          {deleteValidation.isValid && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 space-y-1">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Total yang akan dihapus: <strong>{selectedIds.length} fleet</strong>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Status: {statusCounts.INACTIVE} Inactive, {statusCounts.CLOSED} Closed
              </p>
            </div>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
};

export default FleetBulkOperations;
