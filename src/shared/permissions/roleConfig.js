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
    "ccr"
  ],

  // Timbangan roles
  TIMBANGAN_INTERNAL: [
    "checker",
    "pic",
    "pengawas",
    "operator_jt",
    "evaluator",
    "mitra",
    "admin",
    "super_admin",
    "ccr"
  ],

  TIMBANGAN_FOB: ["operator_timbangan_fob"],
  TIMBANGAN_FOT: ["operator_timbangan_fot"],

  // Supervisor roles
  SUPERVISOR: ["supervisor_timbangan", "kepala_timbangan"],
};

// Location mapping - untuk backward compatibility
export const LOCATION_ROLE_MAP = {
  118: ["data_entry_118"],
  107: ["data_entry_in_107", "data_entry_out_107"],
  36: ["data_entry_in_36", "data_entry_out_36"],
  sdj: ["data_entry_sdj"],
  portsdj: ["data_entry_sdj"],
};

// Application Configuration with role groups
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
};

// App metadata - UPDATED: Semua app bisa punya url atau path
export const APP_METADATA = {
  "b-trace": {
    name: "B-Trace Application",
    description: "Batubara Tracking & Analysis System",
    type: "external",
    url: "https://btrace.bukitasam.co.id/timbangan-fob/",
    path: null, // optional: bisa diisi jika ada internal path
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
    name: "Timbangan Internal",
    description: "Internal Weighing System",
    type: "internal",
    url: null,
    path: '/timbangan-internal/apps/',
    icon: "Scale",
    color: "bg-orange-500 hover:bg-orange-600",
    loadingMessage: "Loading Timbangan Internal...",
  },

  // "timbangan-fob": {
  //   name: "Timbangan FOB",
  //   description: "Free On Board Weighing System",
  //   type: "internal",
  //   url: null,
  //   path: null,
  //   icon: "Scale",
  //   color: "bg-blue-500 hover:bg-blue-600",
  //   loadingMessage: "Loading Timbangan FOB...",
  // },

  // "timbangan-fot": {
  //   name: "Timbangan FOT",
  //   description: "Free On Truck Weighing System",
  //   type: "internal", 
  //   url: null,
  //   path: null,
  //   icon: "Scale",
  //   color: "bg-green-500 hover:bg-green-600",
  //   loadingMessage: "Loading Timbangan FOT...",
  // },
};

// Helper function untuk get all roles in a group
export const getRolesInGroup = (groupName) => {
  return ROLE_GROUPS[groupName] || [];
};

// Helper function untuk check if role is in group
export const isRoleInGroup = (role, groupName) => {
  const group = ROLE_GROUPS[groupName];
  return group ? group.includes(role) : false;
};

// Helper function untuk get app config
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


// Helper function untuk check app access
export const hasAppAccess = (userRole, appKey) => {
  const appRoles = APP_ROLES[appKey];
  return appRoles ? appRoles.includes(userRole) : false;
};

// Get location from role
export const getLocationFromRole = (role) => {
  for (const [location, roles] of Object.entries(LOCATION_ROLE_MAP)) {
    if (roles.includes(role)) {
      return location;
    }
  }
  return null;
};

// Check if role has location access
export const hasLocationAccess = (role, locationId) => {
  // Admin has access to all locations
  if (ROLE_GROUPS.ADMIN.includes(role)) return true;

  const locationRoles = LOCATION_ROLE_MAP[locationId];
  return locationRoles ? locationRoles.includes(role) : false;
};

// Validation helper - get valid locations
export const getValidLocations = () => {
  return Object.keys(LOCATION_ROLE_MAP);
};

// Export combined configuration for easy import
export const ROLE_CONFIG = {
  groups: ROLE_GROUPS,
  apps: APP_ROLES,
  metadata: APP_METADATA,
  locations: LOCATION_ROLE_MAP,

  // Helper methods
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
