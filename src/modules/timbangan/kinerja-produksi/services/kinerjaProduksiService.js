import { apiClient } from "@/shared/services/api";

export const kinerjaProduksiService = {
  /**
   * Mengambil data kinerja produksi
   * @param {Object} params - { date, mode, year, month, include_housekeeping, pic_work_unit }
   * @returns {Promise<Object>}
   */
  async fetchKinerja(params) {
    try {
      const response = await apiClient.get("/v1/custom/kinerja-produksi", {
        params,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Gagal mengambil data Kinerja Produksi");
    }
  },

  handleError(error, defaultMessage) {
    let message = defaultMessage;
    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    }
    return new Error(message);
  },
};
