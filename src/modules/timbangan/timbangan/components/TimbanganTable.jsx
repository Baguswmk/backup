import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  FileCheck,
  TrendingUp,
  Lock,
  Calendar,
  FileDown,
} from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import LoadingContent from "@/shared/components/LoadingContent";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import EmptyState from "@/shared/components/EmptyState";
import TimbanganDetailModal from "@/modules/timbangan/timbangan/components/TimbanganDetailModal";
import { useTimbanganPermissions } from "@/shared/permissions/usePermissions";
import { showToast } from "@/shared/utils/toast";
import { formatDate, formatTime } from "@/shared/utils/date";
import { getFirstTruthyValue } from "@/shared/utils/object";
import TableToolbar from "@/shared/components/TableToolbar";

export const TimbanganTable = ({
  title = "Data Timbangan",
  shipments = [],
  onEdit,
  onDelete,
  onToggleSelect,
  onToggleSelectAll,
  selectedItems = [],
  allSelected = false,
  isLoading = false,
  isDeleting = false,
  showSelection = true,
  showActions = true,
  onDateRangeChange,
  onRefresh,
  dateRange,
  allTimbanganData = [],
  allSelectedFleets = [],
  onOpenInputForm,
  onOpenFleetDialog,
  onResetDateFilter,
}) => {
  const {
    canRead,
    canUpdate,
    canDelete: canDeletePerm,
    canApprove,
    isSatkerRestricted,
    checkDataAccess,
    filterDataBySatker,
    getDisabledMessage,
    userRole,
    userSatker,
  } = useTimbanganPermissions();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [shifts, setShifts] = useState([]);
  const [excavators, setExcavators] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState([]);
  const [dumpingLocations, setDumpingLocations] = useState([]);

  const pageSize = 10;

  const accessibleShipments = useMemo(() => {
    if (!isSatkerRestricted) return shipments;
    return filterDataBySatker(shipments);
  }, [shipments, isSatkerRestricted, filterDataBySatker]);

  const filterOptions = useMemo(() => {
    const shiftsSet = new Set();
    const excavatorsSet = new Set();
    const loadingLocationsSet = new Set();
    const dumpingLocationsSet = new Set();

    accessibleShipments.forEach((item) => {
      const shift = getFirstTruthyValue(item, "fleet_shift", "shift");
      const excavator = getFirstTruthyValue(
        item,
        "fleet_excavator",
        "unit_exca",
        "excavator"
      );
      const loading = getFirstTruthyValue(
        item,
        "fleet_loading",
        "loading_location",
        "source"
      );
      const dumping = getFirstTruthyValue(
        item,
        "fleet_dumping",
        "dumping_location",
        "destination"
      );

      if (shift !== "-") shiftsSet.add(shift);
      if (excavator !== "-") excavatorsSet.add(excavator);
      if (loading !== "-") loadingLocationsSet.add(loading);
      if (dumping !== "-") dumpingLocationsSet.add(dumping);
    });

    return {
      shifts: Array.from(shiftsSet)
        .sort()
        .map((s) => ({ value: s, label: s })),
      excavators: Array.from(excavatorsSet)
        .sort()
        .map((e) => ({ value: e, label: e })),
      loadingLocations: Array.from(loadingLocationsSet)
        .sort()
        .map((l) => ({ value: l, label: l })),
      dumpingLocations: Array.from(dumpingLocationsSet)
        .sort()
        .map((d) => ({ value: d, label: d })),
    };
  }, [accessibleShipments]);

  const filterGroups = useMemo(
    () => [
      {
        id: "shift",
        label: "Shift",
        options: filterOptions.shifts,
        value: shifts,
        onChange: (newShifts) => {
          setShifts(newShifts);
          setCurrentPage(1);
        },
        placeholder: "Pilih Shift",
      },
      {
        id: "excavator",
        label: "Excavator",
        options: filterOptions.excavators,
        value: excavators,
        onChange: (newExcavators) => {
          setExcavators(newExcavators);
          setCurrentPage(1);
        },
        placeholder: "Pilih Excavator",
      },
      {
        id: "loadingLocation",
        label: "Loading Location",
        options: filterOptions.loadingLocations,
        value: loadingLocations,
        onChange: (newLoadingLocs) => {
          setLoadingLocations(newLoadingLocs);
          setCurrentPage(1);
        },
        placeholder: "Pilih Loading",
      },
      {
        id: "dumpingLocation",
        label: "Dumping Location",
        options: filterOptions.dumpingLocations,
        value: dumpingLocations,
        onChange: (newDumpingLocs) => {
          setDumpingLocations(newDumpingLocs);
          setCurrentPage(1);
        },
        placeholder: "Pilih Dumping",
      },
    ],
    [filterOptions, shifts, excavators, loadingLocations, dumpingLocations]
  );

  const hasActiveFilters = useMemo(() => {
    return (
      shifts.length > 0 ||
      excavators.length > 0 ||
      loadingLocations.length > 0 ||
      dumpingLocations.length > 0 ||
      searchQuery.trim() !== ""
    );
  }, [shifts, excavators, loadingLocations, dumpingLocations, searchQuery]);

  const handleResetFilters = () => {
    setShifts([]);
    setExcavators([]);
    setLoadingLocations([]);
    setDumpingLocations([]);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const filteredShipments = useMemo(() => {
    let result = [...accessibleShipments];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const hullNo = getFirstTruthyValue(
          item,
          "hull_no",
          "dumptruck",
          "unit_dump_truck"
        ).toLowerCase();
        const operator = getFirstTruthyValue(
          item,
          "operator",
          "operator_name",
          "operatorId"
        ).toLowerCase();
        const excavator = getFirstTruthyValue(
          item,
          "fleet_excavator",
          "unit_exca",
          "excavator"
        ).toLowerCase();
        const dumpTruck = getFirstTruthyValue(
          item,
          "dumptruck",
          "unit_dump_truck",
          "hull_no"
        ).toLowerCase();
        const loading = getFirstTruthyValue(
          item,
          "fleet_loading",
          "loading_location",
          "source"
        ).toLowerCase();
        const dumping = getFirstTruthyValue(
          item,
          "fleet_dumping",
          "dumping_location",
          "destination"
        ).toLowerCase();

        return (
          hullNo.includes(query) ||
          operator.includes(query) ||
          excavator.includes(query) ||
          dumpTruck.includes(query) ||
          loading.includes(query) ||
          dumping.includes(query)
        );
      });
    }

    if (shifts.length > 0) {
      result = result.filter((item) => {
        const shift = getFirstTruthyValue(item, "fleet_shift", "shift");
        return shifts.includes(shift);
      });
    }

    if (excavators.length > 0) {
      result = result.filter((item) => {
        const excavator = getFirstTruthyValue(
          item,
          "fleet_excavator",
          "unit_exca",
          "excavator"
        );
        return excavators.includes(excavator);
      });
    }

    if (loadingLocations.length > 0) {
      result = result.filter((item) => {
        const loading = getFirstTruthyValue(
          item,
          "fleet_loading",
          "loading_location",
          "source"
        );
        return loadingLocations.includes(loading);
      });
    }

    if (dumpingLocations.length > 0) {
      result = result.filter((item) => {
        const dumping = getFirstTruthyValue(
          item,
          "fleet_dumping",
          "dumping_location",
          "destination"
        );
        return dumpingLocations.includes(dumping);
      });
    }

    return result;
  }, [
    accessibleShipments,
    searchQuery,
    shifts,
    excavators,
    loadingLocations,
    dumpingLocations,
  ]);

  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, currentPage]);

  const totalPages = Math.ceil(filteredShipments.length / pageSize);

  const isItemSelected = (itemId) => {
    return selectedItems.includes(itemId);
  };

  const canAccessItem = (item) => {
    if (!isSatkerRestricted) return true;
    const itemSatker =
      item.satker || item.work_unit || item.subsatker || item.workUnit;
    return checkDataAccess(itemSatker);
  };

  const handleView = (item) => {
    if (!canRead) {
      showToast.error(getDisabledMessage("read"));
      return;
    }
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    if (!canUpdate) {
      showToast.error(getDisabledMessage("update"));
      return;
    }
    if (!canAccessItem(item)) {
      showToast.error("Anda tidak memiliki akses ke data dari satker ini");
      return;
    }
    if (onEdit) {
      onEdit(item, "edit");
    }
  };

  const handleDeleteClick = (item) => {
    if (!canDeletePerm) {
      showToast.error(getDisabledMessage("delete"));
      return;
    }
    if (!canAccessItem(item)) {
      showToast.error("Anda tidak memiliki akses ke data dari satker ini");
      return;
    }
    if (onDelete) {
      onDelete(item);
    }
  };

  const handleApproveClick = (item) => {
    if (!canApprove) {
      showToast.error(getDisabledMessage("approve"));
      return;
    }
    if (!canAccessItem(item)) {
      showToast.error("Anda tidak memiliki akses ke data dari satker ini");
      return;
    }
    if (onEdit) {
      onEdit(item, "approve");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleModalEdit = async (oldItem) => {
    if (!canUpdate) {
      showToast.error(getDisabledMessage("update"));
      return;
    }
    if (onEdit) {
      await onEdit(oldItem, "edit");
    }
    handleCloseModal();
  };

  const handleModalDelete = async (item) => {
    if (!canDeletePerm) {
      showToast.error(getDisabledMessage("delete"));
      return;
    }
    if (onDelete) {
      await onDelete(item);
    }
    handleCloseModal();
  };

  const handleExportToExcel = async () => {
    try {
      setIsExporting(true);

      const XLSX = await import("xlsx");
      const exportData = filteredShipments.map((item, index) => ({
        No: index + 1,
        Tanggal: formatDate(item.tanggal || item.createdAt || item.timestamp),
        Shift: getFirstTruthyValue(item, "fleet_shift", "shift"),
        Waktu: formatTime(item.createdAt || item.timestamp),
        "Hull No": getFirstTruthyValue(
          item,
          "hull_no",
          "dumptruck",
          "unit_dump_truck"
        ),
        Excavator: getFirstTruthyValue(
          item,
          "fleet_excavator",
          "unit_exca",
          "excavator"
        ),
        "Dump Truck": getFirstTruthyValue(
          item,
          "dumptruck",
          "unit_dump_truck",
          "hull_no"
        ),
        Operator: getFirstTruthyValue(
          item,
          "operator",
          "operator_name",
          "operatorId"
        ),
        "Loading Location": getFirstTruthyValue(
          item,
          "fleet_loading",
          "loading_location",
          "source"
        ),
        "Dumping Location": getFirstTruthyValue(
          item,
          "fleet_dumping",
          "dumping_location",
          "destination"
        ),
        "Net Weight (ton)": parseFloat(
          item.net_weight || item.tonnage || 0
        ).toFixed(2),
        "Gross Weight (ton)": parseFloat(item.gross_weight),
        "Tare Weight (ton)": parseFloat(item.tare_weight),
        "Measurement Type": getFirstTruthyValue(
          item,
          "measurement_type",
          "type_measurement"
        ),
        "Weigh Bridge": item.weigh_bridge || "-",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      const columnWidths = [];
      const headers = Object.keys(exportData[0] || {});

      headers.forEach((header) => {
        const maxLength = Math.max(
          header.length,
          ...exportData.map((row) => {
            const value = row[header];
            return value ? String(value).length : 0;
          })
        );
        columnWidths.push({ wch: Math.min(maxLength + 2, 50) });
      });

      ws["!cols"] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Timbangan");

      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const filename = `Timbangan_${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);

      showToast.success(`Data berhasil diexport ke ${filename}`);
    } catch (error) {
      console.error("Export error:", error);
      showToast.error("Gagal export data ke Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card className="border-none dark:text-gray-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header with Role Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{title}</h3>
                <Badge variant="outline" className="text-xs">
                  {userRole}
                </Badge>
                {isSatkerRestricted && (
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    {userSatker}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleExportToExcel}
                  disabled={
                    isLoading || filteredShipments.length === 0 || isExporting
                  }
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export Excel"}
                </Button>
                <div className="text-sm text-gray-600">
                  Total:{" "}
                  <span className="font-medium">
                    {accessibleShipments.length}
                  </span>{" "}
                  data
                  {hasActiveFilters && (
                    <>
                      {" "}
                      • Ditampilkan:{" "}
                      <span className="font-medium text-blue-600">
                        {filteredShipments.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* TableToolbar - Selalu tampil */}
            <div className="space-y-3">
              <TableToolbar
                dateRange={dateRange}
                onDateRangeChange={onDateRangeChange}
                showDateRange={true}
                shiftOptions={[
                  { value: "All", label: "Semua Shift" },
                  { value: "Shift 1", label: "Shift 1" },
                  { value: "Shift 2", label: "Shift 2" },
                  { value: "Shift 3", label: "Shift 3" },
                ]}
                searchQuery={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                searchPlaceholder="Cari hull no, operator, excavator, dump truck, lokasi..."
                canSearch={canRead}
                onRefresh={onRefresh}
                isRefreshing={isLoading}
                showFilter={true}
                filterExpanded={filterExpanded}
                onToggleFilter={() => setFilterExpanded(!filterExpanded)}
              />

              {/* Advanced Filter Panel */}
              {filterExpanded && (
                <AdvancedFilter
                  isExpanded={filterExpanded}
                  onToggleExpand={() => setFilterExpanded(!filterExpanded)}
                  filterGroups={filterGroups}
                  isLoading={isLoading}
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={handleResetFilters}
                />
              )}
            </div>

            {/* Content Area */}
            {isLoading ? (
              <LoadingContent />
            ) : filteredShipments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={
                  allTimbanganData.length === 0
                    ? "Belum ada data timbangan"
                    : "Tidak ada data untuk filter yang dipilih"
                }
                description={
                  allTimbanganData.length === 0
                    ? "Mulai input data timbangan pertama Anda"
                    : allSelectedFleets.length === 0
                    ? `Total data: ${allTimbanganData.length}, tapi belum ada fleet yang dipilih. Pilih fleet di atas untuk menampilkan data.`
                    : `Total data: ${
                        allTimbanganData.length
                      } fleet, tapi tidak ada yang sesuai filter tanggal${
                        dateRange?.shift !== "All" ? " dan shift" : ""
                      }`
                }
                actionLabel={
                  allTimbanganData.length === 0
                    ? "Input Timbangan"
                    : allSelectedFleets.length === 0
                    ? "Pilih Fleet"
                    : "Reset Filter"
                }
                onAction={
                  allTimbanganData.length === 0
                    ? onOpenInputForm
                    : allSelectedFleets.length === 0
                    ? onOpenFleetDialog
                    : onResetDateFilter
                }
                className="border-0"
              />
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-900  ">
                      <tr>
                        {showSelection && canUpdate && (
                          <th className="px-4 py-3 text-left">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => onToggleSelectAll?.()}
                              disabled={
                                isLoading || filteredShipments.length === 0
                              }
                            />
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Waktu
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Hull No
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Excavator
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Dump Truck
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Operator
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Loading
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Dumping
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-black dark:text-gray-200">
                          Weight (ton)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Shift
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                          Measurement Type
                        </th>
                        {showActions && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-black dark:text-gray-200">
                            Aksi
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedShipments.map((item) => {
                        const hullNo = getFirstTruthyValue(
                          item,
                          "hull_no",
                          "dumptruck",
                          "unit_dump_truck"
                        );
                        const excavator = getFirstTruthyValue(
                          item,
                          "fleet_excavator",
                          "unit_exca",
                          "excavator"
                        );
                        const dumpTruck = getFirstTruthyValue(
                          item,
                          "dumptruck",
                          "unit_dump_truck",
                          "hull_no"
                        );
                        const operator = getFirstTruthyValue(
                          item,
                          "operator",
                          "operator_name",
                          "operatorId"
                        );
                        const loadingLocation = getFirstTruthyValue(
                          item,
                          "fleet_loading",
                          "loading_location",
                          "source"
                        );
                        const dumpingLocation = getFirstTruthyValue(
                          item,
                          "fleet_dumping",
                          "dumping_location",
                          "destination"
                        );
                        const shift = getFirstTruthyValue(
                          item,
                          "fleet_shift",
                          "shift"
                        );
                        const measurementType = getFirstTruthyValue(
                          item,
                          "measurement_type",
                          "type_measurement"
                        );
                        const netWeight = item.net_weight || item.tonnage || 0;
                        const hasAccess = canAccessItem(item);

                        return (
                          <tr
                            key={item.id}
                            className={` hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              isItemSelected(item.id) ? "bg-blue-50 dark:bg-gray-800" : ""
                            } ${!hasAccess ? "opacity-50" : ""}`}
                          >
                            {showSelection && canUpdate && (
                              <td className="px-4 py-3">
                                <Checkbox
                                  checked={isItemSelected(item.id)}
                                  onCheckedChange={() =>
                                    onToggleSelect?.(item.id)
                                  }
                                  disabled={isLoading || !hasAccess}
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {formatDate(
                                    item.tanggal ||
                                      item.createdAt ||
                                      item.timestamp
                                  )}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(item.createdAt || item.timestamp)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-mono font-semibold text-blue-600">
                                {hullNo}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline" className="font-mono">
                                {excavator}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium">{dumpTruck}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-col">
                                <span className="text-xs">{operator}</span>
                                {item.weigh_bridge && (
                                  <span className="text-xs text-gray-500">
                                    {item.weigh_bridge}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="text-xs text-blue-600 font-medium">
                                {loadingLocation}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="text-xs text-red-600 font-medium">
                                {dumpingLocation}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-green-600 text-base">
                                  {parseFloat(netWeight).toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge
                                variant="outline"
                                className={
                                  shift === "PAGI"
                                    ? "bg-yellow-50 dark:bg-gray-800 dark:text-gray-200  "
                                    : "bg-blue-50 dark:bg-gray-800 dark:text-gray-200"
                                }
                              >
                                {shift}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="text-xs">{measurementType}</span>
                            </td>
                            {showActions && (
                              <td className="px-4 py-3 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 cursor-pointer"
                                      disabled={isLoading || isDeleting}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="bg-neutral-50 dark:bg-gray-800 dark:text-gray-200 border-none"
                                  >
                                    {canRead && (
                                      <DropdownMenuItem
                                        onClick={() => handleView(item)}
                                        className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Lihat Detail
                                      </DropdownMenuItem>
                                    )}
                                    {canUpdate && hasAccess && (
                                      <DropdownMenuItem
                                        onClick={() => handleEditClick(item)}
                                        className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                    )}
                                    {canApprove &&
                                      hasAccess &&
                                      item.status !== "approved" && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleApproveClick(item)
                                          }
                                          className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                        >
                                          <FileCheck className="w-4 h-4 mr-2" />
                                          Approve
                                        </DropdownMenuItem>
                                      )}
                                    {canDeletePerm && hasAccess && (
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteClick(item)}
                                        className="text-red-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                        disabled={isDeleting}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Hapus
                                      </DropdownMenuItem>
                                    )}
                                    {!hasAccess && (
                                      <DropdownMenuItem
                                        disabled
                                        className="text-gray-400"
                                      >
                                        <Lock className="w-4 h-4 mr-2" />
                                        Akses Terbatas
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    isLoading={isLoading}
                  />
                )}

                {/* Statistics */}
                {filteredShipments.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 ">
                    <div className="text-sm text-gray-600">
                      Menampilkan{" "}
                      <span className="font-medium">
                        {(currentPage - 1) * pageSize + 1}
                      </span>{" "}
                      -{" "}
                      <span className="font-medium">
                        {Math.min(
                          currentPage * pageSize,
                          filteredShipments.length
                        )}
                      </span>{" "}
                      dari{" "}
                      <span className="font-medium">
                        {filteredShipments.length}
                      </span>{" "}
                      data
                    </div>

                    <div className="text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600">Total Net:</span>
                        <span className="font-bold text-green-600">
                          {filteredShipments
                            .reduce(
                              (sum, item) =>
                                sum +
                                parseFloat(
                                  item.net_weight || item.tonnage || 0
                                ),
                              0
                            )
                            .toFixed(2)}{" "}
                          ton
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-right text-gray-600">
                      Rata-rata:{" "}
                      <span className="font-semibold text-blue-600">
                        {(
                          filteredShipments.reduce(
                            (sum, item) =>
                              sum +
                              parseFloat(item.net_weight || item.tonnage || 0),
                            0
                          ) / (filteredShipments.length || 1)
                        ).toFixed(2)}{" "}
                        ton/trip
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isModalOpen && selectedItem && (
        <TimbanganDetailModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onEdit={handleModalEdit}
          onDelete={handleModalDelete}
          onNavigateToEdit={onEdit}
          canEdit={canUpdate && canAccessItem(selectedItem)}
          canDelete={canDeletePerm && canAccessItem(selectedItem)}
        />
      )}
    </>
  );
};

export default TimbanganTable;
