import React from "react";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { AlertCircle, Settings, Truck, User, ArrowLeft, ArrowRight } from "lucide-react";
import { SEARCH_PLACEHOLDERS } from "@/modules/timbangan/fleet/constant/fleetConstants";
import { MEASUREMENT_TYPE_OPTIONS } from "@/modules/timbangan/fleet/constant/fleetConstants";
import { getDumptruckStatus } from "@/modules/timbangan/fleet/utils/FleetDumptruckHelper";
import { showToast } from "@/shared/utils/toast";

const FleetSplitSettingsSection = ({
  isSplitMode,
  setIsSplitMode,
  isEdit,
  inspectorIds,
  checkerIds,
  dumpLocItems,
  checkerItems,
  inspectorItems,
  fleetData,
  fleet2Data,
  setFleet2Data,
  fleet2DistanceText,
  setFleet2DistanceText,
  fleet2CheckerIds,
  setFleet2CheckerIds,
  fleet2InspectorIds,
  setFleet2InspectorIds,
  fleet2SelectedUnits,
  setFleet2SelectedUnits,
  fleet2UnitOperators,
  setFleet2UnitOperators,
  selectedUnits,
  setSelectedUnits,
  unitOperators,
  setUnitOperators,
  filteredUnitsForFleet2,
  usedDumptrucksMap,
  masters,
  errors,
  isSaving,
  searchQuery2,
  setSearchQuery2,
  showAllUnits2,
  setShowAllUnits2,
  canMoveFromFleet2ToFleet1,
  getOperatorOptionsForUnit,
  setErrors,
}) => {
  // Handler untuk memindahkan semua DT dari Fleet 2 ke Fleet 1
  const handleMergeFleet2ToFleet1 = () => {
    if (fleet2SelectedUnits.length === 0) {
      showToast("Tidak ada dump truck di Fleet 2 untuk dipindahkan", "info");
      return;
    }

    // Pindahkan semua unit dari Fleet 2 ke Fleet 1
    setSelectedUnits((prev) => [...prev, ...fleet2SelectedUnits]);
    
    // Pindahkan semua operator
    setUnitOperators((prev) => ({
      ...prev,
      ...fleet2UnitOperators,
    }));

    // Kosongkan Fleet 2
    setFleet2SelectedUnits([]);
    setFleet2UnitOperators({});

    showToast(
      `Berhasil memindahkan ${fleet2SelectedUnits.length} dump truck ke Fleet 1`,
      "success"
    );
  };

  // Handler untuk memindahkan semua DT dari Fleet 1 ke Fleet 2
  const handleMergeFleet1ToFleet2 = () => {
    if (selectedUnits.length === 0) {
      showToast("Tidak ada dump truck di Fleet 1 untuk dipindahkan", "info");
      return;
    }

    // Pindahkan semua unit dari Fleet 1 ke Fleet 2
    setFleet2SelectedUnits((prev) => [...prev, ...selectedUnits]);
    
    // Pindahkan semua operator
    setFleet2UnitOperators((prev) => ({
      ...prev,
      ...unitOperators,
    }));

    // Kosongkan Fleet 1
    setSelectedUnits([]);
    setUnitOperators({});

    showToast(
      `Berhasil memindahkan ${selectedUnits.length} dump truck ke Fleet 2`,
      "success"
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Checkbox
          checked={isSplitMode}
          onCheckedChange={(checked) => {
            setIsSplitMode(checked);

            if (!checked) {
              setFleet2Data({
                dumpingLocation: "",
                measurementType: "",
                distance: 0,
              });
              setFleet2DistanceText("");
              setFleet2CheckerIds([]);
              setFleet2InspectorIds([]);
              setFleet2SelectedUnits([]);
              setFleet2UnitOperators({});
              setShowAllUnits2(false);
              setSearchQuery2("");
            } else {
              if (inspectorIds.length > 0) {
                setFleet2InspectorIds([...inspectorIds]);
              }
              if (checkerIds.length > 0) {
                setFleet2CheckerIds([...checkerIds]);
              }
            }
          }}
          disabled={isSaving}
          className="dark:text-gray-200"
        />
        <div className="flex-1">
          <Label className="text-sm font-medium cursor-pointer dark:text-gray-300">
            <Settings className="w-4 h-4 inline mr-2" />
            Split Fleet Setting {isEdit && "(Edit 2 Fleet)"}
          </Label>
        </div>
      </div>

      {isSplitMode && (
        <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="p-4 border-b border-blue-300 dark:border-blue-700">
            <h3 className="text-base font-semibold flex items-center gap-2 dark:text-gray-200">
              <Settings className="w-4 h-4" />
              Setting Fleet 2 (Split)
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-gray-300">
                  Dumping Location Fleet 2 *
                </Label>
                <SearchableSelect
                  items={dumpLocItems}
                  value={fleet2Data.dumpingLocation}
                  onChange={(val) =>
                    setFleet2Data((p) => ({
                      ...p,
                      dumpingLocation: val || "",
                    }))
                  }
                  placeholder="Pilih lokasi dumping untuk fleet 2"
                  emptyText="Lokasi dumping tidak ditemukan"
                  error={!!errors.fleet2DumpingLocation}
                  disabled={isSaving}
                />
                {errors.fleet2DumpingLocation && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.fleet2DumpingLocation}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">
                  Measurement Type Fleet 2 *
                </Label>
                <SearchableSelect
                  items={MEASUREMENT_TYPE_OPTIONS}
                  value={fleet2Data.measurementType}
                  onChange={(val) =>
                    setFleet2Data((p) => ({
                      ...p,
                      measurementType: val || "",
                    }))
                  }
                  placeholder="Pilih measurement type"
                  emptyText="Measurement type tidak ditemukan"
                  error={!!errors.fleet2MeasurementType}
                  disabled={isSaving}
                />
                {errors.fleet2MeasurementType && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.fleet2MeasurementType}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">
                  Distance Fleet 2 (m) *
                </Label>
                <Input
                  type="text"
                  value={fleet2DistanceText}
                  onFocus={() => {
                    if (
                      fleet2DistanceText === "0" ||
                      fleet2DistanceText === "0.0"
                    )
                      setFleet2DistanceText("");
                  }}
                  onChange={(e) =>
                    setFleet2DistanceText(e.target.value.replace(",", "."))
                  }
                  onBlur={() => {
                    const v = fleet2DistanceText.trim();
                    if (v === "") {
                      setFleet2DistanceText("0");
                      return;
                    }
                    const n = Number(v);
                    if (Number.isFinite(n)) setFleet2DistanceText(String(n));
                  }}
                  placeholder="Masukkan jarak dalam meter"
                  disabled={isSaving}
                  className="border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
                {errors.fleet2Distance && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.fleet2Distance}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="dark:text-gray-300">Coal Type Fleet 2</Label>
                <Input
                  type="text"
                  value={fleet2Data.coalType || ""}
                  onChange={(e) =>
                    setFleet2Data((p) => ({
                      ...p,
                      coalType: e.target.value,
                    }))
                  }
                  placeholder="Masukkan jenis batubara (opsional)"
                  disabled={isSaving}
                  className="border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">Inspector Fleet 2 *</Label>
              <MultiSearchableSelect
                items={inspectorItems}
                values={fleet2InspectorIds}
                onChange={(vals) => setFleet2InspectorIds(vals)}
                placeholder="Pilih inspector"
                emptyText="Inspector tidak ditemukan"
                error={!!errors.fleet2Inspectors}
                disabled={isSaving}
              />
              {errors.fleet2Inspectors && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {errors.fleet2Inspectors}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">Checker Fleet 2</Label>
              <MultiSearchableSelect
                items={checkerItems}
                values={fleet2CheckerIds}
                onChange={(vals) => setFleet2CheckerIds(vals)}
                placeholder="Pilih checker"
                emptyText="Checker tidak ditemukan"
                error={!!errors.fleet2Checkers}
                disabled={isSaving}
              />
              {errors.fleet2Checkers && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {errors.fleet2Checkers}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="dark:text-gray-300">
                  Dump Truck Fleet 2 *
                </Label>
                <Input
                  placeholder={SEARCH_PLACEHOLDERS.UNIT}
                  value={searchQuery2}
                  onChange={(e) => setSearchQuery2(e.target.value)}
                  className="max-w-xs border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  disabled={isSaving}
                />
              </div>

              {/* TOMBOL GABUNGKAN KE FLEET 1 */}
              {fleet2SelectedUnits.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                  <Button
                    type="button"
                    onClick={handleMergeFleet2ToFleet1}
                    disabled={isSaving || fleet2SelectedUnits.length === 0}
                    className="w-full cursor-pointer disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white dark:from-purple-600 dark:to-blue-600 dark:hover:from-purple-700 dark:hover:to-blue-700"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Gabungkan Semua ke Fleet 1
                    {fleet2SelectedUnits.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                        {fleet2SelectedUnits.length} DT
                      </span>
                    )}
                  </Button>
                  <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2">
                    💡 Pindahkan semua dump truck Fleet 2 → Fleet 1 (termasuk operator)
                  </p>
                </div>
              )}

              {errors.fleet2Units && (
                <Alert
                  variant="destructive"
                  className="mb-2 dark:bg-red-900/20 dark:border-red-800"
                >
                  <AlertCircle className="h-4 w-4 dark:text-red-400" />
                  <AlertDescription className="dark:text-red-300">
                    {errors.fleet2Units}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Checkbox
                  checked={showAllUnits2}
                  onCheckedChange={(checked) => {
                    setShowAllUnits2(checked);
                  }}
                  disabled={isSaving}
                  className="dark:text-gray-200"
                />
                <Label className="text-sm font-medium cursor-pointer dark:text-gray-300">
                  Tampilkan semua mitra
                </Label>
              </div>

              {(fleet2SelectedUnits.length > 0 ||
                filteredUnitsForFleet2.length > 0 ||
                selectedUnits.length > 0) && (
                <div className="rounded-lg max-h-96 overflow-y-auto">
                  {fleet2SelectedUnits.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-t-lg border-b-2 border-green-300 dark:border-green-700">
                        <Truck className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-green-900 dark:text-green-200">
                          Dump Truck Fleet 2 ({fleet2SelectedUnits.length})
                        </span>
                      </div>
                      {fleet2SelectedUnits.map((unit) => {
                        const hasOperatorError =
                          errors[`fleet2_operator_${unit.id}`];

                        return (
                          <div
                            key={unit.id}
                            className="p-3 bg-green-50 dark:bg-green-900/20"
                          >
                            <div className="flex items-start gap-3">
                              <div className="pt-1">
                                <Checkbox
                                  checked={true}
                                  onCheckedChange={() => {
                                    if (!isSaving) {
                                      const validationResult =
                                        canMoveFromFleet2ToFleet1(
                                          fleet2SelectedUnits,
                                          unit,
                                        );

                                      if (!validationResult.allowed) {
                                        showToast(
                                          validationResult.reason,
                                          "warning",
                                        );
                                        return;
                                      }

                                      const operatorId =
                                        fleet2UnitOperators[unit.id];

                                      setSelectedUnits((prev) => [
                                        ...prev,
                                        unit,
                                      ]);
                                      if (operatorId) {
                                        setUnitOperators((prev) => ({
                                          ...prev,
                                          [unit.id]: operatorId,
                                        }));
                                      }

                                      setFleet2SelectedUnits((prev) =>
                                        prev.filter(
                                          (u) =>
                                            String(u.id) !== String(unit.id),
                                        ),
                                      );
                                      setFleet2UnitOperators((prev) => {
                                        const newOps = { ...prev };
                                        delete newOps[unit.id];
                                        return newOps;
                                      });

                                      setErrors((prev) => {
                                        const newErrors = { ...prev };
                                        delete newErrors[
                                          `fleet2_operator_${unit.id}`
                                        ];
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="dark:text-gray-200"
                                />
                              </div>
                              <Truck className="w-4 h-4 text-green-600 dark:text-green-400 mt-1" />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div
                                    className="cursor-pointer flex-1"
                                    onClick={() => {
                                      if (!isSaving) {
                                        const validationResult =
                                          canMoveFromFleet2ToFleet1(
                                            fleet2SelectedUnits,
                                            unit,
                                          );

                                        if (!validationResult.allowed) {
                                          showToast(
                                            validationResult.reason,
                                            "warning",
                                          );
                                          return;
                                        }

                                        const operatorId =
                                          fleet2UnitOperators[unit.id];

                                        setSelectedUnits((prev) => [
                                          ...prev,
                                          unit,
                                        ]);
                                        if (operatorId) {
                                          setUnitOperators((prev) => ({
                                            ...prev,
                                            [unit.id]: operatorId,
                                          }));
                                        }

                                        setFleet2SelectedUnits((prev) =>
                                          prev.filter(
                                            (u) =>
                                              String(u.id) !== String(unit.id),
                                          ),
                                        );
                                        setFleet2UnitOperators((prev) => {
                                          const newOps = { ...prev };
                                          delete newOps[unit.id];
                                          return newOps;
                                        });

                                        setErrors((prev) => {
                                          const newErrors = { ...prev };
                                          delete newErrors[
                                            `fleet2_operator_${unit.id}`
                                          ];
                                          return newErrors;
                                        });
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm dark:text-gray-200">
                                        {unit.hull_no}
                                      </p>
                                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                                        Fleet 2
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {unit.company} • {unit.workUnit}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs flex items-center gap-1 dark:text-gray-300">
                                    <User className="w-3 h-3" />
                                    Operator Fleet 2 *
                                    {unit.company && (
                                      <span className="text-gray-500">
                                        ({unit.company})
                                      </span>
                                    )}
                                  </Label>

                                  <SearchableSelect
                                    items={getOperatorOptionsForUnit(unit)}
                                    value={
                                      fleet2UnitOperators[unit.id] || ""
                                    }
                                    onChange={(operatorId) => {
                                      setFleet2UnitOperators((prev) => {
                                        if (operatorId) {
                                          return {
                                            ...prev,
                                            [unit.id]: operatorId,
                                          };
                                        } else {
                                          const newOps = { ...prev };
                                          delete newOps[unit.id];
                                          return newOps;
                                        }
                                      });

                                      if (operatorId) {
                                        setErrors((prev) => {
                                          const newErrors = { ...prev };
                                          delete newErrors[
                                            `fleet2_operator_${unit.id}`
                                          ];
                                          return newErrors;
                                        });
                                      }
                                    }}
                                    placeholder="Pilih operator"
                                    emptyText="Tidak ada operator tersedia"
                                    disabled={isSaving}
                                    error={!!hasOperatorError}
                                  />

                                  {hasOperatorError && (
                                    <p className="text-xs text-red-500 dark:text-red-400">
                                      {hasOperatorError}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedUnits.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                          Dump Truck dari Fleet 1 (Klik untuk pindahkan)
                        </span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto bg-blue-50 dark:bg-blue-900/10 p-3 rounded-b-lg">
                        {selectedUnits.map((unit) => {
                          return (
                            <div
                              key={unit.id}
                              className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer"
                              onClick={() => {
                                if (!isSaving) {
                                  const operatorId = unitOperators[unit.id];

                                  setFleet2SelectedUnits((prev) => [
                                    ...prev,
                                    unit,
                                  ]);
                                  if (operatorId) {
                                    setFleet2UnitOperators((prev) => ({
                                      ...prev,
                                      [unit.id]: operatorId,
                                    }));
                                  }

                                  setSelectedUnits((prev) =>
                                    prev.filter(
                                      (u) => String(u.id) !== String(unit.id),
                                    ),
                                  );
                                  setUnitOperators((prev) => {
                                    const newOps = { ...prev };
                                    delete newOps[unit.id];
                                    return newOps;
                                  });
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="pt-1">
                                  <Checkbox
                                    checked={false}
                                    disabled={isSaving}
                                    className="dark:text-gray-200"
                                  />
                                </div>
                                <Truck className="w-4 h-4 mt-1 text-blue-600 dark:text-blue-400" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm dark:text-gray-200">
                                      {unit.hull_no}
                                    </p>
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                                      Fleet 1
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {unit.company} • {unit.workUnit}
                                  </p>
                                  {unitOperators[unit.id] && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                      Operator:{" "}
                                      {masters?.operators?.find(
                                        (op) =>
                                          String(op.id) ===
                                          String(unitOperators[unit.id]),
                                      )?.name || "N/A"}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredUnitsForFleet2.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Dump Truck Tersedia ({filteredUnitsForFleet2.length})
                        </span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900/30 p-3 rounded-b-lg">
                        {filteredUnitsForFleet2.map((unit) => {
                          const dtStatus = getDumptruckStatus(
                            unit.id,
                            fleet2SelectedUnits,
                            usedDumptrucksMap,
                            null,
                          );
                          const isUsedInOtherFleet = dtStatus === "used-other";

                          return (
                            <div
                              key={unit.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                isUsedInOtherFleet
                                  ? "bg-white dark:bg-gray-700 border-orange-200 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500"
                                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700"
                              }`}
                              onClick={() => {
                                if (!isSaving) {
                                  setFleet2SelectedUnits((prev) => [
                                    ...prev,
                                    unit,
                                  ]);
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="pt-1">
                                  <Checkbox
                                    checked={false}
                                    disabled={isSaving}
                                    className="dark:text-gray-200"
                                  />
                                </div>
                                <Truck
                                  className={`w-4 h-4 mt-1 ${
                                    isUsedInOtherFleet
                                      ? "text-orange-500 dark:text-orange-400"
                                      : "text-gray-400 dark:text-gray-500"
                                  }`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm dark:text-gray-200">
                                      {unit.hull_no}
                                    </p>
                                    {isUsedInOtherFleet && (
                                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded">
                                        ⚠️ Digunakan Fleet Lain
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {unit.company} • {unit.workUnit}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredUnitsForFleet2.length === 0 &&
                    fleet2SelectedUnits.length === 0 &&
                    selectedUnits.length === 0 && (
                      <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertDescription className="text-sm dark:text-yellow-300">
                          Tidak ada dump truck tersedia. Coba aktifkan{" "}
                          <strong>"Tampilkan semua mitra"</strong> untuk melihat
                          semua dump truck.
                        </AlertDescription>
                      </Alert>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FleetSplitSettingsSection;