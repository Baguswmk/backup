import { secureStorage } from "@/shared/storage/secureStorage";
import { getFirstTruthyValue } from "@/shared/utils/object";

class LogService {
  constructor() {
    this.isProduction = import.meta.env.NODE_ENV === "production";
    this.logQueue = [];
    this.isProcessing = false;
    this.maxQueueSize = 100;
    this.flushInterval = 5000;
  }

  debug(message, data = {}) {
    this.log("DEBUG", message, data);
  }

  info(message, data = {}) {
    this.log("INFO", message, data);
  }

  warn(message, data = {}) {
    this.log("WARN", message, data);
  }

  error(message, data = {}) {
    this.log("ERROR", message, data);
  }

  fatal(message, data = {}) {
    this.log("FATAL", message, data);
  }

  log(level, message, data = {}) {
    const logEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
    };

    this.addToQueue(logEntry);
  }

  logUserAction(action, details = {}) {
    this.info(`User Action: ${action}`, {
      action,
      ...details,
      category: "user_action",
    });
  }

  logScanActivity(scanType, result, locationId, details = {}) {
    this.info(`Scan Activity: ${scanType}`, {
      scanType,
      result: this.truncateString(result, 100),
      locationId,
      ...details,
      category: "scan_activity",
    });
  }

  logApiCall(method, url, status, duration, details = {}) {
    const level = status >= 400 ? "ERROR" : "INFO";
    this.log(level, `API Call: ${method} ${url}`, {
      method,
      url,
      status,
      duration,
      ...details,
      category: "api_call",
    });
  }

  logPerformance(metric, value, details = {}) {
    this.info(`Performance: ${metric}`, {
      metric,
      value,
      ...details,
      category: "performance",
    });
  }

  addToQueue(logEntry) {
    this.logQueue.push(logEntry);

    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue = this.logQueue.slice(-this.maxQueueSize);
    }
  }

  sanitizeData(data) {
    if (typeof data !== "object" || data === null) return data;

    const sensitiveKeys = ["password", "token", "apiKey", "secret", "key"];

    const sanitize = (obj) => {
      if (typeof obj !== "object" || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map((item) => sanitize(item));
      }

      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();
        const isSensitive = sensitiveKeys.some((sk) =>
          keyLower.includes(sk.toLowerCase()),
        );

        if (isSensitive) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    try {
      return sanitize(data);
    } catch (error) {
      console.error("Failed to sanitize data:", error);
      return { error: "Failed to sanitize data" };
    }
  }

  truncateString(str, maxLength) {
    if (typeof str !== "string") return str;
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  }

  getCurrentUserId() {
    try {
      const userData = secureStorage.getItem("user_data");
      if (!userData) return "anonymous";

      const parsed = JSON.parse(userData);

      return (
        getFirstTruthyValue(parsed, "id", "userId", "user_id") || "anonymous"
      );
    } catch {
      return "anonymous";
    }
  }

  getSessionId() {
    try {
      let sessionId = sessionStorage.getItem("session_id");
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem("session_id", sessionId);
      }
      return sessionId;
    } catch {
      return "unknown_session";
    }
  }

  getQueueStatus() {
    return {
      queueLength: this.logQueue.length,
      isProcessing: this.isProcessing,
      maxQueueSize: this.maxQueueSize,
    };
  }

  clearQueue() {
    this.logQueue = [];
  }
}

export const logger = new LogService();

export { LogService };
