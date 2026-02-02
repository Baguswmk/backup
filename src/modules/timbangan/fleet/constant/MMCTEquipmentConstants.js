/**
 * Constants untuk MMCT Equipment List Management
 * Digunakan untuk mengelola List Alat PM/BD MMCT
 */

export const EQUIPMENT_CATEGORIES = {
  DT_SERVICE: {
    id: "dt_service",
    label: "List DT Service",
    description: "Daftar Dump Truck yang sedang dalam service",
    color: "blue",
    icon: "🚛",
    type: "DUMP_TRUCK",
  },
  DT_BD: {
    id: "dt_bd",
    label: "List DT BD (Breakdown)",
    description: "Daftar Dump Truck yang mengalami breakdown",
    color: "red",
    icon: "⚠️",
    type: "DUMP_TRUCK",
  },
  EXCA_SERVICE: {
    id: "exca_service",
    label: "List Exca Service",
    description: "Daftar Excavator yang sedang dalam service",
    color: "green",
    icon: "🏗️",
    type: "EXCAVATOR",
  },
  EXCA_BD: {
    id: "exca_bd",
    label: "List Exca BD (Breakdown)",
    description: "Daftar Excavator yang mengalami breakdown",
    color: "orange",
    icon: "🔧",
    type: "EXCAVATOR",
  },
};

export const EQUIPMENT_TYPES = {
  DUMP_TRUCK: "DUMP_TRUCK",
  EXCAVATOR: "EXCAVATOR",
};

export const STATUS_TYPES = {
  SERVICE: "service",
  BREAKDOWN: "breakdown",
};

// Category mappings untuk kemudahan akses
export const CATEGORY_MAP = {
  dt_service: EQUIPMENT_CATEGORIES.DT_SERVICE,
  dt_bd: EQUIPMENT_CATEGORIES.DT_BD,
  exca_service: EQUIPMENT_CATEGORIES.EXCA_SERVICE,
  exca_bd: EQUIPMENT_CATEGORIES.EXCA_BD,
};

// Get category by ID
export const getCategoryById = (categoryId) => {
  return CATEGORY_MAP[categoryId] || EQUIPMENT_CATEGORIES.DT_SERVICE;
};

// Get equipment type from category
export const getEquipmentTypeFromCategory = (categoryId) => {
  if (categoryId.startsWith("dt_")) {
    return EQUIPMENT_TYPES.DUMP_TRUCK;
  } else if (categoryId.startsWith("exca_")) {
    return EQUIPMENT_TYPES.EXCAVATOR;
  }
  return null;
};

// Get status from category
export const getStatusFromCategory = (categoryId) => {
  if (categoryId.includes("_bd")) {
    return STATUS_TYPES.BREAKDOWN;
  } else if (categoryId.includes("_service")) {
    return STATUS_TYPES.SERVICE;
  }
  return null;
};

// Color classes untuk Tailwind
export const COLOR_CLASSES = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-300 dark:border-blue-600",
    hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    badge: "bg-blue-600 text-white",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-300 dark:border-red-600",
    hover: "hover:bg-red-50 dark:hover:bg-red-900/20",
    badge: "bg-red-600 text-white",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-300 dark:border-green-600",
    hover: "hover:bg-green-50 dark:hover:bg-green-900/20",
    badge: "bg-green-600 text-white",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-300 dark:border-orange-600",
    hover: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
    badge: "bg-orange-600 text-white",
  },
};

// API Endpoints
export const API_ENDPOINTS = {
  BASE: "/api/timbangan/mmct-equipment",
  GET_ALL: "/api/timbangan/mmct-equipment/all",
  GET_BY_CATEGORY: (category) => `/api/timbangan/mmct-equipment/${category}`,
  SAVE_ALL: "/api/timbangan/mmct-equipment/save-all",
  SAVE_BY_CATEGORY: (category) => `/api/timbangan/mmct-equipment/${category}`,
  DELETE: (category, id) => `/api/timbangan/mmct-equipment/${category}/${id}`,
  STATISTICS: "/api/timbangan/mmct-equipment/statistics",
};

// Validation rules
export const VALIDATION_RULES = {
  REQUIRED_FIELDS: ["equipmentId", "equipmentName"],
  MAX_EQUIPMENT_NAME_LENGTH: 100,
  MIN_EQUIPMENT_NAME_LENGTH: 2,
};

// Toast messages
export const TOAST_MESSAGES = {
  SAVE_SUCCESS: "List alat PM/BD MMCT berhasil disimpan!",
  SAVE_ERROR: "Gagal menyimpan list alat",
  LOAD_ERROR: "Gagal memuat data list alat",
  DELETE_SUCCESS: "Alat berhasil dihapus dari list",
  DELETE_ERROR: "Gagal menghapus alat dari list",
  VALIDATION_ERROR: "Mohon lengkapi semua data yang diperlukan",
  UNSAVED_CHANGES: "Ada perubahan yang belum disimpan. Yakin ingin menutup?",
};

// Default empty equipment item
export const EMPTY_EQUIPMENT_ITEM = {
  id: null,
  equipmentType: "",
  equipmentId: null,
  equipmentName: "",
  isNew: true,
};

// Permissions
export const PERMISSIONS = {
  ALLOWED_ROLES: ["ccr"], // Only CCR can access
  CAN_VIEW: ["ccr"],
  CAN_CREATE: ["ccr"],
  CAN_UPDATE: ["ccr"],
  CAN_DELETE: ["ccr"],
};

// Check if user has permission
export const hasPermission = (userRole, action = "view") => {
  if (!userRole) return false;
  
  const normalizedRole = userRole.toLowerCase();
  
  switch (action) {
    case "view":
      return PERMISSIONS.CAN_VIEW.includes(normalizedRole);
    case "create":
      return PERMISSIONS.CAN_CREATE.includes(normalizedRole);
    case "update":
      return PERMISSIONS.CAN_UPDATE.includes(normalizedRole);
    case "delete":
      return PERMISSIONS.CAN_DELETE.includes(normalizedRole);
    default:
      return false;
  }
};