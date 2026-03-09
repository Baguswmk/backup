import { useState, useCallback, useEffect, useRef } from "react";
import { timbanganService } from "../services/TimbanganService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { offlineService } from "@/shared/services/offlineService";
import useAuthStore from "@/modules/auth/store/authStore";
import { showToast } from "@/shared/utils/toast";
import debounce from "lodash/debounce";

const UNITS_CACHE_KEY = "timbangan:units:dump_truck";
const UNITS_CACHE_TTL = 24 * 60 * 60 * 1000;

const DT_COOLDOWN_MS = 10 * 60 * 1000;

// const checkDuplicateDT = async (hullNo) => {
//   if (!hullNo) return { isDuplicate: false };

//   try {
//     const { pending, failed, sent } = await timbanganService.getAllQueues();
//     const allEntries = [...pending, ...failed, ...sent];
//     const now = Date.now();

//     const recentEntry = allEntries.find((entry) => {
//       if (entry?.data?.hull_no !== hullNo) return false;

//       const ts =
//         entry.clientTimestamp ||
//         entry.createdAtClient ||
//         entry.data?.createdAt ||
//         entry.data?.timestamp;

//       if (!ts) return false;

//       return now - new Date(ts).getTime() < DT_COOLDOWN_MS;
//     });

//     if (!recentEntry) return { isDuplicate: false };

//     const ts =
//       recentEntry.clientTimestamp ||
//       recentEntry.createdAtClient ||
//       recentEntry.data?.createdAt ||
//       recentEntry.data?.timestamp;

//     const remainingMs = DT_COOLDOWN_MS - (now - new Date(ts).getTime());
//     const totalSec = Math.ceil(remainingMs / 1000);
//     const remainingLabel =
//       totalSec >= 60
//         ? `${Math.ceil(totalSec / 60)} menit`
//         : `${totalSec} detik`;

//     return { isDuplicate: true, remainingLabel };
//   } catch (error) {
//     console.error("Gagal cek duplikat DT:", error);
//     // Fail-open: kalau pengecekan sendiri error, jangan blok user
//     return { isDuplicate: false };
//   }
// };

// ─────────────────────────────────────────────────────────────────────────────

export const useTimbanganHooks = () => {
  const user = useAuthStore((state) => state.user);
  const submitTimerRef = useRef(null);

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

  // ─── Load dump trucks: cache-first, fetch hanya jika perlu ─────────────────
  const loadUnits = useCallback(async ({ forceRefresh = false } = {}) => {
    setIsUnitsLoading(true);
    try {
      if (!forceRefresh) {
        const cached = await offlineService.getCache(UNITS_CACHE_KEY);
        if (cached) {
          setAvailableUnits(cached);
          return; // cache hit — tidak hit network sama sekali
        }
      } else {
        await offlineService.clearCache(UNITS_CACHE_KEY);
      }

      const result = await masterDataService.fetchUnits({
        type: "DUMP_TRUCK",
        forceRefresh,
      });
      const units = Array.isArray(result) ? result : result?.data || [];

      await offlineService.setCache(UNITS_CACHE_KEY, units, UNITS_CACHE_TTL);
      setAvailableUnits(units);
    } catch (error) {
      console.error("Failed to load dump trucks:", error);

      // Offline safety net: pakai cache stale daripada kosong sama sekali
      try {
        const stale = await offlineService.getCache(UNITS_CACHE_KEY, true);
        if (stale) {
          setAvailableUnits(stale);
          console.warn("Menggunakan stale units cache (offline fallback)");
        }
      } catch {
        // biarkan units tetap kosong
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

  useEffect(() => {
    const handleRefreshEvent = () => {
      loadUnits({ forceRefresh: true });
    };
    window.addEventListener("timbangan:refreshUnits", handleRefreshEvent);
    return () => {
      window.removeEventListener("timbangan:refreshUnits", handleRefreshEvent);
    };
  }, [loadUnits]);

  // ─── Filter units based on recent 10-minute submissions ──────────────────────
  const [filteredUnits, setFilteredUnits] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const updateFilteredUnits = async () => {
      try {
        const { pending, failed, sent } = await timbanganService.getAllQueues();
        const allEntries = [...pending, ...failed, ...sent];
        const now = Date.now();

        const recentHulls = new Set(
          allEntries
            .filter((entry) => {
              const ts =
                entry.clientTimestamp ||
                entry.createdAtClient ||
                entry.data?.createdAt ||
                entry.data?.timestamp;

              if (!ts) return false;
              return now - new Date(ts).getTime() < DT_COOLDOWN_MS;
            })
            .map((entry) => entry.data?.hull_no)
            .filter(Boolean),
        );

        if (isMounted) {
          setFilteredUnits(
            availableUnits.filter(
              (u) => !recentHulls.has(u.hullNo) && !recentHulls.has(u.hull_no),
            ),
          );
        }
      } catch (error) {
        console.error("Gagal memfilter unit:", error);
        if (isMounted) setFilteredUnits(availableUnits);
      }
    };

    updateFilteredUnits();

    const interval = setInterval(updateFilteredUnits, 60000);

    const handleQueueUpdate = () => {
      updateFilteredUnits();
    };
    window.addEventListener("timbangan:queueUpdated", handleQueueUpdate);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("timbangan:queueUpdated", handleQueueUpdate);
    };
  }, [availableUnits]);

  // ─── Auto-fill: Hull No -> Dumptruck ID & Tare ──────────────────────────────
  const handleHullNoChange = useCallback(
    (value) => {
      setFormData((prev) => ({ ...prev, hull_no: value }));

      if (!value) {
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
        (u) => u.hullNo === value || u.hull_no === value,
      );

      if (truckData) {
        setFormData((prev) => ({
          ...prev,
          hull_no: truckData.hullNo || truckData.hull_no,
          unit_dump_truck: truckData.id,
          tare_weight: truckData.tareWeight || truckData.tare_weight || "",
          bypass_tonnage:
            truckData.bypassTonnage || truckData.bypass_tonnage || "",
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

  // ─── Kalkulasi berat berdasarkan role ──────────────────────────────────────
  useEffect(() => {
    const isOperator = user?.role === "operator_jt";
    const tare = parseFloat(formData.tare_weight);
    if (isNaN(tare)) return;

    if (isOperator) {
      const gross = parseFloat(formData.gross_weight);
      if (!isNaN(gross) && gross > 0) {
        const net = gross - tare;
        const netFixed = net > 0 ? net.toFixed(2) : "0";
        if (formData.net_weight !== netFixed)
          setFormData((prev) => ({ ...prev, net_weight: netFixed }));
      } else if (formData.net_weight !== "") {
        setFormData((prev) => ({ ...prev, net_weight: "" }));
      }
    } else {
      const net = parseFloat(formData.net_weight);
      if (!isNaN(net) && net > 0) {
        const gross = net + tare;
        const grossFixed = gross > 0 ? gross.toFixed(2) : "0";
        if (formData.gross_weight !== grossFixed)
          setFormData((prev) => ({ ...prev, gross_weight: grossFixed }));
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

  // ─── Validasi form ─────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    const isOperator = user?.role === "operator_jt";

    if (!formData.hull_no) newErrors.hull_no = "Nomor lambung harus diisi";
    if (!formData.unit_dump_truck)
      newErrors.hull_no = "Unit tidak ditemukan di database";
    if (!formData.tare_weight || parseFloat(formData.tare_weight) < 0)
      newErrors.tare_weight = "Berat tare tidak valid (Cek Master Unit)";

    if (isOperator) {
      if (!formData.gross_weight || parseFloat(formData.gross_weight) <= 0)
        newErrors.gross_weight = "Berat kotor harus lebih dari 0";
    } else {
      if (!formData.net_weight || parseFloat(formData.net_weight) <= 0)
        newErrors.net_weight = "Berat bersih harus lebih dari 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBypassForm = () => {
    const newErrors = {};

    if (!formData.hull_no) newErrors.hull_no = "Nomor lambung harus diisi";
    if (!formData.unit_dump_truck)
      newErrors.hull_no = "Unit tidak ditemukan di database";
    if (!formData.bypass_tonnage || parseFloat(formData.bypass_tonnage) <= 0)
      newErrors.hull_no = "Bypass tonnage tidak valid (Cek Master Unit)";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit normal ─────────────────────────────────────────────────────────
  const processSubmit = async (currentFormData) => {
    setIsSubmitting(true);
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

    try {
      // const dupCheck = await checkDuplicateDT(currentFormData.hull_no);
      // if (dupCheck.isDuplicate) {
      //   showToast.error(
      //     `${currentFormData.hull_no} sudah ditimbang dalam 10 menit terakhir — tunggu ${dupCheck.remainingLabel} lagi`,
      //   );
      //   return;
      // }

      const result = await timbanganService.createTimbangan(payload);

      if (result?.offline || result?.queued) {
        showToast.warning("Offline: Data disimpan, akan dikirim saat online");
      } else {
        showToast.success("Data berhasil disimpan dan karcis akan dicetak");
      }

      setLastSubmittedData(payload);
      setTimeout(() => resetForm(), 500);
    } catch (error) {
      showToast.error(error.response?.data?.message || "Gagal menyimpan data");
      console.error("Submit error:", error);

      // ✅ Trigger print and reset even if API request failed
      setLastSubmittedData(payload);
      setTimeout(() => resetForm(), 500);
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(new Event("timbangan:queueUpdated"));
    }
  };

  // ─── Submit bypass ─────────────────────────────────────────────────────────
  const processBypassSubmit = async (currentFormData) => {
    setIsSubmitting(true);
    const payload = {
      id: parseInt(currentFormData.unit_dump_truck),
      hull_no: currentFormData.hull_no,
      timestamp: new Date().toISOString(),
    };

    try {
      // Anti-duplikat berlaku juga untuk mode bypass
      // const dupCheck = await checkDuplicateDT(currentFormData.hull_no);
      // if (dupCheck.isDuplicate) {
      //   showToast.error(
      //     `${currentFormData.hull_no} sudah ditimbang dalam 10 menit terakhir — tunggu ${dupCheck.remainingLabel} lagi`,
      //   );
      //   return;
      // }

      const result = await timbanganService.createTimbangan(payload);

      if (result.queued || result.status) {
        showToast.success(
          "Data bypass berhasil disimpan dan karcis akan dicetak",
        );
        setLastSubmittedData(payload);
        setTimeout(() => resetForm(), 500);
      } else {
        throw new Error(result.error || "Gagal menyimpan data bypass");
      }
    } catch (error) {
      showToast.error(
        error.response?.data?.message || "Gagal menyimpan data bypass",
      );
      console.error("Bypass submit error:", error);

      // ✅ Trigger print and reset even if API request failed
      setLastSubmittedData(payload);
      setTimeout(() => resetForm(), 500);
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(new Event("timbangan:queueUpdated"));
    }
  };

  const lastSubmitTimeRef = useRef(0);

  const handleSubmit = (e) => {
    e?.preventDefault();

    // Absolute lockout: prevent any clicks within 5 seconds of the last allowed click
    const now = Date.now();
    if (now - lastSubmitTimeRef.current < 5000) {
      return;
    }

    if (isSubmitting) return;
    if (!validateForm()) return;

    lastSubmitTimeRef.current = now;

    // Manual debounce pakai ref — lebih predictable dari lodash debounce + useCallback
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(() => {
      processSubmit(formData);
    }, 300);
  };

  const handleBypassSubmit = (e) => {
    e?.preventDefault();

    const now = Date.now();
    if (now - lastSubmitTimeRef.current < 5000) {
      return;
    }

    if (isSubmitting) return;
    if (!validateBypassForm()) return;

    lastSubmitTimeRef.current = now;

    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(() => {
      processBypassSubmit(formData);
    }, 300);
  };

  // Cleanup ref saat unmount
  useEffect(() => {
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

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

  const clearLastSubmittedData = () => setLastSubmittedData(null);

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    availableUnits: filteredUnits,
    rawAvailableUnits: availableUnits,
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
