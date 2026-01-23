import { useState } from "react";
import { showToast } from "@/shared/utils/toast";

export class AppError extends Error {
  constructor(message, code = "UNKNOWN_ERROR", details = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

const ERROR_MESSAGES = {
  [ERROR_CODES.VALIDATION_ERROR]: "Data yang Anda masukkan tidak valid",
  [ERROR_CODES.NOT_FOUND]: "Data tidak ditemukan",
  [ERROR_CODES.UNAUTHORIZED]: "Anda tidak memiliki akses",
  [ERROR_CODES.FORBIDDEN]: "Aksi ini tidak diizinkan",
  [ERROR_CODES.NETWORK_ERROR]: "Tidak dapat terhubung ke server",
  [ERROR_CODES.SERVER_ERROR]: "Terjadi kesalahan pada server",
  [ERROR_CODES.UNKNOWN_ERROR]: "Terjadi kesalahan yang tidak diketahui",
};

const extractErrorMessage = (error) => {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error.response?.data) {
    const data = error.response.data;

    return (
      data.message ||
      data.error?.message ||
      data.error ||
      error.message ||
      ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    return (
      error.message ||
      error.error?.message ||
      error.error ||
      ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
    );
  }

  return ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
};

export const handleApiResponse = (result) => {
  if (!result) {
    return {
      success: false,
      error: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    };
  }

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error:
      result.error ||
      result.message ||
      ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
  };
};

export const validateResponse = (response, operation = "operation") => {
  if (!response) {
    throw new AppError(
      `No response from ${operation}`,
      ERROR_CODES.SERVER_ERROR,
    );
  }

  if (!response.success) {
    throw new AppError(
      response.error || response.message || `Failed to ${operation}`,
      response.code || ERROR_CODES.UNKNOWN_ERROR,
    );
  }

  return response;
};

export const handleError = (error, options = {}) => {
  const {
    showNotification = true,
    logToConsole = true,
    defaultMessage = "Terjadi kesalahan",
    operation = "unknown operation",
  } = options;

  const errorMessage = extractErrorMessage(error) || defaultMessage;

  if (logToConsole) {
    console.error(`❌ Error in ${operation}:`, {
      message: errorMessage,
      error: error,
      timestamp: new Date().toISOString(),
    });
  }

  if (showNotification) {
    showToast.error(errorMessage);
  }

  return {
    success: false,
    error: errorMessage,
  };
};

export const withErrorHandling = async (asyncFn, options = {}) => {
  const {
    operation = "operation",
    onSuccess = null,
    onError = null,
    showSuccessToast = false,
    successMessage = "Berhasil",
    defaultMessage = null,
  } = options;

  try {
    const result = await asyncFn();

    const response = handleApiResponse(result);

    if (response.success) {
      if (showSuccessToast) {
        showToast.success(successMessage);
      }

      if (onSuccess) {
        onSuccess(response.data);
      }

      return response;
    }

    if (onError) {
      onError(response.error);
    }

    return handleError(response.error, {
      operation,
      defaultMessage: defaultMessage || response.error,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    if (onError) {
      onError(errorMessage);
    }

    return handleError(error, {
      operation,
      defaultMessage: defaultMessage || `Gagal ${operation}`,
    });
  }
};

export const createValidationError = (message, details = null) => {
  return new AppError(message, ERROR_CODES.VALIDATION_ERROR, details);
};

export const createNetworkError = (
  message = ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
) => {
  return new AppError(message, ERROR_CODES.NETWORK_ERROR);
};

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeWithErrorHandler = async (asyncFn, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await withErrorHandling(asyncFn, {
        ...options,
        onError: (err) => {
          const errorMessage = extractErrorMessage(err);
          setError(errorMessage);
          options.onError?.(errorMessage);
        },
      });

      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    error,
    isLoading,
    setError,
    clearError,
    executeWithErrorHandler,
  };
};

export default {
  AppError,
  ERROR_CODES,
  handleApiResponse,
  handleError,
  withErrorHandling,
  validateResponse,
  createValidationError,
  createNetworkError,
  useErrorHandler,
  extractErrorMessage,
};
