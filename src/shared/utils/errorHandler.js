import { useState } from 'react';
import { showToast } from "@/shared/utils/toast";

/**
 * Standard error response structure
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes mapping
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.VALIDATION_ERROR]: 'Data yang Anda masukkan tidak valid',
  [ERROR_CODES.NOT_FOUND]: 'Data tidak ditemukan',
  [ERROR_CODES.UNAUTHORIZED]: 'Anda tidak memiliki akses',
  [ERROR_CODES.FORBIDDEN]: 'Aksi ini tidak diizinkan',
  [ERROR_CODES.NETWORK_ERROR]: 'Tidak dapat terhubung ke server',
  [ERROR_CODES.SERVER_ERROR]: 'Terjadi kesalahan pada server',
  [ERROR_CODES.UNKNOWN_ERROR]: 'Terjadi kesalahan yang tidak diketahui',
};

/**
 * ✅ PERBAIKAN: Extract error message dari berbagai struktur response
 */
const extractErrorMessage = (error) => {
  // Jika error adalah string
  if (typeof error === 'string') {
    return error;
  }

  // Jika error adalah AppError
  if (error instanceof AppError) {
    return error.message;
  }

  // Jika error punya response.data (axios error)
  if (error.response?.data) {
    const data = error.response.data;
    
    // Support berbagai struktur response
    return (
      data.message ||           // {message: "..."}
      data.error?.message ||    // {error: {message: "..."}}
      data.error ||             // {error: "..."}
      error.message ||
      ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
    );
  }

  // Jika error adalah Error object biasa
  if (error instanceof Error) {
    return error.message;
  }

  // Jika error adalah object dengan property message
  if (error && typeof error === 'object') {
    return (
      error.message ||
      error.error?.message ||
      error.error ||
      ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
    );
  }

  return ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
};

/**
 * Handle API response standardization
 * @param {Object} result - API response
 * @returns {{success: boolean, data?: any, error?: string}}
 */
export const handleApiResponse = (result) => {
  if (!result) {
    return { 
      success: false, 
      error: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR] 
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
    error: result.error || result.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
  };
};

/**
 * Validate API response and throw error if failed
 * @param {Object} response - API response
 * @param {string} operation - Operation name for error message
 * @returns {Object} - Valid response
 * @throws {AppError} - If response is invalid or unsuccessful
 */
export const validateResponse = (response, operation = 'operation') => {
  if (!response) {
    throw new AppError(
      `No response from ${operation}`,
      ERROR_CODES.SERVER_ERROR
    );
  }

  if (!response.success) {
    throw new AppError(
      response.error || response.message || `Failed to ${operation}`,
      response.code || ERROR_CODES.UNKNOWN_ERROR
    );
  }

  return response;
};

/**
 * ✅ PERBAIKAN: Handle errors with better message extraction
 * @param {Error|string} error - Error object or message
 * @param {Object} options - Configuration options
 * @returns {{success: false, error: string}}
 */
export const handleError = (error, options = {}) => {
  const {
    showNotification = true,
    logToConsole = true,
    defaultMessage = 'Terjadi kesalahan',
    operation = 'unknown operation',
  } = options;

  // ✅ Extract error message menggunakan helper function
  const errorMessage = extractErrorMessage(error) || defaultMessage;

  // Log to console
  if (logToConsole) {
    console.error(`❌ Error in ${operation}:`, {
      message: errorMessage,
      error: error,
      timestamp: new Date().toISOString(),
    });
  }

  // Show toast notification
  if (showNotification) {
    showToast.error(errorMessage);
  }

  return {
    success: false,
    error: errorMessage,
  };
};

/**
 * ✅ PERBAIKAN: Async operation wrapper dengan error extraction yang lebih baik
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Configuration options
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const withErrorHandling = async (asyncFn, options = {}) => {
  const {
    operation = 'operation',
    onSuccess = null,
    onError = null,
    showSuccessToast = false,
    successMessage = 'Berhasil',
    defaultMessage = null,
  } = options;

  try {
    const result = await asyncFn();
    
    // Handle API response format
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
    
    // Handle unsuccessful API response
    if (onError) {
      onError(response.error);
    }
    
    return handleError(response.error, { 
      operation,
      defaultMessage: defaultMessage || response.error 
    });
    
  } catch (error) {
    // ✅ PERBAIKAN: Extract error message dengan benar
    const errorMessage = extractErrorMessage(error);
    
    if (onError) {
      onError(errorMessage);
    }
    
    return handleError(error, { 
      operation,
      defaultMessage: defaultMessage || `Gagal ${operation}` 
    });
  }
};

/**
 * Validation error helper
 * @param {string} message - Validation error message
 * @param {Object} details - Additional validation details
 * @returns {AppError}
 */
export const createValidationError = (message, details = null) => {
  return new AppError(message, ERROR_CODES.VALIDATION_ERROR, details);
};

/**
 * Network error helper
 * @param {string} message - Error message
 * @returns {AppError}
 */
export const createNetworkError = (message = ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR]) => {
  return new AppError(message, ERROR_CODES.NETWORK_ERROR);
};

/**
 * React hook for error handling with state management
 * @param {string} defaultMessage - Default error message
 * @returns {Object}
 */
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

// Export all utilities
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
  extractErrorMessage, // ✅ Export helper function
};