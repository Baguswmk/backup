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
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// ✅ Move mapping outside component to prevent re-creation
const MEASUREMENT_TYPE_MAP = {
  'Timbangan': 'Timbangan',
  'FOB': 'FOB',
  'Bypass': 'Bypass',
  'BeltScale': 'BeltScale',
};

const FleetModal = ({ 
  isOpen, 
  onClose, 
  editingConfig = null, 
  onSave,
  fleetType = "Timbangan"
}) => {
  const { user } = useAuthStore();
  const isEdit = !!editingConfig;

  // ✅ Get measurement type from mapping
  const measurementType = useMemo(() => 
    MEASUREMENT_TYPE_MAP[fleetType] || 'Timbangan'
  , [fleetType]);

  const { masters, mastersLoading } = useFleet(user ? { user } : null, measurementType);
  const permissions = useFleetPermissions();

  const formConfig = useMemo(() => {
    return permissions.getFleetFormConfig(fleetType);
  }, [permissions, fleetType]);

  const [fleetData, setFleetData] = useState({
    excavator: "",
    loadingLocation: "",
    dumpingLocation: "",
    coalType: "",
    distance: 0,
    workUnit: "",
    shift: "",
    status: "INACTIVE",
    date: "",
    measurementType: "",
    weightBridgeId: "",
  });
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [distanceText, setDistanceText] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [checkerId, setCheckerId] = useState("");

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

  // ✅ Initialize form data
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
        shift: editingConfig.shift || "",
        status: editingConfig.status || "INACTIVE",
        date: editingConfig.date || new Date().toISOString().slice(0, 10),
        measurementType: editingConfig.measurementType || measurementType,
        weightBridgeId: editingConfig.weightBridgeId || formConfig.weighBridgeValue || "",
      };
      
      setFleetData(initialData);
      setDistanceText(
        editingConfig.distance != null && editingConfig.distance !== ""
          ? String(editingConfig.distance)
          : ""
      );
      setInspectorId(editingConfig.inspectorId || "");
      setCheckerId(editingConfig.checkerId || "");
    } else {
      // New config
      const newData = {
        excavator: "",
        loadingLocation: "",
        dumpingLocation: "",
        coalType: "",
        distance: 0,
        workUnit: "",
        shift: "",
        status: "INACTIVE",
        date: "",
        measurementType: measurementType, // ✅ Use derived measurement type
        weightBridgeId: formConfig.weighBridgeValue || "",
      };
      
      setFleetData(newData);
      setDistanceText("");
      setInspectorId("");
      setCheckerId("");
    }
    setErrors({});
  }, [isOpen, editingConfig, measurementType, formConfig.weighBridgeValue]);

  const validate = useCallback(() => {
    const e = {};

    if (!fleetData.excavator) e.excavator = "Pilih excavator";
    if (!fleetData.loadingLocation) e.loadingLocation = "Pilih lokasi loading";
    if (!fleetData.dumpingLocation) e.dumpingLocation = "Pilih lokasi dumping";
    if (!fleetData.coalType) e.coalType = "Pilih coal type";
    if (!fleetData.workUnit) e.workUnit = "Pilih work unit";

    // Validate weigh bridge for roles that need it
    if (formConfig.showWeighBridgeSelect && !fleetData.weightBridgeId) {
      e.weightBridgeId = "Pilih jembatan timbang";
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
      if (!fleetData.shift) e.shift = "Pilih shift";
      if (!fleetData.date) e.date = "Pilih tanggal";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [isEdit, fleetData, distanceText, inspectorId, checkerId, formConfig.showWeighBridgeSelect]);

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
        measurement_type: measurementType, // ✅ Use derived measurement type
        weightBridgeId: fleetData.weightBridgeId || formConfig.weighBridgeValue || null,
      };

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

      const payload = isEdit
        ? {
            ...basePayload,
            status: fleetData.status,
            shift: fleetData.shift,
            date: fleetData.date,
          }
        : basePayload;

      console.log('🚀 Saving fleet with payload:', payload);

      await onSave(payload);
      setFleetData((p) => ({ ...p, distance: dist }));
    } catch (error) {
      console.error('❌ Fleet save error:', error);
      showToast.error(error.message || "Gagal menyimpan data");
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
    measurementType,
    formConfig.weighBridgeValue,
  ]);

  // Master data items
  const excaItems = useMemo(
    () =>
      (masters?.excavators || []).map((e) => ({
        value: String(e.id),
        label: e.hull_no || e.name || `Excavator #${e.id}`,
        hint: [e.company, e.workUnit].filter(Boolean).join(" • "),
      })),
    [masters?.excavators]
  );

  const shiftItems = useMemo(
    () =>
      (masters?.shifts || []).map((s) => ({
        value: s.name || String(s.id),
        label: s.name ?? s.id,
      })),
    [masters?.shifts]
  );

  const loadLocItems = useMemo(
    () =>
      (masters?.loadingLocations || []).map((l) => ({
        value: String(l.id),
        label: l.name ?? "-",
      })),
    [masters?.loadingLocations]
  );

  const dumpLocItems = useMemo(
    () =>
      (masters?.dumpingLocations || []).map((l) => ({
        value: String(l.id),
        label: l.name ?? "-",
      })),
    [masters?.dumpingLocations]
  );

  const coalTypeItems = useMemo(
    () =>
      (masters?.coalTypes || []).map((ct) => ({
        value: String(ct.id),
        label: ct.name ?? "-",
      })),
    [masters?.coalTypes]
  );

  const workUnitItems = useMemo(
    () =>
      (masters?.workUnits || []).map((wu) => ({
        value: String(wu.id),
        label: wu.subsatker || wu.name || `Work Unit #${wu.id}`,
        hint: wu.name && wu.subsatker !== wu.name ? wu.name : undefined,
      })),
    [masters?.workUnits]
  );

  const weighBridgeItems = useMemo(
    () =>
      (masters?.weighBridges || masters?.weigh_bridges || []).map((wb) => ({
        value: String(wb.id),
        label: wb.name ?? `Jembatan #${wb.id}`,
      })),
    [masters]
  );

  const userItems = useMemo(
    () =>
      (masters?.users || []).map((u) => ({
        value: String(u.id),
        label: u.username || u.email || `User #${u.id}`,
        hint: u.email && u.username !== u.email ? u.email : undefined,
      })),
    [masters?.users]
  );

  const checkerItems = useMemo(
    () =>
      userItems.filter(
        (u) =>
          u.role === "Checker" || u.label?.toLowerCase()?.includes("checker")
      ),
    [userItems]
  );

  const inspectorItems = useMemo(
    () =>
      userItems.filter(
        (u) =>
          u.role === "Pengawas" || u.label?.toLowerCase()?.includes("pengawas")
      ),
    [userItems]
  );

  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title={
            isEdit ? `Edit Fleet ${fleetType}` : `Buat Fleet ${fleetType} Baru`
          }
          subtitle={
            isEdit
              ? `Update konfigurasi fleet ${fleetType}`
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
                <Input
                  value={measurementType}
                  disabled={true}
                  className="bg-gray-100 dark:bg-gray-700 dark:text-white cursor-not-allowed"
                />
                
              </div>
            </InfoCard>

            {/* Weigh Bridge Selection */}
            {formConfig.showWeighBridgeSelect && (
              <InfoCard
                title="Jembatan Timbang"
                variant="default"
                className="border-none"
              >
                <div className="md:col-span-2 space-y-2">
                  <Label className="dark:text-gray-300">Jembatan Timbang *</Label>
                  <SearchableSelect
                    items={weighBridgeItems}
                    value={fleetData.weightBridgeId}
                    onChange={(val) =>
                      setFleetData((p) => ({ ...p, weightBridgeId: val || "" }))
                    }
                    placeholder="Pilih jembatan timbang"
                    emptyText="Jembatan timbang tidak ditemukan"
                    error={!!errors.weightBridgeId}
                    disabled={isSaving}
                  />
                  {errors.weightBridgeId && (
                    <p className="text-sm text-red-500">{errors.weightBridgeId}</p>
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

            {/* Status, Shift & Date (Edit Mode) */}
            {isEdit && (
              <InfoCard
                title="Status, Shift & Tanggal"
                icon={CalendarIcon}
                variant="primary"
              >
                <div className="space-y-2">
                  <Label className="dark:text-gray-300">Status *</Label>
                  <RadioGroup
                    value={fleetData.status}
                    onValueChange={(val) => {
                      setFleetData((p) => ({ ...p, status: val }));
                    }}
                    disabled={isSaving}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2 dark:text-gray-200">
                      <RadioGroupItem 
                        value="ACTIVE" 
                        id="status-active"
                        className="dark:border-gray-600" 
                      />
                      <Label
                        htmlFor="status-active"
                        className="cursor-pointer font-normal dark:text-gray-300"
                      >
                        Active
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 dark:text-gray-200">
                      <RadioGroupItem 
                        value="INACTIVE" 
                        id="status-inactive"
                        className="dark:border-gray-600"
                      />
                      <Label
                        htmlFor="status-inactive"
                        className="cursor-pointer font-normal dark:text-gray-300"
                      >
                        Inactive
                      </Label>
                    </div>
                  </RadioGroup>
                  {errors.status && (
                    <p className="text-sm text-red-500">{errors.status}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-gray-300">Shift *</Label>
                  <SearchableSelect
                    items={shiftItems}
                    value={fleetData.shift}
                    onChange={(val) =>
                      setFleetData((p) => ({ ...p, shift: val || "" }))
                    }
                    placeholder="Pilih shift"
                    emptyText="Shift tidak ditemukan"
                    error={!!errors.shift}
                    disabled={isSaving}
                  />
                  {errors.shift && (
                    <p className="text-sm text-red-500">{errors.shift}</p>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="dark:text-gray-300">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        disabled={isSaving}
                        className="w-full cursor-pointer hover:bg-gray-200 justify-start text-left font-normal dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-700"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fleetData.date
                          ? format(new Date(fleetData.date), "dd MMMM yyyy", {
                              locale: id,
                            })
                          : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      className="w-auto p-0 bg-white border-none dark:bg-gray-800 dark:border-gray-700"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={
                          fleetData.date ? new Date(fleetData.date) : undefined
                        }
                        onSelect={(date) => {
                          if (!date) return;
                          setFleetData((p) => ({
                            ...p,
                            date: format(date, "yyyy-MM-dd"),
                          }));
                        }}
                        locale={id}
                        disabled={isSaving}
                        initialFocus
                        className="dark:text-gray-200"
                      />
                    </PopoverContent>
                  </Popover>

                  {errors.date && (
                    <p className="text-sm text-red-500">{errors.date}</p>
                  )}
                </div>
              </InfoCard>
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