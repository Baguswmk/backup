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
    <div className="bg-white shadow-sm rounded-lg dark:bg-gray-800">
      <div className="p-4 sm:p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center md:justify-between gap-4 mb-4 sm:mb-6">
          {/* Title & User Info */}
          <div className="flex flex-row items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0 dark:bg-blue-900">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate dark:text-gray-100">
                History Ritase
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate dark:text-gray-400">
                {user?.name || user?.username} • {userRole || "User"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-row items-center gap-2">
              <span className="text-xs sm:text-sm font-medium gap-2 text-gray-700 dark:text-gray-300">
                Periode & Shift:
              </span>
              <DateRangePicker
                dateRange={dateRange}
                currentShift={currentShift}
                viewingShift={viewingShift}
                isLoading={isLoading || isSearching}
                onDateRangeChange={onDateRangeChange}
              />
              
              {/* ✅ Tombol Refresh - Pure Tailwind */}
              <button
                onClick={onRefresh}
                disabled={isLoading || isSearching || !dateRange.from || !dateRange.to || !viewingShift}
                className="cursor-pointer shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              {isSearching && (
                <span className="text-xs text-blue-600 flex items-center gap-1 dark:text-blue-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Memuat data...
                </span>
              )}
            </div>
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