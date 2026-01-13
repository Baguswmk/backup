import { create } from "zustand";
import { dashboardService } from "@/modules/timbangan/dashboard/services/dashboardService";
import { logger } from "@/shared/services/log";

/**
 * Debounce helper
 */
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Initial filters
 */
const createInitialFilters = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return {
    startDate: sevenDaysAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    shift: 'All',
    weighBridge: null,
    dim: 'loading', // for location breakdown
    by: 'dumptruck', // for leaderboard
    limit: 10,
  };
};

export const dashboardStore = create((set, get) => ({
  // ============================================
  // STATE
  // ============================================
  filters: createInitialFilters(),
  
  // Widget data
  summary: null,
  trend: [],
  byShift: [],
  byLocation: [],
  leaderboard: [],
  queue: [],

  // Loading states
  isLoading: false,
  isLoadingSummary: false,
  isLoadingTrend: false,
  isLoadingByShift: false,
  isLoadingByLocation: false,
  isLoadingLeaderboard: false,
  isLoadingQueue: false,

  // Error states
  error: null,

  // Last fetch timestamp
  lastFetch: null,

  // Fetch in progress flag
  fetchInProgress: false,

  // ============================================
  // FILTER ACTIONS
  // ============================================
  setFilters: (newFilters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...newFilters,
      },
    }));

    // Debounced fetch
    get().debouncedFetchAll();
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));

    get().debouncedFetchAll();
  },

  resetFilters: () => {
    set({ filters: createInitialFilters() });
    get().fetchAll();
  },

  // ============================================
  // FETCH INDIVIDUAL WIDGETS
  // ============================================
  fetchSummary: async () => {
    const { filters } = get();
    set({ isLoadingSummary: true });

    try {
      const result = await dashboardService.getSummary(filters);
      
      if (result.success) {
        set({ summary: result.data, isLoadingSummary: false });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to fetch summary', { error: error.message });
      set({ isLoadingSummary: false, error: error.message });
    }
  },

  fetchTrend: async () => {
    const { filters } = get();
    set({ isLoadingTrend: true });

    try {
      const result = await dashboardService.getTrend(filters);
      
      if (result.success) {
        set({ trend: result.data, isLoadingTrend: false });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to fetch trend', { error: error.message });
      set({ isLoadingTrend: false, error: error.message });
    }
  },

  fetchByShift: async () => {
    const { filters } = get();
    set({ isLoadingByShift: true });

    try {
      const result = await dashboardService.getBreakdownByShift(filters);
      
      if (result.success) {
        set({ byShift: result.data, isLoadingByShift: false });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to fetch by shift', { error: error.message });
      set({ isLoadingByShift: false, error: error.message });
    }
  },

  fetchByLocation: async () => {
    const { filters } = get();
    set({ isLoadingByLocation: true });

    try {
      const result = await dashboardService.getBreakdownByLocation(filters);
      
      if (result.success) {
        set({ byLocation: result.data, isLoadingByLocation: false });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to fetch by location', { error: error.message });
      set({ isLoadingByLocation: false, error: error.message });
    }
  },

  fetchLeaderboard: async () => {
    const { filters } = get();
    set({ isLoadingLeaderboard: true });

    try {
      const result = await dashboardService.getLeaderboard(filters);
      
      if (result.success) {
        set({ leaderboard: result.data, isLoadingLeaderboard: false });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to fetch leaderboard', { error: error.message });
      set({ isLoadingLeaderboard: false, error: error.message });
    }
  },

  fetchQueue: async () => {
    const { filters } = get();
    set({ isLoadingQueue: true });

    try {
      const result = await dashboardService.getQueue({
        weighBridge: filters.weighBridge,
      });
      
      if (result.success) {
        set({ queue: result.data, isLoadingQueue: false });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to fetch queue', { error: error.message });
      set({ isLoadingQueue: false, error: error.message });
    }
  },

  // ============================================
  // FETCH ALL (Parallel)
  // ============================================
  fetchAll: async () => {
    const state = get();

    // Prevent double fetch
    if (state.fetchInProgress) {
      logger.warn('⚠️ Fetch already in progress, skipping...');
      return;
    }

    set({ 
      isLoading: true, 
      fetchInProgress: true,
      error: null 
    });

    logger.info('🔄 Fetching all dashboard widgets...');

    try {
      // Fetch all widgets in parallel
      await Promise.all([
        get().fetchSummary(),
        get().fetchTrend(),
        get().fetchByShift(),
        get().fetchByLocation(),
        get().fetchLeaderboard(),
        get().fetchQueue(),
      ]);

      set({ 
        isLoading: false,
        fetchInProgress: false,
        lastFetch: new Date().toISOString(),
      });

      logger.info('✅ All dashboard widgets fetched successfully');
    } catch (error) {
      logger.error('❌ Failed to fetch dashboard data', {
        error: error.message,
      });
      
      set({ 
        isLoading: false,
        fetchInProgress: false,
        error: error.message 
      });
    }
  },

  // Debounced version (300ms)
  debouncedFetchAll: debounce(async () => {
    await get().fetchAll();
  }, 300),

  // ============================================
  // UTILITIES
  // ============================================
  clearError: () => set({ error: null }),

  refresh: () => {
    get().fetchAll();
  },
}));