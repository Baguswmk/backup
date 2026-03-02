import React, { useState, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/lib/utils";
import { showToast } from "@/shared/utils/toast";
import {
  getTodayDateRange,
  validateDateRange,
  formatDate,
} from "@/shared/utils/date";
import {
  getCurrentShift,
  getShiftOptions,
  getShiftLabel,
} from "@/shared/utils/shift";

export const DateRangePicker = ({
  dateRange = {},
  currentShift,
  viewingShift,
  isLoading = false,
  onDateRangeChange,
}) => {
  const shiftOptions = getShiftOptions(true);

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

  const [shift, setShift] = useState(() => {
    return viewingShift || currentShift || getCurrentShift();
  });

  const [isOpen, setIsOpen] = useState(false);

  const shiftRef = useRef(shift);
  const selectRef = useRef(null);

  useEffect(() => {
    shiftRef.current = shift;
  }, [shift]);

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      setDate({
        from: new Date(dateRange.from),
        to: new Date(dateRange.to),
      });
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (isOpen && viewingShift) {
      setShift(viewingShift);
    }
  }, [isOpen]);

  const handleSelect = useCallback((selectedRange) => {
    setDate(selectedRange);
  }, []);

  const handleShiftChange = useCallback(
    (value) => {
      setShift(value);
      shiftRef.current = value;
    },
    [shift],
  );

  const handleApply = useCallback(() => {
    const finalShift = shiftRef.current;

    if (!date?.from) {
      showToast.error("Silakan pilih tanggal mulai");
      return;
    }

    if (!date?.to) {
      showToast.error("Silakan pilih tanggal akhir");
      return;
    }

    const startDate = format(date.from, "yyyy-MM-dd");
    const endDate = format(date.to, "yyyy-MM-dd");

    const validation = validateDateRange({ from: startDate, to: endDate });
    if (!validation.valid) {
      showToast.error(validation.error);
      return;
    }

    const payload = {
      startDate,
      endDate,
      shift: finalShift,
      from: startDate,
      to: endDate,
    };

    onDateRangeChange(payload);
    setIsOpen(false);
  }, [date, onDateRangeChange, setIsOpen]);

  const handleReset = useCallback(() => {
    const today = getTodayDateRange();
    const resetShift = currentShift || getCurrentShift();

    setDate({
      from: new Date(today.from),
      to: new Date(today.to),
    });
    setShift(resetShift);
    shiftRef.current = resetShift;
  }, [currentShift]);

  const currentYear = new Date().getFullYear();
  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.getFullYear() === currentYear
      ? format(dt, "dd MMM", { locale: id })
      : format(dt, "dd/MM/yy", { locale: id });
  };
  const shiftShort = getShiftLabel(shift)?.replace("Shift ", "S") || shift;
  const displayText = date?.from
    ? date.to
      ? `${fmtDate(date.from)}–${fmtDate(date.to)} | ${shiftShort}`
      : `${fmtDate(date.from)} | ${shiftShort}`
    : "Pilih tanggal & shift";

  return (
    <div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-left font-normal cursor-pointer hover:bg-gray-200 truncate",
              "dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700",
              !date && "text-muted-foreground dark:text-gray-500",
            )}
            disabled={isLoading}
          >
            <CalendarIcon className="mr-1 h-3 w-3 shrink-0" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-neutral-50 border-none dark:bg-gray-800 dark:border-gray-700"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="max-h-[min(85vh,600px)] overflow-y-auto overflow-x-hidden">
            <div className="p-3 sticky top-0 bg-neutral-50 dark:bg-gray-800 dark:border-gray-700 z-10">
              <p className="text-sm font-medium dark:text-gray-200">
                Filter Tanggal & Shift
              </p>
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

            <div className="p-3 bg-neutral-50 dark:bg-gray-800 dark:border-gray-700 sticky bottom-0">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block dark:text-gray-200">
                    Pilih Shift: {shift}
                  </label>

                  {/* ✅ Native select as fallback for debugging */}
                  <select
                    ref={selectRef}
                    value={shift}
                    onChange={(e) => handleShiftChange(e.target.value)}
                    disabled={isLoading}
                    className="w-full p-2 border rounded cursor-pointer dark:bg-gray-700 dark:text-gray-200"
                  >
                    {shiftOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
