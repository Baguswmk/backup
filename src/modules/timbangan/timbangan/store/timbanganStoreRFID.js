// ============================================
// REMOVE findByHullNo FUNCTION
// ============================================

// ❌ DELETE THIS FUNCTION:
// findByHullNo: (hullNo, includeHidden = false) => { ... }

// ✅ KEEP ONLY findByRFID:
findByRFID: (rfid, includeHidden = false) => {
  const state = get();
  if (Object.keys(state.dtIndex).length === 0) {
    return null;
  }
  const match = Object.values(state.dtIndex).find(
    (dt) => dt.rfid === rfid
  );
  if (match) {
    const key = normalizeHull(match.hull_no);
    if (!includeHidden && state.hiddenDumptrucks[key]) {
      return null;
    }
    return match;
  }
  return null;
},
```

**✅ CONFIRMED: Store sudah ada `findByRFID` di timbanganStore.js line ~316**

## Plan Full Migration ke RFID-only:

### 1️⃣ **timbanganStore.js** - Remove `findByHullNo`
```javascript
// ❌ HAPUS fungsi ini:
findByHullNo: (hullNo, includeHidden = false) => {
  // ... remove entire function
},

// âœ… KEEP hanya ini:
findByRFID: (rfid, includeHidden = false) => {
  const state = get();
  if (Object.keys(state.dtIndex).length === 0) {
    return null;
  }
  const match = Object.values(state.dtIndex).find(
    (dt) => dt.rfid === rfid
  );
  if (match) {
    const key = normalizeHull(match.hull_no);
    if (!includeHidden && state.hiddenDumptrucks[key]) {
      return null;
    }
    return match;
  }
  return null;
},
```

## 2. **useTimbanganForm.js** - Ganti Semua Lookup

### Before (Lines 145-170):
```javascript
useEffect(() => {
  // ...
  if (mode === "create" && editingItem && editingItem.hull_no) {
    const rfid = editingItem.rfid;
    const hullKey = normalizeHull(editingItem.hull_no);
    const hit = findByHullNo(hullKey, true);  // ❌ REMOVE
    const match = findByRFID(rfid, true);

    if (match && match.dumptruckId && match.setting_fleet_id) {
      // ...
    }

    if (hit && hit.dumptruckId && hit.setting_fleet_id) {  // ❌ Remove this
      // ...
    }
  }
}, [editingItem, mode, masters, findByHullNo]); // ❌ Remove findByHullNo
```

**AFTER (RFID Only):**
```javascript
useEffect(() => {
  // ... other code ...

  if (mode === "create" && editingItem && editingItem.rfid) {
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
      return;
    }

    // âš ï¸ No RFID = Error
    console.warn("âŒ RFID tidak ditemukan untuk dump truck:", hullNoValue);
    setCurrentFleet(null);
    setFormData((prev) => ({
      ...prev,
      setting_fleet_id: "",
      dumptruck: "",
      operator: "",
    }));
    setErrors((prev) => ({
      ...prev,
      hull_no: "RFID tidak ditemukan di fleet aktif. Pastikan kartu RFID sudah terdaftar.",
    }));
  };

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
    [handleHullNoChange, mode]
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

    // âœ… Use withErrorHandling for all submission modes
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