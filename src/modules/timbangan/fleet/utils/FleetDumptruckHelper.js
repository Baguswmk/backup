
/**
 * Membuat index/map dari semua DT yang sudah digunakan
 * @param {Array} fleetConfigs - Array of fleet configurations
 * @returns {Object} Map dengan key: dumptruckId, value: fleetId yang menggunakan
 */
export const createUsedDumptrucksMap = (fleetConfigs = []) => {
  const usedDumptrucksMap = {};

  fleetConfigs.forEach((fleet) => {
    if (fleet.units && Array.isArray(fleet.units)) {
      fleet.units.forEach((unit) => {
        const dumptruckId = String(unit.id || unit.dumpTruckId);
        // Simpan info fleet mana yang pakai DT ini
        usedDumptrucksMap[dumptruckId] = {
          fleetId: fleet.id,
          fleetName: `${fleet.excavator} - ${fleet.loadingLocation}`,
          assignedAt: unit.assignedAt || fleet.updatedAt,
        };
      });
    }
  });

  return usedDumptrucksMap;
};

/**
 * Cek apakah dumptruck sedang digunakan di fleet lain
 * @param {string|number} dumptruckId - ID dumptruck yang akan dicek
 * @param {Object} usedDumptrucksMap - Map dari createUsedDumptrucksMap
 * @param {string|number} currentFleetId - ID fleet yang sedang diedit (opsional)
 * @returns {boolean} true jika DT dipakai di fleet lain
 */
export const isDumptruckUsedInOtherFleet = (
  dumptruckId,
  usedDumptrucksMap,
  currentFleetId = null
) => {
  const dtId = String(dumptruckId);
  const usageInfo = usedDumptrucksMap[dtId];

  if (!usageInfo) {
    return false; // DT belum dipakai sama sekali
  }

  // Jika sedang edit dan DT dipakai di fleet yang sama, return false
  if (currentFleetId && String(usageInfo.fleetId) === String(currentFleetId)) {
    return false;
  }

  return true; // DT dipakai di fleet lain
};

/**
 * Filter list dumptruck untuk menghilangkan yang sudah digunakan
 * @param {Array} dumptrucks - Array of dumptruck units
 * @param {Object} usedDumptrucksMap - Map dari createUsedDumptrucksMap
 * @param {string|number} currentFleetId - ID fleet yang sedang diedit (opsional)
 * @returns {Array} Filtered dumptrucks
 */
export const filterAvailableDumptrucks = (
  dumptrucks = [],
  usedDumptrucksMap = {},
  currentFleetId = null
) => {
  return dumptrucks.filter((dt) => {
    return !isDumptruckUsedInOtherFleet(dt.id, usedDumptrucksMap, currentFleetId);
  });
};

/**
 * Dapatkan info fleet yang menggunakan dumptruck tertentu
 * @param {string|number} dumptruckId - ID dumptruck
 * @param {Object} usedDumptrucksMap - Map dari createUsedDumptrucksMap
 * @returns {Object|null} Info fleet atau null
 */
export const getDumptruckUsageInfo = (dumptruckId, usedDumptrucksMap) => {
  const dtId = String(dumptruckId);
  return usedDumptrucksMap[dtId] || null;
};

/**
 * Statistik penggunaan dumptruck
 * @param {Array} allDumptrucks - Semua dumptruck available
 * @param {Object} usedDumptrucksMap - Map dari createUsedDumptrucksMap
 * @returns {Object} Stats
 */
export const getDumptruckStats = (allDumptrucks = [], usedDumptrucksMap = {}) => {
  const total = allDumptrucks.length;
  const used = Object.keys(usedDumptrucksMap).length;
  const available = total - used;

  return {
    total,
    used,
    available,
    usagePercentage: total > 0 ? ((used / total) * 100).toFixed(1) : 0,
  };
};

/**
 * Validasi apakah DT bisa diassign ke fleet
 * @param {string|number} dumptruckId - ID dumptruck
 * @param {Object} usedDumptrucksMap - Map dari createUsedDumptrucksMap
 * @param {string|number} currentFleetId - ID fleet yang sedang diedit (opsional)
 * @returns {Object} { valid: boolean, reason: string }
 */
export const validateDumptruckAssignment = (
  dumptruckId,
  usedDumptrucksMap,
  currentFleetId = null
) => {
  if (isDumptruckUsedInOtherFleet(dumptruckId, usedDumptrucksMap, currentFleetId)) {
    const usageInfo = getDumptruckUsageInfo(dumptruckId, usedDumptrucksMap);
    return {
      valid: false,
      reason: `Dumptruck sudah digunakan di fleet: ${usageInfo.fleetName}`,
      usageInfo,
    };
  }

  return {
    valid: true,
    reason: "Dumptruck tersedia",
  };
};

export default {
  createUsedDumptrucksMap,
  isDumptruckUsedInOtherFleet,
  filterAvailableDumptrucks,
  getDumptruckUsageInfo,
  getDumptruckStats,
  validateDumptruckAssignment,
};