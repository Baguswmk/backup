import { offlineService } from "@/shared/services/offlineService";
/**
 * Mock Service for Rencana & Realisasi
 */
export const rencanaRealisasiService = {
  /**
   * Fetch data based on date range
   */
  fetchData: async ({ params }) => {
    try {
      const response = await offlineService.get("/coal-flows", { 
        params: {
          populate: "*",
          sort: ["createdAt:desc"],
          ...params
        } 
      });
      let data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        data = data.map(item => {
          const docData = item.attributes?.document?.data;
          return {
            id: item.id,
            ...item.attributes,
            document: docData ? {
              id: docData.id,
              ...(docData.attributes || docData) // Handle both formats just in case
            } : null
          };
        });
      }
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Fetch Data Error:", error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  },

  createData: async (payload) => {
    try {
      const response = await offlineService.post("/coal-flows", { data: payload });
      const item = response.data?.data || response.data;
      return {
        success: true,
        data: {
          id: item.id,
          ...(item.attributes || item),
        },
      };
    } catch (error) {
      console.error("Create Data Error:", error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  },

  createBulkData: async (payload) => {
    try {
      const response = await offlineService.post("/v1/custom/coal-flow", payload);
      // Custom endpoint might return data directly
      const items = response.data?.data || response.data || [];
      return {
        success: true,
        data: items,
      };
    } catch (error) {
      console.error("Create Bulk Data Error:", error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  },

  updateData: async (id, payload) => {
    try {
      const response = await offlineService.put(`/coal-flows/${id}`, { data: payload });
      const item = response.data?.data || response.data;
      return {
        success: true,
        data: {
          id: item.id,
          ...(item.attributes || item),
        },
      };
    } catch (error) {
      console.error("Update Data Error:", error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  },

  deleteData: async (id) => {
    try {
      await offlineService.delete(`/coal-flows/${id}`);
      return {
        success: true,
        message: "Data deleted successfully",
      };
    } catch (error) {
      console.error("Delete Data Error:", error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  },

  /**
   * Upload Excel
   */
  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append("files", file);

    try {
      const response = await offlineService.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(progress);
          }
        },
        timeout: 10 * 60 * 1000,
      });
      return response;
    } catch (error) {
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        throw new Error(
          `Upload timeout - File "${file.name}" (${this.formatFileSize(file.size)}) took too long. Try with a smaller file or check your connection.`,
        );
      }

      if (error.response?.status === 413) {
        throw new Error(
          `File "${file.name}" exceeds server/Cloudflare limit (100MB).`,
        );
      }

      throw error;
    }
  },
};
