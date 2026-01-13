import React, { useCallback } from "react"; // ✅ ADDED useCallback
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Search, X, RefreshCw, Trash2, Filter } from "lucide-react";
import { DateRangePicker } from "@/shared/components/DateRangePicker";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"; // ✅ OPTIONAL

const TableToolbar = ({
  dateRange,
  onDateRangeChange,
  shiftOptions,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Cari...",
  canSearch = true,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  showFilter = false,
  onToggleFilter,
  selectedItems = [],
  onDeleteSelected,
  extraActions,
}) => {
  // ✅ IMPROVED - Use useCallback for handlers
  const handleSearchChange = useCallback((e) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  }, [onSearchChange]);

  const handleClearSearch = useCallback(() => {
    if (onSearchChange) {
      onSearchChange("");
    }
  }, [onSearchChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          isLoading={isRefreshing}
          shiftOptions={shiftOptions}
        />
        
        {onSearchChange && (
          <div className="relative w-full sm:flex-1 hover:bg-gray-200 cursor-pointer">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />

            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-10 border-none rounded-none w-full shadow-none cursor-pointer focus:ring-gray-200 focus:bg-gray-200 dark:focus:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500"
              disabled={!canSearch || isRefreshing}
            />

            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer"
                type="button"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
          {showFilter && onToggleFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFilter}
              className="cursor-pointer border-none hover:bg-gray-200 whitespace-nowrap flex-1 sm:flex-none dark:border-gray-700 dark:hover:bg-gray-700 dark:text-white"
              aria-label="Toggle filters"
            >
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading || isRefreshing}
              className="cursor-pointer border-none hover:bg-gray-200 disabled:cursor-not-allowed whitespace-nowrap flex-1 sm:flex-none dark:border-gray-700 dark:hover:bg-gray-700 dark:text-white"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 sm:mr-2 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          {selectedItems.length > 0 && onDeleteSelected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelected}
              disabled={isRefreshing}
              className="cursor-pointer disabled:cursor-not-allowed whitespace-nowrap flex-1 sm:flex-none dark:bg-red-900 dark:hover:bg-red-800"
              aria-label={`Delete ${selectedItems.length} selected items`}
            >
              <Trash2 className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Hapus</span>
              <span>({selectedItems.length})</span>
            </Button>
          )}

          {extraActions}
        </div>
      </div>
    </div>
  );
};

export default TableToolbar;