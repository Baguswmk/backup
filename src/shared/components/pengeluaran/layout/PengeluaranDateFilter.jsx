import React from "react";
import { cn } from "@/lib/utils";
import { Calendar, CalendarRange, Filter } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { DateRangePicker } from "@/shared/components/DateRangePicker";
import { Button } from "../../ui/button";

/**
 * Polished Date Filter component for Pengeluaran modules.
 * Supports switching between "Month" and "Date Range" modes.
 *
 * onApply (optional): called when user confirms the filter.
 *   - Month mode: called when user clicks the "Terapkan" button.
 *   - Range mode: called after DateRangePicker fires onDateRangeChange
 *     (DateRangePicker already has its own Terapkan button — no extra button needed).
 */
export const PengeluaranDateFilter = ({
  filterMode = "month", // "month" | "range"
  onModeChange,
  month = "",
  startDate = "",
  endDate = "",
  onUpdateFilter, // (key, value) => void
  onApply,        // () => void  — optional, for "draft+apply" pattern
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap sm:flex-nowrap", className)}>
      {/* Mode Toggle (Segmented Control) */}
      <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 h-9 items-center">
        <Button
          onClick={() => onModeChange("month")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
            filterMode === "month"
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Bulanan
        </Button>
        <Button
          onClick={() => onModeChange("range")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
            filterMode === "range"
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <CalendarRange className="w-3.5 h-3.5" />
          Harian
        </Button>
      </div>

      <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

      {/* Actual Inputs */}
      <div className="flex items-center gap-2">
        {filterMode === "month" ? (
          <>
            <div className="relative group">
              <Input
                type="month"
                className={cn(
                  "h-9 px-3 dark:text-neutral-50 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
                  "focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[140px]"
                )}
                value={month}
                onChange={(e) => onUpdateFilter("month", e.target.value)}
              />
            </div>
            {/* Terapkan button — needed for modules with draft+apply pattern */}
            {onApply && (
              <Button
                size="sm"
                onClick={onApply}
                className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                Terapkan
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <DateRangePicker
              mode="range"
              dateRange={{ from: startDate, to: endDate }}
              onDateRangeChange={(payload) => {
                onUpdateFilter("startDate", payload.startDate);
                onUpdateFilter("endDate", payload.endDate);
                if (payload.shift) {
                  onUpdateFilter("shift", payload.shift !== "All" ? payload.shift : "");
                }
                // DateRangePicker already has its own Terapkan button,
                // so we just need to commit the draft to applied here.
                onApply?.();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};


