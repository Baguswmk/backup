import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Copy } from "lucide-react";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";

const SHIFT_OPTIONS = [
  { value: "Shift 1", label: "Shift 1 (22:00 - 06:00)" },
  { value: "Shift 2", label: "Shift 2 (06:00 - 14:00)" },
  { value: "Shift 3", label: "Shift 3 (14:00 - 22:00)" },
];

const RitaseDuplicateForm = ({ sourceRitase, onSubmit, onCancel }) => {
  const { user } = useAuthStore();
  const { masters, mastersLoading } = useFleet(user ? { user } : null, null);
  const [formData, setFormData] = useState({
    unit_dump_truck: "",
    gross_weight: "",
    net_weight: "",
    operator: "",
    date: new Date().toISOString().split('T')[0],
    shift: sourceRitase.shift || "Shift 1",
    checker: sourceRitase.checker,
    inspector:sourceRitase.inspector
  });

  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
const [submitError, setSubmitError] = useState(null);

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
      (masters?.operators || []).map((op) => ({
        value: String(op.id),
        label: op.name ?? "-",
      })),
    [masters?.operators],
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const measurementType = sourceRitase.measurement_type || sourceRitase.measurementType;
  const hasWeighBridge = user?.weigh_bridge != null;
  
  const needsGrossWeight = measurementType === "Timbangan" && hasWeighBridge;
  const needsNetWeight = measurementType === "Timbangan" && !hasWeighBridge;
  const needsNoWeight = measurementType === "Bypass" || measurementType === "Beltscale";

  const handleWeightChange = useCallback(
    (value) => {
      let formattedValue = value.replace(/,/g, ".");

      const netWeightRegex = /^\d{0,2}(\.\d{0,2})?$/;
      const grossWeightRegex = /^\d{0,3}(\.\d{0,2})?$/;

      let isValid = false;
      if (formattedValue === "") {
        isValid = true;
      } else if (needsGrossWeight) {
        isValid = grossWeightRegex.test(formattedValue);
        const numValue = parseFloat(formattedValue);
        if (!isNaN(numValue) && numValue > 199.99) {
          isValid = false;
        }
      } else if (needsNetWeight) {
        isValid = netWeightRegex.test(formattedValue);
        const numValue = parseFloat(formattedValue);
        if (!isNaN(numValue) && numValue > 99.99) {
          isValid = false;
        }
      } else {
        isValid = /^\d*\.?\d*$/.test(formattedValue);
      }

      if (isValid) {
        if (needsGrossWeight) {
          setFormData((p) => ({ ...p, gross_weight: formattedValue }));
        } else if (needsNetWeight) {
          setFormData((p) => ({ ...p, net_weight: formattedValue }));
        }
        setErrors((prev) => ({ ...prev, weight: null }));
      }
    },
    [needsGrossWeight, needsNetWeight],
  );

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.unit_dump_truck?.trim()) {
      newErrors.unit_dump_truck = "Dump truck harus dipilih";
    }
    
    if (!formData.operator?.trim()) {
      newErrors.operator = "Operator harus dipilih";
    }
    
    if (!formData.date) {
      newErrors.date = "Tanggal harus diisi";
    }
    
    if (!formData.shift) {
      newErrors.shift = "Shift harus dipilih";
    }

    if (needsGrossWeight) {
      if (!formData.gross_weight || formData.gross_weight.trim() === "") {
        newErrors.weight = "Berat kotor wajib diisi untuk Jembatan Timbang";
      } else {
        const grossWeight = parseFloat(formData.gross_weight);
        
        if (isNaN(grossWeight) || grossWeight <= 0) {
          newErrors.weight = "Berat kotor harus lebih dari 0";
        } else {
          const grossWeightRegex = /^\d{0,3}(\.\d{0,2})?$/;
          if (!grossWeightRegex.test(formData.gross_weight) || grossWeight > 199.99) {
            newErrors.weight = "Berat kotor maksimal 199.99 ton";
          }
        }
      }
    } else if (needsNetWeight) {
      if (!formData.net_weight || formData.net_weight.trim() === "") {
        newErrors.weight = "Berat bersih wajib diisi untuk timbangan manual";
      } else {
        const netWeight = parseFloat(formData.net_weight);
        
        if (isNaN(netWeight) || netWeight <= 0) {
          newErrors.weight = "Berat bersih harus lebih dari 0";
        } else {
          const netWeightRegex = /^\d{0,2}(\.\d{0,2})?$/;
          if (!netWeightRegex.test(formData.net_weight) || netWeight > 99.99) {
            newErrors.weight = "Berat bersih maksimal 99.99 ton";
          }
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, needsGrossWeight, needsNetWeight]);

  const handleSubmit = async () => {
    if (!validateForm()) {
      console.error("❌ [4] Validasi form gagal, errors:", errors);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const selectedDumpTruck = masters?.dumpTruck?.find(
        dt => String(dt.id) === String(formData.unit_dump_truck)
      );
      
      const selectedOperator = masters?.operators?.find(
        op => String(op.id) === String(formData.operator)
      );
      
      const tare_weight = selectedDumpTruck?.tare_weight || 0;
      
      const duplicatedData = {
        unit_dump_truck: selectedDumpTruck?.hull_no || selectedDumpTruck?.name || "",
        operator: selectedOperator?.name || "",
        date: formData.date,
        shift: formData.shift,
        company:selectedDumpTruck?.company,
        tare_weight: selectedDumpTruck.tare_weight,
        unit_exca: sourceRitase.unit_exca,
        loading_location: sourceRitase.loading_location,
        dumping_location: sourceRitase.dumping_location,
        measurement_type: measurementType,
        distance: parseFloat(sourceRitase.distance) || 0,
        coal_type: sourceRitase.coal_type,
        pic_work_unit: sourceRitase.pic_work_unit,
        pic_dumping_point: sourceRitase.pic_dumping_point,
        pic_loading_point: sourceRitase.pic_loading_point,
        checker: sourceRitase.checker,
        inspector: sourceRitase.inspector,
        
        // Field opsional
        id_setting_fleet: sourceRitase.id_setting_fleet || null,
        weigh_bridge: sourceRitase.weigh_bridge || null,
        spph: sourceRitase.spph || null,
      };

      if (measurementType === "Timbangan") {
        if (hasWeighBridge) {
          const grossWeight = parseFloat(formData.gross_weight);
          const netWeight = grossWeight - tare_weight;
          
          duplicatedData.gross_weight = grossWeight;
          duplicatedData.net_weight = netWeight;
        } else {
          const netWeight = parseFloat(formData.net_weight);
          const grossWeight = netWeight + tare_weight;
          
          duplicatedData.net_weight = netWeight;
          duplicatedData.gross_weight = grossWeight;
        }
      }

      if (typeof onSubmit === 'function') {
        await onSubmit(duplicatedData);
      } else {
        console.error("❌ [9] onSubmit bukan function!", typeof onSubmit);
      }
      
    } catch (error) {
      console.error("❌ [ERROR] Exception di RitaseDuplicateForm:", error);
      console.error("❌ Error stack:", error.stack);
      setSubmitError(error.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine label dan max value untuk weight field
  const weightLabel = needsGrossWeight
    ? "Berat Kotor (ton)"
    : needsNetWeight
    ? "Berat Bersih (ton)"
    : null;

  const weightMaxHint = needsGrossWeight
    ? "(Max: 199.99 ton)"
    : needsNetWeight
    ? "(Max: 99.99 ton)"
    : null;

  const currentWeightValue = needsGrossWeight
    ? formData.gross_weight
    : needsNetWeight
    ? formData.net_weight
    : "";

  const weightPlaceholder = needsGrossWeight
    ? "Masukkan berat kotor"
    : needsNetWeight
    ? "Masukkan berat bersih"
    : "";

  return (
    <div className="space-y-6">
      {/* Info Alert tentang Bypass/Beltscale */}
      {needsNoWeight && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{measurementType}:</strong> Berat akan otomatis diambil dari tonase rata-rata dump truck
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dump Truck - SearchableSelect */}
        <div className="space-y-2">
          <Label className="dark:text-gray-200">
            Dump Truck <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            items={dumpTruckItems}
            value={formData.unit_dump_truck}
            onChange={(val) => {
              handleChange("unit_dump_truck", val || "");
              handleChange("operator", "");
            }}
            placeholder="Pilih dump truck"
            emptyText={mastersLoading ? "Loading..." : "Dump truck tidak ditemukan"}
            error={!!errors.unit_dump_truck}
            disabled={isSubmitting || mastersLoading}
          />
          {errors.unit_dump_truck && (
            <p className="text-sm text-red-500">{errors.unit_dump_truck}</p>
          )}
        </div>

        {/* Weight Input - HANYA untuk Timbangan */}
        {!needsNoWeight && (
          <div className="space-y-2">
            <Label className="dark:text-gray-200">
              {weightLabel} <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">{weightMaxHint}</span>
            </Label>
            <Input
              type="text"
              value={currentWeightValue}
              onChange={(e) => handleWeightChange(e.target.value)}
              placeholder={weightPlaceholder}
              disabled={isSubmitting}
              className={`dark:bg-slate-800 dark:text-gray-100 ${
                errors.weight ? "border-red-500" : ""
              }`}
            />
            {errors.weight && (
              <p className="text-sm text-red-500">{errors.weight}</p>
            )}
          </div>
        )}

        {/* Operator - SearchableSelect */}
        <div className="space-y-2">
          <Label className="dark:text-gray-200">
            Operator <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            items={operatorItems}
            value={formData.operator}
            onChange={(val) => handleChange("operator", val || "")}
            placeholder="Pilih operator"
            emptyText={
              !formData.unit_dump_truck 
                ? "Pilih dump truck terlebih dahulu" 
                : mastersLoading 
                  ? "Loading..." 
                  : "Operator tidak ditemukan"
            }
            error={!!errors.operator}
            disabled={isSubmitting || mastersLoading || !formData.unit_dump_truck}
          />
          {errors.operator && (
            <p className="text-sm text-red-500">{errors.operator}</p>
          )}
        </div>

        {/* Tanggal */}
        <div className="space-y-2">
          <Label htmlFor="date" className="dark:text-gray-200">
            Tanggal <span className="text-red-500">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            disabled={isSubmitting}
            className={`dark:bg-slate-800 dark:text-gray-100 ${
              errors.date ? "border-red-500" : ""
            }`}
          />
          {errors.date && (
            <p className="text-sm text-red-500">{errors.date}</p>
          )}
        </div>

        {/* Shift - SearchableSelect */}
        <div className="space-y-2 md:col-span-2">
          <Label className="dark:text-gray-200">
            Shift <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            items={SHIFT_OPTIONS}
            value={formData.shift}
            onChange={(val) => handleChange("shift", val || "")}
            placeholder="Pilih shift"
            emptyText="Shift tidak ditemukan"
            error={!!errors.shift}
            disabled={isSubmitting}
          />
          {errors.shift && (
            <p className="text-sm text-red-500">{errors.shift}</p>
          )}
        </div>
      </div>

      {/* Data Sumber (Read-only preview) */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Data yang akan diambil otomatis:
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Excavator:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {sourceRitase.unit_exca}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Company:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {sourceRitase.company}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Loading:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {sourceRitase.loading_location}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Dumping:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {sourceRitase.dumping_location}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Type:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {measurementType}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Distance:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {sourceRitase.distance} m
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || mastersLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Duplikat"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 dark:text-gray-200"
        >
          Batal
        </Button>
      </div>
    </div>
  );
};

export default RitaseDuplicateForm;