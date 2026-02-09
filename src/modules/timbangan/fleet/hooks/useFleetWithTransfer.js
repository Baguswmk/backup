import { useState, useCallback } from "react";
import { fleetTransferService } from "@/modules/timbangan/fleet/services/fleetTransferService";
import { showToast } from "@/shared/utils/toast";
import { logger } from "@/shared/services/log";

/**
 * Hook untuk mengelola fleet dengan dukungan transfer dump truck
 * @param {Object} user - User object
 * @param {Function} onSuccess - Callback yang dipanggil setelah operasi berhasil (untuk trigger refetch)
 */
export const useFleetWithTransfer = (user, onSuccess) => {
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handle create fleet (bisa dengan transfer DT dari fleet lain)
   */
  const handleCreateFleet = useCallback(
    async (fleetData) => {
      setIsSaving(true);

      try {
        if (!fleetData.pairDtOp || fleetData.pairDtOp.length === 0) {
          showToast.error("Fleet baru harus memiliki minimal 1 dump truck");
          setIsSaving(false);
          return {
            success: false,
            error: "Fleet baru harus memiliki minimal 1 dump truck",
          };
        }

        logger.info("🔵 Creating new fleet", {
          hasTransfers: !!fleetData.moveFromFleets,
          transfersCount: fleetData.moveFromFleets?.length || 0,
        });

        const result = await fleetTransferService.saveFleetWithTransfer(
          fleetData,
          false, // isEdit = false
          null, // currentFleetId = null
        );

        if (result.success) {
          showToast.success("Fleet berhasil dibuat");

          // Jika ada DT yang dipindahkan, beri notifikasi tambahan
          if (fleetData.moveFromFleets && fleetData.moveFromFleets.length > 0) {
            showToast.info(
              `${fleetData.moveFromFleets.length} dump truck berhasil dipindahkan`,
            );
          }

          if (onSuccess) {
            try {
              logger.info("🔄 Triggering refetch after create");
              await onSuccess();
              logger.info("✅ Refetch completed successfully");
            } catch (refetchError) {
              console.error("❌ onSuccess() threw error:", refetchError);
              logger.error("❌ Refetch failed:", {
                error: refetchError.message,
                stack: refetchError.stack,
              });
              // Re-throw to be caught by outer catch
              throw refetchError;
            }
          }

          return result;
        } else {
          showToast.error(result.error || "Gagal membuat fleet");
          return result;
        }
      } catch (error) {
        logger.error("❌ Create fleet error", { error: error.message });
        showToast.error(error.message || "Gagal membuat fleet");

        return {
          success: false,
          error: error.message,
        };
      } finally {
        setIsSaving(false);
      }
    },
    [onSuccess],
  );

  /**
   * Handle update fleet (bisa dengan transfer DT dari fleet lain)
   */
  const handleUpdateFleet = useCallback(
    async (fleetId, fleetData) => {
      setIsSaving(true);

      try {
        if (fleetData.pairDtOp && fleetData.pairDtOp.length === 0) {
          // ⚠️ Warning saja, tapi tetap ijinkan update
          logger.warn("⚠️ Updating fleet to have 0 dump trucks", { fleetId });
          showToast.warning("Fleet akan menjadi kosong (0 dump truck)");
        }

        logger.info("🔵 Updating fleet", {
          fleetId,
          hasTransfers: !!fleetData.moveFromFleets,
          transfersCount: fleetData.moveFromFleets?.length || 0,
        });

        const result = await fleetTransferService.saveFleetWithTransfer(
          fleetData,
          true, // isEdit = true
          fleetId,
        );

        if (result.success) {
          showToast.success("Fleet berhasil diupdate");

          // Jika ada DT yang dipindahkan, beri notifikasi tambahan
          if (fleetData.moveFromFleets && fleetData.moveFromFleets.length > 0) {
            showToast.info(
              `${fleetData.moveFromFleets.length} dump truck berhasil dipindahkan`,
            );
          }

          // ✅ TRIGGER REFETCH
          if (onSuccess) {
            logger.info("🔄 Triggering refetch after update");
            await onSuccess();
          }

          return result;
        } else {
          showToast.error(result.error || "Gagal update fleet");
          return result;
        }
      } catch (error) {
        logger.error("❌ Update fleet error", { error: error.message });
        showToast.error(error.message || "Gagal update fleet");

        return {
          success: false,
          error: error.message,
        };
      } finally {
        setIsSaving(false);
      }
    },
    [onSuccess],
  );

  /**
   * ✅ FIX: Handle save dengan 3 cara pemanggilan berbeda
   *
   * Cara 1 (FleetManagement normal create/update):
   *   handleSaveFleet(fleetData)
   *   - Deteksi create/update berdasarkan fleetData.id
   *
   * Cara 2 (FleetModal split mode edit - dengan editConfig):
   *   handleSaveFleet(payload, { id: fleetId })
   *   - Parameter kedua adalah editConfig yang punya property 'id'
   *
   * Cara 3 (FleetModal split mode create):
   *   handleSaveFleet(payload, null)
   *   - Parameter kedua null = create
   *
   * @param {Object} fleetData - Data fleet yang akan disave
   * @param {Object|null} editConfig - Edit config atau null
   *   - null = create
   *   - { id: fleetId } = update dengan ID tertentu
   */
  /**
   * ✅ UPDATED: Handle save dengan support untuk split mode bulk
   *
   * Scenarios:
   * 1. Normal create/update - single fleet
   * 2. Split create - bulk create 2-3 fleets
   * 3. Split update - bulk update 2-3 fleets
   *
   * @param {Object|Array} fleetData - Single fleet atau array of fleets (untuk split)
   * @param {Object|null} editConfig - Edit config atau null
   */
  const handleSaveFleet = useCallback(
    async (fleetData, editConfig = null) => {
      // ✅ CHECK: Apakah ini bulk operation (array)?
      if (Array.isArray(fleetData)) {
        // BULK MODE (Split fleets)
        logger.info("🔀 handleSaveFleet: BULK mode detected", {
          fleetsCount: fleetData.length,
          hasEditConfig: !!editConfig,
        });

   // ✅ Check if ANY fleet has ID (not ALL)
const someHaveIds = fleetData.some((f) => f.id);

if (someHaveIds) {
  // If ANY fleet has ID, use bulk edit (handles mixed)
  return handleBulkEditFleets(fleetData);
} else {
  // Only if NO fleets have ID, use bulk create
  return handleBulkCreateFleets(fleetData);
}
      }

      // SINGLE FLEET MODE (existing logic)
      const fleetId = editConfig?.id || editConfig?.ids?.[0] || fleetData.id;

      if (fleetId) {
        logger.info("📝 handleSaveFleet: UPDATE mode detected", {
          fleetId,
        });
        return handleUpdateFleet(fleetId, fleetData);
      } else {
        logger.info("➕ handleSaveFleet: CREATE mode detected");
        return handleCreateFleet(fleetData);
      }
    },
    [handleCreateFleet, handleUpdateFleet],
  );

  /**
   * ✅ NEW: Handle bulk create fleets (untuk split mode)
   */
  const handleBulkCreateFleets = useCallback(
    async (fleetsData) => {
      setIsSaving(true);

      try {
        logger.info("🚀 Bulk creating fleets", {
          count: fleetsData.length,
        });

        // Validate all fleets have required dump trucks
        const fleetsWithoutDT = fleetsData.filter(
          (f) => !f.pairDtOp || f.pairDtOp.length === 0,
        );

        if (fleetsWithoutDT.length > 0) {
          showToast.error("Setiap fleet harus memiliki minimal 1 dump truck");
          return {
            success: false,
            error: "Setiap fleet harus memiliki minimal 1 dump truck",
          };
        }

        // Use fleetSplitService for bulk create
        const { fleetSplitService } =
          await import("../services/fleetSplitService");

        // Transform fleetsData to splitData format
        const splitData = {
          excavatorId: fleetsData[0].excavatorId,
          loadingLocationId: fleetsData[0].loadingLocationId,
          coalTypeId: fleetsData[0].coalTypeId,
          workUnitId: fleetsData[0].workUnitId,
          measurement_type: fleetsData[0].measurementType,
          checkerIds: fleetsData[0].checkerIds,
          inspectorIds: fleetsData[0].inspectorIds,
          weightBridgeId: fleetsData[0].weightBridgeId,
          createdByUserId: fleetsData[0].createdByUserId,
          splits: fleetsData.map((f) => ({
            dumpingLocationId: f.dumpingLocationId,
            distance: f.distance,
            measurementType: f.measurementType,
            pairDtOp: f.pairDtOp,
            inspectorIds: f.inspectorIds, // ✅ CRITICAL: Per-fleet inspectors
            checkerIds: f.checkerIds,
          })),
        };

        const result = await fleetSplitService.createSplitFleets(splitData);

        if (result.success) {
          showToast.success(`Berhasil membuat ${fleetsData.length} fleet`);

          // ✅ TRIGGER REFETCH
          if (onSuccess) {
            logger.info("🔄 Triggering refetch after bulk create");
            await onSuccess();
          }

          return result;
        } else {
          showToast.error(result.error || "Gagal membuat fleet");
          return result;
        }
      } catch (error) {
        logger.error("❌ Bulk create fleets error", { error: error.message });
        showToast.error(error.message || "Gagal membuat fleet");

        return {
          success: false,
          error: error.message,
        };
      } finally {
        setIsSaving(false);
      }
    },
    [onSuccess],
  );

  /**
   * ✅ NEW: Handle bulk edit fleets (untuk editing merged/split groups)
   */
  const handleBulkEditFleets = useCallback(
    async (fleetsData) => {
      setIsSaving(true);

      try {
        logger.info("✏️ Bulk editing fleets", {
          count: fleetsData.length,
          fleetIds: fleetsData.map((f) => f.id),
        });

        const { fleetSplitService } =
          await import("../services/fleetSplitService");

        const result = await fleetSplitService.bulkEditFleets(fleetsData);

        if (result.success) {
          showToast.success(`Berhasil update ${fleetsData.length} fleet`);

          // ✅ TRIGGER REFETCH
          if (onSuccess) {
            logger.info("🔄 Triggering refetch after bulk edit");
            await onSuccess();
          }

          return result;
        } else {
          showToast.error(result.error || "Gagal update fleet");
          return result;
        }
      } catch (error) {
        logger.error("❌ Bulk edit fleets error", { error: error.message });
        showToast.error(error.message || "Gagal update fleet");

        return {
          success: false,
          error: error.message,
        };
      } finally {
        setIsSaving(false);
      }
    },
    [onSuccess],
  );

/**
 * ✅ NEW: Handle bulk delete fleets
 */
const handleBulkDeleteFleets = useCallback(
  async (fleetIds) => {
    setIsSaving(true);

    try {
      logger.info("🗑️ Bulk deleting fleets", {
        count: fleetIds.length,
        fleetIds,
      });

      const { fleetSplitService } = await import("../services/fleetSplitService");

      const result = await fleetSplitService.bulkDeleteFleets(fleetIds);

      if (result.success) {
        showToast.success(`Berhasil delete ${fleetIds.length} fleet`);

        // ✅ TRIGGER REFETCH
        if (onSuccess) {
          logger.info("🔄 Triggering refetch after bulk delete");
          await onSuccess();
        }

        return result;
      } else {
        showToast.error(result.error || "Gagal delete fleet");
        return result;
      }
    } catch (error) {
      logger.error("❌ Bulk delete fleets error", { error: error.message });
      showToast.error(error.message || "Gagal delete fleet");

      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsSaving(false);
    }
  },
  [onSuccess]
);

// Export
return {
  isSaving,
  handleCreateFleet,
  handleUpdateFleet,
  handleSaveFleet,
  handleBulkCreateFleets,
  handleBulkEditFleets,
  handleBulkDeleteFleets, // ✅ EXPORT
};
};
