import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { offlineService } from "@/shared/services/offlineService";
import { showToast } from "@/shared/utils/toast";

/**
 * Always returns a plain string safe to pass to showToast / render in JSX.
 * Axios error objects have keys like config, request, response, status — 
 * passing them directly to sonner causes "Objects are not valid as a React child".
 */
function safeMsg(value, fallback = "Terjadi kesalahan") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  // Axios error or any Error instance
  if (value instanceof Error) return value.message || fallback;
  // Plain object — try common message fields
  if (typeof value === "object") {
    return (
      value?.response?.data?.message ||
      value?.response?.data?.error ||
      value?.message ||
      fallback
    );
  }
  return fallback;
}

const OfflineContext = createContext(null);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within OfflineProvider");
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSync: null,
    pendingCount: 0,
    failedCount: 0,
    sentCount: 0,
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef(null);
  const updateBatchRef = useRef([]);
  const updateTimerRef = useRef(null);

  const batchStateUpdate = useCallback((updates) => {
    updateBatchRef.current = { ...updateBatchRef.current, ...updates };

    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    updateTimerRef.current = setTimeout(() => {
      setSyncStatus((prev) => ({
        ...prev,
        ...updateBatchRef.current,
      }));
      updateBatchRef.current = {};
    }, 150);
  }, []);

  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      if (!isSyncingRef.current && isOnline) {
        syncPendingData();
      }
    }, 3000);
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast.success("Koneksi internet tersambung");

      if (autoSyncEnabled) {
        debouncedSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast.warning(
        "Koneksi internet terputus. Data akan disimpan secara offline.",
      );
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline && autoSyncEnabled) {
        debouncedSync();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [autoSyncEnabled, isOnline, debouncedSync]);

  const loadPendingCount = useCallback(async () => {
    try {
      const stats = await offlineService.getQueueStats();

      batchStateUpdate({
        pendingCount: stats.pending,
        failedCount: stats.failed,
        sentCount: stats.sent,
      });
      
      return stats.pending;
    } catch (error) {
      console.error("Failed to load pending count:", error);
      return 0;
    }
  }, [batchStateUpdate]);

  const syncPendingData = useCallback(async () => {
    if (!isOnline) {
      showToast.warning("Tidak ada koneksi internet");
      return { success: false, error: "No internet connection" };
    }

    if (isSyncingRef.current) {
      return { success: false, error: "Sync already in progress" };
    }

    isSyncingRef.current = true;
    batchStateUpdate({ isSyncing: true });

    try {
      const result = await offlineService.syncAllPending();

      batchStateUpdate({
        isSyncing: false,
        lastSync: new Date().toISOString(),
        pendingCount: result.failed || 0,
        failedCount: result.failed || 0,
      });

      if (result.success) {
        if (result.synced > 0) {
          showToast.success(`✅ ${result.synced} data berhasil disinkronkan`);
        }
        if (result.failed > 0) {
          showToast.warning(`⚠️ ${result.failed} data gagal disinkronkan`);
        }
      }

      // Reload counts to update sent count
      await loadPendingCount();

      return result;
    } catch (error) {
      console.error("❌ Sync failed:", error);
      batchStateUpdate({ isSyncing: false });
      showToast.error("Gagal menyinkronkan data");
      return { success: false, error: error.message };
    } finally {
      isSyncingRef.current = false;
    }
  }, [isOnline, batchStateUpdate, loadPendingCount]);

  const retryFailed = useCallback(async () => {
    if (!isOnline) {
      showToast.warning("Tidak ada koneksi internet");
      return { success: false };
    }

    if (isSyncingRef.current) {
      showToast.warning("Sinkronisasi sedang berjalan");
      return { success: false };
    }

    try {
      const result = await offlineService.retryFailed();

      if (result.success && result.synced > 0) {
        showToast.success(`✅ ${result.synced} data berhasil disinkronkan`);
        await loadPendingCount();
      }

      return result;
    } catch (error) {
      console.error("Failed to retry:", error);
      showToast.error("Gagal mengulang sinkronisasi");
      return { success: false, error: error.message };
    }
  }, [isOnline, loadPendingCount]);

  /**
   * ✅ NEW: Sync single item by ID
   */
  const syncSingle = useCallback(
    async (itemId) => {
      if (!isOnline) {
        showToast.warning("Tidak ada koneksi internet");
        return { success: false, error: "No internet connection" };
      }

      if (!itemId) {
        showToast.error("ID item tidak valid");
        return { success: false, error: "Invalid item ID" };
      }

      try {
        // Get the item from queue
        const queue = await offlineService.getQueue();
        const item = queue.find((q) => q.id === itemId);

        if (!item) {
          showToast.error("Data tidak ditemukan");
          return { success: false, error: "Item not found" };
        }

        // Sync this single item
        const result = await offlineService.syncQueueItem(item);

        if (result.success) {
          showToast.success("✅ Data berhasil disinkronkan");
          await loadPendingCount();
          return { success: true };
        } else {
          const errMsg = safeMsg(result.error, "Gagal menyinkronkan data");
          showToast.error(errMsg);
          return { success: false, error: errMsg };
        }
      } catch (error) {
        console.error("Failed to sync single item:", error);
        showToast.error("Gagal menyinkronkan data");
        return { success: false, error: error.message };
      }
    },
    [isOnline, loadPendingCount],
  );

  /**
   * Retry a single failed item by ID — only syncs that one item,
   * does NOT touch any other pending or failed items.
   */
  const retrySingle = useCallback(
    async (itemId) => {
      if (!isOnline) {
        showToast.warning("Tidak ada koneksi internet");
        return { success: false, error: "No internet connection" };
      }

      if (!itemId) {
        showToast.error("ID item tidak valid");
        return { success: false, error: "Invalid item ID" };
      }

      try {
        const result = await offlineService.retrySingle(itemId);

        if (result.success) {
          showToast.success("✅ Data berhasil disinkronkan");
          await loadPendingCount();
          return { success: true };
        } else {
          const errMsg = safeMsg(result.error, "Gagal menyinkronkan data");
          showToast.error(errMsg);
          return { success: false, error: errMsg };
        }
      } catch (error) {
        console.error("Failed to retry single item:", error);
        showToast.error("Gagal menyinkronkan data");
        return { success: false, error: error.message };
      }
    },
    [isOnline, loadPendingCount],
  );

  /**
   * ✅ NEW: Sync selected items (batch)
   */
  const syncSelected = useCallback(
    async (itemIds) => {
      if (!isOnline) {
        showToast.warning("Tidak ada koneksi internet");
        return { success: false, error: "No internet connection" };
      }

      if (!itemIds || itemIds.length === 0) {
        showToast.warning("Tidak ada data yang dipilih");
        return { success: false, error: "No items selected" };
      }

      if (isSyncingRef.current) {
        showToast.warning("Sinkronisasi sedang berjalan");
        return { success: false, error: "Sync already in progress" };
      }

      isSyncingRef.current = true;
      batchStateUpdate({ isSyncing: true });

      try {
        const queue = await offlineService.getQueue();
        const itemsToSync = queue.filter((q) => itemIds.includes(q.id));

        if (itemsToSync.length === 0) {
          showToast.warning("Data yang dipilih tidak ditemukan");
          return { success: false, error: "Selected items not found" };
        }

        let synced = 0;
        let failed = 0;

        for (const item of itemsToSync) {
          try {
            const result = await offlineService.syncQueueItem(item);
            if (result.success) {
              synced++;
            } else {
              failed++;
            }
          } catch (error) {
            console.error(`Failed to sync item ${item.id}:`, error);
            failed++;
          }
        }

        batchStateUpdate({
          isSyncing: false,
          lastSync: new Date().toISOString(),
        });

        if (synced > 0) {
          showToast.success(`✅ ${synced} data berhasil disinkronkan`);
        }
        if (failed > 0) {
          showToast.warning(`⚠️ ${failed} data gagal disinkronkan`);
        }

        await loadPendingCount();

        return {
          success: true,
          synced,
          failed,
          total: itemsToSync.length,
        };
      } catch (error) {
        console.error("Bulk sync failed:", error);
        batchStateUpdate({ isSyncing: false });
        showToast.error("Gagal menyinkronkan data");
        return { success: false, error: error.message };
      } finally {
        isSyncingRef.current = false;
      }
    },
    [isOnline, batchStateUpdate, loadPendingCount],
  );

  const clearOfflineData = useCallback(async () => {
    try {
      await offlineService.clearAll();

      batchStateUpdate({
        isSyncing: false,
        lastSync: null,
        pendingCount: 0,
        failedCount: 0,
        sentCount: 0,
      });

      showToast.success("Data offline berhasil dihapus");
      return { success: true };
    } catch (error) {
      console.error("Failed to clear offline data:", error);
      showToast.error("Gagal menghapus data offline");
      return { success: false, error: error.message };
    }
  }, [batchStateUpdate]);

  // Fungsi untuk mendapatkan detail transaksi
  const getQueueDetails = useCallback(async () => {
    try {
      const pending = await offlineService.getQueue();
      const failed = (await offlineService.getFailedQueue?.()) || [];
      const sent = (await offlineService.getSentQueue?.()) || [];

      return {
        pending: pending || [],
        failed: failed || [],
        sent: sent || [],
      };
    } catch (error) {
      console.error("Failed to get queue details:", error);
      return { pending: [], failed: [], sent: [] };
    }
  }, []);

  // Fungsi untuk menghapus item spesifik
  const deleteQueueItem = useCallback(
    async (id, type = "pending") => {
      try {
        let result;
        if (type === "failed") {
          result = await offlineService.deleteFailedItem?.(id);
        } else if (type === "sent") {
          result = await offlineService.deleteSentItem?.(id);
        } else {
          result = await offlineService.deleteQueueItem?.(id);
        }

        if (result?.success) {
          showToast.success("Data berhasil dihapus");
          await loadPendingCount();
          return { success: true };
        } else {
          throw new Error("Delete operation failed");
        }
      } catch (error) {
        console.error("Failed to delete item:", error);
        showToast.error("Gagal menghapus data");
        return { success: false, error: error.message };
      }
    },
    [loadPendingCount],
  );

  // Event listeners
  useEffect(() => {
    const handleQueueUpdated = () => {
      loadPendingCount();
    };

    const handleSyncProgress = (detail) => {
      batchStateUpdate({
        pendingCount: detail.total - detail.synced,
        failedCount: detail.failed,
      });
    };

    const handleSyncDone = () => {
      batchStateUpdate({
        isSyncing: false,
        lastSync: new Date().toISOString(),
      });
      // Reload to update sent count
      loadPendingCount();
    };

    const handleSentCleaned = (detail) => {
      if (detail.deletedCount > 0) {
        showToast.info(
          `🗑️ ${detail.deletedCount} data terkirim yang sudah lebih dari 8 jam telah dihapus`,
          { duration: 5000 }
        );
        loadPendingCount();
      }
    };

    offlineService.on("queue:updated", handleQueueUpdated);
    offlineService.on("sync:progress", handleSyncProgress);
    offlineService.on("sync:done", handleSyncDone);
    offlineService.on("sent:cleaned", handleSentCleaned);

    return () => {
      offlineService.off("queue:updated", handleQueueUpdated);
      offlineService.off("sync:progress", handleSyncProgress);
      offlineService.off("sync:done", handleSyncDone);
      offlineService.off("sent:cleaned", handleSentCleaned);
    };
  }, [loadPendingCount, batchStateUpdate]);

  // Load initial counts
  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  // Auto sync interval
  useEffect(() => {
    if (!autoSyncEnabled || !isOnline) return;

    const interval = setInterval(
      () => {
        if (syncStatus.pendingCount > 0 && !isSyncingRef.current) {
          syncPendingData();
        }
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [autoSyncEnabled, isOnline, syncStatus.pendingCount, syncPendingData]);

  const value = {
    isOnline,
    isOffline: !isOnline,
    syncStatus,
    autoSyncEnabled,

    syncPendingData,
    syncSingle,
    retrySingle,
    syncSelected,
    retryFailed,
    clearOfflineData,
    loadPendingCount,
    setAutoSyncEnabled,

    getQueueDetails,
    deleteQueueItem,

    canSync: isOnline && !isSyncingRef.current,
    hasPendingData: syncStatus.pendingCount > 0,
  };

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
};  