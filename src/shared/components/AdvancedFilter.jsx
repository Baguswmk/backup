import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";

const AdvancedFilter = ({
  isExpanded = false,
  dateRange = (() => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    return { from: iso, to: iso };
  })(),
  onDateRangeChange,
  filterGroups = [],
  isLoading = false,
  hasActiveFilters = false,
  onResetFilters,
  className = "",
}) => {
  return (
    <div className={cn("space-y-4 transition-all duration-200", className)}>
      {/* Advanced Filters Panel */}
      {isExpanded && (
        <div className={cn(
          "rounded-lg p-4 space-y-4 shadow-sm transition-all duration-200",
          "bg-gray-50 dark:bg-slate-800/50",
          "border-gray-200 dark:border-slate-700"
        )}>
          {/* Date Range Filter */}
          {onDateRangeChange && (
            <div>
              <p className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Rentang Tanggal
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    Dari
                  </label>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) =>
                      onDateRangeChange({ ...dateRange, from: e.target.value })
                    }
                    disabled={isLoading}
                    className={cn(
                      "mt-1 transition-colors duration-200",
                      "dark:bg-slate-900 dark:border-slate-600",
                      "dark:text-white"
                    )}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    Sampai
                  </label>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) =>
                      onDateRangeChange({ ...dateRange, to: e.target.value })
                    }
                    disabled={isLoading}
                    className={cn(
                      "mt-1 transition-colors duration-200",
                      "dark:bg-slate-900 dark:border-slate-600",
                      "dark:text-white"
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Multi-Select Filters */}
          {filterGroups.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3 text-gray-900 dark:text-white">
                Filter Tambahan
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filterGroups.map((group) => (
                  <div key={group.id}>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                      {group.label}
                    </label>
                    <MultiSearchableSelect
                      items={group.options || []}
                      values={group.value || []}
                      onChange={group.onChange}
                      placeholder={group.placeholder || `Pilih ${group.label}`}
                      disabled={isLoading || group.disabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className={cn(
              "flex justify-end pt-2 border-t transition-colors duration-200",
              "border-gray-200 dark:border-slate-700"
            )}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className={cn(
                  "gap-2 cursor-pointer transition-all duration-200",
                  "hover:bg-red-50 dark:hover:bg-red-900/20",
                  "hover:text-red-600 dark:hover:text-red-400",
                  "hover:border-red-300 dark:hover:border-red-800",
                  "dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                )}
              >
                <X className="w-4 h-4" />
                Reset Semua Filter
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;
