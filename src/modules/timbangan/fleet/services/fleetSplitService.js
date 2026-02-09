import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

export const fleetSplitService = {
  async createSplitFleets(splitData) {
    try {
      // Validation
      if (!splitData.splits || splitData.splits.length < 2) {
        throw new Error("Mode split memerlukan minimal 2 fleet configuration");
      }

      if (splitData.splits.length > 3) {
        throw new Error("Mode split maksimal 3 fleet configuration");
      }

      logger.info("🔀 Creating split fleets via BULK endpoint", {
        excavatorId: splitData.excavatorId,
        loadingLocationId: splitData.loadingLocationId,
        splits: splitData.splits.length,
      });

      const now = new Date().toISOString();

      // Build fleets array
      const fleets = splitData.splits.map((split, index) => {
        const fleet = {
          unit_exca: splitData.excavatorId
            ? parseInt(splitData.excavatorId)
            : null,
          loading_location: splitData.loadingLocationId
            ? parseInt(splitData.loadingLocationId)
            : null,
          dumping_location: split.dumpingLocationId
            ? parseInt(split.dumpingLocationId)
            : null,
          coal_type: splitData.coalTypeId
            ? parseInt(splitData.coalTypeId)
            : null,
          pic_work_unit: splitData.workUnitId
            ? parseInt(splitData.workUnitId)
            : null,
          distance: split.distance || 0,
          measurement_type: split.measurementType || splitData.measurement_type,
          isSplit: true,
          created_at: now,
          pair_dt_op: (split.pairDtOp || []).map((pair) => ({
            truckId: parseInt(pair.truckId),
            operatorId: parseInt(pair.operatorId),
          })),
        };

        // Add checkers
        if (
          split.checkerIds &&
          Array.isArray(split.checkerIds) &&
          split.checkerIds.length > 0
        ) {
          fleet.checkers = split.checkerIds.map((id) => parseInt(id));
        } else if (
          splitData.checkerIds &&
          Array.isArray(splitData.checkerIds) &&
          splitData.checkerIds.length > 0
        ) {
          fleet.checkers = splitData.checkerIds.map((id) => parseInt(id));
        }

        // Add inspectors (CRITICAL)
        if (
          split.inspectorIds &&
          Array.isArray(split.inspectorIds) &&
          split.inspectorIds.length > 0
        ) {
          fleet.inspectors = split.inspectorIds.map((id) => parseInt(id));
        } else if (
          splitData.inspectorIds &&
          Array.isArray(splitData.inspectorIds) &&
          splitData.inspectorIds.length > 0
        ) {
          fleet.inspectors = splitData.inspectorIds.map((id) => parseInt(id));
        }

        if (splitData.createdByUserId) {
          fleet.created_by_user = parseInt(splitData.createdByUserId);
        }

        if (split.measurementType === "Timbangan" && splitData.weightBridgeId) {
          fleet.weigh_bridge = parseInt(splitData.weightBridgeId);
        }

        // ✅ NEW: Add transfer metadata if applicable
        if (split.moveFromFleets && split.moveFromFleets.length > 0) {
          fleet.isTransfer = true;
          fleet.moveFromFleets = split.moveFromFleets;
        }

        logger.info(`📦 Fleet ${index + 1} prepared`, {
          dumping: split.dumpingLocationId,
          measurement: split.measurementType,
          pairsCount: fleet.pair_dt_op.length,
          hasInspectors: !!fleet.inspectors,
          isTransfer: fleet.isTransfer || false, // ✅ NEW
        });

        return fleet;
      });

      // Call BULK endpoint
      const payload = { fleets };

      logger.info("📡 Calling BULK create endpoint", {
        fleetsCount: fleets.length,
        endpoint: "/v1/custom/setting-fleet/bulk",
      });

      const response = await offlineService.post(
        "/v1/custom/setting-fleet/bulk",
        payload,
      );

      // Handle response
      if (response.status === "success") {
        const results = response.data || [];

        logger.info("✅ All split fleets created successfully via BULK", {
          count: results.length,
          fleetIds: results.map((r) => r.id_setting_fleet),
        });

        await offlineService.clearCache("fleets_");

        return {
          success: true,
          data: results.map((r, i) => ({
            success: true,
            fleetId: r.id_setting_fleet,
            splitIndex: i,
            dumpingLocationId: splitData.splits[i].dumpingLocationId,
            distance: r.distance,
            measurementType: r.measurement_type,
          })),
          message: `Berhasil membuat ${results.length} fleet`,
        };
      }

      // Partial success
      if (response.partialSuccess) {
        logger.warn("⚠️ Partial split fleet creation", {
          message: response.message,
        });

        return {
          success: false,
          partialSuccess: true,
          data: response.data || [],
          errors: response.errors || [],
          message: response.message,
        };
      }

      // Failed
      return {
        success: false,
        error: response.message || "Gagal membuat fleet",
      };
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

  async bulkEditFleets(fleetsData) {
    try {
      if (!Array.isArray(fleetsData) || fleetsData.length === 0) {
        throw new Error("Fleet data harus berupa array dan tidak boleh kosong");
      }

      logger.info("✏️ Bulk editing fleets", {
        count: fleetsData.length,
        fleetIds: fleetsData.map((f) => f.id || "NEW"),
      });

      // Transform to backend format
      const fleets = fleetsData.map((fleet, index) => {
        const isNewFleet = !fleet.id;
        const payload = {};

        // ✅ Include ID for existing fleets
        if (!isNewFleet) {
          payload.id = parseInt(fleet.id);
        }

        // ✅ REQUIRED fields for ALL fleets (new or update)
        // These fields MUST be present for creation
        if (fleet.excavatorId !== undefined) {
          payload.unit_exca = parseInt(fleet.excavatorId);
        }

        if (fleet.loadingLocationId !== undefined) {
          payload.loading_location = parseInt(fleet.loadingLocationId);
        }

        if (fleet.dumpingLocationId !== undefined) {
          payload.dumping_location = parseInt(fleet.dumpingLocationId);
        }

        if (fleet.coalTypeId !== undefined) {
          payload.coal_type = parseInt(fleet.coalTypeId);
        }

        if (fleet.workUnitId !== undefined) {
          payload.pic_work_unit = parseInt(fleet.workUnitId);
        }

        if (fleet.distance !== undefined) {
          payload.distance = fleet.distance || 0;
        }

        if (fleet.measurementType !== undefined) {
          payload.measurement_type = fleet.measurementType;
        }

        // ✅ For NEW fleets: add creation metadata
        if (isNewFleet) {
          payload.isSplit = true;
          payload.created_at = new Date().toISOString();

          if (fleet.createdByUserId !== undefined) {
            payload.created_by_user = parseInt(fleet.createdByUserId);
          }
        }

        // Inspectors
        if (fleet.inspectorIds !== undefined) {
          payload.inspectors =
            Array.isArray(fleet.inspectorIds) && fleet.inspectorIds.length > 0
              ? fleet.inspectorIds.map((id) => parseInt(id))
              : [];
        }

        // Checkers
        if (fleet.checkerIds !== undefined) {
          payload.checkers =
            Array.isArray(fleet.checkerIds) && fleet.checkerIds.length > 0
              ? fleet.checkerIds.map((id) => parseInt(id))
              : [];
        }

        // Pair DT Op
        if (fleet.pairDtOp !== undefined) {
          payload.pair_dt_op = Array.isArray(fleet.pairDtOp)
            ? fleet.pairDtOp.map((pair) => ({
                truckId: parseInt(pair.truckId),
                operatorId: parseInt(pair.operatorId),
              }))
            : [];
        }

        if (
          fleet.weightBridgeId !== undefined &&
          fleet.measurementType === "Timbangan"
        ) {
          payload.weigh_bridge = parseInt(fleet.weightBridgeId);
        }

        // ✅ Add transfer metadata
        if (fleet.moveFromFleets && fleet.moveFromFleets.length > 0) {
          payload.isTransfer = true;
          payload.moveFromFleets = fleet.moveFromFleets;
        }

        logger.info(`📦 Fleet ${index + 1} payload prepared`, {
          isNewFleet,
          hasId: !!payload.id,
          hasExcavator: !!payload.unit_exca,
          hasLoading: !!payload.loading_location,
          hasDumping: !!payload.dumping_location,
          pairCount: payload.pair_dt_op?.length || 0,
        });

        return payload;
      });

      // Call bulk edit endpoint
      const response = await offlineService.put(
        "/v1/custom/setting-fleet/bulk",
        { fleets },
      );

      if (response.status === "success") {
        logger.info("✅ Fleets bulk edited successfully", {
          count: fleetsData.length,
        });

        await offlineService.clearCache("fleets_");

        return {
          success: true,
          data: response.data || [],
          message: `Berhasil update ${fleetsData.length} fleet`,
        };
      }

      return {
        success: false,
        error: response.message || "Gagal update fleet",
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Terjadi kesalahan";

      logger.error("❌ Failed to bulk edit fleets", {
        error: errorMessage,
        details: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // bulkDeleteFleets tetap sama, tidak perlu perubahan
  async bulkDeleteFleets(fleetIds) {
    try {
      if (!Array.isArray(fleetIds) || fleetIds.length === 0) {
        throw new Error("Fleet IDs harus berupa array dan tidak boleh kosong");
      }

      logger.info("🗑️ Bulk deleting fleets", {
        count: fleetIds.length,
        fleetIds,
      });

      const response = await offlineService.post(
        "/v1/custom/setting-fleet/bulk-delete",
        { fleetIds: fleetIds.map((id) => parseInt(id)) },
      );

      if (response.status === "success") {
        logger.info("✅ Fleets bulk deleted successfully", {
          count: fleetIds.length,
        });

        await offlineService.clearCache("fleets_");

        return {
          success: true,
          data: response.data || [],
          message:
            response.message || `Berhasil delete ${fleetIds.length} fleet`,
        };
      }

      return {
        success: false,
        error: response.message || "Gagal delete fleet",
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Terjadi kesalahan";

      logger.error("❌ Failed to bulk delete fleets", {
        error: errorMessage,
        details: error.response?.data,
        fleetIds,
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
