import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

export const hindranceService = {
  /**
   * GET Hindrance Details
   * @param {Object} params - { exca_hull_no, date }
   * @returns {Promise<Object>} List of hindrance details
   */
  async getHindranceDetails(params = {}) {
    try {
      const { exca_hull_no, date } = params;

      if (!exca_hull_no || !date) {
        throw new Error("Parameter exca_hull_no dan date harus diisi");
      }

      const queryParams = new URLSearchParams();
      
      if (Array.isArray(exca_hull_no)) {
        exca_hull_no.forEach(exca => {
          queryParams.append("exca_hull_no", exca);
        });
      } else {
        queryParams.append("exca_hull_no", exca_hull_no);
      }
      
      queryParams.append("date", date);
      logger.info("📋 Fetching hindrance details", {
        exca_hull_no,
        date,
      });

      const response = await offlineService.get(
        `/v1/custom/hindrance-detail?${queryParams.toString()}`,
        {
          ttl: 1 * 60 * 1000, 
        }
      );

      logger.info("✅ Hindrance details fetched", {
        count: response.data?.length || 0,
      });

      return {
        success: true,
        data: response.data || [],
        message: "Data kendala berhasil dimuat",
      };
    } catch (error) {
      logger.error("❌ Failed to fetch hindrance details", {
        error: error?.response?.data?.message || error.message,
        params,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal mengambil data kendala"
      );
    }
  },

  /**
   * GET Hindrance Categories with Items
   * @returns {Promise<Object>} List of categories with hindrance items
   */
  async getHindranceCategories() {
    try {
      logger.info("📋 Fetching hindrance categories");

      const response = await offlineService.get(
        "/v1/custom/hindrance-category",
        {
          ttl: 5 * 60 * 1000, // Cache 5 menit (data jarang berubah)
        }
      );

      logger.info("✅ Hindrance categories fetched", {
        count: response.data?.length || 0,
      });

      return {
        success: true,
        data: response.data || [],
        message: "Data kategori kendala berhasil dimuat",
      };
    } catch (error) {
      logger.error("❌ Failed to fetch hindrance categories", {
        error: error?.response?.data?.message || error.message,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal mengambil data kategori kendala"
      );
    }
  },

  /**
   * POST Create Hindrance Detail
   * @param {Object} data - Hindrance data
   * @returns {Promise<Object>} Created hindrance detail
   */
  async createHindrance(data) {
    try {
      const {
        hindrance_category,
        hindrance,
        description,
        evidence, // Array of media IDs
        exca_hull_no,
        shift,
        date,
        start_time,
        end_time,
        hour_date,
      } = data;

      // Validasi required fields sesuai schema
      if (!hindrance_category || !hindrance) {
        throw new Error("Kategori dan deskripsi kendala harus diisi");
      }

      if (!exca_hull_no || !date || !shift || !start_time || !end_time || !hour_date) {
        throw new Error("Data wajib tidak lengkap");
      }

      if (!evidence || evidence.length === 0) {
        throw new Error("Minimal 1 foto bukti harus diupload");
      }

      logger.info("📝 Creating hindrance detail", {
        hindrance_category,
        exca_hull_no,
        date,
        hour_date,
      });

      const payload = {
        hindrance_category,
        hindrance,
        description: description || "",
        evidence, // Array of media IDs, bukan URLs
        exca_hull_no,
        shift,
        date,
        start_time,
        end_time,
        hour_data: hour_date,
        // company, satker, sub_satker akan diisi otomatis di BE dari user context
      };

      const response = await offlineService.post(
        "/v1/custom/hindrance-detail",
        payload,
        {
          invalidateCache: true, // Clear cache setelah create
        }
      );

      logger.info("✅ Hindrance detail created", {
        id: response.data?.id,
      });

      return {
        success: true,
        data: response.data,
        message: "Kendala berhasil disimpan",
      };
    } catch (error) {
      logger.error("❌ Failed to create hindrance detail", {
        error: error?.response?.data?.message || error.message,
        data,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal menyimpan kendala"
      );
    }
  },

  /**
   * PUT Update Hindrance Detail
   * @param {number} id - Hindrance ID
   * @param {Object} data - Updated hindrance data
   * @returns {Promise<Object>} Updated hindrance detail
   */
  async updateHindrance(id, data) {
    try {
      if (!id) {
        throw new Error("ID kendala harus diisi");
      }

      logger.info("📝 Updating hindrance detail", {
        id,
        updates: Object.keys(data),
      });

      const response = await offlineService.put(
        `/v1/custom/hindrance-detail/${id}`,
        data,
        {
          invalidateCache: true,
        }
      );

      logger.info("✅ Hindrance detail updated", { id });

      return {
        success: true,
        data: response.data,
        message: "Kendala berhasil diperbarui",
      };
    } catch (error) {
      logger.error("❌ Failed to update hindrance detail", {
        error: error?.response?.data?.message || error.message,
        id,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal memperbarui kendala"
      );
    }
  },

  /**
   * DELETE Hindrance Detail (Soft Delete)
   * @param {number} id - Hindrance ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteHindrance(id) {
    try {
      if (!id) {
        throw new Error("ID kendala harus diisi");
      }

      logger.info("🗑️ Deleting hindrance detail", { id });

      const response = await offlineService.delete(
        `/v1/custom/hindrance-detail/${id}`,
        {
          invalidateCache: true,
        }
      );

      logger.info("✅ Hindrance detail deleted", { id });

      return {
        success: true,
        data: response.data,
        message: "Kendala berhasil dihapus",
      };
    } catch (error) {
      logger.error("❌ Failed to delete hindrance detail", {
        error: error?.response?.data?.message || error.message,
        id,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal menghapus kendala"
      );
    }
  },

  /**
   * Upload Evidence/Photo for Hindrance
   * Returns media ID yang harus digunakan untuk evidence field
   * @param {File} file - Image file
   * @returns {Promise<Object>} Upload result with ID and URL
   */
  async uploadEvidence(file) {
    try {
      if (!file) {
        throw new Error("File tidak boleh kosong");
      }

      // Validasi tipe file
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        throw new Error("Hanya file JPG, PNG, dan WebP yang diperbolehkan");
      }

      // Validasi ukuran (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran file maksimal 5MB");
      }

      logger.info("📤 Uploading evidence", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      const formData = new FormData();
      formData.append("files", file);

      const response = await offlineService.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Response bisa berupa array langsung atau wrapped
      let uploadedFile;
      
      if (Array.isArray(response.data)) {
        // Direct array response
        uploadedFile = response.data[0];
      } else if (response.data && typeof response.data === 'object') {
        // Check if it's wrapped in a data property
        if (Array.isArray(response.data.data)) {
          uploadedFile = response.data.data[0];
        } else if (response.data.id) {
          // Single file object
          uploadedFile = response.data;
        } else {
          // Fallback: use entire response
          uploadedFile = response[0] || response;
        }
      } else {
        // Last resort: check if response itself is an array
        uploadedFile = Array.isArray(response) ? response[0] : response;
      }

      if (!uploadedFile?.id) {
        console.error("❌ Full response structure:", JSON.stringify(response, null, 2));
        throw new Error("Upload berhasil tetapi ID tidak ditemukan dalam response");
      }

      logger.info("✅ Evidence uploaded", {
        id: uploadedFile.id,
        url: uploadedFile.url,
      });

      return {
        success: true,
        data: {
          id: uploadedFile.id, // ID untuk evidence field
          url: uploadedFile.url, // URL untuk preview
          name: uploadedFile.name,
        },
        message: "Foto berhasil diupload",
      };
    } catch (error) {
      logger.error("❌ Failed to upload evidence", {
        error: error?.response?.data?.message || error.message,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal mengupload foto"
      );
    }
  },
};