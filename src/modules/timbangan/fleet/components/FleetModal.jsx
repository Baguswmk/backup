import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Settings, Users, Calendar as CalendarIcon } from "lucide-react";
import { showToast } from "@/shared/utils/toast";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import SearchableSelect from "@/shared/components/SearchableSelect";
import ModalHeader from "@/shared/components/ModalHeader";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { InfoCard } from "@/shared/components/InfoCard";

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
}) => {
  const { user } = useAuthStore();
  const isEdit = !!editingConfig;

  const { masters, mastersLoading } = useFleet(user ? { user } : null, null);
  const permissions = useFleetPermissions();

  const [fleetData, setFleetData] = useState({
    excavator: "",
    loadingLocation: "",
    dumpingLocation: "",
    coalType: "",
    distance: 0,
    workUnit: "",
    status: "INACTIVE",
    measurementType: "",
    weightBridgeId: "",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [distanceText, setDistanceText] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [checkerId, setCheckerId] = useState("");

  const formConfig = useMemo(() => {
    const currentMeasurementType = fleetData.measurementType || fleetType;
    const baseConfig = permissions.getFleetFormConfig(currentMeasurementType);

    if (isEdit) {
      return {
        ...baseConfig,
        showWeighBridgeSelect: currentMeasurementType === "Timbangan",
        showMeasurementTypeSelect: true,
        measurementTypeDisabled: false,
      };
    }

    return baseConfig;
  }, [permissions, fleetType, fleetData.measurementType, isEdit]);

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

  useEffect(() => {
    if (!isOpen) return;
    if (editingConfig) {
      const initialData = {
        excavator: editingConfig.excavatorId || "",
        loadingLocation: editingConfig.loadingLocationId || "",
        dumpingLocation: editingConfig.dumpingLocationId || "",
        coalType: editingConfig.coalTypeId || "",
        distance: editingConfig.distance ?? 0,
        workUnit: editingConfig.workUnitId || "",
        status: editingConfig.status || "INACTIVE",
        measurementType: editingConfig.measurementType || fleetType,
        weightBridgeId: editingConfig.weightBridgeId || "",
      };

      setFleetData(initialData);
      setDistanceText(
        editingConfig.distance != null && editingConfig.distance !== ""
          ? String(editingConfig.distance)
          : "",
      );
      setInspectorId(editingConfig.inspectorId || "");
      setCheckerId(editingConfig.checkerId || "");
    } else {
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
        weightBridgeId: formConfig.weighBridgeValue || "",
      };

      setFleetData(newData);
      setDistanceText("");
      setInspectorId("");
      setCheckerId("");
    }
    setErrors({});
  }, [isOpen, editingConfig, fleetType, formConfig.weighBridgeValue]);

  const validate = useCallback(() => {
    const e = {};

    if (!fleetData.excavator) e.excavator = "Pilih excavator";
    if (!fleetData.loadingLocation) e.loadingLocation = "Pilih lokasi loading";
    if (!fleetData.dumpingLocation) e.dumpingLocation = "Pilih lokasi dumping";
    if (!fleetData.coalType) e.coalType = "Pilih coal type";
    if (!fleetData.workUnit) e.workUnit = "Pilih work unit";
    if (!fleetData.measurementType)
      e.measurementType = "Pilih measurement type";

    if (fleetData.measurementType === "Timbangan") {
      if (formConfig.autoWeighBridge) {
        if (!formConfig.weighBridgeValue) {
          e.weightBridgeId = "Jembatan timbang tidak ditemukan untuk akun Anda";
        }
      } else if (formConfig.showWeighBridgeSelect) {
        if (!fleetData.weightBridgeId) {
          e.weightBridgeId = "Pilih jembatan timbang";
        }
      }
    }

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

    if (!inspectorId) {
      e.inspector = "Pilih inspector";
    }
    if (!checkerId) {
      e.checker = "Pilih checker";
    }

    if (isEdit) {
      if (!fleetData.status) e.status = "Pilih status";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [
    isEdit,
    fleetData,
    distanceText,
    inspectorId,
    checkerId,
    formConfig.showWeighBridgeSelect,
    formConfig.autoWeighBridge,
    formConfig.weighBridgeValue,
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
        inspectorId,
        checkerId,
        measurement_type: fleetData.measurementType,
      };

      if (fleetData.measurementType === "Timbangan") {
        if (formConfig.autoWeighBridge) {
          if (!formConfig.weighBridgeValue) {
            showToast.error("Jembatan timbang tidak ditemukan pada akun Anda");
            setErrors((prev) => ({
              ...prev,
              weightBridgeId: "Jembatan timbang tidak ditemukan",
            }));
            return;
          }
          basePayload.weightBridgeId = formConfig.weighBridgeValue;
        } else if (formConfig.showWeighBridgeSelect || isEdit) {
          if (!fleetData.weightBridgeId) {
            showToast.error("Jembatan timbang wajib dipilih");
            setErrors((prev) => ({
              ...prev,
              weightBridgeId: "Jembatan timbang wajib dipilih",
            }));
            return;
          }
          basePayload.weightBridgeId = fleetData.weightBridgeId;
        }
      }

      if (!inspectorId || inspectorId === "") {
        showToast.error("Inspector wajib dipilih");
        setErrors((prev) => ({
          ...prev,
          inspector: "Inspector wajib dipilih",
        }));
        return;
      }

      if (!checkerId || checkerId === "") {
        showToast.error("Checker wajib dipilih");
        setErrors((prev) => ({ ...prev, checker: "Checker wajib dipilih" }));
        return;
      }

      const payload = isEdit ? { ...basePayload } : basePayload;

      const result = await onSave(payload);

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

        setTimeout(() => {
          onClose();
        }, 1000);
      } else if (isValidation) {
        setErrors((p) => ({
          ...p,
          submit: err?.message || "Validasi gagal. Periksa input Anda.",
        }));

        showToast.error(err?.message || "Validasi gagal");
      } else {
        const errorMsg = err?.message || "Gagal menyimpan data";
        setErrors((p) => ({
          ...p,
          submit: errorMsg,
        }));

        showToast.error(errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    isEdit,
    validate,
    distanceText,
    fleetData,
    inspectorId,
    checkerId,
    onSave,
    onClose,
    formConfig.autoWeighBridge,
    formConfig.showWeighBridgeSelect,
    formConfig.weighBridgeValue,
  ]);

  const excaItems = useMemo(
    () =>
      (masters?.excavators || []).map((e) => ({
        value: String(e.id),
        label: e.hull_no || e.name || `Excavator #${e.id}`,
        hint: [e.company, e.workUnit].filter(Boolean).join(" • "),
      })),
    [masters?.excavators],
  );

  const shiftItems = useMemo(
    () =>
      (masters?.shifts || []).map((s) => ({
        value: s.name || String(s.id),
        label: s.name ?? s.id,
      })),
    [masters?.shifts],
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

  const weighBridgeItems = useMemo(
    () =>
      (masters?.weighBridges || masters?.weigh_bridges || []).map((wb) => ({
        value: String(wb.id),
        label: wb.name ?? `Jembatan #${wb.id}`,
      })),
    [masters],
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

  const checkerItems = useMemo(
    () =>
      userItems.filter(
        (u) =>
          u.role === "Checker" || u.label?.toLowerCase()?.includes("checker"),
      ),
    [userItems],
  );
  const inspectorItems = useMemo(
    () =>
      userItems.filter(
        (u) =>
          u.role === "Pengawas" || u.label?.toLowerCase()?.includes("pengawas"),
      ),
    [userItems],
  );

  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title={
            isEdit
              ? `Edit Fleet ${fleetData.measurementType || fleetType}`
              : `Buat Fleet ${fleetType} Baru`
          }
          subtitle={
            isEdit
              ? `Update konfigurasi fleet ${
                  fleetData.measurementType || fleetType
                }`
              : `Isi data untuk membuat fleet ${fleetType}`
          }
          icon={Settings}
          onClose={onClose}
          disabled={isSaving}
        />

        {mastersLoading && (
          <LoadingOverlay isVisible={true} message="Loading master data..." />
        )}

        {!mastersLoading && (
          <div className="p-6 space-y-6">
            {/* Work Unit & Measurement Type */}
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
                  <p className="text-sm text-red-500">{errors.workUnit}</p>
                )}
              </div>

              <div className="md:col-span-1 space-y-2">
                <Label className="dark:text-gray-300">Measurement Type *</Label>
                {formConfig.showMeasurementTypeSelect ? (
                  <>
                    <SearchableSelect
                      items={MEASUREMENT_TYPE_OPTIONS}
                      value={fleetData.measurementType}
                      onChange={(val) =>
                        setFleetData((p) => ({
                          ...p,
                          measurementType: val || "",
                        }))
                      }
                      placeholder="Pilih measurement type"
                      emptyText="Measurement type tidak ditemukan"
                      error={!!errors.measurementType}
                      disabled={true}
                    />
                    {errors.measurementType && (
                      <p className="text-sm text-red-500">
                        {errors.measurementType}
                      </p>
                    )}
                  </>
                ) : (
                  <Input
                    value={fleetData.measurementType}
                    disabled={true}
                    className="bg-gray-100 dark:bg-gray-700 dark:text-white cursor-not-allowed"
                  />
                )}
              </div>
            </InfoCard>

            {/* Weigh Bridge Selection - Only show for Timbangan */}
            {fleetData.measurementType === "Timbangan" &&
              formConfig.showWeighBridgeSelect && (
                <InfoCard
                  title="Jembatan Timbang"
                  variant="default"
                  className="border-none"
                >
                  <div className="md:col-span-2 space-y-2">
                    <Label className="dark:text-gray-300">
                      Jembatan Timbang *
                    </Label>
                    <SearchableSelect
                      items={weighBridgeItems}
                      value={fleetData.weightBridgeId}
                      onChange={(val) =>
                        setFleetData((p) => ({
                          ...p,
                          weightBridgeId: val || "",
                        }))
                      }
                      placeholder="Pilih jembatan timbang"
                      emptyText="Jembatan timbang tidak ditemukan"
                      error={!!errors.weightBridgeId}
                      disabled={isSaving}
                    />
                    {errors.weightBridgeId && (
                      <p className="text-sm text-red-500">
                        {errors.weightBridgeId}
                      </p>
                    )}
                  </div>
                </InfoCard>
              )}

            {/* Excavator & Location */}
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
                  onChange={(val) =>
                    setFleetData((p) => ({ ...p, excavator: val || "" }))
                  }
                  placeholder="Pilih excavator"
                  emptyText="Excavator tidak ditemukan"
                  error={!!errors.excavator}
                  disabled={isSaving}
                />
                {errors.excavator && (
                  <p className="text-sm text-red-500">{errors.excavator}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Loading Location *</Label>
                <SearchableSelect
                  items={loadLocItems}
                  value={fleetData.loadingLocation}
                  onChange={(val) =>
                    setFleetData((p) => ({
                      ...p,
                      loadingLocation: val || "",
                    }))
                  }
                  placeholder="Pilih lokasi loading"
                  emptyText="Lokasi loading tidak ditemukan"
                  error={!!errors.loadingLocation}
                  disabled={isSaving}
                />
                {errors.loadingLocation && (
                  <p className="text-sm text-red-500">
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
                    setFleetData((p) => ({
                      ...p,
                      dumpingLocation: val || "",
                    }))
                  }
                  placeholder="Pilih lokasi dumping"
                  emptyText="Lokasi dumping tidak ditemukan"
                  error={!!errors.dumpingLocation}
                  disabled={isSaving}
                />
                {errors.dumpingLocation && (
                  <p className="text-sm text-red-500">
                    {errors.dumpingLocation}
                  </p>
                )}
              </div>
            </InfoCard>

            {/* Coal Type & Distance */}
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
                  <p className="text-sm text-red-500">{errors.coalType}</p>
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
                  <p className="text-sm text-red-500">{errors.distance}</p>
                )}
              </div>
            </InfoCard>

            {/* Inspector & Checker */}
            <InfoCard title="Inspector & Checker" icon={Users} variant="purple">
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Inspector *</Label>
                <SearchableSelect
                  items={inspectorItems}
                  value={inspectorId}
                  onChange={setInspectorId}
                  placeholder="Pilih inspector"
                  emptyText="Inspector tidak ditemukan"
                  disabled={isSaving}
                  error={!!errors.inspector}
                />
                {errors.inspector && (
                  <p className="text-sm text-red-500">{errors.inspector}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Checker *</Label>
                <SearchableSelect
                  items={checkerItems}
                  value={checkerId}
                  onChange={(val) => setCheckerId(val || "")}
                  placeholder="Pilih checker"
                  emptyText="Checker tidak ditemukan"
                  error={!!errors.checker}
                  disabled={isSaving}
                />
                {errors.checker && (
                  <p className="text-sm text-red-500">{errors.checker}</p>
                )}
              </div>
            </InfoCard>

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
                className="cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                {isEdit ? "Update Konfigurasi" : "Simpan"}
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
