import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/shared/components/ui/collapsible";
import {
  Scale,
  RefreshCw,
  Package,
  Eye,
  MoreVertical,
  CheckCircle2,   Trash2,
  MapPin,
  Upload,
  Building2,
  List,
  ChevronDown,
  ChevronUp,
  Plus,
  UserCheck,
  Copy,
  Edit2,
  Search,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import Pagination from "@/shared/components/Pagination";
import RitaseList from "@/modules/timbangan/ritase/components/RitaseList";
import AggregatedInputModal from "./AggregatedInputModal";
import AggregatedCoalFlow from "./AggregatedCoalFlow";
import KertasCheckerDialog from "./KertasCheckerDialog";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import RitaseEditForm from "@/modules/timbangan/ritase/components/RitaseEditForm";
import RitaseDuplicateForm from "@/modules/timbangan/ritase/components/RitaseDuplicateForm";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import {
  DUMPING_POINT_GROUP,
  LOADING_POINT_GROUP,
} from "@/modules/timbangan/ritase/constant/ritaseConstants";

// Recursive helper: cari top-level operation area dari lokasi
const containsLocation = (valueOrArray, location) => {
  if (Array.isArray(valueOrArray)) {
    return valueOrArray.includes(location);
  }
  if (typeof valueOrArray === "string") {
    return valueOrArray === location;
  }
  if (valueOrArray && typeof valueOrArray === "object") {
    return Object.values(valueOrArray).some((v) =>
      containsLocation(v, location),
    );
  }
  return false;
};

const findDumpingOperationGroup = (dumpingLocation) => {
  if (!dumpingLocation) return "Unknown Dumping";
  for (const [groupName, value] of Object.entries(DUMPING_POINT_GROUP)) {
    if (containsLocation(value, dumpingLocation)) {
      return groupName;
    }
  }
  return dumpingLocation; // fallback: tampilkan nama aslinya jika tidak masuk group manapun
};

const findLoadingOperationGroup = (loadingLocation) => {
  if (!loadingLocation) return "Unknown Loading";
  for (const [groupName, value] of Object.entries(LOADING_POINT_GROUP)) {
    if (containsLocation(value, loadingLocation)) {
      return groupName;
    }
  }
  return loadingLocation; // fallback: tampilkan nama aslinya jika tidak masuk group manapun
};

const AggregatedRitase = ({
  aggregatedData,
  isInitialLoading,
  isRefreshing,
  currentPage,
  onPageChange,
  isCCR = false,
  filteredRitaseData = [],
  currentRitasePage,
  onRitasePageChange,
  onOpenInputModal,
  filteredFleetCount,
  isRitaseFilterExpanded,
  setIsRitaseFilterExpanded,
  selectedRitaseExcavators,
  setSelectedRitaseExcavators,
  selectedRitaseCompanies,
  setSelectedRitaseCompanies,
  selectedRitaseLoadingPoints,
  setSelectedRitaseLoadingPoints,
  selectedRitaseDumpingPoints,
  setSelectedRitaseDumpingPoints,
  ritaseFilterOptions,
  onResetRitaseFilters,
  hasActiveRitaseFilters,
  onCreateRitase,
  onRefresh,
  onUpdateRitase,
  onDeleteRitase,
  onDuplicateRitase,
  onApproveRitase,
  refreshButtonRef,
  currentShift,
}) => {
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedChecker, setSelectedChecker] = useState(null);
  const [isCheckerDialogOpen, setIsCheckerDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(isCCR ? "dumping" : "dumping");

  const [expandedGroups, setExpandedGroups] = useState({});
  const [detailTrips, setDetailTrips] = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  const [showInputModal, setShowInputModal] = useState(false);
  const [selectedFleetForInput, setSelectedFleetForInput] = useState(null);
  const [selectedRitase, setSelectedRitase] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingRitase, setIsDeletingRitase] = useState(false);

  // Search states
  const [searchExcavator, setSearchExcavator] = useState("");
  const [searchDumpingPoint, setSearchDumpingPoint] = useState("");
  const [searchLoadingPoint, setSearchLoadingPoint] = useState("");
  const [searchDumptruck, setSearchDumptruck] = useState("");
  const [pageSize, setPageSize] = useState(10); // Added pageSize state

  // Filtered ritase data based on search
  const filteredRitaseBySearch = useMemo(() => {
    if (
      !searchExcavator &&
      !searchDumpingPoint &&
      !searchLoadingPoint &&
      !searchDumptruck
    ) {
      return filteredRitaseData;
    }

    return filteredRitaseData.filter((ritase) => {
      const matchExcavator =
        !searchExcavator ||
        ritase.unit_exca?.toLowerCase().includes(searchExcavator.toLowerCase());
      const matchDumping =
        !searchDumpingPoint ||
        ritase.dumping_location
          ?.toLowerCase()
          .includes(searchDumpingPoint.toLowerCase());
      const matchLoading =
        !searchLoadingPoint ||
        ritase.loading_location
          ?.toLowerCase()
          .includes(searchLoadingPoint.toLowerCase());
      const matchDumptruck =
        !searchDumptruck ||
        ritase.unit_dump_truck
          ?.toLowerCase()
          .includes(searchDumptruck.toLowerCase());
      return matchExcavator && matchDumping && matchLoading && matchDumptruck;
    });
  }, [
    filteredRitaseData,
    searchExcavator,
    searchDumpingPoint,
    searchLoadingPoint,
    searchDumptruck,
  ]);

  // Reset search filters
  const handleResetSearch = () => {
    setSearchExcavator("");
    setSearchDumpingPoint("");
    setSearchLoadingPoint("");
    setSearchDumptruck("");
  };

  // Check if any search is active
  const hasActiveSearch =
    searchExcavator ||
    searchDumpingPoint ||
    searchLoadingPoint ||
    searchDumptruck;

  // Reset page to 1 when search changes
  useEffect(() => {
    if (hasActiveSearch && onPageChange) {
      onPageChange(1);
    }
  }, [
    searchExcavator,
    searchDumpingPoint,
    searchLoadingPoint,
    searchDumptruck,
  ]);

  const groupedData = useMemo(() => {
    // Extract summaries data from new structure
    const rawSummaries =
      aggregatedData?.summaries?.data || aggregatedData || [];
    const summariesData = Array.isArray(rawSummaries) ? rawSummaries : [];

    if (activeTab === "excavator") {
      return summariesData;
    }
    // ── Tab Mitra: group by company (Kontraktor DT) ─────────────────────────
    // summaries.data tidak punya field company; pakai filteredRitaseData langsung
    if (activeTab === "mitra") {
      const grouped = {};
      filteredRitaseData.forEach((ritase) => {
        const companyRaw = ritase.company;
        const company =
          companyRaw && companyRaw !== "-" && companyRaw.trim() !== ""
            ? companyRaw.trim()
            : "Unknown Company";

        if (!grouped[company]) {
          grouped[company] = {
            groupKey: company,
            company,
            items: [],
            totalWeight: 0,
            totalTrips: 0,
          };
        }

        grouped[company].items.push(ritase);
        
        const locLoad = (ritase.loading_location || "").trim().toLowerCase();
        const locDump = (ritase.dumping_location || "").trim().toLowerCase();
        if (locLoad !== locDump) {
          grouped[company].totalWeight += parseFloat(ritase.net_weight || 0);
          grouped[company].totalTrips += 1;
        }
      });

      return Object.values(grouped)
        .map((group) => ({
          ...group,
          totalWeight: parseFloat((group.totalWeight || 0).toFixed(2)),
        }))
        .sort((a, b) =>
          (a.company || "").localeCompare(b.company || "", "id", { sensitivity: "base" }),
        );
    }

    const grouped = {};
    summariesData.forEach((item) => {
      let key;
      const firstRitase = item?.ritases?.[0] || {};

      switch (activeTab) {
        case "checker":
          key = item.unit_exca || firstRitase.unit_exca || "Unknown Excavator";
          break;
        case "dumping":
          key = findDumpingOperationGroup(
            item.dumping_location || firstRitase.dumping_location,
          );
          break;
        case "loading":
          key = findLoadingOperationGroup(
            item.loading_location || firstRitase.loading_location,
          );
          break;
        default:
          key = "Unknown";
      }

      if (!grouped[key]) {
        grouped[key] = {
          groupKey: key,
          items: [],
          totalWeight: 0,
          totalTrips: 0,
          uniqueExcavators: new Set(),
        };
      }

      grouped[key].items.push(item);
      const weight =
        item.totalWeight ||
        item.total_tonase ||
        (item.ritases
          ? item.ritases.reduce((sum, r) => sum + (r.net_weight || 0), 0)
          : 0);
      const trips =
        item.tripCount ||
        item.total_ritase ||
        (item.ritases ? item.ritases.length : 0);

      grouped[key].totalWeight += parseFloat(weight);
      grouped[key].totalTrips += parseInt(trips);

      // Track unique excavators
      if (item.unit_exca) {
        grouped[key].uniqueExcavators.add(item.unit_exca);
      }
    });

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        totalWeight: parseFloat((group.totalWeight || 0).toFixed(2)),
        excavatorCount: group.uniqueExcavators.size,
        uniqueExcavators: undefined, // Remove Set from final object
      }))
      .sort((a, b) =>
        (a.groupKey || "").localeCompare(b.groupKey || "", "id", {
          sensitivity: "base",
        }),
      );
  }, [aggregatedData, activeTab]);

  // Filter groupedData based on search
  const filteredGroupedData = useMemo(() => {
    if (!searchExcavator && !searchDumpingPoint && !searchLoadingPoint) {
      return groupedData;
    }

    return groupedData
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          const matchExcavator =
            !searchExcavator ||
            item.unit_exca
              ?.toLowerCase()
              .includes(searchExcavator.toLowerCase());
          const matchDumping =
            !searchDumpingPoint ||
            item.dumping_location
              ?.toLowerCase()
              .includes(searchDumpingPoint.toLowerCase());
          const matchLoading =
            !searchLoadingPoint ||
            item.loading_location
              ?.toLowerCase()
              .includes(searchLoadingPoint.toLowerCase());

          return matchExcavator && matchDumping && matchLoading;
        });

        if (filteredItems.length === 0) return null;

        // Recalculate totals for filtered items
        const totalWeight = filteredItems.reduce((sum, item) => {
          const itemWeight =
            item.totalWeight ||
            item.total_tonase ||
            (item.ritases
              ? item.ritases.reduce(
                  (innerSum, r) => innerSum + (r.net_weight || 0),
                  0,
                )
              : 0);
          return sum + parseFloat(itemWeight);
        }, 0);

        const totalTrips = filteredItems.reduce((sum, item) => {
          const itemTrips =
            item.tripCount ||
            item.total_ritase ||
            (item.ritases ? item.ritases.length : 0);
          return sum + parseInt(itemTrips);
        }, 0);

        return {
          ...group,
          items: filteredItems,
          totalWeight: parseFloat(totalWeight.toFixed(2)),
          totalTrips: totalTrips,
        };
      })
      .filter(Boolean); // Remove null groups
  }, [groupedData, searchExcavator, searchDumpingPoint, searchLoadingPoint]);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return filteredGroupedData.slice(startIdx, endIdx);
  }, [filteredGroupedData, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredGroupedData.length / pageSize);
  }, [filteredGroupedData, pageSize]);

  const handleEdit = (ritase) => {
    // ✅ Reset state first to ensure clean slate
    setSelectedRitase(null);
    setIsEditModalOpen(false);

    // ✅ Then set new data with a small delay to ensure re-render
    setTimeout(() => {
      setSelectedRitase(ritase);
      setIsEditModalOpen(true);
    }, 0);
  };

  const handleDuplicate = (ritase) => {
    setSelectedRitase(ritase);
    setIsDuplicateModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRitase || isDeletingRitase) return;

    setIsDeletingRitase(true);
    try {
      if (onDeleteRitase) {
        await onDeleteRitase(selectedRitase);
      }
      setIsDeleteDialogOpen(false);
      setSelectedRitase(null);
    } catch (error) {
      console.error("Error deleting ritase:", error);
    } finally {
      setIsDeletingRitase(false);
    }
  };

  const handleEditSubmit = async (updatedData) => {
    if (updatedData) {
      if (onUpdateRitase && selectedRitase) {
        await onUpdateRitase(selectedRitase.id, updatedData);
      }
      setIsEditModalOpen(false);
      setSelectedRitase(null);

      // We still trigger refreshButton as a fallback or to sync other data
      setTimeout(() => {
        if (refreshButtonRef?.current) {
          refreshButtonRef.current.click();
        }
      }, 10);
    }
  };

  const handleDuplicateSubmit = async (duplicatedData) => {
    try {
      if (onDuplicateRitase) {
        await onDuplicateRitase(duplicatedData);
      }
      setIsDuplicateModalOpen(false);
      setSelectedRitase(null);
    } catch (error) {
      console.error("Error duplicating ritase:", error);
    }
  };

  const handleApprovalClick = async (item) => {
    if (!onApproveRitase) return;
    await onApproveRitase(item);
  };

  const handleSubmitRitase = async (ritaseData) => {
    if (onCreateRitase) {
      const result = await onCreateRitase(ritaseData);
      if (result?.success) {
        setShowInputModal(false);
        setSelectedFleetForInput(null);
      }
      return result;
    }
    return { success: false, error: "onCreateRitase not provided" };
  };

  const handleDetailClick = async (item) => {
    setSelectedDetail(item);
    setIsDialogOpen(true);
    setIsLoadingTrips(true);

    try {
      const matchingTrips = filteredRitaseData.filter(
        (ritase) =>
          ritase.unit_exca === item.unit_exca &&
          ritase.loading_location === item.loading_location &&
          ritase.dumping_location === item.dumping_location &&
          ritase.measurement_type === item.measurement_type,
      );

      setDetailTrips(matchingTrips);
    } catch (error) {
      console.error("Error loading trip details:", error);
      setDetailTrips([]);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  const handleCheckerClick = async (item) => {
    try {
      const matchingTrips = Array.isArray(filteredRitaseData)
        ? filteredRitaseData.filter(
            (ritase) =>
              ritase.unit_exca === item.unit_exca &&
              ritase.loading_location === item.loading_location &&
              ritase.dumping_location === item.dumping_location &&
              ritase.measurement_type === item.measurement_type,
          )
        : [];

      const formattedTrips = matchingTrips.map((trip) => ({
        ...trip,
        hull_no: trip.unit_dump_truck || "-",
        weight: trip.net_weight,
        time: trip.createdAt || trip.date,
        shift: trip.shift || "-",
      }));

      setSelectedChecker({
        excavator: item.unit_exca,
        loading_location: item.loading_location,
        dumping_location: item.dumping_location,
        measurement_type: item.measurement_type,
        coal_type: item.coal_type,
        distance: item.distance,
        tripCount: getTripCount(item),
        totalWeight: getTotalWeight(item),
        trips: formattedTrips,
      });
      setIsCheckerDialogOpen(true);
    } catch (error) {
      console.error("Error preparing checker data:", error);
      setSelectedChecker({
        excavator: item.unit_exca || "-",
        loading_location: item.loading_location || "-",
        dumping_location: item.dumping_location || "-",
        measurement_type: item.measurement_type || "-",
        tripCount: 0,
        totalWeight: 0,
        trips: [],
      });
      setIsCheckerDialogOpen(true);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: localeId });
    } catch (error) {
      return "-";
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "HH:mm", { locale: localeId });
    } catch (error) {
      return "-";
    }
  };

  const handleUpdateTripFromChecker = async (updatedTrip) => {
    if (onUpdateRitase) {
      if (updatedTrip?.id) {
        // Update normal per-trip
        await onUpdateRitase(updatedTrip.id, updatedTrip);
      } else {
        // null signal dari bulk edit = force refresh saja (1x loadSummaryData)
        await onUpdateRitase(null, null);
      }
    }
  };

  // Handler untuk delete trip dari KertasCheckerDialog
  const handleDeleteTripFromChecker = async (trip) => {
    if (onDeleteRitase) {
      await onDeleteRitase(trip);
    }
  };

  const getTripCount = (item) => {
    return (
      item.tripCount ||
      item.total_ritase ||
      (item.ritases ? item.ritases.length : 0)
    );
  };

  const renderSearchSection = () => (
    <div className="mb-2 space-y-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
      <div className="flex items-center justify-between">
        {hasActiveSearch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetSearch}
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <X className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search by Excavator */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Excavator
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari excavator..."
              value={searchExcavator}
              onChange={(e) => setSearchExcavator(e.target.value)}
              className="pl-9 h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
            />
            {searchExcavator && (
              <button
                onClick={() => setSearchExcavator("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search by Loading Point */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Loading Point
          </label>
          <div className="relative">
            <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari loading point..."
              value={searchLoadingPoint}
              onChange={(e) => setSearchLoadingPoint(e.target.value)}
              className="pl-9 h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
            />
            {searchLoadingPoint && (
              <button
                onClick={() => setSearchLoadingPoint("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search by Dumping Point */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Dumping Point
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari dumping point..."
              value={searchDumpingPoint}
              onChange={(e) => setSearchDumpingPoint(e.target.value)}
              className="pl-9 h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
            />
            {searchDumpingPoint && (
              <button
                onClick={() => setSearchDumpingPoint("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {hasActiveSearch && (
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">
            Ditemukan: {filteredGroupedData.length} grup
          </span>
        </div>
      )}
    </div>
  );

  const getTotalWeight = (item) => {
    const weight =
      item.totalWeight ||
      item.total_tonase ||
      (item.ritases
        ? item.ritases.reduce((sum, r) => sum + (r.net_weight || 0), 0)
        : 0);
    const parsedWeight = parseFloat(weight);
    return isNaN(parsedWeight)
      ? "0.00"
      : parsedWeight.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  // ── Render khusus tab Mitra: header = company, isi = list per DT ────────
  const renderMitraGroupedView = () => {
    if (!Array.isArray(paginatedData) || paginatedData.length === 0) return null;

    return paginatedData.map((group, index) => {
      if (!group || !Array.isArray(group.items) || group.items.length === 0) return null;

      const groupId = `mitra-${index}`;
      const isExpanded = expandedGroups[groupId] === true;

      // Sub-group items per DT
      const dtMap = {};
      group.items.forEach((ritase) => {
        const dt = ritase.unit_dump_truck || "-";
        if (!dtMap[dt]) dtMap[dt] = { trips: 0, weight: 0 };
        dtMap[dt].trips += 1;
        dtMap[dt].weight += parseFloat(ritase.net_weight || 0);
      });

      const dtRows = Object.entries(dtMap)
        .map(([dt, val]) => ({ dt, trips: val.trips, weight: parseFloat(val.weight.toFixed(2)) }))
        .sort((a, b) => a.dt.localeCompare(b.dt, "id", { sensitivity: "base" }));

      return (
        <Collapsible
          key={index}
          open={isExpanded}
          onOpenChange={(open) =>
            setExpandedGroups((prev) => ({ ...prev, [groupId]: open }))
          }
          className="mb-2 sm:mb-3 last:mb-0"
        >
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <CollapsibleTrigger className="w-full cursor-pointer p-2 sm:p-3 border-b-2 border-purple-500 dark:border-purple-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                  )}
                  <div className="flex flex-col items-start min-w-0">
                    <Badge className="bg-purple-600 dark:bg-purple-500 text-white text-xs px-2 max-w-full truncate">
                      {group.company}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {dtRows.length} Dump Truck
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Ritase</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {group.totalTrips} rit
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Tonase</div>
                    <div className="text-sm font-bold text-green-600 dark:text-green-400">
                      {group.totalWeight.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ton
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900/30">
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-10 text-xs">No</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs">Dump Truck</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs">Ritase</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs">Tonase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dtRows.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <Badge className="bg-gray-600 dark:bg-gray-500 text-white text-xs">
                            {row.dt}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400 text-xs">
                          {row.trips} rit
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600 dark:text-green-400 text-xs">
                          {row.weight.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ton
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    });
  };

  const renderGroupedView = () => {
    if (!Array.isArray(paginatedData) || paginatedData.length === 0) {
      return null;
    }
    return paginatedData
      .map((group, index) => {
        if (!group || !Array.isArray(group.items) || group.items.length === 0) {
          return null;
        }

        const groupId = `${activeTab}-${index}`;
        const isExpanded = expandedGroups[groupId] === true;
        return (
          <Collapsible
            key={index}
            open={isExpanded}
            onOpenChange={(open) =>
              setExpandedGroups((prev) => ({ ...prev, [groupId]: open }))
            }
            className="mb-2 sm:mb-3 last:mb-0"
          >
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <CollapsibleTrigger className="w-full cursor-pointer p-2 sm:p-3 border-b-2 border-blue-500 dark:border-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                    )}
                    <Badge className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-2">
                      {group.groupKey}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total Ritase
                      </div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {group.totalTrips
                          ? group.totalTrips.toLocaleString("en-US")
                          : "0"}{" "}
                        rit
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total Tonase
                      </div>
                      <div className="text-sm font-bold text-green-600 dark:text-green-400">
                        {group.totalWeight
                          ? group.totalWeight.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "0.00"}{" "}
                        ton
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-900/30">
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-12 text-xs">
                          No
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs min-w-20">
                          Exca
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs min-w-30">
                          Loading
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs min-w-30">
                          Dumping
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs min-w-30">
                          Product Brand
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs min-w-30">
                          Measurement
                        </TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs min-w-20">
                          Ritase
                        </TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs min-w-25">
                          Total Tonase
                        </TableHead>
                        <TableHead className="text-center text-gray-700 dark:text-gray-300 font-semibold w-12 text-xs">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item, itemIdx) => (
                        <TableRow
                          key={itemIdx}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="text-gray-600 dark:text-gray-400 text-xs">
                            {itemIdx + 1}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-600 dark:bg-blue-500 text-white text-xs">
                              {item.unit_exca || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-xs">
                            {item.loading_location || "-"}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-xs">
                            {item.dumping_location || "-"}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-xs">
                            {item.coal_type || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="capitalize border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs"
                            >
                              {item.measurement_type || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400 text-xs">
                            {getTripCount(item)} rit
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400 text-xs">
                            {getTotalWeight(item)} ton
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-neutral-50"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-36 bg-neutral-50 dark:bg-slate-800 dark:text-neutral-50 border-none shadow-sm shadow-slate-700"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleDetailClick(item)}
                                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 text-xs"
                                >
                                  <Eye className="mr-1 h-3 w-3" /> Detail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCheckerClick(item)}
                                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 text-xs"
                                >
                                  <Eye className="mr-1 h-3 w-3" /> Lihat Kertas
                                  Checker
                                </DropdownMenuItem>
                                {isCCR && (
                                  <DropdownMenuItem
                                    onClick={() => handleDuplicate(item)}
                                    className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 text-xs"
                                  >
                                    <Copy className="mr-1 h-3 w-3" /> Tambah
                                    Ritase
                                  </DropdownMenuItem>
                                )}
                                {/* <DropdownMenuItem
                                onClick={() => handleEdit(item)}
                                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700"
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-slate-700 text-xs sm:text-sm">
                                  <Trash2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                  Delete
                                </DropdownMenuItem> */}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })
      .filter(Boolean);
  };

  return (
    <>
      <Card
        data-aggregated-list
        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white text-base sm:text-lg">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Ringkasan Ritase</span>
            </div>
            <div className="flex items-center gap-2">
              {/* {aggregatedData?.summaries?.summary_detail && (
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  >
                    {aggregatedData.summaries.summary_detail.total_unique_exca || 0} Exca
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  >
                    {aggregatedData.summaries.summary_detail.total_unique_dt || 0} DT
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                  >
                    {aggregatedData.summaries.summary_detail.total_ritase || 0} Rit
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                  >
                    {(aggregatedData.summaries.summary_detail.total_tonase || 0).toFixed(2)} Ton
                  </Badge>
                </div>
              )} */}
              {isCCR && (
                <Button
                  onClick={() => setShowInputModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Tambah Ritase</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-2 sm:px-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="mb-4 sm:mb-6">
              <div className="block md:hidden overflow-x-auto scrollbar-thin scrollbar-hide -mx-2 px-2">
                <TabsList className="inline-flex w-auto min-w-full bg-gray-100 dark:bg-gray-800 dark:text-neutral-50 p-1 gap-1">
                  <TabsTrigger
                    value="dumping"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-xs px-3 py-2 whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Dumping
                  </TabsTrigger>
                  <TabsTrigger
                    value="loading"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-xs px-3 py-2 whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Loading
                  </TabsTrigger>
                  <TabsTrigger
                    value="checker"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-xs px-3 py-2 whitespace-nowrap shrink-0"
                  >
                    <UserCheck className="w-3 h-3 mr-1" />
                    Excavator
                  </TabsTrigger>
                  <TabsTrigger
                    value="mitra"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-xs px-3 py-2 whitespace-nowrap shrink-0"
                  >
                    <Building2 className="w-3 h-3 mr-1" />
                    Mitra
                  </TabsTrigger>
                  {isCCR && (
                    <TabsTrigger
                      value="all-shipment"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-xs px-3 py-2 whitespace-nowrap shrink-0"
                    >
                      <List className="w-3 h-3 mr-1" />
                      All
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="hidden md:block">
                <TabsList
                  className={`grid w-full ${isCCR ? "grid-cols-5" : "grid-cols-4"} bg-gray-100 dark:bg-gray-800 dark:text-neutral-50`}
                >
                  <TabsTrigger
                    value="dumping"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-sm px-4"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Dumping Point
                  </TabsTrigger>
                  <TabsTrigger
                    value="loading"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-sm px-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Loading Point
                  </TabsTrigger>
                  <TabsTrigger
                    value="checker"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-sm px-4"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Excavator
                  </TabsTrigger>
                  <TabsTrigger
                    value="mitra"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-sm px-4"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Mitra
                  </TabsTrigger>
                  {isCCR && (
                    <TabsTrigger
                      value="all-shipment"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-sm px-4"
                    >
                      <List className="w-4 h-4 mr-2" />
                      All Shipment
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
            </div>

            {isCCR && (
              <TabsContent value="all-shipment" className="mt-0">
                {/* Search Section */}
                <div className="mb-2 space-y-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    {hasActiveSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetSearch}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Search by Excavator */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Excavator
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Cari excavator..."
                          value={searchExcavator}
                          onChange={(e) => setSearchExcavator(e.target.value)}
                          className="pl-9 h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                        />
                        {searchExcavator && (
                          <button
                            onClick={() => setSearchExcavator("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search by Loading Point */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Loading Point
                      </label>
                      <div className="relative">
                        <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Cari loading point..."
                          value={searchLoadingPoint}
                          onChange={(e) =>
                            setSearchLoadingPoint(e.target.value)
                          }
                          className="pl-9 h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                        />
                        {searchLoadingPoint && (
                          <button
                            onClick={() => setSearchLoadingPoint("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search by Dumping Point */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Dumping Point
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Cari dumping point..."
                          value={searchDumpingPoint}
                          onChange={(e) =>
                            setSearchDumpingPoint(e.target.value)
                          }
                          className="pl-9 h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                        />
                        {searchDumpingPoint && (
                          <button
                            onClick={() => setSearchDumpingPoint("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Search by DT */}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Dumptruck
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Cari dumptruck..."
                          value={searchDumptruck}
                          onChange={(e) => setSearchDumptruck(e.target.value)}
                          className="pl-9 h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                        />
                        {searchDumptruck && (
                          <button
                            onClick={() => setSearchDumptruck("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {hasActiveSearch && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">
                        Ditemukan: {filteredRitaseBySearch.length} data
                      </span>
                    </div>
                  )}
                </div>

                <RitaseList
                  userRole="CCR"
                  filteredRitaseData={filteredRitaseBySearch}
                  isInitialLoading={isInitialLoading}
                  isRefreshing={isRefreshing}
                  currentPage={currentRitasePage}
                  onPageChange={onRitasePageChange}
                  onOpenInputModal={onOpenInputModal}
                  filteredFleetCount={filteredFleetCount}
                  isFilterExpanded={isRitaseFilterExpanded}
                  setIsFilterExpanded={setIsRitaseFilterExpanded}
                  selectedExcavators={selectedRitaseExcavators}
                  setSelectedExcavators={setSelectedRitaseExcavators}
                  selectedCompanies={selectedRitaseCompanies}
                  setSelectedCompanies={setSelectedRitaseCompanies}
                  selectedLoadingPoints={selectedRitaseLoadingPoints}
                  setSelectedLoadingPoints={setSelectedRitaseLoadingPoints}
                  selectedDumpingPoints={selectedRitaseDumpingPoints}
                  setSelectedDumpingPoints={setSelectedRitaseDumpingPoints}
                  filterOptions={ritaseFilterOptions}
                  onResetFilters={onResetRitaseFilters}
                  hasActiveFilters={hasActiveRitaseFilters}
                  onRefreshData={onUpdateRitase}
                  onDeleteRitase={onDeleteRitase}
                  onDuplicateRitase={onDuplicateRitase}
                />
              </TabsContent>
            )}

            <TabsContent value="excavator" className="mt-0">
              {isInitialLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Memuat data...
                  </p>
                </div>
              ) : (
                <>
                  {renderSearchSection()}
                  {aggregatedData.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                        {hasActiveSearch
                          ? "Tidak ada data yang sesuai dengan pencarian"
                          : "Belum ada data ritase"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {(totalPages > 1 || aggregatedData.length > 10) && (
                        <div className="mt-4">
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={onPageChange}
                            isLoading={isRefreshing}
                            itemsPerPage={pageSize}
                            onItemsPerPageChange={setPageSize}
                            totalItems={aggregatedData.length}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {["dumping", "loading", "checker", "mitra"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {isInitialLoading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Memuat data...
                    </p>
                  </div>
                ) : tab === "dumping" || tab === "loading" ? (
                  // ── Hierarchical view based on POINT_GROUP ──
                  <>
                    {renderSearchSection()}
                    {(aggregatedData?.summaries?.data || aggregatedData || [])
                      .length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                          Belum ada data ritase
                        </p>
                      </div>
                    ) : (
                      <AggregatedCoalFlow
                        type={tab}
                        aggregatedData={aggregatedData}
                        searchExcavator={searchExcavator}
                        searchDumpingPoint={searchDumpingPoint}
                        searchLoadingPoint={searchLoadingPoint}
                        isCCR={isCCR}
                        handleDetailClick={handleDetailClick}
                        handleCheckerClick={handleCheckerClick}
                        handleDuplicate={handleDuplicate}
                        handleApprovalClick={handleApprovalClick}
                        currentShift={currentShift}
                      /> || (
                        <div className="text-center py-12">
                          <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                            Tidak ada data yang sesuai dengan pencarian
                          </p>
                        </div>
                      )
                    )}
                  </>
                ) : (
                  // ── Other tabs: flat grouped view ──
                  <>
                    {renderSearchSection()}
                    {filteredGroupedData.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                          {hasActiveSearch
                            ? "Tidak ada data yang sesuai dengan pencarian"
                            : "Belum ada data ritase"}
                        </p>
                      </div>
                    ) : (
                      <>
                        {tab === "mitra"
                          ? renderMitraGroupedView()
                          : renderGroupedView()}
                        {(totalPages > 1 ||
                          filteredGroupedData.length > 10) && (
                          <div className="mt-4">
                            <Pagination
                              currentPage={currentPage}
                              totalPages={totalPages}
                              onPageChange={onPageChange}
                              isLoading={isRefreshing}
                              itemsPerPage={pageSize}
                              onItemsPerPageChange={setPageSize}
                              totalItems={filteredGroupedData.length}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="min-w-4xl max-h-[85vh] bg-neutral-50 dark:bg-slate-800 p-0 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="sticky top-0 z-10 bg-neutral-50 dark:bg-slate-800 p-4 sm:p-6">
                <Badge className="bg-blue-600 mr-2 dark:bg-blue-500 text-white w-fit text-xs sm:text-sm">
                  {selectedDetail?.unit_exca}
                </Badge>
                <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                  {selectedDetail?.loading_location} →{" "}
                  {selectedDetail?.dumping_location}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto scrollbar-thin max-h-[calc(85vh-80px)] p-4 sm:p-6">
            {selectedDetail && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Total Ritase
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {getTripCount(selectedDetail)} rit
                    </div>
                  </div>
                </div>

                {/* Table - Horizontally Scrollable */}
                <div className="rounded-md border border-gray-200 dark:border-gray-700">
                  <Table>
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-12 text-xs sm:text-sm sticky left-0 bg-gray-50 dark:bg-gray-900/50">
                          No
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-25">
                          Tanggal
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-20">
                          Waktu
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-25">
                          Hull No (DT)
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-20">
                          Shift
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-30">
                          Loading Point
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-30">
                          Dumping Point
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-20">
                          Jarak
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-30">
                          Jenis Batubara
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-30">
                          Measurement
                        </TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-25">
                          Tonase
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingTrips ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                              Memuat detail ritase...
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : detailTrips.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Tidak ada data ritase
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailTrips.map((trip, tripIdx) => (
                          <TableRow
                            key={tripIdx}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <TableCell className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm sticky left-0 bg-white dark:bg-slate-800">
                              {tripIdx + 1}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                              {formatDate(trip.createdAt || trip.date)}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                              {formatTime(trip.createdAt || trip.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm"
                              >
                                {trip.unit_dump_truck || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                              {trip.shift || "-"}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                              {trip.loading_location || "-"}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                              {trip.dumping_location || "-"}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                              {trip.distance ? `${trip.distance} m` : "-"}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                              {trip.coal_type || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="capitalize border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm"
                              >
                                {trip.measurement_type || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600 dark:text-green-400 text-xs sm:text-sm">
                              {/* {trip.measurement_type === "bypass" ||
                              trip.measurement_type === "manual"
                                ? trip.net_weight
                                : trip.gross_weight}{" "} */}
                              {trip.net_weight} ton
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {selectedRitase && (
        <Dialog
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) {
              // ✅ Clear selectedRitase when modal closes
              setTimeout(() => setSelectedRitase(null), 100);
            }
          }}
        >
          <DialogContent className="max-w-4xl lg:min-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="dark:text-neutral-50">
                Edit Data Ritase
              </DialogTitle>
            </DialogHeader>
            <RitaseEditForm
              key={`edit-${selectedRitase?.id}-${selectedRitase?.updatedAt}`}
              editingItem={selectedRitase}
              onSuccess={handleEditSubmit}
              onCancel={() => {
                setIsEditModalOpen(false);
                setSelectedRitase(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Duplicate Modal */}
      {selectedRitase && (
        <Dialog
          open={isDuplicateModalOpen}
          onOpenChange={setIsDuplicateModalOpen}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin dark:bg-slate-900 bg-white border-none">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-neutral-50">
                <Copy className="w-5 h-5" />
                Tambah Data Ritase
              </DialogTitle>
            </DialogHeader>
            <RitaseDuplicateForm
              sourceRitase={selectedRitase}
              onSubmit={handleDuplicateSubmit}
              onCancel={() => {
                setIsDuplicateModalOpen(false);
                setSelectedRitase(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {selectedRitase && (
        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedRitase(null);
          }}
          onConfirm={handleConfirmDelete}
          target={{
            hull_no: selectedRitase.hull_no,
            excavator: selectedRitase.unit_exca,
            loadingLocation: selectedRitase.loading_location,
            dumpingLocation: selectedRitase.dumping_location,
            weight:
              selectedRitase.measurement_type === "bypass" ||
              selectedRitase.measurement_type === "manual"
                ? selectedRitase.net_weight
                : selectedRitase.gross_weight,
            measurement_type: selectedRitase.measurement_type,
          }}
          isProcessing={isDeletingRitase}
        />
      )}

      <KertasCheckerDialog
        isOpen={isCheckerDialogOpen}
        onClose={() => setIsCheckerDialogOpen(false)}
        data={selectedChecker}
        onRefresh={onRefresh}
        onUpdateTrip={handleUpdateTripFromChecker}
        onDeleteTrip={handleDeleteTripFromChecker}
        refreshButtonRef={refreshButtonRef}
      />

      <AggregatedInputModal
        isOpen={showInputModal}
        onClose={() => {
          setShowInputModal(false);
          setSelectedFleetForInput(null);
        }}
        onSave={handleSubmitRitase}
        selectedFleetConfig={selectedFleetForInput}
      />
    </>
  );
};

export default AggregatedRitase;
