import { useState, useCallback } from "react";
import { logger } from "@/shared/services/log";
import { ritasePendingService } from "../services/ritasePendingService";

/**
 * Hook that provides sync utilities for pending ritases.
 *
 * Exports:
 *  - isSyncing       boolean
 *  - syncProgress    { current, total } | null
 *  - syncRitase      (ritase)    => Promise<{ success, error? }>
 *  - syncRitases     (ritases[]) => Promise<{ success, error? }>
 *                    ^ auto-routing: 1 item → single endpoint, >1 → bulk endpoint
 *  - syncLocation    (location)  => Promise<{ success, error? }>
 */
export const useRitasePendingSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  // ─── Sync a single ritase ──────────────────────────────────────────────────
  const syncRitase = useCallback(async (ritase) => {
    setIsSyncing(true);
    try {
      const result = await ritasePendingService.syncSingleRitase(ritase);
      if (result.success) {
        logger.info("✅ Ritase synced", { id: ritase.id });
      } else {
        logger.warn("⚠️ Ritase sync failed", { id: ritase.id, error: result.error });
      }
      return result;
    } catch (error) {
      logger.error("❌ syncRitase error", error);
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
        // Satu item → pakai single endpoint
        result = await ritasePendingService.syncSingleRitase(ritases[0]);
        if (result.success) {
          logger.info("✅ Single ritase synced (via syncRitases)", { id: ritases[0].id });
        }
      } else {
        // Lebih dari satu → pakai bulk endpoint
        result = await ritasePendingService.syncBulkRitase(ritases);
        if (result.success) {
          logger.info("✅ Bulk ritase synced", { count: ritases.length });
        } else {
          logger.warn("⚠️ Bulk sync failed", { error: result.error });
        }
      }

      setSyncProgress({ current: ritases.length, total: ritases.length });
      return result;
    } catch (error) {
      logger.error("❌ syncRitases error", error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, []);

  // ─── Sync all ritases in a location group ─────────────────────────────────
  const syncLocation = useCallback(async (location) => {
    const ritases = location.ritases ?? [];
    if (ritases.length === 0) return { success: true };

    logger.info("📦 Syncing location", {
      location: location.locationKey,
      count: ritases.length,
    });

    return syncRitases(ritases);
  }, [syncRitases]);

  return {
    isSyncing,
    syncProgress,
    syncRitase,    // untuk 1 item (dari tombol per-row di modal)
    syncRitases,   // untuk 1 atau banyak item, auto-route
    syncLocation,  // untuk semua ritase dalam 1 lokasi
  };
};