import { offlineService } from "@/shared/services/offlineService";
import { openDB } from "idb";

// Dedicated database for Timbangan tracking
const TIMBANGAN_DB_NAME = "Timbangan_Tracking_Queue";
const TIMBANGAN_DB_VERSION = 1;
const STORES = {
  PENDING: "pending_queue",    // Data yang belum terkirim (offline)
  SENT: "sent_queue",          // Data yang berhasil terkirim
  FAILED: "failed_queue",      // Data yang gagal terkirim
};

let timbanganDbInstance = null;

/**
 * Get dedicated Timbangan database
 */
async function getTimbanganDB() {
  if (timbanganDbInstance) return timbanganDbInstance;

  timbanganDbInstance = await openDB(TIMBANGAN_DB_NAME, TIMBANGAN_DB_VERSION, {
    upgrade(db) {
      // Pending queue store
      if (!db.objectStoreNames.contains(STORES.PENDING)) {
        const pendingStore = db.createObjectStore(STORES.PENDING, {
          keyPath: "id",
        });
        pendingStore.createIndex("timestamp", "timestamp");
        pendingStore.createIndex("status", "status");
      }

      // Sent queue store
      if (!db.objectStoreNames.contains(STORES.SENT)) {
        const sentStore = db.createObjectStore(STORES.SENT, {
          keyPath: "id",
        });
        sentStore.createIndex("sentAt", "sentAt");
        sentStore.createIndex("timestamp", "timestamp");
      }

      // Failed queue store
      if (!db.objectStoreNames.contains(STORES.FAILED)) {
        const failedStore = db.createObjectStore(STORES.FAILED, {
          keyPath: "id",
        });
        failedStore.createIndex("timestamp", "timestamp");
        failedStore.createIndex("retryCount", "retryCount");
      }
    },
  });

  return timbanganDbInstance;
}

/**
 * Add to pending queue (when offline)
 */
async function addToPendingQueue(item) {
  try {
    const db = await getTimbanganDB();
    await db.put(STORES.PENDING, {
      ...item,
      status: "pending",
      addedAt: Date.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to add to pending queue:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Add to sent queue (when successfully sent)
 */
async function addToSentQueue(item) {
  try {
    const db = await getTimbanganDB();
    const sentItem = {
      ...item,
      sentAt: Date.now(),
      sentTimestamp: new Date().toISOString(),
      status: "success",
    };

    await db.put(STORES.SENT, sentItem);
    
    // Remove from pending if exists
    if (item.pendingId) {
      await db.delete(STORES.PENDING, item.pendingId);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Failed to add to sent queue:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Add to failed queue (when send failed)
 */
async function addToFailedQueue(item, error) {
  try {
    const db = await getTimbanganDB();
    const failedItem = {
      ...item,
      failedAt: Date.now(),
      failedTimestamp: new Date().toISOString(),
      error: error?.message || error || "Unknown error",
      errorDetail: error?.response?.data || null,
      status: "failed",
      retryCount: (item.retryCount || 0) + 1,
    };

    await db.put(STORES.FAILED, failedItem);
    
    // Remove from pending if exists
    if (item.pendingId) {
      await db.delete(STORES.PENDING, item.pendingId);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Failed to add to failed queue:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all queues with counts
 */
async function getAllQueues() {
  try {
    const db = await getTimbanganDB();
    
    const [pending, sent, failed] = await Promise.all([
      db.getAll(STORES.PENDING),
      db.getAll(STORES.SENT),
      db.getAll(STORES.FAILED),
    ]);

    // Sort by timestamp descending (newest first)
    const sortByTime = (a, b) => {
      const timeA = a.sentAt || a.failedAt || a.addedAt || a.timestamp || 0;
      const timeB = b.sentAt || b.failedAt || b.addedAt || b.timestamp || 0;
      return timeB - timeA;
    };

    return {
      pending: pending.sort(sortByTime),
      sent: sent.sort(sortByTime),
      failed: failed.sort(sortByTime),
      counts: {
        pending: pending.length,
        sent: sent.length,
        failed: failed.length,
        total: pending.length + sent.length + failed.length,
      },
    };
  } catch (error) {
    console.error("Failed to get all queues:", error);
    return {
      pending: [],
      sent: [],
      failed: [],
      counts: { pending: 0, sent: 0, failed: 0, total: 0 },
    };
  }
}

/**
 * Delete item from any queue
 */
async function deleteItem(id, queueType = "sent") {
  try {
    const db = await getTimbanganDB();
    const store = STORES[queueType.toUpperCase()] || STORES.SENT;
    await db.delete(store, id);
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete from ${queueType}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Move item from failed to pending for retry
 */
async function moveFailedToPending(id) {
  try {
    const db = await getTimbanganDB();
    const item = await db.get(STORES.FAILED, id);
    
    if (!item) {
      return { success: false, error: "Item not found" };
    }

    // Add to pending
    await db.put(STORES.PENDING, {
      ...item,
      status: "pending",
      addedAt: Date.now(),
      retriedAt: Date.now(),
    });

    // Remove from failed
    await db.delete(STORES.FAILED, id);

    return { success: true };
  } catch (error) {
    console.error("Failed to move item to pending:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup old sent items (older than 8 hours)
 */
async function cleanupSentQueue() {
  try {
    const RETENTION_TIME = 8 * 60 * 60 * 1000; // 8 hours
    const db = await getTimbanganDB();
    const cutoffTime = Date.now() - RETENTION_TIME;
    
    const tx = db.transaction(STORES.SENT, "readwrite");
    const store = tx.objectStore(STORES.SENT);
    const index = store.index("sentAt");
    
    const oldItems = await index.getAll(IDBKeyRange.upperBound(cutoffTime));
    
    for (const item of oldItems) {
      await store.delete(item.id);
    }
    
    await tx.done;
    
    return { success: true, deletedCount: oldItems.length };
  } catch (error) {
    console.error("Failed to cleanup sent queue:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ Enhanced retry single with tracking
 */
async function retryTimbanganWithTracking(id) {
  try {
    // ✅ Pakai getQueueItem langsung by ID
    const queueItem = await offlineService.getQueueItem(id);

    if (!queueItem) {
      // Cek di failed queue timbangan
      const db = await getTimbanganDB();
      const failedItem = await db.get(STORES.FAILED, id);

      if (failedItem) {
        await moveFailedToPending(id);
        return { success: true, moved: true };
      }

      return { success: false, error: "Item not found" };
    }

    // Execute retry via offlineService
    const result = await offlineService.syncQueueItem(queueItem);

    if (result.success) {
      // ✅ Berhasil → simpan ke sent_queue
      await addToSentQueue({
        id: `retry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        url: queueItem.url,
        method: queueItem.method || "POST",
        data: queueItem.data,
        timestamp: queueItem.timestamp || Date.now(),
        clientTimestamp: queueItem.clientTimestamp || new Date().toISOString(),
        retryCount: queueItem.retryCount || 0,
        syncedFrom: "manual_retry",
        pendingId: id,
      });
    } else {
      // ✅ Gagal → simpan ke failed_queue
      await addToFailedQueue(
        {
          id: `failed_retry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url: queueItem.url,
          method: queueItem.method || "POST",
          data: queueItem.data,
          timestamp: queueItem.timestamp || Date.now(),
          clientTimestamp: queueItem.clientTimestamp || new Date().toISOString(),
          retryCount: queueItem.retryCount || 0,
          pendingId: id,
        },
        result.error || "Retry failed",
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Retry with tracking error:", error);
    throw error;
  }
}

/**
 * ✅ Enhanced sync all with tracking
 */
async function syncAllWithTracking() {
  try {
    const queueBeforeSync = await offlineService.getQueue();
    const timbanganItems = queueBeforeSync.filter(
      (item) =>
        item.url &&
        (item.url.includes("/ritase/offline") ||
          item.url.includes("/timbangan")),
    );

    if (timbanganItems.length === 0) {
      return offlineService.syncAllPending();
    }

    // Sync satu per satu supaya bisa track per item
    let synced = 0;
    let failed = 0;

    for (const item of timbanganItems) {
      try {
        const result = await offlineService.syncQueueItem(item);

        if (result.success) {
          // ✅ Berhasil → simpan ke sent_queue
          await addToSentQueue({
            id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            url: item.url,
            method: item.method || "POST",
            data: item.data,
            timestamp: item.timestamp || Date.now(),
            clientTimestamp:
              item.clientTimestamp || new Date().toISOString(),
            retryCount: item.retryCount || 0,
            syncedFrom: "auto_sync",
            pendingId: item.id,
          });
          synced++;
        } else {
          // ✅ Gagal → simpan ke failed_queue
          await addToFailedQueue(
            {
              id: `failed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              url: item.url,
              method: item.method || "POST",
              data: item.data,
              timestamp: item.timestamp || Date.now(),
              clientTimestamp:
                item.clientTimestamp || new Date().toISOString(),
              retryCount: item.retryCount || 0,
              pendingId: item.id,
            },
            result.error || "Sync failed",
          );
          failed++;
        }
      } catch (error) {
        await addToFailedQueue(
          {
            id: `failed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            url: item.url,
            method: item.method || "POST",
            data: item.data,
            timestamp: item.timestamp || Date.now(),
            clientTimestamp: item.clientTimestamp || new Date().toISOString(),
            retryCount: item.retryCount || 0,
            pendingId: item.id,
          },
          error,
        );
        failed++;
      }
    }

    // Sync item non-timbangan yang mungkin ada juga
    const nonTimbanganItems = queueBeforeSync.filter(
      (item) =>
        !item.url ||
        (!item.url.includes("/ritase/offline") &&
          !item.url.includes("/timbangan")),
    );

    for (const item of nonTimbanganItems) {
      await offlineService.syncQueueItem(item);
    }

    return { success: true, synced, failed };
  } catch (error) {
    console.error("❌ Sync all with tracking error:", error);
    throw error;
  }
}

// Auto cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(cleanupSentQueue, 5 * 60 * 1000);
  
  // Emit event when cleanup happens
  setInterval(async () => {
    const result = await cleanupSentQueue();
    if (result.success && result.deletedCount > 0) {
      window.dispatchEvent(new CustomEvent("timbangan:sent:cleaned", {
        detail: { deletedCount: result.deletedCount }
      }));
    }
  }, 5 * 60 * 1000);
}

export const timbanganService = {
  /**
   * Create timbangan - main entry point
   */
createTimbangan: async (data) => {
  try {
    const result = await offlineService.post(
      "/v1/custom/ritase/offline",
      data,
    );

    // Online & berhasil → simpan ke sent queue
    if (navigator.onLine) {
      await addToSentQueue({
        id: `online_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        url: "/v1/custom/ritase/offline",
        method: "POST",
        data,
        timestamp: Date.now(),
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        syncedFrom: "direct",
      });
    }

    return result;
  } catch (error) {
    // ✅ "Request queued" bukan error — ini sukses offline
    const isQueued =
      error?.message?.includes("queued") ||
      error?.message?.includes("offline sync");

    if (isQueued) {
      // Simpan ke pending queue untuk tracking
      try {
        const queue = await offlineService.getQueue();
        const lastItem = queue[queue.length - 1];
        if (lastItem) {
          await addToPendingQueue({
            ...lastItem,
            pendingId: lastItem.id,
          });
        }
      } catch (e) {
        console.warn("Failed to track pending item:", e);
      }

      // ✅ Return sukses, bukan throw
      return { queued: true, status: "queued", offline: true };
    }

    // Error beneran (validasi, dll)
    console.error("❌ Create timbangan error:", error);

    if (navigator.onLine) {
      await addToFailedQueue(
        {
          id: `failed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url: "/v1/custom/ritase/offline",
          method: "POST",
          data,
          timestamp: Date.now(),
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
        },
        error,
      );
    }

    throw error;
  }
},

  /**
   * Tracking methods with full queue support
   */
  retrySingle: retryTimbanganWithTracking,
  syncAllPending: syncAllWithTracking,
  
  /**
   * Queue management
   */
  getAllQueues,
  getPendingQueue: async () => (await getAllQueues()).pending,
  getSentQueue: async () => (await getAllQueues()).sent,
  getFailedQueue: async () => (await getAllQueues()).failed,
  getQueueCounts: async () => (await getAllQueues()).counts,
  
  deleteItem,
  deleteSentItem: (id) => deleteItem(id, 'sent'),
  deleteFailedItem: (id) => deleteItem(id, 'failed'),
  deletePendingItem: (id) => deleteItem(id, 'pending'),
  
  moveFailedToPending,
  cleanupSentQueue,
  
  /**
   * Passthrough offlineService methods for compatibility
   */
  getQueue: offlineService.getQueue,
  deleteQueueItem: offlineService.deleteQueueItem,
};