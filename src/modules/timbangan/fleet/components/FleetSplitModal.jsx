import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Settings, Loader2, AlertCircle, Split } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { showToast } from "@/shared/utils/toast";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import SearchableSelect from "@/shared/components/SearchableSelect";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";
import ModalHeader from "@/shared/components/ModalHeader";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { InfoCard } from "@/shared/components/InfoCard";

const MEASUREMENT_TYPE_OPTIONS = [
  { value: "Timbangan", label: "Timbangan" },
  { value: "Bypass", label: "Bypass" },
  { value: "Beltscale", label: "Beltscale" },
];

const FleetSplitModal = ({
  isOpen,
  onClose,
  onSave,
  availableDumptruckSettings = [],
  masters,
  mastersLoading,
}) => {
  const { user } = useAuthStore();

  const [splitData, setSplitData] = useState({
    excavator: "",
    loadingLocation: "",
    dumpingLocation1: "",
    dumpingLocation2: "",
    coalType: "",
    distance1: 0,
    distance2: 0,
    workUnit: "",
    measurementType: "Timbangan",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [distanceText1, setDistanceText1] = useState("");
  const [distanceText2, setDistanceText2] = useState("");
  const [inspectorIds, setInspectorIds] = useState([]);
  const [checkerIds, setCheckerIds] = useState([]);

  // Check if selected DTs have different companies
  const hasDifferentCompanies = useMemo(() => {
    if (!splitData.excavator) return false;

    const excavator = masters?.excavators?.find(
      (e) => String(e.id) === String(splitData.excavator),
    );

    if (!excavator) return false;

    // Get all DTs for this excavator from existing fleets
    const dtsForExcavator = availableDumptruckSettings
      .filter((fleet) => String(fleet.excavatorId) === String(excavator.id))
      .flatMap((fleet) => fleet.units || []);

    const companies = new Set(
      dtsForExcavator.map((dt) => dt.companyId).filter(Boolean),
    );
    return companies.size > 1;
  }, [splitData.excavator, masters?.excavators, availableDumptruckSettings]);

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

    setSplitData({
      excavator: "",
      loadingLocation: "",
      dumpingLocation1: "",
      dumpingLocation2: "",
      coalType: "",
      distance1: 0,
      distance2: 0,
      workUnit: "",
      measurementType: "Timbangan",
    });
    setDistanceText1("");
    setDistanceText2("");
    setInspectorIds([]);
    setCheckerIds([]);
    setErrors({});
  }, [isOpen]);

  const validate = useCallback(() => {
    const e = {};

    if (!splitData.excavator) e.excavator = "Pilih excavator";
    if (!splitData.loadingLocation) e.loadingLocation = "Pilih lokasi loading";
    if (!splitData.dumpingLocation1)
      e.dumpingLocation1 = "Pilih dumping point 1";
    if (!splitData.dumpingLocation2)
      e.dumpingLocation2 = "Pilih dumping point 2";

    if (splitData.dumpingLocation1 === splitData.dumpingLocation2) {
      e.dumpingLocation2 =
        "Dumping point 2 harus berbeda dengan dumping point 1";
    }

    if (!splitData.coalType) e.coalType = "Pilih coal type";
    if (!splitData.workUnit) e.workUnit = "Pilih work unit";
    if (!splitData.measurementType)
      e.measurementType = "Pilih measurement type";

    // Validate distance 1
    const cleaned1 = (distanceText1 || "").trim().replace(",", ".");
    const distNum1 = cleaned1 === "" ? 0 : parseFloat(cleaned1);
    if (!Number.isFinite(distNum1) || distNum1 < 0) {
      e.distance1 = "Distance 1 harus angka valid (≥ 0)";
    }

    // Validate distance 2
    const cleaned2 = (distanceText2 || "").trim().replace(",", ".");
    const distNum2 = cleaned2 === "" ? 0 : parseFloat(cleaned2);
    if (!Number.isFinite(distNum2) || distNum2 < 0) {
      e.distance2 = "Distance 2 harus angka valid (≥ 0)";
    }

    if (!checkerIds || checkerIds.length === 0) {
      e.checker = "Pilih minimal 1 checker";
    }

    // Inspector required only if different companies
    if (hasDifferentCompanies && (!inspectorIds || inspectorIds.length === 0)) {
      e.inspector = "Pilih minimal 1 inspector (DT memiliki company berbeda)";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [
    splitData,
    distanceText1,
    distanceText2,
    checkerIds,
    inspectorIds,
    hasDifferentCompanies,
  ]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      showToast.error("Mohon lengkapi semua field yang wajib diisi");
      return;
    }

    setIsSaving(true);

    try {
      const cleaned1 = (distanceText1 || "").trim().replace(",", ".");
      let dist1 = cleaned1 === "" ? 0 : parseFloat(cleaned1);
      if (!Number.isFinite(dist1) || dist1 < 0) dist1 = 0;

      const cleaned2 = (distanceText2 || "").trim().replace(",", ".");
      let dist2 = cleaned2 === "" ? 0 : parseFloat(cleaned2);
      if (!Number.isFinite(dist2) || dist2 < 0) dist2 = 0;

      const payload = {
        isSplit: true,
        excavatorId: splitData.excavator,
        loadingLocationId: splitData.loadingLocation,
        coalTypeId: splitData.coalType,
        workUnitId: splitData.workUnit,
        measurement_type: splitData.measurementType,
        checkerIds: checkerIds.map((id) => parseInt(id)),
        inspectorIds: hasDifferentCompanies
          ? inspectorIds.map((id) => parseInt(id))
          : [],
        splits: [
          {
            dumpingLocationId: splitData.dumpingLocation1,
            distance: dist1,
          },
          {
            dumpingLocationId: splitData.dumpingLocation2,
            distance: dist2,
          },
        ],
      };

      const result = await onSave(payload);

      if (result?.success) {
        onClose();
      }
    } catch (err) {
      console.error("❌ Fleet split save error:", err);
      const errorMsg = err?.message || "Gagal menyimpan data split";
      setErrors((p) => ({ ...p, submit: errorMsg }));
      showToast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  }, [
    validate,
    distanceText1,
    distanceText2,
    splitData,
    checkerIds,
    inspectorIds,
    hasDifferentCompanies,
    onSave,
    onClose,
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

  const checkerItems = useMemo(() => {
    const measurementType = splitData.measurementType;
    if (measurementType === "Timbangan") {
      return userItems.filter(
        (u) =>
          u.role === "Checker" ||
          u.role === "Operator_JT" ||
          u.label?.toLowerCase()?.includes("checker") ||
          u.label?.toLowerCase()?.includes("operator jt"),
      );
    } else {
      return userItems.filter(
        (u) =>
          u.role === "Checker" || u.label?.toLowerCase()?.includes("checker"),
      );
    }
  }, [userItems, splitData.measurementType]);

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
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title="Split Fleet Setting"
          subtitle="Buat 2 setting fleet sekaligus dengan excavator dan loading point yang sama"
          icon={Split}
          onClose={onClose}
          disabled={isSaving}
        />

        {mastersLoading && (
          <LoadingOverlay isVisible={true} message="Loading master data..." />
        )}

        {!mastersLoading && (
          <div className="p-6 space-y-6">
            <InfoCard
              title="Work Unit & Measurement Type"
              variant="default"
              className="border-none"
            >
              <div className="md:col-span-1 space-y-2">
                <Label className="dark:text-gray-300">Work Unit *</Label>
                <SearchableSelect
                  items={workUnitItems}
                  value={splitData.workUnit}
                  onChange={(val) =>
                    setSplitData((p) => ({ ...p, workUnit: val || "" }))
                  }
                  placeholder="Pilih work unit"
                  emptyText="Work unit tidak ditemukan"
                  error={!!errors.workUnit}
                  disabled={isSaving}
                />
                {errors.workUnit && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.workUnit}
                  </p>
                )}
              </div>

              <div className="md:col-span-1 space-y-2">
                <Label className="dark:text-gray-300">Measurement Type *</Label>
                <SearchableSelect
                  items={MEASUREMENT_TYPE_OPTIONS}
                  value={splitData.measurementType}
                  onChange={(val) => {
                    setSplitData((p) => ({ ...p, measurementType: val || "" }));
                    setCheckerIds([]);
                  }}
                  placeholder="Pilih measurement type"
                  emptyText="Measurement type tidak ditemukan"
                  error={!!errors.measurementType}
                  disabled={isSaving}
                />
                {errors.measurementType && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.measurementType}
                  </p>
                )}
              </div>
            </InfoCard>

            <InfoCard
              title="Excavator & Loading Point"
              variant="default"
              className="border-none"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Excavator *</Label>
                <SearchableSelect
                  items={excaItems}
                  value={splitData.excavator}
                  onChange={(val) =>
                    setSplitData((p) => ({ ...p, excavator: val || "" }))
                  }
                  placeholder="Pilih excavator"
                  emptyText="Excavator tidak ditemukan"
                  error={!!errors.excavator}
                  disabled={isSaving}
                />
                {errors.excavator && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.excavator}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Loading Location *</Label>
                <SearchableSelect
                  items={loadLocItems}
                  value={splitData.loadingLocation}
                  onChange={(val) =>
                    setSplitData((p) => ({ ...p, loadingLocation: val || "" }))
                  }
                  placeholder="Pilih lokasi loading"
                  emptyText="Lokasi loading tidak ditemukan"
                  error={!!errors.loadingLocation}
                  disabled={isSaving}
                />
                {errors.loadingLocation && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.loadingLocation}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Coal Type *</Label>
                <SearchableSelect
                  items={coalTypeItems}
                  value={splitData.coalType}
                  onChange={(val) =>
                    setSplitData((p) => ({ ...p, coalType: val || "" }))
                  }
                  placeholder="Pilih coal type"
                  emptyText="Coal type tidak ditemukan"
                  error={!!errors.coalType}
                  disabled={isSaving}
                />
                {errors.coalType && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.coalType}
                  </p>
                )}
              </div>
            </InfoCard>

            <InfoCard
              title="Dumping Points & Distance"
              variant="primary"
              className="border-none"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dumping Point 1 */}
                <div className="space-y-2">
                  <Label className="dark:text-gray-300 font-semibold">
                    Dumping Point 1 *
                  </Label>
                  <SearchableSelect
                    items={dumpLocItems}
                    value={splitData.dumpingLocation1}
                    onChange={(val) =>
                      setSplitData((p) => ({
                        ...p,
                        dumpingLocation1: val || "",
                      }))
                    }
                    placeholder="Pilih dumping point 1"
                    emptyText="Lokasi dumping tidak ditemukan"
                    error={!!errors.dumpingLocation1}
                    disabled={isSaving}
                  />
                  {errors.dumpingLocation1 && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {errors.dumpingLocation1}
                    </p>
                  )}
                </div>

                {/* Distance 1 */}
                <div className="space-y-2">
                  <Label className="dark:text-gray-300 font-semibold">
                    Distance 1 (m) *
                  </Label>
                  <Input
                    type="text"
                    value={distanceText1}
                    onFocus={() => {
                      if (distanceText1 === "0" || distanceText1 === "0.0")
                        setDistanceText1("");
                    }}
                    onChange={(e) =>
                      setDistanceText1(e.target.value.replace(",", "."))
                    }
                    onBlur={() => {
                      const v = distanceText1.trim();
                      if (v === "") {
                        setDistanceText1("0");
                        return;
                      }
                      const n = Number(v);
                      if (Number.isFinite(n)) setDistanceText1(String(n));
                    }}
                    placeholder="Masukkan jarak dalam meter"
                    disabled={isSaving}
                    className="border-none dark:text-gray-300"
                  />
                  {errors.distance1 && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {errors.distance1}
                    </p>
                  )}
                </div>

                {/* Dumping Point 2 */}
                <div className="space-y-2">
                  <Label className="dark:text-gray-300 font-semibold">
                    Dumping Point 2 *
                  </Label>
                  <SearchableSelect
                    items={dumpLocItems}
                    value={splitData.dumpingLocation2}
                    onChange={(val) =>
                      setSplitData((p) => ({
                        ...p,
                        dumpingLocation2: val || "",
                      }))
                    }
                    placeholder="Pilih dumping point 2"
                    emptyText="Lokasi dumping tidak ditemukan"
                    error={!!errors.dumpingLocation2}
                    disabled={isSaving}
                  />
                  {errors.dumpingLocation2 && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {errors.dumpingLocation2}
                    </p>
                  )}
                </div>

                {/* Distance 2 */}
                <div className="space-y-2">
                  <Label className="dark:text-gray-300 font-semibold">
                    Distance 2 (m) *
                  </Label>
                  <Input
                    type="text"
                    value={distanceText2}
                    onFocus={() => {
                      if (distanceText2 === "0" || distanceText2 === "0.0")
                        setDistanceText2("");
                    }}
                    onChange={(e) =>
                      setDistanceText2(e.target.value.replace(",", "."))
                    }
                    onBlur={() => {
                      const v = distanceText2.trim();
                      if (v === "") {
                        setDistanceText2("0");
                        return;
                      }
                      const n = Number(v);
                      if (Number.isFinite(n)) setDistanceText2(String(n));
                    }}
                    placeholder="Masukkan jarak dalam meter"
                    disabled={isSaving}
                    className="border-none dark:text-gray-300"
                  />
                  {errors.distance2 && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {errors.distance2}
                    </p>
                  )}
                </div>
              </div>
            </InfoCard>

            <InfoCard
              title="Checker & Inspector"
              variant="primary"
              className="border-none"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Checker *</Label>
                <MultiSearchableSelect
                  items={checkerItems}
                  values={checkerIds}
                  onChange={setCheckerIds}
                  placeholder="Pilih checker (bisa pilih banyak)"
                  emptyText="Checker tidak ditemukan"
                  error={!!errors.checker}
                  disabled={isSaving}
                />
                {errors.checker && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.checker}
                  </p>
                )}
                {checkerIds.length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {checkerIds.length} checker dipilih
                  </p>
                )}
              </div>

              {hasDifferentCompanies && (
                <div className="space-y-2">
                  <Label className="dark:text-gray-300">
                    Inspector * (Required: DT memiliki company berbeda)
                  </Label>
                  <MultiSearchableSelect
                    items={inspectorItems}
                    values={inspectorIds}
                    onChange={setInspectorIds}
                    placeholder="Pilih inspector (bisa pilih banyak)"
                    emptyText="Inspector tidak ditemukan"
                    disabled={isSaving}
                    error={!!errors.inspector}
                  />
                  {errors.inspector && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {errors.inspector}
                    </p>
                  )}
                  {inspectorIds.length > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {inspectorIds.length} inspector dipilih
                    </p>
                  )}
                </div>
              )}

              {!hasDifferentCompanies && (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-sm dark:text-blue-300">
                    Inspector tidak diperlukan karena semua DT memiliki company
                    yang sama
                  </AlertDescription>
                </Alert>
              )}
            </InfoCard>

            {errors.submit && (
              <Alert
                variant="destructive"
                className="dark:bg-red-900/20 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4 dark:text-red-400" />
                <AlertDescription className="dark:text-red-300">
                  {errors.submit}
                </AlertDescription>
              </Alert>
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
                className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:text-gray-200 dark:hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Menyimpan Split...
                  </>
                ) : (
                  "Buat 2 Fleet"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <LoadingOverlay isVisible={isSaving} message="Menyimpan split fleet..." />
    </div>
  );
};

export default FleetSplitModal;
