import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { timbanganServices } from "../services/timbanganServices";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";

const DEFAULT_FORM_VALUES = {
  unit_id: "",
  net_weight: "",
  createdAt: new Date().toISOString(),
};

const CREATE_VALIDATION_RULES = {
  unit_id: {
    required: true,
    message: "Unit wajib dipilih",
    errorMessage: "Pilih unit yang valid",
  },
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

const createInitialFormData = (editingItem, mode) => {
  if (editingItem && mode === "edit") {
    return {
      ...DEFAULT_FORM_VALUES,
      net_weight: editingItem.net_weight || "",
      unit_id: editingItem.unit_dump_truck_id || editingItem.dumptruckId || "",
      createdAt: editingItem.createdAt || editingItem.clientCreatedAt || new Date().toISOString(),
      _original: {
        id: editingItem.id,
        net_weight: editingItem.net_weight,
        unit_id: editingItem.unit_dump_truck_id || editingItem.dumptruckId,
      },
    };
  }

  return {
    ...DEFAULT_FORM_VALUES,
    createdAt: new Date().toISOString(),
  };
};

export const useCheckPointForm = (
  editingItem = null,
  mode = "create",
  masters = null
) => {
  const { user } = useAuthStore();

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  const addTimbanganEntry = useTimbanganStore((s) => s.addTimbanganEntry);
  const updateTimbanganEntry = useTimbanganStore((s) => s.updateTimbanganEntry);
  const deleteTimbanganEntry = useTimbanganStore((s) => s.deleteTimbanganEntry);

  const [formData, setFormData] = useState(() =>
    createInitialFormData(editingItem, mode)
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const newFormData = createInitialFormData(editingItem, mode);

    setFormData(newFormData);
    setErrors({});
    setTouched({});
  }, [editingItem, mode, masters]);

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

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    return { isValid, errors: newErrors };
  }, [formData, validateField, validationRules]);

  const updateField = useCallback(
    (fieldName, value) => {
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
    []
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

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const { isValid, errors: validationErrors } = validateAllFields();
      if (!isValid) {
        setErrors(validationErrors);
        showToast.error("Mohon perbaiki kesalahan pada form");
        return { success: false, error: "Validation failed" };
      }

      let submissionData;
      let result;

      if (mode === "edit" && editingItem) {
        submissionData = {
          net_weight: parseFloat(formData.net_weight),
          updated_by_user: user?.id || null,
        };

        result = await timbanganServices.editTimbanganForm(
          submissionData,
          editingItem.id,
          { signal }
        );

        if (!isMountedRef.current) {
          console.warn("⚠️ Component unmounted during EDIT request");
          return {
            success: false,
            error: "Component unmounted during request",
          };
        }

        if (result.success) {
          updateTimbanganEntry(editingItem.id, result.data);
          showToast.success(result.message || "Data berhasil diperbarui");
          return { success: true, data: result.data };
        } else {
          setErrors({ submit: result.error });
          showToast.error(result.error || "Gagal memperbarui data");
          return { success: false, error: result.error };
        }
      } else if (mode === "delete" && editingItem) {
        result = await timbanganServices.deleteTimbanganEntry(editingItem.id, {
          signal,
        });

        if (!isMountedRef.current) {
          console.warn("⚠️ Component unmounted during DELETE request");
          return {
            success: false,
            error: "Component unmounted during request",
          };
        }

        if (result.success) {
          deleteTimbanganEntry(editingItem.id);
          showToast.success(result.message || "Data berhasil dihapus");
          return { success: true };
        } else {
          showToast.error(result.error || "Gagal menghapus data");
          return { success: false, error: result.error };
        }
      } else {
        // CREATE MODE
        submissionData = {
          unit_dump_truck: parseInt(formData.unit_id),
          net_weight: parseFloat(formData.net_weight),
          clientCreatedAt: formData.createdAt || new Date().toISOString(),
          created_by_user: user?.id || null,
        };

        result = await timbanganServices.submitTimbanganForm(submissionData, {
          signal,
        });

        if (!isMountedRef.current) {
          console.warn("⚠️ Component unmounted during CREATE request");
          return {
            success: false,
            error: "Component unmounted during request",
          };
        }

        if (result.success) {
          addTimbanganEntry(result.data);
          showToast.success(result.message || "Data berhasil disimpan");
          return { success: true, data: result.data };
        } else {
          showToast.error(result.error || "Gagal menyimpan data");
          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return { success: false, error: "Request cancelled" };
      }

      console.error("❌ Submit error:", error);

      if (isMountedRef.current) {
        setErrors({ submit: error.message });
        showToast.error(error.message || "Terjadi kesalahan");
      }

      return { success: false, error: error.message };
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [
    isSubmitting,
    mode,
    editingItem,
    formData,
    user,
    validateAllFields,
    updateTimbanganEntry,
    deleteTimbanganEntry,
    addTimbanganEntry,
  ]);

  const resetForm = useCallback(() => {
    const resetData = createInitialFormData(null, "create");
    setFormData(resetData);
    setErrors({});
    setTouched({});
    showToast.info("Form direset ke nilai default");
  }, []);

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

      return parseFloat(formData.net_weight) !== parseFloat(original.net_weight);
    }

    const defaultData = createInitialFormData(null, "create");
    return JSON.stringify(formData) !== JSON.stringify(defaultData);
  }, [formData, mode, editingItem]);

  const formSummary = useMemo(() => {
    if (mode === "edit") {
      return {
        net_weight: formData.net_weight ? `${formData.net_weight} ton` : "-",
        isEditMode: true,
      };
    }

    return {
      unit_id: formData.unit_id || "-",
      net_weight: formData.net_weight ? `${formData.net_weight} ton` : "-",
    };
  }, [formData, mode]);

  return {
    formData,
    errors: displayErrors,
    touched,
    isValid,
    isSubmitting,
    hasUnsavedChanges,
    formSummary,
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