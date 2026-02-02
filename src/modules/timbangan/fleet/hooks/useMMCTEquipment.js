import { useState, useCallback, useEffect } from "react";
import { mmctEquipmentService } from "@/modules/timbangan/fleet/services/mmctEquipmentService";
import { showToast } from "@/shared/utils/toast";
import { TOAST_MESSAGES } from "@/modules/timbangan/fleet/constants/mmctEquipmentConstants";

/**
 * Custom hook untuk mengelola MMCT Equipment Lists
 * Provides state management dan CRUD operations
 */
export const useMMCTEquipment = () => {
  const [equipmentLists, setEquipmentLists] = useState({
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
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load all equipment lists from API
   */
  const loadEquipmentLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await mmctEquipmentService.getAllEquipmentLists();
      setEquipmentLists(data);
      setHasChanges(false);
      return { success: true, data };
    } catch (err) {
      const errorMessage = err.message || TOAST_MESSAGES.LOAD_ERROR;
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load equipment list by category
   */
  const loadEquipmentListByCategory = useCallback(async (category) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await mmctEquipmentService.getEquipmentListByCategory(category);
      setEquipmentLists((prev) => ({
        ...prev,
        [category]: data,
      }));
      return { success: true, data };
    } catch (err) {
      const errorMessage = err.message || TOAST_MESSAGES.LOAD_ERROR;
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save all equipment lists to API
   */
  const saveAllEquipmentLists = useCallback(async (lists) => {
    setIsSaving(true);
    setError(null);
    
    try {
      const result = await mmctEquipmentService.saveAllEquipmentLists(lists);
      setEquipmentLists(lists);
      setHasChanges(false);
      showToast.success(TOAST_MESSAGES.SAVE_SUCCESS);
      
      // Reload statistics after save
      await loadStatistics();
      
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || TOAST_MESSAGES.SAVE_ERROR;
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Save equipment list by category
   */
  const saveEquipmentListByCategory = useCallback(async (category, list) => {
    setIsSaving(true);
    setError(null);
    
    try {
      const result = await mmctEquipmentService.saveEquipmentListByCategory(
        category,
        list
      );
      
      setEquipmentLists((prev) => ({
        ...prev,
        [category]: list,
      }));
      
      setHasChanges(false);
      showToast.success(TOAST_MESSAGES.SAVE_SUCCESS);
      
      // Reload statistics after save
      await loadStatistics();
      
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || TOAST_MESSAGES.SAVE_ERROR;
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Delete equipment from list
   */
  const deleteEquipment = useCallback(async (category, equipmentId) => {
    setIsSaving(true);
    setError(null);
    
    try {
      await mmctEquipmentService.deleteEquipment(category, equipmentId);
      
      setEquipmentLists((prev) => ({
        ...prev,
        [category]: prev[category].filter(
          (item) => item.id !== equipmentId
        ),
      }));
      
      showToast.success(TOAST_MESSAGES.DELETE_SUCCESS);
      
      // Reload statistics after delete
      await loadStatistics();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || TOAST_MESSAGES.DELETE_ERROR;
      setError(errorMessage);
      showToast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Load statistics
   */
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await mmctEquipmentService.getStatistics();
      setStatistics(stats);
      return { success: true, data: stats };
    } catch (err) {
      console.error("Failed to load statistics:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Add equipment to category
   */
  const addEquipment = useCallback((category, equipment) => {
    setEquipmentLists((prev) => ({
      ...prev,
      [category]: [
        ...prev[category],
        {
          id: `temp-${Date.now()}`,
          equipmentType: equipment.equipmentType || "",
          equipmentId: equipment.equipmentId || null,
          equipmentName: equipment.equipmentName || "",
          isNew: true,
        },
      ],
    }));
    setHasChanges(true);
  }, []);

  /**
   * Update equipment in category
   */
  const updateEquipment = useCallback((category, index, updates) => {
    setEquipmentLists((prev) => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? { ...item, ...updates } : item
      ),
    }));
    setHasChanges(true);
  }, []);

  /**
   * Remove equipment from category (local state only)
   */
  const removeEquipment = useCallback((category, index) => {
    setEquipmentLists((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  /**
   * Reset to original state
   */
  const reset = useCallback(() => {
    loadEquipmentLists();
    setHasChanges(false);
  }, [loadEquipmentLists]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    mmctEquipmentService.clearCache();
  }, []);

  /**
   * Validate equipment lists before save
   */
  const validate = useCallback((lists) => {
    for (const [category, items] of Object.entries(lists)) {
      for (const item of items) {
        if (!item.equipmentId || !item.equipmentName) {
          return {
            valid: false,
            error: `Data tidak lengkap pada kategori ${category}`,
          };
        }
      }
    }
    return { valid: true };
  }, []);

  /**
   * Get total equipment count
   */
  const getTotalCount = useCallback(() => {
    return Object.values(equipmentLists).reduce(
      (sum, list) => sum + list.length,
      0
    );
  }, [equipmentLists]);

  /**
   * Get count by category
   */
  const getCategoryCount = useCallback(
    (category) => {
      return equipmentLists[category]?.length || 0;
    },
    [equipmentLists]
  );

  // Auto-load on mount
  useEffect(() => {
    loadEquipmentLists();
    loadStatistics();
  }, []);

  return {
    // State
    equipmentLists,
    statistics,
    isLoading,
    isSaving,
    hasChanges,
    error,

    // CRUD Operations
    loadEquipmentLists,
    loadEquipmentListByCategory,
    saveAllEquipmentLists,
    saveEquipmentListByCategory,
    deleteEquipment,

    // Local State Operations
    addEquipment,
    updateEquipment,
    removeEquipment,

    // Utility Functions
    loadStatistics,
    reset,
    clearCache,
    validate,
    getTotalCount,
    getCategoryCount,

    // State Setters (for advanced usage)
    setEquipmentLists,
    setHasChanges,
  };
};