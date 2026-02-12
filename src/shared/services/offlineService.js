import { openDB } from "idb";
import { apiClient } from "@/shared/services/api";

const DB_NAME = "Timbangan_app";
const DB_VERSION = 1;
const STORES = {
  QUEUE: "offline_queue",
  CACHE: "api_cache",
  FAILED: "failed_queue",
  SENT: "sent_queue",
};

const CACHE_CONFIG = {
  FLEET_TODAY: 5 * 60 * 1000,
  FLEET_HISTORY: 30 * 60 * 1000,
  TIMBANGAN_TODAY: 5 * 60 * 1000,
  TIMBANGAN_HISTORY: 30 * 60 * 1000,
  MASTERS: 60 * 60 * 1000,
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  MAX_AGE_DAYS: 7,
  MAX_ENTRIES: 100,
  CLEANUP_INTERVAL: 1 * 60 * 60 * 1000,
  AUTO_CLEANUP_ENABLED: true,
};

const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000;
const CACHE_MAX_AGE = 60 * 60 * 1000;
const SENT_DATA_RETENTION = 8 * 60 * 60 * 1000; // 8 hours
const SENT_CLEANUP_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

let dbInstance = null;
const eventBus = new EventTarget();

let cacheCleanupTimer = null;
let autoCacheCleanupTimer = null;
let sentCleanupTimer = null; // Timer for sent data cleanup
const activeListeners = new Map();

const coalescedEvents = new Map();
const COALESCE_DELAY = 200;

const isDateRangeToday = (dateRange) => {
  if (!dateRange?.from || !dateRange?.to) return false;
  const today = new Date().toISOString().split("T")[0];
  return dateRange.from === today && dateRange.to === today;
};

const getTTLForDate = (dateRange, type) => {
  const isTodayRange = isDateRangeToday(dateRange);

  if (type === "timbangan") {
    return isTodayRange
      ? CACHE_CONFIG.TIMBANGAN_TODAY
      : CACHE_CONFIG.TIMBANGAN_HISTORY;
  }

  return CACHE_CONFIG.MASTERS;
};

function cleanupCoalescedEvents() {
  coalescedEvents.forEach((data) => {
    if (data.timer) {
      clearTimeout(data.timer);
    }
  });
  coalescedEvents.clear();
}

/**
 * ✅ IMPROVED: Event coalescing dengan proper data merging
 */
function emitCoalescedEvent(eventName, detail = {}) {
  if (coalescedEvents.has(eventName)) {
    const existingData = coalescedEvents.get(eventName);

    if (existingData.timer) {
      clearTimeout(existingData.timer);
    }

    const mergedPayload = {
      ...existingData.payload,
      ...detail,
      timestamp: Date.now(),
    };

    if (Array.isArray(detail.ids) && Array.isArray(existingData.payload.ids)) {
      mergedPayload.ids = [
        ...new Set([...existingData.payload.ids, ...detail.ids]),
      ];
    }

    existingData.payload = mergedPayload;
  } else {
    coalescedEvents.set(eventName, {
      payload: { ...detail, timestamp: Date.now() },
      timer: null,
    });
  }

  const data = coalescedEvents.get(eventName);

  data.timer = setTimeout(() => {
    const finalPayload = data.payload;

    eventBus.dispatchEvent(
      new CustomEvent(eventName, { detail: finalPayload }),
    );

    coalescedEvents.delete(eventName);
  }, COALESCE_DELAY);
}

async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, {
          keyPath: "id",
          autoIncrement: true,
        });
        queueStore.createIndex("timestamp", "timestamp");
        queueStore.createIndex("status", "status");
      }

      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        const cacheStore = db.createObjectStore(STORES.CACHE, {
          keyPath: "key",
        });
        cacheStore.createIndex("expiry", "expiry");
        cacheStore.createIndex("timestamp", "timestamp");
      }

      if (!db.objectStoreNames.contains(STORES.FAILED)) {
        const failedStore = db.createObjectStore(STORES.FAILED, {
          keyPath: "id",
          autoIncrement: true,
        });
        failedStore.createIndex("retryCount", "retryCount");
      }

      if (!db.objectStoreNames.contains(STORES.SENT)) {
        const sentStore = db.createObjectStore(STORES.SENT, {
          keyPath: "id",
        });
        sentStore.createIndex("sentAt", "sentAt");
        sentStore.createIndex("timestamp", "timestamp");
      }
    },
  });

  return dbInstance;
}

async function cleanupExpiredCache() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.CACHE, "readwrite");
    const store = tx.objectStore(STORES.CACHE);
    const index = store.index("expiry");

    const now = Date.now();
    let deletedCount = 0;

    const expiredEntries = await index.getAll(IDBKeyRange.upperBound(now));

    for (const entry of expiredEntries) {
      await store.delete(entry.key);
      deletedCount++;
    }

    await tx.done;
    return { success: true, deletedCount };
  } catch (error) {
    console.error("❌ Cache cleanup error:", error);
    return { success: false, error: error.message };
  }
}

async function cleanupStaleCache() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.CACHE, "readwrite");
    const allCache = await tx.store.getAll();

    const staleThreshold = Date.now() - CACHE_MAX_AGE;
    let deletedCount = 0;

    for (const item of allCache) {
      if (item.timestamp < staleThreshold) {
        await tx.store.delete(item.key);
        deletedCount++;
      }
    }

    await tx.done;

    return { success: true, deletedCount };
  } catch (error) {
    console.error("❌ Stale cache cleanup error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ NEW: Cleanup expired sent data (older than 8 hours)
 */
async function cleanupExpiredSentData() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.SENT, "readwrite");
    const store = tx.objectStore(STORES.SENT);
    const index = store.index("sentAt");

    const expiryThreshold = Date.now() - SENT_DATA_RETENTION;
    let deletedCount = 0;

    const expiredEntries = await index.getAll(
      IDBKeyRange.upperBound(expiryThreshold)
    );

    for (const entry of expiredEntries) {
      await store.delete(entry.id);
      deletedCount++;
    }

    await tx.done;

    if (deletedCount > 0) {
      emitCoalescedEvent("sent:cleaned", { deletedCount });
      emitCoalescedEvent("queue:updated");
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("❌ Sent data cleanup error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ NEW: Start automatic cleanup for sent data
 */
function startSentDataCleanup() {
  if (sentCleanupTimer) return;

  // Run immediately
  cleanupExpiredSentData();

  // Then run periodically
  sentCleanupTimer = setInterval(() => {
    cleanupExpiredSentData();
  }, SENT_CLEANUP_INTERVAL);
}

/**
 * ✅ NEW: Stop automatic cleanup for sent data
 */
function stopSentDataCleanup() {
  if (sentCleanupTimer) {
    clearInterval(sentCleanupTimer);
    sentCleanupTimer = null;
  }
}

/**
 * ✅ IMPROVED: Efficient cache cleanup using IndexedDB features
 */
async function cleanupOldCache() {
  try {
    const db = await getDB();
    const cutoffTime =
      Date.now() - CACHE_CONFIG.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const maxEntries = CACHE_CONFIG.MAX_ENTRIES;

    let deletedCount = 0;
    let deletedByAge = 0;
    let deletedByLimit = 0;

    {
      const tx = db.transaction(STORES.CACHE, "readwrite");
      const store = tx.objectStore(STORES.CACHE);
      const index = store.index("timestamp");

      const oldEntries = await index.getAll(IDBKeyRange.upperBound(cutoffTime));

      await Promise.all(oldEntries.map((entry) => store.delete(entry.key)));

      deletedByAge = oldEntries.length;
      deletedCount += deletedByAge;

      await tx.done;
    }

    {
      const tx = db.transaction(STORES.CACHE, "readonly");
      const store = tx.objectStore(STORES.CACHE);

      const countRequest = store.count();
      const currentCount = await new Promise((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });

      if (currentCount > maxEntries) {
        const excessCount = currentCount - maxEntries;
        const index = store.index("timestamp");
        const allOldest = await index.getAll(null, excessCount);

        await tx.done;

        const tx2 = db.transaction(STORES.CACHE, "readwrite");
        const store2 = tx2.objectStore(STORES.CACHE);

        await Promise.all(allOldest.map((entry) => store2.delete(entry.key)));

        deletedByLimit = allOldest.length;
        deletedCount += deletedByLimit;

        await tx2.done;
      } else {
        await tx.done;
      }
    }

    if (deletedCount > 0) {
      emitCoalescedEvent("cache:cleaned", {
        deletedCount,
        deletedByAge,
        deletedByLimit,
      });
    }

    return { success: true, deletedCount, deletedByAge, deletedByLimit };
  } catch (error) {
    console.error("❌ Cache cleanup error:", error);
    return { success: false, error: error.message };
  }
}

async function getCacheStats() {
  try {
    const db = await getDB();
    const allCache = await db.getAll(STORES.CACHE);

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const fleetCache = allCache.filter((c) => c.key.includes("fleet"));
    const timbanganCache = allCache.filter(
      (c) => c.key.includes("ritase") || c.key.includes("timbangan"),
    );
    const masterCache = allCache.filter(
      (c) =>
        c.key.includes("master") ||
        c.key.includes("unit") ||
        c.key.includes("location"),
    );

    const stats = {
      total: allCache.length,
      today: allCache.filter((c) => c.timestamp > oneDayAgo).length,
      week: allCache.filter((c) => c.timestamp > sevenDaysAgo).length,
      expired: allCache.filter((c) => c.expiry < now).length,

      byType: {
        fleet: fleetCache.length,
        timbangan: timbanganCache.length,
        master: masterCache.length,
        other: allCache.length - fleetCache.length - timbanganCache.length - masterCache.length,
      },

      oldestEntry: allCache.reduce((oldest, curr) =>
        !oldest || curr.timestamp < oldest.timestamp ? curr : oldest,
        null
      ),
      
      newestEntry: allCache.reduce((newest, curr) =>
        !newest || curr.timestamp > newest.timestamp ? curr : newest,
        null
      ),
    };

    return stats;
  } catch (error) {
    console.error("❌ Cache stats error:", error);
    return null;
  }
}

function startCacheCleanup() {
  if (cacheCleanupTimer) return;

  cleanupStaleCache();

  cacheCleanupTimer = setInterval(() => {
    cleanupStaleCache();
  }, CACHE_CLEANUP_INTERVAL);
}

function stopCacheCleanup() {
  if (cacheCleanupTimer) {
    clearInterval(cacheCleanupTimer);
    cacheCleanupTimer = null;
  }
}

function startAutoCleanup() {
  if (!CACHE_CONFIG.AUTO_CLEANUP_ENABLED) return;
  if (autoCacheCleanupTimer) return;

  cleanupOldCache();

  autoCacheCleanupTimer = setInterval(() => {
    cleanupOldCache();
  }, CACHE_CONFIG.CLEANUP_INTERVAL);
}

function stopAutoCleanup() {
  if (autoCacheCleanupTimer) {
    clearInterval(autoCacheCleanupTimer);
    autoCacheCleanupTimer = null;
  }
}

async function clearStoreChunked(storeName, chunkSize = 500) {
  try {
    const db = await getDB();
    let hasMore = true;
    let totalDeleted = 0;

    while (hasMore) {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(STORES.CACHE);

      const keys = await store.getAllKeys(null, chunkSize);

      if (keys.length === 0) {
        hasMore = false;
        await tx.done;
        break;
      }

      await Promise.all(keys.map((key) => store.delete(key)));
      totalDeleted += keys.length;

      await tx.done;

      if (keys.length < chunkSize) {
        hasMore = false;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return { success: true, deletedCount: totalDeleted };
  } catch (error) {
    console.error(`❌ Clear ${storeName} error:`, error);
    return { success: false, error: error.message };
  }
}

async function* chunkArray(array, size) {
  for (let i = 0; i < array.length; i += size) {
    yield array.slice(i, i + size);
  }
}

async function apiCall(url, options = {}) {
  const isOnline = navigator.onLine;
  const queueOffline = options.queueOffline !== false;

  if (!isOnline && queueOffline) {
    const queueItem = {
      url,
      method: options.method || "GET",
      data: options.data,
      options: {
        ...options,
        queueOffline: undefined,
      },
      timestamp: Date.now(),
      clientTimestamp: new Date().toISOString(),
      retryCount: 0,
      status: "pending",
    };

    await addToQueue(queueItem);

    throw new Error("OFFLINE_QUEUED");
  }

  try {
    const response = await apiClient(url, options);
    return response;
  } catch (error) {
    if (!isOnline && queueOffline) {
      const queueItem = {
        url,
        method: options.method || "GET",
        data: options.data,
        options: {
          ...options,
          queueOffline: undefined,
        },
        timestamp: Date.now(),
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      };

      await addToQueue(queueItem);
      throw new Error("OFFLINE_QUEUED");
    }

    throw error;
  }
}

async function get(url, options = {}) {
  return apiCall(url, { ...options, method: "GET" });
}

async function post(url, data, options = {}) {
  return apiCall(url, { ...options, method: "POST", data });
}

async function put(url, data, options = {}) {
  return apiCall(url, { ...options, method: "PUT", data });
}

async function patch(url, data, options = {}) {
  return apiCall(url, { ...options, method: "PATCH", data });
}

async function del(url, options = {}) {
  return apiCall(url, { ...options, method: "DELETE" });
}

async function addToQueue(item) {
  const db = await getDB();

  // ✅ FIX: Remove id from item BEFORE spreading to avoid conflicts with autoIncrement
  const { id, ...itemWithoutId } = item;

  const queueItem = {
    ...itemWithoutId,
    createdAtClient: new Date().toISOString(),
    // id will be auto-generated by autoIncrement
  };

  await db.add(STORES.QUEUE, queueItem);

  emitCoalescedEvent("queue:updated", { action: "added" });
}

async function getQueue() {
  const db = await getDB();
  return await db.getAll(STORES.QUEUE);
}

async function getPendingCount() {
  const db = await getDB();
  return await db.count(STORES.QUEUE);
}

/**
 * ✅ NEW: Add item to sent queue with timestamp
 */
async function addToSentQueue(item) {
  try {
    const db = await getDB();
    const sentItem = {
      ...item,
      sentAt: Date.now(),
      sentTimestamp: new Date().toISOString(),
    };

    await db.put(STORES.SENT, sentItem);
    emitCoalescedEvent("queue:updated");
    return { success: true };
  } catch (error) {
    console.error("Failed to add to sent queue:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ NEW: Get sent queue data
 */
async function getSentQueue() {
  try {
    const db = await getDB();
    const sentItems = await db.getAll(STORES.SENT);
    
    // Sort by sentAt descending (newest first)
    return sentItems.sort((a, b) => b.sentAt - a.sentAt);
  } catch (error) {
    console.error("Failed to get sent queue:", error);
    return [];
  }
}

/**
 * ✅ NEW: Delete item from sent queue
 */
async function deleteSentItem(id) {
  try {
    const db = await getDB();
    await db.delete(STORES.SENT, id);
    emitCoalescedEvent("queue:updated");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete sent item:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ NEW: Get stats for all queues
 */
async function getQueueStats() {
  try {
    const db = await getDB();
    
    const [pendingCount, failedCount, sentCount] = await Promise.all([
      db.count(STORES.QUEUE),
      db.count(STORES.FAILED),
      db.count(STORES.SENT),
    ]);

    return {
      pending: pendingCount,
      failed: failedCount,
      sent: sentCount,
      total: pendingCount + failedCount + sentCount,
    };
  } catch (error) {
    console.error("Failed to get queue stats:", error);
    return { pending: 0, failed: 0, sent: 0, total: 0 };
  }
}

async function syncSelected(ids) {
  if (!ids || ids.length === 0) {
    return { success: true, synced: 0 };
  }

  const db = await getDB();
  const queue = await db.getAll(STORES.QUEUE);
  const selected = queue.filter((item) => ids.includes(item.id));

  if (selected.length === 0) {
    return { success: true, synced: 0 };
  }

  const results = await processSyncQueue(selected);

  emitCoalescedEvent("queue:updated", { source: "syncSelected" });

  return results;
}

async function syncAllPending() {
  const queue = await getQueue();

  if (queue.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const result = await processSyncQueue(queue);
  emitCoalescedEvent("queue:updated", { source: "syncAll" });

  return result;
}

async function processSyncQueue(queue) {
  emitCoalescedEvent("sync:start", { total: queue.length });

  const BATCH_SIZE = 15;
  const MAX_CONCURRENT = 3;
  let synced = 0;
  let failed = 0;

  for await (const batch of chunkArray(queue, BATCH_SIZE)) {
    const results = await processBatchWithConcurrency(batch, MAX_CONCURRENT);

    synced += results.filter((r) => r.success).length;
    failed += results.filter((r) => !r.success).length;

    emitCoalescedEvent("sync:progress", {
      synced,
      failed,
      total: queue.length,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  emitCoalescedEvent("sync:done", { synced, failed });

  return { success: true, synced, failed };
}

async function processBatchWithConcurrency(batch, maxConcurrent) {
  const results = [];
  const executing = [];

  for (const item of batch) {
    const promise = syncQueueItem(item).then((result) => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });

    results.push(promise);
    executing.push(promise);

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

async function syncQueueItem(item) {
  const db = await getDB();

  try {
    const config = { method: item.method, ...item.options };
    if (item.data) {
      config.data = {
        ...item.data,
      };
    }
    if (item.options?.params) config.params = item.options.params;

    await apiClient(item.url, config);

    await db.delete(STORES.QUEUE, item.id);

    // Add to sent queue for retention
    await addToSentQueue(item);

    return { success: true, item };
  } catch (error) {
    // Extract a safe string — never store/return the raw Axios object
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Unknown error";

    // Preserve the BE response body as a plain serializable object
    // so the UI can show "Terjadi kesalahan server" etc.
    const errorResponse = error?.response?.data
      ? {
          status: error.response.data.status ?? null,
          message: error.response.data.message ?? null,
          httpStatus: error.response.status ?? null,
        }
      : null;

    if (item.retryCount >= 2) {
      await db.delete(STORES.QUEUE, item.id);
      await db.add(STORES.FAILED, {
        ...item,
        error: errorMessage,
        errorResponse,
      });
    } else {
      await db.put(STORES.QUEUE, {
        ...item,
        retryCount: item.retryCount + 1,
        lastError: errorMessage,
        lastErrorResponse: errorResponse,
      });
    }

    return { success: false, item, error: errorMessage };
  }
}

async function setCache(key, data, ttl = 5 * 60 * 1000) {
  const db = await getDB();
  await db.put(STORES.CACHE, {
    key,
    data,
    expiry: Date.now() + ttl,
    timestamp: Date.now(),
  });
}

async function getCache(key, ignoreExpiry = false) {
  const db = await getDB();
  const cached = await db.get(STORES.CACHE, key);

  if (!cached) return null;
  if (!ignoreExpiry && cached.expiry < Date.now()) {
    await db.delete(STORES.CACHE, key);
    return null;
  }

  return cached.data;
}

async function clearCacheByPrefix(prefix) {
  const db = await getDB();
  const allCache = await db.getAll(STORES.CACHE);
  let deletedCount = 0;

  const tx = db.transaction(STORES.CACHE, "readwrite");
  for (const item of allCache) {
    if (item.key.startsWith(prefix)) {
      await tx.store.delete(item.key);
      deletedCount++;
    }
  }
  await tx.done;

  return { success: true, deletedCount };
}

async function clearCache(pattern = null) {
  if (!pattern) {
    await clearStoreChunked(STORES.CACHE);
    emitCoalescedEvent("cache:cleared", { pattern: "all" });
    return { success: true, deletedCount: "all" };
  }

  try {
    const db = await getDB();
    const allCache = await db.getAll(STORES.CACHE);
    let deletedCount = 0;

    const tx = db.transaction(STORES.CACHE, "readwrite");
    for (const item of allCache) {
      if (item.key.includes(pattern)) {
        await tx.store.delete(item.key);
        deletedCount++;
      }
    }
    await tx.done;

    if (deletedCount > 0) {
      emitCoalescedEvent("cache:cleared", { pattern, deletedCount });
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("❌ Pattern cache clear error:", error);
    return { success: false, error: error.message };
  }
}

async function clearAll() {
  await Promise.all([
    clearStoreChunked(STORES.QUEUE),
    clearStoreChunked(STORES.CACHE),
    clearStoreChunked(STORES.FAILED),
    clearStoreChunked(STORES.SENT),
  ]);
  emitCoalescedEvent("offline:cleared");
}

async function retryFailed() {
  const db = await getDB();
  const failed = await db.getAll(STORES.FAILED);

  if (failed.length === 0) {
    return { success: true, synced: 0 };
  }

  const tx = db.transaction([STORES.FAILED, STORES.QUEUE], "readwrite");

  for (const item of failed) {
    await tx.objectStore(STORES.QUEUE).add({
      ...item,
      status: "pending",
      retryCount: 0,
    });
    await tx.objectStore(STORES.FAILED).delete(item.id);
  }

  await tx.done;

  return syncAllPending();
}

/**
 * Retry a single failed item by ID.
 * Only moves that one item from FAILED → QUEUE and syncs only that item.
 * Does NOT touch any other pending or failed items.
 */
async function retrySingle(itemId) {
  const db = await getDB();
  const item = await db.get(STORES.FAILED, itemId);

  if (!item) {
    return { success: false, error: "Item tidak ditemukan di antrian gagal" };
  }

  // Move only this item back to the pending queue with a fresh retry counter.
  // Strip the id so IndexedDB auto-generates a new one (avoids key conflicts).
  const tx = db.transaction([STORES.FAILED, STORES.QUEUE], "readwrite");
  const { id: _oldId, ...itemWithoutId } = item;
  const newId = await tx.objectStore(STORES.QUEUE).add({
    ...itemWithoutId,
    status: "pending",
    retryCount: 0,
    lastError: null,
  });
  await tx.objectStore(STORES.FAILED).delete(itemId);
  await tx.done;

  // Fetch the newly queued item by its new auto-generated id and sync only it
  const queuedItem = await db.get(STORES.QUEUE, newId);

  if (!queuedItem) {
    return { success: false, error: "Gagal memindahkan item ke antrian" };
  }

  const result = await syncQueueItem(queuedItem);
  emitCoalescedEvent("queue:updated", { source: "retrySingle" });
  return result;
}

function on(eventName, callback) {
  if (!activeListeners.has(eventName)) {
    activeListeners.set(eventName, new Set());
  }
  activeListeners.get(eventName).add(callback);

  eventBus.addEventListener(eventName, (e) => callback(e.detail));
}

function off(eventName, callback) {
  if (activeListeners.has(eventName)) {
    activeListeners.get(eventName).delete(callback);
    if (activeListeners.get(eventName).size === 0) {
      activeListeners.delete(eventName);
    }
  }

  eventBus.removeEventListener(eventName, callback);
}

function removeAllListeners() {
  activeListeners.forEach((callbacks, eventName) => {
    callbacks.forEach((callback) => {
      eventBus.removeEventListener(eventName, callback);
    });
  });
  activeListeners.clear();
}

function cleanup() {
  stopCacheCleanup();
  stopAutoCleanup();
  stopSentDataCleanup(); // Stop sent data cleanup
  cleanupCoalescedEvents();
  removeAllListeners();
}

if (typeof window !== "undefined") {
  startCacheCleanup();
  startAutoCleanup();
  startSentDataCleanup(); // Start automatic sent data cleanup

  window.addEventListener("beforeunload", cleanup);
}

async function deleteQueueItem(id) {
  try {
    const db = await getDB();
    await db.delete(STORES.QUEUE, id);
    emitCoalescedEvent("queue:updated");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete queue item:", error);
    return { success: false, error: error.message };
  }
}

async function deleteFailedItem(id) {
  try {
    const db = await getDB();
    await db.delete(STORES.FAILED, id);
    emitCoalescedEvent("queue:updated");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete failed item:", error);
    return { success: false, error: error.message };
  }
}

async function getFailedQueue() {
  try {
    const db = await getDB();
    return await db.getAll(STORES.FAILED);
  } catch (error) {
    console.error("Failed to get failed queue:", error);
    return [];
  }
}

export const offlineService = {
  apiCall,

  get,
  post,
  put,
  patch,
  delete: del,

  addToQueue,
  getQueue,
  getPendingCount,
  syncAllPending,
  syncQueueItem,
  syncSelected,
  retryFailed,
  retrySingle,
  deleteQueueItem,
  deleteFailedItem,
  getFailedQueue,
  
  // New sent queue functions
  getSentQueue,
  deleteSentItem,
  getQueueStats,
  cleanupExpiredSentData,

  setCache,
  getCache,
  clearCache,
  clearAll,
  clearCacheByPrefix,

  on,
  off,

  startCacheCleanup,
  stopCacheCleanup,
  cleanupExpiredCache,
  cleanupStaleCache,
  cleanupOldCache,
  getCacheStats,
  cleanup,
  removeAllListeners,

  getTTLForDate,
  isDateRangeToday,
  CACHE_CONFIG,
  SENT_DATA_RETENTION,
};