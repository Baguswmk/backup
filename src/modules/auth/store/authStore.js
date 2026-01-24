import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "@/modules/auth/services/authService";
import { logger } from "@/shared/services/log";
import { secureStorage } from "@/shared/storage/secureStorage";

let isCheckingAuth = false;

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (identifier, password) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authService.login({ identifier, password });

          if (response.success) {
            const { user, token } = response.data;

            const loginTimestamp = Date.now();
            secureStorage.setItem("login_timestamp", loginTimestamp);
            secureStorage.setItem("auth_token", token);
            secureStorage.setItem("user_data", user);

            secureStorage.removeItem("logout");
            secureStorage.removeItem("session_expired");

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            logger.logUserAction("Login Success", {
              userId: user.id,
              role: user.role,
              location: user.location_code,
              timestamp: loginTimestamp,
            });

            return { success: true, data: { user, token } };
          } else {
            set({
              isLoading: false,
              error: response.message || "Login failed",
            });

            logger.warn("Login Failed", {
              error: response.message,
              identifier,
            });

            return { success: false, error: response.message };
          }
        } catch (error) {
          const errorMessage = error.message || "Network error occurred";

          set({
            isLoading: false,
            error: errorMessage,
          });

          logger.error("Login Error", {
            error: errorMessage,
            identifier,
          });

          return { success: false, error: errorMessage };
        }
      },

      checkAuth: async () => {
        if (isCheckingAuth) return;
        isCheckingAuth = true;
        try {
          set({ isLoading: true });

          const token = secureStorage.getItem("auth_token");
          const userData = secureStorage.getItem("user_data");
          const loginTimestamp = secureStorage.getItem("login_timestamp");

          if (!token || !userData || !loginTimestamp) {
            set({ isLoading: false });
            return false;
          }

          const threeDays = 3 * 24 * 60 * 60 * 1000;
          const now = Date.now();
          const isExpired = now - loginTimestamp > threeDays;

          if (isExpired) {
            logger.info("Session expired during auth check");
            get().logout();
            return false;
          }

          try {
            const user = userData;

            const isValid = await authService.validateToken(token);

            if (isValid) {
              set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });

              logger.debug("Auth Check Success", { userId: user.id });
              return true;
            } else {
              logger.info("Token validation failed");
              get().logout();
              return false;
            }
          } catch (parseError) {
            logger.warn("Auth Check Parse Error", {
              error: parseError.message,
            });
            get().logout();
            return false;
          }
        } catch (error) {
          logger.error("Auth Check Error", { error: error.message });
          set({
            isLoading: false,
            error: "Authentication check failed",
          });
          return false;
        } finally {
          isCheckingAuth = false;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      updateUser: (userData) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...userData };
          set({ user: updatedUser });
          secureStorage.setItem("user_data", updatedUser);

          logger.logUserAction("User Profile Updated", {
            userId: updatedUser.id,
          });
        }
      },

      refreshProfile: async () => {
        try {
          const response = await authService.getProfile();

          if (response.success) {
            const updatedUser = response.data;
            set({ user: updatedUser });
            secureStorage.setItem("user_data", updatedUser);

            logger.debug("Profile Refreshed", { userId: updatedUser.id });
            return { success: true, data: updatedUser };
          } else {
            logger.warn("Profile Refresh Failed", { error: response.message });
            return { success: false, error: response.message };
          }
        } catch (error) {
          logger.error("Profile Refresh Error", { error: error.message });
          return { success: false, error: error.message };
        }
      },

      logout: () => {
        logger.info("Logout initiated");

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });

        secureStorage.removeItem("auth_token");
        secureStorage.removeItem("user_data");
        secureStorage.removeItem("login_timestamp");
        secureStorage.setItem("logout_flag", Date.now());
        secureStorage.removeItem("timbangan_store");
        secureStorage.setItem("logout_flag", Date.now());
        secureStorage.removeItem("timbangan-store");
        logger.info("Logout completed");
      },
    }),
    {
      name: "auth-storage",
      storage: {
        getItem: (name) => secureStorage.getItem(name),
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

if (typeof window !== "undefined") {
  setTimeout(() => {
    const logoutFlag = secureStorage.getItem("logout_flag");
    if (!logoutFlag) {
      const store = useAuthStore.getState();
      store.checkAuth();
    } else {
      const flagTime = logoutFlag;
      if (Date.now() - flagTime > 60000) {
        secureStorage.removeItem("logout_flag");
      }
    }
  }, 100);
}

export default useAuthStore;
