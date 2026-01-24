import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Settings, Truck, User, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { showToast } from "@/shared/utils/toast";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import SearchableSelect from "@/shared/components/SearchableSelect";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";
import ModalHeader from "@/shared/components/ModalHeader";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { InfoCard } from "@/shared/components/InfoCard";
import {
  SEARCH_PLACEHOLDERS,
  CARD_TITLES,
  VALIDATION_MESSAGES,
} from "@/modules/timbangan/fleet/constant/fleetConstants";
import { logger } from "@/shared/services/log";
const MEASUREMENT_TYPE_OPTIONS = [
  { value: "Timbangan", label: "Timbangan" },
  { value: "Bypass", label: "Bypass" },
  { value: "Beltscale", label: "Beltscale" },
];

const FleetModal = ({
  isOpen,
  onClose,
  editingConfig = null,
  onSave,
  fleetType = "Timbangan",
  availableDumptruckSettings = [],
}) => {
  const { user } = useAuthStore();
  const isEdit = !!editingConfig;

  const { masters, mastersLoading } = useFleet(user ? { user } : null, null);
  const { data: masterUnits, isLoading: masterUnitsLoading } =
    useMasterData("units");

  const permissions = useFleetPermissions();

  const [fleetData, setFleetData] = useState({
    excavator: "",
    loadingLocation: "",
    dumpingLocation: "",
    coalType: "",
    distance: 0,
    workUnit: "",
    measurementType: "",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [distanceText, setDistanceText] = useState("");
const [inspectorIds, setInspectorIds] = useState([]); // CHANGED: from inspectorId
const [checkerIds, setCheckerIds] = useState([]); // CHANGED: from checkerId

  const [selectedUnits, setSelectedUnits] = useState([]);
  const [unitOperators, setUnitOperators] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [fleetFilteredUnits, setFleetFilteredUnits] = useState([]);
  const [isLoadingFilteredUnits, setIsLoadingFilteredUnits] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const filterUnitsByExcavator = useCallback(
    async (excavatorId) => {
      try {
        const excavator = masters?.excavators?.find(
          (e) => String(e.id) === String(excavatorId),
        );

        if (!excavator || !excavator.companyId) {
          return [];
        }

        const filtered = masterUnits.filter(
          (unit) =>
            unit.type === "DUMP_TRUCK" &&
            String(unit.companyId) === String(excavator.companyId),
        );

        return filtered;
      } catch (error) {
        console.error("Failed to filter units:", error);
        return [];
      }
    },
    [masters?.excavators, masterUnits],
  );
useEffect(() => {
  if (!isOpen) return;

  const initializeModalData = async () => {
    if (editingConfig) {
      
      const initialData = {
        excavator: editingConfig.excavatorId || "",
        loadingLocation: editingConfig.loadingLocationId || "",
        dumpingLocation: editingConfig.dumpingLocationId || "",
        coalType: editingConfig.coalTypeId || "",
        distance: editingConfig.distance ?? 0,
        workUnit: editingConfig.workUnitId || "",
        measurementType: editingConfig.measurementType || fleetType,
      };

      setFleetData(initialData);
      setDistanceText(
        editingConfig.distance != null && editingConfig.distance !== ""
          ? String(editingConfig.distance)
          : "",
      );
      
      // FIXED: Better handling untuk inspectors
      let inspectorIdsToSet = [];
      
      if (Array.isArray(editingConfig.inspectorIds) && editingConfig.inspectorIds.length > 0) {
        // Format baru: array of IDs
        inspectorIdsToSet = editingConfig.inspectorIds.map(String);
      } else if (Array.isArray(editingConfig.inspectors) && editingConfig.inspectors.length > 0) {
        // Format baru: array of objects { id, name }
        inspectorIdsToSet = editingConfig.inspectors.map(i => String(i.id)).filter(Boolean);
      } else if (editingConfig.inspectorId) {
        // Format lama: single ID
        inspectorIdsToSet = [String(editingConfig.inspectorId)];
      }
      
      setInspectorIds(inspectorIdsToSet);
      
      // FIXED: Better handling untuk checkers
      let checkerIdsToSet = [];
      
      if (Array.isArray(editingConfig.checkerIds) && editingConfig.checkerIds.length > 0) {
        // Format baru: array of IDs
        checkerIdsToSet = editingConfig.checkerIds.map(String);
      } else if (Array.isArray(editingConfig.checkers) && editingConfig.checkers.length > 0) {
        // Format baru: array of objects { id, name }
        checkerIdsToSet = editingConfig.checkers.map(c => String(c.id)).filter(Boolean);
      } else if (editingConfig.checkerId) {
        // Format lama: single ID
        checkerIdsToSet = [String(editingConfig.checkerId)];
      }
      
      setCheckerIds(checkerIdsToSet);

      if (editingConfig.units) {
        const existingUnits = editingConfig.units.map((unit) => ({
          id: String(unit.id || unit.dumpTruckId),
          hull_no: unit.hull_no || "-",
          company: unit.company || "-",
          workUnit: unit.workUnit || "-",
          type: "DUMP_TRUCK",
          companyId: unit.companyId,
          workUnitId: unit.workUnitId,
        }));

        setSelectedUnits(existingUnits);

        const initialOperators = {};
        editingConfig.units.forEach((unit) => {
          const unitId = String(unit.id || unit.dumpTruckId);
          if (unit.operatorId) {
            initialOperators[unitId] = String(unit.operatorId);
          }
        });
        setUnitOperators(initialOperators);
      }

      if (editingConfig.excavatorId) {
        setIsLoadingFilteredUnits(true);
        try {
          const filtered = await filterUnitsByExcavator(
            String(editingConfig.excavatorId),
          );
          setFleetFilteredUnits(filtered);
        } catch (error) {
          console.error("❌ Failed to load filtered units:", error);
          setFleetFilteredUnits([]);
        } finally {
          setIsLoadingFilteredUnits(false);
        }
      }
    } else {
      // NEW MODE
      
      const measurementTypeMap = {
        Timbangan: "Timbangan",
        Bypass: "Bypass",
        Beltscale: "Beltscale",
      };

      const defaultMeasurementType =
        measurementTypeMap[fleetType] || "Timbangan";

      const newData = {
        excavator: "",
        loadingLocation: "",
        dumpingLocation: "",
        coalType: "",
        distance: 0,
        workUnit: "",
        measurementType: defaultMeasurementType,
      };

      setFleetData(newData);
      setDistanceText("");
      setInspectorIds([]); 
      setCheckerIds([]);
      setSelectedUnits([]);
      setUnitOperators({});
      setFleetFilteredUnits([]);
    }

    setSearchQuery("");
    setShowAllUnits(false);
    setErrors({});
  };

  initializeModalData();
}, [isOpen, editingConfig, fleetType, filterUnitsByExcavator]);


  const selectedOperatorIds = useMemo(() => {
    return Object.values(unitOperators).filter(Boolean);
  }, [unitOperators]);

const handleExcavatorChange = useCallback(
  async (excavatorId) => {
    setFleetData((p) => ({ ...p, excavator: excavatorId || "" }));

    // FIXED: Hanya reset units jika excavator BENAR-BENAR berubah, bukan saat edit
    if (!isEdit || (isEdit && excavatorId !== editingConfig?.excavatorId)) {
      setSelectedUnits([]);
      setUnitOperators({});
    }

    // HAPUS baris ini yang menyebabkan bug:
    // setShowAllUnits(false); // ❌ INI PENYEBAB BUG!

    setErrors((prev) => {
      const e = { ...prev };
      delete e.excavator;
      return e;
    });

    if (excavatorId) {
      setIsLoadingFilteredUnits(true);
      try {
        const filtered = await filterUnitsByExcavator(String(excavatorId));
        setFleetFilteredUnits(filtered);

        if (filtered.length === 0) {
          setErrors((prev) => ({
            ...prev,
            units: "Tidak ada dump truck tersedia untuk excavator ini",
          }));
        }
      } catch (error) {
        console.error("Failed to load filtered units:", error);
        setErrors((prev) => ({
          ...prev,
          units: "Gagal memuat dump truck",
        }));
        setFleetFilteredUnits([]);
      } finally {
        setIsLoadingFilteredUnits(false);
      }
    } else {
      setFleetFilteredUnits([]);
    }
  },
  [filterUnitsByExcavator, isEdit, editingConfig],
);

  const filteredUnits = useMemo(() => {
    let units = [];

    if (showAllUnits) {
      units = masterUnits.filter((u) => u.type === "DUMP_TRUCK");
    } else {
      units = [...fleetFilteredUnits];
    }

    if (isEdit && editingConfig?.units) {
      editingConfig.units.forEach((existingUnit) => {
        const unitId = String(existingUnit.id || existingUnit.dumpTruckId);
        const alreadyInList = units.some((u) => String(u.id) === unitId);

        if (!alreadyInList) {
          units.push({
            id: unitId,
            hull_no: existingUnit.hull_no,
            company: existingUnit.company,
            workUnit: existingUnit.workUnit,
            type: "DUMP_TRUCK",
            companyId: existingUnit.companyId,
            workUnitId: existingUnit.workUnitId,
          });
        }
      });
    }

    units = units.filter((unit) => {
      if (isEdit && editingConfig) {
        const isCurrentSettingUnit = (editingConfig.units || []).some(
          (u) => String(u.id || u.dumpTruckId) === String(unit.id),
        );
        if (isCurrentSettingUnit) {
          ("✅ Keeping current fleet unit:", unit.hull_no);
          return true;
        }
      }

      const isAssignedToOtherFleet = (availableDumptruckSettings || []).some(
        (setting) => {
          if (isEdit && editingConfig && setting.id === editingConfig.id) {
            return false;
          }

          return (setting.units || []).some(
            (u) => String(u.id) === String(unit.id),
          );
        },
      );

      return !isAssignedToOtherFleet;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      units = units.filter(
        (u) =>
          u.hull_no?.toLowerCase().includes(q) ||
          u.company?.toLowerCase().includes(q) ||
          u.workUnit?.toLowerCase().includes(q),
      );
    }

    return units;
  }, [
    fleetFilteredUnits,
    masterUnits,
    searchQuery,
    availableDumptruckSettings,
    editingConfig,
    isEdit,
    showAllUnits,
  ]);

  const allUnitsHaveOperators = useMemo(() => {
    if (selectedUnits.length === 0) return false;
    return selectedUnits.every((unit) => unitOperators[unit.id]);
  }, [selectedUnits, unitOperators]);

const validate = useCallback(() => {
  const e = {};

  if (!fleetData.excavator) e.excavator = "Pilih excavator";
  if (!fleetData.loadingLocation) e.loadingLocation = "Pilih lokasi loading";
  if (!fleetData.dumpingLocation) e.dumpingLocation = "Pilih lokasi dumping";
  if (!fleetData.coalType) e.coalType = "Pilih coal type";
  if (!fleetData.workUnit) e.workUnit = "Pilih work unit";
  if (!fleetData.measurementType) e.measurementType = "Pilih measurement type";

  const cleaned = (distanceText || "").trim().replace(",", ".");
  const distNum =
    cleaned === ""
      ? 0
      : Number.isFinite(parseFloat(cleaned))
        ? parseFloat(cleaned)
        : NaN;
  if (!Number.isFinite(distNum) || distNum < 0) {
    e.distance = "Distance harus angka valid (≥ 0)";
  }

  // FIXED: Validate with better logging
  if (!inspectorIds || inspectorIds.length === 0) {
    e.inspector = "Pilih minimal 1 inspector";
  }
  
  if (!checkerIds || checkerIds.length === 0) {
    e.checker = "Pilih minimal 1 checker";
  }

  if (selectedUnits.length === 0) {
    e.units = VALIDATION_MESSAGES.REQUIRED_UNITS;
  }

  selectedUnits.forEach((unit) => {
    if (!unitOperators[unit.id]) {
      e[`operator_${unit.id}`] = VALIDATION_MESSAGES.REQUIRED_OPERATOR;
      e.operators = VALIDATION_MESSAGES.ALL_OPERATORS_REQUIRED;
    }
  });

  setErrors(e);
  return Object.keys(e).length === 0;
}, [
  fleetData,
  distanceText,
  inspectorIds,
  checkerIds,
  selectedUnits,
  unitOperators,
]);

const handleSave = useCallback(async () => {
  if (!validate()) {
    showToast.error("Mohon lengkapi semua field yang wajib diisi");
    return;
  }

  setIsSaving(true);

  try {
    const cleaned = (distanceText || "").trim().replace(",", ".");
    let dist = cleaned === "" ? 0 : parseFloat(cleaned);
    if (!Number.isFinite(dist) || dist < 0) dist = 0;

    const basePayload = {
      excavatorId: fleetData.excavator,
      loadingLocationId: fleetData.loadingLocation,
      dumpingLocationId: fleetData.dumpingLocation,
      coalTypeId: fleetData.coalType,
      distance: dist,
      workUnitId: fleetData.workUnit,
      inspectorIds: inspectorIds.map(id => parseInt(id)),
      checkerIds: checkerIds.map(id => parseInt(id)),
      measurement_type: fleetData.measurementType,
    };

    const pairDtOp = selectedUnits.map((unit) => ({
      truckId: parseInt(unit.id),
      operatorId: parseInt(unitOperators[unit.id]),
    }));

    basePayload.pairDtOp = pairDtOp;

    const result = await onSave(basePayload);

    if (result?.success) {
      setFleetData((p) => ({ ...p, distance: dist }));
      onClose();
    }
  } catch (err) {
    console.error("❌ Fleet save error:", err);

    const isQueued =
      err?.queued || err?.message?.includes("queued for offline sync");
    const isValidation =
      err?.validationError ||
      (err?.response?.status >= 400 && err?.response?.status < 500);

    if (isQueued) {
      setErrors((p) => ({ ...p, submit: null }));
      showToast.info(
        "📤 Data disimpan di queue dan akan otomatis tersinkron saat online",
        { duration: 4000 },
      );
      setTimeout(() => onClose(), 1000);
    } else if (isValidation) {
      setErrors((p) => ({
        ...p,
        submit: err?.message || "Validasi gagal. Periksa input Anda.",
      }));
      showToast.error(err?.message || "Validasi gagal");
    } else {
      const errorMsg = err?.message || "Gagal menyimpan data";
      setErrors((p) => ({ ...p, submit: errorMsg }));
      showToast.error(errorMsg);
    }
  } finally {
    setIsSaving(false);
  }
}, [validate, distanceText, fleetData, inspectorIds, checkerIds, selectedUnits, unitOperators, onSave, onClose]);
  const excaItems = useMemo(
    () =>
      (masters?.excavators || []).map((e) => ({
        value: String(e.id),
        label: e.hull_no || e.name || `Excavator #${e.id}`,
        hint: [e.company, e.workUnit].filter(Boolean).join(" • "),
      })),
    [masters?.excavators],
  );

  const loadLocItems = useMemo(
    () =>
      (masters?.loadingLocations || []).map((l) => ({
        value: String(l.id),
        label: l.name ?? "-",
      })),
    [masters?.loadingLocations],
  );

  const dumpLocItems = useMemo(
    () =>
      (masters?.dumpingLocations || []).map((l) => ({
        value: String(l.id),
        label: l.name ?? "-",
      })),
    [masters?.dumpingLocations],
  );

  const coalTypeItems = useMemo(
    () =>
      (masters?.coalTypes || []).map((ct) => ({
        value: String(ct.id),
        label: ct.name ?? "-",
      })),
    [masters?.coalTypes],
  );

  const workUnitItems = useMemo(
    () =>
      (masters?.workUnits || []).map((wu) => ({
        value: String(wu.id),
        label: wu.subsatker || wu.name || `Work Unit #${wu.id}`,
        hint: wu.name && wu.subsatker !== wu.name ? wu.name : undefined,
      })),
    [masters?.workUnits],
  );

  const userItems = useMemo(
    () =>
      (masters?.users || []).map((u) => ({
        value: String(u.id),
        label: u.username || u.email || `User #${u.id}`,
        hint: u.email && u.username !== u.email ? u.email : undefined,
        role: u.role,
      })),
    [masters?.users],
  );

  const operatorOptions = useMemo(
    () =>
      (masters?.operators || []).map((op) => ({
        value: String(op.id),
        label: op.name,
        hint: op.company || "-",
      })),
    [masters?.operators],
  );

  const checkerItems = useMemo(() => {
    const measurementType = fleetData.measurementType || fleetType;
    if (measurementType === "Timbangan") {
      return userItems.filter(
        (u) =>
          u.role === "Checker" ||
          u.role === "Operator_JT" ||
          u.label?.toLowerCase()?.includes("checker") ||
          u.label?.toLowerCase()?.includes("operator jt"),
      );
    } else {
      return userItems.filter(
        (u) =>
          u.role === "Checker" || u.label?.toLowerCase()?.includes("checker"),
      );
    }
  }, [userItems, fleetData.measurementType, fleetType]);

  const inspectorItems = useMemo(
    () =>
      userItems.filter(
        (u) =>
          u.role === "Pengawas" || u.label?.toLowerCase()?.includes("pengawas"),
      ),
    [userItems],
  );

  const getOperatorOptionsForUnit = useCallback(
    (unit) => {
      if (!unit?.companyId) {
        return operatorOptions;
      }

      const currentOperatorId = unitOperators[unit.id];

      return operatorOptions.filter((op) => {
        const operatorDetail = masters?.operators?.find(
          (o) => String(o.id) === String(op.value),
        );

        const companyMatch =
          operatorDetail &&
          String(operatorDetail.companyId) === String(unit.companyId);

        const isSelectedByOther =
          selectedOperatorIds.includes(op.value) &&
          op.value !== currentOperatorId;

        return companyMatch && !isSelectedByOther;
      });
    },
    [operatorOptions, masters?.operators, unitOperators, selectedOperatorIds],
  );

  const getAvailableOperatorCount = useCallback(
    (unit) => {
      return getOperatorOptionsForUnit(unit).length;
    },
    [getOperatorOptionsForUnit],
  );

  const handleUnitToggle = useCallback((unit) => {
    setSelectedUnits((prev) => {
      const exists = prev.find((u) => String(u.id) === String(unit.id));

      if (exists) {
        setUnitOperators((prevOps) => {
          const newOps = { ...prevOps };
          delete newOps[unit.id];
          return newOps;
        });
        return prev.filter((u) => String(u.id) !== String(unit.id));
      } else {
        return [...prev, unit];
      }
    });
  }, []);

  const handleOperatorChange = useCallback((unitId, operatorId) => {
    setUnitOperators((prev) => {
      const newOps = { ...prev };

      if (operatorId) {
        newOps[unitId] = operatorId;
      } else {
        delete newOps[unitId];
      }

      return newOps;
    });

    if (operatorId) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`operator_${unitId}`];
        return newErrors;
      });
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title={
            isEdit
              ? `Edit Fleet ${fleetData.measurementType || fleetType}`
              : `Buat Fleet ${fleetType} Baru`
          }
          subtitle={
            isEdit
              ? `Update konfigurasi fleet ${fleetData.measurementType || fleetType}`
              : `Isi data untuk membuat fleet ${fleetType}`
          }
          icon={Settings}
          onClose={onClose}
          disabled={isSaving}
        />

        {(mastersLoading || masterUnitsLoading) && (
          <LoadingOverlay isVisible={true} message="Loading master data..." />
        )}

        {!mastersLoading && !masterUnitsLoading && (
          <div className="p-6 space-y-6">
            <InfoCard
              title="Work Unit & Measurement Type"
              variant="default"
              className="border-none"
            >
              <div className="md:col-span-1 space-y-2">
                <Label className="dark:text-gray-300">Work Unit *</Label>
                <SearchableSelect
                  items={workUnitItems}
                  value={fleetData.workUnit}
                  onChange={(val) =>
                    setFleetData((p) => ({ ...p, workUnit: val || "" }))
                  }
                  placeholder="Pilih work unit"
                  emptyText="Work unit tidak ditemukan"
                  error={!!errors.workUnit}
                  disabled={isSaving}
                />
                {errors.workUnit && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.workUnit}
                  </p>
                )}
              </div>

              <div className="md:col-span-1 space-y-2">
                <Label className="dark:text-gray-300">Measurement Type *</Label>
                <SearchableSelect
                  items={MEASUREMENT_TYPE_OPTIONS}
                  value={fleetData.measurementType}
                  onChange={(val) => {
                    setFleetData((p) => ({ ...p, measurementType: val || "" }));
                    if (!isEdit) {
                      setCheckerIds([]);
                    }
                  }}
                  placeholder="Pilih measurement type"
                  emptyText="Measurement type tidak ditemukan"
                  error={!!errors.measurementType}
                  disabled={isSaving}
                />
                {errors.measurementType && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.measurementType}
                  </p>
                )}
              </div>
            </InfoCard>

            <InfoCard
              title="Excavator & Lokasi"
              variant="default"
              className="border-none"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Excavator *</Label>
                <SearchableSelect
                  items={excaItems}
                  value={fleetData.excavator}
                  onChange={handleExcavatorChange}
                  placeholder="Pilih excavator"
                  emptyText="Excavator tidak ditemukan"
                  error={!!errors.excavator}
                  disabled={isSaving}
                />
                {errors.excavator && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.excavator}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Loading Location *</Label>
                <SearchableSelect
                  items={loadLocItems}
                  value={fleetData.loadingLocation}
                  onChange={(val) =>
                    setFleetData((p) => ({ ...p, loadingLocation: val || "" }))
                  }
                  placeholder="Pilih lokasi loading"
                  emptyText="Lokasi loading tidak ditemukan"
                  error={!!errors.loadingLocation}
                  disabled={isSaving}
                />
                {errors.loadingLocation && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.loadingLocation}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="dark:text-gray-300">Dumping Location *</Label>
                <SearchableSelect
                  items={dumpLocItems}
                  value={fleetData.dumpingLocation}
                  onChange={(val) =>
                    setFleetData((p) => ({ ...p, dumpingLocation: val || "" }))
                  }
                  placeholder="Pilih lokasi dumping"
                  emptyText="Lokasi dumping tidak ditemukan"
                  error={!!errors.dumpingLocation}
                  disabled={isSaving}
                />
                {errors.dumpingLocation && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.dumpingLocation}
                  </p>
                )}
              </div>
            </InfoCard>

            <InfoCard
              title="Coal Type & Jarak"
              variant="default"
              className="border-none"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Coal Type *</Label>
                <SearchableSelect
                  items={coalTypeItems}
                  value={fleetData.coalType}
                  onChange={(val) =>
                    setFleetData((p) => ({ ...p, coalType: val || "" }))
                  }
                  placeholder="Pilih coal type"
                  emptyText="Coal type tidak ditemukan"
                  error={!!errors.coalType}
                  disabled={isSaving}
                />
                {errors.coalType && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.coalType}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Distance (m) *</Label>
                <Input
                  type="text"
                  value={distanceText}
                  onFocus={() => {
                    if (distanceText === "0" || distanceText === "0.0")
                      setDistanceText("");
                  }}
                  onChange={(e) =>
                    setDistanceText(e.target.value.replace(",", "."))
                  }
                  onBlur={() => {
                    const v = distanceText.trim();
                    if (v === "") {
                      setDistanceText("0");
                      return;
                    }
                    const n = Number(v);
                    if (Number.isFinite(n)) setDistanceText(String(n));
                  }}
                  placeholder="Masukkan jarak dalam meter"
                  disabled={isSaving}
                  className="border-none dark:text-gray-300"
                />
                {errors.distance && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.distance}
                  </p>
                )}
              </div>
            </InfoCard>

<InfoCard
  title="Inspector & Checker"
  variant="primary"
  className="border-none"
>
  <div className="space-y-2">
    <Label className="dark:text-gray-300">Inspector *</Label>
    <MultiSearchableSelect
      items={inspectorItems}
      values={inspectorIds}
      onChange={setInspectorIds}
      placeholder="Pilih inspector (bisa pilih banyak)"
      emptyText="Inspector tidak ditemukan"
      disabled={isSaving}
      error={!!errors.inspector}
    />
    {errors.inspector && (
      <p className="text-sm text-red-500 dark:text-red-400">
        {errors.inspector}
      </p>
    )}
    {inspectorIds.length > 0 && (
      <p className="text-xs text-blue-600 dark:text-blue-400">
        {inspectorIds.length} inspector dipilih
      </p>
    )}
  </div>

  <div className="space-y-2">
    <Label className="dark:text-gray-300">Checker *</Label>
    <MultiSearchableSelect
      items={checkerItems}
      values={checkerIds}
      onChange={setCheckerIds}
      placeholder="Pilih checker (bisa pilih banyak)"
      emptyText="Checker tidak ditemukan"
      error={!!errors.checker}
      disabled={isSaving}
    />
    {errors.checker && (
      <p className="text-sm text-red-500 dark:text-red-400">
        {errors.checker}
      </p>
    )}
    {checkerIds.length > 0 && (
      <p className="text-xs text-blue-600 dark:text-blue-400">
        {checkerIds.length} checker dipilih
      </p>
    )}
  </div>
</InfoCard>

            {fleetData.excavator && (
              <InfoCard
                title={CARD_TITLES.UNITS}
                icon={Truck}
                variant="primary"
                className="border-none"
              >
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="dark:text-gray-300">
                      Pilih Dump Truck *
                    </Label>
                    <Input
                      placeholder={SEARCH_PLACEHOLDERS.UNIT}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-xs border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      disabled={isSaving || isLoadingFilteredUnits}
                    />
                  </div>

                  {errors.units && (
                    <Alert
                      variant="destructive"
                      className="mb-2 dark:bg-red-900/20 dark:border-red-800"
                    >
                      <AlertCircle className="h-4 w-4 dark:text-red-400" />
                      <AlertDescription className="dark:text-red-300">
                        {errors.units}
                      </AlertDescription>
                    </Alert>
                  )}

                  {isLoadingFilteredUnits && (
                    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                      <AlertDescription className="text-sm dark:text-blue-300">
                        Memuat dump truck...
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isLoadingFilteredUnits && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <Checkbox
                        checked={showAllUnits}
                        onCheckedChange={(checked) => {
                          setShowAllUnits(checked);
                        }}
                        disabled={isSaving}
                        className="dark:text-gray-200"
                      />
                      <Label className="text-sm font-medium cursor-pointer dark:text-gray-300">
                        Tampilkan semua DT
                      </Label>
                    </div>
                  )}

                  {!isLoadingFilteredUnits && filteredUnits.length > 0 && (
                    <div className="rounded-lg max-h-96 overflow-y-auto">
                      {filteredUnits.map((unit) => {
                        const isSelected = selectedUnits.some(
                          (u) => String(u.id) === String(unit.id),
                        );
                        const hasOperatorError = errors[`operator_${unit.id}`];

                        return (
                          <div
                            key={unit.id}
                            className={`p-3 transition-colors ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-900/20"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="pt-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleUnitToggle(unit)}
                                  disabled={isSaving}
                                  className="dark:text-gray-200"
                                />
                              </div>
                              <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-1" />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div
                                    className="cursor-pointer"
                                    onClick={() => {
                                      if (!isSaving) {
                                        handleUnitToggle(unit);
                                      }
                                    }}
                                  >
                                    <p className="font-medium text-sm dark:text-gray-200">
                                      {unit.hull_no}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {unit.company} • {unit.workUnit}
                                    </p>
                                  </div>
                                </div>

                                {isSelected && (
                                  <div className="space-y-1">
                                    <Label className="text-xs flex items-center gap-1 dark:text-gray-300">
                                      <User className="w-3 h-3" />
                                      Operator *
                                      {unit.company && (
                                        <span className="text-gray-500">
                                          ({unit.company})
                                        </span>
                                      )}
                                    </Label>

                                    <SearchableSelect
                                      items={getOperatorOptionsForUnit(unit)}
                                      value={unitOperators[unit.id] || ""}
                                      onChange={(operatorId) =>
                                        handleOperatorChange(
                                          unit.id,
                                          operatorId,
                                        )
                                      }
                                      placeholder="Pilih operator"
                                      emptyText={
                                        getAvailableOperatorCount(unit) === 0
                                          ? `Semua operator ${unit.company} sudah dipilih`
                                          : `Tidak ada operator untuk ${unit.company || "company ini"}`
                                      }
                                      disabled={
                                        isSaving ||
                                        getAvailableOperatorCount(unit) === 0
                                      }
                                      error={!!hasOperatorError}
                                    />

                                    {/* Show available operator count */}
                                    {getAvailableOperatorCount(unit) > 0 &&
                                      !unitOperators[unit.id] && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                          {getAvailableOperatorCount(unit)}{" "}
                                          operator tersedia
                                        </p>
                                      )}

                                    {/* Warning if no operators available */}
                                    {getAvailableOperatorCount(unit) === 0 &&
                                      !unitOperators[unit.id] && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400">
                                          ⚠️ Semua operator sudah dipilih di DT
                                          lain
                                        </p>
                                      )}

                                    {hasOperatorError && (
                                      <p className="text-xs text-red-500 dark:text-red-400">
                                        {hasOperatorError}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {errors.submit && (
              <Alert
                variant="destructive"
                className="dark:bg-red-900/20 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4 dark:text-red-400" />
                <AlertDescription className="dark:text-red-300">
                  {errors.submit}
                </AlertDescription>
              </Alert>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSaving}
                className="cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isSaving ||
                  !allUnitsHaveOperators ||
                  selectedUnits.length === 0
                }
                className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:text-gray-200 dark:hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : isEdit ? (
                  "Update Konfigurasi"
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <LoadingOverlay isVisible={isSaving} message="Menyimpan..." />
    </div>
  );
};

export default FleetModal;
