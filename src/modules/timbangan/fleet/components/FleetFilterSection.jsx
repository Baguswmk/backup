import React from "react";
import TableToolbar from "@/shared/components/TableToolbar";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import { SEARCH_PLACEHOLDERS } from "@/modules/timbangan/fleet/constant/fleetConstants";

const FleetFilterSection = ({
  activeTab,
  dateRange,
  onDateRangeChange,
  searchQuery,
  onSearchChange,
  canRead,
  onRefresh,
  isRefreshing,
  filterExpanded,
  onToggleFilter,
  filterGroups,
  mastersLoading,
  hasActiveFilters,
  onResetFilters,
}) => {
  const showDateRange = activeTab === "timbangan";
  const showFilter = activeTab === "timbangan";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <TableToolbar
        dateRange={showDateRange ? dateRange : undefined}
        onDateRangeChange={showDateRange ? onDateRangeChange : undefined}
        showDateRange={showDateRange}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder={SEARCH_PLACEHOLDERS.FLEET}
        canSearch={canRead}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        showFilter={showFilter}
        filterExpanded={filterExpanded}
        onToggleFilter={onToggleFilter}
      />

      {/* Advanced Filter Panel */}
      {showFilter && filterExpanded && (
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

export default FleetFilterSection;