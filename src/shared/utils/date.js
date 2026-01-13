import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/**
 * Get today's date range in yyyy-MM-dd format
 * @returns {{from: string, to: string}}
 */
export const getTodayDateRange = () => {
  const today = new Date();
  return {
    from: format(today, "yyyy-MM-dd"),
    to: format(today, "yyyy-MM-dd"),
  };
};

/**
 * Check if date range is today
 * @param {{from: string, to: string}} dateRange
 * @returns {boolean}
 */
export const isDateRangeToday = (dateRange) => {
  if (!dateRange?.from || !dateRange?.to) return false;
  const today = format(new Date(), "yyyy-MM-dd");
  return dateRange.from === today && dateRange.to === today;
};

/**
 * Format date with custom pattern
 * @param {string|Date} date
 * @param {string} pattern - Default: "dd MMM yyyy"
 * @returns {string}
 */
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
/**
 * Format date with time
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateTime = (date) => {
  return formatDate(date, "dd MMM yyyy HH:mm");
};

/**
 * Parse date string to Date object
 * @param {string} dateStr
 * @returns {Date|null}
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr);
  } catch (error) {
    console.error("Failed to parse date:", dateStr);
    return null;
  }
};

/**
 * Compare two dates (ignores time)
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {number} -1, 0, or 1
 */
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

/**
 * Validate date range
 * @param {{from: string, to: string}} dateRange
 * @returns {{valid: boolean, error?: string}}
 */
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

// Export default object with all utilities
export default {
  getTodayDateRange,
  isDateRangeToday,
  formatDate,
  formatDateTime,
  parseDate,
  compareDates,
  validateDateRange,
};