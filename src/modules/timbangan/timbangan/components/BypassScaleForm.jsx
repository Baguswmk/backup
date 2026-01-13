import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Scale,
  AlertCircle,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Truck,
  User,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import useAuthStore from "@/modules/auth/store/authStore";
import { formatWeight } from "@/shared/utils/number";
import { showToast } from "@/shared/utils/toast";
import { getFirstTruthyValue } from "@/shared/utils/object";

const BypassScaleForm = ({ 
  onSubmit, 
  editingItem, 
  mode = "create", 
  isSubmitting = false 
}) => {
  const { user } = useAuthStore();
  
  // ✅ USE FLEET DATA (already cached & filtered)
  const { 
    activeFleetConfigs,  // Fleet yang sudah ACTIVE
    isLoading: isFleetLoading 
  } = useFleet(user ? { user } : null);

  // ✅ USE MASTER DATA (already cached)
  const { 
    data: dumpTrucks, 
    isLoading: isDumpTrucksLoading 
  } = useMasterData("units");

  const { 
    data: operators, 
    isLoading: isOperatorsLoading 
  } = useMasterData("operators");

  // Form State
  const [formData, setFormData] = useState({
    setting_fleet_id: "",
    unit_dump_truck: "",
    operator: "",
    net_weight: "",
    createdAt: new Date().toISOString(),
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [currentFleet, setCurrentFleet] = useState(null);

  const isEditMode = mode === "edit";

  // ✅ FLEET OPTIONS - dari useFleet (activeFleetConfigs)
  const fleetOptions = useMemo(() => {
    return activeFleetConfigs.map((fleet) => ({
      value: fleet.id,
      label: fleet.name,
      hint: `${fleet.shift} | ${fleet.excavator}`,
      __data: fleet,
    }));
  }, [activeFleetConfigs]);

  // ✅ DUMP TRUCK OPTIONS - dari useMasterData
  // Filter hanya DUMP_TRUCK type
  const dumptruckOptions = useMemo(() => {
    if (!dumpTrucks || dumpTrucks.length === 0) return [];

    // Filter by type DUMP_TRUCK
    const filteredDT = dumpTrucks.filter(dt => 
      dt.type === "DUMP_TRUCK" || !dt.type // fallback jika type tidak ada
    );

    return filteredDT.map((dt) => ({
      value: dt.id.toString(),
      label: dt.hull_no,
      hint: `${dt.company || "-"}`,
      __data: dt,
    }));
  }, [dumpTrucks]);

  // ✅ OPERATOR OPTIONS - dari useMasterData
  const operatorOptions = useMemo(() => {
    if (!operators || operators.length === 0) return [];

    return operators.map((op) => ({
      value: op.id.toString(),
      label: op.name,
      hint: op.company || "-",
      __data: op,
    }));
  }, [operators]);

  // ✅ AUTO-FILL OPERATOR berdasarkan fleet units (jika ada pair DT-Operator)
  const getOperatorForDumptruck = (dumptruckId) => {
    if (!currentFleet || !currentFleet.units) return null;

    const unit = currentFleet.units.find(
      (u) => u.dumpTruckId === dumptruckId
    );

    return unit?.operatorId || null;
  };

  // Initialize edit mode
  useEffect(() => {
    if (isEditMode && editingItem) {
      setFormData({
        setting_fleet_id: editingItem.setting_fleet_id || "",
        unit_dump_truck: getFirstTruthyValue(editingItem, "dumptruckId", "unit_dump_truck", "dumptruck", "hull_no"),
        operator: getFirstTruthyValue(editingItem, "operatorId", "operator", "operatorName"),
        net_weight: editingItem.net_weight?.toString() || "",
        createdAt: editingItem.createdAt || new Date().toISOString(),
      });
    }
  }, [isEditMode, editingItem]);

  // Update field
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Handle fleet selection
  const handleFleetChange = (fleetId) => {
    const fleet = activeFleetConfigs.find((f) => f.id === fleetId);
    
    if (fleet) {
      setCurrentFleet(fleet);
      updateField("setting_fleet_id", fleetId);
      
      // Reset dependent fields
      setFormData((prev) => ({
        ...prev,
        unit_dump_truck: "",
        operator: "",
      }));
    } else {
      setCurrentFleet(null);
    }
  };

  // Handle dump truck selection
  const handleDumptruckChange = (dumptruckId) => {
    updateField("unit_dump_truck", dumptruckId);

    // ✅ AUTO-FILL OPERATOR dari fleet units (jika ada pair)
    const operatorId = getOperatorForDumptruck(dumptruckId);
    if (operatorId) {
      updateField("operator", operatorId);
    }
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.setting_fleet_id) {
      newErrors.setting_fleet_id = "Fleet wajib dipilih";
    }

    if (!formData.unit_dump_truck) {
      newErrors.unit_dump_truck = "Dump truck wajib dipilih";
    }

    if (!formData.net_weight || parseFloat(formData.net_weight) <= 0) {
      newErrors.net_weight = "Net weight harus lebih dari 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!validateForm()) {
      showToast.error("Mohon lengkapi form dengan benar");
      return;
    }

    // ✅ GET DATA dari master data yang sudah di-load
    const selectedDT = dumptruckOptions.find(
      (dt) => dt.value === formData.unit_dump_truck
    );
    const selectedOp = operatorOptions.find(
      (op) => op.value === formData.operator
    );

    // Prepare submission data
    const submissionData = {
      setting_fleet: parseInt(formData.setting_fleet_id),
      unit_dump_truck: parseInt(formData.unit_dump_truck),
      operator: formData.operator ? parseInt(formData.operator) : null,
      net_weight: parseFloat(formData.net_weight),
      clientCreatedAt: formData.createdAt,
      created_by_user: user?.id || null,
      
      // Additional data for display
      hull_no: selectedDT?.label || "",
      operator_name: selectedOp?.label || "",
      fleet_name: currentFleet?.name || "",
      fleet_excavator: currentFleet?.excavator || "",
      fleet_shift: currentFleet?.shift || "",
      fleet_date: currentFleet?.date || "",
      fleet_loading: currentFleet?.loadingLocation || "",
      fleet_dumping: currentFleet?.dumpingLocation || "",
      fleet_coal_type: currentFleet?.coalType || "",
      dumptruck_company: selectedDT?.__data?.company || "",
      operator_company: selectedOp?.__data?.company || "",
    };

    if (onSubmit) {
      const result = await onSubmit(submissionData);
      
      if (result?.success && !isEditMode) {
        // Reset form on successful create
        setFormData({
          setting_fleet_id: "",
          unit_dump_truck: "",
          operator: "",
          net_weight: "",
          createdAt: new Date().toISOString(),
        });
        setCurrentFleet(null);
        setTouched({});
      }
    }
  };

  // Reset
  const handleReset = () => {
    setFormData({
      setting_fleet_id: "",
      unit_dump_truck: "",
      operator: "",
      net_weight: "",
      createdAt: new Date().toISOString(),
    });
    setCurrentFleet(null);
    setErrors({});
    setTouched({});
  };

  // ✅ LOADING STATE
  const isLoadingData = isFleetLoading || isDumpTrucksLoading || isOperatorsLoading;

  if (isLoadingData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Info Card */}
      {!isEditMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Belt Scale Entry (Bypass Mode)
                </h3>
                <p className="text-xs text-blue-700">
                  Data fleet, dump truck, dan operator diambil dari master data yang sudah tersedia.
                  Pilih fleet aktif, kemudian pilih dump truck dan masukkan net weight.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="w-5 h-5" />
              {isEditMode ? "Edit Belt Scale Entry" : "Input Belt Scale Entry"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fleet Selection */}
            <div>
              <Label>Fleet Aktif *</Label>
              <SearchableSelect
                items={fleetOptions}
                value={formData.setting_fleet_id}
                onChange={handleFleetChange}
                placeholder="Pilih fleet aktif..."
                error={!!errors.setting_fleet_id}
                disabled={isEditMode}
              />
              {errors.setting_fleet_id && (
                <p className="text-sm text-red-500 mt-1">{errors.setting_fleet_id}</p>
              )}
              {fleetOptions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Tidak ada fleet aktif. Pastikan ada fleet dengan status ACTIVE.
                </p>
              )}
            </div>

            {/* Fleet Info Display */}
            {currentFleet && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Fleet: {currentFleet.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Excavator:</span>
                      <div className="font-semibold">{currentFleet.excavator}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Shift:</span>
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {currentFleet.shift}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Loading:</span>
                      <div className="font-medium text-blue-600">
                        {currentFleet.loadingLocation}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Dumping:</span>
                      <div className="font-medium text-red-600">
                        {currentFleet.dumpingLocation}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dump Truck Selection */}
            <div>
              <Label className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Dump Truck *
              </Label>
              <SearchableSelect
                items={dumptruckOptions}
                value={formData.unit_dump_truck}
                onChange={handleDumptruckChange}
                placeholder="Pilih dump truck dari master data..."
                error={!!errors.unit_dump_truck}
                disabled={isEditMode}
              />
              {errors.unit_dump_truck && (
                <p className="text-sm text-red-500 mt-1">{errors.unit_dump_truck}</p>
              )}
              {dumptruckOptions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Tidak ada dump truck di master data.
                </p>
              )}
            </div>

            {/* Operator Selection */}
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Operator
              </Label>
              <SearchableSelect
                items={operatorOptions}
                value={formData.operator}
                onChange={(value) => updateField("operator", value)}
                placeholder="Pilih operator dari master data..."
                disabled={isEditMode}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional - Operator akan otomatis terisi jika ada pair dengan dump truck di fleet
              </p>
            </div>

            {/* Net Weight */}
            <div>
              <Label htmlFor="net_weight">Net Weight (ton) *</Label>
              <Input
                id="net_weight"
                type="text"
                inputMode="decimal"
                value={formData.net_weight}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue <= 9999.99) {
                      updateField("net_weight", value);
                    }
                  }
                }}
                className={errors.net_weight ? "border-red-500" : ""}
                placeholder="0.00"
              />
              {errors.net_weight && (
                <p className="text-sm text-red-500 mt-1">{errors.net_weight}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maksimal 9999.99 ton
              </p>
            </div>

            {/* Timestamp Display */}
            <div className="pt-2 border-t">
              <Label className="text-xs text-gray-600">Waktu Input</Label>
              <div className="font-mono text-sm font-medium text-gray-800 mt-1">
                {format(new Date(formData.createdAt), "dd/MM/yyyy HH:mm:ss", {
                  locale: localeId,
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {formData.setting_fleet_id && formData.unit_dump_truck && formData.net_weight && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Ready to Submit
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {formatWeight(formData.net_weight)} ton
                  </div>
                  <div className="text-xs text-gray-600">
                    {dumptruckOptions.find((dt) => dt.value === formData.unit_dump_truck)?.label || "-"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-1">
                Mohon perbaiki {Object.keys(errors).length} kesalahan berikut:
              </p>
              <ul className="text-sm space-y-1 mt-2">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>

              <div className="flex items-center gap-2">
                {onSubmit && !isEditMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onSubmit({ cancelled: true })}
                    disabled={isSubmitting}
                    className="cursor-pointer"
                  >
                    Batal
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="min-w-30 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isEditMode ? "Update" : "Simpan"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default BypassScaleForm;