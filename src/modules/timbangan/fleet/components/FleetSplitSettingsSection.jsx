import React, { useMemo, useCallback, useState } from "react";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  AlertCircle,
  Settings,
  Truck,
  ArrowLeft,
  ArrowRight,
  User,
} from "lucide-react";
import {
  MEASUREMENT_TYPE_OPTIONS,
  SEARCH_PLACEHOLDERS,
} from "@/modules/timbangan/fleet/constant/fleetConstants";
import { getDumptruckStatus } from "@/modules/timbangan/fleet/utils/FleetDumptruckHelper";
import { showToast } from "@/shared/utils/toast";

/**
 * ✅ IMPROVED: Universal split fleet settings with better UI/UX
 * - Works with fleetsUniverse from useFleetSplit (supports 3-5 fleets)
 * - Enhanced visual design following reference pattern
 */
const FleetSplitSettingsSection = ({
  isSplitMode,

  // ✅ Master data
  dumpLocItems,
  checkerItems,
  inspectorItems,
  masters,

  // ✅ Universe management (from useFleetSplit)
  fleetsUniverse,
  activeFleetId,
  updateFleetInUniverse,
  getFleetNumber,

  // ✅ Unit management
  filteredUnitsForUniverse,
  usedDumptrucksMap,
  getOperatorOptionsForUnit,

  // ✅ Primary fleet transfer functions
  primarySelectedUnits,
  primaryUnitOperators,
  setPrimarySelectedUnits,
  setPrimaryUnitOperators,

  // ✅ UI states
  errors,
  isSaving,
  setErrors,
  showAllUnits,
  setShowAllUnits,
}) => {
  // ✅ Local search state
  const [searchQuery, setSearchQuery] = useState("");
  const activeFleet = useMemo(() => {
    return fleetsUniverse.find((f) => f.id === activeFleetId);
  }, [fleetsUniverse, activeFleetId]);

  // ✅ Get fleet label
  const fleetLabel = useMemo(() => {
    return activeFleetId ? getFleetNumber(activeFleetId) : 0;
  }, [activeFleetId, getFleetNumber]);

  // ✅ Update active fleet field
  const updateActiveFleetField = useCallback(
    (field, value) => {
      if (!activeFleetId) return;
      updateFleetInUniverse(activeFleetId, { [field]: value });
    },
    [activeFleetId, updateFleetInUniverse],
  );

  // ✅ Move unit from primary to active universe fleet
  const handleMovePrimaryToUniverse = useCallback(
    (unit) => {
      if (!activeFleetId || isSaving) return;

      const operatorId = primaryUnitOperators[unit.id];

      // Add to universe fleet
      updateFleetInUniverse(activeFleetId, {
        selectedUnits: [...(activeFleet?.selectedUnits || []), unit],
        unitOperators: {
          ...(activeFleet?.unitOperators || {}),
          ...(operatorId ? { [unit.id]: operatorId } : {}),
        },
      });

      // Remove from primary
      setPrimarySelectedUnits((prev) =>
        prev.filter((u) => String(u.id) !== String(unit.id)),
      );
      setPrimaryUnitOperators((prev) => {
        const newOps = { ...prev };
        delete newOps[unit.id];
        return newOps;
      });

      showToast.success(`Dump truck dipindahkan ke Fleet ${fleetLabel}`);
    },
    [
      activeFleetId,
      activeFleet,
      primaryUnitOperators,
      updateFleetInUniverse,
      setPrimarySelectedUnits,
      setPrimaryUnitOperators,
      isSaving,
      fleetLabel,
    ],
  );

  // ✅ Select unit from available list
  const handleSelectUnitForUniverse = useCallback(
    (unit) => {
      if (!activeFleetId || isSaving) return;

      // ✅ Check if this DT has an operator in Primary fleet
      let operatorId = primaryUnitOperators[unit.id];
      let sourceIsPrimary = false;

      if (operatorId) {
        sourceIsPrimary = true;
      } else {
        // ✅ Check if this DT has an operator in another Universe fleet
        for (const fleet of fleetsUniverse) {
          if (fleet.id !== activeFleetId && fleet.unitOperators?.[unit.id]) {
            operatorId = fleet.unitOperators[unit.id];
            break;
          }
        }
      }

      // Add to current universe fleet
      updateFleetInUniverse(activeFleetId, {
        selectedUnits: [...(activeFleet?.selectedUnits || []), unit],
        ...(operatorId && {
          unitOperators: {
            ...(activeFleet?.unitOperators || {}),
            [unit.id]: operatorId,
          },
        }),
      });

      // ✅ Remove from source if operator found
      if (operatorId) {
        if (sourceIsPrimary) {
          // Remove from primary
          setPrimarySelectedUnits((prev) =>
            prev.filter((u) => String(u.id) !== String(unit.id)),
          );
          setPrimaryUnitOperators((prev) => {
            const newOps = { ...prev };
            delete newOps[unit.id];
            return newOps;
          });
        } else {
          // Remove from other universe fleet
          const sourceFleet = fleetsUniverse.find(
            (f) => f.id !== activeFleetId && f.unitOperators?.[unit.id],
          );

          if (sourceFleet) {
            updateFleetInUniverse(sourceFleet.id, {
              selectedUnits: (sourceFleet.selectedUnits || []).filter(
                (u) => String(u.id) !== String(unit.id),
              ),
              unitOperators: Object.fromEntries(
                Object.entries(sourceFleet.unitOperators || {}).filter(
                  ([key]) => String(key) !== String(unit.id),
                ),
              ),
            });
          }
        }

        showToast.success(
          `Dump truck & operator dipindahkan ke Fleet ${fleetLabel}`,
        );
      }
    },
    [
      activeFleetId,
      activeFleet,
      updateFleetInUniverse,
      isSaving,
      primaryUnitOperators,
      fleetsUniverse,
      setPrimarySelectedUnits,
      setPrimaryUnitOperators,
      fleetLabel,
    ],
  );

  // ✅ Deselect unit
  const handleDeselectUnitFromUniverse = useCallback(
    (unit) => {
      if (!activeFleetId || isSaving) return;

      // Prevent if will have 0 units
      if (activeFleet?.selectedUnits?.length <= 1) {
        showToast.warning(
          `Fleet ${fleetLabel} harus memiliki minimal 1 dump truck`,
        );
        return;
      }

      const updatedUnits = (activeFleet?.selectedUnits || []).filter(
        (u) => String(u.id) !== String(unit.id),
      );
      const updatedOps = { ...(activeFleet?.unitOperators || {}) };
      delete updatedOps[unit.id];

      updateFleetInUniverse(activeFleetId, {
        selectedUnits: updatedUnits,
        unitOperators: updatedOps,
      });

      // Clear error
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`fleet${fleetLabel}_operator_${unit.id}`];
        return newErrors;
      });
    },
    [
      activeFleetId,
      activeFleet,
      updateFleetInUniverse,
      isSaving,
      fleetLabel,
      setErrors,
    ],
  );

  // ✅ Change operator
  const handleOperatorChangeForUniverse = useCallback(
    (unitId, operatorId) => {
      if (!activeFleetId) return;

      updateFleetInUniverse(activeFleetId, {
        unitOperators: {
          ...(activeFleet?.unitOperators || {}),
          ...(operatorId ? { [unitId]: operatorId } : {}),
        },
      });

      // Clear error if operator is selected
      if (operatorId) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`fleet${fleetLabel}_operator_${unitId}`];
          return newErrors;
        });
      }
    },
    [activeFleetId, activeFleet, updateFleetInUniverse, fleetLabel, setErrors],
  );

  // ✅ Merge all units from universe to primary
  const handleMergeUniverseToPrimary = useCallback(() => {
    if (!activeFleetId || !activeFleet || isSaving) return;

    if (!activeFleet.selectedUnits || activeFleet.selectedUnits.length === 0) {
      showToast.info("Tidak ada dump truck untuk dipindahkan");
      return;
    }

    // Move all units
    setPrimarySelectedUnits((prev) => [...prev, ...activeFleet.selectedUnits]);
    setPrimaryUnitOperators((prev) => ({
      ...prev,
      ...(activeFleet.unitOperators || {}),
    }));

    // Clear universe fleet
    updateFleetInUniverse(activeFleetId, {
      selectedUnits: [],
      unitOperators: {},
    });

    showToast.success(
      `Berhasil memindahkan ${activeFleet.selectedUnits.length} dump truck ke Fleet 1`,
    );
  }, [
    activeFleetId,
    activeFleet,
    setPrimarySelectedUnits,
    setPrimaryUnitOperators,
    updateFleetInUniverse,
    isSaving,
  ]);

  // ✅ Separate selected and unselected units (similar to FleetUnitSelectionSection)
  const { selectedUnitsList, unselectedUnitsList } = useMemo(() => {
    const selected = [];
    const unselected = [];

    // Apply search filter
    const q = searchQuery.toLowerCase();
    const searchFiltered = searchQuery
      ? filteredUnitsForUniverse.filter(
          (u) =>
            u.hull_no?.toLowerCase().includes(q) ||
            u.company?.toLowerCase().includes(q) ||
            u.workUnit?.toLowerCase().includes(q),
        )
      : filteredUnitsForUniverse;

    // Separate into selected and unselected
    searchFiltered.forEach((unit) => {
      const isSelected = (activeFleet?.selectedUnits || []).some(
        (u) => String(u.id) === String(unit.id),
      );
      if (isSelected) {
        selected.push(unit);
      } else {
        unselected.push(unit);
      }
    });

    return {
      selectedUnitsList: selected,
      unselectedUnitsList: unselected,
    };
  }, [filteredUnitsForUniverse, searchQuery, activeFleet?.selectedUnits]);

  if (!isSplitMode || !activeFleetId || !activeFleet) {
    return null;
  }

  return (
    <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      {/* Header */}
      <div className="p-4 border-b border-blue-300 dark:border-blue-700">
        <h3 className="text-base font-semibold flex items-center gap-2 dark:text-gray-200">
          <Settings className="w-4 h-4" />
          Setting Fleet {fleetLabel} (Split)
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Settings */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="dark:text-gray-300">
              Dumping Location Fleet {fleetLabel} *
            </Label>
            <SearchableSelect
              items={dumpLocItems}
              value={activeFleet.dumpingLocation || ""}
              onChange={(val) =>
                updateActiveFleetField("dumpingLocation", val || "")
              }
              placeholder={`Pilih lokasi dumping untuk fleet ${fleetLabel}`}
              emptyText="Lokasi dumping tidak ditemukan"
              error={!!errors[`fleet${fleetLabel}_dumping`]}
              disabled={isSaving}
            />
            {errors[`fleet${fleetLabel}_dumping`] && (
              <p className="text-sm text-red-500 dark:text-red-400">
                {errors[`fleet${fleetLabel}_dumping`]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="dark:text-gray-300">
              Measurement Type Fleet {fleetLabel} *
            </Label>
            <SearchableSelect
              items={MEASUREMENT_TYPE_OPTIONS}
              value={activeFleet.measurementType || ""}
              onChange={(val) =>
                updateActiveFleetField("measurementType", val || "")
              }
              placeholder="Pilih measurement type"
              emptyText="Measurement type tidak ditemukan"
              error={!!errors[`fleet${fleetLabel}_measurement`]}
              disabled={isSaving}
            />
            {errors[`fleet${fleetLabel}_measurement`] && (
              <p className="text-sm text-red-500 dark:text-red-400">
                {errors[`fleet${fleetLabel}_measurement`]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="dark:text-gray-300">
              Distance Fleet {fleetLabel} (m) *
            </Label>
            <Input
              type="text"
              value={activeFleet.distance || 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                updateActiveFleetField("distance", val);
              }}
              placeholder="Masukkan jarak dalam meter"
              disabled={isSaving}
              className="border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            {errors[`fleet${fleetLabel}_distance`] && (
              <p className="text-sm text-red-500 dark:text-red-400">
                {errors[`fleet${fleetLabel}_distance`]}
              </p>
            )}
          </div>
        </div>

        {/* Inspectors & Checkers */}
        <div className="space-y-2">
          <Label className="dark:text-gray-300">
            Inspector Fleet {fleetLabel} *
          </Label>
          <MultiSearchableSelect
            items={inspectorItems}
            values={activeFleet.inspectorIds || []}
            onChange={(vals) => updateActiveFleetField("inspectorIds", vals)}
            placeholder="Pilih inspector"
            emptyText="Inspector tidak ditemukan"
            error={!!errors[`fleet${fleetLabel}_inspectors`]}
            disabled={isSaving}
          />
          {errors[`fleet${fleetLabel}_inspectors`] && (
            <p className="text-sm text-red-500 dark:text-red-400">
              {errors[`fleet${fleetLabel}_inspectors`]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="dark:text-gray-300">
            Checker Fleet {fleetLabel}
          </Label>
          <SearchableSelect
            items={checkerItems}
            value={activeFleet.checkerIds?.[0] || ""}
            onChange={(val) => {
              updateActiveFleetField("checkerIds", val ? [val] : []);
            }}
            placeholder="Pilih checker (opsional)"
            emptyText="Checker tidak ditemukan"
            disabled={isSaving}
          />
        </div>

        {/* Dump Truck Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="dark:text-gray-300">
              Dump Truck Fleet {fleetLabel} *
            </Label>
            <Input
              placeholder={SEARCH_PLACEHOLDERS.UNIT}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
              disabled={isSaving}
            />
          </div>

          {/* TOMBOL GABUNGKAN KE FLEET 1 */}
          {activeFleet.selectedUnits &&
            activeFleet.selectedUnits.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                <Button
                  type="button"
                  onClick={handleMergeUniverseToPrimary}
                  disabled={isSaving || activeFleet.selectedUnits.length === 0}
                  className="w-full cursor-pointer disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white dark:from-purple-600 dark:to-blue-600 dark:hover:from-purple-700 dark:hover:to-blue-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Gabungkan Semua ke Fleet 1
                  {activeFleet.selectedUnits.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                      {activeFleet.selectedUnits.length} DT
                    </span>
                  )}
                </Button>
                <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2">
                  💡 Pindahkan semua dump truck Fleet {fleetLabel} → Fleet 1
                  (termasuk operator)
                </p>
              </div>
            )}

          {errors[`fleet${fleetLabel}_units`] && (
            <Alert
              variant="destructive"
              className="mb-2 dark:bg-red-900/20 dark:border-red-800"
            >
              <AlertCircle className="h-4 w-4 dark:text-red-400" />
              <AlertDescription className="dark:text-red-300">
                {errors[`fleet${fleetLabel}_units`]}
              </AlertDescription>
            </Alert>
          )}

          {/* Show All Units Checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <Checkbox
              checked={showAllUnits}
              onCheckedChange={(checked) => setShowAllUnits(checked)}
              disabled={isSaving}
              className="dark:text-gray-200"
            />
            <Label className="text-sm font-medium cursor-pointer dark:text-gray-300">
              Tampilkan semua mitra
            </Label>
          </div>

          {/* Units Display */}
          <div className="rounded-lg max-h-96 overflow-y-auto">
            {/* Selected Units in Fleet */}
            {selectedUnitsList.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-t-lg border-b-2 border-green-300 dark:border-green-700">
                  <Truck className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-semibold text-green-900 dark:text-green-200">
                    Dump Truck Fleet {fleetLabel} ({selectedUnitsList.length})
                  </span>
                </div>
                {selectedUnitsList.map((unit) => {
                  const hasOperatorError =
                    errors[`fleet${fleetLabel}_operator_${unit.id}`];
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
                                handleDeselectUnitFromUniverse(unit);
                              }
                            }}
                            disabled={isSaving}
                            className="dark:text-gray-200"
                          />
                        </div>
                        <Truck className="w-4 h-4 text-green-600 dark:text-green-400 mt-1" />
                        <div className="flex-1 space-y-2">
                          <div
                            className="cursor-pointer"
                            onClick={() => {
                              if (!isSaving) {
                                handleDeselectUnitFromUniverse(unit);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm dark:text-gray-200">
                                {unit.hull_no}
                              </p>
                              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                                Fleet {fleetLabel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {unit.company} • {unit.workUnit}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1 dark:text-gray-300">
                              <User className="w-3 h-3" />
                              Operator Fleet {fleetLabel} *
                              {unit.company && (
                                <span className="text-gray-500">
                                  ({unit.company})
                                </span>
                              )}
                            </Label>

                            <SearchableSelect
                              items={getOperatorOptionsForUnit(unit)}
                              value={activeFleet.unitOperators?.[unit.id] || ""}
                              onChange={(operatorId) => {
                                handleOperatorChangeForUniverse(
                                  unit.id,
                                  operatorId,
                                );
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

            {/* Units from Fleet 1 (Click to move) */}
            {primarySelectedUnits.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Dump Truck dari Fleet 1 (Klik untuk pindahkan)
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto bg-blue-50 dark:bg-blue-900/10 p-3 rounded-b-lg">
                  {primarySelectedUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer"
                      onClick={() => handleMovePrimaryToUniverse(unit)}
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
                          {primaryUnitOperators[unit.id] && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Operator:{" "}
                              {masters?.operators?.find(
                                (op) =>
                                  String(op.id) ===
                                  String(primaryUnitOperators[unit.id]),
                              )?.name || "N/A"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Units */}
            {unselectedUnitsList.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Dump Truck Tersedia ({unselectedUnitsList.length})
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900/30 p-3 rounded-b-lg">
                  {unselectedUnitsList.map((unit) => {
                    const dtStatus = getDumptruckStatus(
                      unit.id,
                      activeFleet.selectedUnits || [],
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
                        onClick={() => handleSelectUnitForUniverse(unit)}
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

            {/* Empty State */}
            {unselectedUnitsList.length === 0 &&
              selectedUnitsList.length === 0 &&
              primarySelectedUnits.length === 0 && (
                <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-sm dark:text-yellow-300">
                    Tidak ada dump truck tersedia. Coba aktifkan{" "}
                    <strong>"Tampilkan semua mitra"</strong> untuk melihat semua
                    dump truck.
                  </AlertDescription>
                </Alert>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetSplitSettingsSection;