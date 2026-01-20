import React, { useMemo, useState, useEffect } from "react";
import {
  useTimbanganStore,
  normalizeHull,
} from "@/modules/timbangan/timbangan/store/timbanganStore";
import { timbanganBypassService } from "@/modules/timbangan/timbangan/services/timbanganBypassService";
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
import { Badge } from "@/shared/components/ui/badge";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Truck,
  Clock,
  AlertCircle,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Search,
  X,
  Keyboard,
  Weight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import useAuthStore from "@/modules/auth/store/authStore";
import { showToast } from "@/shared/utils/toast";
import ConfirmDialog from "@/shared/components/ConfirmDialog";

const TimbanganBypassForm = ({
  onSubmit,
  editingItem,
  mode = "create",
  isSubmitting = false,
}) => {
  const { user } = useAuthStore();

  const dtIndex = useTimbanganStore((state) => state.dtIndex);
  const hiddenDumptrucks = useTimbanganStore((state) => state.hiddenDumptrucks);

  const [formData, setFormData] = useState({
    hull_no: "",
    net_weight: "",
    setting_fleet_id: "",
    dumptruck: "",
    operator: "",
    createdAt: new Date().toISOString(),
  });

  const [errors, setErrors] = useState({});
  const [currentFleet, setCurrentFleet] = useState(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  const isDeleteMode = mode === "delete";
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (isEditMode && editingItem) {
      setFormData({
        hull_no: editingItem.hull_no || editingItem.unit_dump_truck || "",
        net_weight: editingItem.net_weight?.toString() || "",
        setting_fleet_id: editingItem.setting_fleet_id || "",
        dumptruck: editingItem.dumptruckId || "",
        operator: editingItem.operatorId || "",
        createdAt: editingItem.createdAt || new Date().toISOString(),
      });
    }
  }, [isEditMode, editingItem]);

  const hullNoOptions = useMemo(() => {
    const options = Object.entries(dtIndex)
      .map(([key, data]) => {
        const isHidden = !!hiddenDumptrucks[key];

        return {
          value: data.hull_no,
          label: data.hull_no,
          hint: `${data.excavator} | ${data.operator_name || "No Operator"}`,
          isHidden,
          __data: data,
        };
      })
      .filter((option) => !option.isHidden);

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [dtIndex, hiddenDumptrucks]);

  const handleHullNoChange = (hullNoValue) => {
    setFormData((prev) => ({
      ...prev,
      hull_no: hullNoValue,
    }));

    if (!hullNoValue || hullNoValue.trim() === "") {
      setFormData((prev) => ({
        ...prev,
        setting_fleet_id: "",
        dumptruck: "",
        operator: "",
      }));
      setCurrentFleet(null);
      setErrors({});
      return;
    }

    const normalizedKey = normalizeHull(hullNoValue);
    const hit = dtIndex[normalizedKey];

    if (hit && hit.dumptruckId && hit.setting_fleet_id) {
      setFormData((prev) => ({
        ...prev,
        dumptruck: hit.dumptruckId,
        operator: hit.operator_id || "",
        setting_fleet_id: hit.setting_fleet_id,
      }));

      setCurrentFleet({
        id: hit.setting_fleet_id,
        name: hit.fleet_name,
        excavator: hit.excavator,
        excavatorId: hit.excavatorId,
        shift: hit.shift,
        date: hit.date,
        loadingLocation: hit.loading_location,
        loadingLocationId: hit.loadingLocationId,
        dumpingLocation: hit.dumping_location,
        dumpingLocationId: hit.dumpingLocationId,
        hull_no: hit.hull_no,
        operator: hit.operator_name || "-",
        operatorId: hit.operator_id,
        checker: hit.checker_name || "-",
        checkerId: hit.checkerId,
        inspector: hit.inspector_name || "-",
        inspectorId: hit.inspectorId,
        workUnit: hit.work_unit || "-",
        workUnitId: hit.workUnitId,
        coalType: hit.coal_type || "-",
        coalTypeId: hit.coalTypeId,
        distance: hit.distance || 0,
        setting_dump_truck_id: hit.setting_dump_truck_id,
      });

      setErrors({});
      showToast.success(`✅ Auto-filled: ${hullNoValue} - ${hit.fleet_name}`);
    } else {
      console.warn("⚠️ Hull number not found in dtIndex", {
        hullNoValue,
        dtIndexKeys: Object.keys(dtIndex).slice(0, 5),
      });
      setCurrentFleet(null);
      setFormData((prev) => ({
        ...prev,
        setting_fleet_id: "",
        dumptruck: "",
        operator: "",
      }));
      setErrors({
        hull_no: "Nomor lambung tidak ditemukan di fleet yang dipilih",
      });
    }
  };

  const handleNetWeightChange = (value) => {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      const numValue = parseFloat(value);

      if (value !== "" && !isNaN(numValue) && numValue > 999.99) {
        return;
      }

      setFormData((prev) => ({
        ...prev,
        net_weight: value,
      }));

      if (value && numValue > 0) {
        setErrors((prev) => {
          const { net_weight, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    console.log("🚀 [TimbanganBypassForm] handleFormSubmit started");

    if (isEditMode) {
      if (!formData.net_weight || parseFloat(formData.net_weight) <= 0) {
        setErrors({
          net_weight: "Net weight wajib diisi dan harus lebih dari 0",
        });
        showToast.error("Net weight wajib diisi");
        return;
      }

      try {
        const result = await timbanganBypassService.editBypass(
          { net_weight: parseFloat(formData.net_weight) },
          editingItem.id,
        );

        if (result.success && onSubmit) {
          onSubmit(result);
        } else {
          showToast.error(result.error || "Gagal memperbarui data");
        }
      } catch (error) {
        console.error("❌ Error in edit submit:", error);
        showToast.error("Gagal memperbarui data bypass");
      }
      return;
    }

    if (!formData.hull_no || !formData.hull_no.trim()) {
      setErrors({ hull_no: "Nomor lambung wajib diisi" });
      showToast.error("Nomor lambung wajib diisi");
      return;
    }

    if (!formData.setting_fleet_id) {
      setErrors({
        hull_no: "Nomor lambung tidak ditemukan di fleet yang dipilih",
      });
      showToast.error("Nomor lambung tidak ditemukan di fleet yang dipilih");
      return;
    }

    if (!currentFleet) {
      showToast.error("Data fleet tidak lengkap");
      return;
    }

    try {
      const submissionData = {
        setting_fleet: parseInt(formData.setting_fleet_id),
        unit_dump_truck: parseInt(formData.dumptruck),
        operator: formData.operator ? parseInt(formData.operator) : null,
        clientCreatedAt: formData.createdAt || new Date().toISOString(),
        created_by_user: user?.id || null,

        hull_no: formData.hull_no,
        fleet_name: currentFleet.name,
        fleet_excavator: currentFleet.excavator,
        fleet_shift: currentFleet.shift,
        fleet_date: currentFleet.date,
        fleet_loading: currentFleet.loadingLocation,
        fleet_dumping: currentFleet.dumpingLocation,
        fleet_coal_type: currentFleet.coalType,
        fleet_work_unit: currentFleet.workUnit,
        fleet_checker: currentFleet.checker,
        fleet_inspector: currentFleet.inspector,
        operator_name: currentFleet.operator,
      };

      console.log("📤 [TimbanganBypassForm] Submitting:", submissionData);

      const result = await timbanganBypassService.submitBypass(submissionData);

      console.log("📊 [TimbanganBypassForm] Submit result:", result);

      const isQueued = result?.queued === true;
      const shouldClose = result?.shouldClose === true;

      console.log("🔍 [TimbanganBypassForm] Flags:", {
        isQueued,
        shouldClose,
        result,
      });

      if (isQueued || (result?.success && !result?.data)) {
        console.log(
          "📦 [TimbanganBypassForm] Data queued, calling onSubmit...",
        );

        showToast.info(
          "📦 Data disimpan di queue dan akan otomatis tersinkron saat online",
          { duration: 4000 },
        );

        if (onSubmit) {
          onSubmit({
            success: true,
            queued: true,
            data: null,
            shouldClose: true,
          });
        }

        return;
      }

      if (result?.success && result?.data) {
        console.log(
          "✅ [TimbanganBypassForm] Success with data, calling onSubmit...",
        );

        if (onSubmit) {
          onSubmit(result);
        }

        setFormData({
          hull_no: "",
          net_weight: "",
          setting_fleet_id: "",
          dumptruck: "",
          operator: "",
          createdAt: new Date().toISOString(),
        });
        setCurrentFleet(null);
        setErrors({});
      }
    } catch (err) {
      console.error("❌ [TimbanganBypassForm] Error:", err);

      const isQueuedError =
        err?.queued || err?.message?.includes("queued for offline sync");

      if (isQueuedError) {
        console.log(
          "📦 [TimbanganBypassForm] Error was queued, treating as success",
        );

        showToast.info(
          "📦 Data disimpan di queue dan akan otomatis tersinkron saat online",
          { duration: 4000 },
        );

        if (onSubmit) {
          onSubmit({
            success: true,
            queued: true,
            data: null,
            shouldClose: true,
          });
        }

        return;
      }

      const isValidation =
        err?.validationError ||
        (err?.response?.status >= 400 && err?.response?.status < 500);

      if (isValidation) {
        showToast.error(err?.message || "Validasi gagal. Periksa input Anda.");
      } else {
        showToast.error(err?.message || "Gagal menyimpan data bypass");
      }
    }
  };

  const handleReset = () => {
    setFormData({
      hull_no: "",
      net_weight: "",
      setting_fleet_id: "",
      dumptruck: "",
      operator: "",
      createdAt: new Date().toISOString(),
    });
    setCurrentFleet(null);
    setErrors({});
    showToast.info("Form direset ke nilai default");
  };

  useEffect(() => {
    if (mode !== "create") return;

    const handleShortcut = (e) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const wrapper = document.getElementById("hull-no-select-wrapper");
        if (wrapper) {
          const selectButton = wrapper.querySelector('button[role="combobox"]');
          if (selectButton && !selectButton.disabled) {
            selectButton.click();
            setTimeout(() => {
              const commandInput = document.querySelector("input[cmdk-input]");
              if (commandInput) {
                commandInput.focus();
                commandInput.value = "";
                commandInput.dispatchEvent(
                  new Event("input", { bubbles: true }),
                );
              }
            }, 100);
          }
        }
      }

      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (formData.hull_no && currentFleet && !isSubmitting) {
          handleFormSubmit(e);
        }
      }

      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleReset();
      }

      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowShortcutHelp(!showShortcutHelp);
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (showShortcutHelp) {
          setShowShortcutHelp(false);
        } else if (onSubmit) {
          onSubmit({ cancelled: true });
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [mode, formData, currentFleet, isSubmitting, showShortcutHelp, onSubmit]);

  if (isDeleteMode) {
    return (
      <ConfirmDialog
        isOpen={true}
        onClose={() => onSubmit?.({ cancelled: true })}
        onConfirm={async () => {
          try {
            const result = await timbanganBypassService.deleteEntry(
              editingItem.id,
            );
            if (result.success && onSubmit) {
              onSubmit(result);
            }
          } catch (error) {
            showToast.error("Gagal menghapus data");
          }
        }}
        title="Konfirmasi Hapus"
        confirmLabel="Hapus Data"
        cancelLabel="Batal"
        variant="destructive"
        isProcessing={isSubmitting}
        icon={AlertCircle}
      >
        {editingItem && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Waktu:</span>
              <span className="font-medium dark:text-gray-200">
                {format(
                  new Date(editingItem.createdAt),
                  "dd MMM yyyy HH:mm:ss",
                  {
                    locale: localeId,
                  },
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                No Lambung:
              </span>
              <span className="font-medium dark:text-gray-200">
                {editingItem.hull_no}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Net Weight:
              </span>
              <span className="font-medium dark:text-gray-200">
                {editingItem.net_weight} ton
              </span>
            </div>
          </div>
        )}
      </ConfirmDialog>
    );
  }

  if (isEditMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Data Original */}
        <Card className="border-blue-200 bg-blue-50 mt-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-blue-800">
              <CalendarIcon className="w-4 h-4" />
              Data Original
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-neutral-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-gray-500">No Lambung</div>
                  <div className="font-semibold text-gray-900">
                    {editingItem?.hull_no || "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Net Weight</div>
                  <div className="font-semibold text-blue-600">
                    {editingItem?.net_weight || 0} ton
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Excavator</div>
                  <div className="font-medium">
                    {editingItem?.excavator || editingItem?.unit_exca || "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Loading</div>
                  <div className="font-medium">
                    {editingItem?.loading_location ||
                      editingItem?.fleet_loading ||
                      "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Dumping</div>
                  <div className="font-medium">
                    {editingItem?.dumping_location ||
                      editingItem?.fleet_dumping ||
                      "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Shift</div>
                  <div className="font-medium">
                    {editingItem?.shift || editingItem?.fleet_shift || "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Operator</div>
                  <div className="font-medium">
                    {editingItem?.operator || editingItem?.operatorName || "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Inspector</div>
                  <div className="font-medium">
                    {editingItem?.inspector ||
                      editingItem?.fleet_inspector ||
                      "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Checker</div>
                  <div className="font-medium">
                    {editingItem?.checker || editingItem?.fleet_checker || "-"}
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-gray-500">Dibuat</div>
                  <div className="font-medium">
                    {editingItem?.createdAt
                      ? format(
                          new Date(editingItem.createdAt),
                          "dd MMM yyyy | HH:mm:ss",
                          { locale: localeId },
                        )
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Net Weight */}
        <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Weight className="w-4 h-4" />
              Edit Net Weight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label
                htmlFor="net_weight_edit"
                className="flex items-center gap-2 mb-2"
              >
                <Weight className="w-4 h-4" />
                Net Weight (ton) *
              </Label>

              <Input
                id="net_weight_edit"
                type="text"
                inputMode="decimal"
                value={formData.net_weight}
                onChange={(e) => handleNetWeightChange(e.target.value)}
                className={errors.net_weight ? "border-red-500" : ""}
                placeholder="0.00"
                autoFocus
              />

              {errors.net_weight && (
                <p className="text-sm text-red-500 mt-1">{errors.net_weight}</p>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Maksimal 999.99 ton (3 digit). Contoh: 45.50
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSubmit?.({ cancelled: true })}
                disabled={isSubmitting}
                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>

              <Button
                type="button"
                onClick={handleFormSubmit}
                disabled={
                  !formData.net_weight ||
                  parseFloat(formData.net_weight) <= 0 ||
                  isSubmitting
                }
                className="min-w-30 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValid = formData.hull_no && currentFleet && formData.setting_fleet_id;

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {/* Keyboard Shortcuts Help */}
      {showShortcutHelp && (
        <Card className="border-purple-200 bg-purple-50 mt-2 py-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-purple-800">
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcutHelp(false)}
                className="cursor-pointer hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Fokus ke Nomor DT</span>
                  <Badge variant="outline" className="font-mono">
                    Alt + D
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Simpan Form</span>
                  <Badge variant="outline" className="font-mono">
                    Alt + S
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Reset Form</span>
                  <Badge variant="outline" className="font-mono">
                    Alt + R
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Bantuan Shortcuts</span>
                  <Badge variant="outline" className="font-mono">
                    Alt + H
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Batal/Tutup</span>
                  <Badge variant="outline" className="font-mono">
                    Esc
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timestamp Info */}
      <Card className="border-none shadow-none m-0 p-0">
        <CardContent className="">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900">
                Waktu Input
              </span>
            </div>
            <div className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
              {formData.createdAt
                ? format(new Date(formData.createdAt), "dd/MM/yy HH:mm", {
                    locale: localeId,
                  })
                : "-"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcutHelp(!showShortcutHelp)}
              className="gap-1 dark:text-gray-200 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Keyboard Shortcuts (Alt + H)"
            >
              <Keyboard className="w-4 h-4" />
              <span className="text-xs hidden sm:inline">Alt+H</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Input - Hull No ONLY */}
      <Card className="shadow-none border-none dark:bg-gray-800 dark:text-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-4 h-4" />
            Input Timbangan Bypass
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label
              htmlFor="hull_no_select"
              className="flex items-center gap-2 mb-2"
            >
              <Search className="w-4 h-4" />
              Nomor Lambung / Nomor DT *
              <Badge variant="outline" className="text-xs font-mono">
                Alt+D
              </Badge>
            </Label>

            <div id="hull-no-select-wrapper">
              <SearchableSelect
                id="hull_no_select"
                items={hullNoOptions}
                value={formData.hull_no}
                onChange={handleHullNoChange}
                placeholder="Input nomor lambung..."
                emptyText="Nomor lambung tidak ditemukan"
                disabled={hullNoOptions.length === 0}
                error={!!errors.hull_no}
                allowClear={true}
              />
            </div>

            {errors.hull_no && (
              <p className="text-sm text-red-500 mt-1">{errors.hull_no}</p>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Pilih dari daftar atau ketik untuk mencari. Gunakan{" "}
              <strong>↑↓</strong> untuk navigasi, <strong>Enter</strong> untuk
              memilih.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Summary */}
      {currentFleet && isValid && (
        <Card className="border-green-200 bg-green-50 m-0 p-0">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Fleet:</span>
              <Badge className="bg-green-600 text-xs">{formData.hull_no}</Badge>
            </div>

            <div className="bg-neutral-50 rounded-lg p-3 border border-green-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="text-gray-500">Excavator</div>
                  <div className="font-semibold text-gray-900">
                    {currentFleet.excavator}
                  </div>
                  {currentFleet.operator && (
                    <>
                      <div className="text-gray-500 mt-2">Operator</div>
                      <div className="font-medium text-blue-600">
                        {currentFleet.operator}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-gray-500">Loading</div>
                  <div className="font-semibold text-blue-600">
                    {currentFleet.loadingLocation}
                  </div>
                  <div className="text-gray-500 mt-2">Dumping</div>
                  <div className="font-semibold text-red-600">
                    {currentFleet.dumpingLocation}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-gray-500">Inspector</div>
                  <div className="font-medium">{currentFleet.inspector}</div>
                  <div className="text-gray-500 mt-2">Checker</div>
                  <div className="font-medium">{currentFleet.checker}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {!isValid && formData.hull_no && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-1">
              ⚠️ Nomor lambung tidak ditemukan di fleet yang dipilih
            </p>
            <p className="text-sm">
              Pastikan Anda sudah memilih fleet yang benar di Fleet Management
              dan nomor lambung <strong>{formData.hull_no}</strong> terdaftar
              dalam fleet tersebut.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Actions */}
      <div>
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isSubmitting}
              className="flex items-center gap-2 cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Reset Form (Alt + R)"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
              <Badge variant="outline" className="text-xs font-mono ml-1">
                Alt+R
              </Badge>
            </Button>

            <div className="flex items-center gap-2">
              {onSubmit && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSubmit({ cancelled: true })}
                  disabled={isSubmitting}
                  title="Batal (Esc)"
                  className="cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Batal
                  <Badge variant="outline" className="text-xs font-mono ml-1">
                    Esc
                  </Badge>
                </Button>
              )}

              <Button
                type="button"
                onClick={handleFormSubmit}
                disabled={!isValid || isSubmitting}
                className="flex items-center gap-2 min-w-30 cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Simpan Data (Alt + S)"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan
                    <Badge
                      variant="secondary"
                      className="text-xs font-mono ml-1"
                    >
                      Alt+S
                    </Badge>
                  </>
                )}
              </Button>
            </div>
          </div>

          {!isValid && formData.hull_no && (
            <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="w-4 h-4" />
              <span>
                Nomor lambung belum ditemukan - cek fleet yang dipilih
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimbanganBypassForm;
