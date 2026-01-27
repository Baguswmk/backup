import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

/**
 * Transform response from custom API
 */
const transformCustomResponse = (data) => {
  if (!data) return null;
  return data;
};

export const hindranceService = {
  /**
   * GET Hindrance Categories with Items
   */
  async getHindranceCategories() {
    try {
      logger.info("📋 Fetching hindrance categories");

      const response = await offlineService.get(
        "/hindrances",
        {
          params:{
            populate:[ "hindrance_category" ],
          },
          ttl: 5 * 60 * 1000,
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
   * GET Hindrance Details
   * Endpoint: GET /v1/custom/hindrance-detail?exca_hull_no=XXX&date=YYYY-MM-DD
   */
  async getHindranceDetails(params = {}) {
    try {
      const { exca_hull_no, date } = params;

      if (!exca_hull_no || !date) {
        throw new Error("Parameter exca_hull_no dan date harus diisi");
      }

      const queryParams = new URLSearchParams();

      if (Array.isArray(exca_hull_no)) {
        queryParams.append("exca_hull_no", exca_hull_no.join(","));
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

      // Response structure: Array of { [exca_hull_no]: [{ [hour]: [...data] }] }
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
   * POST Create Hindrance Detail
   * Endpoint: POST /v1/custom/hindrance-detail
   */
  async createHindrance(data) {
    try {
      const {
        hindrance_category,
        hindrance,
        description,
        evidence,
        exca_hull_no,
        shift,
        date,
        start_time,
        end_time,
        hour_data,
      } = data;

      if (!hindrance_category || !hindrance) {
        throw new Error("Kategori dan kendala harus diisi");
      }
      if (
        !exca_hull_no ||
        !date ||
        !shift ||
        !hour_data
      ) {
        throw new Error("Data wajib tidak lengkap");
      }

      if (!evidence || evidence.length === 0) {
        throw new Error("Minimal 1 foto bukti harus diupload");
      }

      logger.info("📝 Creating hindrance detail", {
        hindrance_category,
        exca_hull_no,
        date,
        hour_data,
      });

      const payload = {
        hindrance_category,
        hindrance,
        description: description || "",
        evidence,
        exca_hull_no,
        shift,
        date,
        start_time,
        end_time,
        hour_data,
      };

      const response = await offlineService.post(
        "/v1/custom/hindrance-detail",
        payload,
        {
          invalidateCache: true,
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
   * Endpoint: PUT /v1/custom/hindrance-detail/:id
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
   * DELETE Hindrance Detail
   * Endpoint: DELETE /v1/custom/hindrance-detail/:id
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
   * PUT Update Approval Status (Bulk)
   * Endpoint: PUT /v1/custom/hindrance-detail/approval-status
   */
  async updateApprovalStatus(ids, payload) {
    try {
      if (!ids || ids.length === 0) {
        throw new Error("ID kendala harus diisi");
      }

      logger.info("📝 Updating approval status", {
        ids,
        payload,
      });

      const response = await offlineService.put(
        "/v1/custom/hindrance-detail/approval-status",
        {
          ids,
          ...payload,
        },
        {
          invalidateCache: true,
        }
      );

      logger.info("✅ Approval status updated");

      return {
        success: true,
        data: response.data,
        message: "Status persetujuan berhasil diperbarui",
      };
    } catch (error) {
      logger.error("❌ Failed to update approval status", {
        error: error?.response?.data?.message || error.message,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal memperbarui status persetujuan"
      );
    }
  },

  /**
   * PUT Update Revision
   * Endpoint: PUT /v1/custom/hindrance-detail/revisi/:id
   */
  async updateRevision(id, data) {
    try {
      if (!id) {
        throw new Error("ID kendala harus diisi");
      }

      logger.info("📝 Updating revision", {
        id,
        updates: Object.keys(data),
      });

      const response = await offlineService.put(
        `/v1/custom/hindrance-detail/revisi/${id}`,
        data,
        {
          invalidateCache: true,
        }
      );

      logger.info("✅ Revision updated", { id });

      return {
        success: true,
        data: response.data,
        message: "Revisi berhasil diperbarui",
      };
    } catch (error) {
      logger.error("❌ Failed to update revision", {
        error: error?.response?.data?.message || error.message,
        id,
      });

      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Gagal memperbarui revisi"
      );
    }
  },

  /**
   * Upload Evidence/Photo
   * Strapi upload endpoint returns ARRAY directly, not wrapped in {data: [...]}
   */
  async uploadEvidence(file) {
    try {
      if (!file) {
        throw new Error("File tidak boleh kosong");
      }

      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        throw new Error("Hanya file JPG, PNG, dan WebP yang diperbolehkan");
      }

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

      // Debug: Log full response structure

      // Strapi upload response bisa dalam beberapa format:
      // 1. Direct array: [{id: 5, url: "...", ...}]
      // 2. Wrapped in data: {data: [{id: 5, url: "...", ...}]}
      // 3. Wrapped with single object: {data: {id: 5, url: "...", ...}}
      
      let uploadedFile = null;

      // Case 1: Response is direct array
      if (Array.isArray(response)) {
        uploadedFile = response[0];
      }
      // Case 2: Response has data property that is array
      else if (response.data && Array.isArray(response.data)) {
        uploadedFile = response.data[0];
      }
      // Case 3: Response has data property that is object
      else if (response.data && typeof response.data === 'object') {
        uploadedFile = response.data;
      }
      // Case 4: Response is direct object
      else if (response.id) {
        uploadedFile = response;
      }

      // Validate uploadedFile
      if (!uploadedFile || !uploadedFile.id) {
        console.error("❌ Upload response structure:", JSON.stringify(response, null, 2));
        throw new Error(
          "Upload berhasil tetapi ID tidak ditemukan dalam response. Periksa struktur response API."
        );
      }

      logger.info("✅ Evidence uploaded", {
        id: uploadedFile.id,
        url: uploadedFile.url,
        name: uploadedFile.name,
      });

      return {
        success: true,
        data: {
          id: uploadedFile.id,
          url: `${import.meta.env.VITE_API_URL}${uploadedFile.url}`, // Adjust base path as needed
          name: uploadedFile.name,
          formats: uploadedFile.formats || null, // Include formats for thumbnail/preview
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