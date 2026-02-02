import React, { useMemo } from "react";
import { Loader2, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";

const FleetSettingTable = ({
  fleetData = [],
  selectedSatker,
  selectedUrutkan,
  isLoading = false,
  onViewFleet,
  onEditFleet,
  onDeleteFleet,
}) => {
  // ─── Grouping & merge logic ────────────────────────────────────────────────
  const groupedFleetData = useMemo(() => {
    if (!fleetData || fleetData.length === 0) return [];

    // Filter by satker
    let filtered = fleetData;
    if (selectedSatker) {
      filtered = fleetData.filter((fleet) => fleet.workUnit === selectedSatker);
    }

    // Determine visual grouping key (section header)
    let groupingKey = "dumpingLocation";
    let groupLabel = "Dumping Point";

    if (selectedUrutkan === "loading") {
      groupingKey = "loadingLocation";
      groupLabel = "Loading Point";
    } else if (selectedUrutkan === "mitra") {
      groupingKey = "excavatorCompany";
      groupLabel = "Mitra";
    } else if (selectedUrutkan === "dumping" || selectedUrutkan === "all") {
      groupingKey = "dumpingLocation";
      groupLabel = "Dumping Point";
    }

    // Top-level grouping (section headers)
    const grouped = {};
    filtered.forEach((fleet) => {
      const groupValue = fleet[groupingKey] || "Unknown";
      if (!grouped[groupValue]) grouped[groupValue] = [];
      grouped[groupValue].push(fleet);
    });

    // Process each section
    const result = Object.entries(grouped).map(([location, fleets]) => {
      let totalTronton = 0;
      let totalTrintin = 0;

      // ── Inner grouping: exca + loading + isSplit ─────────
      // SYARAT MERGE: excavatorId + loadingLocationId + isSplit === true
      const excavatorGroups = {};
      fleets.forEach((fleet) => {
        const key = `${fleet.excavatorId || fleet.excavator}-${fleet.loadingLocationId || fleet.loadingLocation}`;
        if (!excavatorGroups[key]) excavatorGroups[key] = [];
        excavatorGroups[key].push(fleet);
      });

      // Bangun array rows dengan informasi merge
      const processedRows = [];

      Object.values(excavatorGroups).forEach((group) => {
        // DEBUG: Log group info
        console.log('🔍 Group check:', {
          groupSize: group.length,
          excavator: group[0]?.excavator,
          loading: group[0]?.loadingLocation,
          fleetIds: group.map(f => f.id),
          isSplitFlags: group.map(f => ({ id: f.id, isSplit: f.isSplit }))
        });

        // Cek syarat merge: >= 2 fleet DAN ada yang isSplit
        const hasSplitFlag = group.some((f) => f.isSplit === true);
        const shouldMerge = group.length > 1 && hasSplitFlag;

        console.log('✅ Should merge?', shouldMerge, '| hasSplitFlag:', hasSplitFlag, '| groupSize:', group.length);

        if (shouldMerge) {
          // ── GROUP YANG DI-MERGE (Excel-like) ──────
          
          // Hitung total untuk merged group
          let groupTronton = 0;
          let groupTrintin = 0;
          let groupDumptruckCount = 0;

          // Identifikasi field mana yang sama di semua fleet
          const firstFleet = group[0];
          const allSameExcavator = group.every(f => f.excavator === firstFleet.excavator);
          const allSameLoading = group.every(f => f.loadingLocation === firstFleet.loadingLocation);
          const allSameDumping = group.every(f => f.dumpingLocation === firstFleet.dumpingLocation);
          const allSameDistance = group.every(f => f.distance === firstFleet.distance);
          const allSameMitra = group.every(f => f.excavatorCompany === firstFleet.excavatorCompany);
          const allSameMeasurement = group.every(f => f.measurementType === firstFleet.measurementType);
          const allSameCoalType = group.every(f => f.coalType === firstFleet.coalType);

          // Process each fleet dalam group
          group.forEach((fleet, fleetIdx) => {
            let fleetTronton = 0;
            let fleetTrintin = 0;

            if (fleet.units && Array.isArray(fleet.units)) {
              fleet.units.forEach((unit) => {
                if (unit.tareWeight >= 16) {
                  fleetTronton++;
                  totalTronton++;
                  groupTronton++;
                } else {
                  fleetTrintin++;
                  totalTrintin++;
                  groupTrintin++;
                }
              });
            }
            groupDumptruckCount += fleet.dumptruckCount || 0;

            processedRows.push({
              ...fleet,
              tronton: fleetTronton,
              trintin: fleetTrintin,
              
              // Merge info - untuk Excel-like rendering
              isMergedGroup: true,
              isFirstInGroup: fleetIdx === 0,
              groupSize: group.length,
              splitFleets: group, // semua fleet dalam group
              
              // Field merge flags (untuk rowSpan)
              mergeExcavator: allSameExcavator,
              mergeLoading: allSameLoading,
              mergeDumping: allSameDumping,
              mergeDistance: allSameDistance,
              mergeMitra: allSameMitra,
              mergeMeasurement: allSameMeasurement,
              mergeCoalType: allSameCoalType,
              
              // Aggregated totals (hanya untuk baris pertama)
              groupTronton,
              groupTrintin,
              groupDumptruckCount,
            });
          });
        } else {
          // ── SINGLE FLEET (tidak di-merge) ────────────────────────────────────
          const fleet = group[0];
          let fleetTronton = 0;
          let fleetTrintin = 0;

          if (fleet.units && Array.isArray(fleet.units)) {
            fleet.units.forEach((unit) => {
              if (unit.tareWeight >= 16) {
                fleetTronton++;
                totalTronton++;
              } else {
                fleetTrintin++;
                totalTrintin++;
              }
            });
          }

          processedRows.push({
            ...fleet,
            tronton: fleetTronton,
            trintin: fleetTrintin,
            isMergedGroup: false,
            isFirstInGroup: true,
            groupSize: 1,
            splitFleets: [fleet],
          });
        }
      });

      return {
        location,
        fleets: processedRows,
        totalDumptrucks: processedRows.reduce((sum, r) => {
          // Sekarang hitung SEMUA baris karena DT sudah di-split per baris
          return sum + (r.dumptruckCount || 0);
        }, 0),
        totalTronton,
        totalTrintin,
        totalFleets: processedRows.filter(r => r.isFirstInGroup).length,
        groupLabel,
      };
    });

    // Sort alphabetically A-Z
    result.sort((a, b) => (a.location || "").localeCompare(b.location || ""));

    return result;
  }, [fleetData, selectedSatker, selectedUrutkan]);

  // ─── Grand totals ───────────────────────────────────────────────────────────
  const grandTotals = useMemo(() => {
    return groupedFleetData.reduce(
      (acc, group) => ({
        totalFleets: acc.totalFleets + group.totalFleets,
        totalDumptrucks: acc.totalDumptrucks + group.totalDumptrucks,
        totalTronton: acc.totalTronton + group.totalTronton,
        totalTrintin: acc.totalTrintin + group.totalTrintin,
      }),
      { totalFleets: 0, totalDumptrucks: 0, totalTronton: 0, totalTrintin: 0 },
    );
  }, [groupedFleetData]);

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">
            Memuat data fleet...
          </span>
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-blue-50 dark:bg-blue-900/20 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                No
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Excavator
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Loading Point
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Dumping Point
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Jarak (m)
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Mitra
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Tipe Pengukuran
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Jenis Batubara
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Tronton
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Trintin
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Jumlah DT
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Ket.
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedFleetData.map((group, groupIdx) => {
              let rowCounter = 0; // Counter untuk nomor baris

              return (
                <React.Fragment key={`group-${groupIdx}`}>
                  {/* Section Header */}
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <td
                      colSpan="13"
                      className="px-4 py-2 font-semibold text-gray-900 dark:text-gray-100"
                    >
                      {group.groupLabel}: {group.location} ({group.totalFleets}{" "}
                      Fleet)
                    </td>
                  </tr>

                  {/* Fleet rows with Excel-like merged cells */}
                  {group.fleets.map((fleet, idx) => {
                    // Increment counter hanya untuk baris pertama dari setiap group
                    if (fleet.isFirstInGroup) {
                      rowCounter++;
                    }

                    return (
                      <tr
                        key={fleet.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        {/* No - merge if same group */}
                        {fleet.isFirstInGroup && (
                          <td
                            className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600"
                            rowSpan={fleet.groupSize}
                          >
                            {rowCounter}
                          </td>
                        )}

                        {/* Excavator - merge if same */}
                        {(fleet.isFirstInGroup || !fleet.mergeExcavator) && (
                          <td
                            className="px-4 py-3 border-r border-gray-300 dark:border-gray-600"
                            rowSpan={fleet.mergeExcavator ? fleet.groupSize : 1}
                          >
                            {fleet.excavator || "-"}
                          </td>
                        )}

                        {/* Loading Point - merge if same */}
                        {(fleet.isFirstInGroup || !fleet.mergeLoading) && (
                          <td
                            className="px-4 py-3 border-r border-gray-300 dark:border-gray-600"
                            rowSpan={fleet.mergeLoading ? fleet.groupSize : 1}
                          >
                            {fleet.loadingLocation || "-"}
                          </td>
                        )}

                        {/* Dumping Point - merge if same, show separately if different */}
                        {(fleet.isFirstInGroup || !fleet.mergeDumping) && (
                          <td
                            className="px-4 py-3 border-r border-gray-300 dark:border-gray-600"
                            rowSpan={fleet.mergeDumping ? fleet.groupSize : 1}
                          >
                            {fleet.dumpingLocation || "-"}
                          </td>
                        )}

                        {/* Distance - merge if same */}
                        {(fleet.isFirstInGroup || !fleet.mergeDistance) && (
                          <td
                            className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600"
                            rowSpan={fleet.mergeDistance ? fleet.groupSize : 1}
                          >
                            {fleet.distance
                              ? fleet.distance.toLocaleString("id-ID")
                              : "-"}
                          </td>
                        )}

                        {/* Mitra - merge if same */}
                        {(fleet.isFirstInGroup || !fleet.mergeMitra) && (
                          <td
                            className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600"
                            rowSpan={fleet.mergeMitra ? fleet.groupSize : 1}
                          >
                            {fleet.excavatorCompany || "-"}
                          </td>
                        )}

                        {/* Measurement Type - merge if same */}
                        {(fleet.isFirstInGroup || !fleet.mergeMeasurement) && (
                          <td
                            className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600"
                            rowSpan={fleet.mergeMeasurement ? fleet.groupSize : 1}
                          >
                            {fleet.measurementType || "Timbangan"}
                          </td>
                        )}

                        {/* Coal Type - merge if same */}
                        {(fleet.isFirstInGroup || !fleet.mergeCoalType) && (
                          <td
                            className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600"
                            rowSpan={fleet.mergeCoalType ? fleet.groupSize : 1}
                          >
                            {fleet.coalType || "-"}
                          </td>
                        )}

                        {/* Tronton - tampil per baris (TIDAK DI-MERGE) */}
                        <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                          {fleet.tronton}
                        </td>

                        {/* Trintin - tampil per baris (TIDAK DI-MERGE) */}
                        <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                          {fleet.trintin}
                        </td>

                        {/* Jumlah DT - tampil per baris (TIDAK DI-MERGE) */}
                        <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 font-semibold">
                          {fleet.dumptruckCount || 0}
                        </td>

                        {/* Ket. - "Split" for merged groups */}
                        {fleet.isFirstInGroup && (
                          <td
                            className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 align-middle"
                            rowSpan={fleet.groupSize}
                          >
                            {fleet.isMergedGroup ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                Split
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}

                        {/* Aksi - merged for group */}
                        {fleet.isFirstInGroup && (
                          <td
                            className="px-4 py-3 text-center"
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
                                    onClick={() => onViewFleet(fleet.isMergedGroup ? fleet.splitFleets : fleet)}
                                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    <span>
                                      Lihat Detail
                                      {fleet.isMergedGroup && ` (${fleet.groupSize})`}
                                    </span>
                                  </DropdownMenuItem>
                                )}
                                {onEditFleet && (
                                  <DropdownMenuItem
                                    onClick={() => onEditFleet(fleet.isMergedGroup ? fleet.splitFleets : fleet)}
                                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>
                                      Edit
                                      {fleet.isMergedGroup && ` (${fleet.groupSize})`}
                                    </span>
                                  </DropdownMenuItem>
                                )}
                                {onDeleteFleet && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => onDeleteFleet(fleet.isMergedGroup ? fleet.splitFleets : fleet)}
                                      className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>
                                        Hapus
                                        {fleet.isMergedGroup && ` (${fleet.groupSize})`}
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

                  {/* Subtotal Row */}
                  <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                    <td
                      colSpan="8"
                      className="px-4 py-3 text-right border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                    >
                      Jumlah Fleet {group.groupLabel || "Group"} {group.location}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {group.totalTronton}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {group.totalTrintin}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {group.totalDumptrucks}
                    </td>
                    <td colSpan="2" className="px-4 py-3 text-center"></td>
                  </tr>

                  {/* Spacing row */}
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <td colSpan="13" className="px-4 py-1"></td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* Grand Total */}
            {groupedFleetData.length > 0 && (
              <tr className="bg-green-50 dark:bg-green-900/20 font-bold text-md">
                <td
                  colSpan="8"
                  className="px-4 py-4 text-right border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                >
                  Total Semua {groupedFleetData[0]?.groupLabel || "Group"} (
                  {grandTotals.totalFleets} Fleet)
                </td>
                <td className="px-4 py-4 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  {grandTotals.totalTronton}
                </td>
                <td className="px-4 py-4 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  {grandTotals.totalTrintin}
                </td>
                <td className="px-4 py-4 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  {grandTotals.totalDumptrucks}
                </td>
                <td className="px-4 py-4 text-center"></td>
                <td className="px-4 py-4 text-center"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {groupedFleetData.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p>
            {selectedSatker && selectedUrutkan
              ? `Tidak ada data fleet untuk satker "${selectedSatker}" dengan kategori "${
                  selectedUrutkan === "all"
                    ? "Semua"
                    : selectedUrutkan === "dumping"
                      ? "Dumping Point"
                      : selectedUrutkan === "loading"
                        ? "Loading Point"
                        : selectedUrutkan === "mitra"
                          ? "Mitra"
                          : selectedUrutkan
                }"`
              : selectedSatker
                ? `Tidak ada data fleet untuk satker "${selectedSatker}"`
                : "Silakan pilih Satker untuk menampilkan data fleet"}
          </p>
        </div>
      )}
    </div>
  );
};

export default FleetSettingTable;