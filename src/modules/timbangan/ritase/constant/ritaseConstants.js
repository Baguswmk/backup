export const getInitialDateRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  return {
    from: today,
    to: endOfDay,
    shift: "All",
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

export const TIMBANGAN_TYPES = {
  INTERNAL: "INTERNAL",
  MANUAL: "MANUAL",
  BYPASS: "BYPASS",
  CHECKPOINT: "checkpoint",
};

export const STORAGE_KEYS = {
  [TIMBANGAN_TYPES.INTERNAL]: "timbangan-store",
  [TIMBANGAN_TYPES.MANUAL]: "timbangan-manual-store",
  [TIMBANGAN_TYPES.CHECKPOINT]: "timbangan-checkpoint-store",
};

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

export const DUMPING_POINT_GROUP = {
  "Air Laya Mining Operations": [
    "TAL - TAL UTARA BARAT",
    "TAL - TAL UTARA TIMUR",
    "TAL - TAL - TSBC",
  ],

  "BANKO 1 Mining Operations": [
    "Bangko Tengah - BT-B PIT E",
    "Bangko Tengah - TS Merbau",
    "Bangko Tengah - TS Merawan",
    "Bangko Tengah - TS Mahoni",
    "Bangko Tengah - TS INPIT BWE",
  ],

  "BANKO 2 Mining Operations": [
    "Bangko Tengah - TS Ulin 1",
    "Bangko Tengah - TS Ulin 2",
    "Bangko Tengah - TS Ulin 3",
    "Bangko Tengah - TS Ulin 4",
    "Bangko Tengah - TS Ulin 1 Ext",
    "Bangko Tengah - TS Ulin 3 Ext",
    "Bangko Tengah - TS Cendana",
    "Bangko Tengah - TS Beringin",
    "Bangko Tengah - TS Waringin",
    "Bangko Tengah - Pit BT-A",
    "Bangko Tengah - BT-B PIT SJS",
  ],

  "West Block Coal Handling Operation": {
    "Coal Handling Operations 1": {
      "Stockpile 1": [
        "TAL - SP 1 SELATAN 1",
        "TAL - SP 1 SELATAN 2",
        "TAL - SP 1 SELATAN 3",
        "TAL - SP 1 SELATAN 4",
        "TAL - SP 1 SELATAN 5",
        "TAL - SP 1 SELATAN 6",
        "TAL - SP 1 SELATAN 7",
        "TAL - SP 1 SELATAN 8",
        "TAL - SP 1 SELATAN 9",
        "TAL - SP 1 UTARA 1",
        "TAL - SP 1 UTARA 2",
        "TAL - SP 1 UTARA 3",
        "TAL - SP 1 UTARA 4",
        "TAL - SP 1 UTARA 5",
        "TAL - SP 1 UTARA 6",
        "TAL - SP 1 UTARA 7",
        "TAL - SP 1 UTARA 8",
        "TAL - SP 1 UTARA 9",
        "TAL - SP 1 COALFEEDER",
      ],
      "TAL - Crusher PLTU BA": "TAL - Crusher PLTU BA",
      "PLTU Bukit Asam": "PLTU Bukit Asam",
    },
    "Coal Handling Operations 2": {
      "Stockpile 2": [
        "TAL - SP 2 R5",
        "TAL - SP 2 SELATAN VF 1",
        "TAL - SP 2 SELATAN VF 2",
        "TAL - SP 2 SELATAN VF 3",
        "TAL - SP 2 SELATAN VF 4",
        "TAL - SP 2 SELATAN VF 5",
        "TAL - SP 2 UTARA VF 1",
        "TAL - SP 2 UTARA VF 2",
        "TAL - SP 2 UTARA VF 3",
        "TAL - SP 2 UTARA VF 4",
        "TAL - SP 2 UTARA VF 5",
      ],
    },

    "MTB BWE SP Coal Handling Operations": [
      "MTB - SP MTB CC21 RF 03",
      "MTB - SP MTB CC21 RF 02",
      "MTB - SP MTB CC21 RF 01",
      "MTB - SP MTB CC21",
      "MTB - RF 10",
      "MTB - PLTU Banjarsari",
    ],
    "INPIT TAL SP Coal Handling Operations": [
      "TAL - RL 56+ Ext Utara",
      "TAL - SP Elevasi 56",
    ],

    "Non-Rail Coal Transportation": ["MTB - SP Giok Ext"],

    "MTB Mining Operations": [
      "MTB - MTBS",
      "MTB - MTBU",
      "MTB - TS CCP MTB",
      "MTB - STOCK TS WESTHAM",
    ],
  },

  "East Block Coal Handling Operation": {
    "Coal Handling Operations 3": {
      "Stockpile 3": [
        "Bangko Barat - Livestock DH3 - 1A",
        "Bangko Barat - Livestock DH3 - 1A Ext",
        "Bangko Barat - SP 3",
        "Bangko Barat - DH 3",
      ],
    },
    "Coal Handling Operations 4": {
      "Stockpile 4": [
      "Bangko Barat - DH 4 Sumuran",
      "Bangko Barat - DH 4 Jembatan",
      "Bangko Barat - LS DH 4",
      "Bangko Barat - SP 4",
      "Bangko Barat - DH 4",
      ]
    },
    "Coal Handling Operations 5": {
      "Stockpile 5": [
      "Bangko Barat - LS DH 5",
      "Bangko Barat - SP 5",
      "Bangko Barat - DH 5",
      "Bangko Barat - RF 5",
      ]
    },
    "Coal Handling Operations CHF SS 8": ["Bangko Tengah - LS Sumsel 8"],
  },

  "In-House Mining Operations 1": [
    "Bangko Tengah - PIT 2",
    "Bangko Barat - TS Pit 1E-1",
    "Bangko Barat - TS Meranti",
    "Bangko Barat - TS Lily",
    "Bangko Barat - TS Green Belt 1",
  ],

  "In-House Mining Operations 2": [
    "Bangko Tengah - TS Sakura",
    "Bangko Tengah - TS Tulip",
    "Bangko Tengah - TS Raflesia",
    "Bangko Tengah - TS Ext Sakura",
    "Bangko Tengah - TS Aren",
    "Bangko Tengah - TS PIT 3 Timur",
  ],

  "Mine-Mouth Coal Transportation": [
    "Housekeeping Non-Rail",
    "Housekeeping CHO SS 8",
    "Housekeeping CHO 1",
    "Housekeeping CHO 2",
    "Housekeeping CHO 3",
    "Housekeeping CHO 4",
    "Housekeeping CHO 5",
    "Housekeeping CHO Inpit",
    "Housekeeping CHO MTB BWE",
    "Dumping HK Bangko Barat",
    "Dumping HK TAL",
    "Dumping HK MTB",
  ],
};
