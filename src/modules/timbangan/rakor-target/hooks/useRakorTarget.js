import { useState, useCallback } from "react";
import { rakorTargetService } from "../services/rakorTargetService";
import { showToast } from "@/shared/utils/toast";

export const useRakorTarget = () => {
  const [data, setData] = useState([]);
  const [kinerjaData, setKinerjaData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTargets = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rakorTargetService.fetchTargets(params);
      setData(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      showToast.error(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKinerja = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rakorTargetService.fetchKinerja(params);
      setKinerjaData(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      showToast.error(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTarget = useCallback(async (payload, file) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rakorTargetService.createTarget(payload, file);
      showToast.success("Data Target Rakor berhasil disimpan");
      return true;
    } catch (err) {
      setError(err.message);
      showToast.error(err.message || "Gagal Menyimpan Target Rakor");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTarget = useCallback(async (id, payload, file) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rakorTargetService.updateTarget(id, payload, file);
      showToast.success("Data Target Rakor berhasil diubah");
      return true;
    } catch (err) {
      setError(err.message);
      showToast.error(err.message || "Gagal Mengubah Target Rakor");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTarget = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rakorTargetService.deleteTarget(id);
      showToast.success("Data Target Rakor berhasil dihapus");
      return true;
    } catch (err) {
      setError(err.message);
      showToast.error(err.message || "Gagal Menghapus Target Rakor");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    kinerjaData,
    loading,
    error,
    fetchTargets,
    fetchKinerja,
    createTarget,
    updateTarget,
    deleteTarget,
  };
};
