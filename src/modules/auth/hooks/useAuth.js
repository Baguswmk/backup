import useAuthStore from "@/modules/auth/store/authStore";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { logger } from "@/shared/services/log";
import { ROLE_CONFIG } from "@/shared/permissions/roleConfig";

export const useAuth = () => {
  const store = useAuthStore();
  const navigate = useNavigate();

  const getUserApps = () => {
    if (!store.user) return [];
    return ROLE_CONFIG.getAppsForRole(store.user.role);
  };

  const hasAppAccess = (appKey) => {
    if (!store.user) return false;
    return ROLE_CONFIG.hasAppAccess(store.user.role, appKey);
  };

  const getDefaultApp = () => {
    if (!store.user) return null;

    const userRole = store.user.role;

    const rolePriorities = {
      ...(ROLE_CONFIG.isRoleInGroup(userRole, "ADMIN") && {
        [userRole]: ["b-trace", "document", "timbangan-internal"],
      }),

      ...(ROLE_CONFIG.isRoleInGroup(userRole, "BTRACE_DATA_ENTRY") && {
        [userRole]: ["b-trace"],
      }),

      ...(ROLE_CONFIG.isRoleInGroup(userRole, "TIMBANGAN_INTERNAL") && {
        [userRole]: ["timbangan-internal"],
      }),

      ...(ROLE_CONFIG.isRoleInGroup(userRole, "TIMBANGAN_FOB") && {
        [userRole]: ["timbangan-fob"],
      }),

      ...(ROLE_CONFIG.isRoleInGroup(userRole, "TIMBANGAN_FOT") && {
        [userRole]: ["timbangan-fot"],
      }),
    };

    const priorities = rolePriorities[userRole] || [];

    for (const appKey of priorities) {
      if (hasAppAccess(appKey)) {
        return ROLE_CONFIG.getAppConfig(appKey);
      }
    }

    const accessibleApps = getUserApps();
    return accessibleApps.length > 0 ? accessibleApps[0] : null;
  };

  const navigateToApp = (appKey, replace = false) => {
    if (!hasAppAccess(appKey)) {
      logger.warn("Access denied to application", {
        appKey,
        userRole: store.user?.role,
      });
      return false;
    }

    const app = ROLE_CONFIG.getAppConfig(appKey);
    if (!app) {
      logger.error("Unknown application", { appKey });
      return false;
    }

    logger.logUserAction("App Navigation", {
      userId: store.user?.id,
      appKey,
      appName: app.name,
      path: app.path || app.url,
    });

    const targetPath = app.path || app.url;

    if (navigate && app.type === "internal") {
      navigate(targetPath, { replace });
    } else {
      window.location.href = targetPath;
    }

    return true;
  };

  const login = async (
    identifier,
    password,
    forceDirectAccess = false,
    targetApp = null
  ) => {
    try {
      const result = await store.login(identifier, password);

      if (result.success) {
        const userRole = result.data.user.role;
        let redirectPath;

        if (forceDirectAccess && targetApp && hasAppAccess(targetApp)) {
          const appConfig = ROLE_CONFIG.getAppConfig(targetApp);
          redirectPath = appConfig.path || appConfig.url;

          logger.logUserAction("Login Direct to App", {
            userId: result.data.user.id,
            role: userRole,
            targetApp,
            redirectPath,
          });
        } else {
          redirectPath = "/timbangan-internal/hub";

          logger.logUserAction("Login to Hub", {
            userId: result.data.user.id,
            role: userRole,
            redirectPath,
            availableApps: getUserApps().length,
          });
        }

        if (navigate) {
          navigate(redirectPath, { replace: true });
        } else {
          window.location.href = redirectPath;
        }
      }

      return result;
    } catch (error) {
      console.error("Login hook error:", error);

      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Login failed. Please try again.";

      logger.error("Login hook error", {
        error: errorMessage,
        originalError: error,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const loginDirectToApp = async (identifier, password, targetApp) => {
    return await login(identifier, password, true, targetApp);
  };

  const hasLocationAccess = (locationId) => {
    if (!store.user) return false;
    return ROLE_CONFIG.hasLocationAccess(store.user.role, locationId);
  };

  const getUserRoles = (user) => {
    if (!user) return [];
    const raw = user.roles ?? user.role ?? [];
    const arr = Array.isArray(raw) ? raw : [raw];

    return arr
      .map((r) => {
        if (!r) return null;
        if (typeof r === "string") return r;
        if (typeof r === "object") return r.slug ?? r.name ?? null;
        return null;
      })
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
  };

  const hasRole = (...roles) => {
    if (!store?.user) return false;
    const wanted = roles
      .flat()
      .filter(Boolean)
      .map((r) => String(r).toLowerCase());
    if (wanted.length === 0) return false;

    const userRoles = getUserRoles(store.user);
    return userRoles.some((ur) => wanted.includes(ur));
  };

  const getUserLocation = () => {
    if (!store.user) return null;
    return ROLE_CONFIG.getLocationFromRole(store.user.role);
  };

  const getSafeError = () => {
    const error = store.error;
    if (!error) return null;

    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (error?.response?.data?.message) return error.response.data.message;

    try {
      return JSON.stringify(error);
    } catch (e) {
      return "An unknown error occurred";
    }
  };

  useEffect(() => {
    if (!store.isAuthenticated && !store.isLoading) {
      try {
        store.checkAuth();
      } catch (error) {
        console.error("Auth check error:", error);
        logger.error("Auth check failed", {
          error: error?.message || "Unknown error",
        });
      }
    }
  }, [store.isAuthenticated, store.isLoading]);

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: getSafeError(),

    login,
    loginDirectToApp,
    logout: store.logout,
    checkAuth: store.checkAuth,
    clearError: store.clearError,
    updateUser: store.updateUser,
    refreshProfile: store.refreshProfile,

    getUserApps,
    hasAppAccess,
    getDefaultApp,
    navigateToApp,

    hasLocationAccess,
    hasRole,
    getUserLocation,

    isAdmin: ROLE_CONFIG.isRoleInGroup(store.user?.role, "ADMIN"),
    userLocation: getUserLocation(),
    userName: store.user?.name || store.user?.userName || "User",
    userRole: store.user?.role || "unknown",

    roleConfig: ROLE_CONFIG,
  };
};