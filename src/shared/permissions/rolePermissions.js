export const PERMISSIONS = {
  // CRUD Permissions
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // Special Permissions
  APPROVE: 'approve',
  EXPORT: 'export',
  MANAGE_FLEET: 'manage_fleet',
  MANAGE_DUMPTRUCK: 'manage_dumptruck',
  MANAGE_MASTER_DATA: 'manage_master_data',
  VIEW_ALL_SATKER: 'view_all_satker',
  MANAGE_USERS: 'manage_users',
  UPDATE_TARE_WEIGHT: 'update_tare_weight',
};

// Line 7-60 di rolePermissions.js - REPLACE dengan ini:

export const FLEET_TYPE_ACCESS = {
   'super_admin': {
    allowedTypes: ['Jembatan', 'FOB', 'Bypass', 'BeltScale'],
    filterBy: null,
    readOnly: false,
    autoWeighBridge: false,
    canSelectWeighBridge: true,
    measurementTypeMap: {
      'Jembatan': 'Timbangan',
      'FOB': 'Timbangan',
      'Bypass': 'Bypass',
      'BeltScale': 'BeltScale'
    }
  },
  'operator_jt': {
    allowedTypes: ['Jembatan'], 
    autoWeighBridge: true,
    autoMeasurementType: 'Timbangan',
    canSelectWeighBridge: false,
    measurementTypeMap: {
      'Jembatan': 'Timbangan'
    }
  },
  'ccr': {
    allowedTypes: ['Jembatan', 'FOB', 'Bypass', 'BeltScale'],
    autoWeighBridge: false,
    autoMeasurementType: null,
    canSelectWeighBridge: true,
    measurementTypeMap: {
      'Jembatan': 'Timbangan',
      'FOB': 'Timbangan', 
      'Bypass': 'Bypass',
      'BeltScale': 'BeltScale'
    }
  },
  'pengawas': {
    allowedTypes: ['Jembatan', 'FOB', 'Bypass', 'BeltScale'],
    filterBy: 'company',
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
  },
  'checker': {
    allowedTypes: ['Jembatan', 'FOB', 'Bypass', 'BeltScale'],
    filterBy: 'company',
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
  },
  'admin': {
    allowedTypes: ['Jembatan', 'FOB', 'Bypass', 'BeltScale'],
    filterBy: 'company',
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
  },
  'pic': {
    allowedTypes: ['Jembatan', 'FOB', 'Bypass', 'BeltScale'],
    filterBy: 'subsatker',
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
  },
  'evaluator': {
    allowedTypes: ['Jembatan', 'FOB', 'Bypass', 'BeltScale'],
    filterBy: 'subsatker',
    readOnly: true,
    autoWeighBridge: false,
    canSelectWeighBridge: false,
  },
 
};

export const ROLE_PERMISSIONS = {
  // 🔴 READ ONLY ROLES - Hanya bisa melihat (Filter by Company)
  'checker': {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ],
    dumptruck: [PERMISSIONS.READ],
    masterData: [],
    filterBy: 'company',
    description: 'Hanya bisa melihat dan export data timbangan (filter by company)'
  },
  
  'pengawas': {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ],
    dumptruck: [PERMISSIONS.READ],
    masterData: [],
    filterBy: 'company',
    description: 'Hanya bisa melihat dan export (filter by company)'
  },
  
  'admin': {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ],
    dumptruck: [PERMISSIONS.READ],
    masterData: [],
    filterBy: 'company',
    description: 'Hanya bisa melihat (filter by company)'
  },

  // 🟡 READ ONLY ROLES - Filter by Subsatker
  'pic': {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ],
    dumptruck: [PERMISSIONS.READ],
    masterData: [],
    filterBy: 'subsatker',
    description: 'Hanya bisa melihat dan export data (filter by subsatker)'
  },
  
  'evaluator': {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ],
    dumptruck: [PERMISSIONS.READ],
    masterData: [],
    filterBy: 'subsatker',
    description: 'Hanya bisa melihat dan export data untuk evaluasi (filter by subsatker)'
  },

  // 🟢 OPERATOR JT - Full CRUD, auto weigh_bridge, hanya Timbangan
  'operator_jt': {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.EXPORT, PERMISSIONS.CREATE],
    fleet: [PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.CREATE],
    dumptruck: [PERMISSIONS.READ, PERMISSIONS.UPDATE],
    masterData: [PERMISSIONS.READ, PERMISSIONS.UPDATE_TARE_WEIGHT],
    masterDataCategories: ['units'],
    filterBy: 'weigh_bridge',
    fleetTypes: ['Timbangan'], // Hanya bisa akses Timbangan
    autoWeighBridge: true,
    description: 'Full CRUD untuk fleet Timbangan (Jembatan), auto weigh_bridge'
  },

  // 🔵 CCR - Full CRUD, manual weigh_bridge selection, semua fleet types
  'ccr': {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.EXPORT],
    fleet: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.MANAGE_FLEET],
    dumptruck: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.MANAGE_DUMPTRUCK],
    masterData: [PERMISSIONS.READ],
    fleetTypes: ['Timbangan', 'FOB', 'Bypass', 'BeltScale'],
    canSelectWeighBridge: true,
    description: 'Full CRUD untuk semua fleet types, manual weigh_bridge selection'
  },

  // 🟣 SUPER ADMIN - Full access tanpa batasan
  'super_admin': {
    timbangan: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.EXPORT, PERMISSIONS.APPROVE],
    fleet: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.MANAGE_FLEET],
    dumptruck: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.MANAGE_DUMPTRUCK],
    masterData: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.MANAGE_MASTER_DATA],
    users: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.MANAGE_USERS],
    satkerRestricted: false,
    viewAllSatker: true,
    fleetTypes: ['Timbangan', 'FOB', 'Bypass', 'BeltScale'],
    canSelectWeighBridge: true,
    description: 'Full access tanpa batasan'
  },

  // Legacy role - keep for backward compatibility
  'mitra': {
    timbangan: [PERMISSIONS.READ],
    fleet: [PERMISSIONS.READ],
    dumptruck: [PERMISSIONS.READ],
    masterData: [],
    filterBy: 'company',
    description: 'Akses terbatas hanya untuk melihat data'
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
  if (!allowedTypes) return true; // No restriction
  
  return allowedTypes.includes(fleetType);
};

/**
 * Get measurement type for fleet type based on role
 */
export const getMeasurementTypeForFleet = (userRole, fleetType) => {
  const access = getFleetTypeAccess(userRole?.toLowerCase());
  
  if (!access) return null;
  
  // Auto measurement type (untuk operator_jt)
  if (access.autoMeasurementType) {
    return access.autoMeasurementType;
  }
  
  // Mapped measurement type (untuk ccr)
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
  const readOnlyRoles = ['checker', 'pengawas', 'admin', 'pic', 'evaluator', 'mitra'];
  return readOnlyRoles.includes(roleLower);
};

/**
 * Filter data based on role filter type
 */
export const filterDataByRole = (data, userRole, user) => {
  const filterType = getFilterType(userRole);
  
  if (!filterType) return data; // No filter
  
  switch (filterType) {
    case 'company': {
      const userCompanyId = user?.company?.id;
      if (!userCompanyId) return data;
      
      return data.filter(item => {
        const itemCompanyId = item.excavatorCompanyId || 
                            item.company?.id || 
                            item.companyId;
        return String(itemCompanyId) === String(userCompanyId);
      });
    }
    
    case 'subsatker': {
      const userSubsatker = user?.work_unit?.subsatker || 
                           user?.subsatker;
      if (!userSubsatker) return data;
      
      return data.filter(item => {
        const itemSubsatker = item.workUnit || 
                             item.subsatker ||
                             item.work_unit?.subsatker;
        return itemSubsatker === userSubsatker;
      });
    }
    
    case 'weigh_bridge': {
      const userWeighBridgeId = user?.weigh_bridge?.id;
      if (!userWeighBridgeId) return data;
      
      return data.filter(item => {
        const itemWbId = item.weightBridgeId || 
                        item.weigh_bridge?.id;
        return String(itemWbId) === String(userWeighBridgeId);
      });
    }
    
    default:
      return data;
  }
};

// Export existing functions with updates
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
  return rolePerms?.description || 'No description available';
};

/**
 * Check if user can access specific master data category
 */
export const canAccessMasterDataCategory = (userRole, categoryId) => {
  if (!userRole || !categoryId) return false;
  
  const roleLower = userRole.toLowerCase();
  const rolePerms = ROLE_PERMISSIONS[roleLower];
  
  if (!rolePerms) return false;
  
  // If no category restrictions, check if they have any masterData permission
  if (!rolePerms.masterDataCategories) {
    return rolePerms.masterData && rolePerms.masterData.length > 0;
  }
  
  // Check if category is in allowed list
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
  
  // If no restrictions, return all categories
  if (!rolePerms.masterDataCategories) {
    // Check if they have any masterData permission
    if (rolePerms.masterData && rolePerms.masterData.length > 0) {
      return 'all'; // Can access all categories
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
  
  return rolePerms.masterData.includes(PERMISSIONS.UPDATE_TARE_WEIGHT) &&
         !rolePerms.masterData.includes(PERMISSIONS.CREATE) &&
         !rolePerms.masterData.includes(PERMISSIONS.DELETE);
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