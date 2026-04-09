import { DetailPengeluaranKA } from "./components/DetailPengeluaranKA";
import { useShipmentLogBase } from "./hooks/useShipmentLogBase";
import { usePengeluaranKALaporan } from "./hooks/usePengeluaranKALaporan";
import { usePengeluaranKADashboard } from "./hooks/usePengeluaranKADashboard";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { showToast } from "@/shared/utils/toast";
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useOfflineFilters } from "@/shared/hooks/useOfflineFilters";
import { PengeluaranLaporanAddModal } from "@/shared/components/pengeluaran/laporan/PengeluaranLaporanAddModal";
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import TableToolbar from "@/shared/components/TableToolbar";
import { cn } from "@/lib/utils";
import { PengeluaranLaporanLayout } from "@/shared/components/pengeluaran/layout/PengeluaranLaporanLayout";
import { PengeluaranDashboardLayout } from "@/shared/components/pengeluaran/layout/PengeluaranDashboardLayout";
import { PengeluaranDateFilter } from "@/shared/components/pengeluaran/layout/PengeluaranDateFilter";
import { formatNumber } from "@/shared/utils/number";
import { Button } from "@/shared/components/ui/button";
import { format } from "date-fns";

const safeFormat = (iso, fmt = "dd/MM/yyyy HH:mm") => {
  if (!iso) return "—";
  try { return format(new Date(iso), fmt); } catch { return "—"; }
};


// ---------------------------------------------------------------------------
// Container Component
// ---------------------------------------------------------------------------
const PengeluaranKAManagement = ({ Type }) => {
  const isDashboard = Type === "Dashboard";

  const {
    filterMode,
    onModeChange,
    filters,
    updateFilter,
    getDateParams,
    destinationOptions,
    fetchDestinationOptions,
  } = useShipmentLogBase(isDashboard ? "month" : "range");

  const laporanHook = usePengeluaranKALaporan();
  const dashboardHook = usePengeluaranKADashboard({
    destination: filters.destination,
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isRefreshingMaster, setIsRefreshingMaster] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const handleRefreshMasterData = useCallback(async () => {
    setIsRefreshingMaster(true);
    try {
      await masterDataService.fetchLocations({ forceRefresh: true });
      showToast.success("Data Lokasi berhasil diperbarui");
    } catch {
      showToast.error("Gagal memperbarui data lokasi");
    } finally {
      setIsRefreshingMaster(false);
    }
  }, []);

  useEffect(() => {
    const params = getDateParams();
    if (isDashboard) {
      fetchDestinationOptions(params);
      dashboardHook.fetch(params, filters.destination);
    } else {
      laporanHook.fetch(params);
    }
  }, [isDashboard]);

  const dateFilterProps = {
    filterMode,
    onModeChange,
    month: filters.month,
    startDate: filters.startDate,
    endDate: filters.endDate,
    onUpdateFilter: updateFilter,
    // onApply: hitung params dari state saat ini, lalu fetch langsung
    onApply: () => {
      const params = getDateParams();
      if (isDashboard) {
        dashboardHook.fetch(params, filters.destination);
      } else {
        laporanHook.fetch(params);
      }
    },
  };

  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  // We group extra filters in AdvancedFilter as requested (handled below by useOfflineFilters)

  const [laporanMode, setLaporanMode] = useState("rangkaian"); // "rangkaian" | "product"

  const ViewModeToggle = !isDashboard ? (
    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <Button
        onClick={() => setLaporanMode("rangkaian")}
        className={cn(
          "px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all",
          laporanMode === "rangkaian"
            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        )}
      >
        Per Rangkaian
      </Button>
      <Button
        onClick={() => setLaporanMode("product")}
        className={cn(
          "px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all",
          laporanMode === "product"
            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        )}
      >
        Per Produk
      </Button>
    </div>
  ) : null;



  const Modals = (
    <>
      <PengeluaranLaporanAddModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          laporanHook.setDuplicateError(null);
        }}
        isSubmitting={laporanHook.isSubmitting}
        onSubmitExcel={laporanHook.submitExcel}
        onSubmitManual={laporanHook.submitManual}
        duplicateError={laporanHook.duplicateError}
        setDuplicateError={laporanHook.setDuplicateError}
        onSubmitOverride={laporanHook.submitOverride}
      />
      {selectedDetail && (
        <DetailPengeluaranKA
          isOpen={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
          data={selectedDetail}
        />
      )}
    </>
  );

  // Move useMemos here to abide by Hook rules
  const { tableData, tableDataByProduct, summaryData, isLoading: isLaporanLoading } = laporanHook;
  const currentData = laporanMode === "product" ? tableDataByProduct : tableData;

  const KA_FILTER_CONFIGS = useMemo(() => [
    { key: "destination", label: "Tujuan" },
    { 
      key: "product", 
      label: "Produk",
      getValue: (r) => {
        if (!r.product) return r.product;
        // if comma separated, split and trim to return an array of products
        if (typeof r.product === "string" && r.product.includes(",")) {
          return r.product.split(",").map(p => p.trim());
        }
        return r.product;
      }
    },
    { key: "stockpileLocation", label: "Stockpile" },
    { key: "tlsLocation", label: "Lokasi TLS" },
  ], []);

  const { filteredData: semiFilteredData, filterGroups: additionalFilterGroups, activeFiltersCount, resetFilters } = useOfflineFilters(currentData, KA_FILTER_CONFIGS);

  const filteredTableData = useMemo(() => {
    let list = semiFilteredData || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => 
        (r.trainId && r.trainId.toLowerCase().includes(q)) ||
        (r.destination && r.destination.toLowerCase().includes(q)) ||
        (r.product && r.product.toLowerCase().includes(q)) ||
        (r.stockpileLocation && r.stockpileLocation.toLowerCase().includes(q)) ||
        (r.tlsLocation && r.tlsLocation.toLowerCase().includes(q)) ||
        (r.id_rangkaian && String(r.id_rangkaian).toLowerCase().includes(q))
      );
    }
    return list;
  }, [semiFilteredData, searchQuery]);

  const totalItems = filteredTableData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTableData.slice(start, start + itemsPerPage);
  }, [filteredTableData, currentPage, itemsPerPage]);

  // --- Table Columns ---
  const columns = useMemo(() => {
    if (laporanMode === "product") {
      // Per Produk: 1 row per (rangkaian × product) — ID Rangkaian + Produk both visible
      return [
        { header: "ID Rangkaian", key: "trainId", className: "font-mono font-bold text-blue-600 dark:text-blue-400" },
        { header: "Produk", key: "product", className: "font-semibold text-emerald-700 dark:text-emerald-400 min-w-[150px]" },
        { header: "Tujuan", key: "destination", className: "min-w-[100px]" },
        { header: "Stockpile", key: "stockpileLocation", className: "min-w-[150px]" },
        { header: "TLS", key: "tlsLocation" },
        { header: "Mulai Muat", key: "startTime", render: (val) => safeFormat(val) },
        { header: "Selesai Muat", key: "endTime",  render: (val) => safeFormat(val) },
        { header: "Tonase (ton)", key: "totalTonnage", align: "right", render: (val) => formatNumber(val, 2) },
        { header: "Shift", key: "shift", align: "center" },
      ];
    }
    // Per Rangkaian: 1 row per rangkaian — products comma-joined in Produk column
    return [
      { header: "ID Rangkaian", key: "trainId", className: "font-mono font-bold text-blue-600 dark:text-blue-400" },
      { header: "Tujuan", key: "destination", className: "min-w-[80px]" },
      { header: "Produk", key: "product", className: "min-w-[100px]" },
      { header: "Stockpile", key: "stockpileLocation", className: "min-w-[180px]" },
      { header: "TLS", key: "tlsLocation" },
      { header: "Mulai Muat", key: "startTime", render: (val) => safeFormat(val) },
      { header: "Selesai Muat", key: "endTime",  render: (val) => safeFormat(val) },
      { header: "Dur. (min)", key: "durationMinutes", align: "right", render: (val) => formatNumber(val) },
      { header: "Tonase (ton)", key: "totalTonnage", align: "right", render: (val) => formatNumber(val, 2) },
      { header: "Shift", key: "shift", align: "center" },
    ];
  }, [laporanMode]);



    const FilterToolbar = {
    inline: (
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between w-full ">
        <PengeluaranDateFilter {...dateFilterProps} hideRangeShift={true} className="w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0" />
        <div className="w-full xl:w-auto flex-1 max-w-xl">
          <TableToolbar
          activeDateRange={false}
          searchQuery={isDashboard ? undefined : searchQuery}
          onSearchChange={
            isDashboard
              ? undefined
              : (q) => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                }
          }
          searchPlaceholder="Cari ID, Nomor KA, Lokasi..."
          isRefreshing={isDashboard ? dashboardHook.isLoading : laporanHook.isLoading}
          onRefresh={isDashboard ? dashboardHook.refetch : laporanHook.refetch}
          showFilter={true}
          onToggleFilter={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
          extraActions={ViewModeToggle}
        />
        </div>
      </div>
    ),
    expanded: (
      <AdvancedFilter
        isExpanded={isAdvancedFilterOpen}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetFilters}
        filterGroups={additionalFilterGroups}
      />
    ),
  };


    const dashboardData = dashboardHook;

  if (isDashboard) {
    return (
      <PengeluaranDashboardLayout
        title="Dashboard Pengeluaran Via KA"
        subtitle="Pantauan real-time tonase dan durasi pengangkutan Kereta Api"
        statTotal={dashboardData.statTotal}
        tlsList={dashboardData.tlsList}
        chartData={dashboardData.chartData}
        kpiData={dashboardData.kpiData}
        topProducts={dashboardData.topProducts}
        isLoading={dashboardHook.isLoading}
        filters={
          <div className="flex flex-col gap-3 w-full">
            {FilterToolbar.inline}
            {FilterToolbar.expanded}
          </div>
        }
      />
    );
  }
  
  return (
    <PengeluaranLaporanLayout
      pageTitle="Laporan Rekaman Via KA"
      pageSubtitle="Daftar log aktivitas ritase pengangkutan Kereta Api"
      summaryData={summaryData}
      isSummaryLoading={isLaporanLoading}
      isTableLoading={isLaporanLoading}
      tableData={paginatedData}
      columns={columns}
      filters={
        <div className="flex flex-col gap-3 w-full">
          {FilterToolbar.inline}
          {FilterToolbar.expanded}
        </div>
      }
      canAdd={true}
      canWrite={true}
      onAdd={() => setIsAddModalOpen(true)}
      onViewDetail={(row) => setSelectedDetail(row)}
      // onEdit={(row) => alert(`Edit requested for ${row.trainId || row.id}`)}
      // onDelete={(row) => alert(`Delete requested for ${row.trainId || row.id}`)}
      modalsComponent={Modals}
      onRefreshData={laporanHook.refetch}
      isRefreshingData={isLaporanLoading}
      onRefreshMasterData={handleRefreshMasterData}
      isRefreshingMasterData={isRefreshingMaster}
      currentPage={currentPage}
      totalPages={totalPages}
      itemsPerPage={itemsPerPage}
      totalItems={totalItems}
      onPageChange={setCurrentPage}
      onItemsPerPageChange={(val) => {
        setItemsPerPage(val);
        setCurrentPage(1);
      }}
    />
  );
};

export default PengeluaranKAManagement;
