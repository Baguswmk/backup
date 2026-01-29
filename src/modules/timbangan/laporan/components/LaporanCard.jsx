import React, { useState, useEffect } from "react";
import { FileText, FileSpreadsheet, Loader2, File } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { DateRangePicker } from "@/shared/components/DateRangePicker";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { Input } from "@/shared/components/ui/input";
import { getTodayDateRange } from "@/shared/utils/date";
import { getCurrentShift } from "@/shared/utils/shift";

const LaporanCard = ({
  title,
  description,
  icon: Icon,
  iconBgColor = "bg-blue-100 dark:bg-blue-900/30",
  iconColor = "text-blue-600 dark:text-blue-400",
  onDownload,
  isDownloading,
  downloadFormats = [
    {
      value: "pdf",
      label: "PDF",
      icon: FileText,
      color:
        "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
    },
    {
      value: "excel",
      label: "Excel",
      icon: FileSpreadsheet,
      color:
        "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
    },
    {
      value: "csv",
      label: "CSV",
      icon: File,
      color:
        "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
    },
  ],
  dumpTruckOptions = [],
  showSpphFilter = false,
  showDumpTruckFilter = false,
}) => {
  const today = getTodayDateRange();
  const [dateRange, setDateRange] = useState({
    from: today.from,
    to: today.to,
  });

  const [selectedShift, setSelectedShift] = useState("All");
  const [spphFilter, setSpphFilter] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);

  const handleDateRangeChange = (newRange) => {
    setDateRange({
      from: newRange.from || newRange.startDate,
      to: newRange.to || newRange.endDate,
    });
    if (newRange.shift) {
      setSelectedShift(newRange.shift);
    }
  };

  const handleDownloadClick = async (formatValue) => {
    if (onDownload) {
      const params = {
        startDate: dateRange.from,
        endDate: dateRange.to,
        shift: selectedShift,
      };

      if (showSpphFilter && spphFilter.trim()) {
        params.spph = spphFilter.trim();
      }

      if (showDumpTruckFilter && selectedUnit) {
        params.unit_dump_truck = selectedUnit;
      }

      await onDownload(formatValue, params);
    }
  };

  return (
    <Card className="border-none dark:bg-gray-800 dark:border-gray-700 shadow-md">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg dark:text-gray-100">
              {title}
            </CardTitle>
            <CardDescription className="mt-1 dark:text-gray-400">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ✅ Date Range Picker + Shift */}
        <div>
          <Label className="mb-2 text-gray-700 dark:text-gray-300">
            Periode Tanggal & Shift *
          </Label>
          <DateRangePicker
            dateRange={dateRange}
            currentShift={getCurrentShift()}
            viewingShift={selectedShift}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        {/* ✅ SPPH Filter - Hanya muncul untuk laporan SPPH */}
        {showSpphFilter && (
          <div>
            <Label className="mb-2 text-gray-700 dark:text-gray-300">
              Filter SPPH (opsional)
            </Label>
            <Input
              type="text"
              placeholder="Masukkan nomor SPPH..."
              value={spphFilter}
              onChange={(e) => setSpphFilter(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
            />
          </div>
        )}

        {/* ✅ Unit Dump Truck Filter - Hanya muncul untuk laporan Dump Truck */}
        {showDumpTruckFilter && (
          <div>
            <Label className="mb-2 text-gray-700 dark:text-gray-300">
              Filter Unit Dump Truck (opsional)
            </Label>
            <SearchableSelect
              items={dumpTruckOptions}
              value={selectedUnit}
              onChange={setSelectedUnit}
              placeholder="Pilih Unit Dump Truck"
              emptyText="Tidak ada unit tersedia"
              allowClear={true}
            />
          </div>
        )}

        {/* Download Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Download Format
          </p>
          <div className="flex gap-3 flex-wrap">
            {downloadFormats.map((format) => {
              const FormatIcon = format.icon;
              const downloading = isDownloading
                ? isDownloading(format.value)
                : false;

              return (
                <Button
                  key={format.value}
                  onClick={() => handleDownloadClick(format.value)}
                  disabled={downloading}
                  className={`flex-1 min-w-25 ${format.color} text-white dark:text-gray-200 cursor-pointer`}
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <FormatIcon className="w-4 h-4 mr-2" />
                      {format.label}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LaporanCard;