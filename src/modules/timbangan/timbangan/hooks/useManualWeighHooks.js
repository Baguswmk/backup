import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { manualWeighService } from "../services/manualWeighService";
import useAuthStore from "@/modules/auth/store/authStore";
import { showToast } from "@/shared/utils/toast";

export const useManualWeighHooks = () => {
  const user = useAuthStore((state) => state.user);

  // Master data
  const [masters, setMasters] = useState({
    excavators: [],
    locations: [],
    loadingLocations: [],
    dumpingLocations: [],
    coalTypes: [],
    workUnits: [],
    companies: [],
  });
  const [mastersLoading, setMastersLoading] = useState(false);

  // Form data — unit_dump_truck & operator are free-text
  const [formData, setFormData] = useState({
    unit_dump_truck: "",
    excavator: "",
    loading_location: "",
    dumping_location: "",
    distance: "",
    coal_type: "",
    operator: "",
    gross_weight: "",
    tare_weight: "",
    measurement_type: "Timbangan",
    spph: "Retail",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Weigh list (all records)
  const [weighList, setWeighList] = useState([]);
  const [isListLoading, setIsListLoading] = useState(false);

  // Inline tare editing from pending list
  const [editingId, setEditingId] = useState(null);
  const [editTareWeight, setEditTareWeight] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Prevent double submit — same pattern as useTimbanganHooks
  const lastSubmitTimeRef = useRef(0);
  const submitTimerRef = useRef(null);

  // ─── Load all master data ────────────────────────────────────────────
  const loadMasters = useCallback(async (options = {}) => {
    const { forceRefresh = false } = options;
    setMastersLoading(true);
    try {
      const allMasters = await masterDataService.fetchAllMasters({
        forceRefresh,
        userRole: user?.role,
        userCompanyId: user?.company?.id,
      });

      setMasters({
        excavators: allMasters.excavators || [],
        locations: allMasters.locations || [],
        loadingLocations: (allMasters.locations || []).filter(
          (l) => l.type === "LOADING",
        ),
        dumpingLocations: (allMasters.locations || []).filter(
          (l) => l.type === "DUMPING",
        ),
        coalTypes: allMasters.coalTypes || [],
        workUnits: allMasters.workUnits || [],
        companies: allMasters.companies || [],
      });
    } catch (error) {
      console.error("Failed to load masters:", error);
      showToast.error("Gagal memuat data master");
    } finally {
      setMastersLoading(false);
    }
  }, [user?.role, user?.company?.id]);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  // ─── Dropdown options (memoized) ──────────────────────────────────────
  const excavatorOptions = useMemo(
    () =>
      masters.excavators.map((e) => ({
        value: String(e.hull_no),
        label: e.hull_no || e.hullNo || e.name || `EX #${e.id}`,
      })),
    [masters.excavators],
  );

  const loadingLocationOptions = useMemo(
    () =>
      masters.loadingLocations.map((l) => ({
        value: l.name,
        label: l.name,
      })),
    [masters.loadingLocations],
  );

  const dumpingLocationOptions = useMemo(
    () =>
      masters.dumpingLocations.map((l) => ({
        value: l.name,
        label: l.name,
      })),
    [masters.dumpingLocations],
  );

  const coalTypeOptions = useMemo(
    () =>
      masters.coalTypes.map((c) => ({
        value: c.name,
        label: c.name,
      })),
    [masters.coalTypes],
  );

  const measurementTypeOptions = useMemo(
    () => [
      { value: "Timbangan", label: "Timbangan" },
      { value: "Bypass", label: "Bypass" },
      { value: "Beltscale", label: "Beltscale" },
    ],
    [],
  );

  // ─── Reset form ──────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormData({
      unit_dump_truck: "",
      excavator: "",
      loading_location: "",
      dumping_location: "",
      distance: "",
      coal_type: "",
      operator: "",
      gross_weight: "",
      tare_weight: "",
      measurement_type: "Timbangan",
      spph: "Retail",
    });
    setErrors({});
  }, []);

  // ─── Load all weighs ──────────────────────────────────────────────────
  const loadWeighList = useCallback(async () => {
    setIsListLoading(true);
    try {
      const result = await manualWeighService.getAllWeighs();
      const data = result?.data || result || [];
      setWeighList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load weigh list:", error);
      showToast.error("Gagal memuat data timbangan retail");
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeighList();
  }, [loadWeighList]);

  // ─── Validate form ────────────────────────────────────────────────────
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.unit_dump_truck.trim())
      newErrors.unit_dump_truck = "Nomor polisi / hull no harus diisi";
    if (!formData.excavator)
      newErrors.excavator = "Excavator harus dipilih";
    if (!formData.loading_location)
      newErrors.loading_location = "Loading location harus dipilih";
    if (!formData.dumping_location)
      newErrors.dumping_location = "Dumping location harus dipilih";
    if (!formData.coal_type)
      newErrors.coal_type = "Jenis batubara harus dipilih";
    if (!formData.operator.trim())
      newErrors.operator = "Operator harus diisi";
    if (
      !formData.distance ||
      isNaN(parseFloat(formData.distance)) ||
      parseFloat(formData.distance) <= 0
    )
      newErrors.distance = "Jarak harus diisi";
    if (
      !formData.gross_weight ||
      isNaN(parseFloat(formData.gross_weight)) ||
      parseFloat(formData.gross_weight) <= 0
    )
      newErrors.gross_weight = "Berat kotor harus lebih dari 0";

    // Validate tare_weight if provided
    if (formData.tare_weight) {
      const tare = parseFloat(formData.tare_weight);
      const gross = parseFloat(formData.gross_weight);
      if (isNaN(tare) || tare <= 0)
        newErrors.tare_weight = "Berat kosong harus lebih dari 0";
      else if (!isNaN(gross) && tare >= gross)
        newErrors.tare_weight =
          "Berat kosong harus lebih kecil dari berat kotor";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ─── Process submit (actual API call) ──────────────────────────────
  const processSubmit = useCallback(
    async (currentFormData) => {
      setIsSubmitting(true);

      try {
        const payload = {
          unit_dump_truck: currentFormData.unit_dump_truck.trim().toUpperCase(),
          unit_exca: currentFormData.excavator,
          loading_location: currentFormData.loading_location,
          dumping_location: currentFormData.dumping_location,
          distance: parseFloat(currentFormData.distance),
          coal_type: currentFormData.coal_type,
          operator: currentFormData.operator.trim(),
          gross_weight: parseFloat(currentFormData.gross_weight),
          measurement_type: currentFormData.measurement_type,
          spph: "Retail",
        };

        if (currentFormData.tare_weight) {
          payload.tare_weight = parseFloat(currentFormData.tare_weight);
        }

        const result = await manualWeighService.createGrossWeigh(payload);

        if (result?.offline || result?.queued) {
          showToast.warning("Offline: Data disimpan, akan dikirim saat online");
        } else if (currentFormData.tare_weight) {
          showToast.success("Data timbangan berhasil disimpan (lengkap)");
        } else {
          showToast.success("Berat kotor berhasil disimpan");
        }

        resetForm();
        loadWeighList();
      } catch (error) {
        const msg =
          error.response?.data?.message || "Gagal menyimpan data timbangan";
        showToast.error(msg);
        console.error("Manual weigh submit error:", error);
      } finally {
        setIsSubmitting(false);
        window.dispatchEvent(new Event("timbangan:queueUpdated"));
      }
    },
    [resetForm, loadWeighList],
  );

  // ─── Submit handler (same pattern as useTimbanganHooks) ───────────────
  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();

      const now = Date.now();
      if (now - lastSubmitTimeRef.current < 5000) return;
      if (isSubmitting) return;
      if (!validateForm()) return;

      lastSubmitTimeRef.current = now;

      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      submitTimerRef.current = setTimeout(() => {
        processSubmit(formData);
      }, 300);
    },
    [formData, isSubmitting, validateForm, processSubmit],
  );

  // ─── Inline tare editing from pending list ────────────────────────────
  const startEditTare = useCallback((item) => {
    setEditingId(item.id);
    setEditTareWeight("");
  }, []);

  const cancelEditTare = useCallback(() => {
    setEditingId(null);
    setEditTareWeight("");
  }, []);

  const handleTareSubmit = useCallback(
    async (pendingItem) => {
      if (isUpdating) return;

      const tare = parseFloat(editTareWeight);
      if (!editTareWeight || isNaN(tare) || tare <= 0) {
        showToast.error("Berat kosong harus lebih dari 0");
        return;
      }

      const gross = parseFloat(pendingItem.gross_weight);
      if (tare >= gross) {
        showToast.error("Berat kosong harus lebih kecil dari berat kotor");
        return;
      }

      setIsUpdating(true);

      try {
        await manualWeighService.updateTareWeigh(pendingItem.id, {
          tare_weight: tare,
        });

        const net = (gross - tare).toFixed(2);
        showToast.success(`Berat kosong disimpan. Netto: ${net} ton`);

        setEditingId(null);
        setEditTareWeight("");
        loadWeighList();
      } catch (error) {
        const msg =
          error.response?.data?.message || "Gagal menyimpan berat kosong";
        showToast.error(msg);
        console.error("Manual weigh tare submit error:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [editTareWeight, isUpdating, loadWeighList],
  );

  return {
    // Masters
    masters,
    mastersLoading,
    loadMasters,
    // Dropdown options
    excavatorOptions,
    loadingLocationOptions,
    dumpingLocationOptions,
    coalTypeOptions,
    measurementTypeOptions,
    // Form
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    handleSubmit,
    resetForm,
    // Weigh list
    weighList,
    isListLoading,
    loadWeighList,
    // Tare editing
    editingId,
    editTareWeight,
    setEditTareWeight,
    isUpdating,
    startEditTare,
    cancelEditTare,
    handleTareSubmit,
  };
};
