import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, Search, RefreshCw, Database, Calendar, MoreVertical, Eye, FileText, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useBeltConveyor } from "./hooks/useBeltConveyor";
import TambahBeltConveyorModal from "./components/TambahBeltConveyorModal";
import EditBeltConveyorModal from "./components/EditBeltConveyorModal";
import DetailBeltConveyorModal from "./components/DetailBeltConveyorModal";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/shared/components/ui/dropdown-menu";
import TableToolbar from "@/shared/components/TableToolbar";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { formatDate } from "@/shared/utils/date";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";

export const DEFAULT_BELT_CONVEYOR_CONFIGS = [
  { id: 1, hauler: "Load In CHF 4", loader: "Reclaim Feeder SBR 03", loading_point: "Banko Barat - LS DH 4", dumping_point: "Banko Barat - DH 4 Jembatan", distance: 5000, measurement_type: "Beltscale", status: "Pemindahan Belt Conveyor" },
  { id: 2, hauler: "Load In CHF 4", loader: "Reclaim Feeder SBR 02", loading_point: "Banko Barat - LS DH 4", dumping_point: "Banko Barat - DH 4 Sumuran", distance: 5000, measurement_type: "Beltscale", status: "Pemindahan Belt Conveyor" },
  { id: 3, hauler: "Load In CHF 5", loader: "Reclaim Feeder Breaker", loading_point: "Banko Barat - RF 5", dumping_point: "Banko Barat - SP 5", distance: 8500, measurement_type: "Beltscale", status: "Pemindahan Belt Conveyor" },
  { id: 4, hauler: "CHF SS 8", loader: "Reclaim Feeder Breaker", loading_point: "Banko Tengah - LS Sumsel 8", dumping_point: "Banko Tengah - PLTU SS 8", distance: 1500, measurement_type: "Beltscale", status: "Pengeluaran Belt Conveyor" },
  { id: 5, hauler: "CHF BPI", loader: "Reclaim Feeder 10", loading_point: "MTB - RF 10", dumping_point: "MTB - PLTU Banjarsari", distance: 1000, measurement_type: "Beltscale", status: "Pengeluaran Belt Conveyor" },
  { id: 6, hauler: "CHF PLTU BA", loader: "Crusher PLTU BA T1", loading_point: "TAL - SP 1 COALFEEDER", dumping_point: "PLTU Bukit Asam", distance: 500, measurement_type: "Beltscale", status: "Pengeluaran Belt Conveyor" },
  { id: 7, hauler: "CHF PLTU BA", loader: "Crusher PLTU BA T1A", loading_point: "TAL - SP 1 COALFEEDER", dumping_point: "PLTU Bukit Asam", distance: 500, measurement_type: "Beltscale", status: "Pengeluaran Belt Conveyor" },
];

const getHoursByShift = (shift) => {
  switch (shift) {
    case "Shift 1": return [22, 23, 0, 1, 2, 3, 4, 5];
    case "Shift 2": return [6, 7, 8, 9, 10, 11, 12, 13];
    case "Shift 3": return [14, 15, 16, 17, 18, 19, 20, 21];
    case "All":
    default:
      return [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
  }
};

// ─── Dashboard Tab ─────────────────────────────────────────────────────────────
const DashboardTab = ({
  data,
  isLoading,
  filters,
  onFiltersChange,
  onRefreshData,
  masters,
  fetchLatestBeltscale,
  onEdit,
  onDetail,
  onAdd,
  onAddWithConfig,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [coalTypeConfigs, setCoalTypeConfigs] = useState({});
  const [latestBeltscales, setLatestBeltscales] = useState({});
  const [editingCoalType, setEditingCoalType] = useState(null);
  const [tempCoalTypeValue, setTempCoalTypeValue] = useState("");
  const [pendingCoalChange, setPendingCoalChange] = useState(null);

  const coalTypeItems = useMemo(
    () =>
      (masters?.coalTypes || []).map((c) => ({
        value: String(c.id),
        label: c.name || c.coal_type || String(c.id),
      })),
    [masters],
  );

  useEffect(() => {
    const stored = {};
    DEFAULT_BELT_CONVEYOR_CONFIGS.forEach(c => {
      const v = localStorage.getItem(`batuBara_${c.loader}`);
      if (v) stored[c.loader] = v;
    });
    setCoalTypeConfigs(stored);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadScales = async () => {
      try {
        const loaders = DEFAULT_BELT_CONVEYOR_CONFIGS.map(c => c.loader);
        const scales = await fetchLatestBeltscale(loaders);
        if (isMounted) setLatestBeltscales(scales);
      } catch (e) {}
    };
    loadScales();
    return () => { isMounted = false; };
  }, [fetchLatestBeltscale, data]); // Refetch when data changes

  const displayHours = useMemo(() => getHoursByShift(filters.shift), [filters.shift]);

  const confirmCoalTypeChange = () => {
    if (pendingCoalChange) {
      const { loader, val } = pendingCoalChange;
      if (val) {
        localStorage.setItem(`batuBara_${loader}`, val);
      } else {
        localStorage.removeItem(`batuBara_${loader}`);
      }
      setCoalTypeConfigs((prev) => ({ ...prev, [loader]: val }));
      setPendingCoalChange(null);
      setEditingCoalType(null);
    }
  };

  const openCoalEdit = (loaderName, currentVal) => {
    setTempCoalTypeValue(currentVal ? String(currentVal) : "");
    setEditingCoalType({ loader: loaderName });
  };

  const checkIsAddLocked = useCallback((hour) => {
    let targetDate = filters.dateRange?.from ? new Date(filters.dateRange.from) : new Date();
    targetDate.setHours(0, 0, 0, 0); // reset time

    // Shift 1 crosses over to the next day for hours 0-5
    if (hour >= 0 && hour <= 5) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // You can only input AFTER the hour has passed: e.g., you can input 14:00 at 15:00.
    targetDate.setHours(hour + 1, 0, 0, 0);
    const now = new Date();
    
    // Lock if the current real time is strictly BEFORE the unlock time.
    return now.getTime() < targetDate.getTime();
  }, [filters.dateRange]);

  const aggregatedData = useMemo(() => {
    return DEFAULT_BELT_CONVEYOR_CONFIGS.map((config) => {
      const records = (data || []).filter((item) => item.loader === config.loader);

      let totalTonase = 0;
      let hourlyData = {};
      let actualRecords = {};
      
      records.forEach((record) => {
        totalTonase += Number(record.tonnage || 0);
        if (record.date) {
            const recordDate = new Date(record.date);
            const hourKey = `${recordDate.getHours().toString().padStart(2, "0")}:00`;
            hourlyData[hourKey] = (hourlyData[hourKey] || 0) + Number(record.tonnage || 0);
            actualRecords[hourKey] = record;
        }
      });

      let dateStr = "-";
      if (records.length > 0) {
        const dates = [...new Set(records.map((r) => r.date?.split("T")[0]).filter(Boolean))];
        if (dates.length === 1) {
             dateStr = formatDate(dates[0]);
        } else if (dates.length > 1) {
             dateStr = `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`;
        }
      } else if (filters?.dateRange?.from) {
        try {
          const fromDate = new Date(filters.dateRange.from);
          dateStr = formatDate(fromDate.toISOString().split("T")[0]);
        } catch (e) {
          dateStr = String(filters.dateRange.from);
        }
      }
      
      return {
        ...config,
        records,
        totalTonase,
        hourlyData,
        actualRecords,
        dateStr,
        coalTypeId: coalTypeConfigs[config.loader] || "",
        latestBeltscale: latestBeltscales[config.loader] || "-",
      };
    }).filter((item) => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return item.loader.toLowerCase().includes(s) || 
               item.hauler.toLowerCase().includes(s) || 
               item.loading_point.toLowerCase().includes(s) || 
               item.dumping_point.toLowerCase().includes(s);
    });
  }, [data, filters, searchTerm, coalTypeConfigs, latestBeltscales]);

  const handleDateRangeChange = useCallback(
    (range) => {
      onFiltersChange({
        dateRange: range,
        shift: filters.shift,
      });
    },
    [onFiltersChange, filters.shift],
  );

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Belt Conveyor</span>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memperbarui...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={onAdd}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Data</span>
            </Button>
            <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-200">
              {filters.shift === "All" ? "Semua Shift" : filters.shift} ({displayHours.length} jam)
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <TableToolbar
          dateRange={filters.dateRange}
          onDateRangeChange={handleDateRangeChange}
          currentShift={filters.shift}
          viewingShift={filters.shift}
          onShiftChange={(shift) => onFiltersChange({ dateRange: filters.dateRange, shift })}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Cari loader, hauler, loading..."
          isRefreshing={isLoading}
          onRefresh={onRefreshData}
          filterExpanded={isFilterExpanded}
          onToggleFilter={() => setIsFilterExpanded(!isFilterExpanded)}
        />

        {isFilterExpanded && (
          <AdvancedFilter
            isExpanded={isFilterExpanded}
            filterGroups={[]} // bisa diisi field filter lain jika perlu di masa depan
            hasActiveFilters={false}
            onResetFilters={() => {}}
          />
        )}

        <div className="overflow-x-auto scrollbar-thin border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
          <table className="w-full text-sm shrink-0">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-3 text-left font-semibold sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">No</th>
                <th className="px-3 py-3 text-left font-semibold sticky left-10 z-10 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 min-w-[180px]">Loader</th>
                <th className="px-3 py-3 text-left font-semibold sticky left-[215px] z-10 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 min-w-[100px]">
                  Beltscale
                </th>
                <th className="px-3 py-3 text-left font-semibold sticky left-[310px] z-10 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 min-w-[100px]">
                  Batu Bara
                </th>
                {displayHours.map((hour) => (
                  <th key={hour} className="px-3 py-3 text-center min-w-[70px] border-r border-slate-200 dark:border-slate-700">{hour.toString().padStart(2, "0")}:00</th>
                ))}
                <th className="px-3 py-3 text-center font-semibold bg-blue-50 dark:bg-blue-900/30 min-w-[100px] border-r border-slate-200 dark:border-slate-700">Total</th>
                <th className="px-3 py-3 text-left font-semibold min-w-[150px] border-r border-slate-200 dark:border-slate-700">Loading</th>
                <th className="px-3 py-3 text-left font-semibold min-w-[150px] border-r border-slate-200 dark:border-slate-700">Dumping</th>
                <th className="px-3 py-3 text-center font-semibold min-w-[100px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {aggregatedData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-3 py-3 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{idx + 1}</td>
                  <td className="px-3 py-3 sticky left-10 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 font-medium text-blue-600 dark:text-blue-400">
                    <div>{row.loader}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">{row.hauler}</div>
                  </td>
                  <td className="px-3 py-3 sticky left-[215px] z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-sm">
                    {row.latestBeltscale !== "-" ? Number(row.latestBeltscale).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "-"}
                  </td>
                  <td className="px-2 py-1 sticky left-[315px] z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs text-center border-t border-b">
                    <button 
                      onClick={() => openCoalEdit(row.loader, row.coalTypeId)}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate mr-2 font-medium">
                        {row.coalTypeId ? coalTypeItems.find(c => c.value === String(row.coalTypeId))?.label || "Batu Bara" : "Pilih..."}
                      </span>
                      <Pencil className="w-3 h-3 shrink-0 text-slate-400 group-hover:text-teal-600 opacity-60 group-hover:opacity-100" />
                    </button>
                  </td>
                  
                  {displayHours.map((hour) => {
                    const hourKey = `${hour.toString().padStart(2, "0")}:00`;
                    const hasData = row.hourlyData[hourKey] > 0;
                    const value = row.hourlyData[hourKey] || 0;
                    const record = row.actualRecords[hourKey];

                    const isLocked = checkIsAddLocked(hour);
                    const unlockHourLabel = `${((hour + 1) % 24).toString().padStart(2, "0")}:00`;

                    return (
                      <td key={hour} className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-700">
                        {hasData ? (
                          <Button 
                            className="inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all hover:scale-105 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/60"
                            onClick={() => onEdit(record)}
                            title={`${value.toFixed(2)} ton - Klik untuk edit`}
                          >
                            {Number(value).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </Button>
                        ) : isLocked ? (
                          <span 
                            className="inline-flex w-8 h-8 items-center justify-center text-slate-300 dark:text-slate-700 cursor-not-allowed"
                            title={`Terkunci: Tunggu jam ${unlockHourLabel} untuk mengisi data jam ${hourKey}`}
                          >
                            -
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 dark:text-teal-400"
                            onClick={() => onAddWithConfig(row, hour)}
                            title={`Input Data ${row.loader} jam ${hourKey}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    );
                  })}
                  
                  <td className="px-3 py-3 text-center bg-blue-50 dark:bg-blue-900/30 border-r border-slate-200 dark:border-slate-700">
                    <span className="inline-block px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded font-bold text-sm">
                      {Number(row.totalTonase).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex items-start gap-1.5">
                      <span className="text-blue-500 text-xs mt-0.5">•</span>
                      <span>{row.loading_point}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex items-start gap-1.5">
                      <span className="text-green-500 text-xs mt-0.5">•</span>
                      <span>{row.dumping_point}</span>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                        {row.records.length > 0 && (
                          <DropdownMenuItem className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => onDetail(row.records[0])}>
                            <Eye className="w-4 h-4 mr-2" />
                            Lihat Detail Terakhir
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => alert("Cetak PDF untuk " + row.loader)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Cetak PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={!!editingCoalType} onOpenChange={() => setEditingCoalType(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <DialogTitle className="text-slate-900 dark:text-slate-100 text-lg">Konfigurasi Batu Bara</DialogTitle>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{editingCoalType?.loader}</p>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Pilih Batu Bara</label>
            <SearchableSelect
              items={coalTypeItems}
              value={tempCoalTypeValue}
              onChange={(val) => setTempCoalTypeValue(val)}
              placeholder="Pilih Batu Bara"
              allowClear
            />
          </div>
          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="outline" onClick={() => setEditingCoalType(null)}>Batal</Button>
            <Button 
              onClick={() => {
                setPendingCoalChange({ loader: editingCoalType.loader, val: tempCoalTypeValue });
              }} 
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!pendingCoalChange}
        onClose={() => setPendingCoalChange(null)}
        onConfirm={confirmCoalTypeChange}
        title="Konfirmasi Perubahan"
        description="Apakah perubahan Batu Bara ini atas persetujuan Kempro?"
        confirmLabel="Ya, Setuju"
        cancelLabel="Batal"
      />
    </Card>
  );
};

// ─── Main Management Component ─────────────────────────────────────────────────
const BeltConveyorManagement = () => {
  const {
    data,
    isLoading,
    deleteData,
    updateData,
    filters,
    updateFilters,
    refetch,
    masters,
    mastersLoading,
    refreshMasters,
    fetchLatestBeltscale,
  } = useBeltConveyor();

  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialModalData, setInitialModalData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = useCallback((item) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  }, []);
  const handleDetail = useCallback((item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  }, []);
  const handleDelete = useCallback((item) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (formData) => {
      if (selectedItem?.id) {
        await updateData({ id: selectedItem.id, payload: formData });
        setIsEditModalOpen(false);
        setSelectedItem(null);
      }
    },
    [selectedItem, updateData],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (selectedItem?.id) {
      await deleteData(selectedItem.id);
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  }, [selectedItem, deleteData]);

  const handleRefreshMaster = useCallback(() => {
    refreshMasters({ forceRefresh: true });
  }, [refreshMasters]);

  const handleAddWithConfig = useCallback((config, hour) => {
    let targetDate = filters.dateRange?.from ? new Date(filters.dateRange.from) : new Date();
    targetDate.setHours(hour, 0, 0, 0);
    if (hour >= 0 && hour <= 5) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    setInitialModalData({
      ...config,
      dateStr: targetDate.toISOString(),
      shift: filters.shift !== "All" ? filters.shift : "Shift 2",
      isHourlyInput: true,
      hourLabel: `${hour}:00`,
      coal_type_id: config.coalTypeId || "",
    });
    setIsAddModalOpen(true);
  }, [filters]);

  return (
    <>
      <DashboardTab
        data={data}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={updateFilters}
        onRefreshData={refetch}
        onRefreshMaster={handleRefreshMaster}
        mastersLoading={mastersLoading}
        masters={masters}
        fetchLatestBeltscale={fetchLatestBeltscale}
        onEdit={handleEdit}
        onDetail={handleDetail}
        onDelete={handleDelete}
        onAdd={() => { setInitialModalData(null); setIsAddModalOpen(true); }}
        onAddWithConfig={handleAddWithConfig}
      />

      <TambahBeltConveyorModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setInitialModalData(null);
        }}
        onSuccess={() => {
          setIsAddModalOpen(false);
          setInitialModalData(null);
          refetch();
        }}
        initialData={initialModalData}
      />

      {/* Edit Modal */}
      {isEditModalOpen && selectedItem && (
        <EditBeltConveyorModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }}
          data={selectedItem}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedItem && (
        <DetailBeltConveyorModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedItem(null);
          }}
          data={selectedItem}
        />
      )}

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={handleConfirmDelete}
        itemInfo={
          selectedItem
            ? `Shift: ${selectedItem.shift} | Tonase: ${selectedItem.tonase}T | ${selectedItem.loader}`
            : ""
        }
        type="belt_conveyor"
      />
    </>
  );
};

export default BeltConveyorManagement;
