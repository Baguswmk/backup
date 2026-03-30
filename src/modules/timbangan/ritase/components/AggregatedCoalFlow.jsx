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
import { ChevronDown, ChevronUp, Eye, MoreVertical, Copy } from "lucide-react";
import {
  DUMPING_POINT_GROUP,
  LOADING_POINT_GROUP,
} from "@/modules/timbangan/ritase/constant/ritaseConstants";

// Reusable badge dengan 3 sub-nilai
function StatBadge({ label, accent, items }) {
  const accentMap = {
    green: {
      wrap: "bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800",
      label: "text-green-600 dark:text-green-400",
      value: "text-green-700 dark:text-green-300",
    },
    blue: {
      wrap: "bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800",
      label: "text-blue-600  dark:text-blue-400",
      value: "text-blue-700  dark:text-blue-300",
    },
    amber: {
      wrap: "bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800",
      label: "text-amber-600 dark:text-amber-400",
      value: "text-amber-700 dark:text-amber-300",
    },
  };
  const c = accentMap[accent];

  return (
    <div
      className={`flex flex-col items-center rounded border px-2 py-1 min-w-22 ${c.wrap}`}
    >
      <span
        className={`text-[9px] font-semibold uppercase tracking-wide leading-none mb-1 ${c.label}`}
      >
        {label}
      </span>
      <div className="flex gap-2">
        {items.map(({ sub, value }) => (
          <span key={sub} className="flex flex-col items-center">
            <span className="text-[8px] text-gray-400 dark:text-gray-500 leading-none mb-0.5">
              {sub}
            </span>
            <span className={`text-[11px] font-bold leading-none ${c.value}`}>
              {value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Reusable summary value di sebelah kanan
function SummaryValue({ label, value }) {
  return (
    <span className="flex flex-col items-end px-1">
      <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-none mb-0.5">
        {label}
      </span>
      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-none">
        {value}
      </span>
    </span>
  );
}

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
  currentShift,
}) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  const isMMCTWorkUnit = (picWorkUnit) =>
    (picWorkUnit || "").trim().toLowerCase() ===
    "mine-mouth coal transportation";

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

  const getLocationsFromNode = (node) => {
    let locations = [];
    const extract = (n) => {
      if (Array.isArray(n)) locations.push(...n);
      else if (typeof n === "string") locations.push(n);
      else if (n && typeof n === "object") Object.values(n).forEach(extract);
    };
    extract(node);
    return [...new Set(locations)];
  };

  const getNodeMetrics = (node) => {
    const locations = getLocationsFromNode(node);
    
    let totalTrips = 0;
    let totalWeight = 0;
    
    const miningExcaSet = new Set();
    const chtExcaSet = new Set();
    const totalExcaSet = new Set();
    
    locations.forEach(loc => {
      const items = locationMap[loc] || [];
      items.forEach(item => {
        const locLoad = (item.loading_location || "").trim().toLowerCase();
        const locDump = (item.dumping_location || "").trim().toLowerCase();
        
        if (locLoad !== locDump) {
          totalTrips += parseInt(getTripCount(item)) || 0;
          totalWeight += parseFloat(item.totalWeight || item.total_tonase || 0) || 0;
          
          if (item.is_beltconveyor !== true) {
            const excaId = item.unit_exca || `unknown-${Math.random()}`;
            totalExcaSet.add(excaId);
            if (isMMCTWorkUnit(item.pic_work_unit)) chtExcaSet.add(excaId);
            else miningExcaSet.add(excaId);
          }
        }
      });
    });

    let miningActive = miningExcaSet.size;
    let chtActive = chtExcaSet.size;
    let totalActive = totalExcaSet.size;

    let miningTarget = 0, chtTarget = 0, totalTarget = 0;
    let totalTargetTonase = 0;

    const rawCoalFlow = aggregatedData?.coal_flow;
    const coalFlowList = Array.isArray(rawCoalFlow)
      ? rawCoalFlow
      : rawCoalFlow && typeof rawCoalFlow === "object"
        ? [rawCoalFlow]
        : [];

    locations.forEach(loc => {
      const matchedCoalFlow = coalFlowList.filter((item) => {
        const isTargetMatch = type === "dumping"
          ? item.dumping_location === loc
          : item.loading_location === loc;
        const locLoad = (item.loading_location || "").trim().toLowerCase();
        const locDump = (item.dumping_location || "").trim().toLowerCase();
        const isValidFlow = locLoad !== locDump;
        return isTargetMatch && isValidFlow;
      });

      matchedCoalFlow.forEach(item => {
        let fleet = parseInt(item.total_fleet) || 0;
        let tonase = parseFloat(item.total_tonase) || 0;
        
        if (
          currentShift &&
          currentShift.toLowerCase() !== "all shift" &&
          currentShift.toLowerCase() !== "semua shift" &&
          currentShift.toLowerCase() !== "all"
        ) {
          let shiftTonase = tonase / 3;

          let startHour = 6;
          if (currentShift === "Shift 1") startHour = 6;
          else if (currentShift === "Shift 2") startHour = 14;
          else if (currentShift === "Shift 3") startHour = 22;

          const now = new Date();
          const currentHour = now.getHours();

          let hoursOffset = currentHour - startHour;
          if (hoursOffset < 0) hoursOffset += 24;

          let elapsedHours = hoursOffset >= 8 ? 8 : hoursOffset;

          tonase = (shiftTonase / 8) * Math.max(0, elapsedHours);
        }

        totalTarget += fleet;
        totalTargetTonase += tonase;
        if (isMMCTWorkUnit(item.pic_work_unit)) chtTarget += fleet;
        else miningTarget += fleet;
      });
    });

    return { 
      totalTrips, totalWeight,
      miningTarget, miningActive, 
      chtTarget, chtActive, 
      totalTarget, totalActive,
      totalTargetTonase
    };
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
    const metrics = getNodeMetrics(locationName);

    return (
      <Collapsible
        key={leafId}
        open={isExpanded}
        onOpenChange={(open) =>
          setExpandedGroups((prev) => ({ ...prev, [leafId]: open }))
        }
        className="mb-1 last:mb-0"
      >
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <CollapsibleTrigger className="w-full cursor-pointer p-2.5 bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors border-l-2 border-slate-400 dark:border-slate-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* Location name + chevron */}
              <div className="flex items-center gap-2 min-w-0">
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                )}
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-left truncate">
                  {locationName}
                </span>
              </div>

              {/* Stats group */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <StatBadge
                  label="Mining"
                  accent="green"
                  items={[
                    { sub: "Aktif", value: metrics.miningActive },
                  ]}
                />
                <StatBadge
                  label="CHT"
                  accent="blue"
                  items={[
                    { sub: "Aktif", value: metrics.chtActive },
                  ]}
                />
                  <StatBadge
                    label="Total Fleet"
                    accent="amber"
                    items={[
                      { sub: "Aktif", value: metrics.totalActive },
                    ]}
                  />

                <div className="hidden sm:block h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                <SummaryValue label="Total Rit" value={`${metrics.totalTrips.toLocaleString("en-US")} rit`} />
                  <SummaryValue
                    label="Total Ton Rencana"
                    value={`${metrics.totalTargetTonase.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton`}
                  />
                <SummaryValue
                  label="Total Ton Aktual"
                  value={`${metrics.totalWeight.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton`}
                />
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
    const metrics = getNodeMetrics(node);

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                )}
                <Badge className={s.badge}>{label}</Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <StatBadge
                  label="Mining"
                  accent="green"
                  items={[
                    { sub: "Target", value: metrics.miningTarget },
                    { sub: "Aktif", value: metrics.miningActive },
                    { sub: "Sisa", value: Math.max(0, metrics.miningTarget - metrics.miningActive) },
                  ]}
                />
                <StatBadge
                  label="CHT"
                  accent="blue"
                  items={[
                    { sub: "Target", value: metrics.chtTarget },
                    { sub: "Aktif", value: metrics.chtActive },
                    { sub: "Sisa", value: Math.max(0, metrics.chtTarget - metrics.chtActive) },
                  ]}
                />
                  <StatBadge
                    label="Total Fleet"
                    accent="amber"
                    items={[
                      { sub: "Target", value: metrics.totalTarget },
                      { sub: "Aktif", value: metrics.totalActive },
                      { sub: "Sisa", value: Math.max(0, metrics.totalTarget - metrics.totalActive) },
                    ]}
                  />

                <div className="hidden sm:block h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                <SummaryValue label="Total Rit" value={`${metrics.totalTrips.toLocaleString("en-US")} rit`} />
                  <SummaryValue
                    label="Total Ton Rencana"
                    value={`${metrics.totalTargetTonase.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton`}
                  />
                <SummaryValue
                  label="Total Ton Aktual"
                  value={`${metrics.totalWeight.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton`}
                />
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
