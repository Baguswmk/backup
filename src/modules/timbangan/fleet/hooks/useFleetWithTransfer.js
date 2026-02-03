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
        if (!fleetData.pairDtOp || fleetData.pairDtOp.length === 0) {
          showToast.error("Fleet baru harus memiliki minimal 1 dump truck");
          setIsSaving(false);
          return {
            success: false,
            error: "Fleet baru harus memiliki minimal 1 dump truck"
          };
        }
        
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
            await onSuccess();
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
    [onSuccess]
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
  const handleSaveFleet = useCallback(
    async (fleetData, editConfig = null) => {
      // ✅ FIX: Cek parameter kedua untuk menentukan mode
      
      // Jika editConfig punya property 'id' atau 'ids', ini adalah UPDATE
      const fleetId = editConfig?.id || editConfig?.ids?.[0] || fleetData.id;
      
      if (fleetId) {
        // MODE: UPDATE
        logger.info("🔵 handleSaveFleet: UPDATE mode detected", { 
          fleetId,
          hasEditConfig: !!editConfig,
          hasFleetDataId: !!fleetData.id 
        });
        
        return handleUpdateFleet(fleetId, fleetData);
      } else {
        // MODE: CREATE
        logger.info("🔵 handleSaveFleet: CREATE mode detected", {
          hasEditConfig: !!editConfig
        });
        
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