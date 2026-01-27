import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const getWorkShiftInfo = () => {
  const now = new Date();
  const currentHour = now.getHours();
  let workDate = new Date(now);
  let shift;
  
  if (currentHour >= 22 || currentHour < 6) {
    // SHIFT 1: 22:00 - 06:00
    shift = "Shift 1";
    // Kalau jam >= 22, berarti sudah mulai shift malam
    // dan tanggal kerja dihitung hari baru (besok)
    if (currentHour >= 22) {
      workDate.setDate(workDate.getDate() + 1);
    }
  } else if (currentHour >= 6 && currentHour < 14) {
    // SHIFT 2: 06:00 - 14:00
    shift = "Shift 2";
  } else {
    // SHIFT 3: 14:00 - 22:00
    shift = "Shift 3";
  }
  
  // Format tanggal ke 'YYYY-MM-DD'
  const formattedDate = format(workDate, "yyyy-MM-dd");
  
  return {
    date: formattedDate,
    shift: shift,
  };
};

export const getTodayDateRange = () => {
  const workShiftInfo = getWorkShiftInfo();
  return {
    from: workShiftInfo.date,
    to: workShiftInfo.date,
  };
};

export const getCurrentShift = () => {
  const workShiftInfo = getWorkShiftInfo();
  return workShiftInfo.shift;
};

export const isDateRangeToday = (dateRange) => {
  if (!dateRange?.from || !dateRange?.to) return false;
  const workShiftInfo = getWorkShiftInfo();
  return dateRange.from === workShiftInfo.date && dateRange.to === workShiftInfo.date;
};

export const getShiftTimeRange = (shiftName) => {
  const shifts = {
    "Shift 1": { start: "22:00", end: "06:00" },
    "Shift 2": { start: "06:00", end: "14:00" },
    "Shift 3": { start: "14:00", end: "22:00" },
  };
  return shifts[shiftName] || null;
};

export const formatDate = (date, pattern = "dd MMM yyyy") => {
  if (!date) return "-";
  try {
    return format(new Date(date), pattern, { locale: idLocale });
  } catch (error) {
    console.error("Invalid date:", date);
    return "-";
  }
};

export const formatTime = (dateString) => {
  return formatDate(dateString, "HH:mm:ss");
};

export const formatDateTime = (date) => {
  return formatDate(date, "dd MMM yyyy HH:mm");
};

export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr);
  } catch (error) {
    console.error("Failed to parse date:", dateStr);
    return null;
  }
};

export const compareDates = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);

  if (!d1 || !d2) return 0;

  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};

export const validateDateRange = (dateRange) => {
  if (!dateRange?.from || !dateRange?.to) {
    return { valid: false, error: "Date range is required" };
  }

  const from = parseDate(dateRange.from);
  const to = parseDate(dateRange.to);

  if (!from || !to) {
    return { valid: false, error: "Invalid date format" };
  }

  if (from > to) {
    return { valid: false, error: "Start date must be before end date" };
  }

  return { valid: true };
};

export default {
  getWorkShiftInfo,
  getTodayDateRange,
  getCurrentShift,
  isDateRangeToday,
  getShiftTimeRange,
  formatDate,
  formatDateTime,
  formatTime,
  parseDate,
  compareDates,
  validateDateRange,
};