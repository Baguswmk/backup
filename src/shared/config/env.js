class EnvironmentConfig {
  constructor() {
    this.env = import.meta.env.VITE_NODE_ENV || "development";
    this.isDevelopment = this.env === "development";
    this.isStaging = this.env === "staging";
    this.isProduction = this.env === "production";

    this.validateRequiredVars();
  }

  get api() {
    return {
      baseUrl: this.getRequired("VITE_API_URL"),
      basePath: this.get("VITE_API_BASE_PATH", "/api"),
      timeout: this.getNumber("VITE_API_TIMEOUT", 5000),
      version: this.get("VITE_API_VERSION", "v1"),
      fullUrl: `${this.getRequired("VITE_API_URL")}${this.get("VITE_API_BASE_PATH", "/api")}`,
      timbanganTimeout: this.getNumber("VITE_TIMBANGAN_TIMEOUT", 5000),
    };
  }

  get websocket() {
    return {
      url: this.getRequired("VITE_WS_URL"),
      timeout: this.getNumber("VITE_SOCKET_TIMEOUT", 20000),
      reconnectionAttempts: this.getNumber(
        "VITE_SOCKET_RECONNECTION_ATTEMPTS",
        5,
      ),
      reconnectionDelay: this.getNumber("VITE_SOCKET_RECONNECTION_DELAY", 1000),
      maxListeners: this.getNumber("VITE_SOCKET_MAX_LISTENERS", 10),
    };
  }

  get auth() {
    return {
      jwtExpiryHours: this.getNumber("VITE_JWT_EXPIRY_HOURS", 24),
      tokenRefreshThreshold: this.getNumber(
        "VITE_TOKEN_REFRESH_THRESHOLD",
        300000,
      ),
      sessionTimeout: this.getNumber("VITE_SESSION_TIMEOUT", 3600000),
    };
  }

  get app() {
    return {
      name: this.get("VITE_APP_NAME", "Barcode System"),
      version: this.get("VITE_APP_VERSION", "1.0.0"),
      description: this.get("VITE_APP_DESCRIPTION", "Barcode Tracking System"),
      buildMode: this.get("VITE_BUILD_MODE", "development"),
    };
  }

  get features() {
    return {
      qrScanner: this.getBoolean("VITE_ENABLE_QR_SCANNER", true),
      barcodeScanner: this.getBoolean("VITE_ENABLE_BARCODE_SCANNER", true),
      excelImport: this.getBoolean("VITE_ENABLE_EXCEL_IMPORT", true),
      slrUpload: this.getBoolean("VITE_ENABLE_SLR_UPLOAD", true),
      realTime: this.getBoolean("VITE_ENABLE_REAL_TIME", true),
      notifications: this.getBoolean("VITE_ENABLE_NOTIFICATIONS", true),
      analytics: this.getBoolean("VITE_ENABLE_ANALYTICS", false),
      errorReporting: this.getBoolean("VITE_ENABLE_ERROR_REPORTING", false),
    };
  }

  get scanner() {
    return {
      qrFps: this.getNumber("VITE_QR_SCANNER_FPS", 10),
      barcodeFps: this.getNumber("VITE_BARCODE_SCANNER_FPS", 10),
      cameraFacingMode: this.get("VITE_CAMERA_FACING_MODE", "environment"),
      cameraAspectRatio: this.getNumber("VITE_CAMERA_ASPECT_RATIO", 1.0),
      timeout: this.getNumber("VITE_SCANNER_TIMEOUT", 30000),
      scanInterval: this.getNumber("VITE_SCAN_INTERVAL", 100),
    };
  }

  get upload() {
    return {
      maxFileSize: this.getNumber("VITE_MAX_FILE_SIZE", 10485760),
      allowedFileTypes: this.getArray("VITE_ALLOWED_FILE_TYPES", [
        ".xlsx",
        ".xls",
      ]),
      chunkSize: this.getNumber("VITE_UPLOAD_CHUNK_SIZE", 1048576),
      maxFilesBatch: this.getNumber("VITE_MAX_FILES_BATCH", 5),
      strictValidation: this.getBoolean("VITE_FILE_VALIDATION_STRICT", true),
    };
  }

  get ui() {
    return {
      defaultTheme: this.get("VITE_DEFAULT_THEME", "system"),
      itemsPerPage: this.getNumber("VITE_ITEMS_PER_PAGE", 20),
      autoRefreshInterval: this.getNumber("VITE_AUTO_REFRESH_INTERVAL", 30000),
      toastDuration: this.getNumber("VITE_TOAST_DURATION", 5000),
      animationDuration: this.getNumber("VITE_ANIMATION_DURATION", 300),
      debounceDelay: this.getNumber("VITE_DEBOUNCE_DELAY", 300),
    };
  }

  get security() {
    return {
      https: this.getBoolean("VITE_ENABLE_HTTPS", false),
      csp: this.getBoolean("VITE_CSP_ENABLED", false),
      cors: this.getBoolean("VITE_CORS_ENABLED", true),
      rateLimit: this.getBoolean("VITE_RATE_LIMIT_ENABLED", false),
    };
  }

  get debug() {
    return {
      logLevel: this.get("VITE_LOG_LEVEL", "info"),
      consoleLog: this.getBoolean("VITE_ENABLE_CONSOLE_LOG", true),
      socket: this.getBoolean("VITE_DEBUG_SOCKET", false),
      api: this.getBoolean("VITE_DEBUG_API", false),
      auth: this.getBoolean("VITE_DEBUG_AUTH", false),
      scanner: this.getBoolean("VITE_DEBUG_SCANNER", false),
      showDevTools: this.getBoolean("VITE_SHOW_DEV_TOOLS", false),
    };
  }

  get performance() {
    return {
      cacheEnabled: this.getBoolean("VITE_CACHE_ENABLED", true),
      cacheDuration: this.getNumber("VITE_CACHE_DURATION", 300000),
      lazyLoading: this.getBoolean("VITE_LAZY_LOADING", true),
      virtualization: this.getBoolean("VITE_VIRTUALIZATION", false),
      compression: this.getBoolean("VITE_COMPRESSION_ENABLED", false),
    };
  }

  get business() {
    return {
      defaultLocation: this.get("VITE_DEFAULT_LOCATION", "118"),
      adminRole: this.get("VITE_ADMIN_ROLE", "admin"),
      availableLocations: this.getArray("VITE_AVAILABLE_LOCATIONS", [
        "118",
        "107",
        "36",
        "portsdj",
      ]),
    };
  }

  get(key, defaultValue = undefined) {
    const value = import.meta.env[key];
    return value !== undefined ? value : defaultValue;
  }

  getRequired(key) {
    const value = import.meta.env[key];
    if (value === undefined || value === "") {
      throw new Error(
        `Environment variable ${key} is required but not defined`,
      );
    }
    return value;
  }

  getNumber(key, defaultValue = 0) {
    const value = this.get(key, defaultValue);
    const number = Number(value);
    return isNaN(number) ? defaultValue : number;
  }

  getBoolean(key, defaultValue = false) {
    const value = this.get(key, defaultValue);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.toLowerCase() === "true" || value === "1";
    }
    return defaultValue;
  }

  getArray(key, defaultValue = []) {
    const value = this.get(key);
    if (!value) return defaultValue;
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return defaultValue;
  }

  getObject(key, defaultValue = {}) {
    const value = this.get(key);
    if (!value) return defaultValue;
    if (typeof value === "object") return value;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  validateRequiredVars() {
    const requiredVars = ["VITE_API_URL", "VITE_WS_URL"];

    const missing = requiredVars.filter((key) => {
      const value = import.meta.env[key];
      return value === undefined || value === "";
    });

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }
  }

  getEnvironmentInfo() {
    return {
      environment: this.env,
      isDevelopment: this.isDevelopment,
      isStaging: this.isStaging,
      isProduction: this.isProduction,
      apiUrl: this.api.fullUrl,
      wsUrl: this.websocket.url,
      appName: this.app.name,
      appVersion: this.app.version,
      features: Object.entries(this.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
      buildMode: this.app.buildMode,
      timestamp: new Date().toISOString(),
    };
  }

  logEnvironmentInfo() {
    if (this.isDevelopment && this.debug.consoleLog) {
      console.group("🌍 Environment Configuration");
      console.table(this.getEnvironmentInfo());
      console.groupEnd();
    }
  }
}

export const env = new EnvironmentConfig();

env.logEnvironmentInfo();

export const {
  api: apiConfig,
  websocket: wsConfig,
  auth: authConfig,
  app: appConfig,
  features,
  scanner: scannerConfig,
  upload: uploadConfig,
  ui: uiConfig,
  security: securityConfig,
  debug: debugConfig,
  performance: performanceConfig,
  business: businessConfig,
} = env;

export const { isDevelopment, isStaging, isProduction } = env;
