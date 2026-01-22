  import { offlineService } from "@/shared/services/offlineService";
  import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
  import { logger } from "@/shared/services/log";

  const CACHE_TTL = {
    FLEET_DATA: 5 * 60 * 1000,
    MASTERS: 30 * 60 * 1000,
  };

  const pendingRequests = new Map();

  const extractErrorMessage = (error) => {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Terjadi kesalahan"
    );
  };

  const buildFilters = (options = {}) => {
    const { user, measurementType } = options;
    const filters = {};
    const role = user?.role?.toLowerCase();

    if (role === "super_admin") {
      logger.info("⭐️ Skipping measurement_type filter", {
        role,
        reason: "super_admin can see all types",
      });
    } else if (measurementType) {
      filters.measurement_type = { $eq: measurementType };
      logger.info("📊 Measurement type filter applied", {
        measurementType,
        role,
      });
    }

    switch (role) {
      case "checker":
      case "operator_jt":
        if (user?.id) {
          filters.$and = [
            { measurement_type: { $eq: "Timbangan" } },
            { checker : { id: { $eq: parseInt(user.id) } } }
          ];

          logger.info("📊 Operator JT Filter Applied (OR logic)", {
            userId: user.id,
            condition: "measurement_type=Timbangan OR created_by_user=userId"
          });
        }
        break;

      case "ccr":
      case "pengawas":
      case "evaluator":
      case "pic":
      case "admin":
      case "mitra":
      case "super_admin":
        logger.info("👑 No role-specific filter");
        break;

      default:
        logger.warn("⚠️ Unknown role, no role-specific filter", { role });
        break;
    }

    logger.info("📋 Final buildFilters result", filters);
    return filters;
  };

  export const fleetService = {
    async fetchFleetConfigs(options = {}) {
      try {
        const { user, forceRefresh = false } = options;

        const filterResult = buildFilters({ user });

        if (filterResult.needsFeedback) {
          return {
            success: false,
            data: [],
            feedback: filterResult.message,
          };
        }

        const filters = filterResult;
        const cacheKey = `fleets_${user?.id || "nouser"}`;

        const requestKey = `${cacheKey}_${JSON.stringify(filters)}`;

        if (pendingRequests.has(requestKey)) {
          logger.info("🔄 Reusing pending request", { requestKey });
          return pendingRequests.get(requestKey);
        }

        const ttl = CACHE_TTL.FLEET_DATA;

        logger.info("🔍 Fetching fleet configs", {
          filters: JSON.stringify(filters),
          cacheKey,
          ttl: `${ttl / 1000}s`,
          forceRefresh,
        });

        if (forceRefresh) {
          await offlineService.clearCache(cacheKey);
        }

        const requestPromise = (async () => {
          try {
            const response = await offlineService.get("/setting-fleets", {
              params: {
                populate: [
                  "unit_exca",
                  "unit_exca.company",
                  "loading_location",
                  "dumping_location",
                  "coal_type",
                  "pic_work_unit",
                  "weigh_bridge",
                  "setting_dump_truck",
                  "setting_dump_truck.pair_dt_op",
                  "setting_dump_truck.pair_dt_op.dts.company",
                  "setting_dump_truck.pair_dt_op.ops",
                  "checker",
                  "inspector",
                ],
                sort: ["id:desc"],
                filters,
                pagination: { pageSize: 500 },
              },
              cacheKey,
              ttl,
              forceRefresh,
            });

            const configs = response.data.map((item) =>
              this._transformFleetConfig(item),
            );

            logger.info(`✅ Fleet configs fetched: ${configs.length}`, {
              cached: !forceRefresh,
            });

            return { success: true, data: configs };
          } finally {
            pendingRequests.delete(requestKey);
          }
        })();

        pendingRequests.set(requestKey, requestPromise);
        return requestPromise;
      } catch (error) {
        const errorMessage = extractErrorMessage(error);

        logger.error("❌ Failed to fetch fleet configs", {
          error: errorMessage,
          details: error.response?.data,
        });

        return {
          success: false,
          data: [],
          error: errorMessage,
        };
      }
    },

async createFleetConfig(configData) {
  try {
    const now = new Date().toISOString();
    const payload = {
      unit_exca: configData.excavatorId ? parseInt(configData.excavatorId) : null,
      loading_location: configData.loadingLocationId ? parseInt(configData.loadingLocationId) : null,
      dumping_location: configData.dumpingLocationId ? parseInt(configData.dumpingLocationId) : null,
      coal_type: configData.coalTypeId ? parseInt(configData.coalTypeId) : null,
      distance: configData.distance || 0,
      pic_work_unit: configData.workUnitId ? parseInt(configData.workUnitId) : null,
      created_at: now,
      measurement_type: configData.measurement_type,
      pair_dt_op: configData.pairDtOp.map((pair) => ({
        truckId: parseInt(pair.truckId),
        operatorId: parseInt(pair.operatorId),
      })),
    };

    if (configData.inspectorId) {
      payload.inspector = parseInt(configData.inspectorId);
    } else {
      throw new Error("Inspector is required");
    }

    if (configData.checkerId) {
      payload.checker = parseInt(configData.checkerId);
    } else {
      throw new Error("Checker is required");
    }

    if (configData.createdByUserId) {
      payload.created_by_user = parseInt(configData.createdByUserId);
    }

    if (configData.measurement_type === "Timbangan" && configData.weightBridgeId) {
      payload.weigh_bridge = parseInt(configData.weightBridgeId);
    }

    const response = await offlineService.post("/v1/custom/setting-fleet", payload);
    
    if (response.status === "success") {
      const fleetId = response.data?.data?.id_setting_fleet || response.data?.id_setting_fleet;
      
      logger.info("✅ Fleet created, ID:", fleetId);
      
      // ⚠️ HANYA clear cache, JANGAN fetch ulang di sini
      await offlineService.clearCache("fleets_");
      
      // Fetch detail data yang baru dibuat
      try {
        const detailResponse = await offlineService.get(`/setting-fleets/${fleetId}`, {
          params: {
            populate: [
              "unit_exca",
              "unit_exca.company",
              "loading_location",
              "dumping_location",
              "coal_type",
              "pic_work_unit",
              "weigh_bridge",
              "setting_dump_truck",
              "setting_dump_truck.pair_dt_op",
              "setting_dump_truck.pair_dt_op.dts.company",
              "setting_dump_truck.pair_dt_op.ops",
              "checker",
              "inspector",
            ],
          },
        });

        const transformedData = this._transformFleetConfig(detailResponse.data);

        return {
          success: true,
          data: transformedData,
          setting_fleet_id: fleetId,
        };
      } catch (fetchError) {
        logger.warn("⚠️ Could not fetch created fleet details", {
          fleetId,
          error: fetchError.message,
        });

        // Return data minimal jika fetch detail gagal
        return {
          success: true,
          data: {
            id: fleetId.toString(),
            distance: response.data?.data?.distance || response.data?.distance || 0,
            measurementType: response.data?.data?.measurement_type || response.data?.measurement_type,
          },
          setting_fleet_id: fleetId,
        };
      }
    }
    
    return {
      success: false,
      error: "Failed to create fleet config",
    };
    
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
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

// fleetService.js - FIX untuk update pair_dt_op

async updateFleetConfig(configId, updates) {
  try {
    const payload = { };

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
    if (updates.inspectorId !== undefined) {
      payload.inspector = updates.inspectorId
        ? parseInt(updates.inspectorId)
        : null;
    }
    if (updates.checkerId !== undefined) {
      payload.checker = updates.checkerId
        ? parseInt(updates.checkerId)
        : null;
    }
    if (updates.measurementType !== undefined) {
      payload.measurement_type = updates.measurementType;
    }

    // ✅ FIX: Gunakan endpoint custom untuk update pair_dt_op
    if (updates.pairDtOp !== undefined && Array.isArray(updates.pairDtOp)) {
      if (updates.pairDtOp.length === 0) {
        throw new Error("Minimal 1 dump truck harus dipilih");
      }

      // Transform untuk API
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

    console.log(payload)

    const endpoint = `/v1/custom/setting-fleet/${configId}`;

    logger.info("📡 Sending update request", {
      endpoint,
      payload,
      hasPairDtOp: !!payload.pair_dt_op,
    });

    const response = await offlineService.put(endpoint, payload);

    logger.info("✅ Update response received", {
      status: response.status,
      hasData: !!response.data,
    });

    // Clear cache
    await offlineService.clearCacheByPrefix("fleets");
    await offlineService.clearCacheByPrefix("ritases");

    logger.info("✅ Fleet config updated", {
      id: configId,
      endpoint,
      fieldsUpdated: Object.keys(payload),
      hasDumptrucks: !!payload.pair_dt_op,
    });

    // ✅ Fetch detail data yang sudah terupdate
    try {
      const detailResponse = await offlineService.get(`/setting-fleets/${configId}`, {
        params: {
          populate: [
            "unit_exca",
            "unit_exca.company",
            "loading_location",
            "dumping_location",
            "coal_type",
            "pic_work_unit",
            "weigh_bridge",
            "setting_dump_truck",
            "setting_dump_truck.pair_dt_op",
            "setting_dump_truck.pair_dt_op.dts.company",
            "setting_dump_truck.pair_dt_op.ops",
            "checker",
            "inspector",
          ],
        },
      });

      const transformedData = this._transformFleetConfig(detailResponse.data);

      logger.info("✅ Updated fleet data transformed", {
        id: transformedData.id,
        unitsCount: transformedData.units?.length || 0,
      });

      return {
        success: true,
        data: transformedData,
      };
    } catch (fetchError) {
      logger.warn("⚠️ Could not fetch updated fleet details", {
        configId,
        error: fetchError.message,
      });

      // Return success dengan data minimal jika fetch detail gagal
      return {
        success: true,
        data: {
          id: configId.toString(),
          ...updates,
        },
      };
    }
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    logger.error("❌ Failed to update fleet config", {
      error: errorMessage,
      details: error.response?.data,
      configId,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
},

    async getFilteredUnitsByFleet(excavatorId) {
      try {
        if (!excavatorId) {
          throw new Error("excavatorId is required");
        }

        logger.info("🔍 Getting filtered units for excavator", { excavatorId });

        const excavators = await masterDataService.fetchUnits({
          type: "EXCAVATOR",
          forceRefresh: false,
        });

        const excavator = excavators.find(
          (e) => String(e.id) === String(excavatorId),
        );

        if (!excavator?.companyId) {
          logger.warn("⚠️ Excavator has no company");
          return { success: true, data: [] };
        }

        const allDumptrucks = await masterDataService.fetchUnits({
          type: "DUMP_TRUCK",
          forceRefresh: false,
        });

        const filteredUnits = allDumptrucks.filter(
          (dt) => String(dt.companyId) === String(excavator.companyId),
        );

        logger.info("✅ Filtered units fetched from cache", {
          excavatorId,
          companyId: excavator.companyId,
          count: filteredUnits.length,
        });

        return { success: true, data: filteredUnits };
      } catch (error) {
        const errorMessage = extractErrorMessage(error);

        logger.error("❌ Failed to get filtered units by excavator", {
          error: errorMessage,
          details: error.response?.data,
        });

        return {
          success: false,
          data: [],
          error: errorMessage,
        };
      }
    },

    async deleteFleetConfig(configId) {
      try {
        await offlineService.delete(`/setting-fleets/${configId}`);

        await Promise.all([
          offlineService.clearCache("fleets_"),
          offlineService.clearCache(`fleets_${configId}`),
          offlineService.clearCache("ritases_"),
          offlineService.clearCacheByPrefix?.("fleets"),
        ]);

        await new Promise((resolve) => setTimeout(resolve, 200));

        logger.info("🗑️ Fleet config deleted + cache cleared", { id: configId });

        return {
          success: true,
          message: "Konfigurasi berhasil dihapus",
          deletedId: configId,
        };
      } catch (error) {
        const errorMessage = extractErrorMessage(error);

        logger.error("❌ Failed to delete fleet config", {
          error: errorMessage,
          details: error.response?.data,
        });

        return {
          success: false,
          error: errorMessage,
        };
      }
    },

    async bulkDeleteFleets(fleetIds) {
      try {
        if (!Array.isArray(fleetIds) || fleetIds.length === 0) {
          throw new Error("Fleet IDs harus berupa array dan tidak boleh kosong");
        }

        logger.info("🗑️ Bulk deleting fleets", {
          count: fleetIds.length,
        });

        const results = {
          success: [],
          failed: [],
          total: fleetIds.length,
        };

        const validationErrors = [];
        for (const fleetId of fleetIds) {
          try {
            const response = await offlineService.get(
              `/setting-fleets/${fleetId}`,
            );
            const fleet = response.data;

            logger.info("Berhasil menghapus data");
          } catch (error) {
            logger.warn(`⚠️ Could not validate fleet ${fleetId}`, {
              error: error.message,
            });
          }
        }

        if (validationErrors.length > 0) {
          logger.warn("⚠️ Bulk delete validation failed", {
            errors: validationErrors.length,
          });

          return {
            success: false,
            error: `${validationErrors.length}`,
            results: {
              success: [],
              failed: validationErrors,
              total: fleetIds.length,
            },
          };
        }

        for (const fleetId of fleetIds) {
          try {
            await offlineService.delete(`/setting-fleets/${fleetId}`);

            results.success.push({ id: fleetId });

            logger.info(`✅ Fleet ${fleetId} deleted`);
          } catch (error) {
            const errorMessage = extractErrorMessage(error);

            results.failed.push({
              id: fleetId,
              error: errorMessage,
            });

            logger.error(`❌ Failed to delete fleet ${fleetId}`, {
              error: errorMessage,
            });
          }
        }

        await Promise.all([
          offlineService.clearCache("fleets_"),
          offlineService.clearCacheByPrefix("fleets"),
          offlineService.clearCacheByPrefix("ritases"),
        ]);

        const allSuccess = results.failed.length === 0;

        logger.info("📊 Bulk delete summary", {
          total: results.total,
          success: results.success.length,
          failed: results.failed.length,
        });

        return {
          success: allSuccess,
          partialSuccess: results.success.length > 0 && results.failed.length > 0,
          results,
          message: allSuccess
            ? `Berhasil menghapus ${results.success.length} fleet`
            : `${results.success.length} berhasil, ${results.failed.length} gagal`,
        };
      } catch (error) {
        const errorMessage = extractErrorMessage(error);

        logger.error("❌ Bulk delete failed", {
          error: errorMessage,
          details: error.response?.data,
        });

        return {
          success: false,
          error: errorMessage,
          results: { success: [], failed: [], total: 0 },
        };
      }
    },

    _transformFleetConfig(apiResponse) {
      try {
        const item = apiResponse.data || apiResponse;
        const attr = item.attributes || item;
        const normalizeUser = (userData) => {
          if (!userData) return { name: null, id: null };

          if (userData.data) {
            return {
              name:
                userData.data.attributes?.username ||
                userData.data.attributes?.name ||
                null,
              id: userData.data.id?.toString() || null,
            };
          }

          return {
            name: userData.username || userData.name || null,
            id: userData.id?.toString() || null,
          };
        };

        const inspector = normalizeUser(attr.inspector);
        const checker = normalizeUser(attr.checker);

        const pairs = attr.setting_dump_truck?.data?.attributes?.pair_dt_op || [];

        const dumptrucks = pairs.flatMap((pair) => {
          const dts = pair.dts?.data || [];
          const ops = pair.ops?.data || [];

          return dts.map((dt) => ({
            pairId: pair.id?.toString() || "",
            dumpTruckId: dt.id?.toString() || "",
            hull_no: dt.attributes?.hull_no || "",
            type: dt.attributes?.type || "DUMP_TRUCK",
            tareWeight: dt.attributes?.tare_weight ?? null,
            company: dt.attributes?.company?.data?.attributes?.name || "-",
            companyId: dt.attributes?.company?.data?.id?.toString() || "",
            operator: ops[0]?.attributes?.name || null,
            operatorId: ops[0]?.id?.toString() || null,
          }));
        });

        const excavatorCompanyData =
          attr.unit_exca?.data?.attributes?.company?.data;
        const excavatorCompanyId = excavatorCompanyData?.id?.toString() || null;
        const excavatorCompany = excavatorCompanyData?.attributes?.name || null;

        return {
          id: item.id.toString(),

          excavator: attr.unit_exca?.data?.attributes?.hull_no || "",
          excavatorId: attr.unit_exca?.data?.id?.toString() || "",

          excavatorCompanyId,
          excavatorCompany,

          loadingLocation: attr.loading_location?.data?.attributes?.name || "",
          loadingLocationId: attr.loading_location?.data?.id?.toString() || "",

          dumpingLocation: attr.dumping_location?.data?.attributes?.name || "",
          dumpingLocationId: attr.dumping_location?.data?.id?.toString() || "",

          coalType: attr.coal_type?.data?.attributes?.name || "",
          coalTypeId: attr.coal_type?.data?.id?.toString() || "",
          distance: attr.distance || 0,

          workUnit: attr.pic_work_unit?.data?.attributes?.subsatker || "",
          workUnitId: attr.pic_work_unit?.data?.id?.toString() || "",

          weightBridgeId: attr.weigh_bridge?.data?.id?.toString() || "",
          weightBridge: attr.weigh_bridge?.data?.attributes?.name || "",

          checker: checker.name,
          checkerId: checker.id,
          inspector: inspector.name,
          inspectorId: inspector.id,

          settingDumpTruckId: attr.setting_dump_truck?.data?.id?.toString() || "",
          dumptruckCount: dumptrucks.length,
          units: dumptrucks,

          measurementType: attr.measurement_type,

          createdAt: attr.createdAt,
          updatedAt: attr.updatedAt,
        };
      } catch (error) {
        console.error("❌ Error transforming fleet config:", error, apiResponse);
        throw error;
      }
    },

    clearCache(pattern = null) {
      logger.info("🗑️ Fleet service cache cleared", {
        pattern: pattern || "all",
      });
      return offlineService.clearCache(pattern);
    },
  };
