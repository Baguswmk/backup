import React, { useMemo, useState } from "react";
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
  itemsPerPage = 3,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const groupedFleetData = useMemo(() => {
    if (!fleetData || fleetData.length === 0) return [];

    let filtered = fleetData;
    if (selectedSatker) {
      filtered = fleetData.filter((fleet) => fleet.workUnit === selectedSatker);
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
          let groupDumptruckCount = 0;

          const firstFleet = group[0];
          const allSameExcavator = group.every(
            (f) => f.excavator === firstFleet.excavator,
          );
          const allSameLoading = group.every(
            (f) => f.loadingLocation === firstFleet.loadingLocation,
          );

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

              isMergedGroup: true,
              isFirstInGroup: fleetIdx === 0,
              groupSize: group.length,
              splitFleets: group,

              mergeExcavator: allSameExcavator,
              mergeLoading: allSameLoading,

              groupTronton,
              groupTrintin,
              groupDumptruckCount,
            });
          });
        } else {
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
        groupLabel,
        rows: processedRows,
        totalTronton,
        totalTrintin,
        totalDumptrucks: processedRows.reduce(
          (sum, fleet) => sum + (fleet.dumptruckCount || 0),
          0,
        ),
      };
    });

    return result;
  }, [fleetData, selectedSatker, selectedUrutkan]);

  const totalPages = Math.ceil(groupedFleetData.length / itemsPerPage);

  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return groupedFleetData.slice(startIndex, endIndex);
  }, [groupedFleetData, currentPage, itemsPerPage]);

  useMemo(() => {
    setCurrentPage(1);
  }, [selectedSatker, selectedUrutkan]);

  const handlePageChange = (page) => {
    setCurrentPage(page);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const grandTotals = useMemo(() => {
    const totals = {
      totalTronton: 0,
      totalTrintin: 0,
      totalDumptrucks: 0,
      totalFleets: 0,
    };

    paginatedGroups.forEach((group) => {
      totals.totalTronton += group.totalTronton;
      totals.totalTrintin += group.totalTrintin;
      totals.totalDumptrucks += group.totalDumptrucks;
      totals.totalFleets += group.rows.length;
    });

    return totals;
  }, [paginatedGroups]);

  return (
    <div className="w-full">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm bg-white dark:bg-gray-800">
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
                <td colSpan="14" className="px-4 py-8">
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
                          className="px-4 py-3 font-bold text-gray-800 dark:text-gray-100 text-base"
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
                            {/* No - tampil per baris (TIDAK DI-MERGE) */}
                            <td className="px-4 py-3 text-left border-r border-gray-300 dark:border-gray-600 dark:text-gray-200">
                              {rowCounter}
                            </td>

                            {/* Excavator - merge untuk group yang sama */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-4 py-3 text-left border-r border-gray-300 dark:border-gray-600 align-middle"
                                rowSpan={fleet.groupSize}
                              >
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {fleet.excavator}
                                </div>
                              </td>
                            )}

                   

                            {/* Loading Point - merge untuk group yang sama */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-4 py-3 text-left border-r border-gray-300 dark:border-gray-600 align-middle"
                                rowSpan={fleet.groupSize}
                              >
                                <div className="text-gray-700 dark:text-gray-300">
                                  {fleet.loadingLocation}
                                </div>
                              </td>
                            )}
  <td className="px-4 py-3 text-left border-r border-gray-300 dark:border-gray-600">
                              <div className="text-gray-700 dark:text-gray-300">
                                {fleet.dumpingLocation}
                              </div>
                            </td>
                                     {/* Mitra - merge untuk group yang sama */}
                            {fleet.isFirstInGroup && (
                              <td
                                className="px-4 py-3 text-left border-r border-gray-300 dark:border-gray-600 align-middle"
                                rowSpan={fleet.groupSize}
                              >
                                <div className="text-gray-700 dark:text-gray-300">
                                  {fleet.excavatorCompany}
                                </div>
                              </td>
                            )}

                            {/* Dumping Point - tampil per baris (TIDAK DI-MERGE) */}
                          

                            {/* Jenis Batubara - tampil per baris (TIDAK DI-MERGE) */}
                            <td className="px-4 py-3 text-left border-r border-gray-300 dark:border-gray-600">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                                {fleet.coalType}
                              </span>
                            </td>

                            {/* Satker - tampil per baris (TIDAK DI-MERGE) */}
                            <td className="px-4 py-3 text-left border-r border-gray-300 dark:border-gray-600">
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {fleet.workUnit}
                              </div>
                            </td>

                            {/* Tipe Pengukuran - tampil per baris (TIDAK DI-MERGE) */}
                            <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {fleet.measurementType}
                            </td>

                            {/* Jarak - tampil per baris (TIDAK DI-MERGE) */}
                            <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {fleet.distance?.toLocaleString("id-ID")}
                            </td>

                            {/* Tronton - tampil per baris (TIDAK DI-MERGE) */}
                            <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {fleet.tronton}
                            </td>

                            {/* Trintin - tampil per baris (TIDAK DI-MERGE) */}
                            <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                              {fleet.trintin}
                            </td>

                            {/* Jumlah DT - tampil per baris (TIDAK DI-MERGE) */}
                            <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 font-semibold text-gray-900 dark:text-gray-100">
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
                                  <span className="text-gray-400 dark:text-gray-500">
                                    -
                                  </span>
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

                      {/* Subtotal untuk grup ini */}
                      <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                        <td
                          colSpan="8"
                          className="px-4 py-3 text-right border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                        >
                          Jumlah Fleet {group.groupLabel || "Group"}{" "}
                          {group.location}
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
                        <td colSpan="3" className="px-4 py-3 text-center"></td>
                      </tr>

                      {/* Spacing row */}
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <td colSpan="14" className="px-4 py-1"></td>
                      </tr>
                    </React.Fragment>
                  ));
                })()}

                {/* Grand Total - Always visible at bottom */}
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
                    <td colSpan="3" className="px-4 py-4 text-center"></td>
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
                          : selectedUrutkan === "satker"
                            ? "Satker"
                            : selectedUrutkan
                }"`
              : selectedSatker
                ? `Tidak ada data fleet untuk satker "${selectedSatker}"`
                : "Silakan pilih Satker untuk menampilkan data fleet"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {groupedFleetData.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default FleetSettingTable;
