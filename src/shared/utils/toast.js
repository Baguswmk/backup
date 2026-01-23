
import { toast } from 'sonner';

class ToastDeduplicator {
  constructor() {
    this.activeToasts = new Set();
    this.timeouts = new Map();
  }

  shouldShow(key, duration = 3000) {
    if (this.activeToasts.has(key)) {
      return false; 
    }

    this.activeToasts.add(key);
    
    const timeout = setTimeout(() => {
      this.activeToasts.delete(key);
      this.timeouts.delete(key);
    }, duration + 500);

    this.timeouts.set(key, timeout);
    return true;
  }

  clear() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.activeToasts.clear();
    this.timeouts.clear();
  }
}

const deduplicator = new ToastDeduplicator();

export const showToast = {
  success: (message, options = {}) => {
    const key = `success_${message}`;
    const duration = options.duration || 3000;
    
    if (!deduplicator.shouldShow(key, duration)) {
      return null;
    }

    return toast.success(message, {
      duration,
      ...options
    });
  },

  error: (message, options = {}) => {
    const key = `error_${message}`;
    const duration = options.duration || 5000;
    
    if (!deduplicator.shouldShow(key, duration)) {
      return null; 
    }

    return toast.error(message, {
      duration,
      ...options
    });
  },

  warning: (message, options = {}) => {
    const key = `warning_${message}`;
    const duration = options.duration || 4000;
    
    if (!deduplicator.shouldShow(key, duration)) {
      return null;
    }

    return toast.warning(message, {
      duration,
      ...options
    });
  },

  info: (message, options = {}) => {
    const key = `info_${message}`;
    const duration = options.duration || 4000;
    
    if (!deduplicator.shouldShow(key, duration)) {
      return null;
    }

    return toast.info(message, {
      duration,
      ...options
    });
  },

  loading: (message, options = {}) => {
    const toastId = toast.loading(message, {
      duration: Infinity,
      ...options
    });

    setTimeout(() => {
      toast.dismiss(toastId);
    }, 30000);

    return toastId;
  },

  safeDismiss: (toastId) => {
    try {
      if (toastId) {
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.warn('Failed to dismiss toast:', error);
    }
  },

  promise: (promise, messages, options = {}) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: (data) => {
        return messages.success || data || 'Success!';
      },
      error: (error) => {
        return messages.error || error.message || 'Error occurred';
      }
    }, options);
  },

  apiErrorWithCleanup: (errorResponse, loadingToastId, options = {}) => {
    if (loadingToastId) {
      showToast.safeDismiss(loadingToastId);
    }

    const message = errorResponse?.message || 'Terjadi kesalahan';
    
    let displayMessage = message;
    if (message.includes('tidak ditemukan')) {
      displayMessage = `🔦 ${message}`;
    } else if (message.includes('sudah diproses') || message.includes('sudah terinput')) {
      displayMessage = `⚠️ ${message}`;
    } else if (message.includes('gagal')) {
      displayMessage = `❌ ${message}`;
    } else {
      displayMessage = `🚨 ${message}`;
    }
    
    return showToast.error(displayMessage, {
      duration: 5000,
      description: options.description,
      action: options.action,
      ...options
    });
  },

  handleApiResponse: (response, options = {}) => {
    if (!response) {
      return showToast.error('Response tidak valid', options);
    }

    if (response.status === 'fail' || response.status === 'error') {
      const message = response.message || 'Terjadi kesalahan';
      
      if (message.includes('sudah terinput') || message.includes('sudah diproses')) {
        return showToast.warning(`⚠️ ${message}`, {
          description: 'Data sudah pernah diinput sebelumnya',
          ...options
        });
      } else {
        return showToast.apiErrorWithCleanup(response, null, options);
      }
    }

    if (response.status === 'success' || response.data) {
      const message = response.message || 'Berhasil menyimpan data';
      return showToast.success(`  ${message}`, options);
    }

    return showToast.info('Response diterima', options);
  },
};