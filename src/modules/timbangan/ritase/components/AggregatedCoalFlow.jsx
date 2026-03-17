import React, { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/shared/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, Eye, MoreVertical, Copy,CheckCircle } from "lucide-react";
import {
  DUMPING_POINT_GROUP,
  LOADING_POINT_GROUP,
} from "@/modules/timbangan/ritase/constant/ritaseConstants";

const AggregatedCoalFlow = ({
  type,
  aggregatedData,
  searchExcavator,
  searchDumpingPoint,
  searchLoadingPoint,
  isCCR,
  handleDetailClick,
  handleCheckerClick,
  handleDuplicate,
  handleApprovalClick,
}) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  const getTripCount = (item) => {
    return (
      item.tripCount ||
      item.total_ritase ||
      (item.ritases ? item.ritases.length : 0)
    );
  };

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

  const isDumping = type === "dumping";
  const hierarchyGroup = isDumping ? DUMPING_POINT_GROUP : LOADING_POINT_GROUP;
  const locationKey = isDumping ? "dumping_location" : "loading_location";
  const prefix = isDumping ? "dp-root" : "lp-root";

  const summariesData =
    aggregatedData?.summaries?.data ||
    (Array.isArray(aggregatedData) ? aggregatedData : []);

  const filteredSummaries = summariesData.filter((item) => {
    const matchExcavator =
      !searchExcavator ||
      item.unit_exca?.toLowerCase().includes(searchExcavator.toLowerCase());
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

  const locationMap = {};
  filteredSummaries.forEach((item) => {
    const loc = item[locationKey] || "-";
    if (!locationMap[loc]) locationMap[loc] = [];
    locationMap[loc].push(item);
  });

  const nodeHasData = (node) => {
    if (Array.isArray(node))
      return node.some((loc) => locationMap[loc]?.length > 0);
    if (typeof node === "string") return !!locationMap[node]?.length;
    if (node && typeof node === "object")
      return Object.values(node).some((v) => nodeHasData(v));
    return false;
  };

  const getNodeTotals = (node) => {
    let totalTrips = 0,
      totalWeight = 0;
    const collect = (n) => {
      if (Array.isArray(n)) {
        n.forEach((loc) =>
          (locationMap[loc] || []).forEach((item) => {
            totalTrips += parseInt(getTripCount(item)) || 0;
            totalWeight +=
              parseFloat(item.totalWeight || item.total_tonase || 0) || 0;
          }),
        );
      } else if (typeof n === "string") {
        (locationMap[n] || []).forEach((item) => {
          totalTrips += parseInt(getTripCount(item)) || 0;
          totalWeight +=
            parseFloat(item.totalWeight || item.total_tonase || 0) || 0;
        });
      } else if (n && typeof n === "object") {
        Object.values(n).forEach((v) => collect(v));
      }
    };
    collect(node);
    return { totalTrips, totalWeight };
  };

  const renderItemsTable = (items) => {
    if (!items?.length) return null;
    return (
      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-900/30">
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-10 text-xs">
                No
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                Exca
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                Loading
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                Dumping
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                Product Brand
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                Measurement
              </TableHead>
              <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs">
                Ritase
              </TableHead>
              <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold text-xs">
                Total Tonase
              </TableHead>
              <TableHead className="text-center text-gray-700 dark:text-gray-300 font-semibold w-16 text-xs">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow
                key={idx}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <TableCell className="text-gray-600 dark:text-gray-400 text-xs">
                  {idx + 1}
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
                        className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-neutral-50"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 bg-neutral-50 dark:bg-slate-800 dark:text-neutral-50 border-none shadow-sm shadow-slate-700"
                    >
                      <DropdownMenuItem
                        onClick={() => handleDetailClick(item)}
                        className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 text-xs"
                      >
                        <Eye className="mr-2 h-3 w-3" /> Detail
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleCheckerClick(item)}
                        className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 text-xs"
                      >
                        <Eye className="mr-2 h-3 w-3" /> Lihat Kertas Checker
                      </DropdownMenuItem>
                      {isCCR && (
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(item)}
                          className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 text-xs"
                        >
                          <Copy className="mr-2 h-3 w-3" /> Tambah Ritase
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {/* <DropdownMenuItem
                        onClick={() => handleApprovalClick(item)}
                        className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs"
                      >
                        <CheckCircle className="mr-2 h-3 w-3" /> Approval
                      </DropdownMenuItem> */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderLeaf = (locationName, keyPrefix) => {
    const items = locationMap[locationName] || [];
    if (!items.length) return null;
    const leafId = `${keyPrefix}-${locationName}`;
    const isExpanded = expandedGroups[leafId] === true;
    const leafTrips = items.reduce(
      (s, i) => s + (parseInt(getTripCount(i)) || 0),
      0,
    );
    const leafWeight = items.reduce(
      (s, i) => s + (parseFloat(i.totalWeight || i.total_tonase || 0) || 0),
      0,
    );

    const activeFleetCount = items.filter(
      (item) => item.is_beltconveyor !== true,
    ).length;
    const rawCoalFlow = aggregatedData?.coal_flow;
    const coalFlowList = Array.isArray(rawCoalFlow)
      ? rawCoalFlow
      : rawCoalFlow && typeof rawCoalFlow === "object"
      ? [rawCoalFlow]
      : [];
    const matchedCoalFlow = coalFlowList.filter((item) => {
      if (type === "dumping") return item.dumping_location === locationName;
      return item.loading_location === locationName;
    });

    let targetFleet = 0;
    let targetTonase = 0;
    matchedCoalFlow.forEach((item) => {
      targetFleet += parseInt(item.total_fleet) || 0;
      targetTonase += parseFloat(item.total_tonase) || 0;
    });

    const remainingFleetCount =
      targetFleet > 0 ? targetFleet - activeFleetCount : 0;

    return (
      <Collapsible
        key={leafId}
        open={isExpanded}
        onOpenChange={(open) =>
          setExpandedGroups((prev) => ({ ...prev, [leafId]: open }))
        }
        className="mb-1 last:mb-0"
      >
        <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
          <CollapsibleTrigger className="w-full h-full cursor-pointer p-2 bg-gray-50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors border-l-2 border-gray-400 dark:border-gray-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 h-full">
              <div className="flex items-center gap-2 min-w-0">
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 text-gray-500 shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />
                )}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-left truncate">
                  {locationName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] sm:text-xs shrink-0 flex-wrap sm:flex-nowrap">
                {targetFleet > 0 && (
                  <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 mr-2 min-w-16">
                    <div className="text-[9px] text-blue-600 dark:text-blue-400 uppercase leading-none mb-0.5 font-semibold">
                      T.Fleet
                    </div>
                    <div className="flex justify-between w-full text-gray-700 dark:text-gray-300 gap-2">
                      <span
                        className="flex flex-col items-center"
                        title="Target Fleet"
                      >
                        <span className="text-[8px] text-gray-400">Target</span>
                        <span className="leading-none text-blue-600 dark:text-blue-400 font-bold">
                          {targetFleet}
                        </span>
                      </span>
                      <span
                        className="flex flex-col items-center"
                        title="Aktif"
                      >
                        <span className="text-[8px] text-gray-400">Aktif</span>
                        <span className="leading-none text-green-600 dark:text-green-400 font-bold">
                          {activeFleetCount}
                        </span>
                      </span>
                      <span className="flex flex-col items-center" title="Sisa">
                        <span className="text-[8px] text-gray-400">Sisa</span>
                        <span className="leading-none text-amber-600 dark:text-amber-400 font-bold">
                          {remainingFleetCount}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
                {targetTonase > 0 && (
                  <div className="flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 mr-2 min-w-16">
                    <div className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase leading-none mb-0.5 font-semibold">
                      T.Tonase
                    </div>
                    <div className="flex justify-between w-full text-gray-700 dark:text-gray-300 gap-2">
                      <span
                        className="flex flex-col items-center"
                        title="Target Tonase"
                      >
                        <span className="text-[8px] text-gray-400">Target</span>
                        <span className="leading-none text-indigo-600 dark:text-indigo-400 font-bold">
                          {targetTonase.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </span>
                      <span
                        className="flex flex-col items-center"
                        title="Tercapai"
                      >
                        <span className="text-[8px] text-gray-400">Aktual</span>
                        <span className="leading-none text-green-600 dark:text-green-400 font-bold">
                          {leafWeight.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
                <span className="text-blue-600 flex flex-col items-end dark:text-blue-400 font-semibold px-2">
                  <span className="text-[9px] text-gray-500 uppercase font-normal leading-none mb-0.5">
                    Total Rit
                  </span>
                  {leafTrips} rit
                </span>
                <span className="text-green-600 flex flex-col items-end dark:text-green-400 font-semibold px-2">
                  <span className="text-[9px] text-gray-500 uppercase font-normal leading-none mb-0.5">
                    Total Ton
                  </span>
                  {leafWeight.toFixed(2)} ton
                </span>
                <div className="flex items-center bl-1 border-l border-gray-300 dark:border-gray-600 pl-2"></div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>{renderItemsTable(items)}</CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const levelStyles = {
    1: {
      badge: "bg-blue-600 dark:bg-blue-500 text-white text-sm px-3",
      border: "border-b-2 border-blue-500 dark:border-blue-400",
      containerBg: "bg-gray-100 dark:bg-gray-800/50",
      wrapper: "mb-4 sm:mb-6 last:mb-0",
      content: "p-3",
    },
    2: {
      badge: "bg-purple-600 dark:bg-purple-500 text-white text-xs px-2",
      border: "border-b-2 border-purple-400 dark:border-purple-500",
      containerBg: "bg-gray-50 dark:bg-gray-900/30",
      wrapper: "ml-2 mb-2 last:mb-0",
      content: "p-2",
    },
    3: {
      badge: "bg-teal-600 dark:bg-teal-500 text-white text-xs px-2",
      border: "border-b border-teal-400 dark:border-teal-500",
      containerBg: "bg-white dark:bg-gray-900/20",
      wrapper: "ml-4 mb-1 last:mb-0",
      content: "p-2",
    },
  };

  const renderNode = (label, node, level, keyPrefix) => {
    if (!nodeHasData(node)) return null;
    const s = levelStyles[level] || levelStyles[3];
    const nodeId = `${keyPrefix}-${label}`;
    const isExpanded = expandedGroups[nodeId] === true;
    const { totalTrips, totalWeight } = getNodeTotals(node);

    return (
      <Collapsible
        key={nodeId}
        open={isExpanded}
        onOpenChange={(open) =>
          setExpandedGroups((prev) => ({ ...prev, [nodeId]: open }))
        }
        className={s.wrapper}
      >
        <div
          className={`${s.containerBg} rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden`}
        >
          <CollapsibleTrigger
            className={`w-full cursor-pointer p-3 ${s.border} hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                  )}
                  <Badge className={s.badge}>{label}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left sm:text-right flex flex-col justify-center">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ritase
                  </div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {totalTrips.toLocaleString("en-US")}
                  </div>
                </div>
                <div className="text-left sm:text-right flex flex-col justify-center">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tonase
                  </div>
                  <div className="text-sm font-bold text-green-600 dark:text-green-400">
                    {totalWeight.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={s.content}>
              {Array.isArray(node) &&
                node.map((loc) => renderLeaf(loc, nodeId))}
              {typeof node === "string" && renderLeaf(node, nodeId)}
              {!Array.isArray(node) &&
                node &&
                typeof node === "object" &&
                Object.entries(node).map(([subLabel, subNode]) =>
                  renderNode(subLabel, subNode, level + 1, nodeId),
                )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  if (!filteredSummaries.length) return null;

  const nodes = Object.entries(hierarchyGroup)
    .map(([groupName, groupValue]) =>
      renderNode(groupName, groupValue, 1, prefix),
    )
    .filter(Boolean);

  if (!nodes.length) return null;
  return <div>{nodes}</div>;
};

export default AggregatedCoalFlow;
