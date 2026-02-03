import { useState, useCallback } from "react";
import { fleetService } from "@/modules/timbangan/fleet/services/fleetService";
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
        logger.info("🔵 Creating new fleet", {
          hasTransfers: !!fleetData.moveFromFleets,
          transfersCount: fleetData.moveFromFleets?.length || 0,
        });

        const result = await fleetTransferService.saveFleetWithTransfer(
          fleetData,
          false, // isEdit = false
          null // currentFleetId = null
        );

        if (result.success) {
          showToast.success("Fleet berhasil dibuat");

          // Jika ada DT yang dipindahkan, beri notifikasi tambahan
          if (fleetData.moveFromFleets && fleetData.moveFromFleets.length > 0) {
            showToast.info(
              `${fleetData.moveFromFleets.length} dump truck berhasil dipindahkan`
            );
          }

          // ✅ TRIGGER REFETCH
          if (onSuccess) {
            logger.info("🔄 Triggering refetch after create");
            await onSuccess(); // ✅ FIX: Tambahkan await
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
    [onSuccess]
  );

  /**
   * Handle update fleet (bisa dengan transfer DT dari fleet lain)
   */
  const handleUpdateFleet = useCallback(
    async (fleetId, fleetData) => {
      setIsSaving(true);

      try {
        logger.info("🔵 Updating fleet", {
          fleetId,
          hasTransfers: !!fleetData.moveFromFleets,
          transfersCount: fleetData.moveFromFleets?.length || 0,
        });

        const result = await fleetTransferService.saveFleetWithTransfer(
          fleetData,
          true, // isEdit = true
          fleetId
        );

        if (result.success) {
          showToast.success("Fleet berhasil diupdate");

          // Jika ada DT yang dipindahkan, beri notifikasi tambahan
          if (fleetData.moveFromFleets && fleetData.moveFromFleets.length > 0) {
            showToast.info(
              `${fleetData.moveFromFleets.length} dump truck berhasil dipindahkan`
            );
          }

          // ✅ TRIGGER REFETCH
          if (onSuccess) {
            logger.info("🔄 Triggering refetch after update");
            await onSuccess(); // ✅ FIX: Tambahkan await
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
    [onSuccess]
  );

  /**
   * Handle save (create atau update)
   * 
   * ✅ FIX SIGNATURE: Disesuaikan dengan cara FleetManagement memanggil function ini
   * FleetManagement memanggil: handleSaveFleet(config, transferInfo, mode)
   * 
   * @param {Object} fleetData - Data fleet yang akan disave
   * @param {Object} transferInfo - Transfer info (optional, tidak digunakan saat ini)
   * @param {string} mode - "create" atau "update" (optional)
   */
  const handleSaveFleet = useCallback(
    async (fleetData, transferInfo = null, mode = null) => {
      // ✅ FIX: Deteksi mode berdasarkan fleetData.id ATAU parameter mode
      const isUpdate = fleetData.id || mode === "update";
      
      if (isUpdate) {
        // Untuk update, gunakan fleetData.id
        return handleUpdateFleet(fleetData.id, fleetData);
      } else {
        return handleCreateFleet(fleetData);
      }
    },
    [handleCreateFleet, handleUpdateFleet]
  );

  return {
    isSaving,
    handleCreateFleet,
    handleUpdateFleet,
    handleSaveFleet,
  };
};
