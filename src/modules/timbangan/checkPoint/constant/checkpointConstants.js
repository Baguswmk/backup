export const getInitialDateRange = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return { from: today, to: today, shift: "All" };
};

// Timing Constants
export const DEBOUNCE_TIME = 500;
export const AUTO_PRINT_DELAY = 500;
export const REOPEN_FORM_DELAY = 1500; // Reduced for checkpoint (faster)
export const FLEET_REFRESH_DELAY = 500;
export const DATE_FILTER_DEBOUNCE = 800;

// Toast Messages
export const TOAST_MESSAGES = {
  SUCCESS: {
    SAVE: "Checkpoint berhasil disimpan",
    DELETE_SINGLE: "Checkpoint berhasil dihapus",
    DELETE_MULTIPLE: (count) => `${count} checkpoint berhasil dihapus`,
    REFRESH: "Data checkpoint berhasil diperbarui",
    FLEET_REFRESH: "Fleet berhasil diperbarui",
    FLEET_SELECTION: (count) => `${count} fleet berhasil dipilih`,
  },
  ERROR: {
    SAVE_FAILED: "Gagal menyimpan checkpoint",
    DELETE_FAILED: "Gagal menghapus checkpoint",
    REFRESH_FAILED: "Gagal memperbarui data checkpoint",
    FLEET_REFRESH_FAILED: "Gagal memperbarui fleet",
    LOAD_FAILED: "Gagal memuat data checkpoint",
  },
  WARNING: {
    NO_SELECTION: "Pilih checkpoint terlebih dahulu",
    NO_HULL_NO: "Nomor lambung wajib diisi",
    HULL_NO_NOT_FOUND: "Nomor lambung tidak ditemukan di fleet",
  },
};

// Form Modes
export const FORM_MODES = {
  CREATE: "create",
  DELETE: "delete",
  // Note: No EDIT mode for checkpoint (only create & delete)
};

// User Roles
export const USER_ROLES = {
  OPERATOR_JT: "operator_jt",
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  CHECKER: "checker",
  PIC: "pic",
  PENGAWAS: "pengawas",
  EVALUATOR: "evaluator",
  MITRA: "mitra",
  CCR: "ccr",
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  INPUT_FORM: {
    key: "n",
    altKey: true,
    description: "Alt+N",
  },
  HULL_NO_SELECT: {
    key: "d",
    altKey: true,
    description: "Alt+D - Focus to Hull Number",
  },
  SUBMIT_FORM: {
    key: "s",
    altKey: true,
    description: "Alt+S - Submit Checkpoint",
  },
  RESET_FORM: {
    key: "r",
    altKey: true,
    description: "Alt+R - Reset Form",
  },
  SHOW_HELP: {
    key: "h",
    altKey: true,
    description: "Alt+H - Show Shortcuts Help",
  },
  CANCEL: {
    key: "Escape",
    altKey: false,
    description: "Esc - Cancel/Close",
  },
};

// Checkpoint Type
export const TIMBANGAN_TYPES = {
  CHECKPOINT: "checkpoint",
};

// Storage Keys
export const STORAGE_KEYS = {
  CHECKPOINT: "checkpoint-store",
};

// API Endpoints
export const API_ENDPOINTS = {
  CHECKPOINT: {
    CREATE: "/v1/custom/checkpoint",
    DELETE: "/v1/custom/checkpoint",
    FETCH: "/ritases", // Same as timbangan (filtered by measurement_type)
  },
};

// Checkpoint Features
export const CHECKPOINT_FEATURES = {
  hasAutoConnect: false,        // No WebSerial connection needed
  hasWebSerial: false,           // No scale/weight measurement
  hasWeightInput: false,         // No weight input
  hasEditMode: false,            // Only create & delete
  hasAutoPrint: true,            // Can print checkpoint ticket
  hasPersistentStorage: false,   // No local storage needed
  requiresFleet: true,           // Must select from active fleet
  autoReopenForm: true,          // Auto reopen after submit (for operator)
  label: "Checkpoint",
  description: "Simple checkpoint tracking by hull number only",
};

// Validation Rules
export const VALIDATION_RULES = {
  HULL_NO: {
    required: true,
    message: "Nomor lambung wajib diisi",
    errorMessage: "Pilih nomor lambung yang valid dari fleet",
  },
  FLEET: {
    required: true,
    message: "Fleet wajib dipilih",
    errorMessage: "Nomor lambung tidak ditemukan di fleet yang dipilih",
  },
};

// Table Columns Configuration
export const TABLE_COLUMNS = {
  TIMESTAMP: { key: "createdAt", label: "Waktu", sortable: true },
  HULL_NO: { key: "hull_no", label: "No. Lambung", sortable: true },
  OPERATOR: { key: "operatorName", label: "Operator", sortable: true },
  FLEET: { key: "fleet_name", label: "Fleet", sortable: true },
  EXCAVATOR: { key: "fleet_excavator", label: "Excavator", sortable: true },
  SHIFT: { key: "fleet_shift", label: "Shift", sortable: true },
  LOADING: { key: "fleet_loading", label: "Loading", sortable: false },
  DUMPING: { key: "fleet_dumping", label: "Dumping", sortable: false },
};

// Export Filename Pattern
export const EXPORT_FILENAME = {
  PREFIX: "checkpoint",
  DATE_FORMAT: "yyyy-MM-dd",
  EXTENSION: "xlsx",
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  PAGE_SIZE_OPTIONS: [25, 50, 100, 200],
};

// Date Range Limits
export const DATE_RANGE = {
  MAX_DAYS: 90,
  WARNING_DAYS: 30,
};

// Auto Refresh (for real-time checkpoint monitoring)
export const AUTO_REFRESH = {
  ENABLED: false,
  INTERVAL: 30000, // 30 seconds
};

// Measurement Type (for API filtering)
export const MEASUREMENT_TYPE = "Checkpoint";

// Status Badge Colors
export const STATUS_COLORS = {
  SUCCESS: "bg-green-600",
  ERROR: "bg-red-600",
  WARNING: "bg-orange-600",
  INFO: "bg-blue-600",
  DEFAULT: "bg-gray-600",
};

// Filter Options
export const SHIFT_OPTIONS = [
  { value: "All", label: "Semua Shift" },
  { value: "PAGI", label: "Shift Pagi" },
  { value: "MALAM", label: "Shift Malam" },
];

// Permission Checks
export const PERMISSIONS = {
  CAN_CREATE: [
    USER_ROLES.OPERATOR_JT,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ],
  CAN_DELETE: [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ],
  CAN_EXPORT: [
    USER_ROLES.OPERATOR_JT,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.CHECKER,
    USER_ROLES.PIC,
    USER_ROLES.PENGAWAS,
    USER_ROLES.EVALUATOR,
  ],
  CAN_VIEW_ALL: [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.PIC,
    USER_ROLES.PENGAWAS,
    USER_ROLES.EVALUATOR,
  ],
};

// Helper Functions
export const canUserCreate = (userRole) => {
  return PERMISSIONS.CAN_CREATE.includes(userRole);
};

export const canUserDelete = (userRole) => {
  return PERMISSIONS.CAN_DELETE.includes(userRole);
};

export const canUserExport = (userRole) => {
  return PERMISSIONS.CAN_EXPORT.includes(userRole);
};

export const canUserViewAll = (userRole) => {
  return PERMISSIONS.CAN_VIEW_ALL.includes(userRole);
};

// Form Field IDs (for accessibility & testing)
export const FORM_FIELD_IDS = {
  HULL_NO: "hull_no_select",
  HULL_NO_WRAPPER: "hull-no-select-wrapper",
};

// Loading States
export const LOADING_STATES = {
  INITIAL: "initial",
  REFRESHING: "refreshing",
  SUBMITTING: "submitting",
  DELETING: "deleting",
  FLEET_REFRESHING: "fleet_refreshing",
};

// Error Codes (for specific error handling)
export const ERROR_CODES = {
  HULL_NO_REQUIRED: "HULL_NO_REQUIRED",
  HULL_NO_NOT_FOUND: "HULL_NO_NOT_FOUND",
  FLEET_NOT_FOUND: "FLEET_NOT_FOUND",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  SERVER_ERROR: "SERVER_ERROR",
};

// Success Messages for specific actions
export const SUCCESS_ACTIONS = {
  CHECKPOINT_CREATED: "✅ Checkpoint berhasil dicatat",
  AUTO_FILLED: (hullNo, fleetName) => `✅ Auto-filled: ${hullNo} - ${fleetName}`,
  FORM_RESET: "ℹ️ Form direset ke nilai default",
};

// Info Messages
export const INFO_MESSAGES = {
  SELECT_HULL_NO: "Pilih nomor lambung dari fleet yang aktif",
  KEYBOARD_SHORTCUTS: "Tekan Alt+H untuk melihat keyboard shortcuts",
  NO_FLEET_SELECTED: "Pilih fleet terlebih dahulu di Fleet Management",
  WAITING_FOR_FLEET: "Menunggu data fleet...",
};

export default {
  getInitialDateRange,
  DEBOUNCE_TIME,
  AUTO_PRINT_DELAY,
  REOPEN_FORM_DELAY,
  FLEET_REFRESH_DELAY,
  DATE_FILTER_DEBOUNCE,
  TOAST_MESSAGES,
  FORM_MODES,
  USER_ROLES,
  KEYBOARD_SHORTCUTS,
  TIMBANGAN_TYPES,
  STORAGE_KEYS,
  API_ENDPOINTS,
  CHECKPOINT_FEATURES,
  VALIDATION_RULES,
  TABLE_COLUMNS,
  EXPORT_FILENAME,
  PAGINATION,
  DATE_RANGE,
  AUTO_REFRESH,
  MEASUREMENT_TYPE,
  STATUS_COLORS,
  SHIFT_OPTIONS,
  PERMISSIONS,
  FORM_FIELD_IDS,
  LOADING_STATES,
  ERROR_CODES,
  SUCCESS_ACTIONS,
  INFO_MESSAGES,
  canUserCreate,
  canUserDelete,
  canUserExport,
  canUserViewAll,
};