import { useState, useCallback, useEffect, useMemo } from "react";
import { dumptruckService } from "@/modules/timbangan/dumptruck/services/dumptruckService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { showToast } from "@/shared/utils/toast";
import { withErrorHandling } from "@/shared/utils/errorHandler";
import { offlineService } from "@/shared/services/offlineService";

export const useDumptruck = (fleetHook, measurementType = null) => {
  const {
    user,
    filteredFleetConfigs = [],
    activeFleetConfigs = [],
    timbanganFleetConfigs = [],
    userRoleInfo,
    viewingDateRange = null,
    viewingShift = null,
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
      (dt) => dt.status === "maintenance"
    ).length;
    const inactive = availableUnits.filter(
      (dt) => !dt.status || dt.status === "inactive"
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
        onError: (err) => console.error("❌ Failed to load units:", err),
      }
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
          const effectiveShift = options.shift || viewingShift;
          const result = await dumptruckService.fetchDumptruckSettings({
            user,
            forceRefresh: options.forceRefresh || false,
            dateRange: options.dateRange || viewingDateRange,
            shift: effectiveShift,
            measurementType: measurementType || options.measurementType || null,
            ...options,
          });

          setDumptruckSettings(result.data);
          return { success: true, data: result.data };
        },
        {
          operation: "load dumptruck settings",
          onError: (err) => {
            console.error("❌ Load dumptruck settings error:", err);
            setError(err.message);
          },
        }
      ).finally(() => {
        loadingState(false);
      });
    },
    [user, viewingDateRange, measurementType, viewingShift]
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
        dateRange: viewingDateRange,
        shift: viewingShift,
        measurementType,
      }),
      loadAvailableUnits(),
    ]);
  }, [
    loadDumptruckSettings,
    loadAvailableUnits,
    user,
    viewingDateRange,
    measurementType,
    viewingShift,
  ]);

  const reactivateDumptruckSetting = useCallback(
    async (settingId) => {
      setIsLoading(true);
      setError(null);

      try {
        const setting = dumptruckSettings.find(
          (s) => String(s.id) === String(settingId)
        );

        if (!setting) {
          throw new Error("Setting tidak ditemukan");
        }

        if (setting.fleet?.status !== "CLOSED") {
          throw new Error(
            `Fleet dengan status ${setting.fleet?.status} tidak bisa direaktivasi`
          );
        }

        const result = await dumptruckService.reactivateDumptruckSetting(
          settingId
        );

        if (result.success) {
          showToast.success("Fleet berhasil direaktivasi ke status ACTIVE");

          await refresh();

          return { success: true };
        }

        throw new Error(result.error || "Failed to reactivate setting");
      } catch (error) {
        console.error("❌ Reactivate error:", error);
        setError(error.response.data.message);
        showToast.error(
          error.response.data.message || "Gagal mereaktivasi fleet"
        );
        return { success: false, error: error.response.data.message };
      } finally {
        setIsLoading(false);
      }
    },
    [dumptruckSettings, refresh]
  );

  const getFilteredUnitsForFleet = useCallback(async (settingFleetId) => {
    try {
      const result = await dumptruckService.getFilteredUnitsByFleet(
        settingFleetId
      );

      if (result.success) {
        setFilteredUnitsByFleet((prev) => ({
          ...prev,
          [String(settingFleetId)]: result.data,
        }));
        return result.data;
      }

      return [];
    } catch (error) {
      console.error("❌ Failed to get filtered units:", error);
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
            (pair) => !pair.truckId || !pair.operatorId
          );

          if (invalidPairs.length > 0) {
            throw new Error(
              `${invalidPairs.length} pasangan tidak valid. Pastikan semua unit memiliki operator.`
            );
          }

          const result = await dumptruckService.createDumptruckSetting({
            setting_fleet_id: String(fleetId),
            pair_dt_op: pairDtOp,
          });

          await refresh();
          return { success: true, data: result.data || {} };
        },
        {
          operation: "create dumptruck setting",
          onError: (err) => setError(err.message),
        }
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [refresh]
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
              (pair) => !pair.truckId || !pair.operatorId
            );

            if (invalidPairs.length > 0) {
              throw new Error(
                `${invalidPairs.length} pasangan tidak valid. Pastikan semua unit memiliki operator.`
              );
            }

            updatePayload.pair_dt_op = pairDtOp;
          }

          if (setting_fleet_id) {
            updatePayload.setting_fleet_id = String(setting_fleet_id);
          }

          const result = await dumptruckService.updateDumptruckSetting(
            settingId,
            updatePayload
          );

          await refresh();
          return { success: true, data: result.data };
        },
        {
          operation: "update dumptruck setting",
          onError: (err) => setError(err.message),
        }
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [refresh]
  );

  const deleteSetting = useCallback(
    async (settingId) => {
      setIsLoading(true);
      setError(null);

      return await withErrorHandling(
        async () => {
          await dumptruckService.deleteDumptruckSetting(settingId);
          await refresh();
          return { success: true };
        },
        {
          operation: "delete dumptruck setting",
          onError: (err) => setError(err.message),
        }
      ).finally(() => {
        setIsLoading(false);
      });
    },
    [refresh]
  );

  const getUnitsForFleet = useCallback(
    async (fleetId) => {
      try {
        const fleet = activeFleetConfigs.find((f) => f.id === fleetId);

        if (!fleet) {
          console.warn(`⚠️ Fleet ${fleetId} not found in filtered configs`);
          return [];
        }

        return await getFilteredUnitsForFleet(fleetId);
      } catch (error) {
        console.error("❌ Error filtering units for fleet:", error);
        return availableUnits.filter((u) => u.type === "DUMP_TRUCK");
      }
    },
    [activeFleetConfigs, availableUnits, getFilteredUnitsForFleet]
  );

  const getDumptrucksByWorkUnit = useCallback(
    (workUnitId) => availableUnits.filter((dt) => dt.workUnitId === workUnitId),
    [availableUnits]
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
          dateRange: viewingDateRange,
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
    viewingDateRange,
    measurementType,
    loadDumptruckSettings,
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
