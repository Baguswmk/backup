import { PAGINATION, STATUS } from "@/shared/constants/appConstant";

// DUMPTRUCK-SPECIFIC CONSTANTS
export const UNIT_STATUS = {
  ACTIVE: "active",
  MAINTENANCE: "maintenance",
  INACTIVE: "inactive",
};

export const UNIT_STATUS_COLORS = {
  active: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
  },
  maintenance: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  inactive: {
    bg: "bg-gray-50 dark:bg-gray-900/20",
    text: "text-gray-700 dark:text-gray-300",
  },
};

export const DEFAULT_STATES = {
  EDITING_SETTING: null,
  DETAIL_SETTING: null,
  DELETE_TARGET: null,
};

export const TOAST_MESSAGES = {
  SUCCESS: {
    SAVE: "Setting dump truck berhasil disimpan",
    UPDATE: "Setting dump truck berhasil diupdate",
    DELETE: "Setting dump truck berhasil dihapus",
    MOVE_UNIT: "Unit berhasil dipindahkan",
    REFRESH: "Data berhasil di-refresh",
  },
  ERROR: {
    SAVE_FAILED: "Gagal menyimpan setting dump truck",
    UPDATE_FAILED: "Gagal mengupdate setting",
    DELETE_FAILED: "Gagal menghapus setting",
    MOVE_UNIT_FAILED: "Gagal memindahkan unit",
    FETCH_LATEST_FAILED: "Gagal mengambil data terbaru",
    LOAD_FILTERED_UNITS_FAILED: "Gagal memuat unit yang sesuai",
    INVALID_PAIRS: (count) => `${count} pasangan tidak valid (truckId atau operatorId kosong)`,
    NO_RESPONSE: "Tidak ada response dari server",
  },
  WARNING: {
    NO_DATA_ACCESS: "Anda tidak memiliki akses ke data ini",
  },
  INFO: {
    NO_UNITS_AVAILABLE: (excavator) => `Tidak ada dump truck tersedia yang cocok untuk excavator: ${excavator}`,
    LOADING_UNITS: "Memuat dump truck yang sesuai dengan fleet...",
  },
};

export const VALIDATION_MESSAGES = {
  INVALID_FLEET_ID: "Fleet ID tidak valid",
  NO_UNITS_SELECTED: "Pilih minimal 1 unit dump truck",
  REQUIRED_FLEET: "Pilih fleet terlebih dahulu",
  REQUIRED_UNITS: "Pilih minimal 1 dump truck",
  REQUIRED_OPERATOR: "Pilih operator",
  ALL_OPERATORS_REQUIRED: "Semua unit harus memiliki operator",
};

export const LOADING_MESSAGES = {
  PROCESSING: "Memproses...",
  SAVING: "Menyimpan...",
  DELETING: "Menghapus...",
};

export const SEARCH_PLACEHOLDERS = {
  UNIT: "Cari hull_no, company, work unit...",
  FLEET: "Cari nama fleet, excavator, shift...",
};

export const BUTTON_LABELS = {
  SELECT_ALL: "Pilih Semua",
  DESELECT_ALL: "Batalkan Semua",
  CANCEL: "Batal",
  SAVE: "Simpan",
  UPDATE: "Update",
};

export const MODAL_TITLES = {
  CREATE: "Input Setting Dump Truck",
  EDIT: "Update Setting Dump Truck",
};

export const MODAL_SUBTITLES = {
  FORM: "Kelola pengaturan dump truck untuk fleet",
};

export const CARD_TITLES = {
  FLEET: "Fleet Configuration",
  FLEET_SELECTED: "Fleet yang Dipilih",
  UNITS: "Daftar Dump Truck",
};

// Use shared pagination
export const DEFAULT_PAGE_SIZE = PAGINATION.PAGE_SIZE;
export const DEFAULT_CURRENT_PAGE = PAGINATION.DEFAULT_PAGE;
export { STATUS as FLEET_STATUS };