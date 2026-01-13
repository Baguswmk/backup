import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import TableToolbar from "@/shared/components/TableToolbar";
import AdvancedFilter from "@/shared/components/AdvancedFilter";

const DumpTruckFilters = ({
  searchQuery,
  onSearchChange,
  onDateRangeChange,
  onRefresh,
  isRefreshing,
  filterExpanded,
  onToggleFilter,
  filterGroups,
  mastersLoading,
  hasActiveFilters,
  onResetFilters,
  canRead,
  canCreate,
  shouldShowButton,
  onAddNew,
}) => {
  return (
    <div className="space-y-4">
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Cari nama fleet, excavator, shift, work unit..."
        canSearch={canRead}
        onDateRangeChange={onDateRangeChange}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        showFilter={true}
        filterExpanded={filterExpanded}
        onToggleFilter={onToggleFilter}
        showDateRange={false}
        extraActions={
          <>
            {shouldShowButton("create") && (
              <Button
                onClick={onAddNew}
                disabled={!canCreate}
                className="gap-2 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Plus className="w-4 h-4" />
                Tambah DT
              </Button>
            )}
          </>
        }
      />

      {filterExpanded && (
        <AdvancedFilter
          isExpanded={filterExpanded}
          onToggleExpand={onToggleFilter}
          filterGroups={filterGroups}
          isLoading={mastersLoading}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={onResetFilters}
        />
      )}
    </div>
  );
};

export default DumpTruckFilters;