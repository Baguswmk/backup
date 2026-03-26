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

    // ✅ tambahan SEAM
    "TAL-TAL-TSBC SEAM A1",
    "TAL-TAL-TSBC SEAM A2",
    "TAL-TAL-TSBC SEAM B",
    "TAL-TAL-TSBC SEAM BE",
    "TAL-TAL-TSBC SEAM BU",
    "TAL-TAL-TSBC SEAM C",
    "TAL-TAL-TSBC SEAM EN1",
    "TAL-TAL-TSBC SEAM EN2",

    "TAL-TAL UTARA BARAT SEAM EN",
    "TAL-TAL UTARA TIMUR SEAM A1",
    "TAL-TAL UTARA TIMUR SEAM A2",
    "TAL-TAL UTARA TIMUR SEAM B1",
    "TAL-TAL UTARA TIMUR SEAM B2",
    "TAL-TAL UTARA TIMUR SEAM C",
  ],

  "BANKO 1 Mining Operations": [
    "Banko Tengah - BT-B PIT E",
    "Banko Tengah - TS Merbau",
    "Banko Tengah - TS Merawan",
    "Banko Tengah - TS Mahoni",
    "Banko Tengah - TS INPIT BWE",

    // ✅ tambahan SEAM
    "BANKO TENGAH-BT-B PIT E SEAM D",
    "BANKO TENGAH-BT-B PIT E SEAM E",
  ],

  "BANKO 2 Mining Operations": [
    "Banko Tengah - TS Ulin 1",
    "Banko Tengah - TS Ulin 2",
    "Banko Tengah - TS Ulin 3",
    "Banko Tengah - TS Ulin 4",
    "Banko Tengah - TS Ulin 1 Ext",
    "Banko Tengah - TS Ulin 3 Ext",
    "Banko Tengah - TS Cendana",
    "Banko Tengah - TS Beringin",
    "Banko Tengah - TS Waringin",
    "Banko Tengah - Pit BT-A",
    "Banko Tengah - BT-B PIT SJS",

    // ✅ tambahan SEAM
    "BANKO TENGAH-BT-B PIT SJS SEAM A1",
    "BANKO TENGAH-BT-B PIT SJS SEAM A2",
    "BANKO TENGAH-BT-B PIT SJS SEAM B1",
    "BANKO TENGAH-BT-B PIT SJS SEAM B2",
    "BANKO TENGAH-BT-B PIT SJS SEAM C",

    "BANKO TENGAH-PIT BT-A SEAM A1",
    "BANKO TENGAH-PIT BT-A SEAM A2",
    "BANKO TENGAH-PIT BT-A SEAM B1",
    "BANKO TENGAH-PIT BT-A SEAM B2",
    "BANKO TENGAH-PIT BT-A SEAM C",
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
  },

  "East Block Coal Handling Operation": {
    "Coal Handling Operations 3": {
      "Stockpile 3": [
        "Banko Barat - Livestock DH3 - 1A",
        "Banko Barat - Livestock DH3 - 1A Ext",
        "Banko Barat - SP 3",
        "Banko Barat - DH 3",
      ],
    },
    "Coal Handling Operations 4": {
      "Stockpile 4": [
        "Banko Barat - DH 4 Sumuran",
        "Banko Barat - DH 4 Jembatan",
        "Banko Barat - SP 4",
        "Banko Barat - DH 4",
      ],
      "LS DH 4": ["Banko Barat - LS DH 4"],
    },
    "Coal Handling Operations 5": {
      "Stockpile 5": ["Banko Barat - SP 5", "Banko Barat - DH 5"],
      "LS DH 5": ["Banko Barat - LS DH 5"],
      "ROM RF 5": ["Banko Barat - ROM RF 5"],
    },
    "Coal Handling Operations CHF SS 8": ["Banko Tengah - LS Sumsel 8"],
  },

  "In-House Mining Operations 1": [
    "Banko Tengah - PIT 2",
    "Banko Barat - TS Pit 1E-1",
    "Banko Barat - TS Meranti",
    "Banko Barat - TS Lily",
    "Banko Barat - TS Green Belt 1",

    // ✅ tambahan PIT 2 SEAM
    "BANKO BARAT - PIT 2 SEAM A1",
    "BANKO BARAT - PIT 2 SEAM A2",
    "BANKO BARAT - PIT 2 SEAM B1",
    "BANKO BARAT - PIT 2 SEAM B2",
    "BANKO BARAT - PIT 2 SEAM C",
  ],

  "In-House Mining Operations 2": [
    "Banko Tengah - TS Sakura",
    "Banko Tengah - TS Tulip",
    "Banko Tengah - TS Raflesia",
    "Banko Tengah - TS Ext Sakura",
    "Banko Tengah - TS Aren",
    "Banko Tengah - TS PIT 3 Timur",

    // ✅ tambahan PIT 3 TIMUR SEAM
    "BANKO TENGAH - PIT 3 TIMUR SEAM A1",
    "BANKO TENGAH - PIT 3 TIMUR SEAM A2",
    "BANKO TENGAH - PIT 3 TIMUR SEAM B1",
    "BANKO TENGAH - PIT 3 TIMUR SEAM B2",
    "BANKO TENGAH - PIT 3 TIMUR SEAM C",
    "BANKO TENGAH - PIT 3 TIMUR SEAM D",
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
    "Dumping HK Banko Barat",
    "Dumping HK TAL",
    "Dumping HK MTB",
  ],

  "MTB Mining Operations": [
    "MTB - MTBS",
    "MTB - MTBU",
    "MTB - TS CCP MTB",
    "MTB - STOCK TS WESTHAM",

    // ✅ tambahan SEAM
    "MTB - MTBS SEAM A1",
    "MTB - MTBS SEAM A2",
    "MTB - MTBS SEAM B",
    "MTB - MTBS SEAM C",

    "MTB - MTBU SEAM A1",
    "MTB - MTBU SEAM A2",
    "MTB - MTBU SEAM B",
    "MTB - MTBU SEAM BE",
    "MTB - MTBU SEAM BU",
    "MTB - MTBU SEAM C",
  ],
};

export const LOADING_POINT_GROUP = {
  "Air Laya Mining Operations": [
    "TAL - TAL UTARA BARAT",
    "TAL - TAL UTARA TIMUR",
    "TAL - TAL-TSBC",

    // ✅ tambahan SEAM
    "TAL-TAL-TSBC SEAM A1",
    "TAL-TAL-TSBC SEAM A2",
    "TAL-TAL-TSBC SEAM B",
    "TAL-TAL-TSBC SEAM BE",
    "TAL-TAL-TSBC SEAM BU",
    "TAL-TAL-TSBC SEAM C",
    "TAL-TAL-TSBC SEAM EN1",
    "TAL-TAL-TSBC SEAM EN2",

    "TAL-TAL UTARA BARAT SEAM EN",
    "TAL-TAL UTARA TIMUR SEAM A1",
    "TAL-TAL UTARA TIMUR SEAM A2",
    "TAL-TAL UTARA TIMUR SEAM B1",
    "TAL-TAL UTARA TIMUR SEAM B2",
    "TAL-TAL UTARA TIMUR SEAM C",
  ],

  "BANKO 1 Mining Operations": [
    "Banko Tengah - TS INPIT BWE",
    "Banko Tengah - TS Mahoni",
    "Banko Tengah - TS Merawan",
    "Banko Tengah - TS Merbau",
    "Banko Tengah - BT-B PIT E",

    // ✅ tambahan SEAM
    "BANKO TENGAH-BT-B PIT E SEAM D",
    "BANKO TENGAH-BT-B PIT E SEAM E",
  ],

  "BANKO 2 Mining Operations": [
    "Banko Tengah - TS Beringin",
    "Banko Tengah - TS Cendana",
    "Banko Tengah - TS Ulin 1",
    "Banko Tengah - TS Ulin 1 Ext",
    "Banko Tengah - TS ULIN 2",
    "Banko Tengah - TS Ulin 3",
    "Banko Tengah - TS Ulin 3 Ext",
    "Banko Tengah - TS Ulin 4",
    "Banko Tengah - TS Waringin",
    "Banko Tengah - BT-B PIT SJS",
    "Banko Tengah - Pit BT-A",

    // ✅ tambahan SEAM
    "BANKO TENGAH-BT-B PIT SJS SEAM A1",
    "BANKO TENGAH-BT-B PIT SJS SEAM A2",
    "BANKO TENGAH-BT-B PIT SJS SEAM B1",
    "BANKO TENGAH-BT-B PIT SJS SEAM B2",
    "BANKO TENGAH-BT-B PIT SJS SEAM C",

    "BANKO TENGAH-PIT BT-A SEAM A1",
    "BANKO TENGAH-PIT BT-A SEAM A2",
    "BANKO TENGAH-PIT BT-A SEAM B1",
    "BANKO TENGAH-PIT BT-A SEAM B2",
    "BANKO TENGAH-PIT BT-A SEAM C",
  ],

  "West Block Coal Handling Operation": {
    "Quary": ["Quary"],
    "TAL - TS Pabum": ["TAL - TS Pabum"],

    "Coal Handling Operations 1": {
      "Stockpile 1": [
        "TAL - Crusher PLTU BA",
        "TAL - SP 1 COALFEEDER",
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
      ],
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

    "Non-Rail Coal Transportation": ["MTB - SP Giok Ext"],

    "MTB BWE SP Coal Handling Operations": [
      "MTB - PLTU Banjarsari",
      "MTB - RF 10",
      "MTB - SP MTB CC21",
      "MTB - SP MTB CC21 RF 01",
      "MTB - SP MTB CC21 RF 02",
      "MTB - SP MTB CC21 RF 03",
    ],

    "INPIT TAL SP Coal Handling Operations": [
      "TAL - SP Elevasi 56",
      "TAL - RL 56+ Ext Utara",
    ],
  },

  "East Block Coal Handling Operation": {
    "Coal Handling Operations 3": {
      "Stockpile 3": [
        "Banko Barat - SP 3",
        "Banko Barat - Livestock DH3 - 1A",
        "Banko Barat - Livestock DH3 - 1A Ext",
      ],
    },

    "Coal Handling Operations 4": {
      "Stockpile 4": ["Banko Barat - SP 4"],
      "LS DH 4": ["Banko Barat - LS DH 4"],
    },

    "Coal Handling Operations 5": {
      "Stockpile 5": ["Banko Barat - SP 5"],
      "ROM RF 5": ["Banko Barat - ROM RF 5"],
      "LS DH 5": ["Banko Barat - LS DH 5"],
    },

    "Coal Handling Operations CHF SS 8": ["Banko Tengah - LS Sumsel 8"],
  },

  "In-House Mining Operations 1": [
    "Banko Barat - TS Green belt 1",
    "Banko Barat - TS Lily",
    "Banko Barat - TS Meranti",
    "Banko Barat - TS Pit 1E-1",
    "Banko Tengah - PIT 2",

    // ✅ tambahan PIT 2 SEAM
    "BANKO BARAT - PIT 2 SEAM A1",
    "BANKO BARAT - PIT 2 SEAM A2",
    "BANKO BARAT - PIT 2 SEAM B1",
    "BANKO BARAT - PIT 2 SEAM B2",
    "BANKO BARAT - PIT 2 SEAM C",
  ],

  "In-House Mining Operations 2": [
    "Banko Tengah - TS Aren",
    "Banko Tengah - TS Ext Sakura",
    "Banko Tengah - TS Raflesia",
    "Banko Tengah - TS Sakura",
    "Banko Tengah - TS Tulip",
    "Banko Tengah - PIT 3 TIMUR",

    // ✅ tambahan PIT 3 TIMUR SEAM
    "BANKO TENGAH - PIT 3 TIMUR SEAM A1",
    "BANKO TENGAH - PIT 3 TIMUR SEAM A2",
    "BANKO TENGAH - PIT 3 TIMUR SEAM B1",
    "BANKO TENGAH - PIT 3 TIMUR SEAM B2",
    "BANKO TENGAH - PIT 3 TIMUR SEAM C",
    "BANKO TENGAH - PIT 3 TIMUR SEAM D",
  ],

  "Mine-Mouth Coal Transportation": [
    "Housekeeping CHO MTB BWE",
    "Housekeeping CHO Inpit",
    "Housekeeping CHO 5",
    "Housekeeping CHO 4",
    "Housekeeping CHO 3",
    "Housekeeping CHO 2",
    "Housekeeping CHO 1",
    "Housekeeping CHO SS 8",
    "Housekeeping Non-Rail",
  ],

  "MTB Mining Operations": [
    "MTB - STOCK TS WESTHAM",
    "MTB - TS CCP MTB",
    "MTB - MTBS",
    "MTB - MTBU",

    // ✅ tambahan SEAM
    "MTB - MTBS SEAM A1",
    "MTB - MTBS SEAM A2",
    "MTB - MTBS SEAM B",
    "MTB - MTBS SEAM C",

    "MTB - MTBU SEAM A1",
    "MTB - MTBU SEAM A2",
    "MTB - MTBU SEAM B",
    "MTB - MTBU SEAM BE",
    "MTB - MTBU SEAM BU",
    "MTB - MTBU SEAM C",
  ],
};
