import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { ritaseServices } from "@/modules/timbangan/ritase/services/ritaseServices";
import { showToast } from "@/shared/utils/toast";
import { withErrorHandling } from "@/shared/utils/errorHandler";
import { getFirstTruthyValue } from "@/shared/utils/object";
import useAuthStore from "@/modules/auth/store/authStore";
import { logger } from "@/shared/services/log";

const DEFAULT_FORM_VALUES = {
  hull_no: "",
  gross_weight: "",
  net_weight: "",
  tare_weight: "",
  measurement_type: "",
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
  setting_fleet_id: {
    required: true,
    message: "Fleet wajib dipilih",
    errorMessage: "Pilih fleet yang valid",
  },
};

const GROSS_WEIGHT_VALIDATION = {
  gross_weight: {
    required: true,
    message: "Gross weight wajib diisi",
    validate: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0 && num <= 9999.99;
    },
    errorMessage: "Gross weight harus antara 0-9999.99 ton (max 4 digit)",
  },
};

const NET_WEIGHT_VALIDATION = {
  net_weight: {
    required: true,
    message: "Net weight wajib diisi",
    validate: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0 && num <= 9999.99;
    },
    errorMessage: "Net weight harus antara 0-9999.99 ton (max 4 digit)",
  },
};

const EDIT_VALIDATION_RULES = {
  gross_weight: {
    required: true,
    message: "Gross weight wajib diisi",
    validate: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0 && num <= 9999.99;
    },
    errorMessage: "Gross weight harus antara 0-9999.99 ton (max 4 digit)",
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
  spph:{
    required: true,
    message : "SPPH unit wajib diisi",
    errorMessage: "Masukkan SPPH dengan Valid"
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
  possibleFields = [],
) => {
  if (!storedValue || !masterArray || masterArray.length === 0)
    return storedValue || "";

  for (const field of possibleFields) {
    const found = masterArray.find((item) => item[field] === storedValue);
    if (found) {
      return storedValue;
    }
  }

  const numericId = parseInt(storedValue);
  if (!isNaN(numericId)) {
    const foundById = masterArray.find(
      (item) => item.id === numericId.toString(),
    );
    if (foundById) {
      return getFirstTruthyValue(foundById, ...possibleFields);
    }
  }

  console.warn(
    `⚠️ Could not find label for "${storedValue}", using stored value`,
  );
  return storedValue;
};

const createInitialFormData = (editingItem, mode, masters = null) => {
  if (editingItem && mode === "edit" && masters) {
    return {
      ...DEFAULT_FORM_VALUES,
      gross_weight: editingItem.gross_weight || "",
      net_weight: editingItem.net_weight || "",
      tare_weight: editingItem.tare_weight?.toString() || "",
      measurement_type: editingItem.measurement_type || "",

      unit_dump_truck: findLabelInMasterData(
        getFirstTruthyValue(
          editingItem,
          "unit_dump_truck",
          "dumptruck",
          "hull_no",
        ),
        masters.dumpTruck,
        ["hull_no", "hullNo", "name"],
      ),
      unit_exca: findLabelInMasterData(
        getFirstTruthyValue(
          editingItem,
          "unit_exca",
          "excavator",
          "fleet_excavator",
        ),
        masters.excavators,
        ["hull_no", "name"],
      ),
      loading_location: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "loading_location", "fleet_loading"),
        masters.loadingLocations,
        ["name"],
      ),
      dumping_location: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "dumping_location", "fleet_dumping"),
        masters.dumpingLocations,
        ["name"],
      ),
      pic_work_unit: findLabelInMasterData(
        getFirstTruthyValue(
          editingItem,
          "pic_work_unit",
          "work_unit",
          "fleet_work_unit",
        ),
        masters.workUnits,
        ["subsatker", "satker", "name"],
      ),
      coal_type: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "coal_type", "fleet_coal_type"),
        masters.coalTypes,
        ["name"],
      ),
      shift: findLabelInMasterData(
        getFirstTruthyValue(editingItem, "shift", "fleet_shift"),
        masters.shifts,
        ["name", "id"],
      ),
      spph: editingItem.spph,
      operator: getFirstTruthyValue(editingItem, "operator", "operatorName"),
      date: getFirstTruthyValue(editingItem, "date", "fleet_date"),
      distance: editingItem.distance?.toString() || "0",
      createdAt:
        getFirstTruthyValue(editingItem, "createdAt", "clientCreatedAt") ||
        new Date().toISOString(),
    };
  }

  return {
    ...DEFAULT_FORM_VALUES,
    createdAt: new Date().toISOString(),
  };
};

export const useRitaseForm = (
  editingItem = null,
  mode = "create",
  masters = null,
) => {
  const { user } = useAuthStore();

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  const findByHullNo = useRitaseStore((s) => s.findByHullNo);
  const dtIndex = useRitaseStore((s) => s.dtIndex);

  const [formData, setFormData] = useState(() =>
    createInitialFormData(editingItem, mode, masters),
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
      const rules = { ...CREATE_VALIDATION_RULES };

      if (currentFleet) {
        const measurementType = currentFleet.measurement_type || "Timbangan";
        const hasWeighBridge = user?.weigh_bridge != null;

        if (measurementType === "Timbangan") {
          if (hasWeighBridge) {
            Object.assign(rules, GROSS_WEIGHT_VALIDATION);
          } else {
            Object.assign(rules, NET_WEIGHT_VALIDATION);
          }
        }
      }

      return rules;
    }
  }, [mode, currentFleet, user]);
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
      const hullKey = normalizeHull(editingItem.hull_no);
      const hit = findByHullNo(hullKey, true);

      if (hit && hit.dumptruckId && hit.setting_fleet_id) {
        setCurrentFleet({
          id: hit.setting_fleet_id,
          name: hit.fleet_name,
          excavator: hit.excavator,
          excavatorId: hit.excavatorId,
          shift: hit.shift,
          spph: hit.spph,
          date: hit.date,
          loadingLocation: hit.loading_location,
          loadingLocationId: hit.loadingLocationId,
          dumpingLocation: hit.dumping_location,
          dumpingLocationId: hit.dumpingLocationId,
          hull_no: hit.hull_no,
          operator: hit.operator_name || editingItem.operatorName || "-",
          operatorId: hit.operator_id || editingItem.operatorId,
          checker: hit.checker_name || editingItem.checker || "-",
          checkerId: hit.checkerId,
          inspector: hit.inspector_name || editingItem.inspector || "-",
          inspectorId: hit.inspectorId,
          workUnit: hit.work_unit || editingItem.work_unit || "-",
          workUnitId: hit.workUnitId,
          coalType: hit.coal_type || editingItem.coal_type || "-",
          coalTypeId: hit.coalTypeId,
          distance: hit.distance || editingItem.distance || 0,
          setting_dump_truck_id: hit.setting_dump_truck_id,
          measurement_type: hit.measurement_type || "Timbangan",
        });
      }
    }
  }, [editingItem, mode, masters, findByHullNo]);

  useEffect(() => {
    if (mode !== "create") return;
    if (!formData.hull_no) return;

    if (!currentFleet || !formData.setting_fleet_id) {
      const hullKey = normalizeHull(formData.hull_no);
      const hit = findByHullNo(hullKey, false);

      if (hit && hit.dumptruckId && hit.setting_fleet_id) {
        setFormData((prev) => ({
          ...prev,
          dumptruck: hit.dumptruckId,
          operator: hit.operator_id || "",
          setting_fleet_id: hit.setting_fleet_id,
        }));

        setCurrentFleet({
          id: hit.setting_fleet_id,
          name: hit.fleet_name,
          excavator: hit.excavator,
          excavatorId: hit.excavatorId,
          shift: hit.shift,
          spph: hit.spph,
          date: hit.date,
          loadingLocation: hit.loading_location,
          loadingLocationId: hit.loadingLocationId,
          dumpingLocation: hit.dumping_location,
          dumpingLocationId: hit.dumpingLocationId,
          hull_no: hit.hull_no,
          operator: hit.operator_name || "-",
          operatorId: hit.operator_id,
          checker: hit.checker_name || "-",
          checkerId: hit.checkerId,
          inspector: hit.inspector_name || "-",
          inspectorId: hit.inspectorId,
          workUnit: hit.work_unit || "-",
          workUnitId: hit.workUnitId,
          coalType: hit.coal_type || "-",
          coalTypeId: hit.coalTypeId,
          distance: hit.distance || 0,
          setting_dump_truck_id: hit.setting_dump_truck_id,
          measurement_type: hit.measurement_type || "Timbangan",
        });

        showToast.success(`✅ Fleet data loaded: ${hit.fleet_name}`);
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
    [validationRules],
  );

  const validateAllFields = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    if (mode === "create") {
      if (!formData.hull_no?.trim()) {
        newErrors.hull_no = "Nomor lambung wajib diisi";
        isValid = false;
      }

      if (formData.hull_no && !formData.setting_fleet_id) {
        newErrors.hull_no =
          "Nomor lambung tidak ditemukan di fleet yang dipilih";
        isValid = false;
      }

      if (currentFleet) {
        const measurementType = currentFleet.measurement_type || "Timbangan";
        const hasWeighBridge = user?.weigh_bridge != null;

        if (measurementType === "Timbangan") {
          if (hasWeighBridge) {
            if (
              !formData.gross_weight ||
              parseFloat(formData.gross_weight) <= 0
            ) {
              newErrors.gross_weight =
                "Gross weight wajib diisi dan lebih dari 0";
              isValid = false;
            }
          } else {
            if (!formData.net_weight || parseFloat(formData.net_weight) <= 0) {
              newErrors.net_weight = "Net weight wajib diisi dan lebih dari 0";
              isValid = false;
            }
          }
        }
      }
    } else if (mode === "edit") {
      if (!formData.gross_weight) {
        newErrors.gross_weight = "Gross weight wajib diisi";
        isValid = false;
      }
      if (!formData.net_weight) {
        newErrors.net_weight = "Net weight wajib diisi";
        isValid = false;
      }
    }

    return { isValid, errors: newErrors };
  }, [formData, mode, currentFleet, user]);

  const handleHullNoChange = useCallback(
    (hullNoValue) => {
      setFormData((prev) => ({
        ...prev,
        hull_no: hullNoValue,
      }));

      if (!hullNoValue || hullNoValue.trim() === "") {
        setFormData((prev) => ({
          ...prev,
          setting_fleet_id: "",
          dumptruck: "",
          operator: "",
        }));
        setCurrentFleet(null);
        return;
      }

      const hullKey = normalizeHull(hullNoValue);
      const hit = findByHullNo(hullKey, false);

      if (hit && hit.dumptruckId && hit.setting_fleet_id) {
        setFormData((prev) => ({
          ...prev,
          dumptruck: hit.dumptruckId,
          operator: hit.operator_id || "",
          setting_fleet_id: hit.setting_fleet_id,
        }));

        setCurrentFleet({
          id: hit.setting_fleet_id,
          name: hit.fleet_name,
          excavator: hit.excavator,
          excavatorId: hit.excavatorId,
          shift: hit.shift,
          date: hit.date,
          loadingLocation: hit.loading_location,
          loadingLocationId: hit.loadingLocationId,
          dumpingLocation: hit.dumping_location,
          dumpingLocationId: hit.dumpingLocationId,
          hull_no: hit.hull_no,
          operator: hit.operator_name || "-",
          operatorId: hit.operator_id,
          checker: hit.checker_name || "-",
          checkerId: hit.checkerId,
          inspector: hit.inspector_name || "-",
          inspectorId: hit.inspectorId,
          workUnit: hit.work_unit || "-",
          workUnitId: hit.workUnitId,
          coalType: hit.coal_type || "-",
          coalTypeId: hit.coalTypeId,
          distance: hit.distance || 0,
          setting_dump_truck_id: hit.setting_dump_truck_id,
          measurement_type: hit.measurement_type || "Timbangan",
        });

        setErrors((prev) => {
          const { hull_no: _, ...rest } = prev;
          return rest;
        });

        showToast.success(`✅ Auto-filled: ${hullNoValue}`);
      } else {
        console.warn("⚠️ Hull number not found in dtIndex", {
          hullNoValue,
          dtIndexKeys: Object.keys(dtIndex).slice(0, 5),
        });
        setCurrentFleet(null);
        setFormData((prev) => ({
          ...prev,
          setting_fleet_id: "",
          dumptruck: "",
          operator: "",
        }));
      }
    },
    [findByHullNo, dtIndex],
  );

  const updateField = useCallback(
    (fieldName, value) => {
      if (fieldName === "hull_no" && mode === "create") {
        handleHullNoChange(value);
        setTouched((prev) => ({ ...prev, hull_no: true }));
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
    [handleHullNoChange, mode],
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
    [formData, validateField],
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

    if (mode === "edit" && editingItem) {
      return await withErrorHandling(
        async () => {
          const submissionData = {
            unit_dump_truck: formData.unit_dump_truck,
            unit_exca: formData.unit_exca,
            loading_location: formData.loading_location,
            dumping_location: formData.dumping_location,
            shift: formData.shift,
            date: formData.date,
            spph: formData.spph,
            distance: parseFloat(formData.distance),
            coal_type: formData.coal_type,
            pic_work_unit: formData.pic_work_unit,
            createdAt: formData.createdAt,
            updated_by_user: user?.id || null,
            net_weight: parseFloat(formData.net_weight),
            gross_weight: parseFloat(formData.gross_weight),
            tare_weight: parseFloat(formData.tare_weight),
            measurement_type: formData.measurement_type,
          };
          if (formData.operator) {
            submissionData.operator = formData.operator;
          }

          const result = await ritaseServices.editTimbanganForm(
            submissionData,
            editingItem.id,
            { signal },
          );

          if (!isMountedRef.current) {
            throw new Error("Component unmounted during request");
          }

          return { success: true, data: result.data };
        },
        {
          operation: "update timbangan",
          showSuccessToast: true,
          successMessage: "Data berhasil diperbarui",
          onError: (err) => setErrors({ submit: "Data Gagal diperbarui" }),
        },
      ).finally(() => {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      });
    } else if (mode === "delete" && editingItem) {
      return await withErrorHandling(
        async () => {
          await ritaseServices.deleteTimbanganEntry(editingItem.id, {
            signal,
          });

          if (!isMountedRef.current) {
            throw new Error("Component unmounted during request");
          }

          const { deleteTimbanganEntry, unhideDumptruck } =
            useRitaseStore.getState();
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
        },
      ).finally(() => {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      });
    } else {
      if (!currentFleet) {
        showToast.error("Data fleet tidak lengkap");
        setIsSubmitting(false);
        return { success: false, error: "Fleet data missing" };
      }

      return await withErrorHandling(
        async () => {
          const measurementType = currentFleet.measurement_type || "Timbangan";
          const hasWeighBridge = user?.weigh_bridge != null;

          const submissionData = {
            setting_fleet: parseInt(formData.setting_fleet_id),
            unit_dump_truck: parseInt(formData.dumptruck),
            operator: formData.operator ? parseInt(formData.operator) : null,
            clientCreatedAt: formData.createdAt || new Date().toISOString(),
            created_by_user: user?.id || null,
            measurement_type: measurementType,
            has_weigh_bridge: hasWeighBridge,
          };

          if (measurementType === "Timbangan") {
            if (hasWeighBridge) {
              submissionData.gross_weight = parseFloat(formData.gross_weight);
            } else {
              submissionData.net_weight = parseFloat(formData.net_weight);
            }
          }

          const result = await ritaseServices.submitTimbanganForm(
            submissionData,
            { signal },
          );

          if (!isMountedRef.current) {
            throw new Error("Component unmounted during request");
          }

          if (result.queued) {
            return {
              success: true,
              queued: true,
              data: null,
              shouldClose: true,
            };
          }

          if (result.success && result.data) {
            const { addTimbanganEntry, hideDumptruck } =
              useRitaseStore.getState();
            addTimbanganEntry(result.data);
            hideDumptruck(editingItem?.hull_no || formData.hull_no);

            return {
              success: true,
              data: result.data,
              shouldClose: true,
            };
          }

          throw new Error(result.error || "Gagal menyimpan data");
        },
        {
          operation: "create timbangan",
          showSuccessToast: false,
          onError: (error) => {
            throw error;
          },
        },
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

  const isValid = useMemo(() => {
    const { isValid } = validateAllFields();
    return isValid;
  }, [validateAllFields]);

  const hasUnsavedChanges = useMemo(() => {
    if (mode === "edit" && editingItem) {
      const original = formData._original;
      if (!original) return false;

      const hasChanges =
        parseFloat(formData.gross_weight) !==
          parseFloat(original.gross_weight) ||
        parseFloat(formData.tare_weight) !== parseFloat(original.tare_weight) ||
        formData.measurement_type !== original.measurement_type ||
        formData.unit_dump_truck !== original.unit_dump_truck ||
        formData.unit_exca !== original.unit_exca ||
        formData.loading_location !== original.loading_location ||
        formData.dumping_location !== original.dumping_location ||
        formData.shift !== original.shift ||
        formData.spph !== original.spph ||
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
        gross_weight: formData.gross_weight
          ? `${formData.gross_weight} ton`
          : "-",
        net_weight: formData.net_weight ? `${formData.net_weight} ton` : "-",
        isEditMode: true,
      };
    }

    return {
      hull_no: formData.hull_no || "-",
      gross_weight: formData.gross_weight
        ? `${formData.gross_weight} ton`
        : "-",
      net_weight: formData.net_weight ? `${formData.net_weight} ton` : "-",
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
