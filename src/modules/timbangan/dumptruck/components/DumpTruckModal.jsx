import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Truck, Loader2, AlertCircle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import SearchableSelect from "@/shared/components/SearchableSelect";
import ModalHeader from "@/shared/components/ModalHeader";
import { InfoCard, InfoItem } from "@/shared/components/InfoCard";
import { useDumptruck } from "@/modules/timbangan/dumptruck/hooks/useDumptruck";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import {
  UNIT_STATUS,
  UNIT_STATUS_COLORS,
  SEARCH_PLACEHOLDERS,
  BUTTON_LABELS,
  MODAL_TITLES,
  MODAL_SUBTITLES,
  CARD_TITLES,
  VALIDATION_MESSAGES,
  LOADING_MESSAGES,
  TOAST_MESSAGES,
} from "@/modules/timbangan/dumptruck/constant/dumptruckConstants";

const DumptruckModal = ({
  isOpen,
  onClose,
  editingSetting,
  onSave,
  availableFleets = [],
  availableDumptruckSettings = [],
}) => {
  const { _, getFilteredUnitsForFleet } = useDumptruck();

  const [selectedFleet, setSelectedFleet] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [unitOperators, setUnitOperators] = useState({});
  const [operators, setOperators] = useState([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [fleetFilteredUnits, setFleetFilteredUnits] = useState([]);
  const [isLoadingFilteredUnits, setIsLoadingFilteredUnits] = useState(false);
  const [allDumpTrucks, setAllDumpTrucks] = useState([]);
  const [isLoadingAllUnits, setIsLoadingAllUnits] = useState(false);

  const isEditMode = Boolean(editingSetting && editingSetting.id);

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
    const loadOperators = async () => {
      setOperatorsLoading(true);
      try {
        const data = await masterDataService.fetchOperators();
        setOperators(data);
      } catch (error) {
        console.error("Failed to load operators:", error);
      } finally {
        setOperatorsLoading(false);
      }
    };

    if (isOpen) {
      loadOperators();
    }
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;

    const loadAllDT = async () => {
      setIsLoadingAllUnits(true);
      try {
        const data = await masterDataService.fetchData("units", {
          type: "DUMP_TRUCK",
        });
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : data?.data || [];
          setAllDumpTrucks(arr);
        }
      } catch (e) {
        console.error("Gagal memuat semua dump truck:", e);
        if (!cancelled) setAllDumpTrucks([]);
      } finally {
        if (!cancelled) setIsLoadingAllUnits(false);
      }
    };

    if (isOpen && showAllUnits) {
      loadAllDT();
    } else {
      setAllDumpTrucks([]);
      setIsLoadingAllUnits(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, showAllUnits]);

  // ✅ FIXED: Remove problematic dependency that causes infinite re-render

useEffect(() => {
  if (!isOpen) return;
  
  if (editingSetting) {
    setSelectedFleet(editingSetting.fleet || null);
    setSelectedUnits(editingSetting.units || []);

    const initialOperators = {};
    (editingSetting.units || []).forEach((unit) => {
      if (unit.operatorId) {
        initialOperators[unit.id] = String(unit.operatorId);
      }
    });
    setUnitOperators(initialOperators);

    if (editingSetting.fleet?.id) {
      setIsLoadingFilteredUnits(true);
      getFilteredUnitsForFleet(String(editingSetting.fleet.id))
        .then((filtered) => {
          setFleetFilteredUnits(filtered);
        })
        .catch((error) => {
          console.error("Failed to load filtered units:", error);
          setFleetFilteredUnits([]);
        })
        .finally(() => {
          setIsLoadingFilteredUnits(false);
        });
    }
  } else {
    setSelectedFleet(null);
    setSelectedUnits([]);
    setUnitOperators({});
    setFleetFilteredUnits([]);
  }
  
  setSearchQuery("");
  setShowAllUnits(false);
  setErrors({});
}, [isOpen, editingSetting?.id]); 

  const handleFleetChangeWithFilter = useCallback(
    async (fleetId) => {
      const fleet = availableFleets.find(
        (f) => String(f.id) === String(fleetId)
      );
      setSelectedFleet(fleet || null);
      setSelectedUnits([]);
      setUnitOperators({});
      setShowAllUnits(false);
      setErrors((prev) => {
        const e = { ...prev };
        delete e.fleet;
        return e;
      });

      if (fleet) {
        setIsLoadingFilteredUnits(true);
        try {
          const filtered = await getFilteredUnitsForFleet(String(fleet.id));
          setFleetFilteredUnits(filtered);

          if (filtered.length === 0) {
            setErrors((prev) => ({
              ...prev,
              units: TOAST_MESSAGES.INFO.NO_UNITS_AVAILABLE(fleet.excavator),
            }));
          }
        } catch (error) {
          console.error("Failed to load filtered units:", error);
          setErrors((prev) => ({
            ...prev,
            units: TOAST_MESSAGES.ERROR.LOAD_FILTERED_UNITS_FAILED,
          }));
          setFleetFilteredUnits([]);
        } finally {
          setIsLoadingFilteredUnits(false);
        }
      } else {
        setFleetFilteredUnits([]);
      }
    },
    [availableFleets, getFilteredUnitsForFleet]
  );

  const fleetOptions = useMemo(
    () =>
      availableFleets
        .filter((fleet) => {
          if (editingSetting && String(fleet.id) === editingSetting.fleet?.id) {
            return true;
          }
          return !fleet.settingDumpTruckId || fleet.dumptruckCount === 0;
        })
        .map((fleet) => ({
          value: String(fleet.id),
          label: ` (${fleet.excavator})`,
          hint: `${fleet.workUnit ?? ""} • ${fleet.loadingLocation ?? ""}`,
        })),
    [availableFleets, editingSetting]
  );

  const operatorOptions = useMemo(
    () =>
      operators.map((op) => ({
        value: String(op.id),
        label: op.name,
        hint: op.company || "-",
      })),
    [operators]
  );

  const filteredUnits = useMemo(() => {
    let units = [];

    if (showAllUnits) {
      units = [...allDumpTrucks];
    } else {
      units = [...fleetFilteredUnits];
    }

    units = units.filter((unit) => {
      if (editingSetting) {
        const isCurrentSettingUnit = (editingSetting.units || []).some(
          (u) => String(u.id) === String(unit.id)
        );
        if (isCurrentSettingUnit) return true;
      }
      const isAssignedToAnySetting = (availableDumptruckSettings || []).some(
        (setting) =>
          (setting.units || []).some((u) => String(u.id) === String(unit.id))
      );
      return !isAssignedToAnySetting;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      units = units.filter(
        (u) =>
          u.hull_no?.toLowerCase().includes(q) ||
          u.company?.toLowerCase().includes(q) ||
          u.workUnit?.toLowerCase().includes(q)
      );
    }

    return units;
  }, [
    fleetFilteredUnits,
    allDumpTrucks,
    searchQuery,
    availableDumptruckSettings,
    editingSetting,
    showAllUnits,
  ]);

  const groupedUnits = useMemo(() => {
    const active = filteredUnits.filter((u) => u.status === UNIT_STATUS.ACTIVE);
    const maintenance = filteredUnits.filter((u) => u.status === UNIT_STATUS.MAINTENANCE);
    const inactive = filteredUnits.filter(
      (u) => u.status === UNIT_STATUS.INACTIVE || !u.status
    );
    return { active, maintenance, inactive };
  }, [filteredUnits]);

  const allUnitsHaveOperators = useMemo(() => {
    if (selectedUnits.length === 0) return false;
    return selectedUnits.every((unit) => unitOperators[unit.id]);
  }, [selectedUnits, unitOperators]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingSetting) {
      setSelectedFleet(editingSetting.fleet || null);
      setSelectedUnits(editingSetting.units || []);

      const initialOperators = {};
      (editingSetting.units || []).forEach((unit) => {
        if (unit.operatorId) {
          initialOperators[unit.id] = String(unit.operatorId);
        }
      });
      setUnitOperators(initialOperators);

      if (editingSetting.fleet?.id) {
        setIsLoadingFilteredUnits(true);
        getFilteredUnitsForFleet(String(editingSetting.fleet.id))
          .then((filtered) => {
            setFleetFilteredUnits(filtered);
          })
          .catch((error) => {
            console.error("Failed to load filtered units:", error);
            setFleetFilteredUnits([]);
          })
          .finally(() => {
            setIsLoadingFilteredUnits(false);
          });
      }
    } else {
      setSelectedFleet(null);
      setSelectedUnits([]);
      setUnitOperators({});
      setFleetFilteredUnits([]);
    }
    setSearchQuery("");
    setShowAllUnits(false);
    setErrors({});
  }, [isOpen, editingSetting, getFilteredUnitsForFleet]);

  const handleUnitToggle = useCallback((unit) => {
    setSelectedUnits((prev) => {
      const exists = prev.find((u) => u.id === unit.id);
      if (exists) {
        setUnitOperators((prevOps) => {
          const newOps = { ...prevOps };
          delete newOps[unit.id];
          return newOps;
        });
        return prev.filter((u) => u.id !== unit.id);
      } else {
        return [...prev, unit];
      }
    });
  }, []);

  const handleOperatorChange = useCallback((unitId, operatorId) => {
    setUnitOperators((prev) => ({
      ...prev,
      [unitId]: operatorId,
    }));

    if (operatorId) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`operator_${unitId}`];
        return newErrors;
      });
    }
  }, []);

  const handleSelectAll = useCallback(
    (status) => {
      const units = groupedUnits[status] || [];
      const allSelected = units.every((u) =>
        selectedUnits.some((su) => su.id === u.id)
      );

      if (allSelected) {
        const unitsToRemove = units.map((u) => u.id);
        setSelectedUnits((prev) =>
          prev.filter((su) => !unitsToRemove.includes(su.id))
        );
        setUnitOperators((prev) => {
          const newOps = { ...prev };
          unitsToRemove.forEach((id) => delete newOps[id]);
          return newOps;
        });
      } else {
        setSelectedUnits((prev) => [
          ...prev,
          ...units.filter((u) => !prev.some((p) => p.id === u.id)),
        ]);
      }
    },
    [groupedUnits, selectedUnits]
  );

  const validateForm = useCallback(() => {
    const e = {};

    if (!selectedFleet) {
      e.fleet = VALIDATION_MESSAGES.REQUIRED_FLEET;
    }

    if (selectedUnits.length === 0) {
      e.units = VALIDATION_MESSAGES.REQUIRED_UNITS;
    }

    selectedUnits.forEach((unit) => {
      if (!unitOperators[unit.id]) {
        e[`operator_${unit.id}`] = VALIDATION_MESSAGES.REQUIRED_OPERATOR;
        e.operators = VALIDATION_MESSAGES.ALL_OPERATORS_REQUIRED;
      }
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [selectedFleet, selectedUnits, unitOperators]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const pairDtOp = selectedUnits.map((unit) => ({
        truckId: parseInt(unit.id),
        operatorId: parseInt(unitOperators[unit.id]),
      }));

      await onSave({
        fleetId: selectedFleet?.id,
        pairDtOp: pairDtOp,
        selectedUnits: selectedUnits.map((unit) => ({
          ...unit,
          operatorId: unitOperators[unit.id],
        })),
      });
    } catch (err) {
      console.error("Save error:", err);
      setErrors((p) => ({ ...p, submit: err?.message || TOAST_MESSAGES.ERROR.SAVE_FAILED }));
    } finally {
      setIsSaving(false);
    }
  }, [validateForm, onSave, selectedFleet, selectedUnits, unitOperators]);

  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title={isEditMode ? MODAL_TITLES.EDIT : MODAL_TITLES.CREATE}
          subtitle={MODAL_SUBTITLES.FORM}
          icon={Truck}
          onClose={onClose}
          disabled={isSaving}
        />

        <div className="p-6 space-y-6">
          {/* Fleet Selection Card */}
          <Card className="dark:bg-gray-900 border-none">
            <CardHeader>
              <CardTitle className="text-base dark:text-white">{CARD_TITLES.FLEET}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label className="dark:text-gray-300">Pilih Fleet *</Label>
              <SearchableSelect
                items={fleetOptions}
                value={selectedFleet?.id ? String(selectedFleet.id) : ""}
                onChange={handleFleetChangeWithFilter}
                placeholder="Pilih fleet"
                emptyText="Fleet tidak ditemukan atau sudah memiliki setting"
                disabled={isSaving || isLoadingFilteredUnits}
                error={!!errors.fleet}
                allowClear={false}
              />
              {errors.fleet && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.fleet}</p>
              )}
              {isLoadingFilteredUnits && (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  <AlertDescription className="text-sm dark:text-blue-300">
                    {TOAST_MESSAGES.INFO.LOADING_UNITS}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Fleet Info Card */}
          {selectedFleet && !isLoadingFilteredUnits && (
            <InfoCard title={CARD_TITLES.FLEET_SELECTED} variant="primary">
              <InfoItem label="Excavator" value={selectedFleet.excavator} />
              <InfoItem label="Work Unit" value={selectedFleet.workUnit} />
              <InfoItem label="Loading" value={selectedFleet.loadingLocation} />
              <InfoItem label="Dumping" value={selectedFleet.dumpingLocation} />
            </InfoCard>
          )}

          {/* Dump Truck List Card */}
          <Card className="dark:bg-gray-900 border-none">
            <CardHeader>
              <CardTitle className="text-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 dark:text-white">
                <span>{CARD_TITLES.UNITS} *</span>
                <Input
                  placeholder={SEARCH_PLACEHOLDERS.UNIT}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                  disabled={isSaving || isLoadingFilteredUnits}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.units && (
                <Alert variant="destructive" className="mb-2 dark:bg-red-900/20 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 dark:text-red-400" />
                  <AlertDescription className="dark:text-red-300">{errors.units}</AlertDescription>
                </Alert>
              )}

              {selectedFleet && !isLoadingFilteredUnits && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Checkbox
                    checked={showAllUnits}
                    onCheckedChange={(checked) => {
                      setShowAllUnits(checked);
                      setSelectedUnits([]);
                      setUnitOperators({});
                    }}
                    disabled={isSaving || isLoadingAllUnits}
                    className="dark:text-gray-200"
                  />
                  <Label className="text-sm font-medium cursor-pointer dark:text-gray-300">
                    Tampilkan semua DT
                    {isLoadingAllUnits && (
                      <Loader2 className="inline-block w-4 h-4 ml-2 animate-spin" />
                    )}
                  </Label>
                </div>
              )}

              {selectedFleet &&
                !isLoadingFilteredUnits &&
                !isLoadingAllUnits &&
                filteredUnits.length > 0 && (
                  <div className="rounded-lg max-h-100 overflow-y-auto">
                    {Object.values(UNIT_STATUS).map((status) =>
                      (groupedUnits[status] || []).length > 0 ? (
                        <div key={status}>
                          <div
                            className={`px-3 py-2 flex items-center justify-between sticky top-0 z-10 ${UNIT_STATUS_COLORS[status].bg}`}
                          >
                            <Badge className={`${UNIT_STATUS_COLORS[status].bg} ${UNIT_STATUS_COLORS[status].text}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}{" "}
                              ({(groupedUnits[status] || []).length})
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs cursor-pointer disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-700"
                              onClick={() => handleSelectAll(status)}
                              disabled={isSaving}
                            >
                              {(groupedUnits[status] || []).every((u) =>
                                selectedUnits.some((s) => s.id === u.id)
                              )
                                ? BUTTON_LABELS.DESELECT_ALL
                                : BUTTON_LABELS.SELECT_ALL}
                            </Button>
                          </div>

                          <div>
                            {(groupedUnits[status] || []).map((unit) => {
                              const isSelected = selectedUnits.some(
                                (u) => u.id === unit.id
                              );
                              const hasOperatorError = errors[`operator_${unit.id}`];

                              return (
                                <div
                                  key={unit.id}
                                  className={`p-3 transition-colors ${
                                    isSelected
                                      ? "bg-blue-50 dark:bg-blue-900/20"
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
                                    <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-1" />
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div
                                          className="cursor-pointer"
                                          onClick={() => {
                                            if (!isSaving) {
                                              handleUnitToggle(unit);
                                            }
                                          }}
                                        >
                                          <p className="font-medium text-sm dark:text-gray-200">
                                            {unit.hull_no}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {unit.company} • {unit.workUnit}
                                          </p>
                                        </div>
                                        <Badge className={`${UNIT_STATUS_COLORS[status].bg} ${UNIT_STATUS_COLORS[status].text}`}>
                                          {status}
                                        </Badge>
                                      </div>

                                      {isSelected && (
                                        <div className="space-y-1">
                                          <Label className="text-xs flex items-center gap-1 dark:text-gray-300">
                                            <User className="w-3 h-3" />
                                            Operator *
                                          </Label>
                                          <SearchableSelect
                                            items={operatorOptions}
                                            value={unitOperators[unit.id] || ""}
                                            onChange={(operatorId) =>
                                              handleOperatorChange(unit.id, operatorId)
                                            }
                                            placeholder="Pilih operator"
                                            emptyText="Tidak ada operator"
                                            disabled={isSaving || operatorsLoading}
                                            error={!!hasOperatorError}
                                          />
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
                        </div>
                      ) : null
                    )}
                  </div>
                )}
            </CardContent>
          </Card>

          {errors.submit && (
            <Alert variant="destructive" className="dark:bg-red-900/20 dark:border-red-800">
              <AlertCircle className="h-4 w-4 dark:text-red-400" />
              <AlertDescription className="dark:text-red-300">{errors.submit}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {BUTTON_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !allUnitsHaveOperators || selectedUnits.length === 0}
              className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:text-gray-200 dark:hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {LOADING_MESSAGES.SAVING}
                </>
              ) : isEditMode ? (
                BUTTON_LABELS.UPDATE
              ) : (
                BUTTON_LABELS.SAVE
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DumptruckModal;