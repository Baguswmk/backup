import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

/**
 * Service untuk menangani split fleet (bulk create 2 fleet sekaligus)
 */
export const fleetSplitService = {
  /**
   * Create 2 fleet configs sekaligus dengan excavator dan loading point yang sama
   * @param {Object} splitData - Data split dari FleetSplitModal
   * @returns {Promise<Object>} Result dengan success status
   */
  async createSplitFleets(splitData) {
    try {
      logger.info("🔀 Creating split fleets", {
        excavatorId: splitData.excavatorId,
        loadingLocationId: splitData.loadingLocationId,
        splits: splitData.splits.length,
      });

      const now = new Date().toISOString();

      // Prepare base payload yang sama untuk kedua fleet
      const basePayload = {
        unit_exca: splitData.excavatorId
          ? parseInt(splitData.excavatorId)
          : null,
        loading_location: splitData.loadingLocationId
          ? parseInt(splitData.loadingLocationId)
          : null,
        coal_type: splitData.coalTypeId ? parseInt(splitData.coalTypeId) : null,
        pic_work_unit: splitData.workUnitId
          ? parseInt(splitData.workUnitId)
          : null,
        measurement_type: splitData.measurement_type,
        created_at: now,
        isSplit: true, // Flag untuk menandai ini adalah split fleet
      };

      // Add checkers (required)
      if (
        splitData.checkerIds &&
        Array.isArray(splitData.checkerIds) &&
        splitData.checkerIds.length > 0
      ) {
        basePayload.checkers = splitData.checkerIds.map((id) => parseInt(id));
      }

      // Add inspectors (conditional - only if different companies)
      if (
        splitData.inspectorIds &&
        Array.isArray(splitData.inspectorIds) &&
        splitData.inspectorIds.length > 0
      ) {
        basePayload.inspectors = splitData.inspectorIds.map((id) =>
          parseInt(id),
        );
      }

      if (splitData.createdByUserId) {
        basePayload.created_by_user = parseInt(splitData.createdByUserId);
      }

      if (
        splitData.measurement_type === "Timbangan" &&
        splitData.weightBridgeId
      ) {
        basePayload.weigh_bridge = parseInt(splitData.weightBridgeId);
      }

      // Create both fleets
      const results = [];
      const errors = [];

      for (let i = 0; i < splitData.splits.length; i++) {
        const split = splitData.splits[i];

        const payload = {
          ...basePayload,
          dumping_location: split.dumpingLocationId
            ? parseInt(split.dumpingLocationId)
            : null,
          distance: split.distance || 0,
          // Note: pair_dt_op akan diisi nanti saat edit/assign DT
          pair_dt_op: split.pairDtOp || [],
        };

        try {
          const response = await offlineService.post(
            "/v1/custom/setting-fleet",
            payload,
          );

          if (response.status === "success") {
            const fleetId =
              response.data?.data?.id_setting_fleet ||
              response.data?.id_setting_fleet;

            logger.info(`✅ Split fleet ${i + 1} created, ID:`, fleetId);

            results.push({
              success: true,
              fleetId,
              splitIndex: i,
              dumpingLocationId: split.dumpingLocationId,
              distance: split.distance,
            });
          } else {
            errors.push({
              splitIndex: i,
              error: "Failed to create fleet",
            });
          }
        } catch (error) {
          const errorMessage =
            error?.response?.data?.message ||
            error?.response?.data?.error?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "Terjadi kesalahan";

          logger.error(`❌ Failed to create split fleet ${i + 1}`, {
            error: errorMessage,
            details: error.response?.data,
          });

          errors.push({
            splitIndex: i,
            error: errorMessage,
          });
        }
      }

      // Clear cache after creating both fleets
      await offlineService.clearCache("fleets_");

      // Return result
      if (errors.length === 0) {
        logger.info("✅ All split fleets created successfully", {
          count: results.length,
        });

        return {
          success: true,
          data: results,
          message: `Berhasil membuat ${results.length} fleet`,
        };
      } else if (results.length > 0) {
        // Partial success
        logger.warn("⚠️ Partial split fleet creation", {
          success: results.length,
          failed: errors.length,
        });

        return {
          success: false,
          partialSuccess: true,
          data: results,
          errors,
          message: `${results.length} fleet berhasil dibuat, ${errors.length} gagal`,
        };
      } else {
        // All failed
        logger.error("❌ All split fleet creation failed");

        return {
          success: false,
          errors,
          message: "Gagal membuat semua fleet",
        };
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Terjadi kesalahan";

      logger.error("❌ Failed to create split fleets", {
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
   * Update split fleet dengan DT assignment
   * Digunakan ketika user ingin assign DT ke fleet yang sudah dibuat via split
   */
  async updateSplitFleetWithDumptrucks(fleetId, pairDtOp) {
    try {
      logger.info("🚛 Updating split fleet with dumptrucks", {
        fleetId,
        pairsCount: pairDtOp.length,
      });

      const payload = {
        pair_dt_op: pairDtOp.map((pair) => ({
          truckId: parseInt(pair.truckId),
          operatorId: parseInt(pair.operatorId),
        })),
      };

      const endpoint = `/v1/custom/setting-fleet/${fleetId}`;
      const response = await offlineService.put(endpoint, payload);

      if (response.status === "success") {
        logger.info("✅ Split fleet updated with dumptrucks", { fleetId });

        await offlineService.clearCache("fleets_");

        return {
          success: true,
          fleetId,
          message: "Fleet berhasil diupdate dengan dump trucks",
        };
      }

      return {
        success: false,
        error: "Failed to update split fleet",
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Terjadi kesalahan";

      logger.error("❌ Failed to update split fleet with dumptrucks", {
        fleetId,
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
