export const PERMISSIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  APPROVE: "approve",
  EXPORT: "export",
  MANAGE_FLEET: "manage_fleet",
  MANAGE_MASTER_DATA: "manage_master_data",
  VIEW_ALL_SATKER: "view_all_satker",
  MANAGE_USERS: "manage_users",
  UPDATE_TARE_WEIGHT: "update_tare_weight",
};

export const FLEET_TYPE_ACCESS = {
  super_admin: {
    allowedTypes: ["Jembatan", "FOB", "Bypass", "Beltscale"],
    readOnly: false,
    autoWeighBridge: false,
    canSelectWeighBridge: true,
    measurementTypeMap: {
      Jembatan: "Timbangan",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    },
  },
  operator_jt: {
    allowedTypes: ["Jembatan"], 
    autoWeighBridge: true,
    autoMeasurementType: "Timbangan",
    canSelectWeighBridge: false,
    measurementTypeMap: {
      Jembatan: "Timbangan",
    },
  },
  ccr: {
    allowedTypes: ["Jembatan", "FOB", "Bypass", "Beltscale"],
    autoWeighBridge: false,
    autoMeasurementType: null,
    canSelectWeighBridge: true,
    measurementTypeMap: {
      Jembatan: "Timbangan",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    },
  },
  pengawas: {
    allowedTypes: ["Jembatan", "FOB", "Bypass", "Beltscale"],
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
    measurementTypeMap: {
      Jembatan: "Timbangan",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    },
  },
  evaluator: {
    allowedTypes: ["Jembatan", "FOB", "Bypass", "Beltscale"],
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
    measurementTypeMap: {
      Jembatan: "Timbangan",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    },
  },
  checker: {
    allowedTypes: ["Jembatan", "FOB", "Bypass", "Beltscale"],
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
    measurementTypeMap: {
      Jembatan: "Timbangan",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    },
  },
  admin: {
    allowedTypes: ["Jembatan", "FOB", "Bypass", "Beltscale"],
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
    measurementTypeMap: {
      Jembatan: "Timbangan",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    },
  },
  pic: {
    allowedTypes: ["Jembatan", "FOB", "Bypass", "Beltscale"],
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
    measurementTypeMap: {
      Jembatan: "Timbangan",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    },
  },
  mitra: {
    allowedTypes: ["Jembatan", "FOB", "Bypass", "Beltscale"],
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
    measurementTypeMap: {
      Jembatan: "Timbangan",
      Bypass: "Bypass",
      Beltscale: "Beltscale",
    },
  },
};

export const ROLE_PERMISSIONS = {
  operator_jt: {
    timbangan: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.EXPORT,
    ],
    fleet: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE],
    masterData: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE],
    masterDataCategories: ["units"],
    fleetTypes: ["Setting Fleet"],
    autoWeighBridge: true,
    autoMeasurementType: "Timbangan",
    canSelectWeighBridge: false,
    description: "CRU untuk Timbangan Internal only, filter by weigh_bridge",
  },

  checker: {
    timbangan: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
      PERMISSIONS.EXPORT,
    ],
    fleet: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
    ],
    masterData: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
    ],
    fleetTypes: ["Setting Fleet"],
    canSelectWeighBridge: true,
    canDeleteWithRitase: true, 
    description: "CRUD untuk Timbangan/Beltscale/Bypass, filter by company",
  },

  ccr:{
    timbangan: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.EXPORT,
    ],
    fleet: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
    masterData: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE],
    masterDataCategories: ["units"],
    fleetTypes: ["Setting Fleet"],
    autoWeighBridge: true,
    autoMeasurementType: "Timbangan",
    canSelectWeighBridge: true,
    description: "CRU untuk Timbangan Internal only, filter by subsatker",
  },

  pengawas: {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ],
    masterData: [],
    fleetTypes: ["Setting Fleet"],
    description: "Read only, filter by company",
  },

  evaluator: {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ],
    masterData: [],
    fleetTypes: ["Setting Fleet"],
    description: "Read only, filter by subsatker",
  },

  admin: {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ],
    masterData: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE],
    masterDataCategories: ["units","alatLoader","operators"], 
    fleetTypes: ["Setting Fleet"],
    description: "Read only, filter by company",
  },

  mitra: {
    timbangan: [PERMISSIONS.READ],
    fleet: [PERMISSIONS.READ],
    masterData: [],
    fleetTypes: ["Setting Fleet"],
    description: "Read only, filter by company",
  },

  super_admin: {
    timbangan: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
      PERMISSIONS.EXPORT,
    ],
    fleet: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
    ],
    masterData: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
      PERMISSIONS.MANAGE_MASTER_DATA,
    ],
    users: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
      PERMISSIONS.MANAGE_USERS,
    ],
    fleetTypes: ["Setting Fleet"],
    canSelectWeighBridge: true,
    description: "Full access, no filter",
  },
};

/**
 * Get fleet type access configuration for role
 */
export const getFleetTypeAccess = (userRole) => {
  const roleLower = userRole?.toLowerCase();
  return FLEET_TYPE_ACCESS[roleLower] || null;
};

/**
 * Check if role can access specific fleet type
 */
export const canAccessFleetType = (userRole, fleetType) => {
  const rolePerms = ROLE_PERMISSIONS[userRole?.toLowerCase()];
  if (!rolePerms) return false;

  const allowedTypes = rolePerms.fleetTypes;
  if (!allowedTypes) return true;

  return allowedTypes.includes(fleetType);
};

/**
 * Get measurement type for fleet type based on role
 */
export const getMeasurementTypeForFleet = (userRole, fleetType) => {
  const access = getFleetTypeAccess(userRole?.toLowerCase());

  if (!access) return null;

  if (access.autoMeasurementType) {
    return access.autoMeasurementType;
  }

  if (access.measurementTypeMap) {
    return access.measurementTypeMap[fleetType] || null;
  }

  return null;
};

/**
 * Check if role should auto-attach weigh_bridge
 */
export const shouldAutoAttachWeighBridge = (userRole) => {
  const access = getFleetTypeAccess(userRole?.toLowerCase());
  return access?.autoWeighBridge || false;
};

/**
 * Check if role can manually select weigh_bridge
 */
export const canSelectWeighBridge = (userRole) => {
  const rolePerms = ROLE_PERMISSIONS[userRole?.toLowerCase()];
  return rolePerms?.canSelectWeighBridge || false;
};

/**
 * Get filter type for role
 */
export const getFilterType = (userRole) => {
  const rolePerms = ROLE_PERMISSIONS[userRole?.toLowerCase()];
  return rolePerms?.filterBy || null;
};

/**
 * Check if role is read-only
 */
export const isReadOnly = (userRole) => {
  const roleLower = userRole?.toLowerCase();
  const readOnlyRoles = [
    "checker",
    "pengawas",
    "admin",
    "pic",
    "evaluator",
    "mitra",
  ];
  return readOnlyRoles.includes(roleLower);
};

/**
 * Filter data based on role filter type
 */
// ✅ COMPLETE FIXED filterDataByRole function
// Copy this entire function to replace the existing one in rolePermissions.js

/**
 * Filter data based on role filter type
 * ✅ Updated to handle string fields from ritases schema
 */
export const filterDataByRole = (data, userRole, user) => {
  if (!userRole || !user) {
    console.warn('⚠️ filterDataByRole: Missing userRole or user');
    return data;
  }

  const roleLower = userRole.toLowerCase();
  
  // Get filter type from role permissions
  const rolePerms = ROLE_PERMISSIONS[roleLower];
  if (!rolePerms) {
    console.warn(`⚠️ No permissions found for role: ${roleLower}`);
    return data;
  }

  const filterType = rolePerms.filterBy;
  
  if (!filterType) {
    // No filter - return all data (e.g., super_admin)
    return data;
  }

  switch (filterType) {
    case "subsatker": {
      // ✅ For ccr, pengawas, evaluator, pic - filter by subsatker (string)
      const userSubsatker = user?.work_unit?.subsatker || user?.subsatker;
      if (!userSubsatker) {
        console.warn(`⚠️ ${roleLower}: User subsatker not found`);
        return [];
      }

      const filtered = data.filter((item) => {
        // pic_work_unit is a string field in ritases table
        const itemSubsatker = 
          item.pic_work_unit || 
          item.work_unit || 
          item.fleet_work_unit;
        
        const match = itemSubsatker === userSubsatker;
        return match;
      });

      return filtered;
    }

    case "company": {
      // ⚠️ Company filter NOT SUPPORTED because ritases table has no company field
      // All fields are strings, no company relation
      const userCompanyName = user?.company?.name;
      
      console.warn(`⚠️ ${roleLower}: Company filter not supported (field not in schema)`);
      console.warn(`⚠️ Showing all data for company: ${userCompanyName}`);
      
      // Return all data - cannot filter by company
      return data;
    }

    default:
      console.warn(`⚠️ Unknown filter type: ${filterType}`);
      return data;
  }
};


/**
 * ✅ Helper to check if role needs special handling
 */
export const isRestrictedRole = (userRole) => {
  const roleLower = userRole?.toLowerCase();
  const restrictedRoles = [
    "operator_jt",    // Filter by weigh_bridge
    "ccr",            // Filter by subsatker
    "pengawas",       // Filter by subsatker
    "evaluator",      // Filter by subsatker
    "pic",            // Filter by subsatker
  ];
  return restrictedRoles.includes(roleLower);
};

/**
 * ✅ Get filter description for UI
 */
export const getFilterDescription = (userRole, user) => {
  const rolePerms = ROLE_PERMISSIONS[userRole?.toLowerCase()];
  if (!rolePerms || !rolePerms.filterBy) {
    return null;
  }

  switch (rolePerms.filterBy) {
    case "weigh_bridge":
      return `Timbangan: ${user?.weigh_bridge?.name || "Not configured"}`;
    case "subsatker":
      return `Subsatker: ${user?.work_unit?.subsatker || "Not configured"}`;
    case "company":
      return `Company: ${user?.company?.name || "Not configured"}`;
    default:
      return null;
  }
};


export const hasPermission = (userRole, module, permission) => {
  if (!userRole || !module || !permission) return false;

  const roleLower = userRole.toLowerCase();
  const rolePerms = ROLE_PERMISSIONS[roleLower];

  if (!rolePerms) return false;

  const modulePerms = rolePerms[module];
  if (!modulePerms) return false;

  return modulePerms.includes(permission);
};

export const canCreate = (userRole, module) => {
  return hasPermission(userRole, module, PERMISSIONS.CREATE);
};

export const canRead = (userRole, module) => {
  return hasPermission(userRole, module, PERMISSIONS.READ);
};

export const canUpdate = (userRole, module) => {
  return hasPermission(userRole, module, PERMISSIONS.UPDATE);
};

export const canDelete = (userRole, module) => {
  return hasPermission(userRole, module, PERMISSIONS.DELETE);
};

export const canExport = (userRole, module) => {
  return hasPermission(userRole, module, PERMISSIONS.EXPORT);
};

export const getRoleDescription = (userRole) => {
  const roleLower = userRole?.toLowerCase();
  const rolePerms = ROLE_PERMISSIONS[roleLower];
  return rolePerms?.description || "No description available";
};

/**
 * Check if user can access specific master data category
 */
export const canAccessMasterDataCategory = (userRole, categoryId) => {
  if (!userRole || !categoryId) return false;

  const roleLower = userRole.toLowerCase();
  const rolePerms = ROLE_PERMISSIONS[roleLower];

  if (!rolePerms) return false;

  if (!rolePerms.masterDataCategories) {
    return rolePerms.masterData && rolePerms.masterData.length > 0;
  }

  return rolePerms.masterDataCategories.includes(categoryId);
};

/**
 * Get allowed master data categories for user role
 */
export const getAllowedMasterDataCategories = (userRole) => {
  if (!userRole) return [];

  const roleLower = userRole.toLowerCase();
  const rolePerms = ROLE_PERMISSIONS[roleLower];

  if (!rolePerms) return [];

  if (!rolePerms.masterDataCategories) {
    if (rolePerms.masterData && rolePerms.masterData.length > 0) {
      return "all";
    }
    return [];
  }

  return rolePerms.masterDataCategories;
};

/**
 * Check if user can only update tare weight (no create/delete for units)
 */
export const canOnlyUpdateTareWeight = (userRole) => {
  if (!userRole) return false;

  const roleLower = userRole.toLowerCase();
  const rolePerms = ROLE_PERMISSIONS[roleLower];

  if (!rolePerms || !rolePerms.masterData) return false;

  return (
    rolePerms.masterData.includes(PERMISSIONS.UPDATE_TARE_WEIGHT) &&
    !rolePerms.masterData.includes(PERMISSIONS.CREATE) &&
    !rolePerms.masterData.includes(PERMISSIONS.DELETE)
  );
};

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  FLEET_TYPE_ACCESS,
  hasPermission,
  canCreate,
  canRead,
  canUpdate,
  canDelete,
  canExport,
  getFleetTypeAccess,
  canAccessFleetType,
  getMeasurementTypeForFleet,
  shouldAutoAttachWeighBridge,
  canSelectWeighBridge,
  getFilterType,
  isReadOnly,
  filterDataByRole,
  getRoleDescription,
  canAccessMasterDataCategory,
  getAllowedMasterDataCategories,
  canOnlyUpdateTareWeight,
};