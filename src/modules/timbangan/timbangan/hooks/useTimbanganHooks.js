import { useState, useCallback, useEffect, useRef } from "react";
import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { timbanganService } from "../services/TimbanganService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { offlineService } from "@/shared/services/offlineService";
import useAuthStore from "@/modules/auth/store/authStore";
import { showToast } from "@/shared/utils/toast";
import debounce from "lodash/debounce";

const UNITS_CACHE_KEY = "timbangan:units:dump_truck";
const UNITS_CACHE_TTL = 24 * 60 * 60 * 1000;

export const useTimbanganHooks = () => {
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState({
    hull_no: "",
    gross_weight: "",
    tare_weight: "",
    net_weight: "",
    unit_dump_truck: null,
    bypass_tonnage: "",
    company: "",
    spph: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [isUnitsLoading, setIsUnitsLoading] = useState(false);
  const [lastSubmittedData, setLastSubmittedData] = useState(null);

  const loadUnits = useCallback(async ({ forceRefresh = false } = {}) => {
    setIsUnitsLoading(true);
    try {
      if (!forceRefresh) {
        const cached = await offlineService.getCache(UNITS_CACHE_KEY);
        if (cached) {
          setAvailableUnits(cached);
          return;
        }
      } else {
        await offlineService.clearCache(UNITS_CACHE_KEY);
      }

      const result = await masterDataService.fetchUnits({ type: "DUMP_TRUCK" });
      const units = Array.isArray(result) ? result : result?.data || [];

      await offlineService.setCache(UNITS_CACHE_KEY, units, UNITS_CACHE_TTL);

      setAvailableUnits(units);
    } catch (error) {
      console.error("Failed to load dump trucks:", error);

      try {
        const staleData = await offlineService.getCache(UNITS_CACHE_KEY, true);
        if (staleData) {
          setAvailableUnits(staleData);
          console.warn("⚠️ Using stale units cache (offline fallback)");
        }
      } catch {
      }
    } finally {
      setIsUnitsLoading(false);
    }
  }, []);

  const refreshUnits = useCallback(async () => {
    await loadUnits({ forceRefresh: true });
    showToast.success("Data unit dump truck berhasil diperbarui");
  }, [loadUnits]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const handleHullNoChange = useCallback(
    (value) => {
      const hullNo = value;
      setFormData((prev) => ({ ...prev, hull_no: hullNo }));

      if (!hullNo) {
        setFormData((prev) => ({
          ...prev,
          unit_dump_truck: null,
          hull_no: "",
          tare_weight: "",
          bypass_tonnage: "",
          company: "",
          spph: "",
        }));
        return;
      }

      const truckData = availableUnits.find(
        (u) => u.hullNo === hullNo || u.hull_no === hullNo,
      );

      if (truckData) {
        setFormData((prev) => ({
          ...prev,
          hull_no: truckData.hullNo || truckData.hull_no,
          unit_dump_truck: truckData.id,
          tare_weight: truckData.tareWeight || truckData.tare_weight || "",
          bypass_tonnage: truckData.bypassTonnage || truckData.bypass_tonnage || "",
          company: truckData.company || "",
          spph: truckData.spph || "",
        }));
        setErrors((prev) => ({ ...prev, hull_no: null }));
      } else {
        setFormData((prev) => ({
          ...prev,
          hull_no: "",
          unit_dump_truck: null,
          tare_weight: "",
          bypass_tonnage: "",
          company: "",
          spph: "",
        }));
      }
    },
    [availableUnits],
  );

  // ─── Kalkulasi berat berdasarkan role ─────────────────────────────────────
  useEffect(() => {
    const isOperator = user?.role === "operator_jt";
    const tare = parseFloat(formData.tare_weight);

    if (isNaN(tare)) return;

    if (isOperator) {
      const gross = parseFloat(formData.gross_weight);
      if (!isNaN(gross) && gross > 0) {
        const net = gross - tare;
        const netFixed = net > 0 ? net.toFixed(2) : "0";
        if (formData.net_weight !== netFixed) {
          setFormData((prev) => ({ ...prev, net_weight: netFixed }));
        }
      } else if (formData.net_weight !== "") {
        setFormData((prev) => ({ ...prev, net_weight: "" }));
      }
    } else {
      const net = parseFloat(formData.net_weight);
      if (!isNaN(net) && net > 0) {
        const gross = net + tare;
        const grossFixed = gross > 0 ? gross.toFixed(2) : "0";
        if (formData.gross_weight !== grossFixed) {
          setFormData((prev) => ({ ...prev, gross_weight: grossFixed }));
        }
      } else if (formData.gross_weight !== "") {
        setFormData((prev) => ({ ...prev, gross_weight: "" }));
      }
    }
  }, [
    formData.gross_weight,
    formData.tare_weight,
    formData.net_weight,
    user?.role,
  ]);

  // ─── Validasi ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    const isOperator = user?.role === "operator_jt";

    if (!formData.hull_no) newErrors.hull_no = "Nomor lambung harus diisi";
    if (!formData.unit_dump_truck)
      newErrors.hull_no = "Unit tidak ditemukan di database";

    if (!formData.tare_weight || parseFloat(formData.tare_weight) < 0) {
      newErrors.tare_weight = "Berat tare tidak valid (Cek Master Unit)";
    }

    if (isOperator) {
      if (!formData.gross_weight || parseFloat(formData.gross_weight) <= 0) {
        newErrors.gross_weight = "Berat kotor harus lebih dari 0";
      }
    } else {
      if (!formData.net_weight || parseFloat(formData.net_weight) <= 0) {
        newErrors.net_weight = "Berat bersih harus lebih dari 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBypassForm = () => {
    const newErrors = {};

    if (!formData.hull_no) newErrors.hull_no = "Nomor lambung harus diisi";
    if (!formData.unit_dump_truck)
      newErrors.hull_no = "Unit tidak ditemukan di database";

    if (!formData.bypass_tonnage || parseFloat(formData.bypass_tonnage) <= 0) {
      newErrors.hull_no = "Bypass tonnage tidak valid (Cek Master Unit)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const processSubmit = async (currentFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        id: parseInt(currentFormData.unit_dump_truck),
        hull_no: currentFormData.hull_no,
        tare_weight: parseFloat(currentFormData.tare_weight),
        gross_weight: parseFloat(currentFormData.gross_weight),
        net_weight: parseFloat(currentFormData.net_weight),
        timestamp: new Date().toISOString(),
        bypass_tonnage: currentFormData.bypass_tonnage,
        company: currentFormData.company,
        spph: currentFormData.spph,
        createdAt: new Date().toISOString(),
        is_bypass: false,
      };

      const result = await timbanganService.createTimbangan(payload);

      if (result?.offline || result?.queued) {
        showToast.warning("📦 Offline: Data disimpan, akan dikirim saat online");
      } else {
        showToast.success("Data berhasil disimpan dan karcis akan dicetak");
      }

      setLastSubmittedData(payload);
      setTimeout(() => resetForm(), 500);
    } catch (error) {
      showToast.error(error.response?.data?.message || "Gagal menyimpan data");
      console.error("❌ Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const processBypassSubmit = async (currentFormData) => {
    setIsSubmitting(true);
    try {
      const bypassTonnage = parseFloat(currentFormData.bypass_tonnage);

      const payload = {
        id: parseInt(currentFormData.unit_dump_truck),
        hull_no: currentFormData.hull_no,
        tare_weight: 0,
        gross_weight: bypassTonnage,
        net_weight: bypassTonnage,
        timestamp: new Date().toISOString(),
        bypass_tonnage: currentFormData.bypass_tonnage,
        company: currentFormData.company,
        spph: currentFormData.spph,
        createdAt: new Date().toISOString(),
      };

      const result = await timbanganService.createTimbangan(payload);

      if (result.queued || result.status) {
        showToast.success("Data bypass berhasil disimpan dan karcis akan dicetak");
        setLastSubmittedData(payload);
        setTimeout(() => resetForm(), 500);
      } else {
        throw new Error(result.error || "Gagal menyimpan data bypass");
      }
    } catch (error) {
      showToast.error(error.response?.data?.message || "Gagal menyimpan data bypass");
      console.error("❌ Bypass submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const debouncedProcessSubmit = useCallback(
    debounce((data) => processSubmit(data), 500),
    [],
  );

  const debouncedProcessBypassSubmit = useCallback(
    debounce((data) => processBypassSubmit(data), 500),
    [],
  );

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!validateForm()) return;
    debouncedProcessSubmit(formData);
  };

  const handleBypassSubmit = (e) => {
    e?.preventDefault();
    if (!validateBypassForm()) return;
    debouncedProcessBypassSubmit(formData);
  };

  const resetForm = () => {
    setFormData({
      hull_no: "",
      gross_weight: "",
      tare_weight: "",
      net_weight: "",
      unit_dump_truck: null,
      bypass_tonnage: "",
      company: "",
      spph: "",
    });
    setErrors({});
  };

  const clearLastSubmittedData = () => {
    setLastSubmittedData(null);
  };

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    availableUnits,
    isUnitsLoading,   
    refreshUnits,     
    handleHullNoChange,
    handleSubmit,
    handleBypassSubmit,
    resetForm,
    lastSubmittedData,
    clearLastSubmittedData,
  };
};