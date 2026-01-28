import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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
  Trash2,
  MapPin,
  Upload,
  Building2,
  List,
  ChevronDown,
  ChevronUp,
  Plus,
  UserCheck,
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
import KertasCheckerDialog from "./KertasCheckerDialog";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const ITEMS_PER_PAGE = 10;

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
  fleetConfigs = [],
  onUpdateRitase,
  onDeleteRitase,
  onDuplicateRitase,
}) => {
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedChecker, setSelectedChecker] = useState(null);
  const [isCheckerDialogOpen, setIsCheckerDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(
    isCCR ? "checker" : "checker",
  );
  const [expandedGroups, setExpandedGroups] = useState({});
  const [detailTrips, setDetailTrips] = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  const [showInputModal, setShowInputModal] = useState(false);
  const [selectedFleetForInput, setSelectedFleetForInput] = useState(null);

  const groupedData = useMemo(() => {
    if (activeTab === "excavator") {
      return aggregatedData;
    }

    const grouped = {};
    aggregatedData.forEach((item) => {
      let key;
      switch (activeTab) {
        case "checker":
          key = item.checker || item.unit_exca || "Unknown Checker";
          break;
        case "dumping":
          key = item.dumping_location || "Unknown Dumping";
          break;
        case "loading":
          key = item.loading_location || "Unknown Loading";
          break;
        case "mitra":
          key = item.company || item.unit_exca || "Unknown Company";
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
        };
      }

      grouped[key].items.push(item);
      const weight = item.totalWeight || item.total_tonase || 0;
      const trips = item.tripCount || item.total_ritase || 0;

      grouped[key].totalWeight += parseFloat(weight);
      grouped[key].totalTrips += parseInt(trips);
    });

    return Object.values(grouped).map((group) => ({
      ...group,
      totalWeight: parseFloat((group.totalWeight || 0).toFixed(2)),
    }));
  }, [aggregatedData, activeTab]);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    return groupedData.slice(startIdx, endIdx);
  }, [groupedData, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(groupedData.length / ITEMS_PER_PAGE);
  }, [groupedData]);

  const handleAddRitaseFromItem = (item) => {
    const matchingFleet = fleetConfigs.find(
      (fleet) =>
        fleet.excavatorId === item.excavatorId &&
        fleet.loadingLocationId === item.loadingLocationId &&
        fleet.dumpingLocationId === item.dumpingLocationId,
    );

    if (matchingFleet) {
      setSelectedFleetForInput(matchingFleet);
      setShowInputModal(true);
    } else {
      console.warn("⚠️ No matching fleet config found for:", item);

      setShowInputModal(true);
    }
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
        hull_no: trip.unit_dump_truck || "-",
        weight:
          trip.measurement_type === "bypass" ||
          trip.measurement_type === "manual"
            ? trip.net_weight
            : trip.gross_weight,
        time: trip.createdAt || trip.date,
        shift: trip.shift || "-",
      }));

      setSelectedChecker({
        excavator: item.unit_exca,
        loading_location: item.loading_location,
        dumping_location: item.dumping_location,
        measurement_type: item.measurement_type,
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

  const getTripCount = (item) => {
    return item.tripCount || item.total_ritase || 0;
  };

  const getTotalWeight = (item) => {
    const weight = item.totalWeight || item.total_tonase || 0;
    return parseFloat(weight).toFixed(2);
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
        const isExpanded = expandedGroups[groupId] !== false;
        return (
          <Collapsible
            key={index}
            open={isExpanded}
            onOpenChange={(open) =>
              setExpandedGroups((prev) => ({ ...prev, [groupId]: open }))
            }
            className="mb-4 sm:mb-6 last:mb-0"
          >
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <CollapsibleTrigger className="w-full cursor-pointer p-3 sm:p-4 border-b-2 border-blue-500 dark:border-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400 shrink-0" />
                    )}
                    <Badge className="bg-blue-600 dark:bg-blue-500 text-white text-sm sm:text-base px-2 sm:px-3 py-1">
                      {group.groupKey}
                    </Badge>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {group.items.length} excavator
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-6">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total Ritase
                      </div>
                      <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                        {group.totalTrips || 0} rit
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total Tonase
                      </div>
                      <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                        {group.totalWeight || 0} ton
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-900/30">
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-12 text-xs sm:text-sm">
                          No
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-20">
                          Exca
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-30">
                          Loading
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-30">
                          Dumping
                        </TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-30">
                          Measurement
                        </TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-20">
                          Ritase
                        </TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-w-25">
                          Total Tonase
                        </TableHead>
                        <TableHead className="text-center text-gray-700 dark:text-gray-300 font-semibold w-16 sm:w-24 text-xs sm:text-sm">
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
                          <TableCell className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                            {itemIdx + 1}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-600 dark:bg-blue-500 text-white text-xs sm:text-sm">
                              {item.unit_exca || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                            {item.loading_location || "-"}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                            {item.dumping_location || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="capitalize border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm"
                            >
                              {item.measurement_type || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                            {getTripCount(item)} rit
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400 text-xs sm:text-sm">
                            {getTotalWeight(item)} ton
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-neutral-50"
                                >
                                  <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-40 sm:w-48 bg-neutral-50 dark:bg-slate-800 dark:text-neutral-50 border-none shadow-sm shadow-slate-700"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleDetailClick(item)}
                                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 text-xs sm:text-sm"
                                >
                                  <Eye className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                  Detail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCheckerClick(item)}
                                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 text-xs sm:text-sm"
                                >
                                  <Eye className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                  Lihat Kertas Checker
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-slate-700 text-xs sm:text-sm">
                                  <Trash2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                  Delete
                                </DropdownMenuItem>
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
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white text-base sm:text-lg">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">
                Ringkasan Ritase per Excavator
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 w-fit text-xs sm:text-sm"
              >
                {aggregatedData.length} excavator
              </Badge>
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

        <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="mb-4 sm:mb-6">
              <div className="block md:hidden overflow-x-auto scrollbar-hide -mx-2 px-2">
                <TabsList className="inline-flex w-auto min-w-full bg-gray-100 dark:bg-gray-800 dark:text-neutral-50 p-1 gap-1">
                  <TabsTrigger
                    value="checker"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-xs px-3 py-2 whitespace-nowrap shrink-0"
                  >
                    <UserCheck className="w-3 h-3 mr-1" />
                    Checker
                  </TabsTrigger>
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
                    value="checker"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 cursor-pointer text-sm px-4"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Checker
                  </TabsTrigger>
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
                <RitaseList
                  userRole="CCR"
                  filteredRitaseData={filteredRitaseData}
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
                  onUpdateRitase={onUpdateRitase}
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
              ) : aggregatedData.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Belum ada data ritase
                  </p>
                </div>
              ) : (
                <>
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange}
                        isLoading={isRefreshing}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {["checker", "dumping", "loading", "mitra"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {isInitialLoading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Memuat data...
                    </p>
                  </div>
                ) : groupedData.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Belum ada data ritase
                    </p>
                  </div>
                ) : (
                  <>
                    {renderGroupedView()}
                    {totalPages > 1 && (
                      <div className="mt-4">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={onPageChange}
                          isLoading={isRefreshing}
                        />
                      </div>
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

          <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4 sm:p-6">
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
                              {trip.measurement_type === "bypass" ||
                              trip.measurement_type === "manual"
                                ? trip.net_weight
                                : trip.gross_weight}{" "}
                              ton
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

      <KertasCheckerDialog
        isOpen={isCheckerDialogOpen}
        onClose={() => setIsCheckerDialogOpen(false)}
        data={selectedChecker}
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

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default AggregatedRitase;
