import { offlineService } from "@/shared/services/offlineService";

const BASE = "/v1/custom/coal-shipment-log";
const UPLOAD_BASE = "/upload";

const pengeluaranKAService = {
  /**
   * Create shipment log records.
   * @param {Array} payload - Array of carriage records
   */
  create: async (payload) => {
    const response = await offlineService.post(BASE, payload, {
      bypassQueue: true,
    });
    return response;
  },

  update: async (payload) => {
    const response = await offlineService.put(BASE, payload, {
      bypassQueue: true,
    })
    return response;
  },

  /**
   * Fetch laporan report.
   * @param {{ start_date: string, end_date: string }} params - ISO date strings
   */
  getReport: async (params = {}, { forceRefresh = false } = {}) => {
    const response = await offlineService.get(`${BASE}/report`, { params, forceRefresh });
    return response?.data || response;
  },

  /**
   * Promise cache to prevent double-hitting /dashboard 
   * when both the main hook and the destination options hook fetch simultaneously.
   */
  _dashboardCache: {},

  /**
   * Fetch dashboard data.
   * @param {{ start_date: string, end_date: string, destination: string }} params
   *   destination = "all" | specific name
   */
  getDashboard: async (params = {}, { forceRefresh = false } = {}) => {
    // stable serialization for cache key
    const currentKey = JSON.stringify({
      start_date: params.start_date,
      end_date: params.end_date,
      destination: params.destination,
      shift: params.shift,
    });

    // return existing inflight promise if same request is already ongoing
    if (!forceRefresh && pengeluaranKAService._dashboardCache[currentKey]) {
      return pengeluaranKAService._dashboardCache[currentKey];
    }

    // create new promise, cache it, and remove from cache when settled
    const promise = offlineService.get(`${BASE}/dashboard`, { params, forceRefresh })
      .then(response => response?.data || response)
      .finally(() => {
        delete pengeluaranKAService._dashboardCache[currentKey];
      });

    pengeluaranKAService._dashboardCache[currentKey] = promise;
    return promise;
  },

  /**
   * Upload evidence document (Berita Acara) for override.
   * Supports PDF, JPG, PNG, WebP — max 10MB.
   * @param {File} file
   * @returns {{ id: number, url: string, name: string }}
   */
  uploadEvidence: async (file) => {
    if (!file) throw new Error("File tidak boleh kosong");

    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      throw new Error("Hanya file PDF, JPG, PNG, dan WebP yang diperbolehkan");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Ukuran file maksimal 10MB");
    }

    const formData = new FormData();
    formData.append("files", file);

    const response = await offlineService.post(UPLOAD_BASE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      bypassQueue: true,
    });

    // Strapi upload response variants
    let uploaded = null;
    if (Array.isArray(response))                           uploaded = response[0];
    else if (Array.isArray(response?.data))                uploaded = response.data[0];
    else if (response?.data && typeof response.data === "object") uploaded = response.data;
    else if (response?.id)                                 uploaded = response;

    if (!uploaded?.id) {
      throw new Error("Upload berhasil tetapi ID tidak ditemukan pada response.");
    }

    return {
      id:   uploaded.id,
      url:  `${import.meta.env.VITE_API_URL}${uploaded.url}`,
      name: uploaded.name,
    };
  },
};

export default pengeluaranKAService;
