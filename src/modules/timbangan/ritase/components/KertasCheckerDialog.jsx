import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { X, Printer, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { showToast } from "@/shared/utils/toast";

const KertasCheckerDialog = ({ isOpen, onClose, data, onAddDT }) => {
  const [isAddDTDialogOpen, setIsAddDTDialogOpen] = useState(false);
  const [selectedDT, setSelectedDT] = useState("");

  const availableDTs = useMemo(() => {
    if (!isOpen || !data) return [];

    try {
      const dtIndexStr = localStorage.getItem("dtIndex");
      if (!dtIndexStr) return [];

      const dtIndex = JSON.parse(dtIndexStr);

      const options = Object.entries(dtIndex)
        .filter(([key, dtData]) => dtData.excavator === data.excavator)
        .map(([key, dtData]) => ({
          value: dtData.hull_no,
          label: dtData.hull_no,
          hint: `${dtData.operator_name || "No Operator"}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      return options;
    } catch (error) {
      console.error("Error loading DT data from localStorage:", error);
      return [];
    }
  }, [isOpen, data]);

  const handleAddDT = () => {
    if (!selectedDT) {
      showToast.error("Pilih nomor DT terlebih dahulu");
      return;
    }

    if (onAddDT) {
      onAddDT(selectedDT);
    } else {
      showToast.success(`DT ${selectedDT} berhasil ditambahkan`);
    }

    setIsAddDTDialogOpen(false);
    setSelectedDT("");
  };

  if (!data) return null;

  const getShiftInfoAndTimeSlots = () => {
    if (!data.trips || data.trips.length === 0) {
      return { shiftName: "Unknown", startHour: 0, endHour: 0, timeSlots: [] };
    }

    const hoursSet = new Set();
    data.trips.forEach((trip) => {
      const hour = new Date(trip.time).getHours();
      hoursSet.add(hour);
    });

    const hours = Array.from(hoursSet).sort((a, b) => a - b);

    if (hours.length === 0) {
      return { shiftName: "Unknown", startHour: 0, endHour: 0, timeSlots: [] };
    }

    const minHour = Math.min(...hours);
    const maxHour = Math.max(...hours);

    let shiftName, startHour, endHour;

    if (
      minHour >= 22 ||
      maxHour < 6 ||
      (hours.some((h) => h >= 22) && hours.some((h) => h < 6))
    ) {
      shiftName = "Shift 1";
      startHour = 22;
      endHour = 6;
    } else if (minHour >= 6 && maxHour < 14) {
      shiftName = "Shift 2";
      startHour = 6;
      endHour = 14;
    } else {
      shiftName = "Shift 3";
      startHour = 14;
      endHour = 22;
    }

    const timeSlots = [];
    if (shiftName === "Shift 1") {
      for (let i = 22; i <= 23; i++) {
        timeSlots.push(`${i}:00`);
      }
      for (let i = 0; i < 6; i++) {
        timeSlots.push(`${i.toString().padStart(2, "0")}:00`);
      }
    } else {
      const hours = endHour - startHour;
      for (let i = 0; i < hours; i++) {
        const hour = startHour + i;
        timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
      }
    }

    return { shiftName, startHour, endHour, timeSlots };
  };

  const { shiftName, startHour, endHour, timeSlots } =
    getShiftInfoAndTimeSlots();

  const groupedData = {};
  const truckTotals = {};
  const timeSlotTotals = {};

  data.trips.forEach((trip) => {
    const tripTime = new Date(trip.time);
    const hour = tripTime.getHours();
    const timeSlot = `${hour.toString().padStart(2, "0")}:00`;

    if (!groupedData[trip.hull_no]) {
      groupedData[trip.hull_no] = {};
      truckTotals[trip.hull_no] = { weight: 0, count: 0 };
    }

    if (!groupedData[trip.hull_no][timeSlot]) {
      groupedData[trip.hull_no][timeSlot] = [];
    }

    groupedData[trip.hull_no][timeSlot].push(trip);
    truckTotals[trip.hull_no].weight += parseFloat(trip.weight);
    truckTotals[trip.hull_no].count += 1;

    if (!timeSlotTotals[timeSlot]) {
      timeSlotTotals[timeSlot] = { weight: 0, count: 0 };
    }
    timeSlotTotals[timeSlot].weight += parseFloat(trip.weight);
    timeSlotTotals[timeSlot].count += 1;
  });

  const dumpTrucks = Object.keys(groupedData);
  const grandTotal = {
    weight: Object.values(truckTotals).reduce((sum, t) => sum + t.weight, 0),
    count: Object.values(truckTotals).reduce((sum, t) => sum + t.count, 0),
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="min-w-[95vw] sm:min-w-[90vw] md:min-w-[85vw] lg:min-w-[80vw] max-h-[95vh] overflow-y-auto bg-slate-900 text-white p-0">
          {/* Header Section */}
          <div className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700 p-3 sm:p-4 md:p-6 print:static print:bg-white print:text-black">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <DialogTitle className="text-base sm:text-lg md:text-xl font-bold print:text-black">
                Kertas Checker - Detail Ritase
              </DialogTitle>
              <div className="flex gap-2 w-full sm:w-auto print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddDTDialogOpen(true)}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white border-none text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Tambah DT</span>
                  <span className="xs:hidden">DT</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white border-none text-xs sm:text-sm"
                >
                  <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Print</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-600 text-white border-none text-xs sm:text-sm"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Close</span>
                </Button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm print:text-black">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className="text-slate-400 print:text-gray-700">
                    Shift:{" "}
                  </span>
                  <Badge className="bg-purple-600 text-white text-xs print:bg-white print:text-black print:border print:border-black">
                    {shiftName}
                  </Badge>
                  <span className="text-slate-400 print:text-gray-700">
                    ({startHour.toString().padStart(2, "0")}:00 -{" "}
                    {endHour.toString().padStart(2, "0")}:00)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className="text-slate-400 print:text-gray-700">
                    Excavator:{" "}
                  </span>
                  <Badge className="bg-blue-600 text-white text-xs print:bg-white print:text-black print:border print:border-black">
                    {data.excavator}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-700">
                    Loading Point:{" "}
                  </span>
                  <span className="font-semibold wrap-break-word print:text-black">
                    {data.loading_location}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-700">
                    Dumping Point:{" "}
                  </span>
                  <span className="font-semibold wrap-break-word print:text-black">
                    {data.dumping_location}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className="text-slate-400 print:text-gray-700">
                    Measurement Type:{" "}
                  </span>
                  <Badge
                    variant="outline"
                    className="capitalize border-slate-600 text-white text-xs print:bg-white print:text-black print:border print:border-black"
                  >
                    {data.measurement_type}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-700">
                    Total Ritase:{" "}
                  </span>
                  <span className="font-semibold text-blue-400 print:text-black">
                    {data.tripCount} rit
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-700">
                    Total Tonase:{" "}
                  </span>
                  <span className="font-semibold text-green-400 print:text-black">
                    {data.totalWeight} ton
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section - Responsive */}
          <div className="p-3 sm:p-4 md:p-6">
            <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 print:bg-white print:border-black">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm print:text-xs print:text-black">
                  <thead>
                    <tr className="bg-slate-700 print:bg-gray-200">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold border-r border-slate-600 sticky left-0 bg-slate-700 z-10 min-w-25 sm:min-w-37.5 print:bg-gray-200 print:border-black print:static">
                        Dump Truck
                      </th>
                      {timeSlots.map((time, idx) => (
                        <th
                          key={idx}
                          className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold border-r border-slate-600 min-w-20 sm:min-w-25 print:border-black"
                        >
                          {time}
                        </th>
                      ))}
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold bg-slate-600 min-w-25 sm:min-w-30 print:bg-gray-300 print:border-black">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dumpTrucks.map((truckId, truckIdx) => (
                      <tr
                        key={truckIdx}
                        className="border-b border-slate-700 hover:bg-slate-700/50 print:border-black print:hover:bg-transparent"
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-r border-slate-700 sticky left-0 bg-slate-800 z-10 print:bg-white print:border-black print:static">
                          {truckId}
                        </td>
                        {timeSlots.map((timeSlot, timeIdx) => {
                          const trips = groupedData[truckId][timeSlot] || [];

                          return (
                            <td
                              key={timeIdx}
                              className="px-1 sm:px-2 py-1 sm:py-2 text-center border-r border-slate-700 print:border-black"
                            >
                              {trips.length > 0 ? (
                                <div className="space-y-1">
                                  {trips.map((trip, tripIdx) => (
                                    <div
                                      key={tripIdx}
                                      className="text-xs bg-slate-700 rounded px-1 sm:px-2 py-1 print:bg-gray-100 print:border print:border-gray-300"
                                    >
                                      <div className="font-semibold text-green-400 text-[10px] sm:text-xs print:text-black">
                                        {trip.weight} ton
                                      </div>
                                      <div className="text-slate-400 text-[9px] sm:text-xs print:text-gray-600">
                                        {format(new Date(trip.time), "HH:mm")}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500 print:text-gray-400">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold bg-slate-700 print:bg-gray-200 print:border-black">
                          <div className="text-green-400 text-xs sm:text-sm print:text-black">
                            {truckTotals[truckId].weight.toFixed(1)} Ton
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-400 print:text-gray-600">
                            ({truckTotals[truckId].count} rit)
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-slate-600 font-bold print:bg-gray-300">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 border-r border-slate-500 sticky left-0 bg-slate-600 z-10 print:bg-gray-300 print:border-black print:static">
                        Total
                      </td>
                      {timeSlots.map((timeSlot, idx) => {
                        const slotData = timeSlotTotals[timeSlot] || {
                          weight: 0,
                          count: 0,
                        };
                        return (
                          <td
                            key={idx}
                            className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r border-slate-500 print:border-black"
                          >
                            {slotData.count > 0 ? (
                              <div>
                                <div className="text-red-400 text-xs sm:text-sm print:text-black">
                                  {slotData.weight.toFixed(1)} Ton
                                </div>
                                <div className="text-[10px] sm:text-xs text-slate-300 print:text-gray-600">
                                  ({slotData.count} Rit)
                                </div>
                              </div>
                            ) : (
                              <span className="text-red-400 text-xs sm:text-sm print:text-gray-400">
                                0 Ton (0 Rit)
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center bg-slate-500 print:bg-gray-400 print:border-black">
                        <div className="text-base sm:text-lg text-green-300 print:text-black">
                          {grandTotal.weight.toFixed(1)} Ton
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-300 print:text-gray-700">
                          ({grandTotal.count} rit)
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add DT Dialog */}
      <Dialog open={isAddDTDialogOpen} onOpenChange={setIsAddDTDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Plus className="w-5 h-5" />
              Tambah Dump Truck
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label className="mb-2 block text-gray-700 dark:text-gray-300">
                Pilih Nomor DT
              </Label>
              <SearchableSelect
                items={availableDTs}
                value={selectedDT}
                onChange={setSelectedDT}
                placeholder="Pilih nomor DT..."
                emptyText={
                  availableDTs.length === 0
                    ? "Tidak ada DT tersedia untuk excavator ini"
                    : "DT tidak ditemukan"
                }
              />
              {availableDTs.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {availableDTs.length} DT tersedia untuk {data?.excavator}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDTDialogOpen(false);
                  setSelectedDT("");
                }}
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>

              <Button
                type="button"
                onClick={handleAddDT}
                disabled={!selectedDT}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
};

export default KertasCheckerDialog;
