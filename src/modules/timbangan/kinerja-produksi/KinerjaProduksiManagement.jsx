import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, CarFront } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { DateRangePicker } from "@/shared/components/DateRangePicker";

import { useKinerjaProduksi } from "./hooks/useKinerjaProduksi";
import { showToast } from "@/shared/utils/toast";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";

import { KinerjaCompanyCards } from "./components/KinerjaCompanyCards";
import { KinerjaSpphChart } from "./components/KinerjaSpphChart";
import { KinerjaRakorChart } from "./components/KinerjaRakorChart";
import { KinerjaMonthlyTrend } from "./components/KinerjaMonthlyTrend";
import { Input } from "@/shared/components/ui/input";

export default function KinerjaProduksiManagement() {
  const user = useAuthStore((state) => state.user);
  const { masters } = useFleet(user ? { user } : null, null);

  const { data, loading, error, fetchKinerja } = useKinerjaProduksi();

  // Filter State
  const [dateRange, setDateRange] = useState(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return { from: today, to: today };
  });
  const [mode, setMode] = useState("mtd"); // "daily" | "mtd"
  const [includeHousekeeping, setIncludeHousekeeping] = useState(true);
  const [picWorkUnit, setPicWorkUnit] = useState("");

  const workUnitOptions =
    masters?.workUnits
      ?.filter((w) => w.subsatker)
      ?.map((w) => ({
        value: w.subsatker,
        label: w.subsatker,
      })) || [];

  useEffect(() => {
    if (error) {
      showToast.error(`Gagal memuat data kinerja: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    // Re-fetch whenever filters change
    const fromDateObj = new Date(dateRange.from);
    const params = {
      date: dateRange.from,
      mode,
      year: fromDateObj.getFullYear(),
      month: fromDateObj.getMonth() + 1,
      include_housekeeping: includeHousekeeping,
    };
    if (picWorkUnit) {
      params.pic_work_unit = picWorkUnit;
    }
    fetchKinerja(params);
  }, [dateRange.from, mode, includeHousekeeping, picWorkUnit, fetchKinerja]);

  return (
    <div className="space-y-4">
      {/* 1. Header / Top Navigation Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#3d7ca9] dark:bg-slate-800 p-4 rounded-xl shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
            {/* Icon Ekscavator Placeholder */}
            <CarFront />
          </div>
          <h1 className="text-2xl font-bold tracking-wide drop-shadow-md">
            Kinerja Produksi {picWorkUnit ? ` - ${picWorkUnit}` : ""}
          </h1>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-1.5 rounded-lg backdrop-blur-sm">
          {/* Mode Toggle */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-md overflow-hidden text-sm font-medium  p-1 gap-1">
            <Button
              onClick={() => setMode("daily")}
              className={cn(
                "px-4 py-1.5 rounded-sm transition-all focus:outline-none flex items-center gap-2",
                mode === "daily"
                  ? "bg-[#3d7ca9] dark:bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-700 dark:text-neutral-50",
              )}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  mode === "daily" ? "bg-white" : "bg-transparent",
                )}
              />
              Daily
            </Button>
            <Button
              onClick={() => setMode("mtd")}
              className={cn(
                "px-4 py-1.5 rounded-sm transition-all focus:outline-none flex items-center gap-2",
                mode === "mtd"
                  ? "bg-[#3d7ca9] dark:bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-700 dark:text-neutral-50",
              )}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  mode === "mtd" ? "bg-white" : "bg-transparent",
                )}
              />
              Monthly
            </Button>
          </div>

          {/* Date Picker */}
          <div className="w-[260px] bg-white rounded-md shadow-sm h-[38px] flex items-center justify-center overflow-hidden [&>div]:w-full [&_button]:border-0 [&_button]:h-[38px] [&_button]:rounded-none">
            <DateRangePicker 
              dateRange={dateRange}
              onDateRangeChange={(payload) => {
                 setDateRange({ from: payload.startDate, to: payload.endDate });
              }}
              mode="singleDay"
              hideShift={true}
            />
          </div>
        </div>
      </div>

      {/* 2. Filters Section (Housekeeping & PIC Work Unit) */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm px-4">
        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-lg">
          <Input
            type="checkbox"
            checked={includeHousekeeping}
            onChange={(e) => setIncludeHousekeeping(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded rounded shadow-sm focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Housekeeping
          </span>
        </label>

        <div className="w-[300px]">
          <SearchableSelect
            items={workUnitOptions}
            value={picWorkUnit}
            onChange={setPicWorkUnit}
            placeholder="Filter PIC Work Unit (Semua)"
            isClearable={true}
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-blue-600 ml-auto">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Refreshing...</span>
          </div>
        )}
      </div>

      {/* 3. Company Cards Section */}
      <KinerjaCompanyCards data={data?.company_cards} loading={loading} />

      {/* 4. Middle Charts (Statistik SPPH & Statistik Rakor) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KinerjaSpphChart
          data={data?.spph_chart}
          loading={loading}
          title={`Statistik SPPH s/d ${format(new Date(dateRange.from), "dd MMMM yyyy")}`}
        />
        <KinerjaRakorChart
          data={data?.rakor_chart}
          loading={loading}
          title={`Statistik Rakor s/d ${format(new Date(dateRange.from), "dd MMMM yyyy")}`}
        />
      </div>

      {/* 5. Bottom Trend Charts (Monthly SPPH & Monthly Rakor) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KinerjaMonthlyTrend
          data={data?.monthly_spph}
          loading={loading}
          title={`Statistik ${new Date(dateRange.from).getFullYear()} by SPPH`}
          colorTheme="blue"
        />
        <KinerjaMonthlyTrend
          data={data?.monthly_rakor}
          loading={loading}
          title={`Statistik ${new Date(dateRange.from).getFullYear()} by Rakor`}
          colorTheme="orange"
        />
      </div>
    </div>
  );
}
