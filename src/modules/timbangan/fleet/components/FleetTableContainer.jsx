import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Download, Upload, RefreshCw } from "lucide-react";
import FleetTable from "@/modules/timbangan/fleet/components/FleetTable";

import FleetBulkOperations from "@/modules/timbangan/fleet/components/FleetBulkOperations";
import {
  PAGE_SIZE,
  TOAST_MESSAGES,
} from "@/modules/timbangan/fleet/constant/fleetConstants";
import { showToast } from "@/shared/utils/toast";
import { handleError } from "@/shared/utils/errorHandler";

const FleetTableContainer = ({
  filteredConfigs = [],
  paginatedConfigs = [],

  isLoading = false,
  hasActiveFilters = false,
  isRefreshing = false,
  isSaving = false,

  canRead = true,
  canUpdate = false,
  canDelete = false,

  onResetFilters,
  onViewConfig,
  onEditConfig,
  onDeleteConfig,
  onStatusChange,
  onRefresh,

  getDumptruckCount,
  getDumptruckList,

  currentPage = PAGE_SIZE.DEFAULT_PAGE,
  onPageChange,

  updatingStatusId = null,

  enableBulkActions = false,
  onBulkStatusChange,
  onBulkDelete,

  enableExport = false,
  onExport,
  onImport,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredConfigs.length / PAGE_SIZE.PAGE_SIZE);
  }, [filteredConfigs.length]);

  const hasData = useMemo(() => {
    return filteredConfigs.length > 0;
  }, [filteredConfigs.length]);

  const pageInfo = useMemo(() => {
    if (!hasData) {
      return { start: 0, end: 0, total: 0 };
    }

    const start = (currentPage - 1) * PAGE_SIZE.PAGE_SIZE + 1;
    const end = Math.min(
      currentPage * PAGE_SIZE.PAGE_SIZE,
      filteredConfigs.length,
    );

    return { start, end, total: filteredConfigs.length };
  }, [hasData, currentPage, filteredConfigs.length]);

  const handlePageChange = useCallback(
    (newPage) => {
      setSelectedIds([]);
      onPageChange(newPage);
    },
    [onPageChange],
  );

  const handleBulkStatusChange = useCallback(
    async (ids, status) => {
      if (!onBulkStatusChange) return;

      try {
        await onBulkStatusChange(ids, status);
        setSelectedIds([]);
        showToast.success(TOAST_MESSAGES.SUCCESS.UPDATE);
      } catch (error) {
        handleError(error, {
          operation: "bulk status change",
          defaultMessage: TOAST_MESSAGES.ERROR.UPDATE_FAILED,
        });
      }
    },
    [onBulkStatusChange],
  );

  const handleBulkDelete = useCallback(
    async (ids) => {
      if (!onBulkDelete) return;

      try {
        await onBulkDelete(ids);
        setSelectedIds([]);
        showToast.success(TOAST_MESSAGES.SUCCESS.DELETE);
      } catch (error) {
        handleError(error, {
          operation: "bulk delete",
          defaultMessage: TOAST_MESSAGES.ERROR.DELETE_FAILED,
        });
      }
    },
    [onBulkDelete],
  );

  const handleExport = useCallback(() => {
    if (!onExport) return;

    try {
      const selectedConfigs =
        selectedIds.length > 0
          ? filteredConfigs.filter((c) => selectedIds.includes(c.id))
          : filteredConfigs;

      onExport(selectedConfigs);
      showToast.success(`${selectedConfigs.length} fleet berhasil diexport`);
    } catch (error) {
      handleError(error, {
        operation: "export",
        defaultMessage: "Gagal export data",
      });
    }
  }, [onExport, filteredConfigs, selectedIds]);

  return (
    <div className="space-y-4">
      {/* Quick Actions Toolbar */}
      {hasData && (enableBulkActions || enableExport) && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            {/* Export Button */}
            {enableExport && onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isLoading || isRefreshing}
                className="cursor-pointer disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export {selectedIds.length > 0 && `(${selectedIds.length})`}
              </Button>
            )}

            {/* Import Button */}
            {enableExport && onImport && canUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onImport}
                disabled={isLoading || isRefreshing}
                className="cursor-pointer disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            )}

            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading || isRefreshing}
                className="cursor-pointer disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            )}

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Actions Component */}
      {enableBulkActions && hasData && (
        <FleetBulkOperations
          fleets={paginatedConfigs}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkDelete={handleBulkDelete}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      )}

      {/* Fleet Table */}
      <FleetTable
        configs={filteredConfigs}
        paginatedConfigs={paginatedConfigs}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetFilters}
        isRefreshing={isRefreshing}
        isSaving={isSaving}
        onViewConfig={canRead ? onViewConfig : undefined}
        onEditConfig={canUpdate ? onEditConfig : undefined}
        onDeleteConfig={canDelete ? onDeleteConfig : undefined}
        onStatusChange={canUpdate ? onStatusChange : undefined}
        getDumptruckCount={getDumptruckCount}
        getDumptruckList={getDumptruckList}
        currentPage={currentPage}
        pageSize={PAGE_SIZE.PAGE_SIZE}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        updatingStatusId={updatingStatusId}
        isHistoryMode={false}
        isPickingMode={enableBulkActions}
        selectedIds={selectedIds}
        onToggleSelect={(id) => {
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
          );
        }}
        allPageSelected={
          paginatedConfigs.length > 0 &&
          paginatedConfigs.every((c) => selectedIds.includes(c.id))
        }
        onSelectAllPage={() => {
          const pageIds = paginatedConfigs.map((c) => c.id);
          const allSelected = pageIds.every((id) => selectedIds.includes(id));

          if (allSelected) {
            setSelectedIds((prev) =>
              prev.filter((id) => !pageIds.includes(id)),
            );
          } else {
            setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
          }
        }}
      />

      {/* Bottom Page Info & Navigation Hint */}
      {hasData && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-2 pt-4 border-t dark:border-gray-700 gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Halaman {currentPage} dari {totalPages}
          </p>

          {selectedIds.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tip: Pilihan akan direset saat pindah halaman
            </p>
          )}
        </div>
      )}

      {/* Empty State Info */}
      {!hasData && !isLoading && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters
              ? "Tidak ada fleet yang sesuai dengan filter"
              : "Belum ada data fleet"}
          </p>
        </div>
      )}
    </div>
  );
};

export default FleetTableContainer;
