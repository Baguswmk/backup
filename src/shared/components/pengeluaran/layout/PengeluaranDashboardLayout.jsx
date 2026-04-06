import React from "react";
import PengeluaranPageLayout from "./PengeluaranPageLayout";
import { TlsCardsRow } from "../dashboard/TlsCardsRow";
import { TrendChartPanel } from "../dashboard/TrendChartPanel";
import { KpiRow } from "../dashboard/KpiRow";
import { TopProductPanel } from "../dashboard/TopProductPanel";

export const PengeluaranDashboardLayout = ({
  title,
  subtitle,
  statTotal = {},
  tlsList = [],
  chartData = [],
  kpiData = {},
  topProducts = [],
  isLoading = false,
  filters,
  extraHeaderComponents,
}) => {
  return (
    <div className="flex flex-col space-y-4 md:space-y-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between px-1">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {subtitle}
          </p>
        </div>
        {extraHeaderComponents && <div>{extraHeaderComponents}</div>}
      </div>



      {/* Filters Toolbar */}
      {filters && (
        <div className="flex flex-col space-y-3 p-3 md:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm mx-1">
          {filters}
        </div>
      )}

      {/* Main Content */}
      <div className={`transition-opacity duration-300 mx-1 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="xl:col-span-3 flex flex-col space-y-4">
            <TlsCardsRow statTotal={statTotal} tlsList={tlsList} />
            <TrendChartPanel chartData={chartData} />
            <KpiRow {...kpiData} />
          </div>
          <div className="xl:col-span-1">
            <TopProductPanel topProducts={topProducts} />
          </div>
        </div>
      </div>
    </div>
  );
};
