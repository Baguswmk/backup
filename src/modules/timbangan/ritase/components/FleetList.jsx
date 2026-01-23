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
  Truck,
  RefreshCw,
  Package,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import Pagination from "@/shared/components/Pagination";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import { USER_ROLES } from "@/modules/timbangan/ritase/constant/ritaseConstants";

const ITEMS_PER_PAGE = 10;

const FleetList = ({
  userRole,
  filteredFleetConfigs,
  isInitialLoading,
  isRefreshing,
  currentPage,
  onPageChange,

  isFilterExpanded,
  setIsFilterExpanded,
  selectedCompanies,
  setSelectedCompanies,
  selectedLoadingPoints,
  setSelectedLoadingPoints,
  selectedDumpingPoints,
  setSelectedDumpingPoints,
  filterOptions,
  onResetFilters,
  hasActiveFilters,
}) => {
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    return filteredFleetConfigs.slice(startIdx, endIdx);
  }, [filteredFleetConfigs, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredFleetConfigs.length / ITEMS_PER_PAGE);
  }, [filteredFleetConfigs]);

  return (
    <Card
      data-fleet-list
      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    >
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Truck className="w-5 h-5" />
            {userRole === USER_ROLES.OPERATOR_JT
              ? "Fleet yang Ditugaskan untuk Anda"
              : "Daftar Fleet"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {filteredFleetConfigs.length} fleet
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="gap-2 dark:text-neutral-50"
            >
              <Filter className="w-4 h-4" />
              Filter
              {isFilterExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Filters */}
        <AdvancedFilter
          isExpanded={isFilterExpanded}
          filterGroups={[
            {
              id: "company",
              label: "Company",
              options: filterOptions.companies,
              value: selectedCompanies,
              onChange: setSelectedCompanies,
              placeholder: "Pilih Company",
            },
            {
              id: "loading",
              label: "Loading Point",
              options: filterOptions.loadingPoints,
              value: selectedLoadingPoints,
              onChange: setSelectedLoadingPoints,
              placeholder: "Pilih Loading Point",
            },
            {
              id: "dumping",
              label: "Dumping Point",
              options: filterOptions.dumpingPoints,
              value: selectedDumpingPoints,
              onChange: setSelectedDumpingPoints,
              placeholder: "Pilih Dumping Point",
            },
          ]}
          isLoading={isRefreshing}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={onResetFilters}
        />

        {isInitialLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Memuat data fleet...
            </p>
          </div>
        ) : filteredFleetConfigs.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              {userRole === USER_ROLES.OPERATOR_JT
                ? "Belum ada fleet yang ditugaskan untuk Anda"
                : "Belum ada fleet yang terdaftar"}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                      No
                    </TableHead>
                    <TableHead className="w-37.5 text-gray-700 dark:text-gray-300 font-semibold">
                      Excavator
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                      Company
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                      Measurement Type
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                      Loading Point
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                      Dumping Point
                    </TableHead>
                    <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">
                      Jumlah DT
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                      Checker
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((fleet, index) => (
                    <TableRow
                      key={fleet.id || index}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Badge className="bg-blue-600 dark:bg-blue-500 text-white">
                          {fleet.excavator}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {fleet.company || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        >
                          {fleet.measurement_type ||
                            fleet.measurementType ||
                            "timbangan"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {fleet.loadingLocation}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {fleet.dumpingLocation}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {fleet.dumptruck?.length || fleet.units?.length || 0}{" "}
                          unit
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 text-sm">
                        {fleet.checker ||
                          fleet.fleet_checker ||
                          fleet.checker_name ||
                          "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                isLoading={isRefreshing}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FleetList;
