import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

const FleetBulkOperations = ({
  fleets = [],
  selectedIds = [],
  onSelectionChange,
  onBulkDelete,
  canDelete = false,
  isProcessing = false,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [localProcessing, setLocalProcessing] = useState(false);

  const selectedFleets = useMemo(() => {
    return fleets.filter((fleet) => selectedIds.includes(fleet.id));
  }, [fleets, selectedIds]);

  const allSelected = useMemo(() => {
    return fleets.length > 0 && selectedIds.length === fleets.length;
  }, [fleets.length, selectedIds.length]);

  const someSelected = useMemo(() => {
    return selectedIds.length > 0 && !allSelected;
  }, [selectedIds.length, allSelected]);

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(fleets.map((f) => f.id));
    }
  }, [allSelected, fleets, onSelectionChange]);

  const confirmDelete = useCallback(async () => {
    if (!onBulkDelete) return;

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
  }, [selectedIds, onBulkDelete, onSelectionChange]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const processing = isProcessing || localProcessing;

  if (selectedIds.length === 0) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-300 dark:bg-gray-900">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected || undefined}
          onCheckedChange={handleSelectAll}
          className="dark:border-gray-600 cursor-pointer"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Pilih fleet untuk operasi bulk (hapus)
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
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
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => !processing && setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan"
        description={`Anda akan menghapus ${selectedIds.length} fleet. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Semua"
        isProcessing={processing}
        variant="destructive"
        icon={Trash2}
      >
        <div className="my-4 space-y-3">
          <div>
            <p className="text-sm font-medium mb-2 dark:text-gray-200">
              Fleet yang akan dihapus:
            </p>
            <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-1 border dark:border-gray-700 rounded p-2">
              {selectedFleets.slice(0, 15).map((fleet) => (
                <div
                  key={fleet.id}
                  className="text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded dark:text-gray-300"
                >
                  <div className="font-medium">{fleet.excavator}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {fleet.workUnit}
                  </div>
                </div>
              ))}
              {selectedFleets.length > 15 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Dan {selectedFleets.length - 15} fleet lainnya...
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Total yang akan dihapus:{" "}
              <strong>{selectedIds.length} fleet</strong>
            </p>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
};

export default FleetBulkOperations;
