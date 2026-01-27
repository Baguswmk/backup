import React, { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  Settings,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Truck,
  MapPin,
  Building2,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import Pagination from "@/shared/components/Pagination";
import LoadingContent from "@/shared/components/LoadingContent";
import TableActions from "@/shared/components/TableActions";
import EmptyState from "@/shared/components/EmptyState";
import { formatDate } from "@/shared/utils/date";
import StatusBadge from "@/shared/components/StatusBadge";

const ITEMS_PER_PAGE = 10;

const FleetTableCollapsible = ({
  configs = [],
  isLoading = false,
  hasActiveFilters = false,
  isRefreshing = false,
  isSaving = false,
  onViewConfig,
  onEditConfig,
  onDeleteConfig,
  onReactivate,
  getDumptruckCount,
  getDumptruckList,
  currentPage = 1,
  onPageChange,
  isHistoryMode = false,
  isPickingMode = false,
  selectedIds = [],
  onToggleSelect,
  allPageSelected = false,
  onSelectAllPage,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState({});

  // Toggle group expansion
  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Group data based on active tab
  const groupedData = useMemo(() => {
    if (activeTab === "all") {
      return [
        {
          groupKey: "All Fleets",
          items: configs,
          count: configs.length,
        },
      ];
    }

    const grouped = {};
    configs.forEach((config) => {
      let key;
      switch (activeTab) {
        case "excavator":
          key = config.excavator || "Unknown Excavator";
          break;
        case "loading":
          key = config.loadingLocation || "Unknown Loading Point";
          break;
        case "dumping":
          key = config.dumpingLocation || "Unknown Dumping Point";
          break;
        case "mitra":
          key = config.company || "Unknown Company";
          break;
        default:
          key = "Unknown";
      }

      if (!grouped[key]) {
        grouped[key] = {
          groupKey: key,
          items: [],
          count: 0,
        };
      }

      grouped[key].items.push(config);
      grouped[key].count += 1;
    });

    return Object.values(grouped);
  }, [configs, activeTab]);

  // Paginated groups
  const paginatedGroups = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    return groupedData.slice(startIdx, endIdx);
  }, [groupedData, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(groupedData.length / ITEMS_PER_PAGE);
  }, [groupedData]);

  // Get icon based on tab
  const getTabIcon = (tab) => {
    switch (tab) {
      case "all":
        return Settings;
      case "excavator":
        return Truck;
      case "loading":
        return MapPin;
      case "dumping":
        return MapPin;
      case "mitra":
        return Building2;
      default:
        return Settings;
    }
  };

  // Render single fleet row
  const renderFleetRow = (config, index) => {
    const isSelected = selectedIds.includes(config.id);
    const dtCount = getDumptruckCount ? getDumptruckCount(config.id) : 0;
    const dtList = getDumptruckList ? getDumptruckList(config) : [];

    return (
      <tr
        key={config.id}
        className={`shadow-sm dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
          isSelected && isPickingMode ? "bg-blue-50 dark:bg-blue-900/20" : ""
        }`}
      >
        {isPickingMode && (
          <td className="px-4 py-3 dark:text-gray-200">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(config.id)}
            />
          </td>
        )}
        <td className="px-4 py-3 text-sm font-medium dark:text-gray-300">
          {index + 1}
        </td>
        <td className="px-4 py-3 text-sm font-medium dark:text-gray-200">
          {config.excavator}
        </td>
        <td className="px-4 py-3 text-sm font-medium dark:text-gray-200">
          {config.measurementType}
        </td>
        <td className="px-4 py-3 text-sm dark:text-gray-300">
          {config.workUnit}
        </td>
        <td className="px-4 py-3 text-sm dark:text-gray-300">
          {config.loadingLocation}
        </td>
        <td className="px-4 py-3 text-sm dark:text-gray-300">
          {config.dumpingLocation}
        </td>

        {!isHistoryMode && getDumptruckCount && (
          <td className="px-4 py-3 text-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-left justify-start w-full cursor-pointer disabled:cursor-not-allowed"
                >
                  <span className="truncate">
                    {dtCount > 0 ? (
                      <StatusBadge status={`${dtCount} Unit`} variant="default" />
                    ) : (
                      <span className="text-gray-400">Kosong</span>
                    )}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-72 border-none bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
              >
                {dtList.length > 0 ? (
                  <>
                    <div className="px-4 py-2">
                      <p className="text-sm font-medium mb-2">
                        Dump Truck Pool ({dtList.length})
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {dtList.map((dt, i) => (
                        <div
                          key={dt.id}
                          className="flex px-4 py-2 border-b text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="font-medium pr-2">{i + 1}. </div>
                          <div className="font-medium">{dt.hull_no}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Belum ada dump truck
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        )}

        <td className="px-4 py-3 text-sm dark:text-gray-100">
          {formatDate(config.updatedAt)}
        </td>

        <td className="px-4 py-3 text-center dark:text-gray-100">
          <TableActions
            actions={[
              {
                label: isHistoryMode ? "Lihat" : "Detail",
                icon: Eye,
                onClick: () => onViewConfig(config),
              },
              ...(onEditConfig && !isHistoryMode
                ? [
                    {
                      label: "Edit",
                      icon: Edit,
                      onClick: () => onEditConfig(config),
                    },
                  ]
                : []),
              ...(onReactivate && isHistoryMode
                ? [
                    {
                      label: "Reaktivasi",
                      icon: RotateCcw,
                      onClick: () => onReactivate(config),
                    },
                  ]
                : []),
              ...(onDeleteConfig
                ? [
                    {
                      label: "Delete",
                      icon: Trash2,
                      onClick: () => onDeleteConfig(config),
                      disabled: config.isActive,
                      variant: "destructive",
                    },
                  ]
                : []),
            ]}
          />
        </td>
      </tr>
    );
  };

  // Render collapsible group
  const renderGroup = (group, groupIndex) => {
    const isExpanded = expandedGroups[group.groupKey] ?? true;
    const IconComponent = getTabIcon(activeTab);

    return (
      <Collapsible
        key={group.groupKey}
        open={isExpanded}
        onOpenChange={() => toggleGroup(group.groupKey)}
        className="mb-4"
      >
        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Collapsible Header */}
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {group.groupKey}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {group.count} fleet{group.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="dark:bg-gray-700 dark:text-neutral-50">
                  {group.count}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Collapsible Content */}
          <CollapsibleContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-200 dark:bg-gray-900 dark:border-gray-700">
                  <tr>
                    {isPickingMode && (
                      <th className="px-4 py-3 text-left dark:text-gray-200">
                        <Checkbox
                          checked={
                            group.items.length > 0 &&
                            group.items.every((c) => selectedIds.includes(c.id))
                          }
                          onCheckedChange={() => {
                            const groupIds = group.items.map((c) => c.id);
                            const allSelected = groupIds.every((id) =>
                              selectedIds.includes(id)
                            );

                            if (allSelected) {
                              onSelectAllPage?.();
                            } else {
                              groupIds.forEach((id) => {
                                if (!selectedIds.includes(id)) {
                                  onToggleSelect?.(id);
                                }
                              });
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                      Excavator
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                      Work Unit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                      Loading
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                      Dumping
                    </th>
                    {!isHistoryMode && getDumptruckCount && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                        Dump Truck
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-gray-200">
                      {isHistoryMode ? "Ditutup Pada" : "Updated At"}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-black dark:text-gray-200">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((config, index) =>
                    renderFleetRow(
                      config,
                      index + 1 + groupIndex * ITEMS_PER_PAGE
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  if (isLoading && !isRefreshing) {
    return <LoadingContent />;
  }

  if (configs.length === 0) {
    return (
      <EmptyState
        icon={Settings}
        title={
          hasActiveFilters
            ? "Tidak ada hasil"
            : isHistoryMode
              ? "Tidak Ada Riwayat"
              : "Belum Ada Konfigurasi"
        }
        description={
          isHistoryMode
            ? "Belum ada fleet dengan status CLOSED"
            : "Buat konfigurasi fleet pertama Anda untuk memulai"
        }
        variant="ghost"
      />
    );
  }

  return (
    <>
      {isRefreshing && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-900 dark:text-blue-300 font-medium">
            Memperbarui data...
          </span>
        </div>
      )}

      {isSaving && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
          <span className="text-sm text-green-900 font-medium">
            Menyimpan perubahan...
          </span>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          onPageChange(1);
          setExpandedGroups({});
        }}
        className="w-full"
      >
       <TabsList className="grid w-full grid-cols-5 mb-4 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger 
            value="all" 
            className="flex items-center gap-2 dark:text-neutral-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">All</span>
          </TabsTrigger>
          <TabsTrigger 
            value="excavator" 
            className="flex items-center gap-2 dark:text-neutral-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Excavator</span>
          </TabsTrigger>
          <TabsTrigger 
            value="loading" 
            className="flex items-center gap-2 dark:text-neutral-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Loading</span>
          </TabsTrigger>
          <TabsTrigger 
            value="dumping" 
            className="flex items-center gap-2 dark:text-neutral-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Dumping</span>
          </TabsTrigger>
          <TabsTrigger 
            value="mitra" 
            className="flex items-center gap-2 dark:text-neutral-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Mitra</span>
          </TabsTrigger>
        </TabsList>

        {["all", "excavator", "loading", "dumping", "mitra"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {paginatedGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Belum ada data fleet
                </p>
              </div>
            ) : (
              <>
                {/* Collapsible Groups */}
                <div className="space-y-4">
                  {paginatedGroups.map((group, index) =>
                    renderGroup(group, index)
                  )}
                </div>

                {/* Pagination */}
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
    </>
  );
};

export default FleetTableCollapsible;