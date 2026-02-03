/**
 * Constants untuk Unit Log Module
 */

export const UNIT_LOG_STATUS = {
  BREAKDOWN: "BREAKDOWN",
  SERVICE: "SERVICE",
};

export const UNIT_STATUS = {
  ON_DUTY: "ON DUTY",
  BREAKDOWN: "BREAKDOWN",
  SERVICE: "SERVICE",
  STANDBY: "STANDBY",
};

export const UNIT_LOG_MESSAGES = {
  CREATE_SUCCESS: "Berhasil menambahkan data unit log",
  CREATE_ERROR: "Gagal menambahkan unit log",
  VERIFY_SUCCESS: "Berhasil memverifikasi unit log",
  VERIFY_ERROR: "Gagal memverifikasi unit log",
  LOAD_ERROR: "Gagal memuat data unit log",
  DELETE_SUCCESS: "Berhasil menghapus unit log",
  DELETE_ERROR: "Gagal menghapus unit log",
};

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: (field) => `${field} harus diisi`,
  INVALID_DATE: "Format tanggal tidak valid",
  COMPLETION_BEFORE_ENTRY: "Tanggal selesai harus setelah tanggal mulai",
  COMPLETION_SAME_AS_ENTRY: "Tanggal selesai tidak boleh sama dengan tanggal mulai",
  INVALID_STATUS: "Status harus 'BREAKDOWN' atau 'SERVICE'",
};

export const STATUS_LABELS = {
  [UNIT_LOG_STATUS.BREAKDOWN]: "Breakdown",
  [UNIT_LOG_STATUS.SERVICE]: "Service / PM",
};

export const STATUS_COLORS = {
  [UNIT_LOG_STATUS.BREAKDOWN]: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    border: "border-red-500",
  },
  [UNIT_LOG_STATUS.SERVICE]: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-300",
    border: "border-yellow-500",
  },
};