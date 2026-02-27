import { openDB } from "idb";
import { apiClient } from "@/shared/services/api";

const DB_NAME = "Timbangan_app";
const DB_VERSION = 2;
const STORES = {
  QUEUE: "offline_queue",
  CACHE: "api_cache",
  FAILED: "failed_queue",
  SENT: "sent_queue", // ← store baru
};

const CACHE_CONFIG = {
  FLEET_TODAY: 5 * 60 * 1000,
  FLEET_HISTORY: 30 * 60 * 1000,
  TIMBANGAN_TODAY: 5 * 60 * 1000,
  TIMBANGAN_HISTORY: 30 * 60 * 1000,
  MASTERS: 60 * 60 * 1000,
  MAX_AGE_DAYS: 7,
  MAX_ENTRIES: 100,
  CLEANUP_INTERVAL: 1 * 60 * 60 * 1000,
  AUTO_CLEANUP_ENABLED: true,
};

const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000;
const CACHE_MAX_AGE = 60 * 60 * 1000;

let dbInstance = null;
const eventBus = new EventTarget();

let cacheCleanupTimer = null;
let autoCacheCleanupTimer = null;
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
    upgrade(db, oldVersion) {
      // ── Store lama (versi 1) ──────────────────────────────────────
      if (oldVersion < 1) {
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
      }

      // ── Store baru (versi 2): sent_queue ─────────────────────────
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORES.SENT)) {
          const sentStore = db.createObjectStore(STORES.SENT, {
            keyPath: "id",
          });
          sentStore.createIndex("sentAt", "sentAt");
          sentStore.createIndex("timestamp", "timestamp");
        }
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
        other:
          allCache.length -
          fleetCache.length -
          timbanganCache.length -
          masterCache.length,
      },

      oldestTimestamp:
        allCache.length > 0
          ? Math.min(...allCache.map((c) => c.timestamp))
          : null,
      newestTimestamp:
        allCache.length > 0
          ? Math.max(...allCache.map((c) => c.timestamp))
          : null,

      totalSize: allCache.reduce((sum, item) => {
        return sum + JSON.stringify(item.data).length;
      }, 0),

      averageAge:
        allCache.length > 0
          ? (now -
              allCache.reduce((sum, c) => sum + c.timestamp, 0) /
                allCache.length) /
            1000 /
            60
          : 0,
    };

    return stats;
  } catch (error) {
    console.error("❌ Failed to get cache stats:", error);
    return null;
  }
}

function startCacheCleanup() {
  if (cacheCleanupTimer) {
    return;
  }

  cleanupExpiredCache();

  cacheCleanupTimer = setInterval(async () => {
    await cleanupExpiredCache();

    const runCount = Math.floor(Date.now() / CACHE_CLEANUP_INTERVAL);
    if (runCount % 6 === 0) {
      await cleanupStaleCache();
    }
  }, CACHE_CLEANUP_INTERVAL);
}

function startAutoCleanup() {
  if (!CACHE_CONFIG.AUTO_CLEANUP_ENABLED) {
    return;
  }

  if (autoCacheCleanupTimer) {
    return;
  }

  cleanupOldCache();

  autoCacheCleanupTimer = setInterval(async () => {
    await cleanupOldCache();
  }, CACHE_CONFIG.CLEANUP_INTERVAL);
}

function stopCacheCleanup() {
  if (cacheCleanupTimer) {
    clearInterval(cacheCleanupTimer);
    cacheCleanupTimer = null;
  }

  if (autoCacheCleanupTimer) {
    clearInterval(autoCacheCleanupTimer);
    autoCacheCleanupTimer = null;
  }
}

async function* chunkArray(array, size) {
  for (let i = 0; i < array.length; i += size) {
    yield array.slice(i, i + size);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function clearStoreChunked(storeName, chunkSize = 50) {
  const db = await getDB();
  const tx = db.transaction(storeName, "readonly");
  const allKeys = await tx.store.getAllKeys();

  for await (const chunk of chunkArray(allKeys, chunkSize)) {
    const delTx = db.transaction(storeName, "readwrite");
    await Promise.all(chunk.map((key) => delTx.store.delete(key)));
    await delTx.done;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function generateCacheKey(url, config = {}) {
  const { params, filters } = config;
  const parts = [url];

  if (params) {
    parts.push(JSON.stringify(params));
  }

  if (filters) {
    parts.push(JSON.stringify(filters));
  }

  return parts.join("|");
}

async function apiCall(url, method = "GET", data = null, options = {}) {
  const {
    cacheKey = null,
    ttl = 5 * 60 * 1000,
    bypassQueue = false,
    forceRefresh = false,
    params = null,
    timeout, // <-- Tambahkan parameter opsi timeout di sini
  } = options;

  const isOnline = navigator.onLine;
  const effectiveCacheKey =
    cacheKey || (method === "GET" ? generateCacheKey(url, { params }) : null);

  if (forceRefresh && method === "GET" && effectiveCacheKey) {
    const db = await getDB();
    await db.delete(STORES.CACHE, effectiveCacheKey);
  }

  if (method === "GET" && effectiveCacheKey && !forceRefresh) {
    const cached = await getCache(effectiveCacheKey);
    if (cached) {
      return cached;
    }
  }

  if (isOnline) {
    try {
      const config = { method, ...options };
      if (data) config.data = data;
      if (params) config.params = params;
      if (timeout) config.timeout = timeout;

      const response = await apiClient(url, config);

      if (method === "GET" && effectiveCacheKey) {
        await setCache(effectiveCacheKey, response.data, ttl);
      }

      return response.data;
    } catch (error) {
      let errorMessage = "Request failed";
      let errorDetails = {};

      if (error.response) {
        const responseData = error.response.data;

        errorMessage =
          responseData?.message ||
          responseData?.error?.message ||
          responseData?.error ||
          error.message ||
          "Request failed";

        errorDetails = {
          status: error.response.status,
          data: responseData,
        };

        console.error(`❌ API call failed: ${method} ${url}`, {
          message: errorMessage,
          status: error.response.status,
          data: responseData,
        });
      } else if (error.request) {
        errorMessage = "No response from server";
        console.error(`❌ No response: ${method} ${url}`, error.request);
      } else {
        errorMessage = error.message;
        console.error(`❌ Request error: ${method} ${url}`, error.message);
      }

      const isValidationError =
        error.response?.status >= 400 && error.response?.status < 500;

      // Hapus logika yang memasukkan error server/validasi ke dalam antrian `Pending`
      // Jika errornya berasal dari response BE (ada error.response), lemparkan error-nya
      // Hanya jika network benar-benar mati (error.request ada tapi error.response tidak ada)
      // atau `navigator.onLine` false, baru kita masukkan ke antrian.

      if (!bypassQueue && ["POST", "PUT", "PATCH"].includes(method)) {
        if (!error.response && error.request) {
          await addToQueue({ url, method, data, options });
          emitCoalescedEvent("queue:updated");
          throw new Error("Request queued for offline sync");
        }
      }

      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.validationError = isValidationError;
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  }

  if (bypassQueue) {
    throw new Error("Network unavailable and bypass queue enabled");
  }

  if (["POST", "PUT", "PATCH"].includes(method)) {
    await addToQueue({ url, method, data, options });
    emitCoalescedEvent("queue:updated");
    throw new Error("Request queued for offline sync");
  }

  if (method === "GET" && effectiveCacheKey) {
    const cached = await getCache(effectiveCacheKey, true);
    if (cached) {
      return cached;
    }
  }

  throw new Error("No cache available and network is offline");
}

async function get(url, config = {}) {
  const {
    cacheKey,
    ttl = 5 * 60 * 1000,
    forceRefresh = false,
    ...restConfig
  } = config;

  return apiCall(url, "GET", null, {
    cacheKey,
    ttl,
    forceRefresh,
    ...restConfig,
  });
}

async function post(url, data, config = {}) {
  const { bypassQueue = false, timeout, ...restConfig } = config;

  return apiCall(url, "POST", data, {
    bypassQueue,
    timeout,
    ...restConfig,
  });
}

async function put(url, data, config = {}) {
  const { bypassQueue = false, timeout, ...restConfig } = config;

  return apiCall(url, "PUT", data, {
    bypassQueue,
    timeout,
    ...restConfig,
  });
}

async function patch(url, data, config = {}) {
  const { bypassQueue = false, timeout, ...restConfig } = config;

  return apiCall(url, "PATCH", data, {
    bypassQueue,
    timeout,
    ...restConfig,
  });
}

async function del(url, config = {}) {
  const { bypassQueue = true, timeout, ...restConfig } = config;

  return apiCall(url, "DELETE", null, {
    bypassQueue,
    timeout,
    ...restConfig,
  });
}

async function addToQueue(request) {
  const db = await getDB();
  const item = {
    ...request,
    timestamp: Date.now(),
    clientTimestamp: request.data?.clientTimestamp || new Date().toISOString(),
    createdAtClient: new Date().toISOString(),
    status: "pending",
    retryCount: 0,
  };

  await db.add(STORES.QUEUE, item);
}

async function getQueue() {
  const db = await getDB();
  return db.getAllFromIndex(STORES.QUEUE, "status", "pending");
}

async function getPendingCount() {
  const queue = await getQueue();
  return queue.length;
}

async function syncAllPending() {
  if (!navigator.onLine) {
    return { success: false, error: "Network offline" };
  }

  const queue = await getQueue();
  if (queue.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

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

    // ✅ Setelah berhasil sync, simpan ke sent_queue untuk tracking
    await addToSentQueue({
      id: `synced_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: item.url,
      method: item.method || "POST",
      data: item.data,
      timestamp: item.timestamp || Date.now(),
      clientTimestamp: item.clientTimestamp || new Date().toISOString(),
      retryCount: item.retryCount || 0,
      syncedFrom: "auto_sync",
    });

    return { success: true, item };
  } catch (error) {
    let errorMessage = error.message;
    let errorResponse = null;

    if (error.response) {
      const responseData = error.response.data;
      errorMessage =
        responseData?.message ||
        responseData?.error?.message ||
        responseData?.error ||
        error.message;

      errorResponse = {
        message: errorMessage,
        httpStatus: error.response.status,
        data: responseData,
      };
    }

    // Jika error memiliki response (artinya sudah sampai backend tapi ditolak),
    // atau jika retryCount sudah >= 2
    // Maka langsung masukkan ke antrian FAILED.
    // PENDING HANYA jika benar-benar tidak ada response sama sekali (network error / offline)

    if (item.retryCount >= 2 || error.response) {
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

    // Attach extracted message to the error object so the UI can easily display it
    error.extractedMessage = errorMessage;

    return { success: false, item, error };
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

async function retrySingle(id) {
  const db = await getDB();
  const item = await db.get(STORES.FAILED, id);
  if (!item) {
    return { success: false, error: "Item not found" };
  }

  await db.delete(STORES.FAILED, id);
  await db.add(STORES.QUEUE, {
    ...item,
    status: "pending",
    retryCount: 0,
  });

  return syncQueueItem(item);
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
  cleanupCoalescedEvents();
  removeAllListeners();
}

if (typeof window !== "undefined") {
  startCacheCleanup();
  startAutoCleanup();

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

async function getQueueItem(id) {
  const db = await getDB();
  return db.get(STORES.QUEUE, id);
}

// ── Sent Queue helpers (baru) ──────────────────────────────────────────────

async function addToSentQueue(item) {
  try {
    const db = await getDB();
    await db.put(STORES.SENT, {
      ...item,
      sentAt: Date.now(),
      sentTimestamp: new Date().toISOString(),
      status: "sent",
    });
    emitCoalescedEvent("queue:updated");
    return { success: true };
  } catch (error) {
    console.error("Failed to add to sent queue:", error);
    return { success: false, error: error.message };
  }
}

async function getSentQueue() {
  try {
    const db = await getDB();
    return await db.getAll(STORES.SENT);
  } catch (error) {
    console.error("Failed to get sent queue:", error);
    return [];
  }
}

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
 * Cleanup sent items older than 8 hours
 */
async function cleanupSentQueue() {
  try {
    const RETENTION_TIME = 8 * 60 * 60 * 1000; // 8 jam
    const db = await getDB();
    const cutoffTime = Date.now() - RETENTION_TIME;

    const tx = db.transaction(STORES.SENT, "readwrite");
    const store = tx.objectStore(STORES.SENT);
    const index = store.index("sentAt");

    const oldItems = await index.getAll(IDBKeyRange.upperBound(cutoffTime));

    for (const item of oldItems) {
      await store.delete(item.id);
    }

    await tx.done;

    if (oldItems.length > 0) {
      emitCoalescedEvent("queue:updated");
      window.dispatchEvent(
        new CustomEvent("timbangan:sent:cleaned", {
          detail: { deletedCount: oldItems.length },
        }),
      );
    }

    return { success: true, deletedCount: oldItems.length };
  } catch (error) {
    console.error("Failed to cleanup sent queue:", error);
    return { success: false, error: error.message };
  }
}

// Auto cleanup sent queue setiap 5 menit
if (typeof window !== "undefined") {
  setInterval(cleanupSentQueue, 5 * 60 * 1000);
}

export const offlineService = {
  apiCall,

  get,
  post,
  put,
  patch,
  delete: del,

  getQueueItem,
  addToQueue,
  getQueue,
  getPendingCount,
  syncAllPending,
  retryFailed,
  deleteQueueItem,
  deleteFailedItem,
  getFailedQueue,
  syncQueueItem,
  retrySingle,

  // ── Sent queue (baru) ──
  addToSentQueue,
  getSentQueue,
  deleteSentItem,
  cleanupSentQueue,

  // ── Failed queue (baru) ──
  addToFailedQueue: async (item) => {
    try {
      const db = await getDB();
      await db.add(STORES.FAILED, item);
      emitCoalescedEvent("queue:updated");
    } catch (error) {
      console.error("Failed to add to failed queue:", error);
    }
  },

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
};
