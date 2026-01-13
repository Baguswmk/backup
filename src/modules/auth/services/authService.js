import { apiClient } from "@/shared/services/api";
import { logger } from "@/shared/services/log";
import { ROLE_CONFIG } from "@/shared/permissions/roleConfig";

export const authService = {
  async login(credentials) {
    try {
      const { identifier, password, targetApp } = credentials;

      logger.info("Login attempt", { identifier, targetApp });

      const authResponse = await apiClient.post("/auth/local", {
        identifier,
        password,
      });

      const { jwt } = authResponse.data;

      const userResponse = await apiClient.get("/users/me", {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        params: {
          populate: [
            "role",
            "company",
            "work_unit",
            "weigh_bridge",
            "app_access",
            "permissions",
          ],
        },
      });

      const rawUser = userResponse.data;

      const normalizedUser = this.normalizeUserData(rawUser);

      if (targetApp) {
        const hasAccess = this.validateAppAccess(
          normalizedUser.role,
          targetApp
        );

        if (!hasAccess) {
          logger.warn("User does not have access to target app", {
            userId: normalizedUser.id,
            role: normalizedUser.role,
            targetApp,
          });

          return {
            success: false,
            message: `Anda tidak memiliki akses ke aplikasi ${targetApp}. Hubungi administrator.`,
          };
        }

        normalizedUser.target_app = targetApp;
      }

      logger.info("Login successful", {
        userId: normalizedUser.id,
        username: normalizedUser.username,
        role: normalizedUser.role,
        targetApp: targetApp || "hub",
        company: normalizedUser.company?.name,
        workUnit: normalizedUser.work_unit?.subsatker,
        weightBridge: normalizedUser.weigh_bridge?.name,
      });

      return {
        success: true,
        data: {
          user: normalizedUser,
          token: jwt,
        },
      };
    } catch (error) {
      logger.error("Login failed", {
        error: error.message,
        identifier: credentials.identifier,
        targetApp: credentials.targetApp,
      });

      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        "Login gagal. Periksa username dan password Anda.";

      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  normalizeUserData(rawUser) {
    const role = this.normalizeRole(
      rawUser.role?.name || rawUser.role_custom || rawUser.role || "user"
    );

    return {
      // Basic user info
      id: rawUser.id,
      username: this.normalizeUsername(rawUser.username),
      email: this.normalizeEmail(rawUser.email),
      confirmed: Boolean(rawUser.confirmed),
      blocked: Boolean(rawUser.blocked),

      // Role information
      role: role,
      role_custom: rawUser.role_custom || null,
      is_admin: this.isAdminRole(role),

      // Related entities - normalized
      company: this.normalizeCompany(rawUser.company),
      work_unit: this.normalizeWorkUnit(rawUser.work_unit),
      weigh_bridge: this.normalizeWeightBridge(rawUser.weigh_bridge),

      // Timestamps
      createdAt: this.normalizeDate(rawUser.createdAt),
      updatedAt: this.normalizeDate(rawUser.updatedAt),
    };
  },

  normalizeDate(date) {
    if (!date) return null;

    try {
      const dateObj = new Date(date);
      return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
    } catch (error) {
      return null;
    }
  },

  /**
   * Normalize username - trim and lowercase
   */
  normalizeUsername(username) {
    if (!username) return "";
    return String(username).trim();
  },

  /**
   * Normalize email - trim and lowercase
   */
  normalizeEmail(email) {
    if (!email) return "";
    return String(email).trim().toLowerCase();
  },

  /**
   * Normalize company data structure
   */
  normalizeCompany(company) {
    if (!company) return null;

    // Handle Strapi v4 format: { data: { id, attributes: {...} } }
    const companyData = company.data || company;
    const attributes = companyData.attributes || companyData;

    return {
      id: companyData.id || company.id || null,
      name: String(attributes.name || company.name || "").trim(),
      code: String(attributes.code || company.code || "").trim(),
      type: String(attributes.type || company.type || "").trim(),
    };
  },

  /**
   * Normalize work unit data structure
   */
  normalizeWorkUnit(workUnit) {
    if (!workUnit) return null;

    // Handle Strapi v4 format
    const workUnitData = workUnit.data || workUnit;
    const attributes = workUnitData.attributes || workUnitData;

    return {
      id: workUnitData.id || workUnit.id || null,
      subsatker: String(
        attributes.subsatker || workUnit.subsatker || ""
      ).trim(),
      satker: String(attributes.satker || workUnit.satker || "").trim(),
      name: String(attributes.name || workUnit.name || "").trim(),
    };
  },

  /**
   * Normalize weight bridge data structure
   */
  normalizeWeightBridge(weightBridge) {
    if (!weightBridge) return null;

    const bridgeData = weightBridge.data || weightBridge;
    const attributes = bridgeData.attributes || bridgeData;

    return {
      id: bridgeData.id || weightBridge.id || null,
      name: (attributes.name || "").trim(),
      ws_url: attributes.ws_url || null,

      operators: attributes.operators || [],
      setting_fleets: attributes.setting_fleets || [],
    };
  },

  /**
   * Normalize role string - convert to standardized format
   */
  normalizeRole(role) {
    if (!role) return "user";

    const roleStr = String(role).toLowerCase().trim();

    const roleMapping = {
      // Admin roles
      admin: "admin",
      super_admin: "super_admin",
      archive: "archive",
      administrator: "admin",

      // B-Trace data entry roles
      data_entry_118: "data_entry_118",
      data_entry_in_107: "data_entry_in_107",
      data_entry_out_107: "data_entry_out_107",
      data_entry_in_36: "data_entry_in_36",
      data_entry_out_36: "data_entry_out_36",
      data_entry_sdj: "data_entry_sdj",

      // Timbangan internal roles
      checker: "checker",
      pic: "pic",
      pengawas: "pengawas",
      operator_jt: "operator_jt",
      evaluator: "evaluator",
      mitra: "mitra",

      // Timbangan FOB/FOT roles
      operator_timbangan_fob: "operator_timbangan_fob",
      operator_timbangan_fot: "operator_timbangan_fot",

      // Supervisor roles
      supervisor_timbangan: "supervisor_timbangan",
      kepala_timbangan: "kepala_timbangan",

      // Generic roles
      user: "user",
      viewer: "viewer",
      editor: "editor",
      manager: "manager",
    };

    return roleMapping[roleStr] || roleStr;
  },

  validateAppAccess(userRole, appKey) {
    return ROLE_CONFIG.hasAppAccess(userRole, appKey);
  },

  async validateToken(token, appContext = null) {
    try {
      const params = {
        populate: ["role", "company", "work_unit", "weigh_bridge"],
      };

      const response = await apiClient.get("/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      if (appContext) {
        const user = this.normalizeUserData(response.data);
        const hasAccess = this.validateAppAccess(user.role, appContext);

        if (!hasAccess) {
          logger.warn("User lost access to app", {
            userId: user.id,
            role: user.role,
            appContext,
          });
          return false;
        }
      }

      return response.status === 200;
    } catch (error) {
      logger.warn("Token validation failed", {
        error: error.message,
        appContext,
      });
      return false;
    }
  },

  async getProfile(includeAppAccess = true) {
    try {
      const populate = ["role", "company", "work_unit", "weigh_bridge"];

      if (includeAppAccess) {
        populate.push("app_access", "permissions");
      }

      const response = await apiClient.get("/users/me", {
        params: { populate },
      });

      const normalizedUser = this.normalizeUserData(response.data);

      logger.info("Profile fetched", {
        userId: normalizedUser.id,
        role: normalizedUser.role,
      });

      return {
        success: true,
        data: normalizedUser,
      };
    } catch (error) {
      logger.error("Get profile failed", { error: error.message });
      return {
        success: false,
        message: error.response?.data?.error?.message || error.message,
      };
    }
  },


  isAdminRole(role) {
    return ROLE_CONFIG.isRoleInGroup(role, "ADMIN");
  },

  isSuperAdmin(role) {
    return role === "super_admin";
  },

  isTimbanganRole(role) {
    const timbanganRoles = [
      ...ROLE_CONFIG.groups.TIMBANGAN_INTERNAL,
      ...ROLE_CONFIG.groups.TIMBANGAN_FOB,
      ...ROLE_CONFIG.groups.TIMBANGAN_FOT,
      ...ROLE_CONFIG.groups.SUPERVISOR,
    ];
    return timbanganRoles.includes(role);
  },

  isBTraceRole(role) {
    return ROLE_CONFIG.isRoleInGroup(role, "BTRACE_DATA_ENTRY");
  },
};

export default authService;
