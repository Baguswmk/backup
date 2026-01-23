import axios from "axios";
import io from "socket.io-client";
import { apiConfig, wsConfig } from "@/shared/config/env";
import { secureStorage } from "@/shared/storage/secureStorage";
import { isSessionExpired } from "@/shared/storage/session";

const apiClient = axios.create({
  baseURL: apiConfig.fullUrl,
  timeout: apiConfig.timeout,
  headers: {
    "Content-Type": "application/json",
    "X-API-Version": apiConfig.version,
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const isAuthEndpoint =
      config.url?.includes("/auth/") ||
      config.url?.includes("/login") ||
      config.url?.includes("/register");

    if (isAuthEndpoint) {
      return config;
    }

    const logoutFlag = secureStorage.getItem("logout_flag");
    if (logoutFlag && Date.now() - logoutFlag < 5000) {
      throw new axios.Cancel("Request cancelled due to recent logout");
    }

    const token = secureStorage.getItem("auth_token");

    if (token && isSessionExpired()) {
      secureStorage.removeItem("auth_token");
      secureStorage.removeItem("user_data");
      secureStorage.removeItem("login_timestamp");
      secureStorage.removeItem("timbangan_store");
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/timbangan-internal/login")
      ) {
        window.location.replace("/timbangan-internal/login");
      }

      throw new axios.Cancel("Session expired, redirecting to login");
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export { apiClient };

let socketConnection = null;

export const connectWebSocket = () => {
  if (!socketConnection && wsConfig.enabled) {
    socketConnection = io(wsConfig.url, {
      transports: ["websocket"],
      timeout: wsConfig.timeout,
    });

    socketConnection.on("connect", () => {});

    socketConnection.on("disconnect", () => {});
  }

  return socketConnection;
};

export const disconnectWebSocket = () => {
  if (socketConnection) {
    socketConnection.disconnect();
    socketConnection = null;
  }
};
