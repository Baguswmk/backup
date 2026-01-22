import React, { useMemo } from "react";
import { useRitaseForm } from "@/modules/timbangan/ritase/hooks/useRitaseForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Badge } from "@/shared/components/ui/badge";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Truck,
  AlertCircle,
  Save,
  X,
  Weight,
  MapPin,
  Calendar as CalendarIcon,
  Loader2,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { Calendar } from "@/shared/components/ui/calendar";
import { showToast } from "@/shared/utils/toast";

const RitaseEditForm = ({
  editingItem,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const { user } = useAuthStore();
  const { masters } = useFleet(user ? { user } : null);

  const {
    formData,
    errors,
    isValid,
    isLoading,
    updateField,
    validateField,
    handleSubmit,
  } = useRitaseForm(editingItem, "edit", masters);

  // Dropdown options
  const loadingLocationOptions = useMemo(() => {
    return (masters.loadingLocations || []).map((loc) => ({
      value: loc.name,
      label: loc.name,
      hint: loc.type,
    }));
  }, [masters.loadingLocations]);

  const dumpingLocationOptions = useMemo(() => {
    return (masters.dumpingLocations || []).map((loc) => ({
      value: loc.name,
      label: loc.name,
      hint: loc.type,
    }));
  }, [masters.dumpingLocations]);

  const dumptruckOptions = useMemo(() => {
    return (masters.dumpTruck || []).map((dt) => ({
      value: dt.hull_no || dt.hullNo,
      label: dt.hull_no || dt.hullNo,
      hint: `${dt.company || dt.contractor || "-"}`,
    }));
  }, [masters.dumpTruck]);

  const excavatorOptions = useMemo(() => {
    return (masters.excavators || []).map((ex) => ({
      value: ex.hull_no || ex.name,
      label: ex.hull_no || ex.name,
      hint: ex.company || "-",
    }));
  }, [masters.excavators]);

  const shiftOptions = useMemo(() => {
    return (masters.shifts || []).map((s) => ({
      value: s.name,
      label: s.name,
      hint: s.hours,
    }));
  }, [masters.shifts]);

  const coalTypeOptions = useMemo(() => {
    return (masters.coalTypes || []).map((ct) => ({
      value: ct.name,
      label: ct.name,
      hint: "",
    }));
  }, [masters.coalTypes]);

  const workUnitOptions = useMemo(() => {
    return (masters.workUnits || []).map((wu) => ({
      value: wu.subsatker,
      label: wu.subsatker,
      hint: wu.satker,
    }));
  }, [masters.workUnits]);

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    try {
      const result = await handleSubmit();

      if (result?.success && result?.data) {
        showToast.success("Data berhasil diupdate");
        if (onSubmit) {
          onSubmit(result);
        }
      }
    } catch (err) {
      console.error("Error updating ritase:", err);
      
      const isValidation =
        err?.validationError ||
        (err?.response?.status >= 400 && err?.response?.status < 500);

      if (isValidation) {
        showToast.error(err?.message || "Validasi gagal. Periksa input Anda.");
      } else {
        const errorMsg = err?.message || "Gagal mengupdate data";
        showToast.error(errorMsg);
      }
    }
  };

  return (
    <div className="w-full mx-auto space-y-4">
      {/* Original Data Info */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4" />
            Data Original
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Dibuat:</span>
                <span className="font-medium ml-2 dark:text-gray-200">
                  {editingItem?.createdAt
                    ? format(
                        new Date(editingItem.createdAt),
                        "dd MMM yyyy | HH:mm:ss",
                        { locale: localeId }
                      )
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Original Date:</span>
                <span className="font-medium ml-2 dark:text-gray-200">
                  {editingItem?.date || "-"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Weight Data */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm dark:text-gray-200">
              <Weight className="w-4 h-4" />
              Weight Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="gross_weight_edit" className="pb-2 dark:text-gray-300">
                  Gross Weight (ton) *
                </Label>
                <Input
                  id="gross_weight_edit"
                  type="text"
                  inputMode="decimal"
                  value={formData.gross_weight}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      updateField("gross_weight", value);
                      return;
                    }
                    const regex = /^\d*\.?\d{0,2}$/;
                    if (!regex.test(value)) return;
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 999.99) return;
                    updateField("gross_weight", value);
                  }}
                  onBlur={() => validateField("gross_weight")}
                  className={`dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                    errors.gross_weight ? "border-red-500" : ""
                  }`}
                  placeholder="0.00"
                />
                {errors.gross_weight && (
                  <p className="text-sm text-red-500 mt-1">{errors.gross_weight}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maksimal 999.99 ton
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unit Information */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm dark:text-gray-200">
              <Truck className="w-4 h-4" />
              Unit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="pb-2 dark:text-gray-300">Unit Dump Truck *</Label>
                <SearchableSelect
                  items={dumptruckOptions}
                  value={formData.unit_dump_truck}
                  onChange={(value) => updateField("unit_dump_truck", value)}
                  placeholder="Pilih dump truck..."
                  error={!!errors.unit_dump_truck}
                />
                {errors.unit_dump_truck && (
                  <p className="text-sm text-red-500 mt-1">{errors.unit_dump_truck}</p>
                )}
              </div>

              <div>
                <Label className="pb-2 dark:text-gray-300">Unit Excavator *</Label>
                <SearchableSelect
                  items={excavatorOptions}
                  value={formData.unit_exca}
                  onChange={(value) => updateField("unit_exca", value)}
                  placeholder="Pilih excavator..."
                  error={!!errors.unit_exca}
                />
                {errors.unit_exca && (
                  <p className="text-sm text-red-500 mt-1">{errors.unit_exca}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm dark:text-gray-200">
              <MapPin className="w-4 h-4" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="pb-2 dark:text-gray-300">Loading Location *</Label>
                <SearchableSelect
                  items={loadingLocationOptions}
                  value={formData.loading_location}
                  onChange={(value) => updateField("loading_location", value)}
                  placeholder="Pilih loading location..."
                  error={!!errors.loading_location}
                />
                {errors.loading_location && (
                  <p className="text-sm text-red-500 mt-1">{errors.loading_location}</p>
                )}
              </div>

              <div>
                <Label className="pb-2 dark:text-gray-300">Dumping Location *</Label>
                <SearchableSelect
                  items={dumpingLocationOptions}
                  value={formData.dumping_location}
                  onChange={(value) => updateField("dumping_location", value)}
                  placeholder="Pilih dumping location..."
                  error={!!errors.dumping_location}
                />
                {errors.dumping_location && (
                  <p className="text-sm text-red-500 mt-1">{errors.dumping_location}</p>
                )}
              </div>

              <div>
                <Label className="pb-2 dark:text-gray-300">PIC Work Unit *</Label>
                <SearchableSelect
                  items={workUnitOptions}
                  value={formData.pic_work_unit}
                  onChange={(value) => updateField("pic_work_unit", value)}
                  placeholder="Pilih work unit..."
                  error={!!errors.pic_work_unit}
                />
                {errors.pic_work_unit && (
                  <p className="text-sm text-red-500 mt-1">{errors.pic_work_unit}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm dark:text-gray-200">
              <CalendarIcon className="w-4 h-4" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="pb-2 dark:text-gray-300" htmlFor="distance">
                  Distance (m) *
                </Label>
                <Input
                  id="distance"
                  type="number"
                  value={formData.distance}
                  onChange={(e) => updateField("distance", e.target.value)}
                  className={`dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                    errors.distance ? "border-red-500" : ""
                  }`}
                />
                {errors.distance && (
                  <p className="text-sm text-red-500 mt-1">{errors.distance}</p>
                )}
              </div>

              <div>
                <Label className="pb-2 dark:text-gray-300">Coal Type *</Label>
                <SearchableSelect
                  items={coalTypeOptions}
                  value={formData.coal_type}
                  onChange={(value) => updateField("coal_type", value)}
                  placeholder="Pilih coal type..."
                  error={!!errors.coal_type}
                />
                {errors.coal_type && (
                  <p className="text-sm text-red-500 mt-1">{errors.coal_type}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Errors */}
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

        {/* Action Buttons */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                Batal
              </Button>

              <Button
                type="submit"
                disabled={!isValid || isSubmitting || isLoading}
                className="gap-2 min-w-30 dark:text-neutral-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default RitaseEditForm;