import React, { useState, useMemo, useCallback } from "react";
import { useBeltConveyor } from "./hooks/useBeltConveyor";
import EditBeltConveyorModal from "./components/EditBeltConveyorModal";
import DetailBeltConveyorModal from "./components/DetailBeltConveyorModal";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";
import { PengeluaranLaporanLayout } from "@/shared/components/pengeluaran/layout/PengeluaranLaporanLayout";
import { PengeluaranDashboardLayout } from "@/shared/components/pengeluaran/layout/PengeluaranDashboardLayout";
import { PengeluaranDateFilter } from "@/shared/components/pengeluaran/layout/PengeluaranDateFilter";
import { formatNumber } from "@/shared/utils/number";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOfflineFilters } from "@/shared/hooks/useOfflineFilters";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import TableToolbar from "@/shared/components/TableToolbar";

// ── Simple delete confirmation dialog ─────────────────────────────────────────
const SimpleDeleteDialog = ({ isOpen, onClose, onConfirm, recordLabel, isProcessing }) => {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </div>
            Hapus Data
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">
              Penghapusan ini bersifat permanen dan tidak dapat dibatalkan.
            </p>
          </div>
          {recordLabel && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Anda akan menghapus rekaman:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {recordLabel}
              </span>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="dark:border-slate-700 dark:text-slate-300"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isProcessing ? "Menghapus..." : "Ya, Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Container Component ────────────────────────────────────────────────────────
const PengeluaranBCManagement = ({ Type }) => {
  const isDashboard = Type === "Dashboard";

  const {
    data: rawData,
    isLoading,
    filters,
    updateFilters,
    onApply,
    refetch,
    deleteData,
    updateData,
  } = useBeltConveyor({
    filterMode: "month",   // PengeluaranBCManagement: laporan/dashboard bulanan
    // (default shift = shift saat ini dari hook)
  });

  // ── Filter & search state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  // shift state diambil dari hook (filters.shift) — tidak ada state lokal terpisah

  // ── Pagination state ───────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleViewDetail = useCallback((row) => {
    setSelectedItem(row);
    setIsDetailOpen(true);
  }, []);

  const handleEdit = useCallback((rowId) => {
    const found = (rawData || []).find((r) => r.id === rowId);
    setSelectedItem(found || null);
    setIsEditOpen(true);
  }, [rawData]);

  const handleDelete = useCallback((rowId) => {
    const found = (rawData || []).find((r) => r.id === rowId);
    setSelectedItem(found || null);
    setIsDeleteOpen(true);
  }, [rawData]);

  const handleEditSubmit = useCallback(
    async (formData) => {
      if (selectedItem?.id) {
        await updateData({ id: selectedItem.id, payload: formData });
        setIsEditOpen(false);
        setSelectedItem(null);
        refetch();
      }
    },
    [selectedItem, updateData, refetch],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedItem?.id) return;
    setIsDeleting(true);
    try {
      await deleteData(selectedItem.id);
      setIsDeleteOpen(false);
      setSelectedItem(null);
      refetch();
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItem, deleteData, refetch]);

  const handleSearchChange = useCallback((q) => {
    setSearchQuery(q);
    setCurrentPage(1);
  }, []);

  const handleShiftChange = useCallback(
    (shift) => {
      updateFilters({ shift });
      setCurrentPage(1);
    },
    [updateFilters]
  );

  const dateFilterProps = useMemo(() => ({
    filterMode: filters.filterMode || "month",
    onModeChange: (mode) => updateFilters({ filterMode: mode }),
    month: filters.month || "",
    startDate: filters.dateRange?.from || "",
    endDate: filters.dateRange?.to || "",
    onUpdateFilter: (key, val) => {
      if (key === "startDate") {
        updateFilters({ dateRange: { ...filters.dateRange, from: val } });
      } else if (key === "endDate") {
        updateFilters({ dateRange: { ...filters.dateRange, to: val } });
      } else {
        updateFilters({ [key]: val });
      }
      setCurrentPage(1);
    },
    // Terapkan — hanya aktif di mode bulanan; harian auto-commit di hook
    onApply,
  }), [filters, updateFilters, onApply]);

  // ── Data Transformations ───────────────────────────────────────────────────
  const getText = (val) => {
    if (!val) return "Unknown";
    if (typeof val === "object") return val.name || val.label || val.title || "Unknown";
    return val;
  };

  const transformedData = useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return null;

    const totalTonnage = rawData.reduce(
      (sum, item) => sum + Number(item.tonnage || item.net_weight || 0),
      0,
    );
    const statTotal = {
      totalTonnage,
      totalCount: rawData.length,
      totalWagons: 0,
    };

    const loaderGroups = rawData.reduce((acc, item) => {
      const loader = getText(item.loader);
      if (!acc[loader]) acc[loader] = { tonnage: 0, count: 0 };
      acc[loader].tonnage += Number(item.tonnage || item.net_weight || 0);
      acc[loader].count += 1;
      return acc;
    }, {});

    const tlsList = Object.entries(loaderGroups).map(([tls, stats]) => ({
      tls,
      tonnage: stats.tonnage,
      count: stats.count,
      totalWagons: 0,
    }));

    const dateGroups = rawData.reduce((acc, item) => {
      const dateStr =
        item.date ||
        (item.createdAt ? format(new Date(item.createdAt), "dd/MM") : "Unknown");
      if (!acc[dateStr]) acc[dateStr] = 0;
      acc[dateStr] += Number(item.tonnage || item.net_weight || 0);
      return acc;
    }, {});

    const chartData = Object.entries(dateGroups)
      .map(([day, tonnage]) => ({ day, tonnage }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const tonnages = rawData
      .map((item) => Number(item.tonnage || item.net_weight || 0))
      .filter((t) => t > 0);
    const avgTonase = tonnages.length > 0 ? totalTonnage / tonnages.length : 0;
    const uniqueDays = new Set(rawData.map((item) => item.date)).size || 1;
    const avgKA = rawData.length / uniqueDays;

    const kpiData = {
      avgTonase,
      avgDurasi: 0,
      avgKA,
      maxTon: tonnages.length > 0 ? Math.max(...tonnages) : 0,
      minTon: tonnages.length > 0 ? Math.min(...tonnages) : 0,
      maxDur: 0,
      minDur: 0,
      maxRng: 0,
      minRng: 0,
    };

    const productGroups = rawData.reduce((acc, item) => {
      const product = getText(item.coal_type);
      if (!acc[product]) acc[product] = 0;
      acc[product] += Number(item.tonnage || item.net_weight || 0);
      return acc;
    }, {});

    const topProducts = Object.entries(productGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const summaryData = {
      total: { totalCount: rawData.length, totalTonnage, avgDuration: 0, byTls: tlsList },
      destinations: tlsList.map((t) => ({
        name: t.tls,
        totalCount: t.count,
        totalTonnage: t.tonnage,
        avgDuration: 0,
        byTls: [t],
      })),
    };

    return { statTotal, tlsList, chartData, kpiData, topProducts, summaryData, tableData: rawData };
  }, [rawData]);

  // ── Client-side search & filtering ─────────────────────────────────────────

  const BC_FILTER_CONFIGS = useMemo(() => [
    { key: "loader", label: "Loader", getValue: (r) => getText(r.loader) },
    { key: "hauler", label: "Hauler", getValue: (r) => getText(r.hauler) },
    { key: "coal_type", label: "Produk", getValue: (r) => getText(r.coal_type) },
    { key: "loading_point", label: "Loading", getValue: (r) => getText(r.loading_point) },
    { key: "dumping_point", label: "Dumping", getValue: (r) => getText(r.dumping_point) },
  ], []);

  const { filteredData: semiFilteredData, filterGroups: additionalFilterGroups, activeFiltersCount, resetFilters } = useOfflineFilters(transformedData?.tableData || [], BC_FILTER_CONFIGS);

  const filteredTableData = useMemo(() => {
    let list = semiFilteredData || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          getText(r.loader).toLowerCase().includes(q) ||
          getText(r.hauler).toLowerCase().includes(q) ||
          getText(r.loading_point).toLowerCase().includes(q) ||
          getText(r.dumping_point).toLowerCase().includes(q) ||
          getText(r.coal_type).toLowerCase().includes(q) ||
          String(r.tonnage || "").includes(q),
      );
    }

    return list;
  }, [semiFilteredData, searchQuery]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalItems = filteredTableData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTableData.slice(start, start + itemsPerPage);
  }, [filteredTableData, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = useCallback((val) => {
    setItemsPerPage(val);
    setCurrentPage(1);
  }, []);

  const isMonthly = filters.filterMode === "month";
  const activeShift = filters.shift; // akan selalu ada nilai (default workInfo.shift)

  // ... previously removed shiftFilterGroups ...
  const bcColumns = useMemo(() => [
    { 
      header: "Waktu", 
      key: "date", 
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-mono text-[11px] dark:text-gray-200">
            {val || (row.createdAt ? format(new Date(row.createdAt), "dd/MM/yyyy") : "—")}
          </span>
          <span className="text-[10px] text-gray-400">
            {row.createdAt ? format(new Date(row.createdAt), "HH:mm") : ""}
          </span>
        </div>
      )
    },
    { header: "Loader", key: "loader", className: "font-bold text-blue-600 dark:text-blue-400", render: getText },
    { header: "Hauler", key: "hauler", render: getText },
    { header: "Loading", key: "loading_point", truncate: true, render: getText },
    { header: "Dumping", key: "dumping_point", truncate: true, render: getText },
    { header: "Produk", key: "coal_type", render: getText },
    { header: "Tonase", key: "tonnage", align: "right", render: (val, row) => formatNumber(val || row.net_weight, 2) },
    { 
      header: "Shift", 
      key: "shift", 
      align: "center",
      render: (val) => (
        <Badge variant="outline" className="text-[10px] dark:text-neutral-50 py-0 h-5 font-normal">
          {getText(val)}
        </Badge>
      )
    },
    { 
      header: "Status", 
      key: "status", 
      align: "center",
      render: (val) => {
        const status = getText(val);
        return (
          <Badge 
            className={cn(
              "text-[10px] py-0 h-5 font-medium border",
              status.toLowerCase().includes("pengeluaran") 
                ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" 
                : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
            )}
          >
            {status.replace(" Belt Conveyor", "")}
          </Badge>
        );
      }
    },
  ], []);

  const Modals = (
    <>
      <SimpleDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={handleConfirmDelete}
        recordLabel={selectedItem ? `${getText(selectedItem.loader)} — ${selectedItem.date?.split("T")[0] || ""}` : ""}
        isProcessing={isDeleting}
      />

      {isDetailOpen && selectedItem && (
        <DetailBeltConveyorModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedItem(null);
          }}
          data={selectedItem}
        />
      )}

      {isEditOpen && selectedItem && (
        <EditBeltConveyorModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedItem(null);
          }}
          data={selectedItem}
          onSubmit={handleEditSubmit}
          fullEdit={true}
        />
      )}
    </>
  );

  const SHIFT_OPTIONS = [
    { value: "Shift 1", label: "Shift 1" },
    { value: "Shift 2", label: "Shift 2" },
    { value: "Shift 3", label: "Shift 3" },
  ];

  const FilterToolbarInline = (
    <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between w-full">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full xl:w-auto">
        <PengeluaranDateFilter {...dateFilterProps} className="w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0" />

        {/* Shift selector — hanya tampil saat mode bulanan */}
        {isMonthly && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
            {SHIFT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleShiftChange(opt.value)}
                className={cn(
                  "px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all whitespace-nowrap",
                  activeShift === opt.value
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full xl:w-auto flex-1 max-w-xl">
        <TableToolbar
          activeDateRange={false}
          showRefresh={true}
          onRefresh={() => refetch()}
          isLoading={isLoading}
          showFilter={true}
          onToggleFilter={() => setIsFilterExpanded(!isFilterExpanded)}
          searchQuery={isDashboard ? undefined : searchQuery}
          onSearchChange={isDashboard ? undefined : handleSearchChange}
          searchPlaceholder="Cari loader, hauler, produk..."
        />
      </div>
    </div>
  );

  const FilterToolbarExpanded = isFilterExpanded ? (
    <AdvancedFilter
      isExpanded={isFilterExpanded}
      filterGroups={additionalFilterGroups}
      hasActiveFilters={activeFiltersCount > 0}
      onResetFilters={resetFilters}
      isLoading={isLoading}
    />
  ) : null;

  if (isDashboard) {
    return (
      <PengeluaranDashboardLayout
        title="Dashboard Pengeluaran Belt Conveyor"
        subtitle="Pantauan real-time tonase Belt Conveyor"
        statTotal={transformedData?.statTotal || {}}
        tlsList={transformedData?.tlsList || []}
        chartData={transformedData?.chartData || []}
        kpiData={transformedData?.kpiData || {}}
        topProducts={transformedData?.topProducts || []}
        isLoading={isLoading}
        filters={
          <>
            {FilterToolbarInline}
            {FilterToolbarExpanded}
          </>
        }
      />
    );
  }

  return (
    <PengeluaranLaporanLayout
      pageTitle="Laporan Rekaman Belt Conveyor"
      pageSubtitle="Daftar log aktivitas ritase pengangkutan Belt Conveyor"
      summaryData={transformedData?.summaryData || {}}
      isSummaryLoading={isLoading}
      isTableLoading={isLoading}
      tableData={paginatedData}
      columns={bcColumns}
      filters={
        <>
          {FilterToolbarInline}
          {FilterToolbarExpanded}
        </>
      }
      canAdd={false}
      canWrite={true}
      onViewDetail={handleViewDetail}
      onEdit={handleEdit}
      onDelete={handleDelete}
      modalsComponent={Modals}
      currentPage={currentPage}
      totalPages={totalPages}
      itemsPerPage={itemsPerPage}
      totalItems={totalItems}
      onPageChange={setCurrentPage}
      onItemsPerPageChange={handleItemsPerPageChange}
    />
  );
};

export default PengeluaranBCManagement;
