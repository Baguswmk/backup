import React from "react";
import TableToolbar from "@/shared/components/TableToolbar";
import AdvancedFilter from "@/shared/components/AdvancedFilter";

const DumpTruckFilters = ({
  searchQuery,
  onSearchChange,
  dateRange,
  currentShift,
  viewingShift,
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
        dateRange={dateRange}
        currentShift={currentShift}
        viewingShift={viewingShift}
        onDateRangeChange={onDateRangeChange}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        showFilter={true}
        filterExpanded={filterExpanded}
        onToggleFilter={onToggleFilter}
        showDateRange={false}
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
