import React, { useState, useEffect, useMemo } from "react";
import { PengeluaranLaporanLayout } from "@/shared/components/pengeluaran/layout/PengeluaranLaporanLayout";
import { PengeluaranDashboardLayout } from "@/shared/components/pengeluaran/layout/PengeluaranDashboardLayout";
import { PengeluaranDateFilter } from "@/shared/components/pengeluaran/layout/PengeluaranDateFilter";
import { TlsCardsRow } from "@/shared/components/pengeluaran/dashboard/TlsCardsRow";
import { TrendChartPanel } from "@/shared/components/pengeluaran/dashboard/TrendChartPanel";
import { KpiRow } from "@/shared/components/pengeluaran/dashboard/KpiRow";
import { TopProductPanel } from "@/shared/components/pengeluaran/dashboard/TopProductPanel";
import { SummaryOverviewCards } from "@/shared/components/pengeluaran/laporan/SummaryOverviewCards";
import { formatNumber } from "@/shared/utils/number";
import { Button } from "@/shared/components/ui/button";
import { useOfflineFilters } from "@/shared/hooks/useOfflineFilters";
import AdvancedFilter from "@/shared/components/AdvancedFilter";

// --- Mock Data & Hook ---
const usePengeluaranFOTMock = (isDashboard) => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    statTotal: {},
    tlsList: [],
    chartData: [],
    kpiData: {},
    topProducts: [],
    tableData: [],
    summaryData: {}
  });

  useEffect(() => {
    setIsLoading(true);
    // Simulate API Fetch (FOT mapping)
    setTimeout(() => {
      setData({
        statTotal: { totalCount: 45, totalTonnage: 1200, totalWagons: 0 },
        tlsList: [
          { tls: "FOT North", count: 20, tonnage: 600, totalWagons: 0 },
          { tls: "FOT South", count: 25, tonnage: 600, totalWagons: 0 },
        ],
        chartData: [
          { day: "01/04", tonnage: 400, count: 15 },
          { day: "02/04", tonnage: 800, count: 30 },
        ],
        kpiData: {
          avgTonase: 26.6, avgDurasi: 15, avgKA: 12,
          maxTon: 30, minTon: 15, maxDur: 20, minDur: 10, maxRng: 15, minRng: 5
        },
        topProducts: [
          ["Mutiara Coal", 1200]
        ],
        tableData: [
          {
            id: 1, trainId: "FOT/N/001", destination: "Stockpile N", product: "Mutiara Coal",
            stockpileLocation: "SP FOT", tlsLocation: "FOT North", startTime: "2026-04-02T08:00:00Z",
            endTime: "2026-04-02T08:15:00Z", durationMinutes: 15, totalTonnage: 30, shift: "Shift 1"
          }
        ],
        summaryData: {
          total: { totalCount: 1, totalTonnage: 30, avgDuration: 15, byTls: [{tls: "FOT North", count: 1, tonnage: 30, avgDuration: 15}] },
          destinations: [
            { name: "Stockpile N", totalCount: 1, totalTonnage: 30, avgDuration: 15, byTls: [{tls: "FOT North", count: 1, tonnage: 30, avgDuration: 15}] }
          ]
        }
      });
      setIsLoading(false);
    }, 500);
  }, [isDashboard]);

  return { data, isLoading };
};

// --- Container Component ---
const PengeluaranFOTManagement = ({ Type }) => {
  const isDashboard = Type === "Dashboard";
  const { data, isLoading } = usePengeluaranFOTMock(isDashboard);

  const fotColumns = useMemo(() => [
    { header: "ID FOT", key: "trainId", className: "font-mono font-bold text-blue-600 dark:text-blue-400" },
    { header: "Tujuan", key: "destination", truncate: true },
    { header: "Produk", key: "product", truncate: true },
    { header: "Stockpile", key: "stockpileLocation", truncate: true },
    { header: "Lokasi FOT", key: "tlsLocation", truncate: true },
    { header: "Dur. (min)", key: "durationMinutes", align: "right", render: (val) => formatNumber(val) },
    { header: "Tonase (ton)", key: "totalTonnage", align: "right", render: (val) => formatNumber(val, 2) },
    { header: "Shift", key: "shift", align: "center" },
  ], []);

  const [filterMode, setFilterMode] = useState("month");
  const [filters, setFilters] = useState({ month: "2026-04", startDate: "2026-04-01", endDate: "2026-04-30" });
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  const FOT_FILTER_CONFIGS = useMemo(() => [
    { key: "destination", label: "Tujuan" },
    { key: "product", label: "Produk" },
    { key: "stockpileLocation", label: "Stockpile" },
    { key: "tlsLocation", label: "Lokasi FOT" },
  ], []);

  const { filteredData: semiFilteredData, filterGroups: additionalFilterGroups, activeFiltersCount, resetFilters } = useOfflineFilters(data.tableData, FOT_FILTER_CONFIGS);

  const paginatedData = semiFilteredData; // Minimal pagination mockup

  const dateFilterProps = {
    filterMode,
    onModeChange: setFilterMode,
    month: filters.month,
    startDate: filters.startDate,
    endDate: filters.endDate,
    onUpdateFilter: (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  };

  const FilterToolbar = {
    inline: (
      <div className="flex flex-col xl:flex-row gap-4 flex-wrap xl:flex-nowrap items-start xl:items-center justify-between w-full">
        <PengeluaranDateFilter {...dateFilterProps} className="w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0" />
        <div className="flex items-center gap-2 mt-3 xl:mt-0 ml-auto w-full xl:w-auto">
          <Button variant="outline" className="h-9 text-xs">Refresh</Button>
          <Button variant="outline" className="h-9 text-xs" onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}>Filter Lain</Button>
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
    )
  };

  if (isDashboard) {
    return (
      <PengeluaranDashboardLayout
        title="Dashboard Pengeluaran FOT"
        subtitle="Pantauan real-time tonase dan durasi pengangkutan FOT"
        statTotal={data.statTotal}
        tlsList={data.tlsList}
        chartData={data.chartData}
        kpiData={data.kpiData}
        topProducts={data.topProducts}
        isLoading={isLoading}
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
      pageTitle="Laporan Rekaman FOT"
      pageSubtitle="Daftar log aktivitas ritase pengangkutan FOT"
      summaryData={data.summaryData}
      isSummaryLoading={isLoading}
      isTableLoading={isLoading}
      tableData={paginatedData}
      columns={fotColumns}
      filters={
        <div className="flex flex-col gap-3 w-full">
          {FilterToolbar.inline}
          {FilterToolbar.expanded}
        </div>
      }
      canAdd={true}
      canWrite={true}
      onAdd={() => alert("Tambah Record FOT")}
      onViewDetail={(row) => alert(`Detail: ${row.trainId}`)}
      onEdit={(row) => alert(`Edit: ${row.trainId}`)}
      onDelete={(row) => alert(`Hapus: ${row.trainId}`)}
    />
  );
};

export default PengeluaranFOTManagement;
