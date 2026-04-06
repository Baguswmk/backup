import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, RefreshCw,  MoreVertical, Eye,  Pencil } from "lucide-react";
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
  onCommitFilters,   // ← commit shift/date ke committedFilters (trigger actual fetch)
  onRefreshData,
  masters,
  fetchLatestBeltscale,
  onUpdateCoalType,
  onCreateSetting,
  onEdit,
  onDetail,
  onAdd,
  onAddWithConfig,
  refreshTrigger,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [coalTypeConfigs, setCoalTypeConfigs] = useState({});
  const [latestBeltscales, setLatestBeltscales] = useState({});
  const [editingCoalType, setEditingCoalType] = useState(null);
  const [tempCoalTypeValue, setTempCoalTypeValue] = useState("");
  const [pendingCoalChange, setPendingCoalChange] = useState(null);

  const handleManualRefresh = useCallback(async () => {
    if (onRefreshData) await onRefreshData();
    // (refreshTrigger change now handled by parent when clicking refresh button)
  }, [onRefreshData]);

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
      } catch (e) {
        console.error("[DashboardTab] Gagal fetch latest beltscale:", e);
      }
    };
    loadScales();
    return () => { isMounted = false; };
  }, [fetchLatestBeltscale, refreshTrigger]);

  const displayHours = useMemo(() => getHoursByShift(filters.shift), [filters.shift]);

  const confirmCoalTypeChange = async () => {
    if (!pendingCoalChange) return;

    const { loader, val } = pendingCoalChange;
    if (!val) {
      setPendingCoalChange(null);
      setEditingCoalType(null);
      return;
    }

    const settingId = latestBeltscales[loader]?.settingId;
    const coalTypeNum = Number(val);

    try {
      if (settingId) {
        // PATCH: update coal_type di setting yang sudah ada
        await onUpdateCoalType({ id: settingId, payload: { coal_type: coalTypeNum } });
      } else {
        // POST: buat setting baru jika belum ada
        const config = DEFAULT_BELT_CONVEYOR_CONFIGS.find(c => c.loader === loader);
        if (!config) {
          console.error("[confirmCoalTypeChange] Config tidak ditemukan untuk loader:", loader);
          setPendingCoalChange(null);
          setEditingCoalType(null);
          return;
        }
        await onCreateSetting({
          hauler:    config.hauler,   // hull_no string, BE resolve ke ID
          loader:    config.loader,   // hull_no string, BE resolve ke ID
          coal_type: coalTypeNum,
        });
      }

      // Update state lokal agar UI langsung reflect
      setCoalTypeConfigs(prev => ({ ...prev, [loader]: val }));

      setRefreshTrigger(prev => prev + 1);

    } catch (e) {
      console.error("[confirmCoalTypeChange] Gagal simpan coal_type:", e);
      localStorage.setItem(`batuBara_${loader}`, val);
      setCoalTypeConfigs(prev => ({ ...prev, [loader]: val }));
    }

    setPendingCoalChange(null);
    setEditingCoalType(null);
  };

  const openCoalEdit = (loaderName, currentVal) => {
    setTempCoalTypeValue(currentVal ? String(currentVal) : "");
    setEditingCoalType({ loader: loaderName });
  };

  const checkIsAddLocked = useCallback((hour) => {
    // Hanya lock jam yang BELUM dimulai (future hours)
    // Jam yang sedang berjalan atau sudah lewat = bisa diisi
    const now = new Date();
    const currentHour = now.getHours();

    // Jika filter dateRange bukan hari ini, unlock semua (data historis)
    const filterDate = filters.dateRange?.from ? new Date(filters.dateRange.from) : null;
    if (filterDate) {
      const filterDay = new Date(filterDate);
      filterDay.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Kalau filter hari sebelumnya → semua jam bisa diisi
      if (filterDay.getTime() < today.getTime()) return false;
    }

    // Untuk shift 1 (jam 22-5), jam 22-23 ada di hari sebelumnya
    // sedangkan jam 0-5 ada di hari berikutnya — kita cukup bandingkan jam saja
    // Locked hanya jika jam tersebut belum dimulai (hour > currentHour)
    if (hour >= 0 && hour <= 5) {
      // Jam dini hari: hanya locked jika sudah melewati tengah malam tapi hour belum tercapai
      // Misal: sekarang jam 01:xx, jam 3 masih terkunci
      // Misal: sekarang jam 23:xx, jam 0-5 belum dimulai = terkunci
      const isAfterMidnight = currentHour >= 0 && currentHour <= 5;
      if (isAfterMidnight) {
        return hour > currentHour;
      }
      // Sekarang masih sore/malam (jam >= 6), jam 0-5 belum datang = terkunci
      return true;
    }

    // Jam normal (6-23): locked jika hour > jam sekarang
    return hour > currentHour;
  }, [filters.dateRange]);

  const aggregatedData = useMemo(() => {
    return DEFAULT_BELT_CONVEYOR_CONFIGS.map((config) => {
      const records = (data || []).filter((item) => item.loader === config.loader);

      let totalTonase = 0;
      let hourlyData = {};
      let actualRecords = {};

      records.forEach((record) => {
        const recordDelta = Number(record.tonnage || 0);
        totalTonase += recordDelta;
        if (record.date) {
          const recordDate = new Date(record.date);
          const hourKey = `${recordDate.getHours().toString().padStart(2, "0")}:00`;
          hourlyData[hourKey] = (hourlyData[hourKey] || 0) + recordDelta;
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

      let coalTypeIdMatched = coalTypeConfigs[config.loader] || "";
      const beCoalType = latestBeltscales[config.loader]?.coal_type;

      if (beCoalType) {
        const found = coalTypeItems && coalTypeItems.find(c =>
          String(c.label).trim().toLowerCase() === String(beCoalType).trim().toLowerCase() ||
          String(c.value) === String(beCoalType)
        );
        if (found) {
          coalTypeIdMatched = found.value;
        } else {
          coalTypeIdMatched = beCoalType;
        }
      }

      const beBeltscale = latestBeltscales[config.loader]?.beltscale;

      return {
        ...config,
        records,
        totalTonase,
        hourlyData,
        actualRecords,
        dateStr,
        coalTypeId: coalTypeIdMatched,
        latestBeltscale: beBeltscale != null ? beBeltscale : "-",
      };
    }).filter((item) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return item.loader.toLowerCase().includes(s) ||
        item.hauler.toLowerCase().includes(s) ||
        item.loading_point.toLowerCase().includes(s) ||
        item.dumping_point.toLowerCase().includes(s);
    });
  }, [data, filters, searchTerm, coalTypeConfigs, latestBeltscales, coalTypeItems]);

  const handleDateRangeChange = useCallback(
    (range) => {
      const updatedShift = range.shift || filters.shift;
      
      onFiltersChange({
        dateRange: range,
        shift: updatedShift,
      });
      if (onCommitFilters) {
        onCommitFilters({ dateRange: range, shift: updatedShift });
      }
    },
    [onFiltersChange, onCommitFilters, filters.shift],
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
              {filters.shift} (8 jam)
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <TableToolbar
          dateRange={filters.dateRange}
          onDateRangeChange={handleDateRangeChange}
          datePickerMode="rangeNoAll"
          currentShift={filters.shift}
          viewingShift={filters.shift}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Cari loader, hauler, loading..."
          isRefreshing={isLoading}
          onRefresh={handleManualRefresh}
          filterExpanded={isFilterExpanded}
          onToggleFilter={() => setIsFilterExpanded(!isFilterExpanded)}
        />

        {isFilterExpanded && (
          <AdvancedFilter
            isExpanded={isFilterExpanded}
            filterGroups={[]}
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
                        {row.coalTypeId
                          ? coalTypeItems.find(c => c.value === String(row.coalTypeId))?.label || "Batu Bara"
                          : "Pilih..."}
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
                    <span className="inline-block px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded text-xs font-bold">
                      {Number(row.totalTonase).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs border-r border-slate-200 dark:border-slate-700">
                    {row.loading_point}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs border-r border-slate-200 dark:border-slate-700">
                    {row.dumping_point}
                  </td>
                  <td className="px-3 py-3 text-center ">
                    <DropdownMenu className="">
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:text-neutral-50 bg-white dark:bg-slate-700 border-none">
                        {row.records.length > 0 && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => onDetail(row.records[row.records.length - 1])}>
                            <Eye className="mr-2 h-4 w-4" />
                            Detail Terakhir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Dialog edit coal type */}
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
    updateSetting,
    createSetting,
    filters,
    updateFilters,
    onApply,
    refetch,
    masters,
    mastersLoading,
    refreshMasters,
    fetchLatestBeltscale,
  } = useBeltConveyor({
    filterMode: "daily",           // BeltConveyorManagement: input harian operasional
    // shift default = workInfo.shift (dari hook base defaults)
    // dateRange default = hari ini (dari hook base defaults)
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialModalData, setInitialModalData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefreshAll = useCallback(() => {
    refetch();
    setRefreshTrigger((prev) => prev + 1);
  }, [refetch]);

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
        handleRefreshAll();
      }
    },
    [selectedItem, updateData, handleRefreshAll],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (selectedItem?.id) {
      await deleteData(selectedItem.id);
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      handleRefreshAll();
    }
  }, [selectedItem, deleteData, handleRefreshAll]);

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
      shift: filters.shift,
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
        onCommitFilters={(newFilters) => {
          // Saat shift diubah di dashboard, commit langsung supaya data refetch
          updateFilters(newFilters);
          // Force commit: update committedFilters via updateFilters
          // (daily-like auto-commit sudah dihandle di hook via onApply)
          onApply();
        }}
        onRefreshData={handleRefreshAll}
        refreshTrigger={refreshTrigger}
        onRefreshMaster={handleRefreshMaster}
        mastersLoading={mastersLoading}
        masters={masters}
        fetchLatestBeltscale={fetchLatestBeltscale}
        onUpdateCoalType={updateSetting}
        onCreateSetting={createSetting}
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
          handleRefreshAll();
        }}
        initialData={initialModalData}
        masters={masters}
        fetchLatestBeltscale={fetchLatestBeltscale}
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