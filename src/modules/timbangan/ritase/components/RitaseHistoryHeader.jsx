import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { 
  RefreshCw, 
  Search,
  Download,
  FileSpreadsheet,
  History
} from "lucide-react";
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
  onSearch,
  onExport,
  totalRecords = 0,
  hasSearched = false,
}) => {
  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          {/* Title & User Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                History Ritase
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {user?.name || user?.username} • {userRole || 'User'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Export Button - Show after search with data */}
            {/* {totalRecords > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={isLoading || isSearching}
                className="cursor-pointer hover:bg-green-50 dark:text-neutral-50 dark:hover:bg-green-900/20 flex-1 sm:flex-none"
              >
                <FileSpreadsheet className="w-4 h-4 sm:mr-2 text-green-600" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )} */}

            {/* Search Button */}
            <Button
              onClick={onSearch}
              disabled={isLoading || isSearching || !dateRange?.from || !dateRange?.to}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800 flex-1 sm:flex-none"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="ml-2 hidden sm:inline">Mencari...</span>
                  <span className="ml-2 sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span className="ml-2 hidden sm:inline">Cari Data</span>
                  <span className="ml-2 sm:hidden">Cari</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Date Range Filter Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              Periode & Shift:
            </span>
          </div>
          <DateRangePicker
            dateRange={dateRange}
            currentShift={currentShift}
            viewingShift={viewingShift}
            isLoading={isLoading || isSearching}
            onDateRangeChange={onDateRangeChange}
          />
        </div>

        {/* Search Info - Show on mobile after search */}
        {hasSearched && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 sm:hidden">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Ditemukan <span className="font-semibold text-gray-900 dark:text-gray-100">{totalRecords}</span> data
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RitaseHistoryHeader;