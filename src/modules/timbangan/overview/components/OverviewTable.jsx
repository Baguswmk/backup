import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  ArrowUpDown,
  Eye,
  FileText,
  MoreVertical,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/shared/components/ui/dropdown-menu";
import { formatDate } from "@/shared/utils/date";
import { formatWeight } from "@/shared/utils/number";
import Pagination from "@/shared/components/Pagination";
import TableToolbar from "@/shared/components/TableToolbar";
import AdvancedFilter from "@/shared/components/AdvancedFilter";

// Helper function untuk mendapatkan jam berdasarkan shift
const getHoursByShift = (shift) => {
  switch (shift) {
    case "Shift 1":
      // 22:00 - 05:59:59 (8 jam)
      return [22, 23, 0, 1, 2, 3, 4, 5];
    case "Shift 2":
      // 06:00 - 13:59:59 (8 jam)
      return [6, 7, 8, 9, 10, 11, 12, 13];
    case "Shift 3":
      // 14:00 - 21:59:59 (8 jam)
      return [14, 15, 16, 17, 18, 19, 20, 21];
    case "All":
    default:
      // 06:00 - 05:59:59 hari berikutnya (24 jam)
      return [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
  }
};

const OverviewTable = ({
  data,
  currentPage,
  totalPages,
  itemsPerPage,
  onSort,
  onPageChange,
  onViewDetail,
  onViewHourDetail,
  onExportPDF,
  isLoading = false,

  dateRange,
  onDateRangeChange,
  shift,
  onShiftChange,
  isFilterExpanded,
  onToggleFilter,
  filterGroups,
  hasActiveFilters,
  onResetFilters,
  onRefresh,

  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Cari excavator, loading, dumping...",
}) => {
  // Mendapatkan jam-jam yang harus ditampilkan berdasarkan shift
  const displayHours = useMemo(() => {
    return getHoursByShift(shift);
  }, [shift]);

  const getUniqueDates = (ritases) => {
    if (!ritases || ritases.length === 0) return "-";
    const dates = [...new Set(ritases.map((r) => r.date).filter(Boolean))];
    if (dates.length === 0) return "-";
    if (dates.length === 1) return formatDate(dates[0]);
    return `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`;
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-neutral-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Active Fleet</span>
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memperbarui...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className="dark:bg-gray-700 dark:text-gray-200"
            >
              {shift === "All" ? "Semua Shift" : shift} ({displayHours.length} jam)
            </Badge>
            <Badge
              variant="secondary"
              className="dark:bg-gray-700 dark:text-gray-200"
            >
              Page {currentPage} of {totalPages}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar dengan Search dan Filter */}
        <TableToolbar
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          shift={shift}
          onShiftChange={onShiftChange}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          isRefreshing={isLoading}
          onRefresh={onRefresh}
          filterExpanded={isFilterExpanded}
          onToggleFilter={onToggleFilter}
        />

        {/* Advanced Filter Panel */}
        {isFilterExpanded && (
          <AdvancedFilter
            isExpanded={isFilterExpanded}
            filterGroups={filterGroups}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={onResetFilters}
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-3 text-left font-semibold sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 border-r border-gray-200 dark:border-gray-700">
                  No
                </th>
                <th
                  className="px-3 py-3 text-left font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 sticky left-10.5 bg-gray-50 dark:bg-gray-900 z-10 border-r border-gray-200 dark:border-gray-700"
                  onClick={() => onSort("unit_exca")}
                >
                  <div className="flex items-center gap-3">
                    Exca <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left sticky left-27 z-10 font-semibold bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Tanggal
                  </div>
                </th>

                {/* Hourly Columns - Dynamic based on shift */}
                {displayHours.map((hour) => (
                  <th
                    key={hour}
                    className="px-3 py-3 text-center font-semibold text-xs min-w-17.5 border-r border-gray-200 dark:border-gray-700"
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </th>
                ))}

                <th
                  className="px-3 py-3 text-center font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 bg-blue-50 dark:bg-blue-900/30 min-w-25 border-r border-gray-200 dark:border-gray-700"
                  onClick={() => onSort("totalTonase")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Total <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left font-semibold min-w-30 border-r border-gray-200 dark:border-gray-700">
                  Loading
                </th>
                <th className="px-3 py-3 text-left font-semibold min-w-30 border-r border-gray-200 dark:border-gray-700">
                  Dumping
                </th>
                <th className="px-3 py-3 text-center font-semibold min-w-25">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Skeleton loading untuk initial load */}
              {isLoading && data.length === 0 ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </td>
                    {displayHours.map((_, i) => (
                      <td key={i} className="px-3 py-3 text-center">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto"></div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8 mx-auto"></div>
                    </td>
                  </tr>
                ))
              ) : data.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6 + displayHours.length} className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg
                        className="w-12 h-12 text-gray-300 dark:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <div className="text-gray-500 dark:text-gray-400">
                        <p className="font-medium text-base">
                          {searchQuery || hasActiveFilters
                            ? "Tidak ada data yang cocok dengan pencarian/filter"
                            : "Data tidak ditemukan"}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          {searchQuery || hasActiveFilters
                            ? "Coba ubah filter atau kata kunci pencarian"
                            : "Tidak ada data untuk periode dan filter yang dipilih"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300 sticky left-0 bg-neutral-50 dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-3 py-3 font-medium text-blue-600 dark:text-blue-400 sticky left-10.5 bg-neutral-50 dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700">
                      {row.unit_exca}
                    </td>
                    <td className="px-3 py-3 sticky left-28 bg-neutral-50 dark:bg-gray-800 z-10 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <span className="text-xs">
                          {getUniqueDates(row.ritases)}
                        </span>
                      </div>
                    </td>

                    {/* Hourly Data - Dynamic based on shift */}
                    {displayHours.map((hour) => {
                      const hourKey = `${hour.toString().padStart(2, "0")}:00`;
                      const value = row.hourlyData?.[hourKey] || 0;
                      const hasData = value > 0;
                      const isBelowThreshold = hasData && value < 250;

                      return (
                        <td
                          key={hour}
                          className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700"
                        >
                          {hasData ? (
                            <button
                              onClick={() => onViewHourDetail(row, hour)}
                              className={`inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all hover:scale-105 ${
                                isBelowThreshold
                                  ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/60"
                                  : "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/60"
                              }`}
                              title={`${value.toFixed(1)} ton - ${
                                isBelowThreshold
                                  ? "Di bawah target 250 ton"
                                  : "Mencapai target"
                              } - Klik untuk detail`}
                            >
                              {formatWeight(value, 1)}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 font-medium">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Tonnage */}
                    <td className="px-3 py-3 text-center bg-blue-50 dark:bg-blue-900/30 border-r border-gray-200 dark:border-gray-700">
                      <span className="inline-block px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded font-bold text-sm">
                        {formatWeight(row.totalTonase)}
                      </span>
                    </td>

                    {/* Loading & Dumping */}
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                      {row.loading_location}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                      {row.dumping_location}
                    </td>

                    {/* Action Menu */}
                    <td className="px-3 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-neutral-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <DropdownMenuItem
                            onClick={() => onViewDetail(row)}
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onExportPDF && onExportPDF(row)}
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default OverviewTable;