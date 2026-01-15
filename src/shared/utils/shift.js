// ✅ SHIFT CONFIGURATION
export const SHIFT_CONFIG = {
  'Shift 1': { start: 22, end: 6, label: 'Shift 1 (22:00-06:00)', crossesMidnight: true },
  'Shift 2': { start: 6, end: 14, label: 'Shift 2 (06:00-14:00)', crossesMidnight: false },
  'Shift 3': { start: 14, end: 22, label: 'Shift 3 (14:00-22:00)', crossesMidnight: false },
};

/**
 * Get current shift based on current time
 * @returns {string} - "Shift 1", "Shift 2", or "Shift 3"
 */
export const getCurrentShift = () => {
  const now = new Date();
  const currentHour = now.getHours();

  // Shift 1: 22:00 - 06:00 (crosses midnight)
  if (currentHour >= 22 || currentHour < 6) {
    return 'Shift 1';
  }
  // Shift 2: 06:00 - 14:00
  else if (currentHour >= 6 && currentHour < 14) {
    return 'Shift 2';
  }
  // Shift 3: 14:00 - 22:00
  else {
    return 'Shift 3';
  }
};

/**
 * Get shift options for dropdown/select
 * @param {boolean} includeAll - Include "All Shifts" option
 * @returns {Array<{value: string, label: string}>}
 */
export const getShiftOptions = (includeAll = false) => {
  const options = [
    { value: 'Shift 1', label: 'Shift 1 (22:00-06:00)' },
    { value: 'Shift 2', label: 'Shift 2 (06:00-14:00)' },
    { value: 'Shift 3', label: 'Shift 3 (14:00-22:00)' },
  ];

  if (includeAll) {
    return [{ value: 'All', label: 'Semua Shift' }, ...options];
  }

  return options;
};

/**
 * Get formatted shift label
 * @param {string} shift - Shift name (e.g., "Shift 1", "All")
 * @returns {string} - Formatted label
 */
export const getShiftLabel = (shift) => {
  if (!shift) return 'Shift tidak diketahui';
  
  if (shift === 'All') {
    return 'Semua Shift';
  }

  const config = SHIFT_CONFIG[shift];
  if (config) {
    return config.label;
  }

  return shift; // fallback to original value
};

/**
 * Check if a given time falls within a specific shift
 * @param {Date|string} time - Time to check
 * @param {string} shiftName - Shift name (e.g., "Shift 1")
 * @returns {boolean}
 */
export const isTimeInShift = (time, shiftName) => {
  const date = time instanceof Date ? time : new Date(time);
  const hour = date.getHours();
  
  const config = SHIFT_CONFIG[shiftName];
  if (!config) return false;

  if (config.crossesMidnight) {
    // For Shift 1: 22:00 - 06:00
    return hour >= config.start || hour < config.end;
  } else {
    // For Shift 2 & 3
    return hour >= config.start && hour < config.end;
  }
};

/**
 * Get shift name from hour
 * @param {number} hour - Hour (0-23)
 * @returns {string}
 */
export const getShiftFromHour = (hour) => {
  if (hour >= 22 || hour < 6) {
    return 'Shift 1';
  } else if (hour >= 6 && hour < 14) {
    return 'Shift 2';
  } else {
    return 'Shift 3';
  }
};

/**
 * Validate shift name
 * @param {string} shift - Shift name
 * @returns {boolean}
 */
export const isValidShift = (shift) => {
  return shift === 'All' || Object.keys(SHIFT_CONFIG).includes(shift);
};

/**
 * Get shift time range as string
 * @param {string} shiftName - Shift name
 * @returns {string} - e.g., "22:00 - 06:00"
 */
export const getShiftTimeRange = (shiftName) => {
  const config = SHIFT_CONFIG[shiftName];
  if (!config) return '-';
  
  const startTime = `${String(config.start).padStart(2, '0')}:00`;
  const endTime = `${String(config.end).padStart(2, '0')}:00`;
  
  return `${startTime} - ${endTime}`;
};

// Export default object with all utilities
export default {
  SHIFT_CONFIG,
  getCurrentShift,
  getShiftOptions,
  getShiftLabel,
  isTimeInShift,
  getShiftFromHour,
  isValidShift,
  getShiftTimeRange,
};