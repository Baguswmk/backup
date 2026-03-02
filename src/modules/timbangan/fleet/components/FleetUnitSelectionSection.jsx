import React from "react";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { InfoCard } from "@/shared/components/InfoCard";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  SEARCH_PLACEHOLDERS,
  CARD_TITLES,
} from "@/modules/timbangan/fleet/constant/fleetConstants";
import { Truck, User, AlertCircle, Loader2 } from "lucide-react";
import { getDumptruckStatus } from "@/modules/timbangan/fleet/utils/FleetDumptruckHelper";

const FleetUnitSelectionSection = ({
  fleetData,
  errors,
  isSaving,
  isLoadingFilteredUnits,
  searchQuery,
  setSearchQuery,
  showAllUnits,
  setShowAllUnits,
  filteredUnits,
  selectedUnits,
  selectedUnitsList,
  unselectedUnitsList,
  pendingTransfers,
  isEdit,
  editingConfig,
  usedDumptrucksMap,
  unitOperators,
  masters,
  getOperatorOptionsForUnit,
  getAvailableOperatorCount,
  handleOperatorChange,
  handleUnitToggle,
}) => {
  if (!fleetData.excavator) {
    return null;
  }

  // ✅ Hitung jumlah DT di fleet saat edit
  const currentDTCount =
    isEdit && editingConfig?.dumpTrucks ? editingConfig.dumpTrucks.length : 0;
  const willBeEmpty =
    isEdit && selectedUnits.length === 0 && currentDTCount > 0;

  return (
    <InfoCard
      title={CARD_TITLES.UNITS}
      icon={Truck}
      variant="primary"
      className="border-none"
    >
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="dark:text-gray-300">Pilih Dump Truck *</Label>
          <Input
            placeholder={SEARCH_PLACEHOLDERS.UNIT}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
            disabled={isSaving || isLoadingFilteredUnits}
          />
        </div>

        {/* ✅ Warning jika fleet akan kosong */}
        {willBeEmpty && (
          <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-sm dark:text-orange-300">
              <strong>⚠️ Perhatian:</strong> Fleet ini akan menjadi kosong (0
              dump truck). Fleet kosong adalah valid, tapi pastikan ini memang
              yang Anda inginkan. Saat ini fleet memiliki {currentDTCount} dump
              truck.
            </AlertDescription>
          </Alert>
        )}

        {errors.units && (
          <Alert
            variant="destructive"
            className="mb-2 dark:bg-red-900/20 dark:border-red-800"
          >
            <AlertCircle className="h-4 w-4 dark:text-red-400" />
            <AlertDescription className="dark:text-red-300">
              {errors.units}
            </AlertDescription>
          </Alert>
        )}

        {isLoadingFilteredUnits && (
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
            <AlertDescription className="text-sm dark:text-blue-300">
              Memuat dump truck...
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingFilteredUnits && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <Checkbox
              checked={showAllUnits}
              onCheckedChange={(checked) => {
                setShowAllUnits(checked);
              }}
              disabled={isSaving}
              className="dark:text-gray-200"
            />
            <Label className="text-sm font-medium cursor-pointer dark:text-gray-300">
              Tampilkan semua mitra
            </Label>
          </div>
        )}

        {/* ✅ REMOVED: Tombol "Gabungkan ke Fleet 2" sudah tidak diperlukan 
            karena logic split sudah dipindah ke FleetSplitSettingsSection */}

        {!isLoadingFilteredUnits && filteredUnits.length > 0 && (
          <div className="rounded-lg max-h-96 overflow-y-auto scrollbar-thin">
            {selectedUnitsList.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-t-lg border-b-2 border-blue-300 dark:border-blue-700">
                  <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    Dump Truck Terpilih ({selectedUnitsList.length})
                  </span>
                </div>
                {selectedUnitsList.map((unit) => {
                  const isSelected = true;
                  const hasOperatorError = errors[`operator_${unit.id}`];

                  const dtStatus = getDumptruckStatus(
                    unit.id,
                    selectedUnits,
                    usedDumptrucksMap,
                    isEdit ? editingConfig?.id : null,
                  );
                  const isUsedInOtherFleet = dtStatus === "used-other";

                  const isPendingTransfer = pendingTransfers.some(
                    (t) => String(t.dumpTruckId) === String(unit.id),
                  );

                  return (
                    <div
                      key={unit.id}
                      className={`p-3 transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                          : isUsedInOtherFleet
                            ? "hover:bg-orange-50 dark:hover:bg-orange-900/10"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleUnitToggle(unit)}
                            disabled={isSaving}
                            className="dark:text-gray-200"
                          />
                        </div>
                        <Truck
                          className={`w-4 h-4 mt-1 ${
                            isSelected
                              ? "text-blue-600 dark:text-blue-400"
                              : isUsedInOtherFleet
                                ? "text-orange-500 dark:text-orange-400"
                                : "text-gray-400 dark:text-gray-500"
                          }`}
                        />
                        <div className="flex-1 space-y-2">
                          <div
                            className="cursor-pointer"
                            onClick={() => {
                              if (!isSaving) {
                                handleUnitToggle(unit);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm dark:text-gray-200">
                                {unit.hull_no}
                              </p>
                              {isSelected && !unit.operatorId && (
                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                                  ⚠️ Pilih Operator
                                </span>
                              )}
                              {isPendingTransfer && (
                                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded">
                                  🔄 Akan Dipindahkan
                                </span>
                              )}
                              {!isSelected && isUsedInOtherFleet && (
                                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded">
                                  ⚠️ Digunakan Fleet Lain
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {unit.company}
                            </p>
                          </div>

                          {isSelected && (
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1 dark:text-gray-300">
                                <User className="w-3 h-3" />
                                Operator *
                                {unit.company && (
                                  <span className="text-gray-500">
                                    ({unit.company})
                                  </span>
                                )}
                              </Label>

                              <SearchableSelect
                                items={getOperatorOptionsForUnit(unit.id)}
                                value={unitOperators[unit.id] || ""}
                                onChange={(operatorId) =>
                                  handleOperatorChange(unit.id, operatorId)
                                }
                                placeholder="Pilih operator"
                                emptyText={
                                  getAvailableOperatorCount(unit.id) === 0
                                    ? `Semua operator ${unit.company} sudah dipilih`
                                    : `Tidak ada operator untuk ${
                                        unit.company || "company ini"
                                      }`
                                }
                                disabled={
                                  isSaving ||
                                  getAvailableOperatorCount(unit.id) === 0
                                }
                                error={!!hasOperatorError}
                              />

                              {getAvailableOperatorCount(unit.id) > 0 &&
                                !unitOperators[unit.id] && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    {getAvailableOperatorCount(unit.id)}{" "}
                                    operator tersedia
                                  </p>
                                )}

                              {getAvailableOperatorCount(unit.id) === 0 &&
                                !unitOperators[unit.id] && (
                                  <p className="text-xs text-orange-600 dark:text-orange-400">
                                    ⚠️ Semua operator sudah dipilih di DT lain
                                  </p>
                                )}

                              {hasOperatorError && (
                                <p className="text-xs text-red-500 dark:text-red-400">
                                  {hasOperatorError}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {unselectedUnitsList.length > 0 && (
              <div>
                {selectedUnitsList.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-t-lg border-b border-gray-300 dark:border-gray-600">
                    <Truck className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Dump Truck Tersedia ({unselectedUnitsList.length})
                    </span>
                  </div>
                )}
                {unselectedUnitsList.map((unit) => {
                  const isSelected = selectedUnits.some(
                    (u) => String(u.id) === String(unit.id),
                  );
                  const hasOperatorError = errors[`operator_${unit.id}`];

                  const dtStatus = getDumptruckStatus(
                    unit.id,
                    selectedUnits,
                    usedDumptrucksMap,
                    isEdit ? editingConfig?.id : null,
                  );
                  const isUsedInOtherFleet = dtStatus === "used-other";

                  return (
                    <div
                      key={unit.id}
                      className={`p-3 transition-colors ${
                        isSelected
                          ? "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500"
                          : isUsedInOtherFleet
                            ? "hover:bg-orange-50 dark:hover:bg-orange-900/10"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleUnitToggle(unit)}
                            disabled={isSaving}
                            className="dark:text-gray-200"
                          />
                        </div>
                        <Truck
                          className={`w-4 h-4 mt-1 ${
                            isSelected
                              ? "text-yellow-600 dark:text-yellow-400"
                              : isUsedInOtherFleet
                                ? "text-orange-500 dark:text-orange-400"
                                : "text-gray-400 dark:text-gray-500"
                          }`}
                        />
                        <div className="flex-1 space-y-2">
                          <div
                            className="cursor-pointer"
                            onClick={() => {
                              if (!isSaving) {
                                handleUnitToggle(unit);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm dark:text-gray-200">
                                {unit.hull_no}
                              </p>
                              {isSelected && (
                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                                  ⚠️ Pilih Operator
                                </span>
                              )}
                              {!isSelected && isUsedInOtherFleet && (
                                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded">
                                  ⚠️ Digunakan Fleet Lain
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {unit.company} • {unit.workUnit}
                            </p>
                          </div>

                          {isSelected && (
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1 dark:text-gray-300">
                                <User className="w-3 h-3" />
                                Operator *
                                {unit.company && (
                                  <span className="text-gray-500">
                                    ({unit.company})
                                  </span>
                                )}
                              </Label>

                              <SearchableSelect
                                items={getOperatorOptionsForUnit(unit.id)}
                                value={unitOperators[unit.id] || ""}
                                onChange={(operatorId) =>
                                  handleOperatorChange(unit.id, operatorId)
                                }
                                placeholder="Pilih operator"
                                emptyText={
                                  getAvailableOperatorCount(unit.id) === 0
                                    ? `Semua operator ${unit.company} sudah dipilih`
                                    : `Tidak ada operator untuk ${
                                        unit.company || "company ini"
                                      }`
                                }
                                disabled={
                                  isSaving ||
                                  getAvailableOperatorCount(unit.id) === 0
                                }
                                error={!!hasOperatorError}
                              />

                              {getAvailableOperatorCount(unit.id) > 0 &&
                                !unitOperators[unit.id] && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    {getAvailableOperatorCount(unit.id)}{" "}
                                    operator tersedia
                                  </p>
                                )}

                              {getAvailableOperatorCount(unit.id) === 0 &&
                                !unitOperators[unit.id] && (
                                  <p className="text-xs text-orange-600 dark:text-orange-400">
                                    ⚠️ Semua operator sudah dipilih di DT lain
                                  </p>
                                )}

                              {hasOperatorError && (
                                <p className="text-xs text-red-500 dark:text-red-400">
                                  {hasOperatorError}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </InfoCard>
  );
};

export default FleetUnitSelectionSection;
