import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Truck, Hammer, Weight, RefreshCw } from "lucide-react";
import OverviewTable from "@/modules/timbangan/overview/components/OverviewTable";
import OverviewDetailModal from "@/modules/timbangan/overview/components/OverviewDetailModal";
import HourDetailModal from "@/modules/timbangan/overview/components/HourDetailModal";
import { exportToPDF } from "@/shared/utils/pdf";
import { showToast } from "@/shared/utils/toast";
import { useDashboardDaily } from "@/modules/timbangan/dashboard/hooks/useDashboardDaily";
import SupervisorInputModal from "@/modules/timbangan/overview/components/SupervisorInputModal";
import KertasCheckerDialog from "@/modules/timbangan/ritase/components/KertasCheckerDialog";
import { getCurrentShift } from "@/shared/utils/shift";
import { useWorkUnitFilter } from "./hooks/useWorkUnitFilter";
import {
  LOADING_POINT_GROUP,
  DUMPING_POINT_GROUP,
} from "@/modules/timbangan/ritase/constant/ritaseConstants";

// Helper to flatten nested group objects into an array of strings in order
const flattenGroupOrder = (groupObj) => {
  let result = [];
  const traverse = (node) => {
    if (Array.isArray(node)) {
      node.forEach((item) => traverse(item));
    } else if (typeof node === "object" && node !== null) {
      Object.keys(node).forEach((key) => traverse(node[key]));
    } else if (typeof node === "string") {
      result.push(node);
    }
  };
  traverse(groupObj);
  return result;
};

const LOADING_ORDER = flattenGroupOrder(LOADING_POINT_GROUP);
const DUMPING_ORDER = flattenGroupOrder(DUMPING_POINT_GROUP);

const sortLocations = (locations, orderArray) => {
  if (!Array.isArray(locations)) return locations;
  return [...locations].sort((a, b) => {
    const indexA = orderArray.indexOf(a);
    const indexB = orderArray.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
};

const getSortIndex = (locationList, orderArray) => {
  if (!locationList || locationList.length === 0) return 999999;
  if (Array.isArray(locationList)) {
    const sorted = sortLocations(locationList, orderArray);
    const idx = orderArray.indexOf(sorted[0]);
    return idx !== -1 ? idx : 999999;
  }
  const idx = orderArray.indexOf(locationList);
  return idx !== -1 ? idx : 999999;
};

const OverviewManagement = () => {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      from: today,
      to: today,
    };
  });

  const [shift, setShift] = useState(() => getCurrentShift());

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedData, setCachedData] = useState(null);

  const [selectedMitra, setSelectedMitra] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [searchQuery, setSearchQuery] = useState("");

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedExcavators, setSelectedExcavators] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedDumpPoints, setSelectedDumpPoints] = useState([]);

  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    data: null,
  });

  const [hourDetailModal, setHourDetailModal] = useState({
    isOpen: false,
    data: null,
    hour: null,
  });

  const [supervisorModal, setSupervisorModal] = useState({
    isOpen: false,
    rowData: null,
  });

  const [kertasCheckerModal, setKertasCheckerModal] = useState({
    isOpen: false,
    data: null,
  });

  // Tooltip state
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    type: null,
    position: "bottom",
    data: [],
    locked: false,
  });
  const tooltipRef = useRef(null);

  const hookParams = useMemo(
    () => ({
      startDate: dateRange.from,
      endDate: dateRange.to,
      shift: shift,
    }),
    [dateRange.from, dateRange.to, shift],
  );

  const {
    data: dashboardData,
    isLoading,
    error,
    refresh,
    summaryData: hookSummaryData,
    tableData: hookTableData,
  } = useDashboardDaily(hookParams, true);

  useEffect(() => {
    if (isLoading) {
      if (!cachedData) {
        setIsRefreshing(false);
      } else {
        setIsRefreshing(true);
      }
    } else {
      setIsRefreshing(false);

      if (dashboardData) {
        setCachedData(dashboardData);
      }
    }
  }, [isLoading, dashboardData, cachedData]);

  useEffect(() => {
    const isAnyModalOpen = detailModal.isOpen || hourDetailModal.isOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [detailModal.isOpen, hourDetailModal.isOpen]);

  const tableData = useMemo(() => {
    if (isRefreshing && cachedData) {
      const sourceData =
        hookTableData?.length > 0 ? hookTableData : cachedData.data?.tableData;
      if (!sourceData) return [];

      return sourceData.map((item) => ({
        ...item,
        ritases:
          item.ritases?.map((ritase) => ({
            ...ritase,
            createdAt: ritase.created_at,
          })) || [],
      }));
    }

    if (isLoading && !cachedData) return [];
    if (error) return [];

    if (hookTableData && hookTableData.length > 0) {
      return hookTableData.map((item) => ({
        ...item,
        ritases:
          item.ritases?.map((ritase) => ({
            ...ritase,
            createdAt: ritase.created_at,
          })) || [],
      }));
    }

    if (!dashboardData?.data?.tableData) return [];

    return dashboardData.data.tableData.map((item) => ({
      ...item,
      ritases:
        item.ritases?.map((ritase) => ({
          ...ritase,
          createdAt: ritase.created_at,
        })) || [],
    }));
  }, [
    hookTableData,
    dashboardData,
    isLoading,
    isRefreshing,
    cachedData,
    error,
  ]);

  const uniqueExcavators = useMemo(() => {
    return [...new Set(tableData.map((r) => r.unit_exca))]
      .filter(Boolean)
      .map((v) => ({ value: v, label: v }));
  }, [tableData]);

  const uniqueLoadings = useMemo(() => {
    const allLocations = tableData.flatMap((r) => r.loading_locations || []);
    return [...new Set(allLocations)]
      .filter(Boolean)
      .map((v) => ({ value: v, label: v }));
  }, [tableData]);

  const uniqueDumpings = useMemo(() => {
    const allLocations = tableData.flatMap((r) => r.dumping_locations || []);
    return [...new Set(allLocations)]
      .filter(Boolean)
      .map((v) => ({ value: v, label: v }));
  }, [tableData]);

  const filteredTableData = useMemo(() => {
    return tableData.filter((item) => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchSearch =
          item.unit_exca?.toLowerCase().includes(search) ||
          item.loading_location?.toLowerCase().includes(search) ||
          item.dumping_location?.toLowerCase().includes(search) ||
          item.company?.toLowerCase().includes(search);

        if (!matchSearch) return false;
      }

      const matchMitra =
        selectedMitra === "All" || item.company === selectedMitra;
      const matchExca =
        selectedExcavators.length === 0 ||
        selectedExcavators.includes(item.unit_exca);
      const matchLoading =
        selectedLocations.length === 0 ||
        (item.loading_locations || []).some((loc) =>
          selectedLocations.includes(loc),
        );
      const matchDumping =
        selectedDumpPoints.length === 0 ||
        (item.dumping_locations || []).some((loc) =>
          selectedDumpPoints.includes(loc),
        );

      return matchMitra && matchExca && matchLoading && matchDumping;
    });
  }, [
    tableData,
    searchQuery,
    selectedMitra,
    selectedExcavators,
    selectedLocations,
    selectedDumpPoints,
  ]);

  const summaryData = useMemo(() => {
    const defaultSummary = {
      activeDumptrucks: 0,
      activeExcavators: 0,
      totalTonnage: "0.00",
      shift1Tonnage: "0.00",
      shift2Tonnage: "0.00",
      shift3Tonnage: "0.00",
      dumptruckBreakdown: [],
      excavatorBreakdown: [],
    };

    if (isRefreshing && cachedData?.data?.summary) {
      const cached = cachedData.data.summary;
      return {
        activeDumptrucks: Array.isArray(cached.activeDumptrucks)
          ? cached.activeDumptrucks.reduce(
              (sum, item) => sum + (item.count || 0),
              0,
            )
          : 0,
        activeExcavators: Array.isArray(cached.activeExcavators)
          ? cached.activeExcavators.reduce(
              (sum, item) => sum + (item.count || 0),
              0,
            )
          : 0,
        totalTonnage: (cached.totalTonnage || 0).toFixed(2),
        shift1Tonnage: (cached.shift1Tonnage || 0).toFixed(2),
        shift2Tonnage: (cached.shift2Tonnage || 0).toFixed(2),
        shift3Tonnage: (cached.shift3Tonnage || 0).toFixed(2),
        dumptruckBreakdown: Array.isArray(cached.activeDumptrucks)
          ? cached.activeDumptrucks
          : [],
        excavatorBreakdown: Array.isArray(cached.activeExcavators)
          ? cached.activeExcavators
          : [],
      };
    }

    if (!hookSummaryData || error) {
      return defaultSummary;
    }
    return {
      activeDumptrucks: Array.isArray(hookSummaryData.activeDumptrucks)
        ? hookSummaryData.activeDumptrucks.reduce(
            (sum, item) => sum + (item.count || 0),
            0,
          )
        : 0,
      activeExcavators: Array.isArray(hookSummaryData.activeExcavators)
        ? hookSummaryData.activeExcavators.reduce(
            (sum, item) => sum + (item.count || 0),
            0,
          )
        : 0,
      totalTonnage: (hookSummaryData.totalTonnage || 0).toFixed(2),
      shift1Tonnage: (hookSummaryData.shift1Tonnage || 0).toFixed(2),
      shift2Tonnage: (hookSummaryData.shift2Tonnage || 0).toFixed(2),
      shift3Tonnage: (hookSummaryData.shift3Tonnage || 0).toFixed(2),
      dumptruckBreakdown: Array.isArray(hookSummaryData.activeDumptrucks)
        ? hookSummaryData.activeDumptrucks
        : [],
      excavatorBreakdown: Array.isArray(hookSummaryData.activeExcavators)
        ? hookSummaryData.activeExcavators
        : [],
    };
  }, [hookSummaryData, isRefreshing, cachedData, error]);

  // Tooltip handlers
  const handleTooltipShow = (type, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const position =
      spaceBelow >= 400 ? "bottom" : spaceAbove > 300 ? "top" : "bottom";

    const data =
      type === "dt"
        ? summaryData.dumptruckBreakdown
        : summaryData.excavatorBreakdown;

    setTooltipState({
      visible: true,
      type: type,
      position: position,
      data: data,
      locked: false,
    });
  };

  const handleTooltipHide = () => {
    if (!tooltipState.locked) {
      setTooltipState({
        visible: false,
        type: null,
        position: "bottom",
        data: [],
        locked: false,
      });
    }
  };

  const handleTooltipClick = (type, event) => {
    event.stopPropagation();
    if (tooltipState.locked && tooltipState.type === type) {
      setTooltipState({
        visible: false,
        type: null,
        position: "bottom",
        data: [],
        locked: false,
      });
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      const position =
        spaceBelow >= 400 ? "bottom" : spaceAbove > 300 ? "top" : "bottom";

      const data =
        type === "dt"
          ? summaryData.dumptruckBreakdown
          : summaryData.excavatorBreakdown;

      setTooltipState({
        visible: true,
        type: type,
        position: position,
        data: data,
        locked: true,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setTooltipState({
          visible: false,
          type: null,
          position: "bottom",
          data: [],
          locked: false,
        });
      }
    };

    if (tooltipState.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tooltipState.visible]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredTableData;

    return [...filteredTableData].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === "ritases") {
        aValue = a.ritases?.length || 0;
        bValue = b.ritases?.length || 0;
      } else if (sortConfig.key === "total_ritase") {
        aValue = a.total_ritase || 0;
        bValue = b.total_ritase || 0;
      } else if (sortConfig.key === "total_tonase") {
        aValue = parseFloat(a.total_tonase) || 0;
        bValue = parseFloat(b.total_tonase) || 0;
      } else if (sortConfig.key === "loading") {
        const aLocations = Array.isArray(a.loading_locations)
          ? sortLocations(a.loading_locations, LOADING_ORDER)
          : a.loading_locations
            ? [a.loading_locations]
            : [];
        const bLocations = Array.isArray(b.loading_locations)
          ? sortLocations(b.loading_locations, LOADING_ORDER)
          : b.loading_locations
            ? [b.loading_locations]
            : [];
        const aIndex = getSortIndex(aLocations, LOADING_ORDER);
        const bIndex = getSortIndex(bLocations, LOADING_ORDER);

        if (aIndex !== bIndex) {
          return sortConfig.direction === "asc"
            ? aIndex - bIndex
            : bIndex - aIndex;
        }
        const aStr = aLocations.join(",");
        const bStr = bLocations.join(",");
        return sortConfig.direction === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      } else if (sortConfig.key === "dumping") {
        const aLocations = Array.isArray(a.dumping_locations)
          ? sortLocations(a.dumping_locations, DUMPING_ORDER)
          : a.dumping_locations
            ? [a.dumping_locations]
            : [];
        const bLocations = Array.isArray(b.dumping_locations)
          ? sortLocations(b.dumping_locations, DUMPING_ORDER)
          : b.dumping_locations
            ? [b.dumping_locations]
            : [];
        const aIndex = getSortIndex(aLocations, DUMPING_ORDER);
        const bIndex = getSortIndex(bLocations, DUMPING_ORDER);

        if (aIndex !== bIndex) {
          return sortConfig.direction === "asc"
            ? aIndex - bIndex
            : bIndex - aIndex;
        }
        const aStr = aLocations.join(",");
        const bStr = bLocations.join(",");
        return sortConfig.direction === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTableData, sortConfig]);

  const { filteredData, workUnitOptions, selectedWorkUnits, ...handlers } =
    useWorkUnitFilter(sortedData);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = useCallback(
    (value) => {
      setItemsPerPage(value === "All" ? sortedData.length : value);
      setCurrentPage(1);
    },
    [sortedData.length],
  );

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const handleDateRangeChange = useCallback((newDateRange) => {
    setDateRange(newDateRange);
    if (newDateRange.shift) {
      setShift(newDateRange.shift);
    }
    setCurrentPage(1);
  }, []);

  const handleShiftChange = useCallback((newShift) => {
    setShift(newShift);
    setCurrentPage(1);
  }, []);

  const hasActiveFilters =
    selectedExcavators.length > 0 ||
    selectedLocations.length > 0 ||
    selectedDumpPoints.length > 0 ||
    selectedWorkUnits.length > 0;

  const handleResetFilters = useCallback(() => {
    setSelectedExcavators([]);
    setSelectedLocations([]);
    setSelectedDumpPoints([]);
    handlers.onClearWorkUnitFilter();
    setCurrentPage(1);
  }, [handlers]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const openDetailModal = useCallback((data) => {
    setDetailModal({
      isOpen: true,
      data,
    });
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailModal({
      isOpen: false,
      data: null,
    });
  }, []);

  const openHourDetailModal = useCallback((data, hour) => {
    setHourDetailModal({
      isOpen: true,
      data,
      hour,
    });
  }, []);

  const closeHourDetailModal = useCallback(() => {
    setHourDetailModal({
      isOpen: false,
      data: null,
      hour: null,
    });
  }, []);

  const openKertasCheckerModal = useCallback((rowData) => {
    const firstTrip = rowData.ritases?.[0] || {};
    const formattedData = {
      excavator: rowData.unit_exca || "-",
      loading_location: Array.isArray(rowData.loading_locations)
        ? rowData.loading_locations.join(", ")
        : rowData.loading_locations || firstTrip.loading_location || "-",
      dumping_location: Array.isArray(rowData.dumping_locations)
        ? rowData.dumping_locations.join(", ")
        : rowData.dumping_locations || firstTrip.dumping_location || "-",
      distance: Array.isArray(rowData.distance)
        ? [...new Set(rowData.distance.filter(Boolean))].join(", ")
        : rowData.distance || firstTrip.distance || "-",
      coal_type: Array.isArray(rowData.coal_type)
        ? [...new Set(rowData.coal_type.filter(Boolean))].join(", ")
        : rowData.coal_type || firstTrip.coal_type || "-",
      measurement_type: Array.isArray(rowData.measurement_type)
        ? [...new Set(rowData.measurement_type.filter(Boolean))].join(", ")
        : rowData.measurement_type || firstTrip.measurement_type || "timbangan",
      tripCount: rowData.ritases?.length || 0,
      totalWeight: rowData.totalTonase || 0,
      trips:
        rowData.ritases?.map((r) => ({
          ...r,
          time:
            r.createdAt ||
            r.created_at ||
            r.time ||
            r.date ||
            new Date().toISOString(),
          hull_no: r.unit_dump_truck || r.hull_no || "-",
          weight: r.net_weight || r.weight || 0,
        })) || [],
    };

    setKertasCheckerModal({
      isOpen: true,
      data: formattedData,
    });
  }, []);

  const handleExportPDF = useCallback((rowData) => {
    // Build unique loading→dumping pairs dari ritases
    const pairMap = {};
    (rowData.ritases || []).forEach((r) => {
      const key = `${r.loading_location}|${r.dumping_location}`;
      if (!pairMap[key]) {
        pairMap[key] = {
          loading: r.loading_location,
          dumping: r.dumping_location,
          count: 0,
          totalTonase: 0,
        };
      }
      pairMap[key].count += 1;
      pairMap[key].totalTonase += r.net_weight || 0;
    });
    const locationPairs = Object.values(pairMap);

    // Buka modal untuk input supervisor
    setSupervisorModal({
      isOpen: true,
      rowData: rowData,
      locationPairs,
    });
  }, []);

  const handleConfirmExport = useCallback(
    async (supervisorName, locationFilter) => {
      try {
        const success = await exportToPDF(
          supervisorModal.rowData,
          supervisorName,
          locationFilter,
        );
        if (success) {
          showToast.success("PDF berhasil dibuat. Silakan cek tab baru.");
          setSupervisorModal({ isOpen: false, rowData: null });
        } else {
          showToast.error(
            "Gagal membuat PDF. Silakan coba lagi atau aktifkan popup pada browser Anda.",
          );
        }
      } catch (error) {
        console.error("PDF Export Error:", error);
        showToast.error("Terjadi kesalahan saat membuat PDF");
      }
    },
    [supervisorModal.rowData],
  );

  const handleCloseSupervisorModal = useCallback(() => {
    setSupervisorModal({ isOpen: false, rowData: null });
  }, []);

  const filterGroups = useMemo(
    () => [
      {
        id: "work_unit",
        label: "Work Unit",
        options: workUnitOptions.map((wu) => ({ value: wu, label: wu })),
        value: selectedWorkUnits,
        onChange: (newValue) => {
          handlers.onWorkUnitsChange(newValue);
          setCurrentPage(1);
        },
        placeholder: "Pilih Work Unit",
      },
      {
        id: "excavator",
        label: "Excavator",
        options: uniqueExcavators,
        value: selectedExcavators,
        onChange: (newValue) => {
          setSelectedExcavators(newValue);
          setCurrentPage(1);
        },
        placeholder: "Pilih Excavator",
      },
      {
        id: "loading",
        label: "Loading Point",
        options: uniqueLoadings,
        value: selectedLocations,
        onChange: (newValue) => {
          setSelectedLocations(newValue);
          setCurrentPage(1);
        },
        placeholder: "Pilih Loading Point",
      },
      {
        id: "dumping",
        label: "Dumping Point",
        options: uniqueDumpings,
        value: selectedDumpPoints,
        onChange: (newValue) => {
          setSelectedDumpPoints(newValue);
          setCurrentPage(1);
        },
        placeholder: "Pilih Dumping Point",
      },
    ],
    [
      uniqueExcavators,
      uniqueLoadings,
      uniqueDumpings,
      selectedExcavators,
      selectedLocations,
      selectedDumpPoints,
      workUnitOptions,
      selectedWorkUnits,
      handlers,
    ],
  );
  return (
    <div className="space-y-6 p-4 md:p-6 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Dump Truck Card */}
        <Card className="shadow-sm hover:shadow-md transition-shadow dark:text-gray-200 border-none dark:shadow-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-200">
              <Truck className="w-4 h-4" />
              Active Dump Truck
              {isRefreshing && (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative inline-block">
              <div
                className="text-3xl font-bold text-blue-600 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                onMouseEnter={(e) => handleTooltipShow("dt", e)}
                onMouseLeave={handleTooltipHide}
                onClick={(e) => handleTooltipClick("dt", e)}
                ref={
                  tooltipState.visible && tooltipState.type === "dt"
                    ? tooltipRef
                    : null
                }
              >
                {summaryData.activeDumptrucks}
              </div>

              {/* Tooltip for DT */}
              {tooltipState.visible && tooltipState.type === "dt" && (
                <div
                  className={`absolute ${
                    tooltipState.position === "top"
                      ? "bottom-full mb-2"
                      : "top-full mt-2"
                  } left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[300px] max-w-[350px]`}
                >
                  {/* Arrow indicator */}
                  <div
                    className={`absolute left-4 transform w-0 h-0 ${
                      tooltipState.position === "top"
                        ? "top-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-300 dark:border-t-gray-600"
                        : "bottom-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-300 dark:border-b-gray-600"
                    }`}
                  />

                  <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                    List Dump Trucks
                  </div>

                  {tooltipState.data.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                      <ul className="space-y-1">
                        {tooltipState.data.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <span className="font-medium block">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                                {item.count} unit
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                      Tidak ada data dump truck
                    </p>
                  )}
                </div>
              )}
            </div>
            {summaryData.dumptruckBreakdown.length > 0 ? (
              <div
                className={`space-y-1 ${
                  summaryData.dumptruckBreakdown.length > 5
                    ? "max-h-[120px] overflow-y-auto scrollbar-thin pr-1 scrollbar-thin"
                    : ""
                }`}
              >
                {summaryData.dumptruckBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.name}:
                    </span>
                    <span className="font-medium">{item.count} unit</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">Tidak ada data</div>
            )}
          </CardContent>
        </Card>

        {/* Active Excavator Card */}
        <Card className="shadow-sm hover:shadow-md transition-shadow dark:text-gray-200 border-none dark:shadow-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-200">
              <Hammer className="w-4 h-4" />
              Active Excavator
              {isRefreshing && (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative inline-block">
              <div
                className="text-3xl font-bold text-green-600 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                onMouseEnter={(e) => handleTooltipShow("excavator", e)}
                onMouseLeave={handleTooltipHide}
                onClick={(e) => handleTooltipClick("excavator", e)}
                ref={
                  tooltipState.visible && tooltipState.type === "excavator"
                    ? tooltipRef
                    : null
                }
              >
                {summaryData.activeExcavators}
              </div>

              {/* Tooltip for Excavator */}
              {tooltipState.visible && tooltipState.type === "excavator" && (
                <div
                  className={`absolute ${
                    tooltipState.position === "top"
                      ? "bottom-full mb-2"
                      : "top-full mt-2"
                  } left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[300px] max-w-[350px]`}
                >
                  {/* Arrow indicator */}
                  <div
                    className={`absolute left-4 transform w-0 h-0 ${
                      tooltipState.position === "top"
                        ? "top-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-300 dark:border-t-gray-600"
                        : "bottom-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-300 dark:border-b-gray-600"
                    }`}
                  />

                  <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                    List Excavators
                  </div>

                  {tooltipState.data.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                      <ul className="space-y-1">
                        {tooltipState.data.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <span className="font-medium block">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                                {item.count} unit
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                      Tidak ada data excavator
                    </p>
                  )}
                </div>
              )}
            </div>
            {summaryData.excavatorBreakdown.length > 0 ? (
              <div
                className={`space-y-1 ${
                  summaryData.excavatorBreakdown.length > 5
                    ? "max-h-[120px] overflow-y-auto scrollbar-thin pr-1 scrollbar-thin"
                    : ""
                }`}
              >
                {summaryData.excavatorBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.name}:
                    </span>
                    <span className="font-medium">{item.count} unit</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">Tidak ada data</div>
            )}
          </CardContent>
        </Card>

        {/* Total Tonnage Card */}
        <Card className="shadow-sm hover:shadow-md transition-shadow dark:text-gray-200 border-none dark:shadow-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-200">
              <Weight className="w-4 h-4" />
              Total Tonnage
              {isRefreshing && (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 mb-3">
              {summaryData.totalTonnage} <span className="text-lg">Ton</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  Shift 1:
                </span>
                <span className="font-medium">
                  {summaryData.shift1Tonnage} Ton
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  Shift 2:
                </span>
                <span className="font-medium">
                  {summaryData.shift2Tonnage} Ton
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  Shift 3:
                </span>
                <span className="font-medium">
                  {summaryData.shift3Tonnage} Ton
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Table Component */}
      <OverviewTable
        data={paginatedData}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        sortConfig={sortConfig}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onViewDetail={openDetailModal}
        onViewHourDetail={openHourDetailModal}
        onViewKertasChecker={openKertasCheckerModal}
        onExportPDF={handleExportPDF}
        isLoading={isRefreshing}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        shift={shift}
        onShiftChange={handleShiftChange}
        isFilterExpanded={isFilterExpanded}
        onToggleFilter={() => setIsFilterExpanded((prev) => !prev)}
        filterGroups={filterGroups}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefresh}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onItemsPerPageChange={handleItemsPerPageChange}
        totalItems={filteredData.length}
      />

      {/* Detail Modals */}
      <OverviewDetailModal
        isOpen={detailModal.isOpen}
        data={detailModal.data}
        onClose={closeDetailModal}
      />

      <HourDetailModal
        isOpen={hourDetailModal.isOpen}
        data={hourDetailModal.data}
        hour={hourDetailModal.hour}
        onClose={closeHourDetailModal}
      />

      <SupervisorInputModal
        isOpen={supervisorModal.isOpen}
        onClose={handleCloseSupervisorModal}
        onConfirm={handleConfirmExport}
        isLoading={false}
        locationPairs={supervisorModal.locationPairs || []}
      />

      {kertasCheckerModal.isOpen && (
        <KertasCheckerDialog
          isOpen={kertasCheckerModal.isOpen}
          onClose={() => setKertasCheckerModal({ isOpen: false, data: null })}
          data={kertasCheckerModal.data}
        />
      )}
    </div>
  );
};

export default OverviewManagement;
