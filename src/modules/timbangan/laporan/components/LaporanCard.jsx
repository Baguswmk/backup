/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { DateRangePicker } from '@/shared/components/DateRangePicker';
import { getTodayDateRange } from '@/shared/utils/date';

const LaporanCard = ({
  title,
  description,
  icon: Icon,
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/30',
  iconColor = 'text-blue-600 dark:text-blue-400',
  onDownload,
  isDownloading,
  downloadFormats = [
    { value: 'pdf', label: 'PDF', icon: FileText, color: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800' },
  ],
}) => {
  const [dateRange, setDateRange] = useState(getTodayDateRange());

  const handleDateChange = (newDateRange) => {
    setDateRange({
      from: newDateRange.startDate,
      to: newDateRange.endDate,
      shift: newDateRange.shift,
      startDate: newDateRange.startDate,
      endDate: newDateRange.endDate,
    });
  };

  const handleDownloadClick = async (format) => {
    if (onDownload) {
      await onDownload(format, {
        startDate: dateRange.startDate || dateRange.from,
        endDate: dateRange.endDate || dateRange.to,
        shift: dateRange.shift || 'All',
      });
    }
  };

  return (
    <Card className="border-none dark:bg-gray-800 dark:border-gray-700 shadow-md ">
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
        {/* Date Range Picker */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Pilih Periode
          </label>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={handleDateChange}
          />
        </div>

        {/* Download Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Download Format
          </p>
          <div className="flex gap-3">
            {downloadFormats.map((format) => {
              const FormatIcon = format.icon;
              const downloading = isDownloading ? isDownloading(format.value) : false;

              return (
                <Button
                  key={format.value}
                  onClick={() => handleDownloadClick(format.value)}
                  disabled={downloading}
                  className={`flex-1 ${format.color} text-white dark:text-gray-200 cursor-pointer`}
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