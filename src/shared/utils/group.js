// === CONFIGURATION ===
const SHIFTS = ["Shift 2", "Shift 3", "Shift 1", "Off"];
const ROTATION_INTERVAL = 2; // hari
const START_DATE = new Date(2024, 5, 1); // 1 Juni 2024

// === HELPER FUNCTIONS ===

/**
 * Hitung shift untuk tanggal tertentu dan offset grup
 * @param {number} groupInitialShiftIndex - Index awal grup (A:2, B:3, C:0, D:1)
 * @param {Date} targetDate - Tanggal target
 * @returns {string} Nama shift
 */
const getShiftForDate = (groupInitialShiftIndex, targetDate) => {
  const diffTime = targetDate.getTime() - START_DATE.getTime();
  const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const shiftRotation = Math.floor(daysSinceStart / ROTATION_INTERVAL) % SHIFTS.length;
  
  let index = (groupInitialShiftIndex + shiftRotation) % SHIFTS.length;
  if (index < 0) index = SHIFTS.length + index;
  
  return SHIFTS[index];
};

/**
 * Tentukan nama shift berdasarkan jam
 * @param {number} hours - Jam (0-23)
 * @returns {string} Nama shift
 */
export const getCurrentShiftName = (hours) => {
  if (hours >= 22 || hours < 6) {
    return "Shift 1"; // 22:00 - 06:00
  } else if (hours >= 6 && hours < 14) {
    return "Shift 2"; // 06:00 - 14:00
  } else {
    return "Shift 3"; // 14:00 - 22:00
  }
};

/**
 * Cari group yang sedang aktif berdasarkan shift dan tanggal
 * @param {string} currentShift - Nama shift saat ini
 * @param {Date} targetDate - Tanggal target
 * @returns {string} Group aktif (A, B, C, D, atau -)
 */
export const getActiveGroup = (currentShift, targetDate) => {
  const shiftA = getShiftForDate(2, targetDate);
  const shiftB = getShiftForDate(3, targetDate);
  const shiftC = getShiftForDate(0, targetDate);
  const shiftD = getShiftForDate(1, targetDate);

  if (currentShift === shiftA) return "A";
  if (currentShift === shiftB) return "B";
  if (currentShift === shiftC) return "C";
  if (currentShift === shiftD) return "D";

  return "-";
};

/**
 * Calculate current shift dan active group
 * @param {Date} currentDate - Tanggal/waktu saat ini (optional, default: new Date())
 * @returns {Object} { currentShift, activeGroup, calculationDate }
 */
export const calculateCurrentShiftAndGroup = (currentDate = new Date()) => {
  const hours = currentDate.getHours();
  let calculationDate = new Date(currentDate);
  
  // LOGIC KHUSUS: Jam 00:00 - 06:00 dianggap bagian dari hari sebelumnya (Shift 1)
  if (hours >= 0 && hours < 6) {
    calculationDate.setDate(calculationDate.getDate() - 1);
  }

  const currentShift = getCurrentShiftName(hours);
  const activeGroup = getActiveGroup(currentShift, calculationDate);

  return {
    currentShift,
    activeGroup,
    calculationDate,
  };
};

/**
 * Get shift info untuk tanggal tertentu (untuk preview/planning)
 * @param {Date} targetDate - Tanggal target
 * @returns {Object} { shiftA, shiftB, shiftC, shiftD }
 */
export const getShiftScheduleForDate = (targetDate) => {
  return {
    shiftA: getShiftForDate(2, targetDate),
    shiftB: getShiftForDate(3, targetDate),
    shiftC: getShiftForDate(0, targetDate),
    shiftD: getShiftForDate(1, targetDate),
  };
};

/**
 * Check apakah sebuah group sedang aktif pada waktu tertentu
 * @param {string} groupName - Nama group (A, B, C, D)
 * @param {Date} currentDate - Tanggal/waktu (optional, default: new Date())
 * @returns {boolean} True jika group aktif
 */
export const isGroupActive = (groupName, currentDate = new Date()) => {
  const { activeGroup } = calculateCurrentShiftAndGroup(currentDate);
  return activeGroup === groupName.toUpperCase();
};

/**
 * Get shift time range info
 * @param {string} shiftName - Nama shift (Shift 1, Shift 2, Shift 3)
 * @returns {Object} { start, end, description }
 */
export const getShiftTimeRange = (shiftName) => {
  const ranges = {
    "Shift 1": { start: "22:00", end: "06:00", description: "Malam" },
    "Shift 2": { start: "06:00", end: "14:00", description: "Pagi" },
    "Shift 3": { start: "14:00", end: "22:00", description: "Sore" },
  };
  
  return ranges[shiftName] || { start: "-", end: "-", description: "-" };
};

// Default export untuk kemudahan import
export default {
  calculateCurrentShiftAndGroup,
  getCurrentShiftName,
  getActiveGroup,
  getShiftScheduleForDate,
  isGroupActive,
  getShiftTimeRange,
};