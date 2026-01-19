import React from "react";
import TableToolbar from "@/shared/components/TableToolbar";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import { SEARCH_PLACEHOLDERS } from "@/modules/timbangan/fleet/constant/fleetConstants";

const FleetFilterSection = ({
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
  return (
    <div className="space-y-4">
      <TableToolbar
        activeDateRange={false}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder={SEARCH_PLACEHOLDERS.FLEET}
        canSearch={canRead}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        showFilter={true}
        filterExpanded={filterExpanded}
        onToggleFilter={onToggleFilter}
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

export default FleetFilterSection;
