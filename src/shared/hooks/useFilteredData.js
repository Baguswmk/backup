import { useMemo, useState, useCallback } from "react";
import { getTodayDateRange } from "@/shared/utils/date";
import { PAGINATION } from "@/shared/constants/appConstant";

/**
 * Generic hook for filtering and paginating data
 * @param {Array} data - Data array to filter
 * @param {Object} filterConfig - Configuration for filters
 */
export const useFilteredData = (data = [], filterConfig = {}) => {
  const [currentPage, setCurrentPage] = useState(PAGINATION.DEFAULT_PAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState(getTodayDateRange());
  const [activeFilters, setActiveFilters] = useState({});

  // Search filter
  const searchFiltered = useMemo(() => {
    if (!searchQuery || !data) return data;

    const query = searchQuery.toLowerCase();
    const searchFields = filterConfig.searchFields || [];

    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, filterConfig.searchFields]);

  // Date range filter
  const dateFiltered = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return searchFiltered;
    if (!filterConfig.dateField) return searchFiltered;

    return searchFiltered.filter((item) => {
      const itemDate = new Date(item[filterConfig.dateField]);
      if (!itemDate || isNaN(itemDate)) return false;

      const from = dateRange.from ? new Date(dateRange.from) : null;
      const to = dateRange.to ? new Date(dateRange.to) : null;

      if (from && itemDate < from) return false;
      if (to && itemDate > to) return false;
      return true;
    });
  }, [searchFiltered, dateRange, filterConfig.dateField]);

  // Custom filters
  const customFiltered = useMemo(() => {
    let filtered = dateFiltered;

    Object.entries(activeFilters).forEach(([filterKey, filterValues]) => {
      if (!filterValues || filterValues.length === 0) return;

      const filterField = filterConfig.customFilters?.[filterKey];
      if (!filterField) return;

      filtered = filtered.filter((item) =>
        filterValues.includes(String(item[filterField]))
      );
    });

    return filtered;
  }, [dateFiltered, activeFilters, filterConfig.customFilters]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGINATION.PAGE_SIZE;
    return customFiltered.slice(start, start + PAGINATION.PAGE_SIZE);
  }, [customFiltered, currentPage]);

  // Has active filters check
  const hasActiveFilters = useMemo(() => {
    const hasSearch = !!searchQuery;
    const hasDate = !!(dateRange.from || dateRange.to);
    const hasCustom = Object.values(activeFilters).some(
      (values) => values && values.length > 0
    );

    return hasSearch || hasDate || hasCustom;
  }, [searchQuery, dateRange, activeFilters]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setDateRange(getTodayDateRange());
    setActiveFilters({});
    setCurrentPage(PAGINATION.DEFAULT_PAGE);
  }, []);

  // Update filter
  const updateFilter = useCallback((filterKey, values) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: values,
    }));
    setCurrentPage(PAGINATION.DEFAULT_PAGE);
  }, []);

  // Update search
  const updateSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(PAGINATION.DEFAULT_PAGE);
  }, []);

  // Update date range
  const updateDateRange = useCallback((range) => {
    setDateRange(range);
    setCurrentPage(PAGINATION.DEFAULT_PAGE);
  }, []);

  return {
    // Filtered data
    filteredData: customFiltered,
    paginatedData,
    
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages: Math.ceil(customFiltered.length / PAGINATION.PAGE_SIZE),
    
    // Filters
    searchQuery,
    updateSearch,
    dateRange,
    updateDateRange,
    activeFilters,
    updateFilter,
    hasActiveFilters,
    resetFilters,
  };
};