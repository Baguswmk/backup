import React, { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/lib/utils';
import { showToast } from '@/shared/utils/toast';
import { getTodayDateRange, validateDateRange, formatDate } from '@/shared/utils/date'; // ✅ ADDED

export const DateRangePicker = ({
  dateRange = {},
  isLoading = false,
  onDateRangeChange,
  shiftOptions = [
    { value: 'All', label: 'Semua Shift' },
    { value: 'Shift 1', label: 'Shift 1' },
    { value: 'Shift 2', label: 'Shift 2' },
    { value: 'Shift 3', label: 'Shift 3' },
  ],
}) => {
  // ✅ IMPROVED - Use getTodayDateRange utility
  const [date, setDate] = useState(() => {
    if (dateRange.from && dateRange.to) {
      return {
        from: new Date(dateRange.from),
        to: new Date(dateRange.to),
      };
    }
    const today = getTodayDateRange();
    return {
      from: new Date(today.from),
      to: new Date(today.to),
    };
  });

  const [shift, setShift] = useState(dateRange.shift || 'All');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      setDate({
        from: new Date(dateRange.from),
        to: new Date(dateRange.to),
      });
    }
  }, [dateRange.from, dateRange.to]);

  const handleSelect = useCallback((selectedRange) => {
    setDate(selectedRange);
  }, []);

  const handleShiftChange = useCallback((value) => {
    setShift(value);
  }, []);

  const handleApply = useCallback(() => {
    if (!date?.from) {
      showToast.error('Silakan pilih tanggal mulai');
      return;
    }

    if (!date?.to) {
      showToast.error('Silakan pilih tanggal akhir');
      return;
    }

    // ✅ ADDED - Validate date range
    const startDate = format(date.from, 'yyyy-MM-dd');
    const endDate = format(date.to, 'yyyy-MM-dd');
    
    const validation = validateDateRange({ from: startDate, to: endDate });
    if (!validation.valid) {
      showToast.error(validation.error);
      return;
    }

    onDateRangeChange({
      startDate,
      endDate,
      shift,
      from: startDate,
      to: endDate,
    });

    setIsOpen(false);
  }, [date, shift, onDateRangeChange]);

  // ✅ IMPROVED - Use getTodayDateRange utility
  const handleReset = useCallback(() => {
    const today = getTodayDateRange();
    setDate({ 
      from: new Date(today.from), 
      to: new Date(today.to) 
    });
    setShift('All');
  }, []);

  // ✅ IMPROVED - Use formatDate utility
  const displayText = date?.from
    ? date.to
      ? `${formatDate(date.from, 'dd MMM yyyy')} - ${formatDate(date.to, 'dd MMM yyyy')} | ${shift === 'All' ? 'Semua Shift' : shift}`
      : `${formatDate(date.from, 'dd MMM yyyy')} | ${shift === 'All' ? 'Semua Shift' : shift}`
    : 'Pilih tanggal & shift';

  return (
    <div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-left font-normal cursor-pointer hover:bg-gray-200 truncate',
              'dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700',
              !date && 'text-muted-foreground dark:text-gray-500'
            )}
            disabled={isLoading}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-white border-none dark:bg-gray-800 dark:border-gray-700" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="max-h-[min(85vh,600px)] overflow-y-auto overflow-x-hidden">
            <div className="p-3 sticky top-0 bg-white dark:bg-gray-800 dark:border-gray-700 z-10">
              <p className="text-sm font-medium dark:text-gray-200">Filter Tanggal & Shift</p>
            </div>

            <div className="p-3 dark:bg-gray-800">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={1}
                locale={id}
                disabled={isLoading}
                className="w-full dark:text-gray-200"
              />
            </div>

            <div className="p-3 bg-white dark:bg-gray-800 dark:border-gray-700 sticky bottom-0">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block dark:text-gray-200">
                    Pilih Shift
                  </label>
                  <Select value={shift} onValueChange={handleShiftChange} disabled={isLoading}>
                    <SelectTrigger className="w-full border-none cursor-pointer dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                      <SelectValue placeholder="Pilih Shift" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700 cursor-pointer bg-white border-none">
                      {shiftOptions.map((opt) => (
                        <SelectItem 
                          key={opt.value} 
                          value={opt.value}
                          className="cursor-pointer hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleReset}
                    variant="ghost"
                    className="flex-1 cursor-pointer hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    disabled={!date?.from || !date?.to}
                    className="flex-1 cursor-pointer hover:bg-gray-200 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-200"
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Terapkan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};