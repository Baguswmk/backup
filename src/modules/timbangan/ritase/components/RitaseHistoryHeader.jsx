import React from "react";
import { RefreshCw, History } from "lucide-react";
import { DateRangePicker } from "@/shared/components/DateRangePicker";

const RitaseHistoryHeader = ({
  user,
  userRole,
  dateRange,
  currentShift,
  viewingShift,
  isLoading,
  isSearching,
  onDateRangeChange,
  onRefresh,
  totalRecords = 0,
  hasSearched = false,
}) => {
  return (
    <div className="bg-white shadow-sm rounded-lg dark:bg-gray-800 transition-colors">
      <div className="p-4 sm:p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 sm:mb-6">
          {/* Title & User Info */}
          <div className="flex flex-row items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0 dark:bg-blue-900/50">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate dark:text-gray-100">
                History Ritase
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate dark:text-gray-400 max-w-[200px] sm:max-w-none">
                {user?.name || user?.username} • {userRole || "User"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap hidden sm:inline-block">
                Periode & Shift:
              </span>
              <div className="flex-1 sm:flex-none min-w-[200px]">
                <DateRangePicker
                  dateRange={dateRange}
                  currentShift={currentShift}
                  viewingShift={viewingShift}
                  isLoading={isLoading || isSearching}
                  onDateRangeChange={onDateRangeChange}
                />
              </div>

              {/* ✅ Tombol Refresh - Pure Tailwind */}
              <button
                onClick={onRefresh}
                disabled={
                  isLoading ||
                  isSearching ||
                  !dateRange.from ||
                  !dateRange.to ||
                  !viewingShift
                }
                className="cursor-pointer shrink-0 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isSearching ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {isSearching && (
              <span className="text-xs text-blue-600 flex items-center gap-1 dark:text-blue-400 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Wait...
              </span>
            )}
          </div>
        </div>

        {/* Search Info */}
        {hasSearched && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Ditemukan{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {totalRecords}
              </span>{" "}
              data
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RitaseHistoryHeader;
