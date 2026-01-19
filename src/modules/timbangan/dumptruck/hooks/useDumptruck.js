import { useState, useCallback, useEffect, useMemo } from "react";
import { dumptruckService } from "@/modules/timbangan/dumptruck/services/dumptruckService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { showToast } from "@/shared/utils/toast";
import { withErrorHandling, handleError } from "@/shared/utils/errorHandler";
import { offlineService } from "@/shared/services/offlineService";

export const useDumptruck = (fleetHook, measurementType = null) => {
  const {
    user,
    filteredFleetConfigs = [],
    timbanganFleetConfigs = [],
    userRoleInfo,
  } = fleetHook || {};

  const [dumptruckSettings, setDumptruckSettings] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [filteredUnitsByFleet, setFilteredUnitsByFleet] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const dumptruckStats = useMemo(() => {
    const total = availableUnits.length;
    const active = availableUnits.filter((dt) => dt.status === "active").length;
    const maintenance = availableUnits.filter(
      (dt) => dt.status === "maintenance",
    ).length;
    const inactive = availableUnits.filter(
      (dt) => !dt.status || dt.status === "inactive",
    ).length;
    return { total, active, maintenance, inactive };
  }, [availableUnits]);

  const loadAvailableUnits = useCallback(async () => {
    return await withErrorHandling(
      async () => {
        const result = await masterDataService.fetchUnits({
          type: "DUMP_TRUCK",
        });
        setAvailableUnits(result);
        return { success: true, data: result };
      },
      {
        operation: "load available units",
        showErrorToast: true,
        onError: (err) => {
          console.error("❌ Failed to load units:", err);
          setError(err);
        },
      },
    );
  }, []);

  const loadDumptruckSettings = useCallback(
    async (options = {}) => {
      const loadingState = options.isRefresh ? setIsRefreshing : setIsLoading;
      loadingState(true);
      setError(null);

      if (options.forceRefresh) {
        offlineService.clearCache();
      }

      if (!user) {
        console.warn("⚠️ User not available, returning empty settings");
        setDumptruckSettings([]);
        loadingState(false);
        return { success: true, data: [] };
      }

      return await withErrorHandling(
        async () => {
          const result = await dumptruckService.fetchDumptruckSettings({
            user,
            forceRefresh: options.forceRefresh || false,
            measurementType: measurementType || options.measurementType || null,
            ...options,
          });

          if (!result.success && result.isValidation) {
            showToast.warning(result.error);
            setDumptruckSettings([]);
            return { success: false, data: [], error: result.error };
          }

          if (!result.success) {
            throw new Error(result.error || "Failed to load settings");
          }

          setDumptruckSettings(result.data);
          return { success: true, data: result.data };
        },
        {
          operation: "load dumptruck settings",
          showErrorToast: true,
          onError: (err) => {
            console.error("❌ Load dumptruck settings error:", err);
            setError(err);
          },
        },
      ).finally(() => {
        loadingState(false);
      });
    },
    [user, measurementType],
  );

  const refresh = useCallback(async () => {
    if (!user) {
      console.warn("⚠️ Cannot refresh: User not available");
      return {
        success: false,
        error: "User not available for refresh",
      };
    }

    offlineService.clearCache();

    return await Promise.all([
      loadDumptruckSettings({
        forceRefresh: true,
        isRefresh: true,
        measurementType,
      }),
      loadAvailableUnits(),
    ]);
  }, [loadDumptruckSettings, loadAvailableUnits, user, measurementType]);

  const reactivateDumptruckSetting = useCallback(
    async (settingId) => {
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          const setting = dumptruckSettings.find(
            (s) => String(s.id) === String(settingId),
          );

          if (!setting) {
            throw new Error("Setting tidak ditemukan");
          }

          if (setting.fleet?.status !== "CLOSED") {
            throw new Error(
              `Fleet dengan status ${setting.fleet?.status} tidak bisa direaktivasi`,
            );
          }

          const result =
            await dumptruckService.reactivateDumptruckSetting(settingId);

          if (!result.success && result.isValidation) {
            showToast.warning(result.error);
            return { success: false, error: result.error };
          }

          if (!result.success) {
            throw new Error(result.error || "Failed to reactivate setting");
          }

          showToast.success("Fleet berhasil direaktivasi ke status ACTIVE");
          await refresh();

          return { success: true };
        },
        {
          operation: "reactivate dumptruck setting",
          showErrorToast: true,
          onError: (err) => {
            console.error("❌ Reactivate error:", err);
            setError(err);
          },
        },
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [dumptruckSettings, refresh],
  );

  const getFilteredUnitsForFleet = useCallback(async (settingFleetId) => {
    try {
      const result =
        await dumptruckService.getFilteredUnitsByFleet(settingFleetId);

      if (result.success) {
        setFilteredUnitsByFleet((prev) => ({
          ...prev,
          [String(settingFleetId)]: result.data,
        }));
        return result.data;
      }

      if (result.isValidation) {
        showToast.warning(result.error);
      }

      return [];
    } catch (error) {
      const handled = handleError(error, {
        operation: "get filtered units",
        showNotification: true,
      });
      console.error("❌ Failed to get filtered units:", handled.error);
      return [];
    }
  }, []);

  const createSetting = useCallback(
    async (data) => {
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          const { fleetId, pairDtOp } = data || {};

          if (!fleetId) throw new Error("Fleet belum dipilih");
          if (!pairDtOp || pairDtOp.length === 0)
            throw new Error("Pilih minimal 1 dump truck dan operator");

          const invalidPairs = pairDtOp.filter(
            (pair) => !pair.truckId || !pair.operatorId,
          );

          if (invalidPairs.length > 0) {
            throw new Error(
              `${invalidPairs.length} pasangan tidak valid. Pastikan semua unit memiliki operator.`,
            );
          }

          const result = await dumptruckService.createDumptruckSetting({
            setting_fleet_id: String(fleetId),
            pair_dt_op: pairDtOp,
          });

          if (!result.success && result.isValidation) {
            showToast.warning(result.error);
            return { success: false, error: result.error };
          }

          if (!result.success) {
            throw new Error(result.error || "Failed to create setting");
          }

          showToast.success("Setting dump truck berhasil dibuat");
          await refresh();
          return { success: true, data: result.data || {} };
        },
        {
          operation: "create dumptruck setting",
          showErrorToast: true,
          onError: (err) => setError(err),
        },
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [refresh],
  );

  const updateSetting = useCallback(
    async (settingId, updates) => {
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          const { pairDtOp, setting_fleet_id } = updates || {};
          const updatePayload = {};

          if (pairDtOp) {
            const invalidPairs = pairDtOp.filter(
              (pair) => !pair.truckId || !pair.operatorId,
            );

            if (invalidPairs.length > 0) {
              throw new Error(
                `${invalidPairs.length} pasangan tidak valid. Pastikan semua unit memiliki operator.`,
              );
            }

            updatePayload.pair_dt_op = pairDtOp;
          }

          if (setting_fleet_id) {
            updatePayload.setting_fleet_id = String(setting_fleet_id);
          }

          const result = await dumptruckService.updateDumptruckSetting(
            settingId,
            updatePayload,
          );

          if (!result.success && result.isValidation) {
            showToast.warning(result.error);
            return { success: false, error: result.error };
          }

          if (!result.success) {
            throw new Error(result.error || "Failed to update setting");
          }

          showToast.success("Setting dump truck berhasil diperbarui");
          await refresh();
          return { success: true, data: result.data };
        },
        {
          operation: "update dumptruck setting",
          showErrorToast: true,
          onError: (err) => setError(err),
        },
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [refresh],
  );

  const deleteSetting = useCallback(
    async (settingId) => {
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          const result =
            await dumptruckService.deleteDumptruckSetting(settingId);

          if (!result.success && result.isValidation) {
            showToast.warning(result.error);
            return { success: false, error: result.error };
          }

          if (!result.success) {
            throw new Error(result.error || "Failed to delete setting");
          }

          showToast.success("Setting dump truck berhasil dihapus");
          await refresh();
          return { success: true };
        },
        {
          operation: "delete dumptruck setting",
          showErrorToast: true,
          onError: (err) => setError(err),
        },
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [refresh],
  );

  const getUnitsForFleet = useCallback(
    async (fleetId) => {
      try {
        if (!fleetId) {
          console.warn(`⚠️ Fleet ${fleetId} not found in filtered configs`);
          return [];
        }

        return await getFilteredUnitsForFleet(fleetId);
      } catch (error) {
        const handled = handleError(error, {
          operation: "get units for fleet",
          showNotification: false,
        });
        console.error("❌ Error filtering units for fleet:", handled.error);
        return availableUnits.filter((u) => u.type === "DUMP_TRUCK");
      }
    },
    [availableUnits, getFilteredUnitsForFleet],
  );

  const getDumptrucksByWorkUnit = useCallback(
    (workUnitId) => availableUnits.filter((dt) => dt.workUnitId === workUnitId),
    [availableUnits],
  );

  useEffect(() => {
    const initializeData = async () => {
      if (!user) {
        return;
      }

      if (filteredFleetConfigs.length === 0) {
        return;
      }

      await Promise.all([
        loadDumptruckSettings({
          measurementType,
        }),
        loadAvailableUnits(),
      ]);
    };

    initializeData();
  }, [
    user,
    filteredFleetConfigs.length,
    timbanganFleetConfigs.length,
    measurementType,
    loadDumptruckSettings,
    loadAvailableUnits,
  ]);

  return {
    dumptruckSettings,
    availableUnits,
    filteredUnitsByFleet,
    dumptruckStats,
    userRoleInfo,

    isLoading,
    isRefreshing,
    error,

    loadDumptruckSettings,
    createSetting,
    updateSetting,
    deleteSetting,
    refresh,

    getDumptrucksByWorkUnit,
    getUnitsForFleet,
    getFilteredUnitsForFleet,
    reactivateDumptruckSetting,
  };
};
