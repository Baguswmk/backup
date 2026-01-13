import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { timbanganServices } from "@/modules/timbangan/timbangan/services/timbanganServices";
import { showToast } from "@/shared/utils/toast";
import { withErrorHandling } from "@/shared/utils/errorHandler";
import { getFirstTruthyValue } from "@/shared/utils/object";
import useAuthStore from "@/modules/auth/store/authStore";
import { format } from "path";

const DEFAULT_FORM_VALUES = {
  hull_no: "",
  grosss_weight: "",
  dumptruck: "",
  operator: "",
  setting_fleet_id: "",
  createdAt: new Date().toISOString(),
};

const normalizeHull = (val = "") =>
  val.toString().replace(/\s+/g, "").toUpperCase();

const CREATE_VALIDATION_RULES = {
  hull_no: {
    required: true,
    message: "Nomor lambung wajib diisi",
    errorMessage: "Masukkan nomor lambung yang valid",
  },
  grosss_weight: {
    required: true,
    message: "Gross weight wajib diisi",
    validate: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0 && num <= 9999.99;
    },
    errorMessage: "Gross weight harus antara 0-9999.99 ton (max 4 digit)",
  },
  setting_fleet_id: {
    required: true,
    message: "Fleet wajib dipilih",
    errorMessage: "Pilih fleet yang valid",
  },
};

const EDIT_VALIDATION_RULES = {
  grosss_weight: {
    required: true,
    message: "Net weight wajib diisi",
    validate: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0 && num <= 9999.99;
    },
    errorMessage: "Net weight harus antara 0-9999.99 ton (max 4 digit)",
  },
  unit_dump_truck: {
    required: true,
    message: "Unit dump truck wajib dipilih",
    errorMessage: "Pilih dump truck yang valid",
  },
  unit_exca: {
    required: true,
    message: "Unit excavator wajib dipilih",
    errorMessage: "Pilih excavator yang valid",
  },
  loading_location: {
    required: true,
    message: "Loading location wajib dipilih",
    errorMessage: "Pilih loading location yang valid",
  },
  dumping_location: {
    required: true,
    message: "Dumping location wajib dipilih",
    errorMessage: "Pilih dumping location yang valid",
  },
  shift: {
    required: true,
    message: "Shift wajib dipilih",
    errorMessage: "Pilih shift yang valid",
  },
  date: {
    required: true,
    message: "Date wajib diisi",
    errorMessage: "Pilih tanggal yang valid",
  },
  coal_type: {
    required: true,
    message: "Coal type wajib dipilih",
    errorMessage: "Pilih coal type yang valid",
  },
  pic_work_unit: {
    required: true,
    message: "Work unit wajib dipilih",
    errorMessage: "Pilih work unit yang valid",
  },
  distance: {
    required: true,
    message: "Distance wajib diisi",
    validate: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    },
    errorMessage: "Distance harus berupa angka valid",
  },
};

const findLabelInMasterData = (
  storedValue,
  masterArray,
  possibleFields = []
) => {
  if (!storedValue || !masterArray || masterArray.length === 0)
    return storedValue || "";

  // Try direct field match first
  for (const field of possibleFields) {
    const found = masterArray.find((item) => item[field] === storedValue);
    if (found) {
      return storedValue;
    }
  }

  // Try numeric ID match
  const numericId = parseInt(storedValue);
  if (!isNaN(numericId)) {
    const foundById = masterArray.find(
      (item) => item.id === numericId.toString()
    );
    if (foundById) {
      // ✅ Use getFirstTruthyValue utility
      return getFirstTruthyValue(foundById, ...possibleFields);
    }
  }

  console.warn(
    `⚠️ Could not find label for "${storedValue}", using stored value`
  );
  return storedValue;
};

const createInitialFormData = (editingItem, mode, masters = null) => {
  if (editingItem && mode === "edit" && masters) {
    return {
      ...DEFAULT_FORM_VALUES,
      grosss_weight: editingItem.grosss_weight || "",

      unit_dump_truck: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "unit_dump_truck", "dumptruck", "hull_no"),
        masters.dumpTruck,
        ["hull_no", "hullNo", "name"]
      ),
      unit_exca: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "unit_exca", "excavator", "fleet_excavator"),
        masters.excavators,
        ["hull_no", "name"]
      ),
      loading_location: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "loading_location", "fleet_loading"),
        masters.loadingLocations,
        ["name"]
      ),
      dumping_location: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "dumping_location", "fleet_dumping"),
        masters.dumpingLocations,
        ["name"]
      ),
      pic_work_unit: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "pic_work_unit", "work_unit", "fleet_work_unit"),
        masters.workUnits,
        ["subsatker", "satker", "name"]
      ),
      coal_type: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "coal_type", "fleet_coal_type"),
        masters.coalTypes,
        ["name"]
      ),
      shift: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "shift", "fleet_shift"),
        masters.shifts,
        ["name", "id"]
      ),
      operator: getFirstTruthyValue(editingItem, "operator", "operatorName"),
      date: getFirstTruthyValue(editingItem, "date", "fleet_date"),
      distance: editingItem.distance?.toString() || "0",
      createdAt: getFirstTruthyValue(
        editingItem, 
        "createdAt", 
        "clientCreatedAt"
      ) || new Date().toISOString(),
    };
  }

  return {
    ...DEFAULT_FORM_VALUES,
    createdAt: new Date().toISOString(),
  };
};

export const useTimbanganForm = (
  editingItem = null,
  mode = "create",
  masters = null
) => {
  const { user } = useAuthStore();

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  
  const findByHullNo = useTimbanganStore((s) => s.findByHullNo);
  const findByRFID = useTimbanganStore((s) => s.findByRFID);
  const dtIndex = useTimbanganStore((s) => s.dtIndex);
  const addTimbanganEntry = useTimbanganStore((s) => s.addTimbanganEntry);
  const updateTimbanganEntry = useTimbanganStore((s) => s.updateTimbanganEntry);
  const deleteTimbanganEntry = useTimbanganStore((s) => s.deleteTimbanganEntry);
  const hideDumptruck = useTimbanganStore((s) => s.hideDumptruck);
  const unhideDumptruck = useTimbanganStore((s) => s.unhideDumptruck);

  const [formData, setFormData] = useState(() =>
    createInitialFormData(editingItem, mode, masters)
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFleet, setCurrentFleet] = useState(null);

  const editingItemRef = useRef(editingItem);
  const modeRef = useRef(mode);
  const mastersRef = useRef(masters);

  const validationRules = useMemo(() => {
    if (mode === "edit") {
      return EDIT_VALIDATION_RULES;
    } else if (mode === "delete") {
      return {};
    } else {
      return CREATE_VALIDATION_RULES;
    }
  }, [mode]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const itemChanged = editingItemRef.current !== editingItem;
    const modeChanged = modeRef.current !== mode;
    const mastersChanged = mastersRef.current !== masters;

    if (!itemChanged && !modeChanged && !mastersChanged) {
      return;
    }

    editingItemRef.current = editingItem;
    modeRef.current = mode;
    mastersRef.current = masters;

    const newFormData = createInitialFormData(editingItem, mode, masters);

    setFormData(newFormData);
    setErrors({});
    setTouched({});
    setCurrentFleet(null);

    if (mode === "create" && editingItem && editingItem.hull_no) {
      const rfid = editingItem.rfid;
      const match = findByRFID(rfid, true);

      if (match && match.dumptruckId && match.setting_fleet_id) {
        setCurrentFleet({
          id: match.setting_fleet_id,
          name: match.fleet_name,
          excavator: match.excavator,
          excavatorId: match.excavatorId,
          shift: match.shift,
          date: match.date,
          loadingLocation: match.loading_location,
          loadingLocationId: match.loadingLocationId,
          dumpingLocation: match.dumping_location,
          dumpingLocationId: match.dumpingLocationId,
          hull_no: match.hull_no,
          operator: match.operator_name || editingItem.operatorName || "-",
          operatorId: match.operator_id || editingItem.operatorId,
          checker: match.checker_name || editingItem.checker || "-",
          checkerId: match.checkerId,
          inspector: match.inspector_name || editingItem.inspector || "-",
          inspectorId: match.inspectorId,
          workUnit: match.work_unit || editingItem.work_unit || "-",
          workUnitId: match.workUnitId,
          coalType: match.coal_type || editingItem.coal_type || "-",
          coalTypeId: match.coalTypeId,
          distance: match.distance || editingItem.distance || 0,
          setting_dump_truck_id: match.setting_dump_truck_id,
        });
      }


    }
  }, [editingItem, mode, masters, findByRFID]);

  
  useEffect(() => {
    if (mode !== "create") return;
    if (!formData.hull_no) return;

    
    if (!currentFleet || !formData.setting_fleet_id) {
      const rfid = formData.rfid;
      const match = findByRFID(rfid, false);

      if (match && match.dumptruckId && match.setting_fleet_id) {
        setFormData((prev) => ({
          ...prev,
          dumptruck: match.dumptruckId,
          operator: match.operator_id || "",
          setting_fleet_id: match.setting_fleet_id,
        }));

        setCurrentFleet({
          id: match.setting_fleet_id,
          name: match.fleet_name,
          excavator: match.excavator,
          excavatorId: match.excavatorId,
          shift: match.shift,
          date: match.date,
          loadingLocation: match.loading_location,
          loadingLocationId: match.loadingLocationId,
          dumpingLocation: match.dumping_location,
          dumpingLocationId: match.dumpingLocationId,
          hull_no: match.hull_no,
          operator: match.operator_name || "-",
          operatorId: match.operator_id,
          checker: match.checker_name || "-",
          checkerId: match.checkerId,
          inspector: match.inspector_name || "-",
          inspectorId: match.inspectorId,
          workUnit: match.work_unit || "-",
          workUnitId: match.workUnitId,
          coalType: match.coal_type || "-",
          coalTypeId: match.coalTypeId,
          distance: match.distance || 0,
          setting_dump_truck_id: match.setting_dump_truck_id,
        });

        showToast.success(`✅ Fleet data loaded: ${match.fleet_name}`);
      }
    }
  }, [dtIndex, mode]); 

  const validateField = useCallback(
    (fieldName, value) => {
      const rule = validationRules[fieldName];
      if (!rule) return null;

      if (rule.required && (!value || value.toString().trim() === "")) {
        return rule.message;
      }

      if (value && rule.validate && !rule.validate(value)) {
        return rule.errorMessage || rule.message;
      }

      return null;
    },
    [validationRules]
  );

  const validateAllFields = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    // Validate based on mode
    if (mode === "create") {
      if (!formData.hull_no?.trim()) {
        newErrors.hull_no = "Nomor lambung wajib diisi";
        isValid = false;
      }
      
      if (!formData.grosss_weight) {
        newErrors.grosss_weight = "Net weight wajib diisi";
        isValid = false;
      }

      if (formData.hull_no && !formData.setting_fleet_id) {
        newErrors.hull_no = "Nomor lambung tidak ditemukan di fleet yang dipilih";
        isValid = false;
      }
    } else if (mode === "edit") {
      // Edit mode validations
      if (!formData.grosss_weight) {
        newErrors.grosss_weight = "Net weight wajib diisi";
        isValid = false;
      }
    }

    return { isValid, errors: newErrors };
  }, [formData, mode]);

  const handleRFIDChange = useCallback(
    (rfidValue) => {
      setFormData((prev) => ({
        ...prev,
        rfid: rfidValue,
      }));

      if (!rfidValue || rfidValue.trim() === "") {
        setFormData((prev) => ({
          ...prev,
          hull_no: "",
          setting_fleet_id: "",
          dumptruck: "",
          operator: "",
        }));
        setCurrentFleet(null);
        return;
      }

      const match = findByRFID(rfidValue, false);

      if (match && match.dumptruckId && match.setting_fleet_id) {
        setFormData((prev) => ({
          ...prev,
          hull_no: match.hull_no,
          dumptruck: match.dumptruckId,
          operator: match.operator_id || "",
          setting_fleet_id: match.setting_fleet_id,
        }));

        setCurrentFleet({
          id: match.setting_fleet_id,
          name: match.fleet_name,
          excavator: match.excavator,
          excavatorId: match.excavatorId,
          shift: match.shift,
          date: match.date,
          loadingLocation: match.loading_location,
          loadingLocationId: match.loadingLocationId,
          dumpingLocation: match.dumping_location,
          dumpingLocationId: match.dumpingLocationId,
          hull_no: match.hull_no,
          operator: match.operator_name || "-",
          operatorId: match.operator_id,
          checker: match.checker_name || "-",
          checkerId: match.checkerId,
          inspector: match.inspector_name || "-",
          inspectorId: match.inspectorId,
          workUnit: match.work_unit || "-",
          workUnitId: match.workUnitId,
          coalType: match.coal_type || "-",
          coalTypeId: match.coalTypeId,
          distance: match.distance || 0,
          setting_dump_truck_id: match.setting_dump_truck_id,
        });

        setErrors((prev) => {
          const { rfid: _, hull_no: __, ...rest } = prev;
          return rest;
        });

        showToast.success(`✅ Auto-filled: ${match.hull_no} - ${match.fleet_name}`);
      } else {
        console.warn("⚠️ RFID not found in dtIndex:", rfidValue);
        setCurrentFleet(null);
        setFormData((prev) => ({
          ...prev,
          hull_no: "",
          setting_fleet_id: "",
          dumptruck: "",
          operator: "",
        }));
        setErrors((prev) => ({
          ...prev,
          rfid: "RFID tidak ditemukan di fleet aktif. Pastikan kartu RFID sudah terdaftar.",
        }));
      }
    },
    [findByRFID, dtIndex]
  );

  const updateField = useCallback(
    (fieldName, value) => {
      // ✅ Special handling for RFID field
      if (fieldName === "rfid" && mode === "create") {
        handleRFIDChange(value);
        setTouched((prev) => ({ ...prev, rfid: true }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));

      setErrors((prev) => {
        if (prev[fieldName]) {
          const { [fieldName]: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });

      setTouched((prev) => ({ ...prev, [fieldName]: true }));
    },
    [handleRFIDChange, mode]
  );

  const handleFieldBlur = useCallback(
    (fieldName) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }));

      const error = validateField(fieldName, formData[fieldName]);

      setErrors((prev) => {
        if (error) {
          return { ...prev, [fieldName]: error };
        } else {
          const { [fieldName]: _, ...rest } = prev;
          return rest;
        }
      });
    },
    [formData, validateField]
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      console.warn("⚠️ Already submitting, blocking duplicate call");
      return { success: false, error: "Submission in progress" };
    }

    if (!isMountedRef.current) {
      console.warn("⚠️ Component not mounted at submission start");
      return { success: false, error: "Component not mounted" };
    }

    setIsSubmitting(true);

    // Validate first
    const { isValid, errors: validationErrors } = validateAllFields();
    if (!isValid) {
      setErrors(validationErrors);
      showToast.error("Mohon perbaiki kesalahan pada form");
      setIsSubmitting(false);
      return { success: false, error: "Validation failed" };
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // ✅ Use withErrorHandling for all submission modes
    if (mode === "edit" && editingItem) {
      return await withErrorHandling(
        async () => {
          const submissionData = {
            grosss_weight: parseFloat(formData.grosss_weight),
            unit_dump_truck: formData.unit_dump_truck,
            unit_exca: formData.unit_exca,
            loading_location: formData.loading_location,
            dumping_location: formData.dumping_location,
            shift: formData.shift,
            date: formData.date,
            distance: parseFloat(formData.distance),
            coal_type: formData.coal_type,
            pic_work_unit: formData.pic_work_unit,
            updated_by_user: user?.id || null,
          };

          if (formData.operator) {
            submissionData.operator = formData.operator;
          }

          const result = await timbanganServices.editTimbanganForm(
            submissionData,
            editingItem.id,
            { signal }
          );

          if (!isMountedRef.current) {
            throw new Error("Component unmounted during request");
          }

          // Update store
          const updateTimbanganEntry = useTimbanganStore.getState().updateTimbanganEntry;
          updateTimbanganEntry(editingItem.id, result.data);

          return { success: true, data: result.data };
        },
        {
          operation: "update timbangan",
          showSuccessToast: true,
          successMessage: "Data berhasil diperbarui",
          onError: (err) => setErrors({ submit: err.message })
        }
      ).finally(() => {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      });
    } else if (mode === "delete" && editingItem) {
      return await withErrorHandling(
        async () => {
          await timbanganServices.deleteTimbanganEntry(editingItem.id, { signal });

          if (!isMountedRef.current) {
            throw new Error("Component unmounted during request");
          }

          const { deleteTimbanganEntry, unhideDumptruck } = useTimbanganStore.getState();
          deleteTimbanganEntry(editingItem.id);
          
          if (editingItem.hull_no) {
            unhideDumptruck(editingItem.hull_no);
          }

          return { success: true };
        },
        {
          operation: "delete timbangan",
          showSuccessToast: true,
          successMessage: "Data berhasil dihapus",
        }
      ).finally(() => {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      });
    } else {
      // Create mode
      if (!currentFleet) {
        showToast.error("Data fleet tidak lengkap");
        setIsSubmitting(false);
        return { success: false, error: "Fleet data missing" };
      }

      return await withErrorHandling(
        async () => {
          const submissionData = {
            setting_fleet: parseInt(formData.setting_fleet_id),
            unit_dump_truck: parseInt(formData.dumptruck),
            operator: formData.operator ? parseInt(formData.operator) : null,
            grosss_weight: parseFloat(formData.grosss_weight),
            clientCreatedAt: formData.createdAt || new Date().toISOString(),
            created_by_user: user?.id || null,
          };

          const result = await timbanganServices.submitTimbanganForm(submissionData, { signal });

          if (!isMountedRef.current) {
            throw new Error("Component unmounted during request");
          }

          const { addTimbanganEntry, hideDumptruck } = useTimbanganStore.getState();
          addTimbanganEntry(result.data);
          hideDumptruck(editingItem?.hull_no || formData.hull_no);

          return { success: true, data: result.data };
        },
        {
          operation: "create timbangan",
          showSuccessToast: true,
          successMessage: "Data berhasil disimpan",
        }
      ).finally(() => {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      });
    }
  }, [
    isSubmitting,
    mode,
    editingItem,
    formData,
    currentFleet,
    user,
    validateAllFields,
  ]);

  const resetForm = useCallback(() => {
    const resetData = createInitialFormData(null, "create", masters);
    setFormData(resetData);
    setErrors({});
    setTouched({});
    setCurrentFleet(null);
    showToast.info("Form direset ke nilai default");
  }, [masters]);

  const displayErrors = useMemo(() => {
    const filteredErrors = {};
    Object.keys(errors).forEach((key) => {
      if (touched[key] && errors[key]) {
        filteredErrors[key] = errors[key];
      }
    });
    return filteredErrors;
  }, [errors, touched]);

  const isValid = useMemo(() => {
    const { isValid } = validateAllFields();
    return isValid;
  }, [validateAllFields]);

  const hasUnsavedChanges = useMemo(() => {
    if (mode === "edit" && editingItem) {
      const original = formData._original;
      if (!original) return false;

      const hasChanges =
        parseFloat(formData.grosss_weight) !== parseFloat(original.grosss_weight) ||
        formData.unit_dump_truck !== original.unit_dump_truck ||
        formData.unit_exca !== original.unit_exca ||
        formData.loading_location !== original.loading_location ||
        formData.dumping_location !== original.dumping_location ||
        formData.shift !== original.shift ||
        formData.date !== original.date ||
        parseFloat(formData.distance) !== parseFloat(original.distance) ||
        formData.coal_type !== original.coal_type ||
        formData.pic_work_unit !== original.pic_work_unit ||
        formData.operator !== original.operator;

      return hasChanges;
    }

    const defaultData = createInitialFormData(null, "create", masters);
    return JSON.stringify(formData) !== JSON.stringify(defaultData);
  }, [formData, mode, editingItem, masters]);

  const formSummary = useMemo(() => {
    if (mode === "edit") {
      return {
        grosss_weight: formData.grosss_weight ? `${formData.grosss_weight} ton` : "-",
        isEditMode: true,
      };
    }

    return {
      hull_no: formData.hull_no || "-",
      grosss_weight: formData.grosss_weight ? `${formData.grosss_weight} ton` : "-",
      isAutoFilled: !!formData.setting_fleet_id && !!currentFleet,
      fleetInfo: currentFleet,
    };
  }, [formData, currentFleet, mode]);

  return {
    formData,
    errors,
    touched,
    isValid,
    isSubmitting,
    hasUnsavedChanges,
    formSummary,
    currentFleet,
    updateField,
    validateField: handleFieldBlur,
    handleSubmit,
    resetForm,
    mode,
    isEditMode: mode === "edit",
    isCreateMode: mode === "create",
    isDeleteMode: mode === "delete",
  };
};
