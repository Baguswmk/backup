import { dashboardStore } from "@/modules/timbangan/dashboard/store/dashboardStore";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Calendar, X, Filter } from "lucide-react";

const DashboardFilters = () => {
  const { filters, setFilter, setFilters, resetFilters } = dashboardStore();

  const datePresets = [
    { label: "Hari Ini", days: 0 },
    { label: "7 Hari Terakhir", days: 7 },
    { label: "30 Hari Terakhir", days: 30 },
    { label: "90 Hari Terakhir", days: 90 },
  ];

  const handleDatePreset = (days) => {
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];

    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() - days);
    const startDate = startDateObj.toISOString().split("T")[0];

    setFilters({
      startDate: days === 0 ? endDate : startDate,
      endDate,
    });
  };

  const handleReset = () => {
    resetFilters();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filter Dashboard</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <X className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-sm font-medium">
            Tanggal Mulai
          </Label>
          <Input
            id="startDate"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilter("startDate", e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-sm font-medium">
            Tanggal Akhir
          </Label>
          <Input
            id="endDate"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilter("endDate", e.target.value)}
            className="w-full"
          />
        </div>

        {/* Shift Filter */}
        <div className="space-y-2">
          <Label htmlFor="shift" className="text-sm font-medium">
            Shift
          </Label>
          <Select
            value={filters.shift}
            onValueChange={(value) => setFilter("shift", value)}
          >
            <SelectTrigger id="shift">
              <SelectValue placeholder="Pilih Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Semua Shift</SelectItem>
              <SelectItem value="Shift 1">Shift 1 (06:00-14:00)</SelectItem>
              <SelectItem value="Shift 2">Shift 2 (14:00-22:00)</SelectItem>
              <SelectItem value="Shift 3">Shift 3 (22:00-06:00)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Location Dimension */}
        <div className="space-y-2">
          <Label htmlFor="dim" className="text-sm font-medium">
            Lokasi
          </Label>
          <Select
            value={filters.dim}
            onValueChange={(value) => setFilter("dim", value)}
          >
            <SelectTrigger id="dim">
              <SelectValue placeholder="Pilih Dimensi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="loading">Loading Point</SelectItem>
              <SelectItem value="dumping">Dumping Point</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="mt-4 pt-4 border-t">
        <Label className="text-sm font-medium mb-2 block">
          <Calendar className="h-4 w-4 inline mr-1" />
          Quick Select
        </Label>
        <div className="flex flex-wrap gap-2">
          {datePresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handleDatePreset(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Filters (Collapsed by default) */}
      <details className="mt-4 pt-4 border-t">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
          Advanced Filters
        </summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Leaderboard Type */}
          <div className="space-y-2">
            <Label htmlFor="by" className="text-sm font-medium">
              Leaderboard By
            </Label>
            <Select
              value={filters.by}
              onValueChange={(value) => setFilter("by", value)}
            >
              <SelectTrigger id="by">
                <SelectValue placeholder="Pilih Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dumptruck">Dump Truck</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limit */}
          <div className="space-y-2">
            <Label htmlFor="limit" className="text-sm font-medium">
              Limit Result
            </Label>
            <Select
              value={String(filters.limit)}
              onValueChange={(value) => setFilter("limit", parseInt(value))}
            >
              <SelectTrigger id="limit">
                <SelectValue placeholder="Pilih Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </details>

      {/* Filter Summary */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-600">
        <span className="font-medium">Active Filters:</span> {filters.startDate}{" "}
        - {filters.endDate} • {filters.shift} •
        {filters.dim === "loading" ? " Loading Point" : " Dumping Point"}
      </div>
    </Card>
  );
};

export default DashboardFilters;
