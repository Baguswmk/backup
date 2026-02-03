import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

/**
 * Service untuk menangani pemindahan dump truck antar fleet
 */
export const fleetTransferService = {
  /**
   * Handle save fleet dengan logic pindah DT dari fleet lain
   * @param {Object} payload - Payload dari FleetModal
   * @param {boolean} isEdit - Apakah ini mode edit atau create
   * @param {string} currentFleetId - ID fleet yang sedang diedit (null jika create)
   * @returns {Promise<Object>} Result dengan success status
   */
  async saveFleetWithTransfer(payload, isEdit = false, currentFleetId = null) {
    try {
      const { moveFromFleets, ...basePayload } = payload;

      // STEP 1: Jika ada DT yang perlu dipindahkan, update fleet lama dulu
      if (moveFromFleets && moveFromFleets.length > 0) {
        logger.info("🔄 Starting dump truck transfer", {
          count: moveFromFleets.length,
          transfers: moveFromFleets,
        });

        for (const transfer of moveFromFleets) {
          await this.removeDumptruckFromFleet(
            transfer.fromFleetId,
            transfer.dumpTruckId
          );
        }

        logger.info("✅ All dump trucks removed from old fleets");
      }

      // STEP 2: Sekarang save/update fleet dengan DT yang baru
      let result;
      if (isEdit && currentFleetId) {
        result = await this.updateFleetConfig(currentFleetId, basePayload);
      } else {
        result = await this.createFleetConfig(basePayload);
      }

      if (result.success) {
        logger.info("✅ Fleet saved successfully with transfers", {
          fleetId: isEdit ? currentFleetId : result.setting_fleet_id,
          movedCount: moveFromFleets?.length || 0,
        });
      }

      return result;
    } catch (error) {
      logger.error("❌ Failed to save fleet with transfer", {
        error: error.message,
        details: error.response?.data,
      });

      throw error;
    }
  },

  /**
   * Hapus dump truck dari fleet tertentu
   * @param {string} fleetId - ID fleet yang akan diupdate
   * @param {string} dumpTruckId - ID dump truck yang akan dihapus
   */
  async removeDumptruckFromFleet(fleetId, dumpTruckId) {
    try {
      logger.info("🗑️ Removing dump truck from fleet", {
        fleetId,
        dumpTruckId,
      });

      // Fetch fleet detail untuk mendapatkan pair_dt_op saat ini
      const fleetResponse = await offlineService.get(`/setting-fleets/${fleetId}`, {
        params: {
          populate: [
            "setting_dump_truck",
            "setting_dump_truck.pair_dt_op",
            "setting_dump_truck.pair_dt_op.dts",
            "setting_dump_truck.pair_dt_op.ops",
          ],
        },
      });

      const fleet = fleetResponse.data;
      const pairs = fleet.attributes?.setting_dump_truck?.data?.attributes?.pair_dt_op || [];

      // Filter pairs untuk hapus DT yang dimaksud
      const updatedPairs = pairs
        .filter((pair) => {
          const dtIds = (pair.dts?.data || []).map((dt) => String(dt.id));
          return !dtIds.includes(String(dumpTruckId));
        })
        .map((pair) => {
          const dtId = pair.dts?.data?.[0]?.id;
          const opId = pair.ops?.data?.[0]?.id;

          if (!dtId || !opId) {
            logger.warn("⚠️ Invalid pair detected", { pair });
            return null;
          }

          return {
            truckId: parseInt(dtId),
            operatorId: parseInt(opId),
          };
        })
        .filter(Boolean);


        if (updatedPairs.length === 0) {
  logger.info("✅ Fleet will have 0 dump trucks (valid state)", {
    fleetId,
  });
}

// Update fleet dengan pairs yang sudah difilter
const updatePayload = {
  pair_dt_op: updatedPairs, // Bisa [] (array kosong)
};

const endpoint = `/v1/custom/setting-fleet/${fleetId}`;

logger.info("📡 Updating fleet to remove dump truck", {
  fleetId,
  remainingPairs: updatedPairs.length,
  isEmpty: updatedPairs.length === 0,
  payload: updatePayload,
});

const response = await offlineService.put(endpoint, updatePayload);

if (response.status === "success") {
  logger.info("✅ Dump truck removed successfully", {
    fleetId,
    dumpTruckId,
    remainingPairs: updatedPairs.length,
    isEmpty: updatedPairs.length === 0,
  });

  // Clear cache
  await offlineService.clearCache("fleets_");

  return {
    success: true,
    fleetId,
    remainingPairs: updatedPairs.length,
    isEmpty: updatedPairs.length === 0,
  };
}

throw new Error("Failed to update fleet");
    } catch (error) {
      logger.error("❌ Failed to remove dump truck from fleet", {
        fleetId,
        dumpTruckId,
        error: error.message,
        details: error.response?.data,
      });

      throw error;
    }
  },

  /**
   * Create fleet config (wrapper dari fleetService)
   */
  async createFleetConfig(configData) {
    try {
      const now = new Date().toISOString();
       if (!configData.pairDtOp || configData.pairDtOp.length === 0) {
      throw new Error("Fleet baru harus memiliki minimal 1 dump truck");
    }

      // ✅ FIX: Support both measurementType (camelCase) and measurement_type (snake_case)
      const measurementType = configData.measurementType || configData.measurement_type;
      
      const payload = {
        unit_exca: configData.excavatorId
          ? parseInt(configData.excavatorId)
          : null,
        loading_location: configData.loadingLocationId
          ? parseInt(configData.loadingLocationId)
          : null,
        dumping_location: configData.dumpingLocationId
          ? parseInt(configData.dumpingLocationId)
          : null,
        coal_type: configData.coalTypeId
          ? parseInt(configData.coalTypeId)
          : null,
        distance: configData.distance || 0,
        pic_work_unit: configData.workUnitId
          ? parseInt(configData.workUnitId)
          : null,
        created_at: now,
        measurement_type: measurementType,
        isSplit: configData.isSplit !== undefined ? Boolean(configData.isSplit) : false,
        pair_dt_op: configData.pairDtOp.map((pair) => ({
          truckId: parseInt(pair.truckId),
          operatorId: parseInt(pair.operatorId),
        })),
      };

      if (
        configData.inspectorIds &&
        Array.isArray(configData.inspectorIds) &&
        configData.inspectorIds.length > 0
      ) {
        payload.inspectors = configData.inspectorIds.map((id) => parseInt(id));
      }

      if (
        configData.checkerIds &&
        Array.isArray(configData.checkerIds) &&
        configData.checkerIds.length > 0
      ) {
        payload.checkers = configData.checkerIds.map((id) => parseInt(id));
      }

      if (configData.createdByUserId) {
        payload.created_by_user = parseInt(configData.createdByUserId);
      }

      if (
        measurementType === "Timbangan" &&
        configData.weightBridgeId
      ) {
        payload.weigh_bridge = parseInt(configData.weightBridgeId);
      }

      const response = await offlineService.post(
        "/v1/custom/setting-fleet",
        payload
      );

      if (response.status === "success") {
        const fleetId =
          response.data?.data?.id_setting_fleet ||
          response.data?.id_setting_fleet;

        logger.info("✅ Fleet created, ID:", fleetId);

        await offlineService.clearCache("fleets_");

        return {
          success: true,
          data: {
            id: fleetId.toString(),
            distance: response.data?.data?.distance || response.data?.distance || 0,
            measurementType:
              response.data?.data?.measurement_type ||
              response.data?.measurement_type,
          },
          setting_fleet_id: fleetId,
        };
      }

      return {
        success: false,
        error: "Failed to create fleet config",
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Terjadi kesalahan";

      logger.error("❌ Failed to create fleet config", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Update fleet config (wrapper dari fleetService)
   */
  async updateFleetConfig(configId, updates) {
    try {
      const payload = {};

      if (updates.excavatorId !== undefined) {
        payload.unit_exca = updates.excavatorId
          ? parseInt(updates.excavatorId)
          : null;
      }
      if (updates.loadingLocationId !== undefined) {
        payload.loading_location = updates.loadingLocationId
          ? parseInt(updates.loadingLocationId)
          : null;
      }
      if (updates.dumpingLocationId !== undefined) {
        payload.dumping_location = updates.dumpingLocationId
          ? parseInt(updates.dumpingLocationId)
          : null;
      }
      if (updates.coalTypeId !== undefined) {
        payload.coal_type = updates.coalTypeId
          ? parseInt(updates.coalTypeId)
          : null;
      }
      if (updates.distance !== undefined) {
        payload.distance = updates.distance;
      }

      if (updates.workUnitId !== undefined) {
        payload.pic_work_unit = updates.workUnitId
          ? parseInt(updates.workUnitId)
          : null;
      }

      if (updates.inspectorIds !== undefined) {
        if (
          Array.isArray(updates.inspectorIds) &&
          updates.inspectorIds.length > 0
        ) {
          payload.inspectors = updates.inspectorIds.map((id) => parseInt(id));
          logger.info("📝 Updating inspectors", {
            configId,
            count: payload.inspectors.length,
            ids: payload.inspectors,
          });
        }
      }

      if (updates.checkerIds !== undefined) {
        if (Array.isArray(updates.checkerIds) && updates.checkerIds.length > 0) {
          payload.checkers = updates.checkerIds.map((id) => parseInt(id));
          logger.info("📝 Updating checkers", {
            configId,
            count: payload.checkers.length,
            ids: payload.checkers,
          });
        }
      }

      // ✅ FIX: Support both measurementType (camelCase) and measurement_type (snake_case)
      if (updates.measurementType !== undefined || updates.measurement_type !== undefined) {
        payload.measurement_type = updates.measurementType || updates.measurement_type;
      }

      if (updates.isSplit !== undefined) {
        payload.isSplit = Boolean(updates.isSplit);
      }

      if (updates.pairDtOp !== undefined && Array.isArray(updates.pairDtOp)) {
        payload.pair_dt_op = updates.pairDtOp.map((pair) => ({
          truckId: parseInt(pair.truckId),
          operatorId: parseInt(pair.operatorId),
        }));

        logger.info("🚛 Updating dump trucks", {
          configId,
          pairsCount: payload.pair_dt_op.length,
          pairs: payload.pair_dt_op,
        });
      }

      const endpoint = `/v1/custom/setting-fleet/${configId}`;

      logger.info("📡 Sending update request", {
        endpoint,
        payload,
        hasPairDtOp: !!payload.pair_dt_op,
        hasInspectors: !!payload.inspectors,
        hasCheckers: !!payload.checkers,
      });

      const response = await offlineService.put(endpoint, payload);

      logger.info("✅ Update response received", {
        status: response.status,
        configId,
      });

      if (response.status === "success") {
        await offlineService.clearCache("fleets_");

        return {
          success: true,
          message: "Konfigurasi berhasil diupdate",
          data: {
            id: configId.toString(),
            ...updates,
          },
        };
      }

      return {
        success: false,
        error: "Failed to update fleet config",
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Terjadi kesalahan";

      logger.error("❌ Failed to update fleet config", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};