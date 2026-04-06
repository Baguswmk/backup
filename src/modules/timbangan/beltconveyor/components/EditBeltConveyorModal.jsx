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
import { DEFAULT_BELT_CONVEYOR_CONFIGS } from "../BeltConveyorManagement";

// ── Constants ─────────────────────────────────────────────────────────────────
const LOADER_OPTIONS = [
  { value: "Reclaim Feeder SBR 03", label: "Reclaim Feeder SBR 03" },
  { value: "Reclaim Feeder SBR 02", label: "Reclaim Feeder SBR 02" },
  { value: "Reclaim Feeder Breaker", label: "Reclaim Feeder Breaker" },
  { value: "Reclaim Feeder 10", label: "Reclaim Feeder 10" },
  { value: "Crusher PLTU BA T1", label: "Crusher PLTU BA T1" },
  { value: "Crusher PLTU BA T1A", label: "Crusher PLTU BA T1A" },
];

const STATUS_OPTIONS = [
  { value: "Pemindahan Belt Conveyor", label: "Pemindahan Belt Conveyor" },
  { value: "Pengeluaran Belt Conveyor", label: "Pengeluaran Belt Conveyor" },
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

const findPointIdFuzzy = (locations, searchName) => {
  if (!locations || !searchName || !Array.isArray(locations)) return "";
  const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = normalize(searchName);
  const found = locations.find(l => normalize(l.name || l.location_name) === target);
  return found ? found.id : "";
};

// ── Component ─────────────────────────────────────────────────────────────────
// fullEdit=true  → semua field aktif, tanpa pembatasan jam (dipakai di PengeluaranBCManagement)
// fullEdit=false → hanya tonnage, dibatasi jam saat ini (dipakai di BeltConveyorManagement)
const EditBeltConveyorModal = ({ isOpen, onClose, data, onSubmit, fullEdit = false }) => {
  const { masters } = useBeltConveyor();

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [beltscaleEditable, setBeltscaleEditable] = useState(false);

  // Jam saat ini check — diabaikan kalau fullEdit=true
  const isEditableHour = useMemo(() => {
    if (fullEdit) return true;
    if (!data?.date && !data?.createdAt) return false;
    const itemDate = new Date(data.date || data.createdAt);
    const now = new Date();
    // Editable jika jam record == jam sekarang (perbandingan langsung per-hour)
    // Tambahan guard: record harus dalam rentang 25 jam (mencakup shift malam lintas hari)
    const sameHour = itemDate.getHours() === now.getHours();
    const withinDay = Math.abs(now.getTime() - itemDate.getTime()) <= 25 * 60 * 60 * 1000;
    return sameHour && withinDay;
  }, [data, fullEdit]);

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
  // delta = Beltscale Saat Ini (formData.tonnage) - Beltscale Sebelumnya (formData.beltscale)
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
        // formData.beltscale = Beltscale Sebelumnya = beltscale_DB - tonnage_DB
        beltscale: (data.beltscale != null && data.tonnage != null)
          ? String(Number(data.beltscale) - Number(data.tonnage))
          : data.beltscale != null ? String(data.beltscale) : "",
        // formData.tonnage = Beltscale Saat Ini = beltscale_DB (kumulatif)
        tonnage: data.beltscale != null ? String(data.beltscale) : "",
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

  const handleLoaderChange = (loaderName) => {
    handleChange("loader", loaderName);

    const config = DEFAULT_BELT_CONVEYOR_CONFIGS.find(c => c.loader === loaderName);
    if (config) {
      const lpId = findPointIdFuzzy(masters?.loadingLocations, config.loading_point);
      const dpId = findPointIdFuzzy(masters?.dumpingLocations, config.dumping_point);

      setFormData((prev) => ({
        ...prev,
        hauler: config.hauler || prev.hauler,
        loading_point_id: lpId || prev.loading_point_id,
        dumping_point_id: dpId || prev.dumping_point_id,
        distance: config.distance || prev.distance,
        status: config.status || prev.status,
        // Pertahankan coal_type_id yang sudah ada
        coal_type_id: prev.coal_type_id || "",
      }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.tonnage || isNaN(parseFloat(sanitizeTonase(formData.tonnage))))
      errs.tonnage = "Beltscale Saat Ini wajib diisi (gunakan titik, bukan koma)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Build payload — delta fully computed in FE (BE does not calculate)
      const payload = {
        measurement_type: "Beltscale",
        date: new Date(formData.date).toISOString(),
        shift: formData.shift,
        // payload.beltscale = Beltscale Saat Ini (kumulatif) = formData.tonnage
        beltscale: formData.tonnage !== "" ? parseFloat(sanitizeTonase(formData.tonnage)) : null,
        group: computedGroup !== "-" ? computedGroup : null,
        // payload.tonnage = delta/selisih (Beltscale Saat Ini - Beltscale Sebelumnya)
        tonnage: delta !== null ? parseFloat(delta) : null,
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
            {/* Warning hanya muncul di mode restricted (bukan fullEdit) */}
            {!fullEdit && !isEditableHour && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-3 rounded-md text-sm">
                Data ini tidak dapat diedit karena hanya berlaku untuk entri pada jam saat ini.
              </div>
            )}

            {/* date + shift — hanya tampil di fullEdit */}
            {fullEdit && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Tanggal &amp; Waktu *
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
                  <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${
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
            )}

            {/* beltscale + tonnage + delta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Beltscale Sebelumnya
                  </Label>
                  {/* Toggle edit manual */}
                  <Button
                    type="button"
                    disabled={!isEditableHour}
                    title={beltscaleEditable ? "Kunci (kembali readonly)" : "Edit manual"}
                    onClick={() => setBeltscaleEditable((v) => !v)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      !isEditableHour
                        ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        : beltscaleEditable
                          ? "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                          : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                    }`}
                  >
                    {beltscaleEditable ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Pencil className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  disabled={!beltscaleEditable || !isEditableHour}
                  value={formData.beltscale || ""}
                  onChange={(e) => handleChange("beltscale", e.target.value)}
                  placeholder="Nilai beltscale"
                  className={`dark:bg-slate-800 dark:border-slate-700 dark:text-white ${
                    !isEditableHour || !beltscaleEditable
                      ? "text-slate-500 cursor-not-allowed"
                      : "border-amber-400 dark:border-amber-500"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Beltscale Saat Ini *
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  disabled={!isEditableHour}
                  value={formData.tonnage || ""}
                  onChange={(e) => handleChange("tonnage", e.target.value)}
                  placeholder="0.00 (gunakan titik)"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* coal_type + loader + hauler — hanya tampil di fullEdit */}
            {fullEdit && (
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
                    onChange={handleLoaderChange}
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
                    placeholder="Nama hauler"
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* loading_point + dumping_point + distance + status — hanya fullEdit */}
            {fullEdit && (
              <>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Jarak (m)
                    </Label>
                    <Input
                      type="number"
                      value={formData.distance || ""}
                      onChange={(e) => handleChange("distance", e.target.value)}
                      placeholder="0"
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
              </>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="edit-form"
            disabled={isSubmitting || (!isEditableHour && !fullEdit)}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditBeltConveyorModal;