import { apiClient } from "@/shared/services/api";
import { secureStorage } from "@/shared/storage/secureStorage";

export const rakorTargetService = {
  /**
   * Mengambil list target rakor
   * @param {Object} params Filter yang digunakan (year, month, mode, spph, dsb)
   * mode="rakor" → hanya ambil record dengan spph IS NULL (cukup input company)
   * mode="spph"  → hanya ambil record dengan spph IS NOT NULL
   */
  async fetchTargets(params) {
    try {
      const { mode, ...rest } = params || {};

      const apiParams = { ...rest };

      if (mode === "rakor") {
        apiParams.spph_null = true; // BE filter: spph IS NULL
      } else if (mode === "spph") {
        apiParams.has_spph = true; // BE filter: spph IS NOT NULL
      }

      const response = await apiClient.get("/v1/custom/rakor-target", { params: apiParams });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Gagal mengambil data Target Rakor");
    }
  },

  /**
   * Mengambil laporan kinerja (Realisasi vs Target)
   * @param {Object} params year (wajib), month, spph, dll 
   */
  async fetchKinerja(params) {
    try {
      const response = await apiClient.get("/v1/custom/rakor-kinerja", { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Gagal mengambil data Kinerja Rakor");
    }
  },

  /**
   * Upload file media ke Strapi Backend
   * @param {File} file File yang akan diupload (rakor_document)
   */
  async uploadMedia(file) {
    try {
      const formData = new FormData();
      formData.append("files", file);

      // Endpoint standar upload strapi adalah /api/upload
      // Karena apiClient baseURL sudah /api, kita post ke /upload
      const response = await apiClient.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Strapi mengembalikan array of uploaded files, ambil index 0
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error("Gagal mengupload file: Response kosong");
    } catch (error) {
      throw this.handleError(error, "Gagal mengupload dokumen");
    }
  },

  /**
   * Membuat Target Rakor baru
   */
  async createTarget(payload, file) {
    try {
      let rakor_document = payload.rakor_document;

      // Jika ada file fisik baru, upload terlebih dahulu
      if (file) {
        const uploadedMedia = await this.uploadMedia(file);
        rakor_document = uploadedMedia.id;
      }

      const finalPayload = {
        ...payload,
        rakor_document,
      };

      const response = await apiClient.post("/v1/custom/rakor-target", finalPayload);
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Gagal membuat data Target Rakor");
    }
  },

  /**
   * Update Target Rakor existing
   */
  async updateTarget(id, payload, file) {
    try {
      let rakor_document = payload.rakor_document;

      // Jika ada file fisik baru, upload terlebih dahulu
      if (file) {
        const uploadedMedia = await this.uploadMedia(file);
        rakor_document = uploadedMedia.id;
      }

      const finalPayload = {
        ...payload,
        rakor_document,
      };

      const response = await apiClient.put(`/v1/custom/rakor-target/${id}`, finalPayload);
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Gagal mengubah data Target Rakor");
    }
  },

  /**
   * Menghapus Target Rakor secara soft delete
   */
  async deleteTarget(id) {
    try {
      const response = await apiClient.delete(`/v1/custom/rakor-target/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Gagal menghapus data Target Rakor");
    }
  },

  handleError(error, defaultMessage) {
    let message = defaultMessage;
    if (error.response?.data?.message) {
      message = error.response.data.message;
    // strapi standard err format fallback
    } else if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    }
    return new Error(message);
  },
};
