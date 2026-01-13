// FleetBulkActions.jsx - Bulk Operations Component
import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import ConfirmDialog from "@/shared/components/ConfirmDialog";

const FleetBulkActions = ({
  fleets = [],
  selectedIds = [],
  onSelectionChange,
  onBulkStatusChange,
  onBulkDelete,
  canUpdate = false,
  canDelete = false,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedFleets = useMemo(() => {
    return fleets.filter((fleet) => selectedIds.includes(fleet.id));
  }, [fleets, selectedIds]);

  const allSelected = useMemo(() => {
    return fleets.length > 0 && selectedIds.length === fleets.length;
  }, [fleets.length, selectedIds.length]);

  const someSelected = useMemo(() => {
    return selectedIds.length > 0 && !allSelected;
  }, [selectedIds.length, allSelected]);

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(fleets.map((f) => f.id));
    }
  };

  const handleStatusChange = async (status) => {
    setTargetStatus(status);
    setShowStatusDialog(true);
  };

  const confirmStatusChange = async () => {
    setIsProcessing(true);
    try {
      await onBulkStatusChange(selectedIds, targetStatus);
      setShowStatusDialog(false);
      onSelectionChange([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete(selectedIds);
      setShowDeleteDialog(false);
      onSelectionChange([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { ACTIVE: 0, INACTIVE: 0, CLOSED: 0 };
    selectedFleets.forEach((fleet) => {
      if (counts[fleet.status] !== undefined) {
        counts[fleet.status]++;
      }
    });
    return counts;
  }, [selectedFleets]);

  if (selectedIds.length === 0) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onCheckedChange={handleSelectAll}
          className="dark:border-gray-600"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Pilih fleet untuk aksi bulk
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-center gap-3 flex-1">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onCheckedChange={handleSelectAll}
            className="dark:border-blue-600"
          />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-300">
              {selectedIds.length} fleet dipilih
            </p>
            <div className="flex items-center gap-2 mt-1">
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

        <div className="flex items-center gap-2">
          {canUpdate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Ubah Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                <DropdownMenuItem
                  onClick={() => handleStatusChange("ACTIVE")}
                  className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  Set ke Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange("INACTIVE")}
                  className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <XCircle className="w-4 h-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                  Set ke Inactive
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-gray-700" />
                <DropdownMenuItem
                  onClick={() => handleStatusChange("CLOSED")}
                  className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <XCircle className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                  Set ke Closed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="cursor-pointer dark:bg-red-600 dark:hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus ({selectedIds.length})
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
            className="cursor-pointer dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Batalkan
          </Button>
        </div>
      </div>

      {/* Status Change Dialog */}
      <ConfirmDialog
        isOpen={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        onConfirm={confirmStatusChange}
        title="Konfirmasi Perubahan Status"
        description={`Anda akan mengubah status ${selectedIds.length} fleet menjadi ${targetStatus}. Apakah Anda yakin?`}
        confirmLabel="Ya, Ubah Status"
        isProcessing={isProcessing}
        icon={CheckCircle2}
      >
        <div className="my-4">
          <p className="text-sm font-medium mb-2 dark:text-gray-200">
            Fleet yang akan diubah:
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {selectedFleets.slice(0, 10).map((fleet) => (
              <div
                key={fleet.id}
                className="text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded dark:text-gray-300"
              >
                {fleet.name} ({fleet.status} → {targetStatus})
              </div>
            ))}
            {selectedFleets.length > 10 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Dan {selectedFleets.length - 10} fleet lainnya...
              </p>
            )}
          </div>
        </div>
      </ConfirmDialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan"
        description={`Anda akan menghapus ${selectedIds.length} fleet. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Semua"
        isProcessing={isProcessing}
        variant="destructive"
        icon={Trash2}
      >
        <div className="my-4">
          <p className="text-sm font-medium mb-2 dark:text-gray-200">
            Fleet yang akan dihapus:
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {selectedFleets.slice(0, 10).map((fleet) => (
              <div
                key={fleet.id}
                className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded dark:text-gray-300"
              >
                {fleet.name} - {fleet.excavator} ({fleet.shift})
              </div>
            ))}
            {selectedFleets.length > 10 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Dan {selectedFleets.length - 10} fleet lainnya...
              </p>
            )}
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
};

export default FleetBulkActions;