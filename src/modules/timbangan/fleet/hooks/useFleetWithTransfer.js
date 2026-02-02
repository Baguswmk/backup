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
            onSuccess();
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
            onSuccess();
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
   */
  const handleSaveFleet = useCallback(
    async (fleetData, editingConfig = null) => {
      if (editingConfig && editingConfig.id) {
        return handleUpdateFleet(editingConfig.id, fleetData);
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

/**
 * Contoh penggunaan di FleetManagement component:
 * 
 * const { handleSaveFleet } = useFleetWithTransfer(user, () => {
 *   // Auto refetch setelah save berhasil
 *   refetchFleetData();
 * });
 * 
 * <FleetModal
 *   isOpen={isModalOpen}
 *   onClose={handleCloseModal}
 *   editingConfig={editingConfig}
 *   onSave={handleSaveFleet}
 *   fleetType={selectedTab}
 *   availableDumptruckSettings={fleetConfigs}
 * />
 */