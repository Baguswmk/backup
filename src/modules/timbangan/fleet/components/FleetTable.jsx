import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Settings,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import Pagination from "@/shared/components/Pagination";
import LoadingContent from "@/shared/components/LoadingContent";
import StatusBadge from "@/shared/components/StatusBadge";
import TableActions from "@/shared/components/TableActions";
import EmptyState from "@/shared/components/EmptyState";
import { formatDate } from "@/shared/utils/date";

const FleetTable = ({
  configs = [],
  paginatedConfigs = [],
  isLoading = false,
  hasActiveFilters = false,
  isRefreshing = false,
  isSaving = false,
  onViewConfig,
  onEditConfig,
  onDeleteConfig,
  onStatusChange,
  onReactivate,
  getDumptruckCount,
  getDumptruckList,
  currentPage = 1,
  pageSize = 10,
  totalPages = 1,
  onPageChange,
  updatingStatusId = null,
  isHistoryMode = false,
  isPickingMode = false,
  selectedIds = [],
  onToggleSelect,
  allPageSelected = false,
  onSelectAllPage,
}) => {
  if (isLoading && !isRefreshing) {
    return <LoadingContent />;
  }

  if (configs.length === 0) {
    return (
      <EmptyState
        icon={Settings}
        title={
          hasActiveFilters
            ? "Tidak ada hasil"
            : isHistoryMode
            ? "Tidak Ada Riwayat"
            : "Belum Ada Konfigurasi"
        }
        description={
          isHistoryMode
            ? "Belum ada fleet dengan status CLOSED"
            : "Buat konfigurasi fleet pertama Anda untuk memulai"
        }
        variant="ghost"
      />
    );
  }

  return (
    <>
      {isRefreshing && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-900 dark:text-blue-300 font-medium">
            Memperbarui data...
          </span>
        </div>
      )}

      {isSaving && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
          <span className="text-sm text-green-900 font-medium">
            Menyimpan perubahan...
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
            <tr>
              {isPickingMode && (
                <th className="px-4 py-3 text-left dark:text-gray-200">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={onSelectAllPage}
                  />
                </th>
              )}
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
              {/* <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                Status
              </th> */}
              {!isHistoryMode && getDumptruckCount && (
                <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                  Dump Truck
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                {isHistoryMode ? "Ditutup Pada" : "Updated At"}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black dark:text-gray-200">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedConfigs.map((config, index) => {
              const isSelected = selectedIds.includes(config.id);
              const dtCount = getDumptruckCount
                ? getDumptruckCount(config.id)
                : 0;
              const dtList = getDumptruckList ? getDumptruckList(config) : [];

              return (
                <tr
                  key={config.id}
                  className={`shadow-sm dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    isSelected && !isPickingMode
                      ? "bg-green-50 dark:bg-green-900/20"
                      : ""
                  } ${
                    isSelected && isPickingMode
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}
                >
                  {isPickingMode && (
                    <td className="px-4 py-3 dark:text-gray-200">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect?.(config.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      {index + 1 + (currentPage - 1) * pageSize}
                      {isSelected && !isPickingMode && (
                        <CheckCircle2
                          className="w-4 h-4 text-green-600 dark:text-green-400"
                          title="Auto-selected"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium dark:text-gray-200">
                    {config.excavator}
                  </td>
                  <td className="px-4 py-3 text-sm dark:text-gray-300">
                    {config.workUnit}
                  </td>
                  <td className="px-4 py-3 text-sm dark:text-gray-300">
                    {config.loadingLocation}
                  </td>
                  <td className="px-4 py-3 text-sm dark:text-gray-300">
                    {config.dumpingLocation}
                  </td>
                  {/* <td className="px-4 py-3 text-sm">
                    {!isPickingMode && onStatusChange && !isHistoryMode ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 cursor-pointer disabled:cursor-not-allowed"
                            disabled={isUpdatingStatus}
                          >
                            {isUpdatingStatus ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <StatusBadge status={config.status} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="bg-white border-none dark:text-gray-200 dark:bg-gray-900 min-w-8"
                        >
                          <DropdownMenuItem
                            className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 "
                            onClick={() => onStatusChange(config.id, "ACTIVE")}
                          >
                            <StatusBadge status="ACTIVE" />
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={() =>
                              onStatusChange(config.id, "INACTIVE")
                            }
                          >
                            <StatusBadge status="INACTIVE" />
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={() => onStatusChange(config.id, "CLOSED")}
                          >
                            <StatusBadge status="CLOSED" />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <StatusBadge status={config.status} />
                    )}
                  </td> */}

                  {/* Dump Truck Column */}
                  {!isHistoryMode && getDumptruckCount && (
                    <td className="px-4 py-3 text-sm">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-left justify-start w-full cursor-pointer disabled:cursor-not-allowed"
                          >
                            <span className="truncate">
                              {dtCount > 0 ? (
                                <StatusBadge
                                  status={`${dtCount} Unit`}
                                  variant="default"
                                />
                              ) : (
                                <span className="text-gray-400">Kosong</span>
                              )}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-72 border-none bg-white dark:bg-gray-800 dark:text-gray-200"
                        >
                          {dtList.length > 0 ? (
                            <>
                              <div className="px-4 py-2">
                                <p className="text-sm font-medium mb-2">
                                  Dump Truck Pool ({dtList.length})
                                </p>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {dtList.map((dt, i) => (
                                  <div
                                    key={dt.id}
                                    className="flex px-4 py-2 border-b text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-default"
                                  >
                                    <div className="font-medium pr-2">
                                      {i + 1}.{" "}
                                    </div>
                                    <div className="font-medium">
                                      {dt.hull_no}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              Belum ada dump truck
                            </div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}

                  {/* Updated At Column */}
                  <td className="px-4 py-3 text-sm dark:text-gray-100">
                    {formatDate(config.updatedAt)}
                  </td>

                  {/* Action Column */}
                  <td className="px-4 py-3 text-center dark:text-gray-100">
                    {isHistoryMode ? (
                      <div className="flex items-center justify-center gap-2">
                         <TableActions
                        actions={[
                          {
                            label: "Lihat",
                            icon: Eye,
                            onClick: () => onViewConfig(config),
                          },
                          ...(onReactivate
                            ? [
                                {
                                  label: "Reaktivasi",
                                  icon: RotateCcw,
                                  onClick: () => onReactivate(config),
                                },
                              ]
                            : []),
                          ...(onDeleteConfig
                            ? [
                                {
                                  label: "Delete",
                                  icon: Trash2,
                                  onClick: () => onDeleteConfig(config),
                                  disabled: config.isActive,
                                  variant: "destructive",
                                },
                              ]
                            : []),
                        ]}
                      />
                      </div>
                    ) :  (
                      <TableActions
                        actions={[
                          {
                            label: "Detail",
                            icon: Eye,
                            onClick: () => onViewConfig(config),
                          },
                          ...(onEditConfig
                            ? [
                                {
                                  label: "Edit",
                                  icon: Edit,
                                  onClick: () => onEditConfig(config),
                                },
                              ]
                            : []),
                          ...(onDeleteConfig
                            ? [
                                {
                                  label: "Delete",
                                  icon: Trash2,
                                  onClick: () => onDeleteConfig(config),
                                  disabled: config.isActive,
                                  variant: "destructive",
                                },
                              ]
                            : []),
                        ]}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {configs.length > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          isLoading={false}
        />
      )}
    </>
  );
};

export default FleetTable;
