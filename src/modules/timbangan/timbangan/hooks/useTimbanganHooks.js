import { useState, useCallback, useEffect, useRef } from "react";
import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { timbanganService } from "../services/TimbanganService";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import useAuthStore from "@/modules/auth/store/authStore";
import { showToast } from "@/shared/utils/toast";
import debounce from "lodash/debounce";

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
  const [lastSubmittedData, setLastSubmittedData] = useState(null); // For auto-print

  // Load all dump trucks on mount
  useEffect(() => {
    const loadUnits = async () => {
      try {
        const result = await masterDataService.fetchUnits({
          type: "DUMP_TRUCK",
        });
        const units = Array.isArray(result) ? result : result?.data || [];
        setAvailableUnits(units);
      } catch (error) {
        console.error("Failed to load dump trucks:", error);
      }
    };
    loadUnits();
  }, []);

  // Auto-fill logic: Hull No -> Dumptruck ID & Tare
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
          spph:"",
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

  // Calculate Weights based on Role (only for normal timbangan mode)
  useEffect(() => {
    const isOperator = user?.role === "operator_jt";
    const tare = parseFloat(formData.tare_weight);

    if (isNaN(tare)) return;

    if (isOperator) {
      // Role Operator: Input Gross -> Calculate Net
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
      // Role Checkpoint: Input Net -> Calculate Gross
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

  const validateForm = () => {
    const newErrors = {};
    const isOperator = user?.role === "operator_jt";

    if (!formData.hull_no) newErrors.hull_no = "Nomor lambung harus diisi";
    if (!formData.unit_dump_truck)
      newErrors.hull_no = "Unit tidak ditemukan di database";

    // Tare validation
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
      
      if (result.queued || result.status) {
        showToast.success("Data berhasil disimpan dan karcis akan dicetak");
        
        // Set data for auto-print
        setLastSubmittedData(payload);
        
        // Reset form after small delay
        setTimeout(() => {
          resetForm();
        }, 500);
      } else {
        throw new Error(result.error || "Gagal menyimpan data");
      }
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
        tare_weight: 0, // Bypass mode, no tare
        gross_weight: bypassTonnage,
        net_weight: bypassTonnage, // Net = Bypass tonnage
        timestamp: new Date().toISOString(),
        bypass_tonnage: currentFormData.bypass_tonnage,
        company: currentFormData.company,
        spph: currentFormData.spph,
        createdAt: new Date().toISOString(),
      };

      const result = await timbanganService.createTimbangan(payload);
      
      if (result.queued || result.status) {
        showToast.success("Data bypass berhasil disimpan dan karcis akan dicetak");
        
        // Set data for auto-print
        setLastSubmittedData(payload);
        
        // Reset form after small delay
        setTimeout(() => {
          resetForm();
        }, 500);
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
    debounce((data) => {
      processSubmit(data);
    }, 500),
    [],   
  );

  const debouncedProcessBypassSubmit = useCallback(
    debounce((data) => {
      processBypassSubmit(data);
    }, 500),
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
    handleHullNoChange,
    handleSubmit,
    handleBypassSubmit,
    resetForm,
    lastSubmittedData,
    clearLastSubmittedData,
  };
};