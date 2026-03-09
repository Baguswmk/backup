import { useState, useCallback, useEffect } from "react";
import { unitLogService } from "@/modules/timbangan/fleet/services/unitLogService";
import { showToast } from "@/shared/utils/toast";

export const useUnitLog = () => {
  // State
  const [activeUnitLogs, setActiveUnitLogs] = useState([]);
  const [mmctEquipmentLists, setMMCTEquipmentLists] = useState({
    dt_service: [],
    dt_bd: [],
    exca_service: [],
    exca_bd: [],
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    dt_service: 0,
    dt_bd: 0,
    exca_service: 0,
    exca_bd: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create unit log
   */
  const createUnitLog = useCallback(async (logData) => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await unitLogService.createUnitLog(logData);

      if (!result.success) {
        throw new Error(result.error);
      }

      showToast.success("Berhasil menambahkan data unit log");

      return result;
    } catch (err) {
      const errorMessage = err.message || "Gagal menambahkan unit log";
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Verify unit log
   */
  const verifyUnitLog = useCallback(async (id, completionDate) => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await unitLogService.verifyUnitLog({
        id,
        completion_date: completionDate,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      showToast.success("Berhasil memverifikasi unit log");

      return result;
    } catch (err) {
      const errorMessage = err.message || "Gagal memverifikasi unit log";
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Load active unit logs
   */
  const loadActiveUnitLogs = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await unitLogService.fetchActiveUnitLogs({ forceRefresh });

      if (!result.success) {
        throw new Error(result.error);
      }

      setActiveUnitLogs(result.data);
      return result;
    } catch (err) {
      const errorMessage = err.message || "Gagal memuat data unit log";
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load MMCT equipment lists
   */
  const loadMMCTEquipmentLists = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await unitLogService.fetchMMCTEquipmentLists({
        forceRefresh,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setMMCTEquipmentLists(result.data);
      return result;
    } catch (err) {
      const errorMessage = err.message || "Gagal memuat data MMCT equipment";
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Add to MMCT list
   */
  const addToMMCTList = useCallback(
    async (category, unitId, unitName, description) => {
      setIsSaving(true);
      setError(null);

      try {
        // Validate description
        if (!description || description.trim() === "") {
          throw new Error("Keterangan tidak boleh kosong");
        }

        const result = await unitLogService.addToMMCTList(
          category,
          unitId,
          unitName,
          description,
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        showToast.success("Berhasil menambahkan alat ke MMCT list");

        // Reload lists and statistics
        await Promise.all([loadMMCTEquipmentLists(true)]);

        return result;
      } catch (err) {
        const errorMessage = err.message || "Gagal menambahkan ke MMCT list";
        setError(errorMessage);
        showToast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsSaving(false);
      }
    },
    [loadMMCTEquipmentLists],
  );

  /**
   * Remove from MMCT list
   */
  const removeFromMMCTList = useCallback(
    async (unitLogId) => {
      setIsSaving(true);
      setError(null);

      try {
        const result = await unitLogService.removeFromMMCTList(unitLogId);

        if (!result.success) {
          throw new Error(result.error);
        }

        showToast.success("Berhasil menghapus alat dari MMCT list");

        // Reload lists and statistics
        await Promise.all([loadMMCTEquipmentLists(true)]);

        return result;
      } catch (err) {
        const errorMessage = err.message || "Gagal menghapus dari MMCT list";
        setError(errorMessage);
        showToast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsSaving(false);
      }
    },
    [loadMMCTEquipmentLists],
  );

  /**
   * Bulk remove from MMCT list
   */
  const bulkRemoveFromMMCTList = useCallback(
    async (unitLogIds) => {
      setIsSaving(true);
      setError(null);

      try {
        const result = await unitLogService.bulkRemoveFromMMCTList(unitLogIds);

        if (!result.success) {
          throw new Error(result.error);
        }

        showToast.success(
          result.message ||
            "Berhasil menghapus alat dari MMCT list secara bulk",
        );

        // Reload lists and statistics
        await Promise.all([loadMMCTEquipmentLists(true)]);

        return result;
      } catch (err) {
        const errorMessage =
          err.message || "Gagal menghapus secara bulk dari MMCT list";
        setError(errorMessage);
        showToast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsSaving(false);
      }
    },
    [loadMMCTEquipmentLists],
  );

  /**
   * Bulk add to MMCT list
   */
  const bulkAddToMMCTList = useCallback(
    async (category, equipmentList) => {
      setIsSaving(true);
      setError(null);

      try {
        const result = await unitLogService.bulkAddToMMCTList(
          category,
          equipmentList,
        );
        if (result.success) {
          showToast.success(result.message);
        } else if (result.partialSuccess) {
          showToast.warning(result.message);
        } else {
          throw new Error(result.error);
        }

        // Reload lists and statistics
        await Promise.all([loadMMCTEquipmentLists(true)]);

        return result;
      } catch (err) {
        const errorMessage =
          err.message || "Gagal menambahkan bulk ke MMCT list";
        setError(errorMessage);
        showToast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsSaving(false);
      }
    },
    [loadMMCTEquipmentLists],
  );

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    unitLogService.clearCache();
  }, []);

  /**
   * Refresh all MMCT data
   */
  const refreshMMCT = useCallback(async () => {
    await clearCache();
    await Promise.all([loadMMCTEquipmentLists(true)]);
  }, [clearCache, loadMMCTEquipmentLists]);

  // Auto-load on mount
  useEffect(() => {
    loadMMCTEquipmentLists();
  }, [loadMMCTEquipmentLists]);

  return {
    // State
    activeUnitLogs,
    mmctEquipmentLists,
    statistics,
    isLoading,
    isSaving,
    error,

    // Unit Log operations
    createUnitLog,
    verifyUnitLog,
    loadActiveUnitLogs,

    // MMCT operations
    loadMMCTEquipmentLists,
    addToMMCTList,
    removeFromMMCTList,
    bulkRemoveFromMMCTList,
    bulkAddToMMCTList,
    refreshMMCT,
    clearCache,
  };
};
