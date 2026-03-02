import React, { useMemo, useState, useRef, useEffect } from "react";
import { Loader2, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";
import Pagination from "@/shared/components/Pagination";

const FleetSettingTable = ({
  fleetData = [],
  selectedSatker,
  selectedUrutkan,
  isLoading = false,
  onViewFleet,
  onEditFleet,
  onDeleteFleet,
  itemsPerPage,
  onItemsPerPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    fleetId: null,
    position: "bottom",
    data: [],
    locked: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const tooltipRef = useRef(null);

  const groupedFleetData = useMemo(() => {
    if (!fleetData || fleetData.length === 0) return [];

    let filtered = fleetData;

    if (selectedSatker) {
      filtered = filtered.filter((fleet) => fleet.workUnit === selectedSatker);
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((fleet) => {
        const excavatorMatch = fleet.excavator?.toLowerCase().includes(query);
        const loadingMatch = fleet.loadingLocation
          ?.toLowerCase()
          .includes(query);
        const dumpingMatch = fleet.dumpingLocation
          ?.toLowerCase()
          .includes(query);
        const mitraMatch = fleet.excavatorCompany
          ?.toLowerCase()
          .includes(query);
        const satkerMatch = fleet.workUnit?.toLowerCase().includes(query);
        const coalTypeMatch = fleet.coalType?.toLowerCase().includes(query);
        const measurementMatch = fleet.measurementType
          ?.toLowerCase()
          .includes(query);

        const unitsMatch =
          fleet.units &&
          Array.isArray(fleet.units) &&
          fleet.units.some((unit) => {
            const hullNoMatch = unit.hull_no?.toLowerCase().includes(query);
            const operatorMatch = unit.operator?.toLowerCase().includes(query);
            const companyMatch = unit.company?.toLowerCase().includes(query);
            return hullNoMatch || operatorMatch || companyMatch;
          });

        return (
          excavatorMatch ||
          loadingMatch ||
          dumpingMatch ||
          mitraMatch ||
          satkerMatch ||
          coalTypeMatch ||
          measurementMatch ||
          unitsMatch
        );
      });
    }

    let groupingKey = "loadingLocation";
    let groupLabel = "Loading Point";

    if (selectedUrutkan === "loading" || selectedUrutkan === "all") {
      groupingKey = "loadingLocation";
      groupLabel = "Loading Point";
    } else if (selectedUrutkan === "mitra") {
      groupingKey = "excavatorCompany";
      groupLabel = "Mitra";
    } else if (selectedUrutkan === "satker") {
      groupingKey = "satker";
      groupLabel = "Satker";
    } else if (selectedUrutkan === "dumping") {
      groupingKey = "dumpingLocation";
      groupLabel = "Dumping Point";
    }

    const grouped = {};
    filtered.forEach((fleet) => {
      const groupValue = fleet[groupingKey] || "Unknown";
      if (!grouped[groupValue]) grouped[groupValue] = [];
      grouped[groupValue].push(fleet);
    });

    const result = Object.entries(grouped).map(([location, fleets]) => {
      let totalTronton = 0;
      let totalTrintin = 0;
      const mitraCount = {};

      const excavatorGroups = {};
      fleets.forEach((fleet) => {
        const key = `${fleet.excavatorId || fleet.excavator}-${fleet.loadingLocationId || fleet.loadingLocation}`;
        if (!excavatorGroups[key]) excavatorGroups[key] = [];
        excavatorGroups[key].push(fleet);
      });

      const processedRows = [];

      Object.values(excavatorGroups).forEach((group) => {
        const hasSplitFlag = group.some((f) => f.isSplit === true);
        const shouldMerge = group.length > 1 && hasSplitFlag;

        if (shouldMerge) {
          let groupTronton = 0;
          let groupTrintin = 0;
          let groupDumptruckCount = 0; // Akumulasi total DT dari semua fleet dalam grup
          const groupMitraCount = {}; // Akumulasi mitra dari semua fleet dalam grup

          const firstFleet = group[0];
          const allSameExcavator = group.every(
            (f) => f.excavator === firstFleet.excavator,
          );
          const allSameLoading = group.every(
            (f) => f.loadingLocation === firstFleet.loadingLocation,
          );

          // Loop semua fleet dulu untuk akumulasi groupMitraCount & groupDumptruckCount
          group.forEach((fleet) => {
            if (fleet.units && Array.isArray(fleet.units)) {
              fleet.units.forEach((unit) => {
                const unitType = unit.type_dt?.toLowerCase() || "";
                const companyName = unit.company || "Unknown";

                // Akumulasi mitra grup (dikumpulkan dari semua fleet)
                if (!groupMitraCount[companyName])
                  groupMitraCount[companyName] = 0;
                groupMitraCount[companyName]++;

                // Akumulasi mitra global
                if (!mitraCount[companyName]) mitraCount[companyName] = 0;
                mitraCount[companyName]++;

                // Akumulasi total DT grup
                groupDumptruckCount++;

                if (unitType.includes("tronton")) {
                  totalTronton++;
                  groupTronton++;
                } else if (unitType.includes("trintin")) {
                  totalTrintin++;
                  groupTrintin++;
                }
              });
            }
          });

          // Setelah akumulasi selesai, baru buat processedRows per fleet
          group.forEach((fleet, fleetIdx) => {
            let fleetTronton = 0;
            let fleetTrintin = 0;
            let fleetDTCount = 0;

            if (fleet.units && Array.isArray(fleet.units)) {
              fleet.units.forEach((unit) => {
                const unitType = unit.type_dt?.toLowerCase() || "";
                fleetDTCount++;
                if (unitType.includes("tronton")) fleetTronton++;
                else if (unitType.includes("trintin")) fleetTrintin++;
              });
            }

            processedRows.push({
              ...fleet,
              tronton: fleetTronton,
              trintin: fleetTrintin,
              actualDTCount: fleetDTCount,

              isMergedGroup: true,
              isFirstInGroup: fleetIdx === 0,
              groupSize: group.length,
              splitFleets: group,

              mergeExcavator: allSameExcavator,
              mergeLoading: allSameLoading,

              groupTronton,
              groupTrintin,
              groupDumptruckCount, // Total DT dari fleet 1 + fleet 2 + dst
              groupMitraCount, // Mitra terakumulasi dari semua fleet
            });
          });
        } else {
          const fleet = group[0];
          let fleetTronton = 0;
          let fleetTrintin = 0;
          let fleetDTCount = 0;
          const fleetMitraCount = {};

          if (fleet.units && Array.isArray(fleet.units)) {
            fleet.units.forEach((unit) => {
              const unitType = unit.type_dt?.toLowerCase() || "";
              const companyName = unit.company || "Unknown";

              // Akumulasi mitra fleet
              if (!fleetMitraCount[companyName])
                fleetMitraCount[companyName] = 0;
              fleetMitraCount[companyName]++;

              // Akumulasi mitra global
              if (!mitraCount[companyName]) mitraCount[companyName] = 0;
              mitraCount[companyName]++;

              // Hitung DT
              fleetDTCount++;

              if (unitType.includes("tronton")) {
                fleetTronton++;
                totalTronton++;
              } else if (unitType.includes("trintin")) {
                fleetTrintin++;
                totalTrintin++;
              }
            });
          }

          processedRows.push({
            ...fleet,
            tronton: fleetTronton,
            trintin: fleetTrintin,
            actualDTCount: fleetDTCount,
            isMergedGroup: false,
            isFirstInGroup: true,
            groupSize: 1,
            splitFleets: [fleet],
            groupMitraCount: fleetMitraCount,
            groupDumptruckCount: fleetDTCount,
          });
        }
      });

      return {
        location,
        groupLabel,
        rows: processedRows,
        totalTronton,
        totalTrintin,
        mitraCount,
        totalDumptrucks: processedRows
          .filter((fleet) => fleet.isFirstInGroup)
          .reduce((sum, fleet) => sum + (fleet.groupDumptruckCount || 0), 0),
      };
    });

    return result;
  }, [fleetData, selectedSatker, selectedUrutkan, searchQuery]);

  const totalPages = Math.ceil(groupedFleetData.length / itemsPerPage);

  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return groupedFleetData.slice(startIndex, endIndex);
  }, [groupedFleetData, currentPage, itemsPerPage]);

  useMemo(() => {
    setCurrentPage(1);
  }, [selectedSatker, selectedUrutkan, searchQuery]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTooltipShow = (fleet, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const position =
      spaceBelow >= 400 ? "bottom" : spaceAbove > 300 ? "top" : "bottom";

    setTooltipState({
      visible: true,
      fleetId: fleet.id,
      position: position,
      data: fleet.units || [],
      locked: false,
    });
  };

  const handleTooltipHide = () => {
    if (!tooltipState.locked) {
      setTooltipState({
        visible: false,
        fleetId: null,
        position: "bottom",
        data: [],
        locked: false,
      });
    }
  };

  const handleTooltipClick = (fleet, event) => {
    event.stopPropagation();
    if (tooltipState.locked && tooltipState.fleetId === fleet.id) {
      setTooltipState({
        visible: false,
        fleetId: null,
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

      const tooltipData = fleet.isMergedGroup
        ? fleet.splitFleets.flatMap((f) => f.units || [])
        : fleet.units || [];

      setTooltipState({
        visible: true,
        fleetId: fleet.id,
        position: position,
        data: tooltipData,
        locked: true,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setTooltipState({
          visible: false,
          fleetId: null,
          position: "bottom",
          data: [],
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

  const grandTotals = useMemo(() => {
    const totals = {
      totalTronton: 0,
      totalTrintin: 0,
      totalDumptrucks: 0,
      totalFleets: 0,
      mitraCount: {},
    };

    paginatedGroups.forEach((group) => {
      totals.totalTronton += group.totalTronton;
      totals.totalTrintin += group.totalTrintin;
      totals.totalDumptrucks += group.totalDumptrucks;
      totals.totalFleets += group.rows.length;

      Object.entries(group.mitraCount || {}).forEach(([mitra, count]) => {
        if (!totals.mitraCount[mitra]) totals.mitraCount[mitra] = 0;
        totals.mitraCount[mitra] += count;
      });
    });

    return totals;
  }, [paginatedGroups]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan excavator, hull_no, loading point, dumping point, mitra, satker..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Ditemukan{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {groupedFleetData.reduce(
                (sum, group) => sum + group.rows.length,
                0,
              )}
            </span>{" "}
            hasil
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs bg-white dark:bg-gray-800">
          <thead className="bg-linear-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white sticky top-0 z-10 shadow-md">
            <tr>
              <th className="px-4 py-3 text-left font-semibold border-r border-blue-500 dark:border-blue-600">
                No
              </th>
              <th className="px-4 py-3 text-left font-semibold border-r border-blue-500 dark:border-blue-600">
                Excavator
              </th>
              <th className="px-4 py-3 text-left font-semibold border-r border-blue-500 dark:border-blue-600">
                Loading Point
              </th>
              <th className="px-4 py-3 text-left font-semibold border-r border-blue-500 dark:border-blue-600">
                Dumping Point
              </th>
              <th className="px-4 py-3 text-left font-semibold border-r border-blue-500 dark:border-blue-600">
                Mitra
              </th>
              <th className="px-4 py-3 text-left font-semibold border-r border-blue-500 dark:border-blue-600">
                Jenis Batubara
              </th>
              <th className="px-4 py-3 text-left font-semibold border-r border-blue-500 dark:border-blue-600">
                Satker
              </th>
              <th className="px-4 py-3 text-left font-semibold border-r border-blue-500 dark:border-blue-600">
                Tipe Pengukuran
              </th>
              <th className="px-4 py-3 text-center font-semibold border-r border-blue-500 dark:border-blue-600">
                Jarak (m)
              </th>
              <th className="px-4 py-3 text-center font-semibold border-r border-blue-500 dark:border-blue-600">
                Tronton
              </th>
              <th className="px-4 py-3 text-center font-semibold border-r border-blue-500 dark:border-blue-600">
                Trintin
              </th>
              <th className="px-4 py-3 text-center font-semibold border-r border-blue-500 dark:border-blue-600">
                Jumlah DT
              </th>
              <th className="px-4 py-3 text-center font-semibold border-r border-blue-500 dark:border-blue-600">
                Ket.
              </th>
              <th className="px-4 py-3 text-center font-semibold">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan="14" className="px-1 py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="ml-3 text-gray-600 dark:text-gray-300">
                      Memuat data...
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {(() => {
                  let rowCounter = 0;
                  return paginatedGroups.map((group, groupIdx) => (
                    <React.Fragment key={`group-${groupIdx}`}>
                      {/* Header Grup */}
                      <tr className="bg-linear-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                        <td
                          colSpan="14"
                          className="px-1 py-1 font-bold text-gray-800 dark:text-gray-100 text-xs"
                        >
                          {group.groupLabel}: {group.location}
                        </td>
                      </tr>

                      {/* Baris-baris fleet dalam grup */}
                      {group.rows.map((fleet, fleetIdx) => {
                        rowCounter++;
                        return (
                          <tr
                            key={`row-${fleet.id}-${fleetIdx}`}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            {/* No */}
                            <td className="px-1 py-1 text-left border-r border-gray-300 dark:border-gray-600 dark:text-gray-200">
                              {rowCounter}
                            </td>

                            {/* Excavator */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-1 py-1 text-left border-r border-gray-300 dark:border-gray-600 align-middle"
                                rowSpan={fleet.groupSize}
                              >
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {fleet.excavator}
                                </div>
                              </td>
                            )}

                            {/* Loading Point */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-1 py-1 text-left border-r border-gray-300 dark:border-gray-600 align-middle"
                                rowSpan={fleet.groupSize}
                              >
                                <div className="text-gray-700 dark:text-gray-300">
                                  {fleet.loadingLocation}
                                </div>
                              </td>
                            )}

                            {/* Dumping Point */}
                            <td className="px-1 py-1 text-left border-r border-gray-300 dark:border-gray-600">
                              <div className="text-gray-700 dark:text-gray-300">
                                {fleet.dumpingLocation}
                              </div>
                            </td>

                            {/* Mitra - list mitra DT dengan count (Opsi 2) */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-1 py-1 text-left border-r border-gray-300 dark:border-gray-600 align-middle"
                                rowSpan={fleet.groupSize}
                              >
                                <div className="text-gray-700 dark:text-gray-300">
                                  {fleet.groupMitraCount &&
                                  Object.keys(fleet.groupMitraCount).length >
                                    0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(
                                        fleet.groupMitraCount,
                                      ).map(([mitra, count], idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                        >
                                          {mitra} ({count})
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Jenis Batubara */}
                            <td className="px-1 py-1 text-left border-r border-gray-300 dark:border-gray-600">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                                {fleet.coalType}
                              </span>
                            </td>

                            {/* Satker */}
                            <td className="px-1 py-1 text-left border-r border-gray-300 dark:border-gray-600">
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {fleet.workUnit}
                              </div>
                            </td>

                            {/* Tipe Pengukuran */}
                            <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {fleet.measurementType}
                            </td>

                            {/* Jarak */}
                            <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {fleet.distance?.toLocaleString("id-ID")}
                            </td>

                            {/* Tronton */}
                            <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {fleet.tronton}
                            </td>

                            {/* Trintin */}
                            <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {fleet.trintin}
                            </td>

                            {/* Jumlah DT - total akumulasi dari semua fleet dalam grup */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 relative"
                                rowSpan={fleet.groupSize}
                              >
                                <div
                                  className="inline-block cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                  onMouseEnter={(e) => {
                                    const tooltipData = fleet.isMergedGroup
                                      ? fleet.splitFleets.flatMap(
                                          (f) => f.units || [],
                                        )
                                      : fleet.units || [];

                                    handleTooltipShow(
                                      { ...fleet, units: tooltipData },
                                      e,
                                    );
                                  }}
                                  onMouseLeave={handleTooltipHide}
                                  onClick={(e) => handleTooltipClick(fleet, e)}
                                  ref={
                                    tooltipState.fleetId === fleet.id
                                      ? tooltipRef
                                      : null
                                  }
                                >
                                  {/* Tampilkan total DT (fleet 1 + fleet 2 + dst) */}
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {fleet.groupDumptruckCount || "-"}
                                  </span>

                                  {/* Tooltip: Hull No - Mitra - Operator */}
                                  {tooltipState.visible &&
                                    tooltipState.fleetId === fleet.id && (
                                      <div
                                        className={`absolute ${
                                          tooltipState.position === "top"
                                            ? "bottom-full mb-2"
                                            : "top-full mt-2"
                                        } left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[300px] max-w-[400px]`}
                                      >
                                        {/* Arrow */}
                                        <div
                                          className={`absolute left-1/2 transform -translate-x-1/2 w-0 h-0 ${
                                            tooltipState.position === "top"
                                              ? "top-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-300 dark:border-t-gray-600"
                                              : "bottom-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-300 dark:border-b-gray-600"
                                          }`}
                                        />

                                        <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                                          List Dumptruck (
                                          {tooltipState.data.length})
                                        </div>

                                        {tooltipState.data.length > 0 ? (
                                          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                                            <ul className="space-y-1.5">
                                              {tooltipState.data.map(
                                                (unit, idx) => (
                                                  <li
                                                    key={idx}
                                                    className="text-xs text-gray-600 dark:text-gray-400 py-1.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
                                                  >
                                                    <div className="flex flex-col gap-0.5">
                                                      <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                          {unit.hull_no ||
                                                            `Unit ${idx + 1}`}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                          {unit.type_dt || "-"}
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                                          {unit.company ||
                                                            "Unknown Mitra"}
                                                        </span>
                                                        <span className="text-gray-400">
                                                          •
                                                        </span>
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                          {unit.operator ||
                                                            "No Operator"}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                                            Tidak ada data dumptruck
                                          </p>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </td>
                            )}

                            {/* Ket. */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 align-middle"
                                rowSpan={fleet.groupSize}
                              >
                                {fleet.isMergedGroup ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                    Split
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    -
                                  </span>
                                )}
                              </td>
                            )}

                            {/* Aksi */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-1 py-1 text-center"
                                rowSpan={fleet.groupSize}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                  >
                                    {onViewFleet && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          onViewFleet(
                                            fleet.isMergedGroup
                                              ? fleet.splitFleets
                                              : fleet,
                                          )
                                        }
                                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        <span>
                                          Lihat Detail
                                          {fleet.isMergedGroup &&
                                            ` (${fleet.groupSize})`}
                                        </span>
                                      </DropdownMenuItem>
                                    )}
                                    {onEditFleet && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          onEditFleet(
                                            fleet.isMergedGroup
                                              ? fleet.splitFleets
                                              : fleet,
                                          )
                                        }
                                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>
                                          Edit
                                          {fleet.isMergedGroup &&
                                            ` (${fleet.groupSize})`}
                                        </span>
                                      </DropdownMenuItem>
                                    )}
                                    {onDeleteFleet && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() =>
                                            onDeleteFleet(
                                              fleet.isMergedGroup
                                                ? fleet.splitFleets
                                                : fleet,
                                            )
                                          }
                                          className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          <span>
                                            Hapus
                                            {fleet.isMergedGroup &&
                                              ` (${fleet.groupSize})`}
                                          </span>
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {/* Subtotal grup */}
                      <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                        <td
                          colSpan="9"
                          className="px-1 py-1 text-right border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                        >
                          <div className="flex flex-col items-end gap-1">
                            <span>
                              Jumlah Fleet {group.groupLabel || "Group"}{" "}
                              {group.location}
                            </span>
                            {Object.keys(group.mitraCount || {}).length > 0 && (
                              <div className="text-[10px] font-normal text-gray-600 dark:text-gray-400">
                                Mitra:{" "}
                                {Object.entries(group.mitraCount)
                                  .map(
                                    ([mitra, count]) => `${mitra} (${count})`,
                                  )
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                          {group.totalTronton}
                        </td>
                        <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                          {group.totalTrintin}
                        </td>
                        <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                          {group.totalDumptrucks}
                        </td>
                        <td colSpan="2" className="px-1 py-1 text-center"></td>
                      </tr>
                    </React.Fragment>
                  ));
                })()}

                {/* Grand Total */}
                {groupedFleetData.length > 0 && (
                  <tr className="bg-green-50 dark:bg-green-900/20 font-bold text-xs">
                    <td
                      colSpan="8"
                      className="px-1 py-1 text-right border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                    >
                      <div className="flex flex-col items-end gap-1">
                        <span>
                          Total Semua{" "}
                          {groupedFleetData[0]?.groupLabel || "Group"} (
                          {grandTotals.totalFleets} Fleet)
                        </span>
                        {Object.keys(grandTotals.mitraCount).length > 0 && (
                          <div className="text-[10px] font-normal text-gray-600 dark:text-gray-400">
                            Total Mitra:{" "}
                            {Object.entries(grandTotals.mitraCount)
                              .map(([mitra, count]) => `${mitra} (${count} DT)`)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {grandTotals.totalTronton}
                    </td>
                    <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {grandTotals.totalTrintin}
                    </td>
                    <td className="px-1 py-1 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {grandTotals.totalDumptrucks}
                    </td>
                    <td colSpan="3" className="px-1 py-1 text-center"></td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {groupedFleetData.length === 0 && !isLoading && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p>
            {searchQuery ? (
              <>
                Tidak ditemukan hasil untuk pencarian "
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {searchQuery}
                </span>
                "
              </>
            ) : selectedSatker && selectedUrutkan ? (
              `Tidak ada data fleet untuk satker "${selectedSatker}" dengan kategori "${
                selectedUrutkan === "all"
                  ? "Semua"
                  : selectedUrutkan === "dumping"
                    ? "Dumping Point"
                    : selectedUrutkan === "loading"
                      ? "Loading Point"
                      : selectedUrutkan === "mitra"
                        ? "Mitra"
                        : selectedUrutkan === "satker"
                          ? "Satker"
                          : selectedUrutkan
              }"`
            ) : selectedSatker ? (
              `Tidak ada data fleet untuk satker "${selectedSatker}"`
            ) : (
              "Silakan pilih Satker untuk menampilkan data fleet"
            )}
          </p>
        </div>
      )}

      {/* Pagination */}
      {groupedFleetData.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          totalItems={groupedFleetData.length}
        />
      )}
    </div>
  );
};

export default FleetSettingTable;
