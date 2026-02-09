import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Settings, Truck, Loader2, AlertCircle, Calendar, UserCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { showToast } from "@/shared/utils/toast";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import SearchableSelect from "@/shared/components/SearchableSelect";
import ModalHeader from "@/shared/components/ModalHeader";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { InfoCard } from "@/shared/components/InfoCard";

const SHIFT_OPTIONS = [
  { value: "Shift 1", label: "Shift 1 (22:00 - 06:00)" },
  { value: "Shift 2", label: "Shift 2 (06:00 - 14:00)" },
  { value: "Shift 3", label: "Shift 3 (14:00 - 22:00)" },
];

const MEASUREMENT_TYPE_OPTIONS = [
  { value: "Timbangan", label: "Timbangan" },
  { value: "Bypass", label: "Bypass" },
  { value: "Beltscale", label: "Beltscale" },
];

const AggregatedInputModal = ({
  isOpen,
  onClose,
  onSave,
  selectedFleetConfig = null,
}) => {
  const { user } = useAuthStore();
  const { masters, mastersLoading } = useFleet(user ? { user } : null, null);
const [ritaseData, setRitaseData] = useState({
  fleetConfigId: "",
  excavator: "",
  loadingLocation: "",
  dumpingLocation: "",
  coalType: "",
  workUnit: "",
  measurementType: "",
  dumpTruck: "",
  operator: "",
  checker: "",      
  inspector: "",    
  date: new Date().toISOString().split("T")[0],
  shift: "",
  weight: "",
  grossWeight: "",
  distance: 0,
  createdTime: new Date().toTimeString().slice(0, 5), // Format: HH:mm
});

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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

  // Initialize form with fleet config if provided
useEffect(() => {
  if (isOpen && selectedFleetConfig) {
    setRitaseData({
      fleetConfigId: selectedFleetConfig.id,
      excavator: selectedFleetConfig.excavatorId || "",
      loadingLocation: selectedFleetConfig.loadingLocationId || "",
      dumpingLocation: selectedFleetConfig.dumpingLocationId || "",
      coalType: selectedFleetConfig.coalTypeId || "",
      workUnit: selectedFleetConfig.workUnitId || "",
      measurementType: selectedFleetConfig.measurementType || "",
      checker: selectedFleetConfig.checkerId || "",
      inspector: selectedFleetConfig.inspectorId || "",
      distance: selectedFleetConfig.distance || 0,
      dumpTruck: "",
      operator: "",
      date: new Date().toISOString().split("T")[0],
      shift: "",
      weight: "",
      grossWeight: "",
      createdTime: new Date().toTimeString().slice(0, 5),
    });
  } else if (isOpen) {
    // Reset form
    setRitaseData({
      fleetConfigId: "",
      excavator: "",
      loadingLocation: "",
      dumpingLocation: "",
      coalType: "",
      workUnit: "",
      measurementType: "",
      checker: "",
      inspector: "",
      distance: 0,
      dumpTruck: "",
      operator: "",
      date: new Date().toISOString().split("T")[0],
      shift: "",
      weight: "",
      grossWeight: "",
      createdTime: new Date().toTimeString().slice(0, 5),
    });
  }
  setErrors({});
}, [isOpen, selectedFleetConfig]);
  // Handle weight input with format validation
  const handleWeightChange = useCallback(
    (value) => {
      // Replace comma with dot for decimal separator
      let formattedValue = value.replace(/,/g, ".");

      const measurementType = ritaseData.measurementType;
      const hasWeighBridge = user?.weigh_bridge != null;

      const isGrossWeight = measurementType === "Timbangan" && hasWeighBridge;
      const isNetWeight =
        (measurementType === "Timbangan" && !hasWeighBridge) ||
        measurementType === "Bypass";

      const netWeightRegex = /^\d{0,2}(\.\d{0,2})?$/;
      const grossWeightRegex = /^\d{0,3}(\.\d{0,2})?$/;

      let isValid = false;
      if (formattedValue === "") {
        isValid = true;
      } else if (isGrossWeight) {
        isValid = grossWeightRegex.test(formattedValue);
        const numValue = parseFloat(formattedValue);
        if (!isNaN(numValue) && numValue > 199.99) {
          isValid = false;
        }
      } else if (isNetWeight) {
        isValid = netWeightRegex.test(formattedValue);
        const numValue = parseFloat(formattedValue);
        if (!isNaN(numValue) && numValue > 99.99) {
          isValid = false;
        }
      } else {
        // For other measurement types, allow any valid number
        isValid = /^\d*\.?\d*$/.test(formattedValue);
      }

      if (isValid) {
        setRitaseData((p) => ({ ...p, weight: formattedValue }));
        setErrors((prev) => ({ ...prev, weight: null }));
      }
    },
    [ritaseData.measurementType, user],
  );

  // Handle gross weight input for Bypass
  const handleGrossWeightChange = useCallback(
    (value) => {
      // Replace comma with dot for decimal separator
      let formattedValue = value.replace(/,/g, ".");

      const grossWeightRegex = /^\d{0,3}(\.\d{0,2})?$/;

      let isValid = false;
      if (formattedValue === "") {
        isValid = true;
      } else {
        isValid = grossWeightRegex.test(formattedValue);
        const numValue = parseFloat(formattedValue);
        if (!isNaN(numValue) && numValue > 199.99) {
          isValid = false;
        }
      }

      if (isValid) {
        setRitaseData((p) => ({ ...p, grossWeight: formattedValue }));
        setErrors((prev) => ({ ...prev, grossWeight: null }));
      }
    },
    [],
  );

const validate = useCallback(() => {
  const e = {};

  // Basic validations
  if (!ritaseData.excavator) e.excavator = "Pilih excavator";
  if (!ritaseData.loadingLocation) e.loadingLocation = "Pilih lokasi loading";
  if (!ritaseData.dumpingLocation) e.dumpingLocation = "Pilih lokasi dumping";
  if (!ritaseData.coalType) e.coalType = "Pilih coal type";
  if (!ritaseData.workUnit) e.workUnit = "Pilih work unit";
  if (!ritaseData.measurementType) e.measurementType = "Pilih measurement type";
  if (!ritaseData.dumpTruck) e.dumpTruck = "Pilih dump truck";
  if (!ritaseData.operator) e.operator = "Pilih operator";
  if (!ritaseData.date) e.date = "Pilih tanggal";
  if (!ritaseData.shift) e.shift = "Pilih shift";

  // ✅ Validasi Checker & Inspector (warning, bukan error)
  if (!ritaseData.checker) {
    e.checker = "Pilih checker";
  }
  
  if (!ritaseData.inspector) {
    e.inspector = "Pilih inspector";
  }

  // Weight validation based on measurement type
  const measurementType = ritaseData.measurementType;
  const hasWeighBridge = user?.weigh_bridge != null;
  
  const isGrossWeight = measurementType === "Timbangan" && hasWeighBridge;
  const isNetWeight = 
    (measurementType === "Timbangan" && !hasWeighBridge) ||
    measurementType === "Bypass";

  // For Bypass, validate gross_weight
  if (measurementType === "Bypass") {
    if (!ritaseData.grossWeight || ritaseData.grossWeight.trim() === "") {
      e.grossWeight = "Masukkan gross weight";
    } else {
      const grossWeight = parseFloat(ritaseData.grossWeight);
      
      if (isNaN(grossWeight) || grossWeight <= 0) {
        e.grossWeight = "Gross weight harus lebih dari 0";
      } else {
        const grossWeightRegex = /^\d{0,3}(\.\d{0,2})?$/;
        if (!grossWeightRegex.test(ritaseData.grossWeight) || grossWeight > 199.99) {
          e.grossWeight = "Gross weight maksimal 199.99 ton";
        }
      }
    }
  } else if (measurementType !== "Bypass") {
    // For non-Bypass, validate weight
    if (!ritaseData.weight || ritaseData.weight.trim() === "") {
      e.weight = "Masukkan berat";
    } else {
      const weight = parseFloat(ritaseData.weight);
      
      if (isNaN(weight) || weight <= 0) {
        e.weight = "Berat harus lebih dari 0";
      } else if (isGrossWeight) {
        // Gross weight validation (max 199.99 ton, 3 digits)
        const grossWeightRegex = /^\d{0,3}(\.\d{0,2})?$/;
        if (!grossWeightRegex.test(ritaseData.weight) || weight > 199.99) {
          e.weight = "Berat maksimal 199.99 ton";
        }
      } else if (isNetWeight) {
        // Net weight validation (max 99.99 ton, 2 digits)
        const netWeightRegex = /^\d{0,2}(\.\d{0,2})?$/;
        if (!netWeightRegex.test(ritaseData.weight) || weight > 99.99) {
          e.weight = "Berat maksimal 99.99 ton";
        }
      }
    }
  }

  setErrors(e);
  return Object.keys(e).length === 0;
}, [ritaseData, user]);

const handleSave = useCallback(async () => {
  if (!validate()) {
    showToast.error("Mohon lengkapi semua field yang wajib diisi");
    return;
  }

  setIsSaving(true);
  try {
    // ✅ PERBAIKAN: Gunakan nama field yang sesuai dengan backend API
    const payload = {
      date: ritaseData.date,
      shift: ritaseData.shift,
      
      // Backend expects these field names:
      unit_exca: parseInt(ritaseData.excavator),
      loading_location: parseInt(ritaseData.loadingLocation),
      dumping_location: parseInt(ritaseData.dumpingLocation),
      coal_type: parseInt(ritaseData.coalType),
      pic_work_unit: parseInt(ritaseData.workUnit), // Backend mungkin expect 'pic_work_unit'
      unit_dump_truck: parseInt(ritaseData.dumpTruck),
      operator: parseInt(ritaseData.operator),
      
      measurement_type: ritaseData.measurementType,
      distance: parseFloat(ritaseData.distance) || 0,
      
      // Gabungkan date + time untuk created_at
      created_at: `${ritaseData.date}T${ritaseData.createdTime}:00`,
    };

    // ✅ CRITICAL FIX: Checker & Inspector dengan validasi proper
    if (ritaseData.checker && ritaseData.checker !== "") {
      const checkerId = parseInt(ritaseData.checker);
      if (!isNaN(checkerId)) {
        payload.checker = checkerId;
      }
    }
    
    if (ritaseData.inspector && ritaseData.inspector !== "") {
      const inspectorId = parseInt(ritaseData.inspector);
      if (!isNaN(inspectorId)) {
        payload.inspector = inspectorId;
      }
    }

    // Handle weight berdasarkan measurement type
    if (ritaseData.measurementType === "Bypass") {
      payload.gross_weight = parseFloat(ritaseData.grossWeight);
    } else {
      const hasWeighBridge = user?.weigh_bridge != null;
      if (hasWeighBridge) {
        payload.gross_weight = parseFloat(ritaseData.weight);
      } else {
        payload.net_weight = parseFloat(ritaseData.weight);
      }
    }

    const result = await onSave(payload);

    if (result?.success) {
      showToast.success("Data ritase berhasil ditambahkan");
      onClose();
    } else {
      throw new Error(result?.error || "Gagal menyimpan data");
    }
  } catch (err) {
    console.error("❌ Ritase save error:", err);
    const errorMsg = err?.message || "Gagal menyimpan data ritase";
    setErrors((p) => ({ ...p, submit: errorMsg }));
    showToast.error(errorMsg);
  } finally {
    setIsSaving(false);
  }
}, [validate, ritaseData, user, onSave, onClose]);
  // Prepare dropdown options
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
        label: wu.subsatker  || wu.satker || wu.name || `Work Unit #${wu.id}`,
        hint: wu.name && wu.satker !== wu.name ? wu.name : undefined,
      })),
    [masters?.workUnits],
  );

  const dumpTruckItems = useMemo(
    () =>
      (masters?.dumpTruck || []).map((e) => ({
        value: String(e.id),
        label: e.hull_no || e.name || `Dumptruck #${e.id}`,
        hint: [e.company, e.workUnit].filter(Boolean).join(" • "),
      })),
    [masters?.dumpTruck],
  );

  const operatorItems = useMemo(
    () =>
      (masters?.operators || []).map((ct) => ({
        value: String(ct.id),
        label: ct.name ?? "-",
        
      })),
    [masters?.operators],
  );

const userItems = useMemo(
  () =>
    (masters?.users || []).map((u) => ({
      value: String(u.id), // ✅ Ensure it's string for dropdown
      label: u.username || u.email || `User #${u.id}`,
      hint: u.email && u.username !== u.email ? u.email : undefined,
      role: u.role,
    })),
  [masters?.users],
);
            
            
const checkerItems = useMemo(() => {
  const measurementType = ritaseData.measurementType;
  
  
  const filtered = userItems.filter((u) => {
    const role = (u.role || "").toLowerCase();
    const label = (u.label || "").toLowerCase();
    
    // For Timbangan: allow Checker OR Operator_JT
    if (measurementType === "Timbangan") {
      return (
        role === "checker" ||
        role === "operator_jt" ||
        role.includes("checker") ||
        role.includes("operator") ||
        label.includes("checker") ||
        label.includes("operator jt")
      );
    }
    
    // For other types: only Checker
    return (
      role === "checker" ||
      role.includes("checker") ||
      label.includes("checker")
    );
  });
  
  return filtered;
}, [userItems, ritaseData.measurementType]);

const inspectorItems = useMemo(() => {
  
  const filtered = userItems.filter((u) => {
    const role = (u.role || "").toLowerCase();
    const label = (u.label || "").toLowerCase();
    
    return (
      role === "pengawas" ||
      role === "inspector" ||
      role.includes("pengawas") ||
      role.includes("inspector") ||
      label.includes("pengawas") ||
      label.includes("inspector")
    );
  });
  
  return filtered;
}, [userItems]);
       

  useEffect(() => {
    if (ritaseData.dumpTruck ) {
      const selectedTruck = dumpTruckItems.find(
        (truck) =>
          String(truck.id || truck.dumpTruckId) ===
          String(ritaseData.dumpTruck),
      );

      if (selectedTruck) {
        // Filter operators by company
        const truckCompanyId = selectedTruck.companyId;
        const filteredOperators = (masters?.operators || []).filter(
          (op) => String(op.companyId) === String(truckCompanyId),
        );
      }
    } 
  }, [ritaseData.dumpTruck, masters?.operators, dumpTruckItems]);

  if (!isOpen) return null;
  
  return (
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title="Input Data Ritase"
          subtitle="Tambahkan data ritase baru berdasarkan fleet configuration"
          icon={Settings}
          onClose={onClose}
          disabled={isSaving}
        />

        {mastersLoading && (
          <LoadingOverlay isVisible={true} message="Loading master data..." />
        )}

        {!mastersLoading && (
          <div className="p-6 space-y-6">
            {/* Fleet Info (Read-only) */}
            <InfoCard
              title="Informasi Fleet"
              variant="default"
              className="border-none bg-blue-50 dark:bg-blue-900/20"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Work Unit</Label>
                <SearchableSelect
                  items={workUnitItems}
                  value={ritaseData.workUnit}
                  onChange={(val) =>
                    setRitaseData((p) => ({ ...p, workUnit: val || "" }))
                  }
                  placeholder="Pilih work unit"
                  emptyText="Work unit tidak ditemukan"
                  error={!!errors.workUnit}
                  disabled={isSaving || !!selectedFleetConfig}
                />
                {errors.workUnit && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.workUnit}
                  </p>
                )}
              </div>

                            <div className="space-y-2">
                <Label className="dark:text-gray-300">Measurement Type</Label>
                <SearchableSelect
                  items={MEASUREMENT_TYPE_OPTIONS}
                  value={ritaseData.measurementType}
                  onChange={(val) =>
                    setRitaseData((p) => ({ ...p, measurementType: val || "" }))
                  }
                  placeholder="Pilih measurement type"
                  emptyText="Measurement type tidak ditemukan"
                  error={!!errors.measurementType}
                  disabled={isSaving || !!selectedFleetConfig}
                />
                {errors.measurementType && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.measurementType}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Excavator</Label>
                <SearchableSelect
                  items={excaItems}
                  value={ritaseData.excavator}
                  onChange={(val) =>
                    setRitaseData((p) => ({ ...p, excavator: val || "" }))
                  }
                  placeholder="Pilih excavator"
                  emptyText="Excavator tidak ditemukan"
                  error={!!errors.excavator}
                  disabled={isSaving || !!selectedFleetConfig}
                />
                {errors.excavator && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.excavator}
                  </p>
                )}
              </div>

                            <div className="space-y-2">
                <Label className="dark:text-gray-300">Coal Type</Label>
                <SearchableSelect
                  items={coalTypeItems}
                  value={ritaseData.coalType}
                  onChange={(val) =>
                    setRitaseData((p) => ({ ...p, coalType: val || "" }))
                  }
                  placeholder="Pilih coal type"
                  emptyText="Coal type tidak ditemukan"
                  error={!!errors.coalType}
                  disabled={isSaving || !!selectedFleetConfig}
                />
                {errors.coalType && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.coalType}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Loading Location</Label>
                <SearchableSelect
                  items={loadLocItems}
                  value={ritaseData.loadingLocation}
                  onChange={(val) =>
                    setRitaseData((p) => ({ ...p, loadingLocation: val || "" }))
                  }
                  placeholder="Pilih lokasi loading"
                  emptyText="Lokasi loading tidak ditemukan"
                  error={!!errors.loadingLocation}
                  disabled={isSaving || !!selectedFleetConfig}
                />
                {errors.loadingLocation && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.loadingLocation}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Dumping Location</Label>
                <SearchableSelect
                  items={dumpLocItems}
                  value={ritaseData.dumpingLocation}
                  onChange={(val) =>
                    setRitaseData((p) => ({ ...p, dumpingLocation: val || "" }))
                  }
                  placeholder="Pilih lokasi dumping"
                  emptyText="Lokasi dumping tidak ditemukan"
                  error={!!errors.dumpingLocation}
                  disabled={isSaving || !!selectedFleetConfig}
                />
                {errors.dumpingLocation && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.dumpingLocation}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Distance (m)</Label>
               <Input
                    type="text"
                    value={ritaseData.distance}
                     onChange={(e) => setRitaseData((p) => ({ ...p, distance: parseFloat(e.target.value) || 0 }))}
                    placeholder="Masukkan gross weight dalam ton"
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

            {/* Date & Shift */}
            <InfoCard
              title="Tanggal & Shift"
              icon={Calendar}
              variant="primary"
              className="border-none"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Tanggal *</Label>
                <Input
                  type="date"
                  value={ritaseData.date}
                  onChange={(e) =>
                    setRitaseData((p) => ({ ...p, date: e.target.value }))
                  }
                 max={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                  disabled={isSaving}
                  className="border-none dark:text-gray-300 dark:bg-gray-700"
                />
                {errors.date && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.date}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Shift *</Label>
                <SearchableSelect
                  items={SHIFT_OPTIONS}
                  value={ritaseData.shift}
                  onChange={(val) =>
                    setRitaseData((p) => ({ ...p, shift: val || "" }))
                  }
                  placeholder="Pilih shift"
                  emptyText="Shift tidak ditemukan"
                  error={!!errors.shift}
                  disabled={isSaving}
                />
                {errors.shift && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.shift}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Waktu Input *</Label>
                <Input
                  type="time"
                  value={ritaseData.createdTime}
                  onChange={(e) =>
                    setRitaseData((p) => ({ ...p, createdTime: e.target.value }))
                  }
                  disabled={isSaving}
                  className="border-none dark:text-gray-300 dark:bg-gray-700"
                />
                {errors.createdTime && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.createdTime}
                  </p>
                )}
              </div>
            </InfoCard>

            {/* Dump Truck & Operator */}
            <InfoCard
              title="Dump Truck & Operator"
              icon={Truck}
              variant="primary"
              className="border-none"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Dump Truck *</Label>
                <SearchableSelect
                  items={dumpTruckItems}
                  value={ritaseData.dumpTruck}
                  onChange={(val) => {
                    setRitaseData((p) => ({
                      ...p,
                      dumpTruck: val || "",
                      operator: "",
                    }));
                  }}
                  placeholder="Pilih dump truck"
                  emptyText={
                   "Tidak ada dump truck tersedia untuk fleet ini"
                    
                  }
                  error={!!errors.dumpTruck}
                  disabled={isSaving}
                />
                {errors.dumpTruck && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.dumpTruck}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Operator *</Label>
                <SearchableSelect
                  items={operatorItems}
                  value={ritaseData.operator}
                  onChange={(val) =>
                    setRitaseData((p) => ({ ...p, operator: val || "" }))
                  }
                  placeholder="Pilih operator"
                  emptyText={
                    "Pilih dump truck terlebih dahulu"
                  }
                  error={!!errors.operator}
                  disabled={
                    isSaving ||
                    !ritaseData.dumpTruck 
                  }
                />
                {errors.operator && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.operator}
                  </p>
                )}
              </div>
            </InfoCard>

<InfoCard
  title="Inspector & Checker"
  icon={UserCheck}
  variant="primary"
  className="border-none"
>
  <div className="space-y-2">
    <Label className="dark:text-gray-300">
      Inspector
    </Label>
    <SearchableSelect
      items={inspectorItems}
      value={ritaseData.inspector}
      onChange={(val) => {
        setRitaseData((p) => ({ ...p, inspector: val || "" }));
      }}
      placeholder="Pilih inspector"
      emptyText="Inspector tidak ditemukan"
      error={!!errors.inspector}
      disabled={isSaving || !!selectedFleetConfig}
    />
    {errors.inspector && (
      <p className="text-sm text-red-500 dark:text-red-400">
        {errors.inspector}
      </p>
    )}
  </div>

  <div className="space-y-2">
    <Label className="dark:text-gray-300">
      Checker
    </Label>
    <SearchableSelect
      items={checkerItems}
      value={ritaseData.checker}
      onChange={(val) => {
        setRitaseData((p) => ({ ...p, checker: val || "" }));
      }}
      placeholder="Pilih checker"
      emptyText="Checker tidak ditemukan"
      error={!!errors.checker}
      disabled={isSaving || !!selectedFleetConfig}
    />
    {errors.checker && (
      <p className="text-sm text-red-500 dark:text-red-400">
        {errors.checker}
      </p>
    )}
  </div>
</InfoCard>

            {/* Weight Input */}
            {ritaseData.measurementType === "Bypass" ? (
              // Bypass uses gross_weight
              <InfoCard title="Berat" variant="primary" className="border-none">
                <div className="md:col-span-2 space-y-2">
                  <Label className="dark:text-gray-300">
                   Berat Kotor (ton) *
                    <span className="text-xs text-gray-500 ml-2">(Max: 199.99 ton)</span>
                  </Label>
                  <Input
                    type="text"
                    value={ritaseData.grossWeight}
                    onChange={(e) => handleGrossWeightChange(e.target.value)}
                    placeholder="Masukkan gross weight dalam ton"
                    disabled={isSaving}
                    className="border-none dark:text-gray-300"
                  />
                  {errors.grossWeight && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {errors.grossWeight}
                    </p>
                  )}
                </div>
              </InfoCard>
            ) : ritaseData.measurementType && ritaseData.measurementType !== "Bypass" ? (
              // Other measurement types use weight
              <InfoCard title="Berat" variant="primary" className="border-none">
                <div className="md:col-span-2 space-y-2">
                  <Label className="dark:text-gray-300">
                    Berat Bersih (ton) *
                    {ritaseData.measurementType === "Timbangan" && user?.weigh_bridge != null && (
                      <span className="text-xs text-gray-500 ml-2">(Max: 199.99 ton)</span>
                    )}
                    {ritaseData.measurementType === "Timbangan" && user?.weigh_bridge == null && (
                      <span className="text-xs text-gray-500 ml-2">(Max: 99.99 ton)</span>
                    )}
                  </Label>
                  <Input
                    type="text"
                    value={ritaseData.weight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    placeholder="Masukkan berat dalam ton"
                    disabled={isSaving}
                    className="border-none dark:text-gray-300"
                  />
                  {errors.weight && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {errors.weight}
                    </p>
                  )}
                </div>
              </InfoCard>
            ) : null}

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
                disabled={isSaving}
                className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:text-gray-200 dark:hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Ritase"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <LoadingOverlay isVisible={isSaving} message="Menyimpan data ritase..." />
    </div>
  );
};

export default AggregatedInputModal;