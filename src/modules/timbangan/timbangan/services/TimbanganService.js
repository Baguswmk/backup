import { offlineService } from "@/shared/services/offlineService";

const generateId = (prefix = "item") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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

      // Online & berhasil → simpan ke sent_queue untuk tracking
      if (navigator.onLine) {
        await offlineService.addToSentQueue({
          id: generateId("online"),
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
      // "Request queued" bukan error — ini sukses offline
      const isQueued =
        error?.message?.includes("queued") ||
        error?.message?.includes("offline sync");

      if (isQueued) {
        // ✅ Return sukses, bukan throw
        return { queued: true, status: "queued", offline: true };
      }

      // Error beneran (validasi, server error, dll)
      console.error("❌ Create timbangan error:", error);
      throw error;
    }
  },

  /**
   * Ambil semua queue dari satu DB (single source of truth)
   */
  getAllQueues: async () => {
    const sortByTime = (a, b) =>
      (b.sentAt || b.timestamp || 0) - (a.sentAt || a.timestamp || 0);

    const [pending, failed, sent] = await Promise.all([
      offlineService.getQueue(),
      offlineService.getFailedQueue(),
      offlineService.getSentQueue(),
    ]);

    return {
      pending: pending.sort(sortByTime),
      failed: failed.sort(sortByTime),
      sent: sent.sort(sortByTime),
      counts: {
        pending: pending.length,
        failed: failed.length,
        sent: sent.length,
        total: pending.length + failed.length + sent.length,
      },
    };
  },

  /**
   * Delete item berdasarkan status — semua lewat offlineService (satu DB)
   */
  deleteItem: async (id, status) => {
    switch (status) {
      case "sent":
        return offlineService.deleteSentItem(id);
      case "failed":
        return offlineService.deleteFailedItem(id);
      case "pending":
        return offlineService.deleteQueueItem(id);
      default:
        console.warn(`Unknown status for delete: ${status}`);
        return { success: false, error: `Unknown status: ${status}` };
    }
  },

  /**
   * Sync & retry methods — delegasi ke offlineService
   */
  syncAllPending: offlineService.syncAllPending,
  retrySingle: offlineService.retrySingle,
  cleanupSentQueue: offlineService.cleanupSentQueue,

  /**
   * Shortcut getters
   */
  getPendingQueue: () => offlineService.getQueue(),
  getSentQueue: () => offlineService.getSentQueue(),
  getFailedQueue: () => offlineService.getFailedQueue(),
  getQueueCounts: async () => {
    const [pending, failed, sent] = await Promise.all([
      offlineService.getQueue(),
      offlineService.getFailedQueue(),
      offlineService.getSentQueue(),
    ]);
    return {
      pending: pending.length,
      failed: failed.length,
      sent: sent.length,
      total: pending.length + failed.length + sent.length,
    };
  },

  /**
   * Passthrough untuk kompatibilitas kode lama
   */
  getQueue: offlineService.getQueue,
  deleteQueueItem: offlineService.deleteQueueItem,
  deleteSentItem: offlineService.deleteSentItem,
  deleteFailedItem: offlineService.deleteFailedItem,
};