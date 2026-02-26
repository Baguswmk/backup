import { useState, useCallback } from "react";
import { logger } from "@/shared/services/log";
import { ritasePendingService } from "../services/ritasePendingService";
import { showToast } from "@/shared/utils/toast";

const showSyncResultToast = (result) => {
  const data = result?.data;

  // Kalau tidak ada data struktur baru, fallback ke toast generik
  if (!data || (data.success === undefined && data.fail === undefined)) {
    if (result?.success || result?.status === "success") {
      showToast.success("✅ Sinkronisasi berhasil");
    } else {
      showToast.error(`❌ Sinkronisasi gagal: ${result?.error || result?.message || "Terjadi kesalahan"}`);
    }
    return;
  }

  const successCount = data.success ?? 0;
  const failCount = data.fail ?? 0;
  const failList = data.fail_list ?? [];

  if (successCount > 0 && failCount === 0) {
    // Semua berhasil
    showToast.success(
      `✅ ${successCount} ritase berhasil disinkronisasi`,
      { duration: 4000 }
    );
  } else if (successCount === 0 && failCount > 0) {
    // Semua gagal
    const firstFail = failList[0];
    showToast.error(
      `❌ ${failCount} ritase gagal disinkronisasi${firstFail ? `: ${firstFail.message}` : ""}`,
      {
        duration: 6000,
        description:
          failCount > 1
            ? `${failList
              .slice(0, 3)
              .map((f) => `• ${f.no_lambung}: ${f.message}`)
              .join("\n")}${failCount > 3 ? `\n• ...dan ${failCount - 3} lainnya` : ""}`
            : undefined,
      }
    );
  } else if (successCount > 0 && failCount > 0) {
    // Sebagian berhasil, sebagian gagal
    showToast.warning(
      `⚠️ ${successCount} berhasil, ${failCount} gagal`,
      {
        duration: 6000,
        description: failList
          .slice(0, 3)
          .map((f) => `• ${f.no_lambung}: ${f.message}`)
          .join("\n") + (failCount > 3 ? `\n• ...dan ${failCount - 3} lainnya` : ""),
      }
    );
  } else {
    // 0 success, 0 fail — tidak ada yang diproses
    showToast.info("ℹ️ Tidak ada ritase yang diproses", { duration: 3000 });
  }
};

export const useRitasePendingSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  // ─── Sync a single ritase ──────────────────────────────────────────────────
  const syncRitase = useCallback(async (ritase) => {
    setIsSyncing(true);
    try {
      a
      logger.info("🔄 Syncing single ritase", { id: ritase.id });

      const result = await ritasePendingService.syncSingleRitase(ritase);
      showSyncResultToast(result);

      if (result.success) {
        logger.info("✅ Ritase synced", { id: ritase.id });
      } else {
        logger.warn("⚠️ Ritase sync failed", { id: ritase.id, error: result.error });
      }

      return result;
    } catch (error) {
      logger.error("❌ syncRitase error", { id: ritase.id, error: error.message });
      showToast.error(`❌ Gagal sync ritase: ${error.message}`);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ─── Sync multiple ritases (auto-route: single vs bulk) ───────────────────
  const syncRitases = useCallback(async (ritases) => {
    if (!ritases?.length) return { success: true };

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: ritases.length });

    try {
      let result;

      if (ritases.length === 1) {
        logger.info("🔄 Syncing single ritase (via syncRitases)", { id: ritases[0].id });
        result = await ritasePendingService.syncSingleRitase(ritases[0]);
      } else {
        logger.info("🔄 Syncing bulk ritase", { count: ritases.length });
        result = await ritasePendingService.syncBulkRitase(ritases);
      }
      console.log(result);
      showSyncResultToast(result);

      const successCount = result?.data?.success ?? 0;
      const failCount = result?.data?.fail ?? 0;

      logger.info("✅ Sync completed", { successCount, failCount });

      setSyncProgress({ current: ritases.length, total: ritases.length });

      // Anggap "ada yang berhasil" = partial success, trigger refresh
      return {
        ...result,
        partialSuccess: successCount > 0,
      };
    } catch (error) {
      logger.error("❌ syncRitases error", { count: ritases.length, error: error.message });
      showToast.error(`❌ Gagal sinkronisasi: ${error.message}`);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, []);

  // ─── Sync all ritases in a location group ─────────────────────────────────
  const syncLocation = useCallback(
    async (location) => {
      const ritases = location.ritases ?? [];
      if (ritases.length === 0) return { success: true };

      logger.info("📦 Syncing location", {
        location: location.locationKey,
        count: ritases.length,
      });

      return syncRitases(ritases);
    },
    [syncRitases]
  );

  return {
    isSyncing,
    syncProgress,
    syncRitase,   // untuk 1 item (dari tombol per-row di modal)
    syncRitases,  // untuk 1 atau banyak item, auto-route
    syncLocation, // untuk semua ritase dalam 1 lokasi
  };
};