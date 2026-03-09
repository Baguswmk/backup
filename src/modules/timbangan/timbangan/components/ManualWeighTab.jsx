import React, { useCallback, useMemo, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Truck,
  Weight,
  Save,
  Loader2,
  MapPin,
  Pickaxe,
  Ruler,
  Flame,
  User,
  ClipboardList,
} from "lucide-react";
import { useManualWeighHooks } from "../hooks/useManualWeighHooks";
import PendingWeighList from "./PendingWeighList";

const WEIGHT_REGEX = /^\d{0,3}(\.\d{0,2})?$/;
const WEIGHT_MAX = 199.99;

const ManualWeighTab = ({ scale }) => {
  const {
    mastersLoading,
    excavatorOptions,
    loadingLocationOptions,
    dumpingLocationOptions,
    coalTypeOptions,
    measurementTypeOptions,
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    handleSubmit,
    weighList,
    isListLoading,
    loadWeighList,
    editingId,
    editTareWeight,
    setEditTareWeight,
    isUpdating,
    startEditTare,
    cancelEditTare,
    handleTareSubmit,
  } = useManualWeighHooks();

  // ─── Sync scale weight → gross_weight (same pattern as TimbanganInputCard) ──
  useEffect(() => {
    if (scale?.isConnected) {
      const activeWeight = scale.lockedWeight ?? scale.currentWeight;
      if (activeWeight != null) {
        const weightInTons = parseFloat(activeWeight) / 1000;
        if (!isNaN(weightInTons) && weightInTons <= WEIGHT_MAX) {
          setFormData((prev) => ({
            ...prev,
            gross_weight: weightInTons.toFixed(2),
          }));
        }
      }
    }
  }, [scale?.lockedWeight, scale?.currentWeight, scale?.isConnected, setFormData]);

  // ─── Weight validated handler (reusable for gross & tare) ────────────
  const handleWeightChange = useCallback(
    (field) => (e) => {
      let value = e.target.value.replace(/,/g, ".");
      if (value === "") {
        setFormData((prev) => ({ ...prev, [field]: "" }));
        setErrors((prev) => ({ ...prev, [field]: null }));
        return;
      }
      if (!WEIGHT_REGEX.test(value)) return;
      const num = parseFloat(value);
      if (!isNaN(num) && num > WEIGHT_MAX) {
        setErrors((prev) => ({
          ...prev,
          [field]: `Maksimal ${WEIGHT_MAX} ton`,
        }));
        return;
      }
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: null }));
    },
    [setFormData, setErrors],
  );

  // ─── Distance handler ────────────────────────────────────────────────
  const handleDistanceChange = useCallback(
    (e) => {
      const value = e.target.value.replace(/,/g, ".");
      if (value === "" || /^\d{0,5}(\.\d{0,2})?$/.test(value)) {
        setFormData((prev) => ({ ...prev, distance: value }));
      }
    },
    [setFormData],
  );

  // Calculated net weight preview
  const calculatedNet = useMemo(() => {
    if (!formData.gross_weight || !formData.tare_weight) return null;
    const gross = parseFloat(formData.gross_weight);
    const tare = parseFloat(formData.tare_weight);
    if (isNaN(gross) || isNaN(tare) || tare >= gross) return null;
    return (gross - tare).toFixed(2);
  }, [formData.gross_weight, formData.tare_weight]);

  if (mastersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-600 dark:text-gray-400">
          Memuat data master...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════ FORM TIMBANG MANUAL ═══════ */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Scale Controls */}

        {/* Row 1: Unit DT (Nomor Polisi) + Operator — manual text input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <Truck className="w-4 h-4" /> Unit DT (Nomor Polisi)
            </Label>
            <Input
              type="text"
              placeholder="Ketik nomor polisi..."
              value={formData.unit_dump_truck}
              onChange={(e) => {
                setFormData((p) => ({ ...p, unit_dump_truck: e.target.value }));
                setErrors((p) => ({ ...p, unit_dump_truck: null }));
              }}
              disabled={isSubmitting}
              className={`bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.unit_dump_truck ? "border-red-500 dark:border-red-400" : ""
              }`}
            />
            {errors.unit_dump_truck && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.unit_dump_truck}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <User className="w-4 h-4" /> Operator
            </Label>
            <Input
              type="text"
              placeholder="Ketik nama operator..."
              value={formData.operator}
              onChange={(e) => {
                setFormData((p) => ({ ...p, operator: e.target.value }));
                setErrors((p) => ({ ...p, operator: null }));
              }}
              disabled={isSubmitting}
              className={`bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.operator ? "border-red-500 dark:border-red-400" : ""
              }`}
            />
            {errors.operator && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.operator}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Excavator */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
            <Pickaxe className="w-4 h-4" /> Excavator
          </Label>
          <SearchableSelect
            items={excavatorOptions}
            value={formData.excavator}
            onChange={(v) => {
              setFormData((p) => ({ ...p, excavator: v }));
              setErrors((p) => ({ ...p, excavator: null }));
            }}
            placeholder="Pilih excavator..."
            error={!!errors.excavator}
            disabled={isSubmitting}
          />
          {errors.excavator && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.excavator}
            </p>
          )}
        </div>

        {/* Row 3: Loading Location + Dumping Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <MapPin className="w-4 h-4" /> Loading Location
            </Label>
            <SearchableSelect
              items={loadingLocationOptions}
              value={formData.loading_location}
              onChange={(v) => {
                setFormData((p) => ({ ...p, loading_location: v }));
                setErrors((p) => ({ ...p, loading_location: null }));
              }}
              placeholder="Pilih loading location..."
              error={!!errors.loading_location}
              disabled={isSubmitting}
            />
            {errors.loading_location && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.loading_location}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <MapPin className="w-4 h-4" /> Dumping Location
            </Label>
            <SearchableSelect
              items={dumpingLocationOptions}
              value={formData.dumping_location}
              onChange={(v) => {
                setFormData((p) => ({ ...p, dumping_location: v }));
                setErrors((p) => ({ ...p, dumping_location: null }));
              }}
              placeholder="Pilih dumping location..."
              error={!!errors.dumping_location}
              disabled={isSubmitting}
            />
            {errors.dumping_location && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.dumping_location}
              </p>
            )}
          </div>
        </div>

        {/* Row 4: Coal Type + Distance + Measurement Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <Flame className="w-4 h-4" /> Jenis Batubara
            </Label>
            <SearchableSelect
              items={coalTypeOptions}
              value={formData.coal_type}
              onChange={(v) => {
                setFormData((p) => ({ ...p, coal_type: v }));
                setErrors((p) => ({ ...p, coal_type: null }));
              }}
              placeholder="Pilih jenis batubara..."
              error={!!errors.coal_type}
              disabled={isSubmitting}
            />
            {errors.coal_type && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.coal_type}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <Ruler className="w-4 h-4" /> Jarak (km)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formData.distance}
              onChange={handleDistanceChange}
              disabled={isSubmitting}
              className={`bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.distance ? "border-red-500 dark:border-red-400" : ""
              }`}
            />
            {errors.distance && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.distance}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <ClipboardList className="w-4 h-4" /> Tipe Pengukuran
            </Label>
            <SearchableSelect
              items={measurementTypeOptions}
              value={formData.measurement_type}
              onChange={(v) =>
                setFormData((p) => ({ ...p, measurement_type: v }))
              }
              placeholder="Pilih tipe..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Row 5: Gross Weight + Tare Weight (optional) + SPPH */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <Weight className="w-4 h-4" /> Berat Kotor (Ton)
              {scale?.isConnected && (
                <Badge
                  variant="outline"
                  className={`ml-1 py-0 text-[10px] h-5 ${
                    scale.isStable
                      ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                      : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                  }`}
                >
                  {scale.isStable ? "STABLE" : "UNSTABLE"}
                </Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.gross_weight}
                onChange={handleWeightChange("gross_weight")}
                disabled={isSubmitting}
                className={`bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-bold text-lg ${
                  errors.gross_weight
                    ? "border-red-500 dark:border-red-400"
                    : ""
                }`}
              />
              {scale?.isConnected && (
                <div className="absolute right-3 top-2.5 text-xs text-green-600 dark:text-green-400 font-medium animate-pulse">
                  Live
                </div>
              )}
            </div>
            {errors.gross_weight && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.gross_weight}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Max: {WEIGHT_MAX} ton
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <Weight className="w-4 h-4" /> Berat Kosong (Ton)
              <span className="text-xs text-gray-400 font-normal">
                Opsional
              </span>
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formData.tare_weight}
              onChange={handleWeightChange("tare_weight")}
              disabled={isSubmitting}
              className={`bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-bold text-lg ${
                errors.tare_weight
                  ? "border-red-500 dark:border-red-400"
                  : ""
              }`}
            />
            {errors.tare_weight && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.tare_weight}
              </p>
            )}
            {calculatedNet && (
              <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                Netto: {calculatedNet} ton
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              SPPH
            </Label>
            <Input
              type="text"
              value="Retail"
              disabled
              className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Data Timbangan
              </>
            )}
          </Button>
        </div>
      </form>

      {/* ═══════ PENDING WEIGH LIST ═══════ */}
      <PendingWeighList
        weighList={weighList}
        isListLoading={isListLoading}
        loadWeighList={loadWeighList}
        editingId={editingId}
        editTareWeight={editTareWeight}
        setEditTareWeight={setEditTareWeight}
        isUpdating={isUpdating}
        startEditTare={startEditTare}
        cancelEditTare={cancelEditTare}
        handleTareSubmit={handleTareSubmit}
        scale={scale}
      />
    </div>
  );
};

export default ManualWeighTab;
