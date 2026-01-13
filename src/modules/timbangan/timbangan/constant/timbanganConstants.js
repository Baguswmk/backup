export const DEBOUNCE_TIME = 300;
export const AUTO_OPEN_DELAY = 1000;
export const AUTO_PRINT_DELAY = 800;
export const REOPEN_FORM_DELAY = 2000;
export const FLEET_REFRESH_DELAY = 300;
export const DATE_FILTER_DEBOUNCE = 500;
export const CONNECTION_CHECK_TIMEOUT = 2000;

export const getInitialDateRange = () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return {
    from: todayStart,
    to: todayEnd,
    shift: "All",
  };
};

export const TOAST_MESSAGES = {
  SUCCESS: {
    REFRESH: "Data berhasil direfresh",
    FLEET_REFRESH: "Data fleet berhasil diperbarui",
    DELETE_SINGLE: "Data berhasil dihapus",
    UPDATE: "Data berhasil diperbarui",
    FLEET_SELECTION: (count) => `${count} Fleet dipilih`, 
  },
  WARNING: {
    NO_SELECTION: "Pilih data yang akan dihapus",
    NO_WEBSERIAL: "WebSerial tidak didukung di browser ini",
  },
  ERROR: {
    REFRESH_FAILED: "Gagal refresh data",
    FLEET_REFRESH_FAILED: "Gagal memperbarui data fleet",
    DELETE_FAILED: "Gagal menghapus data",
    UPDATE_FAILED: "Gagal memperbarui data",
    SAVE_FAILED: "Gagal menyimpan data timbangan",
    LOAD_FAILED: "Gagal memuat data",
  },
};

export const DEFAULT_STATES = {
  EDITING_ITEM: null,
  ITEM_TO_DELETE: null,
  AUTO_PRINT_DATA: null,
};

export const FORM_MODES = {
  CREATE: "create",
  EDIT: "edit",
};

export const USER_ROLES = {
  OPERATOR_JT: "operator_jt",
};

export const KEYBOARD_SHORTCUTS = {
  INPUT_FORM: {
    key: "i",
    altKey: true,
    description: "Alt + I",
  },
};