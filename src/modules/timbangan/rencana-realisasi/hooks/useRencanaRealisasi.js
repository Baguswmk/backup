import { useState, useCallback } from "react";
import { showToast } from "@/shared/utils/toast";
import { rencanaRealisasiService } from "../services/rencanaRealisasiService";

export const useRencanaRealisasi = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await rencanaRealisasiService.fetchData({ params });
      if (response.success) {
        setData(response.data);
      } else {
        throw new Error(response.error || "Gagal mengambil data");
      }
    } catch (err) {
      setError(err.message);
      showToast.error(err.message || "Terjadi kesalahan saat mengambil data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createData = useCallback(async (payload, fileToUpload = null, onProgress = null) => {
    setIsLoading(true);
    try {
      let documentId = null;

      // Jika ada file yang mau diupload bersamaan dengan create data manual
      if (fileToUpload) {
        const uploadResponse = await rencanaRealisasiService.uploadFile(fileToUpload, onProgress);
        const uploadedFile = Array.isArray(uploadResponse) ? uploadResponse[0] : uploadResponse;
        if (uploadedFile && uploadedFile.id) {
          documentId = uploadedFile.id;
        } else {
          throw new Error("Gagal upload file (ID tidak ditemukan)");
        }
      }

      if (Array.isArray(payload)) {
        const payloadArray = payload.map(item => ({
          ...item,
          coal_flow_document: documentId || undefined
        }));

        const response = await rencanaRealisasiService.createBulkData(payloadArray);
        if (response.success) {
          setData((prev) => [...response.data, ...prev]);
          showToast.success(`${response.data.length} Data berhasil ditambahkan`);
          return { success: true, data: response.data };
        } else {
          throw new Error(response.error || "Gagal menambahkan data secara massal");
        }
      } else {
        let finalPayload = { ...payload };
        if (documentId) {
          finalPayload.coal_flow_document = documentId;
        }
        const response = await rencanaRealisasiService.createData(finalPayload);
        if (response.success) {
          setData((prev) => [response.data, ...prev]);
          showToast.success("Data berhasil ditambahkan");
          return { success: true, data: response.data };
        } else {
          throw new Error(response.error || "Gagal menambahkan data");
        }
      }
    } catch (err) {
      showToast.error(err.message || "Terjadi kesalahan saat menambahkan data");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
      if (onProgress) onProgress(0);
    }
  }, []);

  const updateData = useCallback(async (id, payload) => {
    setIsLoading(true);
    try {
      const response = await rencanaRealisasiService.updateData(id, payload);
      if (response.success) {
        setData((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...response.data } : item))
        );
        showToast.success("Data berhasil diupdate");
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || "Gagal mengupdate data");
      }
    } catch (err) {
      showToast.error(err.message || "Terjadi kesalahan saat mengupdate data");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteData = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const response = await rencanaRealisasiService.deleteData(id);
      if (response.success) {
        setData((prev) => prev.filter((item) => item.id !== id));
        showToast.success("Data berhasil dihapus");
        return { success: true };
      } else {
        throw new Error(response.error || "Gagal menghapus data");
      }
    } catch (err) {
      showToast.error(err.message || "Terjadi kesalahan saat menghapus data");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadExcel = useCallback(async (file, onProgress) => {
    setIsLoading(true);
    try {
      const uploadResponse = await rencanaRealisasiService.uploadFile(file, onProgress);
      // Strapi upload returns an array typically
      const uploadedFile = Array.isArray(uploadResponse) ? uploadResponse[0] : uploadResponse;
      
      if (uploadedFile && uploadedFile.id) {
        // Create coal-flow record linked to this document
        const coalFlowResponse = await createData({
          document: uploadedFile.id, // Ensure relation is correctly named (using 'document')
        });

        if (coalFlowResponse.success) {
          showToast.success("Data rencana berhasil diupload dan disimpan");
          return { success: true, data: coalFlowResponse.data };
        } else {
          throw new Error(coalFlowResponse.error || "Gagal menyimpan data rencana");
        }
      } else {
        throw new Error("Gagal upload file (ID tidak ditemukan)");
      }
    } catch (err) {
      showToast.error(err.message || "Terjadi kesalahan saat upload data");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
      if (onProgress) onProgress(0); // Reset progress if needed
    }
  }, [createData]);

  return {
    data,
    isLoading,
    error,
    fetchData,
    createData,
    updateData,
    deleteData,
    uploadExcel,
  };
};
