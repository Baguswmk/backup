import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "@/shared/components/ui/badge";
import {
  X,
  Printer,
  Plus,
  Edit2,
  Trash2,
  MoreVertical,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { format } from "date-fns";
import { showToast } from "@/shared/utils/toast";
import { exportKertasCheckerPDF } from "@/shared/utils/pdf";
import RitaseEditForm from "@/modules/timbangan/ritase/components/RitaseEditForm";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { SHIFT_CONFIG, getShiftFromHour } from "@/shared/utils/shift";
import { ritaseServices } from "@/modules/timbangan/ritase/services/ritaseServices";
const KertasCheckerDialog = ({
  isOpen,
  onClose,
  data,
  onAddDT,
  onDeleteTrip,
  onUpdateTrip,
  refreshButtonRef,
}) => {
  const { user } = useAuthStore();
  const { masters } = useFleet(user ? { user } : null);

  const [isAddDTDialogOpen, setIsAddDTDialogOpen] = useState(false);
  const [selectedDT, setSelectedDT] = useState("");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

  // Bulk edit states
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    shift: "",
    excavator: "",
    loading_location: "",
    dumping_location: "",
    measurement_type: "",
    coal_type: "",
    distance: "",
  });
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const isCan =
    user.role.includes("operator_jt") ||
    user.role.includes("ccr") ||
    user.role.includes("checker");
  // Delete confirmation states
  const [currentStep, setCurrentStep] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedReasons, setSelectedReasons] = useState([]);

  const daysOfWeek = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];

  const reasonOptions = [
    {
      id: "reason-double-entry",
      label: "Penghapusan dilakukan karena terdapat data ganda (double entry)",
    },
    {
      id: "reason-wrong-data",
      label: "Penghapusan dilakukan karena terdapat kesalahan input data",
    },
    {
      id: "reason-request-head",
      label:
        "Penghapusan dilakukan atas permintaan dan persetujuan Sub Section Head terkait",
    },
    {
      id: "reason-evaluation",
      label:
        "Penghapusan dilakukan berdasarkan hasil evaluasi internal terhadap kebutuhan operasional",
    },
  ];

  const shiftOptions = [
    { value: "Shift 1", label: "Shift 1 (22:00 - 06:00)" },
    { value: "Shift 2", label: "Shift 2 (06:00 - 14:00)" },
    { value: "Shift 3", label: "Shift 3 (14:00 - 22:00)" },
  ];

  const measurementTypeOptions = [
    { value: "Timbangan", label: "Timbangan" },
    { value: "Bypass", label: "Bypass" },
    { value: "Beltscale", label: "Beltscale" },
  ];
  // Master data options dari useFleet
  const loadingLocationOptions = useMemo(() => {
    return (masters.loadingLocations || []).map((loc) => ({
      value: loc.name,
      label: loc.name,
      hint: loc.type,
    }));
  }, [masters.loadingLocations]);

  const dumpingLocationOptions = useMemo(() => {
    return (masters.dumpingLocations || []).map((loc) => ({
      value: loc.name,
      label: loc.name,
      hint: loc.type,
    }));
  }, [masters.dumpingLocations]);

  const excavatorOptions = useMemo(() => {
    return (masters.excavators || []).map((ex) => ({
      value: ex.hull_no || ex.name,
      label: ex.hull_no || ex.name,
      hint: ex.company || "-",
    }));
  }, [masters.excavators]);

  const coalTypeOptions = useMemo(() => {
    return (masters.coalTypes || []).map((ct) => ({
      value: ct.name || ct.id,
      label: ct.name,
    }));
  }, [masters.coalTypes]);

  const getCurrentDay = () => {
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const today = new Date();
    return days[today.getDay()];
  };

  // Reset delete dialog states when closing
  useEffect(() => {
    if (!isDeleteDialogOpen) {
      setCurrentStep(1);
      setConfirmDelete(null);
      setSelectedDay("");
      setSelectedReasons([]);
    }
  }, [isDeleteDialogOpen]);

  // Reset bulk edit dialog when closing
  useEffect(() => {
    if (!isBulkEditDialogOpen) {
      setBulkEditData({
        shift: "",
        excavator: "",
        loading_location: "",
        dumping_location: "",
        measurement_type: "",
        coal_type: "",
        distance: "",
      });
    }
  }, [isBulkEditDialogOpen]);

  // Initialize bulk edit data from current data
  useEffect(() => {
    if (isBulkEditDialogOpen && data) {
      // Ambil data dari trip pertama sebagai initial value
      const firstTrip = data.trips?.[0];
      setBulkEditData({
        shift: firstTrip?.shift || "",
        excavator: firstTrip?.unit_exca || data.excavator || "",
        loading_location:
          firstTrip?.loading_location || data.loading_location || "",
        dumping_location:
          firstTrip?.dumping_location || data.dumping_location || "",
        measurement_type:
          firstTrip?.measurement_type || data.measurement_type || "",
        coal_type: firstTrip?.coal_type || data.coal_type || "",
        distance: firstTrip?.distance || data.distance || "",
      });
    }
  }, [isBulkEditDialogOpen, data]);

  const availableDTs = useMemo(() => {
    if (!isOpen) return [];

    return (masters?.dumpTruck || [])
      .map((dt) => ({
        value: dt.hull_no || dt.name || String(dt.id),
        label: dt.hull_no || dt.name || `DT #${dt.id}`,
        hint:
          [dt.company, dt.workUnit].filter(Boolean).join(" • ") || undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [isOpen, masters?.dumpTruck]);

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

  const handleEditTrip = (trip) => {
    const transformedTrip = {
      ...trip,
      date: trip.date || trip.time,
      gross_weight: trip.weight || trip.gross_weight,
      net_weight: trip.weight || trip.net_weight,
      hull_no: trip.hull_no,
      unit_dump_truck: trip.hull_no || trip.unit_dump_truck,
      unit_exca: trip.excavator || trip.unit_exca,
      loading_location: trip.loading_location || "",
      dumping_location: trip.dumping_location || "",
      distance: trip.distance || 0,
      shift: trip.shift || "",
      operator: trip.operator || "",
      checker: trip.checker || "",
      company: trip.company || "",
      measurement_type: trip.measurement_type || "timbangan",
      createdAt: trip.createdAt || trip.created_at || "",
    };

    setSelectedTrip(transformedTrip);
    setIsEditModalOpen(true);
  };

  const handleDeleteTrip = (trip) => {
    const transformedTrip = {
      ...trip,
      unit_exca: trip.excavator || trip.unit_exca,
      unit_dump_truck: trip.hull_no || trip.unit_dump_truck,
      weight: trip.weight,
      gross_weight: trip.weight || trip.gross_weight,
      net_weight: trip.weight || trip.net_weight,
      measurement_type: trip.measurement_type || "timbangan",
    };

    setSelectedTrip(transformedTrip);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTrip || isDeletingTrip) return;

    setIsDeletingTrip(true);
    try {
      if (onDeleteTrip) {
        await onDeleteTrip(selectedTrip);
        showToast.success("Data ritase berhasil dihapus");
      }

      // Tutup delete dialog
      setIsDeleteDialogOpen(false);
      setSelectedTrip(null);

      // ✅ SOLUSI SIMPLE: Tutup KertasCheckerDialog setelah delete berhasil
      if (onClose) {
        onClose();
      }

      // Trigger refresh di parent untuk update data di AggregatedRitase
      if (refreshButtonRef?.current) {
        setTimeout(() => {
          refreshButtonRef.current.click();
        }, 10);
      }
    } catch (error) {
      console.error("Error deleting trip:", error);
      showToast.error("Gagal menghapus data ritase");
    } finally {
      setIsDeletingTrip(false);
    }
  };

  const handleReasonToggle = (reasonId) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId)
        ? prev.filter((id) => id !== reasonId)
        : [...prev, reasonId],
    );
  };

  const canProceedStep1 = confirmDelete === "yes";
  const canProceedStep2 = selectedDay === getCurrentDay();
  const canProceedStep3 = selectedReasons.length > 0;

  const handleNextStep = () => {
    if (currentStep === 1 && canProceedStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedStep2) {
      setCurrentStep(3);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!data) return null;

  const getShiftInfoAndTimeSlots = () => {
    if (!data.trips || data.trips.length === 0) {
      return { shiftName: "Unknown", startHour: 0, endHour: 0, timeSlots: [] };
    }

    // Deteksi shift dari trip pertama
    const firstHour = new Date(data.trips[0].time).getHours();
    const shiftName = getShiftFromHour(firstHour);
    const config = SHIFT_CONFIG[shiftName];

    const { start: startHour, end: endHour, crossesMidnight } = config;

    const timeSlots = [];
    if (crossesMidnight) {
      for (let i = startHour; i <= 23; i++) timeSlots.push(`${i}:00`);
      for (let i = 0; i < endHour; i++)
        timeSlots.push(`${String(i).padStart(2, "0")}:00`);
    } else {
      for (let i = startHour; i < endHour; i++)
        timeSlots.push(`${String(i).padStart(2, "0")}:00`);
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

  const handleBulkEdit = async () => {
    if (!data || !data.trips || data.trips.length === 0) {
      showToast.error("Tidak ada data untuk diedit");
      return;
    }

    const hasChanges = Object.values(bulkEditData).some((val) => val !== "");
    if (!hasChanges) {
      showToast.error("Tidak ada perubahan yang dibuat");
      return;
    }

    setIsBulkEditing(true);
    try {
      const payload = {
        ritase_ids: data.trips.map((trip) => trip.id),
        updates: {},
      };

      // Hanya masukkan field yang tidak kosong
      Object.entries(bulkEditData).forEach(([key, value]) => {
        if (value !== "") {
          payload.updates[key] = value;
        }
      });

      const result = await ritaseServices.bulkEditRitase(payload, user);

      if (result.success) {
        showToast.success(`Berhasil mengupdate ${data.trips.length} data DT`);
      } else {
        showToast.error(result.error || "Gagal melakukan bulk edit");
      }

      setIsBulkEditDialogOpen(false);

      if (onClose) {
        onClose();
      }

      // Trigger refresh di parent langsung lewat callback (bukan via refreshButtonRef)
      // onUpdateRitase → handleRefreshAfterEdit → loadSummaryData(true) → fresh data
      if (onUpdateTrip) {
        setTimeout(() => {
          onUpdateTrip(null, null); // null,null = signal untuk force refresh saja
        }, 100);
      } else if (refreshButtonRef?.current) {
        // Fallback jika onUpdateTrip tidak ada
        setTimeout(() => {
          refreshButtonRef.current.click();
        }, 100);
      }
    } catch (error) {
      console.error("Error in bulk edit:", error);
      showToast.error("Gagal melakukan bulk edit");
    } finally {
      setIsBulkEditing(false);
    }
  };

  const handlePrint = async () => {
    try {
      await exportKertasCheckerPDF(data, {
        shiftName,
        startHour,
        endHour,
        timeSlots,
        groupedData,
        dumpTrucks,
        truckTotals,
        timeSlotTotals,
        grandTotal,
      });
      showToast.success("PDF berhasil diexport!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      showToast.error("Gagal mengexport PDF");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="min-w-[95vw] sm:min-w-[90vw] md:min-w-[85vw] lg:min-w-[80vw] max-h-[95vh] overflow-x-auto scrollbar-thin bg-white border-none text-gray-900 dark:bg-slate-900 dark:text-white p-0">
          {/* Header Section */}
          <div className="sticky top-0 z-50 dark:bg-slate-800 border-b border-slate-700 p-3 sm:p-4 md:p-6 print:static print:bg-white print:text-black">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <DialogTitle className="text-base sm:text-lg md:text-xl font-bold print:text-black">
                Kertas Checker - Detail Ritase
              </DialogTitle>
              <div className="flex gap-2 w-full sm:w-auto print:hidden">
                {isCan && (
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
                )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBulkEditDialogOpen(true)}
                    className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white border-none text-xs sm:text-sm"
                    title="Edit semua data DT sekaligus"
                  >
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Edit Semua DT</span>
                    <span className="xs:hidden">Edit</span>
                  </Button>
                {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white border-none text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh data dari server"
                  >
                    <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden xs:inline">{isRefreshing ? 'Loading...' : 'Refresh'}</span>
                  </Button> */}
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
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Shift:{" "}
                  </span>
                  <Badge className="bg-purple-600 text-white text-xs print:bg-white print:text-black print:border print:border-black">
                    {shiftName}
                  </Badge>
                  <span className="dark:text-slate-400 print:text-gray-700">
                    ({startHour.toString().padStart(2, "0")}:00 -{" "}
                    {endHour.toString().padStart(2, "0")}:00)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Excavator:{" "}
                  </span>
                  <Badge className="bg-blue-600 text-white text-xs print:bg-white print:text-black print:border print:border-black">
                    {data.excavator}
                  </Badge>
                </div>
                <div>
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Loading Point:{" "}
                  </span>
                  <span className="font-semibold wrap-break-word print:text-black">
                    {data.loading_location}
                  </span>
                </div>
                <div>
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Dumping Point:{" "}
                  </span>
                  <span className="font-semibold wrap-break-word print:text-black">
                    {data.dumping_location}
                  </span>
                </div>
                <div>
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Jarak:{" "}
                  </span>
                  <span className="font-semibold wrap-break-word print:text-black">
                    {data.distance}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div>
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Jenis Batubara:{" "}
                  </span>
                  <span className="font-semibold  print:text-black">
                    {data.coal_type}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Measurement Type:{" "}
                  </span>
                  <Badge
                    variant="outline"
                    className="capitalize border-slate-600 dark:text-white text-xs print:bg-white print:text-black print:border print:border-black"
                  >
                    {data.measurement_type}
                  </Badge>
                </div>
                <div>
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Total Ritase:{" "}
                  </span>
                  <span className="font-semibold text-blue-400 print:text-black">
                    {data.tripCount} rit
                  </span>
                </div>
                <div>
                  <span className="dark:text-slate-400 print:text-gray-700">
                    Total Tonase:{" "}
                  </span>
                  <span className="font-semibold text-green-400 print:text-black">
                    {data.totalWeight} ton
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="p-3 sm:p-4 md:p-6">
            <div className="print:block">
              <div className="overflow-x-auto scrollbar-thin border border-slate-700 rounded-lg print:border-black">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="dark:bg-slate-700">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold border-r border-slate-600 sticky left-0 dark:bg-slate-700 z-10 min-w-25 sm:min-w-37.5 print:static">
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
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold dark:bg-slate-600 min-w-25 sm:min-w-30 print:bg-gray-300 print:border-black">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dumpTrucks.map((truckId, truckIdx) => (
                      <tr
                        key={truckIdx}
                        className="border-b border-slate-700 hover:bg-gray-300 dark:hover:bg-slate-700/50 print:border-black print:hover:bg-transparent"
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-r border-slate-700 sticky left-0 dark:bg-slate-800 z-10 print:bg-white print:border-black print:static">
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
                                      className="relative group text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 sm:px-2 py-1 print:bg-gray-100 print:border print:border-gray-300"
                                    >
                                      <div className="font-semibold text-green-400 text-[10px] sm:text-xs print:text-black">
                                        {trip.weight} ton
                                      </div>
                                      <div className="dark:text-slate-400 text-[9px] sm:text-xs print:text-gray-600">
                                        {format(new Date(trip.time), "HH:mm")}
                                      </div>

                                      {/* Action Menu - Hidden on Print */}
                                      {isCan && (
                                        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-full"
                                              >
                                                <MoreVertical className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                              align="end"
                                              className="w-32 dark:bg-slate-900 bg-white dark:text-neutral-50 border-none"
                                            >
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleEditTrip(trip)
                                                }
                                                className="cursor-pointer dark:hover:bg-gray-200 hover:bg-gray-200"
                                              >
                                                <Edit2 className="w-3 h-3 mr-2" />
                                                Edit
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleDeleteTrip(trip)
                                                }
                                                className="cursor-pointer text-red-600 focus:text-red-600 dark:hover:bg-red-800 dark:hover:text-neutral-50 hover:bg-gray-200"
                                              >
                                                <Trash2 className="w-3 h-3 mr-2" />
                                                Hapus
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="dark:text-slate-500 print:text-gray-400">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold dark:bg-slate-700 print:bg-gray-200 print:border-black">
                          <div className="text-green-400 text-xs sm:text-sm print:text-black">
                            {truckTotals[truckId].weight.toFixed(2)} Ton
                          </div>
                          <div className="text-[10px] sm:text-xs dark:text-slate-400 print:text-gray-600">
                            ({truckTotals[truckId].count} rit)
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="dark:bg-slate-600 font-bold print:bg-gray-300">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 border-r border-slate-500 sticky left-0 dark:bg-slate-600 z-10 print:bg-gray-300 print:border-black print:static">
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
                                  {slotData.weight.toFixed(2)} Ton
                                </div>
                                <div className="text-[10px] sm:text-xs dark:text-slate-300 print:text-gray-600">
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
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center dark:bg-slate-500 print:bg-gray-400 print:border-black">
                        <div className="text-base sm:text-lg text-green-300 print:text-black">
                          {grandTotal.weight.toFixed(2)} Ton
                        </div>
                        <div className="text-[10px] sm:text-xs dark:text-slate-300 print:text-gray-700">
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

      {/* Edit Modal */}
      {selectedTrip && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl lg:min-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="dark:text-neutral-50">
                Edit Data Ritase
              </DialogTitle>
            </DialogHeader>
            <RitaseEditForm
              editingItem={selectedTrip}
              onSuccess={async (updatedData) => {
                // 1. Update melalui parent
                if (onUpdateTrip) {
                  await onUpdateTrip(updatedData);
                }

                // 2. Tutup modal edit
                setIsEditModalOpen(false);
                setSelectedTrip(null);

                // 3. Tutup modal checker dialog juga
                if (onClose) {
                  onClose();
                }

                // 4. Trigger refresh button click
                setTimeout(() => {
                  if (refreshButtonRef?.current) {
                    refreshButtonRef.current.click();
                  }
                }, 10);
              }}
              onCancel={() => {
                setIsEditModalOpen(false);
                setSelectedTrip(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Inline Delete Confirmation Dialog */}
      {isDeleteDialogOpen && selectedTrip && (
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!isDeletingTrip) {
              setIsDeleteDialogOpen(open);
              if (!open) setSelectedTrip(null);
            }
          }}
        >
          <DialogContent className="max-w-lg bg-neutral-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700">
            {/* Header */}
            <div className="pb-2 flex flex-row items-center justify-between border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-lg font-semibold">
                  Hapus Data Ritase
                </DialogTitle>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4 pt-4">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 pb-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                        currentStep === step
                          ? "bg-red-600 text-white dark:bg-red-700"
                          : currentStep > step
                            ? "bg-green-600 text-white dark:bg-green-700"
                            : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                      }`}
                    >
                      {currentStep > step ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        step
                      )}
                    </div>
                    {step < 3 && (
                      <div
                        className={`w-8 h-0.5 transition-all duration-200 ${
                          currentStep > step
                            ? "bg-green-600 dark:bg-green-700"
                            : "bg-gray-200 dark:bg-slate-700"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Trip Info */}
              <div className="bg-gray-100 dark:bg-slate-800 rounded-md p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Hull No:
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedTrip.hull_no}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Excavator:
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedTrip.unit_exca || selectedTrip.excavator}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Weight:
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedTrip.weight ||
                        selectedTrip.gross_weight ||
                        selectedTrip.net_weight}{" "}
                      ton
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Time:
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {format(
                        new Date(selectedTrip.time || selectedTrip.date),
                        "HH:mm",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: Konfirmasi Ya/Tidak */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Langkah 1: Apakah Anda yakin akan menghapus data ritase
                      ini?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 border ${
                          confirmDelete === "yes"
                            ? "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800 border-transparent"
                            : "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                        }`}
                        onClick={() => setConfirmDelete("yes")}
                      >
                        Ya, Hapus
                      </Button>
                      <Button
                        className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 border ${
                          confirmDelete === "no"
                            ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 border-transparent"
                            : "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                        }`}
                        onClick={() => setConfirmDelete("no")}
                      >
                        Tidak
                      </Button>
                    </div>
                  </div>

                  {confirmDelete === "no" && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-md border p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Penghapusan dibatalkan. Klik tombol "Batal" untuk
                        menutup dialog.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Verifikasi Hari */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Langkah 2: Hari apa hari ini?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {daysOfWeek.map((day) => (
                        <Button
                          key={day}
                          className={`px-4 py-2 rounded-md font-medium transition-all duration-200 border ${
                            selectedDay === day
                              ? day === getCurrentDay()
                                ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 border-transparent"
                                : "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800 border-transparent"
                              : "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                          }`}
                          onClick={() => setSelectedDay(day)}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selectedDay && selectedDay !== getCurrentDay() && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 rounded-md border p-3">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        Jawaban tidak sesuai. Hari ini adalah {getCurrentDay()}.
                      </p>
                    </div>
                  )}

                  {selectedDay === getCurrentDay() && (
                    <div className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 rounded-md border p-3">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        Jawaban benar! Klik "Lanjutkan" untuk melanjutkan.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Alasan Penghapusan */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Langkah 3: Pilih alasan penghapusan (minimal 1):
                    </p>
                    <div className="space-y-3">
                      {reasonOptions.map((reason) => (
                        <div
                          key={reason.id}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <Checkbox
                            id={reason.id}
                            checked={selectedReasons.includes(reason.id)}
                            onCheckedChange={() =>
                              handleReasonToggle(reason.id)
                            }
                            disabled={isDeletingTrip}
                            className="mt-0.5 cursor-pointer"
                          />
                          <label
                            htmlFor={reason.id}
                            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none flex-1"
                          >
                            {reason.label}
                          </label>
                          {selectedReasons.includes(reason.id) && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedReasons.length === 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-md border p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Pilih minimal satu alasan penghapusan untuk melanjutkan.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {currentStep > 1 && (
                  <Button
                    className="w-full sm:w-auto px-4 py-2 rounded-md font-medium border border-gray-300 dark:border-slate-600 bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    onClick={handleBackStep}
                    disabled={isDeletingTrip}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Kembali
                  </Button>
                )}

                {currentStep < 3 ? (
                  <Button
                    className="w-full sm:flex-1 px-4 py-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-1 border-0"
                    onClick={handleNextStep}
                    disabled={
                      (currentStep === 1 && !canProceedStep1) ||
                      (currentStep === 2 && !canProceedStep2)
                    }
                  >
                    Lanjutkan
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    className="w-full sm:flex-1 px-4 py-2 rounded-md font-medium bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 border-0"
                    onClick={handleConfirmDelete}
                    disabled={isDeletingTrip || !canProceedStep3}
                  >
                    {isDeletingTrip ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menghapus...
                      </>
                    ) : (
                      "Hapus"
                    )}
                  </Button>
                )}

                <Button
                  className="w-full sm:w-auto px-4 py-2 rounded-md font-medium bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 border-0"
                  onClick={() => {
                    if (!isDeletingTrip) {
                      setIsDeleteDialogOpen(false);
                      setSelectedTrip(null);
                    }
                  }}
                  disabled={isDeletingTrip}
                >
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Edit Dialog */}
      {isBulkEditDialogOpen && (
        <Dialog
          open={isBulkEditDialogOpen}
          onOpenChange={setIsBulkEditDialogOpen}
        >
          <DialogContent className="max-w-2xl bg-slate-900 text-white border border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Edit Semua Data DT
              </DialogTitle>
              <p className="text-sm text-slate-400 mt-2">
                Perubahan akan diterapkan ke semua {data?.trips?.length || 0}{" "}
                data DT dalam kertas checker ini. Kosongkan field yang tidak
                ingin diubah.
              </p>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Shift */}
                <div>
                  <Label className="text-sm font-medium text-slate-300 mb-2 block">
                    Shift
                  </Label>
                  <SearchableSelect
                    items={shiftOptions}
                    value={bulkEditData.shift}
                    onChange={(value) =>
                      setBulkEditData({ ...bulkEditData, shift: value })
                    }
                    placeholder="Pilih shift atau kosongkan..."
                    className="w-full"
                  />
                </div>

                {/* Excavator */}
                <div>
                  <Label className="text-sm font-medium text-slate-300 mb-2 block">
                    Excavator
                  </Label>
                  <SearchableSelect
                    items={excavatorOptions}
                    value={bulkEditData.excavator}
                    onChange={(value) =>
                      setBulkEditData({ ...bulkEditData, excavator: value })
                    }
                    placeholder="Pilih excavator atau kosongkan..."
                    className="w-full"
                  />
                </div>

                {/* Loading Location */}
                <div>
                  <Label className="text-sm font-medium text-slate-300 mb-2 block">
                    Loading Point
                  </Label>
                  <SearchableSelect
                    items={loadingLocationOptions}
                    value={bulkEditData.loading_location}
                    onChange={(value) =>
                      setBulkEditData({
                        ...bulkEditData,
                        loading_location: value,
                      })
                    }
                    placeholder="Pilih loading point atau kosongkan..."
                    className="w-full"
                  />
                </div>

                {/* Dumping Location */}
                <div>
                  <Label className="text-sm font-medium text-slate-300 mb-2 block">
                    Dumping Point
                  </Label>
                  <SearchableSelect
                    items={dumpingLocationOptions}
                    value={bulkEditData.dumping_location}
                    onChange={(value) =>
                      setBulkEditData({
                        ...bulkEditData,
                        dumping_location: value,
                      })
                    }
                    placeholder="Pilih dumping point atau kosongkan..."
                    className="w-full"
                  />
                </div>

                {/* Jenis Batubara */}
                <div>
                  <Label className="text-sm font-medium text-slate-300 mb-2 block">
                    Jenis Batubara
                  </Label>
                  <SearchableSelect
                    items={coalTypeOptions}
                    value={bulkEditData.coal_type}
                    onChange={(value) =>
                      setBulkEditData({
                        ...bulkEditData,
                        coal_type: value,
                      })
                    }
                    placeholder="Pilih jenis batubara atau kosongkan..."
                    className="w-full"
                  />
                </div>

                {/* Measurement Type */}
                <div>
                  <Label className="text-sm font-medium text-slate-300 mb-2 block">
                    Measurement Type
                  </Label>
                  <SearchableSelect
                    items={measurementTypeOptions}
                    value={bulkEditData.measurement_type}
                    onChange={(value) =>
                      setBulkEditData({
                        ...bulkEditData,
                        measurement_type: value,
                      })
                    }
                    placeholder="Pilih measurement type atau kosongkan..."
                    className="w-full"
                  />
                </div>

                {/* Distance */}
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium text-slate-300 mb-2 block">
                    Distance (meter)
                  </Label>
                  <Input
                    type="number"
                    value={bulkEditData.distance}
                    onChange={(e) =>
                      setBulkEditData({
                        ...bulkEditData,
                        distance: e.target.value,
                      })
                    }
                    placeholder="Masukkan distance atau kosongkan..."
                    className="w-full bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <Button
                  onClick={handleBulkEdit}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isBulkEditing}
                >
                  {isBulkEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    `Update Semua (${data?.trips?.length || 0} Data)`
                  )}
                </Button>
                <Button
                  onClick={() => setIsBulkEditDialogOpen(false)}
                  variant="outline"
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                  disabled={isBulkEditing}
                >
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default KertasCheckerDialog;
