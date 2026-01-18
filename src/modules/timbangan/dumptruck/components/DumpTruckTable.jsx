import React, { memo, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Truck,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  Plus,
} from "lucide-react";
import TableActions from "@/shared/components/TableActions"; // ✅ ADDED
import Pagination from "@/shared/components/Pagination";
import LoadingContent from "@/shared/components/LoadingContent";
import EmptyState from "@/shared/components/EmptyState";
import StatusBadge from "@/shared/components/StatusBadge";
import { formatDate } from "@/shared/utils/date";

const DumpTruckTable = memo(
  ({
    fleets = [],
    dumptruckSettings = [],
    isLoading = false,
    hasActiveFilters = false,
    onViewUnits,
    onInputUpdateSetting,
    onDeleteSetting,
    onReactivate,
    currentPage = 1,
    pageSize = 10,
    totalPages = 1,
    onPageChange,
    isHistoryMode = false,
  }) => {
    const sortedFleets = useMemo(() => {
      if (!Array.isArray(fleets)) return [];

      return [...fleets].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      });
    }, [fleets]);

    const sortedPaginatedFleets = useMemo(() => {
      const start = (currentPage - 1) * pageSize;
      return sortedFleets.slice(start, start + pageSize);
    }, [sortedFleets, currentPage, pageSize]);

    const getDumptruckCount = (fleet) => {
      const existingSetting = dumptruckSettings.find(
        (s) => String(s.fleet?.id) === String(fleet.id)
      );
      return existingSetting?.units?.length || 0;
    };

    const hasDumptruckSetting = (fleet) => {
      return dumptruckSettings.some(
        (s) => String(s.fleet?.id) === String(fleet.id)
      );
    };



    // ✅ NEW: Generate table actions based on fleet state
    const getTableActions = (fleet) => {
      const hasSetting = hasDumptruckSetting(fleet);

      // History mode actions
      if (isHistoryMode) {
        return [];
      }

      // Normal mode - all actions
      const actions = [];

      if (onInputUpdateSetting) {
        actions.push({
          label: hasSetting ? "Update Setting DT" : "Input Setting DT",
          icon: hasSetting ? Edit : Plus,
          onClick: () => onInputUpdateSetting(fleet),
          disabled: false,
        });
      }

      if (onViewUnits) {
        actions.push({
          label: "Lihat Unit",
          icon: Eye,
          onClick: () => onViewUnits(fleet),
          disabled: !hasSetting,
        });
      }

      if (onDeleteSetting) {
        actions.push({
          label: "Hapus Setting DT",
          icon: Trash2,
          onClick: () => onDeleteSetting(fleet),
          disabled: !hasSetting,
          variant: "destructive",
        });
      }

      return actions;
    };

    if (isLoading) {
      return <LoadingContent />;
    }

    if (sortedFleets.length === 0) {
      return (
        <EmptyState
          icon={Truck}
          title={
            hasActiveFilters
              ? "Tidak ada hasil"
              : isHistoryMode
              ? "Belum Ada Riwayat"
              : "Belum Ada Fleet"
          }
          description={
            isHistoryMode
              ? "Belum ada fleet dengan status CLOSED"
              : "Buat fleet terlebih dahulu di Fleet Management atau fleet sudah ter-filter berdasarkan role Anda"
          }
        />
      );
    }

    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  No
                </th>
              
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Excavator
                </th>
              
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Work Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Loading
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Dumping
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Type Fleet
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black dark:text-gray-200">
                  Jumlah Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  {isHistoryMode ? "Ditutup Pada" : "Updated At"}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black dark:text-gray-200">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPaginatedFleets.map((fleet, index) => {
                const dtCount = getDumptruckCount(fleet);
                const hasSetting = hasDumptruckSetting(fleet);
                const actions = getTableActions(fleet);

                return (
                  <tr
                    key={fleet.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-sm font-medium dark:text-gray-300">
                      {index + 1 + (currentPage - 1) * pageSize}
                    </td>
                    
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.excavator}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.workUnit}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.loadingLocation}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.dumpingLocation}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {fleet.measurementType}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium dark:text-gray-300">
                      {dtCount}
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">
                      {formatDate(fleet.updatedAt, "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-center dark:text-gray-100 dark:bg-gray-800">
                      {/* ✅ HISTORY MODE - Manual buttons */}
                      {isHistoryMode ? (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewUnits?.(fleet)}
                            disabled={!hasSetting}
                            className="cursor-pointer disabled:cursor-not-allowed dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Lihat
                          </Button>
                          {hasSetting && onReactivate &&  (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onReactivate(fleet)}
                              className="cursor-pointer gap-1 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Reaktivasi
                            </Button>
                          )}
                        </div>
                      ) : (
                        /* ✅ NORMAL MODE - Use TableActions component */
                        <TableActions 
                          actions={actions} 
                          disabled={isLoading}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedFleets.length > pageSize && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            isLoading={false}
          />
        )}
      </>
    );
  }
);

DumpTruckTable.displayName = "DumpTruckTable";

export default DumpTruckTable;