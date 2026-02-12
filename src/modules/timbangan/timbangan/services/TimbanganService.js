import { offlineService } from "@/shared/services/offlineService";
import { openDB } from "idb";

// Dedicated database for Timbangan sent queue
const TIMBANGAN_DB_NAME = "Timbangan_Sent_Queue";
const TIMBANGAN_DB_VERSION = 1;
const TIMBANGAN_SENT_STORE = "sent_queue";

let timbanganDbInstance = null;

/**
 * Get dedicated Timbangan database for sent queue
 */
async function getTimbanganDB() {
  if (timbanganDbInstance) return timbanganDbInstance;

  timbanganDbInstance = await openDB(TIMBANGAN_DB_NAME, TIMBANGAN_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(TIMBANGAN_SENT_STORE)) {
        const sentStore = db.createObjectStore(TIMBANGAN_SENT_STORE, {
          keyPath: "id",
        });
        sentStore.createIndex("sentAt", "sentAt");
        sentStore.createIndex("timestamp", "timestamp");
      }
    },
  });

  return timbanganDbInstance;
}

/**
 * Add timbangan data to sent queue
 */
async function addToTimbanganSentQueue(item) {
  try {
    const db = await getTimbanganDB();
    const sentItem = {
      ...item,
      sentAt: Date.now(),
      sentTimestamp: new Date().toISOString(),
    };

    await db.put(TIMBANGAN_SENT_STORE, sentItem);
    return { success: true };
  } catch (error) {
    console.error("Failed to add to timbangan sent queue:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get timbangan sent queue data
 */
async function getTimbanganSentQueue() {
  try {
    const db = await getTimbanganDB();
    const sentItems = await db.getAll(TIMBANGAN_SENT_STORE);
    
    // Sort by sentAt descending (newest first)
    return sentItems.sort((a, b) => b.sentAt - a.sentAt);
  } catch (error) {
    console.error("Failed to get timbangan sent queue:", error);
    return [];
  }
}

/**
 * Delete item from timbangan sent queue
 */
async function deleteTimbanganSentItem(id) {
  try {
    const db = await getTimbanganDB();
    await db.delete(TIMBANGAN_SENT_STORE, id);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete timbangan sent item:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear old timbangan sent items (older than 8 hours)
 */
async function cleanupTimbanganSentQueue() {
  try {
    const RETENTION_TIME = 8 * 60 * 60 * 1000; // 8 hours
    const db = await getTimbanganDB();
    const cutoffTime = Date.now() - RETENTION_TIME;
    
    const tx = db.transaction(TIMBANGAN_SENT_STORE, "readwrite");
    const store = tx.objectStore(TIMBANGAN_SENT_STORE);
    const index = store.index("sentAt");
    
    const oldItems = await index.getAll(IDBKeyRange.upperBound(cutoffTime));
    
    for (const item of oldItems) {
      await store.delete(item.id);
    }
    
    await tx.done;
    
    return { success: true, deletedCount: oldItems.length };
  } catch (error) {
    console.error("Failed to cleanup timbangan sent queue:", error);
    return { success: false, error: error.message };
  }
}

// Auto cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(cleanupTimbanganSentQueue, 5 * 60 * 1000);
}

export const timbanganService = {
  createTimbangan: async (data) => {
    try {
      const result = await offlineService.post(
        "/v1/custom/ritase/offline",
        data,
      );

      // Only save to sent queue when online
      if (navigator.onLine) {
        await addToTimbanganSentQueue({
          id: `online_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url: "/v1/custom/ritase/offline",
          method: "POST",
          data,
          timestamp: Date.now(),
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "success",
        });
      }

      return result;
    } catch (error) {
      console.error("❌ Create timbangan error:", error);
      throw error;
    }
  },

  // Expose sent queue methods for UI
  getSentQueue: getTimbanganSentQueue,
  deleteSentItem: deleteTimbanganSentItem,
  cleanupSentQueue: cleanupTimbanganSentQueue,
};