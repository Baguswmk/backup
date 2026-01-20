export const getInitialDateRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  return {
    from: today,
    to: endOfDay,
    shift: "All"
  };
};

export const DEBOUNCE_TIME = 500;
export const AUTO_OPEN_DELAY = 1500;
export const AUTO_PRINT_DELAY = 500;
export const REOPEN_FORM_DELAY = 2000;
export const FLEET_REFRESH_DELAY = 500;
export const DATE_FILTER_DEBOUNCE = 800;
export const CONNECTION_CHECK_TIMEOUT = 3000;

export const TOAST_MESSAGES = {
  SUCCESS: {
    SAVE: "Data berhasil disimpan",
    UPDATE: "Data berhasil diperbarui",
    DELETE_SINGLE: "Data berhasil dihapus",
    DELETE_MULTIPLE: (count) => `${count} data berhasil dihapus`,
    REFRESH: "Data berhasil diperbarui",
    FLEET_REFRESH: "Fleet berhasil diperbarui",
    FLEET_SELECTION: (count) => `${count} fleet berhasil dipilih`,
  },
  ERROR: {
    SAVE_FAILED: "Gagal menyimpan data",
    UPDATE_FAILED: "Gagal memperbarui data",
    DELETE_FAILED: "Gagal menghapus data",
    REFRESH_FAILED: "Gagal memperbarui data",
    FLEET_REFRESH_FAILED: "Gagal memperbarui fleet",
    LOAD_FAILED: "Gagal memuat data",
  },
  WARNING: {
    NO_SELECTION: "Pilih data terlebih dahulu",
    NO_WEBSERIAL: "WebSerial tidak didukung di browser ini",
  },
};

export const FORM_MODES = {
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
};

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

export const KEYBOARD_SHORTCUTS = {
  INPUT_FORM: {
    key: "n",
    altKey: true,
    description: "Alt+N",
  },
};

// NEW: Timbangan Types
export const TIMBANGAN_TYPES = {
  INTERNAL: "INTERNAL",
  MANUAL: "MANUAL",
  BYPASS:"BYPASS",
  CHECKPOINT: "checkpoint",
};

// NEW: Storage Keys untuk setiap tipe timbangan
export const STORAGE_KEYS = {
  [TIMBANGAN_TYPES.INTERNAL]: "timbangan-store",
  [TIMBANGAN_TYPES.MANUAL]: "timbangan-manual-store",
  [TIMBANGAN_TYPES.CHECKPOINT]: "timbangan-checkpoint-store",
};

// NEW: API Endpoints untuk setiap tipe
export const API_ENDPOINTS = {
  [TIMBANGAN_TYPES.INTERNAL]: {
    CREATE: "/v1/custom/ritase",
    UPDATE: "/v1/custom/ritase",
    DELETE: "/v1/custom/ritase",
    FETCH: "/ritases",
  },
  [TIMBANGAN_TYPES.MANUAL]: {
    CREATE: "/v1/custom/ritase-manual",
    UPDATE: "/v1/custom/ritase-manual",
    DELETE: "/v1/custom/ritase-manual",
    FETCH: "/ritase-manuals",
  },
  [TIMBANGAN_TYPES.CHECKPOINT]: {
    CREATE: "/v1/custom/ritase-checkpoint",
    UPDATE: "/v1/custom/ritase-checkpoint",
    DELETE: "/v1/custom/ritase-checkpoint",
    FETCH: "/ritase-checkpoints",
  },
};

// NEW: Features untuk setiap tipe
export const TIMBANGAN_FEATURES = {
  [TIMBANGAN_TYPES.INTERNAL]: {
    hasAutoConnect: true,
    hasWebSerial: true,
    hasPersistentStorage: true,
    label: "Timbangan Internal",
  },
  [TIMBANGAN_TYPES.MANUAL]: {
    hasAutoConnect: false,
    hasWebSerial: false,
    hasPersistentStorage: false,
    label: "Timbangan Manual",
  },
  [TIMBANGAN_TYPES.CHECKPOINT]: {
    hasAutoConnect: false,
    hasWebSerial: false,
    hasPersistentStorage: false,
    label: "Checkpoint",
  },
};