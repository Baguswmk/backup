export const ROLE_GROUPS = {
  SUPER_ADMIN: ["super_admin"],

  ADMIN: ["admin", "archive"],

  BTRACE_DATA_ENTRY: [
    "super_admin",
    "data_entry_118",
    "data_entry_in_107",
    "data_entry_out_107",
    "data_entry_in_36",
    "data_entry_out_36",
    "data_entry_sdj",
    "ccr",
  ],

  TIMBANGAN_INTERNAL: [
    "checker",
    "pic",
    "pengawas",
    "operator_jt",
    "evaluator",
    "mitra",
    "admin",
    "super_admin",
    "ccr",
  ],

  TIMBANGAN_FOB: ["operator_timbangan_fob"],
  TIMBANGAN_FOT: ["operator_timbangan_fot"],
  PENGELUARAN_BATUBARA: [ "checker",
    "pic",
    "pengawas",
    "operator_jt",
    "evaluator",
    "mitra",
    "admin",
    "super_admin",
    "ccr",],
  SUPERVISOR: ["supervisor_timbangan", "kepala_timbangan"],
};

export const LOCATION_ROLE_MAP = {
  118: ["data_entry_118"],
  107: ["data_entry_in_107", "data_entry_out_107"],
  36: ["data_entry_in_36", "data_entry_out_36"],
  sdj: ["data_entry_sdj"],
  portsdj: ["data_entry_sdj"],
};

export const APP_ROLES = {
  "b-trace": [...ROLE_GROUPS.ADMIN, ...ROLE_GROUPS.BTRACE_DATA_ENTRY],

  document: ROLE_GROUPS.ADMIN,

  "timbangan-internal": ROLE_GROUPS.TIMBANGAN_INTERNAL,

  "timbangan-fob": [
    ...ROLE_GROUPS.ADMIN,
    ...ROLE_GROUPS.TIMBANGAN_FOB,
    ...ROLE_GROUPS.SUPERVISOR,
  ],

  "timbangan-fot": [
    ...ROLE_GROUPS.ADMIN,
    ...ROLE_GROUPS.TIMBANGAN_FOT,
    ...ROLE_GROUPS.SUPERVISOR,
  ],

  "pengeluaran-batubara": [...ROLE_GROUPS.PENGELUARAN_BATUBARA],
};

export const APP_METADATA = {
  "b-trace": {
    name: "B-Trace Application",
    description: "Batubara Tracking & Analysis System",
    type: "external",
    url: "https://btrace.bukitasam.co.id/timbangan-fob/",
    path: null,
    icon: "BarChart3",
    color: "bg-purple-500 hover:bg-purple-600",
  },

  document: {
    name: "Document Management",
    description: "Digital Document Management System",
    type: "external",
    url: "https://btrace.bukitasam.co.id/timbangan-fob/",
    path: null,
    icon: "FileText",
    color: "bg-indigo-500 hover:bg-indigo-600",
  },

  "timbangan-internal": {
    name: "Batubara Tracking System",
    description: "Internal System Tracking",
    type: "internal",
    url: null,
    path: "/timbangan-internal/apps/",
    icon: "Scale",
    color: "bg-orange-500 hover:bg-orange-600",
    loadingMessage: "Loading Batubara Tracking System...",
  },

  "pengeluaran-batubara": {
    name: "Train Loading System",
    description: "Train Loading System",
    type: "external",
    url: "https://btrace.bukitasam.co.id/pengeluaran-batubara/auth/login",
    path: null,
    icon: "Train",
    color: "bg-green-500 hover:bg-green-600",
    loadingMessage: "Loading Train Loading System...",
  },
};

export const getRolesInGroup = (groupName) => {
  return ROLE_GROUPS[groupName] || [];
};

export const isRoleInGroup = (role, groupName) => {
  const group = ROLE_GROUPS[groupName];
  return group ? group.includes(role) : false;
};

export const getAppConfig = (appKey) => {
  const metadata = APP_METADATA[appKey];
  const roles = APP_ROLES[appKey];

  if (!metadata) return null;

  return {
    key: appKey,
    ...metadata,
    roles: roles || [],
  };
};

export const getAppsForRole = (userRole) => {
  return Object.entries(APP_ROLES)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([appKey]) => {
      const app = getAppConfig(appKey);
      return app;
    })
    .filter(Boolean);
};

export const hasAppAccess = (userRole, appKey) => {
  const appRoles = APP_ROLES[appKey];
  return appRoles ? appRoles.includes(userRole) : false;
};

export const getLocationFromRole = (role) => {
  for (const [location, roles] of Object.entries(LOCATION_ROLE_MAP)) {
    if (roles.includes(role)) {
      return location;
    }
  }
  return null;
};

export const hasLocationAccess = (role, locationId) => {
  if (ROLE_GROUPS.ADMIN.includes(role)) return true;

  const locationRoles = LOCATION_ROLE_MAP[locationId];
  return locationRoles ? locationRoles.includes(role) : false;
};

export const getValidLocations = () => {
  return Object.keys(LOCATION_ROLE_MAP);
};

export const ROLE_CONFIG = {
  groups: ROLE_GROUPS,
  apps: APP_ROLES,
  metadata: APP_METADATA,
  locations: LOCATION_ROLE_MAP,

  getRolesInGroup,
  isRoleInGroup,
  getAppConfig,
  getAppsForRole,
  hasAppAccess,
  getLocationFromRole,
  hasLocationAccess,
  getValidLocations,
};

export default ROLE_CONFIG;
