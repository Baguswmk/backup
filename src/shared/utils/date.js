import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const getTodayDateRange = () => {
  const today = new Date();
  return {
    from: format(today, "yyyy-MM-dd"),
    to: format(today, "yyyy-MM-dd"),
  };
};

export const isDateRangeToday = (dateRange) => {
  if (!dateRange?.from || !dateRange?.to) return false;
  const today = format(new Date(), "yyyy-MM-dd");
  return dateRange.from === today && dateRange.to === today;
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
  getTodayDateRange,
  isDateRangeToday,
  formatDate,
  formatDateTime,
  parseDate,
  compareDates,
  validateDateRange,
};
