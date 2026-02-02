/**
 * Helper untuk mengelola status dump truck di fleet
 * ✨ Updated to support merged fleet groups editing
 */

/**
 * Membuat map dari dump truck yang sudah digunakan
 * @param {Array} availableDumptruckSettings - List semua fleet settings
 * @returns {Map} Map dengan key: dumpTruckId, value: { fleetId, fleetInfo }
 */
export const createUsedDumptrucksMap = (availableDumptruckSettings = []) => {
  const map = new Map();

  availableDumptruckSettings.forEach((fleet) => {
    if (fleet.units && Array.isArray(fleet.units)) {
      fleet.units.forEach((unit) => {
        const dtId = String(unit.id || unit.dumpTruckId);

        map.set(dtId, {
          fleetId: fleet.id,
          fleetInfo: {
            excavator: fleet.excavator,
            loadingLocation: fleet.loadingLocation,
            dumpingLocation: fleet.dumpingLocation,
            coalType: fleet.coalType,
            measurementType: fleet.measurementType,
          },
        });
      });
    }
  });

  return map;
};

/**
 * ✨ UPDATED: Filter dump truck yang available (tidak digunakan di fleet lain saat edit)
 * @param {Array} units - List dump trucks
 * @param {Map} usedDumptrucksMap - Map dump truck yang sudah digunakan
 * @param {string|Array} currentFleetIds - ID fleet yang sedang di-edit (bisa single ID atau array of IDs, null jika create)
 * @returns {Array} Filtered dump trucks
 */
export const filterAvailableDumptrucks = (
  units,
  usedDumptrucksMap,
  currentFleetIds = null,
) => {
  // ✨ NEW: Normalize ke array untuk konsistensi
  const editingFleetIds = Array.isArray(currentFleetIds) 
    ? currentFleetIds.map(String)
    : currentFleetIds 
      ? [String(currentFleetIds)]
      : [];

  return units.filter((unit) => {
    const dtId = String(unit.id);
    const usage = usedDumptrucksMap.get(dtId);

    // Jika tidak ada di map, berarti available
    if (!usage) return true;

    // ✨ UPDATED: Jika sedang edit dan DT ini milik salah satu fleet yang sedang di-edit, tetap tampilkan
    if (editingFleetIds.length > 0 && editingFleetIds.includes(String(usage.fleetId))) {
      return true;
    }

    // DT ini digunakan di fleet lain - TETAP TAMPILKAN tapi dengan status berbeda
    // Status ini akan dihandle di UI untuk menampilkan badge "Digunakan Fleet Lain"
    return true;
  });
};

/**
 * ✨ UPDATED: Mengecek apakah dump truck sedang digunakan di fleet lain
 * @param {string} dumpTruckId - ID dump truck
 * @param {Map} usedDumptrucksMap - Map dump truck yang sudah digunakan
 * @param {string|Array} currentFleetIds - ID fleet yang sedang di-edit (bisa single ID atau array)
 * @returns {Object} { isUsed: boolean, fleetInfo: {...}, fleetId: string|null }
 */
export const checkDumptruckUsage = (
  dumpTruckId,
  usedDumptrucksMap,
  currentFleetIds = null,
) => {
  const dtId = String(dumpTruckId);
  const usage = usedDumptrucksMap.get(dtId);

  if (!usage) {
    return { isUsed: false, fleetInfo: null, fleetId: null };
  }

  // ✨ NEW: Normalize ke array
  const editingFleetIds = Array.isArray(currentFleetIds)
    ? currentFleetIds.map(String)
    : currentFleetIds
      ? [String(currentFleetIds)]
      : [];

  // ✨ UPDATED: Jika digunakan di salah satu fleet yang sedang di-edit, anggap tidak digunakan
  if (editingFleetIds.length > 0 && editingFleetIds.includes(String(usage.fleetId))) {
    return { isUsed: false, fleetInfo: null, fleetId: null };
  }

  // Digunakan di fleet lain
  return {
    isUsed: true,
    fleetInfo: usage.fleetInfo,
    fleetId: usage.fleetId,
  };
};

/**
 * ✨ UPDATED: Mendapatkan status dump truck untuk UI badge
 * @param {string} dumpTruckId - ID dump truck
 * @param {Array} selectedUnits - List unit yang sudah dipilih di fleet saat ini
 * @param {Map} usedDumptrucksMap - Map dump truck yang sudah digunakan
 * @param {string|Array} currentFleetIds - ID fleet yang sedang di-edit (bisa single ID atau array)
 * @returns {string} 'active' | 'used-other' | 'available'
 */
export const getDumptruckStatus = (
  dumpTruckId,
  selectedUnits,
  usedDumptrucksMap,
  currentFleetIds = null,
) => {
  const dtId = String(dumpTruckId);

  // Ensure selectedUnits is an array to prevent .some() error
  const unitsArray = Array.isArray(selectedUnits) ? selectedUnits : [];

  // Cek apakah sudah dipilih di fleet saat ini
  const isSelected = unitsArray.some((u) => String(u.id) === dtId);

  if (isSelected) {
    return "active";
  }

  // ✨ UPDATED: Cek apakah digunakan di fleet lain (dengan support array of IDs)
  const usage = checkDumptruckUsage(dtId, usedDumptrucksMap, currentFleetIds);

  if (usage.isUsed) {
    return "used-other";
  }

  return "available";
};

/**
 * Dapatkan info fleet yang menggunakan dumptruck tertentu
 * @param {string|number} dumptruckId - ID dumptruck
 * @param {Map} usedDumptrucksMap - Map dari createUsedDumptrucksMap
 * @returns {Object|null} Info fleet atau null
 */
export const getDumptruckUsageInfo = (dumptruckId, usedDumptrucksMap) => {
  const dtId = String(dumptruckId);
  return usedDumptrucksMap.get(dtId) || null;
};

/**
 * Statistik penggunaan dumptruck
 * @param {Array} allDumptrucks - Semua dumptruck available
 * @param {Map} usedDumptrucksMap - Map dari createUsedDumptrucksMap
 * @returns {Object} Stats
 */
export const getDumptruckStats = (
  allDumptrucks = [],
  usedDumptrucksMap = new Map(),
) => {
  const total = allDumptrucks.length;
  const used = usedDumptrucksMap.size;
  const available = total - used;

  return {
    total,
    used,
    available,
    usagePercentage: total > 0 ? ((used / total) * 100).toFixed(1) : 0,
  };
};

/**
 * ✨ UPDATED: Validasi apakah DT bisa diassign ke fleet
 * @param {string|number} dumptruckId - ID dumptruck
 * @param {Map} usedDumptrucksMap - Map dari createUsedDumptrucksMap
 * @param {string|number|Array} currentFleetIds - ID fleet yang sedang diedit (bisa single ID atau array, opsional)
 * @returns {Object} { valid: boolean, reason: string, usageInfo?: Object }
 */
export const validateDumptruckAssignment = (
  dumptruckId,
  usedDumptrucksMap,
  currentFleetIds = null,
) => {
  const usage = checkDumptruckUsage(
    dumptruckId,
    usedDumptrucksMap,
    currentFleetIds,
  );

  if (usage.isUsed) {
    const usageInfo = getDumptruckUsageInfo(dumptruckId, usedDumptrucksMap);
    return {
      valid: false,
      reason: `Dumptruck sudah digunakan di fleet: ${usageInfo?.fleetInfo?.excavator || "Unknown"}`,
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
  filterAvailableDumptrucks,
  checkDumptruckUsage,
  getDumptruckStatus,
  getDumptruckUsageInfo,
  getDumptruckStats,
  validateDumptruckAssignment,
};