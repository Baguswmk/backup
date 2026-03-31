import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { Loader2, RefreshCw, Pencil, Lock } from "lucide-react";
import { getShiftOptions, getCurrentShift } from "@/shared/utils/shift";
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
/** Format local datetime-local input value (YYYY-MM-DDThh:mm) */
const toDatetimeLocal = (isoString) => {
  if (!isoString) return "";
  try {
    return format(new Date(isoString), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
};

/** Auto-replace commas with dots in numeric string */
const sanitizeTonase = (val) => String(val).replace(/,/g, ".");

const EMPTY_FORM = {
  date: toDatetimeLocal(new Date().toISOString()),
  shift: getCurrentShift(),
  beltscale: "",
  tonnage: "",
  coal_type_id: "",
  loader: "",
  hauler: "",
  loading_point_id: "",
  dumping_point_id: "",
  distance: "",
  status: "Haul",
};

const findPointIdFuzzy = (locations, searchName) => {
  if (!locations || !searchName || !Array.isArray(locations)) return "";
  const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = normalize(searchName);
  const found = locations.find(l => normalize(l.name || l.location_name) === target);
  return found ? found.id : "";
};

// ── Component ─────────────────────────────────────────────────────────────────
const TambahBeltConveyorModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { createData, isCreating, masters, fetchLatestBeltscale } =
    useBeltConveyor();
  const [isFetchingBeltscale, setIsFetchingBeltscale] = useState(false);
  const [beltscaleEditable, setBeltscaleEditable] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const isHourlyInput = initialData?.isHourlyInput || false;

  // Auto-compute group from current date + shift
  const computedGroup = useMemo(() => {
    try {
      const dateObj = formData.date ? new Date(formData.date) : new Date();
      const { activeGroup } = calculateCurrentShiftAndGroup(dateObj);
      return activeGroup || "-";
    } catch {
      return "-";
    }
  }, [formData.date, formData.shift]);

  const handleLoaderChange = useCallback(
    async (loaderName) => {
      handleChange("loader", loaderName);

      const m = mastersRef.current;
      const config = DEFAULT_BELT_CONVEYOR_CONFIGS.find(c => c.loader === loaderName);
      if (config) {
        const lpId = findPointIdFuzzy(m?.loadingLocations, config.loading_point);
        const dpId = findPointIdFuzzy(m?.dumpingLocations, config.dumping_point);

        setFormData((prev) => ({
          ...prev,
          hauler: config.hauler || prev.hauler,
          loading_point_id: lpId || prev.loading_point_id,
          dumping_point_id: dpId || prev.dumping_point_id,
          distance: config.distance || prev.distance,
          status: config.status || prev.status,
        }));
      }

      if (!loaderName) return;
      try {
        setIsFetchingBeltscale(true);
        const map = await fetchLatestBeltscale([loaderName]);
        const prev = map[loaderName];
        if (prev != null) {
          setFormData((f) => ({ ...f, beltscale: String(prev) }));
        }
      } catch (e) {
        console.warn("fetchLatestBeltscale error", e);
      } finally {
        setIsFetchingBeltscale(false);
      }
    },
    [fetchLatestBeltscale],
  );

  // Derive delta (display only)
  const delta = useMemo(() => {
    const t = parseFloat(sanitizeTonase(formData.tonnage));
    const b = parseFloat(formData.beltscale);
    if (isNaN(t) || isNaN(b) || formData.beltscale === "") return null;
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

  const mastersRef = useRef(masters);
  useEffect(() => {
    mastersRef.current = masters;
  }, [masters]);

  useEffect(() => {
    if (isOpen) {
      let isSubscribed = true;
      const m = mastersRef.current;

      const setupData = async () => {
        let newData = {
          ...EMPTY_FORM,
          date: toDatetimeLocal(new Date().toISOString()),
          shift: getCurrentShift(),
        };

        if (initialData) {
          const lpId = findPointIdFuzzy(m?.loadingLocations, initialData.loading_point);
          const dpId = findPointIdFuzzy(m?.dumpingLocations, initialData.dumping_point);

          newData = {
            ...newData,
            date: toDatetimeLocal(initialData.dateStr || new Date().toISOString()),
            shift: initialData.shift || getCurrentShift(),
            loader: initialData.loader || "",
            hauler: initialData.hauler || "",
            loading_point_id: lpId,
            dumping_point_id: dpId,
            distance: initialData.distance || "",
            status: initialData.status || newData.status,
          };
        }

        setFormData(newData);
        setErrors({});
        setBeltscaleEditable(false);

        if (initialData && initialData.loader) {
          try {
            setIsFetchingBeltscale(true);
            const map = await fetchLatestBeltscale([initialData.loader]);
            if (isSubscribed) {
              const prev = map[initialData.loader];
              if (prev != null) {
                setFormData(f => ({ ...f, beltscale: String(prev) }));
              }
            }
          } catch (e) {
            console.warn("fetchLatestBeltscale error", e);
          } finally {
            if (isSubscribed) setIsFetchingBeltscale(false);
          }
        }
      };

      setupData();

      return () => {
        isSubscribed = false;
      };
    }
  }, [isOpen, initialData, fetchLatestBeltscale]);

  const handleChange = (field, value) => {
    let processedValue = value;
    if (field === "tonnage") {
      // Replace commas with dots, allow digits and single dot only
      processedValue = sanitizeTonase(value).replace(/[^\d.]/g, "");
    }
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.date) errs.date = "Tanggal wajib diisi";
    if (!formData.shift) errs.shift = "Shift wajib dipilih";
    if (
      !formData.tonnage ||
      isNaN(parseFloat(sanitizeTonase(formData.tonnage)))
    )
      errs.tonnage = "Beltscale Saat Ini wajib diisi (gunakan titik, bukan koma)";
    if (!formData.loader) errs.loader = "Loader wajib dipilih";
    if (!formData.status) errs.status = "Status wajib dipilih";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        measurement_type: "Beltscale",
        date: new Date(formData.date).toISOString(),
        shift: formData.shift,
        beltscale:
          formData.tonnage !== "" ? parseFloat(sanitizeTonase(formData.tonnage)) : null,
        // group dihitung otomatis dari date + shift di FE
        group: computedGroup !== "-" ? computedGroup : null,
        tonnage: delta !== null ? parseFloat(delta) : null,
        delta: delta !== null ? parseFloat(delta) : null,
        // Relation IDs — BE uses the field names without "_id" suffix
        coal_type: initialData?.coal_type_id || formData.coal_type_id || null,
        loader: formData.loader,
        hauler: formData.hauler,
        loading_point: formData.loading_point_id || null,
        dumping_point: formData.dumping_point_id || null,
        distance: formData.distance !== "" ? Number(formData.distance) : null,
        status: formData.status,
      };

      await createData(payload);
      showToast.success("Data Belt Conveyor berhasil ditambahkan!");
      onSuccess ? onSuccess() : onClose();
    } catch (error) {
      showToast.error("Gagal menambahkan data.");
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Tambah Data Belt Conveyor
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
            id="tambah-form"
            onSubmit={handleSubmit}
            className="space-y-5 py-4"
          >
            {isHourlyInput && (
              <div className="mb-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                <p className="font-semibold text-base">{initialData?.loader} - Shift {initialData?.shift} - Jam {initialData?.hourLabel}</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm opacity-95">
                  <div className="bg-white/50 dark:bg-slate-900/30 px-3 py-2 rounded sm:col-span-2">
                    <span className="block text-xs uppercase tracking-wider opacity-70 mb-0.5">Batu Bara</span>
                    <span className="font-medium">{coalTypeItems.find(c => String(c.value) === String(initialData?.coal_type_id))?.label || "-"}</span>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-900/30 px-3 py-2 rounded sm:col-span-2">
                    <span className="block text-xs uppercase tracking-wider opacity-70 mb-0.5">Total Kumulatif Tonase</span>
                    <span className="font-medium">{initialData?.latestBeltscale !== "-" && initialData?.latestBeltscale != null ? Number(initialData?.latestBeltscale).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "-"} Ton</span>
                  </div>
                </div>
              </div>
            )}

            {!isHourlyInput && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Tanggal & Waktu *
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.date}
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
                    value={formData.shift}
                    onChange={(val) => handleChange("shift", val)}
                    placeholder="Pilih shift"
                  />
                  {errors.shift && (
                    <p className="text-red-500 text-xs">{errors.shift}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Group{" "}
                    <span className="text-slate-400 text-xs">(otomatis)</span>
                  </Label>
                  <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mr-2 ${
                        computedGroup === "q A"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : computedGroup === "Group B"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : computedGroup === "Group C"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : computedGroup === "Group D"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {computedGroup}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Group {computedGroup}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!isHourlyInput && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Coal Type
                  </Label>
                  <SearchableSelect
                    items={coalTypeItems}
                    value={formData.coal_type_id}
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
                    value={formData.loader}
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
                    value={formData.hauler}
                    onChange={(e) => handleChange("hauler", e.target.value)}
                    placeholder="Contoh: HD785-1"
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Row: beltscale (prev, readonly) + tonnage input + delta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Beltscale Sebelumnya
                  </Label>
                  <div className="flex items-center gap-1.5">
                    {/* Refresh dari API */}
                    <button
                      type="button"
                      title="Refresh dari data terakhir"
                      disabled={!formData.loader || isFetchingBeltscale}
                      onClick={() =>
                        formData.loader && handleLoaderChange(formData.loader)
                      }
                      className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isFetchingBeltscale ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </button>
                    {/* Toggle edit manual */}
                    <button
                      type="button"
                      title={
                        beltscaleEditable
                          ? "Kunci (pakai nilai auto)"
                          : "Edit manual"
                      }
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
                </div>
                <Input
                  type="number"
                  step="0.01"
                  disabled={!beltscaleEditable}
                  value={formData.beltscale}
                  onChange={(e) => handleChange("beltscale", e.target.value)}
                  placeholder={isFetchingBeltscale ? "Mengambil data..." : "—"}
                  className={`dark:bg-slate-800 dark:border-slate-700 dark:text-white ${
                    beltscaleEditable
                      ? "border-amber-400 dark:border-amber-500"
                      : "text-slate-500 cursor-default"
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
                  value={formData.tonnage}
                  onChange={(e) => handleChange("tonnage", e.target.value)}
                  placeholder="0.00 (gunakan titik)"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white border-teal-300 focus-visible:ring-teal-500"
                  autoFocus
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

            {!isHourlyInput && (
              <>
                {/* Row: loading_point + dumping_point */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Loading Point
                    </Label>
                    <SearchableSelect
                      items={loadingPointItems}
                      value={formData.loading_point_id}
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
                      value={formData.dumping_point_id}
                      onChange={(val) => handleChange("dumping_point_id", val)}
                      placeholder="Pilih lokasi dumping"
                      allowClear
                    />
                  </div>
                </div>

                {/* Row: distance + status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Jarak (meter)
                    </Label>
                    <Input
                      type="number"
                      value={formData.distance}
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
                      value={formData.status}
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

        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
            className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Batal
          </Button>
          <Button
            form="tambah-form"
            type="submit"
            disabled={isCreating}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isCreating ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TambahBeltConveyorModal;
