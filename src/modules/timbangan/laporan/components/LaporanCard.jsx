import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Loader2, File, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

/**
 * ✅ UPDATED - Single Date Picker + Shift Selector
 * Disesuaikan dengan backend: date, shift, format
 */
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
    { value: 'csv', label: 'CSV', icon: File, color: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800' },
  ],
}) => {
  // ✅ State untuk single date dan shift
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShift, setSelectedShift] = useState('All');

  const handleDownloadClick = async (formatValue) => {
    if (onDownload) {
      await onDownload(formatValue, {
        date: selectedDate,
        shift: selectedShift,
      });
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
        {/* ✅ Single Date Picker */}
        <div>
          <Label
            htmlFor="date"
            className="mb-2 text-gray-700 dark:text-gray-300"
          >
            Tanggal *
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-left font-normal bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors text-gray-900 dark:text-gray-100"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                {selectedDate
                  ? format(new Date(selectedDate), "dd MMMM yyyy", {
                      locale: localeId,
                    })
                  : "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-xl"
              align="start"
            >
              <Calendar
                mode="single"
                selected={selectedDate ? new Date(selectedDate) : undefined}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(format(date, "yyyy-MM-dd"));
                  }
                }}
                locale={localeId}
                initialFocus
                className="dark:text-gray-100"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* ✅ Shift Selector */}
        <div>
          <Label className="mb-2 text-gray-700 dark:text-gray-300">
            Shift *
          </Label>
          <Select value={selectedShift} onValueChange={setSelectedShift}>
            <SelectTrigger className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors">
              <SelectValue placeholder="Pilih Shift" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <SelectItem value="All">Semua Shift</SelectItem>
              <SelectItem value="Shift 1">Shift 1</SelectItem>
              <SelectItem value="Shift 2">Shift 2</SelectItem>
              <SelectItem value="Shift 3">Shift 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Download Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Download Format
          </p>
          <div className="flex gap-3 flex-wrap">
            {downloadFormats.map((format) => {
              const FormatIcon = format.icon;
              const downloading = isDownloading ? isDownloading(format.value) : false;

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