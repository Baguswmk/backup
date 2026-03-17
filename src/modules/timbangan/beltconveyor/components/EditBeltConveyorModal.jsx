import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { useBeltConveyor } from "../hooks/useBeltConveyor";
import { Pencil, Lock } from "lucide-react";
import { getShiftOptions } from "@/shared/utils/shift";
import { showToast } from "@/shared/utils/toast";
import { format } from "date-fns";
import { calculateCurrentShiftAndGroup } from "@/shared/utils/group";

// ── Constants ─────────────────────────────────────────────────────────────────
const LOADER_OPTIONS = [
  { value: "Loader A", label: "Loader A" },
  { value: "Loader B", label: "Loader B" },
  { value: "Loader C", label: "Loader C" },
  { value: "Loader D", label: "Loader D" },
  { value: "Loader E", label: "Loader E" },
  { value: "Loader F", label: "Loader F" },
  { value: "Loader G", label: "Loader G" },
];

const STATUS_OPTIONS = [
  { value: "Haul", label: "Haul" },
  { value: "Hold", label: "Hold" },
  { value: "Standby", label: "Standby" },
  { value: "Breakdown", label: "Breakdown" },
  { value: "Maintenance", label: "Maintenance" },
];

const SHIFT_OPTIONS = getShiftOptions(false);

// ── Helpers ────────────────────────────────────────────────────────────────────
const toDatetimeLocal = (isoString) => {
  if (!isoString) return "";
  try {
    return format(new Date(isoString), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
};

const sanitizeTonase = (val) => String(val).replace(/,/g, ".");

// ── Component ─────────────────────────────────────────────────────────────────
const EditBeltConveyorModal = ({ isOpen, onClose, data, onSubmit }) => {
  const { masters } = useBeltConveyor();

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [beltscaleEditable, setBeltscaleEditable] = useState(false);

  // Auto-compute group from date + shift
  const computedGroup = useMemo(() => {
    try {
      const dateObj = formData.date ? new Date(formData.date) : new Date();
      const { activeGroup } = calculateCurrentShiftAndGroup(dateObj);
      return activeGroup || "-";
    } catch {
      return "-";
    }
  }, [formData.date, formData.shift]);

  // Derived delta
  const delta = useMemo(() => {
    const t = parseFloat(sanitizeTonase(String(formData.tonnage || "")));
    const b = parseFloat(String(formData.beltscale || ""));
    if (isNaN(t) || isNaN(b) || !formData.beltscale) return null;
    return (t - b).toFixed(2);
  }, [formData.tonnage, formData.beltscale]);

  // Masters options
  const coalTypeItems = useMemo(
    () =>
      (masters?.coalTypes || []).map((c) => ({
        value: c.id,
        label: c.name || c.coal_type || String(c.id),
      })),
    [masters],
  );

  const loadingPointItems = useMemo(
    () =>
      (masters?.loadingLocations || []).map((l) => ({
        value: l.id,
        label: l.name || l.location_name || String(l.id),
      })),
    [masters],
  );

  const dumpingPointItems = useMemo(
    () =>
      (masters?.dumpingLocations || []).map((d) => ({
        value: d.id,
        label: d.name || d.location_name || String(d.id),
      })),
    [masters],
  );

  useEffect(() => {
    if (isOpen && data) {
      setFormData({
        date: toDatetimeLocal(
          data.date || data.createdAt || new Date().toISOString(),
        ),
        shift: data.shift || "",
        beltscale: data.beltscale != null ? String(data.beltscale) : "",
        tonnage: data.tonnage != null ? String(data.tonnage) : "",
        // Read from populated relation OR direct id field
        coal_type_id: data.coal_type?.id || data.coal_type_id || "",
        loader: data.loader || "",
        hauler: data.hauler || "",
        loading_point_id: data.loading_point?.id || data.loading_point_id || "",
        dumping_point_id: data.dumping_point?.id || data.dumping_point_id || "",
        distance: data.distance != null ? String(data.distance) : "",
        status: data.status || "Haul",
      });
      setErrors({});
      setBeltscaleEditable(false);
    }
  }, [isOpen, data]);

  const handleChange = (field, value) => {
    let processedValue = value;
    if (field === "tonnage") {
      processedValue = sanitizeTonase(value).replace(/[^\d.]/g, "");
    }
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.date) errs.date = "Tanggal wajib diisi";
    if (!formData.shift) errs.shift = "Shift wajib dipilih";
    if (!formData.tonnage || isNaN(parseFloat(sanitizeTonase(formData.tonnage))))
      errs.tonnage = "Tonase wajib diisi (gunakan titik, bukan koma)";
    if (!formData.loader) errs.loader = "Loader wajib dipilih";
    if (!formData.status) errs.status = "Status wajib dipilih";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Build payload — delta fully computed in FE (BE does not calculate)
      const payload = {
        measurement_type: "beltscale",
        date: new Date(formData.date).toISOString(),
        shift: formData.shift,
        beltscale:
          formData.beltscale !== "" ? parseFloat(formData.beltscale) : null,
        group: computedGroup !== "-" ? computedGroup : null,
        tonnage: parseFloat(sanitizeTonase(formData.tonnage)),
        delta: delta !== null ? parseFloat(delta) : null,
        // Relation IDs — BE uses field names without "_id" suffix
        coal_type: formData.coal_type_id || null,
        loader: formData.loader,
        hauler: formData.hauler,
        loading_point: formData.loading_point_id || null,
        dumping_point: formData.dumping_point_id || null,
        distance: formData.distance !== "" ? Number(formData.distance) : null,
        status: formData.status,
      };

      await onSubmit(payload);
      showToast.success("Data Belt Conveyor berhasil diubah!");
      onClose();
    } catch (error) {
      showToast.error("Gagal mengubah data.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Edit Belt Conveyor
          </DialogTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-mono text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded">
              beltscale
            </span>{" "}
            measurement type
          </p>
        </DialogHeader>

        <ScrollArea className="flex-grow overflow-y-auto px-6">
          <form
            id="edit-form"
            onSubmit={handleSubmit}
            className="space-y-5 py-4"
          >
            {/* date + shift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Tanggal & Waktu *
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.date || ""}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                {errors.date && (
                  <p className="text-red-500 text-xs">{errors.date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Shift *
                </Label>
                <SearchableSelect
                  items={SHIFT_OPTIONS}
                  value={formData.shift || ""}
                  onChange={(val) => handleChange("shift", val)}
                  placeholder="Pilih shift"
                />
                {errors.shift && (
                  <p className="text-red-500 text-xs">{errors.shift}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Group <span className="text-slate-400 text-xs">(otomatis)</span>
                </Label>
                <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mr-2 ${
                    computedGroup === "A" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
                    computedGroup === "B" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                    computedGroup === "C" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                    computedGroup === "D" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    {computedGroup}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Group {computedGroup}
                  </span>
                </div>
              </div>
            </div>

            {/* beltscale + tonnage + delta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Beltscale Sebelumnya
                  </Label>
                  {/* Toggle edit manual */}
                  <button
                    type="button"
                    title={beltscaleEditable ? "Kunci (kembali readonly)" : "Edit manual"}
                    onClick={() => setBeltscaleEditable((v) => !v)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      beltscaleEditable
                        ? "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                    }`}
                  >
                    {beltscaleEditable ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Pencil className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  disabled={!beltscaleEditable}
                  value={formData.beltscale || ""}
                  onChange={(e) => handleChange("beltscale", e.target.value)}
                  placeholder="Nilai beltscale"
                  className={`dark:bg-slate-800 dark:border-slate-700 dark:text-white ${
                    beltscaleEditable
                      ? "border-amber-400 dark:border-amber-500"
                      : "text-slate-500 cursor-default"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Tonase (T) *
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.tonnage || ""}
                  onChange={(e) => handleChange("tonnage", e.target.value)}
                  placeholder="0.00 (gunakan titik)"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                {errors.tonnage && (
                  <p className="text-red-500 text-xs">{errors.tonnage}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 dark:text-slate-400">
                  Delta (Δ)
                  <span className="ml-1 text-xs text-slate-400">
                    (otomatis)
                  </span>
                </Label>
                <Input
                  disabled={true}
                  readOnly
                  value={delta !== null ? delta : "-"}
                  className={`dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed font-mono ${
                    delta !== null
                      ? parseFloat(delta) >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                      : "text-slate-400"
                  }`}
                />
              </div>
            </div>

            {/* coal_type + loader + hauler */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Coal Type
                </Label>
                <SearchableSelect
                  items={coalTypeItems}
                  value={formData.coal_type_id || ""}
                  onChange={(val) => handleChange("coal_type_id", val)}
                  placeholder="Pilih coal type"
                  allowClear
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Loader *
                </Label>
                <SearchableSelect
                  items={LOADER_OPTIONS}
                  value={formData.loader || ""}
                  onChange={(val) => handleChange("loader", val)}
                  placeholder="Pilih loader"
                />
                {errors.loader && (
                  <p className="text-red-500 text-xs">{errors.loader}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Hauler
                </Label>
                <Input
                  value={formData.hauler || ""}
                  onChange={(e) => handleChange("hauler", e.target.value)}
                  placeholder="Contoh: HD785-1"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            {/* loading_point + dumping_point */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Loading Point
                </Label>
                <SearchableSelect
                  items={loadingPointItems}
                  value={formData.loading_point_id || ""}
                  onChange={(val) => handleChange("loading_point_id", val)}
                  placeholder="Pilih lokasi loading"
                  allowClear
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Dumping Point
                </Label>
                <SearchableSelect
                  items={dumpingPointItems}
                  value={formData.dumping_point_id || ""}
                  onChange={(val) => handleChange("dumping_point_id", val)}
                  placeholder="Pilih lokasi dumping"
                  allowClear
                />
              </div>
            </div>

            {/* distance + status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Jarak (meter)
                </Label>
                <Input
                  type="number"
                  value={formData.distance || ""}
                  onChange={(e) => handleChange("distance", e.target.value)}
                  placeholder="Contoh: 3500"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Status *
                </Label>
                <SearchableSelect
                  items={STATUS_OPTIONS}
                  value={formData.status || ""}
                  onChange={(val) => handleChange("status", val)}
                  placeholder="Pilih status"
                />
                {errors.status && (
                  <p className="text-red-500 text-xs">{errors.status}</p>
                )}
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Batal
          </Button>
          <Button
            form="edit-form"
            type="submit"
            disabled={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditBeltConveyorModal;
