import { useMemo, useCallback } from "react";
import useAuthStore from "@/modules/auth/store/authStore";
import {
  PERMISSIONS,
  canCreate,
  canRead,
  canUpdate,
  canDelete,
  canExport,
  getFleetTypeAccess,
  canAccessFleetType,
  getMeasurementTypeForFleet,
  shouldAutoAttachWeighBridge,
  canSelectWeighBridge as canSelectWeighBridgePermission,
  getFilterType,
  isReadOnly,
  filterDataByRole,
  getRoleDescription,
} from "@/shared/permissions/rolePermissions";

export const usePermissions = (module = "timbangan") => {
  const { user } = useAuthStore();

  const userRole = user?.role;
  const userSatker =
  user?.work_unit?.satker ||
    user?.work_unit?.subsatker ||
    (typeof user?.work_unit === "string" ? user?.work_unit : null);

  const userCompany = user?.company;
  const userWeighBridge = user?.weigh_bridge;

  const permissions = useMemo(() => {
    if (!userRole) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canExport: false,
        isReadOnly: false,

        allowedFleetTypes: [],
        canAccessFleetType: () => false,
        getMeasurementType: () => null,
        autoWeighBridge: false,
        canSelectWeighBridge: false,

        filterType: null,
        filterValue: null,

        roleDescription: "No role assigned",
      };
    }

    const fleetTypeAccess = getFleetTypeAccess(userRole);
    const filterType = getFilterType(userRole);

    let filterValue = null;
    switch (filterType) {
      case "company":
        filterValue = userCompany?.id;
        break;
      case "subsatker":
        filterValue = userSatker;
        break;
      case "weigh_bridge":
        filterValue = userWeighBridge?.id;
        break;
    }

    return {
      canCreate: canCreate(userRole, module),
      canRead: canRead(userRole, module),
      canUpdate: canUpdate(userRole, module),
      canDelete: canDelete(userRole, module),
      canExport: canExport(userRole, module),
      isReadOnly: isReadOnly(userRole),

      allowedFleetTypes: fleetTypeAccess?.allowedTypes || [],
      canAccessFleetType: (type) => canAccessFleetType(userRole, type),
      getMeasurementType: (type) => getMeasurementTypeForFleet(userRole, type),
      autoWeighBridge: shouldAutoAttachWeighBridge(userRole),
      canSelectWeighBridge: canSelectWeighBridgePermission(userRole),

      filterType,
      filterValue,
      filterBy: filterType,

      roleDescription: getRoleDescription(userRole),
    };
  }, [userRole, module, userSatker, userCompany, userWeighBridge]);

  const filterDataBySatker = (data = []) => {
    if (!userRole || !data || data.length === 0) return data;
    return filterDataByRole(data, userRole, user);
  };

  const checkDataAccess = (item) => {
    if (!userRole) return false;
    if (isReadOnly(userRole)) {
      const filtered = filterDataByRole([item], userRole, user);
      return filtered.length > 0;
    }
    return true;
  };

  const validateCCRSubsatker = useCallback(() => {
    if (userRole?.toLowerCase() !== "ccr") return null;

    if (!userSatker) {
      return {
        isValid: false,
        message:
          "Data tidak dapat difilter karena subsatker tidak ditemukan. Silakan hubungi admin untuk konfigurasi work unit Anda.",
      };
    }

    return { isValid: true };
  }, [userRole, userSatker]);

  const getDisabledMessage = (action) => {
    if (!userRole) return "Please login to continue";

    if (permissions.isReadOnly) {
      return "Anda hanya memiliki akses read-only untuk data ini";
    }

    const messages = {
      create: "Anda tidak memiliki akses untuk membuat data",
      update: "Anda tidak memiliki akses untuk mengedit data",
      delete: "Anda tidak memiliki akses untuk menghapus data",
      export: "Anda tidak memiliki akses untuk export data",
    };

    return messages[action] || "Akses ditolak";
  };

  const shouldShowButton = (action) => {
    if (
      permissions.isReadOnly &&
      ["create", "update", "delete"].includes(action)
    ) {
      return false;
    }

    const actionMap = {
      create: permissions.canCreate,
      update: permissions.canUpdate,
      delete: permissions.canDelete,
      export: permissions.canExport,
    };

    return actionMap[action] !== undefined ? actionMap[action] : false;
  };

  const getFleetFormConfig = useCallback(
    (fleetType) => {
      const measurementType = permissions.getMeasurementType(fleetType);
      const autoWB = permissions.autoWeighBridge;

      return {
        showWeighBridgeSelect: permissions.canSelectWeighBridge && !autoWB,
        autoWeighBridge: autoWB,
        weighBridgeValue: autoWB ? userWeighBridge?.id : null,

        showMeasurementTypeSelect: !measurementType && !autoWB,
        autoMeasurementType: measurementType,
        measurementTypeValue: measurementType,
        measurementTypeDisabled: !!measurementType,
      };
    },
    [permissions, userWeighBridge],
  );

  return {
    user,
    userRole,
    userSatker,
    userCompany,
    userWeighBridge,

    ...permissions,

    checkDataAccess,
    filterDataBySatker,
    validateCCRSubsatker,
    getDisabledMessage,
    shouldShowButton,
    getFleetFormConfig,

    PERMISSIONS,
    checkHaulerAccess,
  };
};

export const checkHaulerAccess = (username, role, haulerName) => {
  if (!username || !role || !haulerName) return false;
  const roleLower = role.toLowerCase();

  // If not operator, allow all (admin/ccr/etc)
  if (roleLower !== "operator") return true;

  // Normalize by removing spaces, underscores, and dashes
  const userNorm = username.toLowerCase().replace(/[\s_-]/g, "");
  const haulerNorm = haulerName.toLowerCase().replace(/[\s_-]/g, "");

  // Keywords to check based on user request -> normalized (e.g., chf4, chf5, ss8, bpi, pltuba)
  const keywords = ["chf4", "chf5", "ss8", "bpi", "pltuba"];

  for (const kw of keywords) {
    if (userNorm.includes(kw) && haulerNorm.includes(kw)) {
      return true;
    }
  }

  return false;
};

export const useFleetPermissions = () => {
  const basePermissions = usePermissions("fleet");

  return {
    ...basePermissions,

    isFleetTypeAllowed: (type) => {
      return basePermissions.allowedFleetTypes.includes(type);
    },

    getAvailableFleetTypes: () => {
      return basePermissions.allowedFleetTypes;
    },

    shouldShowFleetTypeMenu: (type) => {
      return basePermissions.canAccessFleetType(type);
    },
  };
};

export const useRitasePermissions = () => usePermissions("ritase");
export const useMasterDataPermissions = () => usePermissions("masterData");

export default usePermissions;
