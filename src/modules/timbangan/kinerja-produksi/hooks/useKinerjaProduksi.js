import { useState, useCallback } from "react";
import { kinerjaProduksiService } from "../services/kinerjaProduksiService";

export const useKinerjaProduksi = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchKinerja = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);
      const res = await kinerjaProduksiService.fetchKinerja(params);
      
      // Expected backend format: { status: true, data: { company_cards, rakor_chart, spph_chart, monthly_rakor, monthly_spph } }
      if (res && res.data) {
        setData({
          company_cards: res.data.company_cards || [],
          rakor_chart: res.data.rakor_chart || [],
          spph_chart: res.data.spph_chart || [],
          monthly_rakor: res.data.monthly_rakor || [],
          monthly_spph: res.data.monthly_spph || [],
        });
      } else {
        setData({
          company_cards: [],
          rakor_chart: [],
          spph_chart: [],
          monthly_rakor: [],
          monthly_spph: [],
        });
      }
      return true;
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat data kinerja");
      setData(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchKinerja,
  };
};
