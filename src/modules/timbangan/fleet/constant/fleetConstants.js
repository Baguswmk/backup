import { PAGINATION, DEBOUNCE, FILTER_FIELDS as SHARED_FILTER_FIELDS } from "@/shared/constants/appConstant";

// FLEET-SPECIFIC CONSTANTS
export const FLEET_TABS = {
  TIMBANGAN: "timbangan",
};

export const FLEET_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  CLOSED: "CLOSED",
};

export const TOAST_MESSAGES = {
  SUCCESS: {
    CREATE: "Fleet berhasil dibuat",
    UPDATE: "Fleet berhasil diupdate",
    DELETE: "Fleet berhasil dihapus",
    REFRESH: "Data berhasil di-refresh",
    REACTIVATE: "Fleet berhasil direaktivasi",
    FLEET_SELECTION: (timbangan) =>
      `${timbangan} Timbangan berhasil dipilih`,
  },
  ERROR: {
    CREATE_FAILED: "Gagal membuat fleet",
    UPDATE_FAILED: "Gagal mengupdate fleet",
    DELETE_FAILED: "Gagal menghapus fleet",
    REFRESH_FAILED: "Gagal refresh data",
    REACTIVATE_FAILED: "Gagal mereaktivasi fleet",
    STATUS_CHANGE_FAILED: "Gagal mengubah status",
    NO_RESPONSE: "Tidak ada response dari server",
  },
  WARNING: {
    NO_ACCESS: "Anda tidak memiliki akses ke data ini",
  },
};

export const SEARCH_PLACEHOLDERS = {
  FLEET: "Cari nama fleet, excavator, work unit...",
};

export const LOADING_MESSAGES = {
  PROCESSING: "Memproses...",
};

// Use shared constants
export const PAGE_SIZE = PAGINATION.PAGE_SIZE;
export const DEBOUNCE_TIME = DEBOUNCE.SEARCH;
export const FILTER_FIELDS = SHARED_FILTER_FIELDS;