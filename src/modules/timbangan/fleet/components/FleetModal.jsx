import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Settings,
  Truck,
  User,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { showToast } from "@/shared/utils/toast";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import ModalHeader from "@/shared/components/ModalHeader";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import {
  createUsedDumptrucksMap,
  filterAvailableDumptrucks,
  checkDumptruckUsage,
  validateBulkFleetDumpTrucks,
} from "@/modules/timbangan/fleet/utils/FleetDumptruckHelper";
import ConfirmationDialog from "@/modules/timbangan/fleet/components/ConfirmationDialog";
import { useFleetSplit } from "@/modules/timbangan/fleet/hooks/useFleetSplit";
import { useFleetWithTransfer } from "@/modules/timbangan/fleet/hooks/useFleetWithTransfer";
import FleetWorkUnitMeasurementSection from "@/modules/timbangan/fleet/components/FleetWorkUnitMeasurementSection";
import FleetExcavatorLocationSection from "@/modules/timbangan/fleet/components/FleetExcavatorLocationSection";
import FleetCoalDistanceSection from "@/modules/timbangan/fleet/components/FleetCoalDistanceSection";
import FleetInspectorCheckerSection from "@/modules/timbangan/fleet/components/FleetInspectorCheckerSection";
import FleetUnitSelectionSection from "@/modules/timbangan/fleet/components/FleetUnitSelectionSection";
import FleetSplitSettingsSection from "@/modules/timbangan/fleet/components/FleetSplitSettingsSection";

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
  availableDumptruckSettings = [],
  masters,
  mastersLoading,
}) => {
  const { user } = useAuthStore();

  const isEditingMergedGroup = Array.isArray(editingConfig);
  const fleetsToEdit = useMemo(() => {
    return isEditingMergedGroup
      ? editingConfig
      : editingConfig
        ? [editingConfig]
        : [];
  }, [isEditingMergedGroup, editingConfig]);
  const isEdit = fleetsToEdit.length > 0;


  const {
    isSplitMode,
    setIsSplitMode,
    fleetsUniverse,
    addFleetToUniverse,
    updateFleetInUniverse,
    removeFleetFromUniverse,
    setActiveUniverseFleet,
    activeFleetId,
    getFleetNumber,
    resetSplitMode,
    validateSplitConfiguration,
    prepareBulkPayload,
  } = useFleetSplit();

  const { handleSaveFleet } = useFleetWithTransfer(
    user,
    onSave,
  );

  const [fleetData, setFleetData] = useState({
    excavator: "",
    loadingLocation: "",
    dumpingLocation: "",
    coalType: "",
    distance: 0,
    workUnit: "",
    measurementType: "Timbangan",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [distanceText, setDistanceText] = useState("");
  const [inspectorIds, setInspectorIds] = useState([]);
  const [checkerIds, setCheckerIds] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [unitOperators, setUnitOperators] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [fleetFilteredUnits, setFleetFilteredUnits] = useState([]);
  const [isLoadingFilteredUnits, setIsLoadingFilteredUnits] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    unit: null,
    fromFleetInfo: null,
    fromFleetId: null,
    pendingAction: null,
  });
  const [pendingTransfers, setPendingTransfers] = useState([]);

  const usedDumptrucksMap = useMemo(() => {
    return createUsedDumptrucksMap(availableDumptruckSettings);
  }, [availableDumptruckSettings]);

  const handleInspectorChange = useCallback(
    (newInspectorIds) => {
      setInspectorIds(newInspectorIds);
    },
    [isSplitMode],
  );

  const handleCheckerChange = useCallback(
    (newCheckerId) => {
      const updated = newCheckerId ? [newCheckerId] : [];
      setCheckerIds(updated);
    },
    [isSplitMode],
  );

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
  // ✅ FIXED: Filter units by excavator helper
  const filterUnitsByExcavator = useCallback(
    async (excavatorId) => {
      try {
        const excavator = masters?.excavators?.find(
          (e) => String(e.id) === String(excavatorId),
        );

        if (!excavator || !excavator.companyId) {
          return [];
        }

        const filtered = masters?.dumpTruck?.filter(
          (unit) =>
            String(unit.companyId) === String(excavator.companyId),
        );

        return filtered;
      } catch (error) {
        console.error("Failed to filter units:", error);
        return [];
      }
    },
    [masters],
  );

  // ✅ FIXED: Populate form data when editing (IMPROVED VERSION)
  useEffect(() => {
    if (isEdit && fleetsToEdit.length > 0 && isOpen && masters) {
      const config = fleetsToEdit[0]; // Use first fleet for primary data

      // Populate main fleet data
      setFleetData({
        excavator: config.excavatorId || "",
        loadingLocation: config.loadingLocationId || "",
        dumpingLocation: config.dumpingLocationId || "",
        coalType: config.coalTypeId || "",
        distance: config.distance || 0,
        workUnit: config.workUnitId || "",
        measurementType: config.measurementType || "Timbangan",
        weightBridge: config.weightBridgeId || "",
      });

      setDistanceText(config.distance?.toString() || "0");

      // Populate inspectors and checkers
      setInspectorIds(config.inspectorIds || []);
      setCheckerIds(config.checkerIds || []);

      // ✅ FIX MASALAH 1: Populate fleetFilteredUnits saat edit
      // Ini akan memastikan dumptruck muncul di list
      if (config.excavatorId) {
        filterUnitsByExcavator(config.excavatorId).then((filtered) => {
          setFleetFilteredUnits(filtered);
        });
      }

      // ✅ SPLIT MODE: Detect and activate if isSplit is true
      if (config.isSplit && fleetsToEdit.length > 1) {
        // ✅ CRITICAL: Reset split mode first to clear any existing universe fleets
        // This prevents duplicate fleets when useEffect runs multiple times
        resetSplitMode();

        // Now activate split mode
        setIsSplitMode(true);

        // ✅ FIX MASALAH 2: Populate each fleet in the split
        fleetsToEdit.forEach((fleet, index) => {
          if (index === 0) {
            // First fleet is primary, populate units
            if (fleet.units && fleet.units.length > 0) {
              const units = fleet.units.map((unit) => ({
                id: unit.dumpTruckId || unit.id,
                hull_no: unit.hull_no,
                companyId: unit.companyId,
                type: unit.type || "DUMP_TRUCK",
                workUnit: unit.workUnit || fleet.workUnit || "-",
                company: unit.company,
              }));

              const operators = {};
              fleet.units.forEach((unit) => {
                const unitId = unit.dumpTruckId || unit.id;
                if (unit.operatorId) {
                  operators[unitId] = unit.operatorId;
                }
              });

              setSelectedUnits(units);
              setUnitOperators(operators);
            }
          } else {
            const units =
              fleet.units?.map((unit) => ({
                id: String(unit.id || unit.dumpTruckId), // ← Pattern dari fleet2Data
                hull_no: unit.hull_no || "-",
                company: unit.company || "-",
                workUnit: unit.workUnit || fleet.workUnit || "-", // ✅ Fallback ke fleet level
                type: "DUMP_TRUCK",
                companyId: unit.companyId,
                workUnitId: unit.workUnitId || fleet.workUnitId, // ✅ Fallback ke fleet level
              })) || [];

            const operators = {};
            fleet.units?.forEach((unit) => {
              const unitId = String(unit.id || unit.dumpTruckId); // ← Pattern dari fleet2Data
              if (unit.operatorId) {
                operators[unitId] = String(unit.operatorId);
              }
            });

            // Add fleet to universe with its data
            const newFleetId = addFleetToUniverse();

            // Update the newly created fleet with actual data
            updateFleetInUniverse(newFleetId, {
              // ✅ Data fields (matching fleet2Data pattern)
              dumpingLocation: fleet.dumpingLocationId || "",
              measurementType: fleet.measurementType || "Timbangan",
              distance: fleet.distance ?? 0,
              workUnit: fleet.workUnitId || "",
              coalType: fleet.coalTypeId || "",
              weightBridge: fleet.weightBridgeId || "",
              inspectorIds: fleet.inspectorIds || [],
              checkerIds: fleet.checkerIds || [],
              selectedUnits: units,
              unitOperators: operators,
            });
          }
        });
      } else {
        // ✅ SINGLE MODE: Populate selected units and operators
        if (config.units && config.units.length > 0) {
          const units = config.units.map((unit) => {
            const mappedUnit = {
              id: unit.dumpTruckId || unit.id,
              hull_no: unit.hull_no,
              companyId: unit.companyId,
              type: unit.type || "DUMP_TRUCK",
              workUnit: unit.workUnit || "-",
              company: unit.company,
            };
            return mappedUnit;
          });

          const operators = {};
          config.units.forEach((unit) => {
            const unitId = unit.dumpTruckId || unit.id;
            if (unit.operatorId) {
              operators[unitId] = unit.operatorId;
            }
          });

          setSelectedUnits(units);
          setUnitOperators(operators);
        } else {
          console.warn("⚠️ No units found in config");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, fleetsToEdit, isOpen, masters]);

  const handleExcavatorChange = useCallback(
    async (excavatorId) => {
      setIsLoadingFilteredUnits(true);
      setFleetData((prev) => ({ ...prev, excavator: excavatorId }));

      const filtered = await filterUnitsByExcavator(excavatorId);
      setFleetFilteredUnits(filtered);
      setIsLoadingFilteredUnits(false);

      // ✅ FIX: Only reset units if NOT editing
      // Saat edit, units sudah di-populate dari useEffect
      if (!isEdit) {
        setSelectedUnits([]);
        setUnitOperators({});
      }
    },
    [filterUnitsByExcavator, isEdit],
  );

  // Rest of the code remains the same...
  // (I'm truncating here to keep response length reasonable, but all other code stays identical)

  const filteredUnits = useMemo(() => {
    if (!fleetData.excavator) return [];

    let units = [];

    if (showAllUnits) {
      units = masters?.dumpTruck;
    } else {
      units = fleetFilteredUnits;
    }

    // ✅ Hanya filter available units jika showAllUnits = false
    // (Jika show all, biarkan user melihat semua, termasuk yang sudah terpakai - status akan ditangani oleh UI)
    if (!showAllUnits) {
      const currentFleetIds = isEdit ? fleetsToEdit.map((f) => f.id) : null;

      units = filterAvailableDumptrucks(
        units,
        usedDumptrucksMap,
        currentFleetIds,
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      units = units.filter((unit) =>
        unit.hull_no?.toLowerCase().includes(query),
      );
    }

    return units;
  }, [
    fleetData.excavator,
    fleetFilteredUnits,
    showAllUnits,
    searchQuery,
    usedDumptrucksMap,
    isEdit,
    fleetsToEdit,
  ]);

  const filteredUnitsForActiveFleet = useMemo(() => {
    if (!isSplitMode || !activeFleetId) return [];

    let units = [];

    if (showAllUnits) {
      units = masters?.dumpTruck;
    } else {
      units = fleetFilteredUnits;
    }

    // ✅ Hanya filter available units jika showAllUnits = false
    if (!showAllUnits) {
      const currentFleetIds = isEdit ? fleetsToEdit.map((f) => f.id) : null;

      units = filterAvailableDumptrucks(
        units,
        usedDumptrucksMap,
        currentFleetIds,
      );
    }

    return units;
  }, [
    isSplitMode,
    activeFleetId,
    fleetFilteredUnits,
    showAllUnits,
    usedDumptrucksMap,
    isEdit,
    fleetsToEdit,
  ]);

  const selectedUnitsList = useMemo(() => {
    return selectedUnits.map((unit) => ({
      ...unit,
      workUnit: unit.workUnit,
      company: unit.company,
      operatorId: unitOperators[unit.id] || null,
      operatorName:
        masters?.operators?.find(
          (op) => String(op.id) === String(unitOperators[unit.id]),
        )?.name || null,
    }));
  }, [selectedUnits, unitOperators, masters?.operators]);

  const unselectedUnitsList = useMemo(() => {
    return filteredUnits.filter(
      (unit) =>
        !selectedUnits.some(
          (selected) => String(selected.id) === String(unit.id),
        ),
    );
  }, [filteredUnits, selectedUnits]);

  const allUnitsHaveOperators = useMemo(() => {
    return selectedUnits.every((unit) => unitOperators[unit.id]);
  }, [selectedUnits, unitOperators]);

  const getOperatorOptionsForUnit = useCallback(
    (unitId) => {
      const unit = masters?.dumpTruck.find((u) => String(u.id) === String(unitId));

      if (!unit || !unit.companyId) {
        return [];
      }

      // Step 1: Filter operators by company
      const allOperators = masters?.operators || [];
      const operatorsByCompany = allOperators.filter(
        (op) => String(op.companyId) === String(unit.companyId),
      );

      const availableOps = operatorsByCompany.filter((op) => {
        const opId = String(op.id);

        for (const [dtId, assignedOpId] of Object.entries(unitOperators)) {
          if (String(dtId) === String(unitId)) continue;

          if (String(assignedOpId) === opId) {
            return false;
          }
        }

        return true;
      });

      return availableOps.map((op) => ({
        value: String(op.id),
        label: op.name,
      }));
    },
    [ masters?.operators, unitOperators],
  );

  const getAvailableOperatorCount = useCallback(
    (unitId) => {
      return getOperatorOptionsForUnit(unitId).length;
    },
    [getOperatorOptionsForUnit],
  );

  // ✅ NEW: Wrapper for split mode that also considers universe fleet operators
  const getOperatorOptionsForUnitInUniverse = useCallback(
    (unitIdOrObject) => {
      // ✅ Handle both unitId (string) and unit (object)
      let unitId, unit;

      if (typeof unitIdOrObject === "object" && unitIdOrObject !== null) {
        // Called with unit object (from FleetSplitSettingsSection)
        unit = unitIdOrObject;
        unitId = unit.id;
      } else {
        // Called with unitId (from other places)
        unitId = unitIdOrObject;
        unit = masters?.dumpTruck.find((u) => String(u.id) === String(unitId));
      }

      if (!unit || !unit.companyId) return [];
      // Step 1: Filter operators by company
      const operatorsByCompany =
        masters?.operators?.filter(
          (op) => String(op.companyId) === String(unit.companyId),
        ) || [];
      const allAssignedOperators = new Set();

      // Add from primary fleet
      Object.entries(unitOperators).forEach(([dtId, opId]) => {
        if (String(dtId) !== String(unitId)) {
          allAssignedOperators.add(String(opId));
        }
      });

      // Add from all universe fleets
      fleetsUniverse.forEach((fleet) => {
        if (fleet.unitOperators) {
          Object.entries(fleet.unitOperators).forEach(([dtId, opId]) => {
            if (String(dtId) !== String(unitId)) {
              allAssignedOperators.add(String(opId));
            }
          });
        }
      });

      // Step 3: Filter out assigned operators
      const availableOps = operatorsByCompany.filter((op) => {
        return !allAssignedOperators.has(String(op.id));
      });

      return availableOps.map((op) => ({
        value: String(op.id),
        label: op.name,
      }));
    }, [ masters?.operators, unitOperators, fleetsUniverse]);

  const handleOperatorChange = useCallback((unitId, operatorId) => {
    setUnitOperators((prev) => ({
      ...prev,
      [unitId]: operatorId,
    }));
  }, []);

  const handleUnitToggle = useCallback(
    (unit) => {
      const isSelected = selectedUnits.some(
        (u) => String(u.id) === String(unit.id),
      );

      if (isSelected) {
        setSelectedUnits((prev) =>
          prev.filter((u) => String(u.id) !== String(unit.id)),
        );
        setUnitOperators((prev) => {
          const newOps = { ...prev };
          delete newOps[unit.id];
          return newOps;
        });
      } else {
        const usage = checkDumptruckUsage(
          unit.id,
          usedDumptrucksMap,
          isEdit ? fleetsToEdit.map((f) => f.id) : null,
        );

        if (usage.isUsed) {
          setConfirmationDialog({
            isOpen: true,
            unit,
            fromFleetInfo: usage.fleetInfo,
            fromFleetId: usage.fleetId,
            pendingAction: "add",
          });
        } else {
          setSelectedUnits((prev) => [...prev, unit]);
        }
      }
    },
    [selectedUnits, usedDumptrucksMap, isEdit, fleetsToEdit],
  );

  const handleConfirmTransfer = useCallback(() => {
    if (!confirmationDialog.unit) return;

    const unit = confirmationDialog.unit;

    setSelectedUnits((prev) => [...prev, unit]);

    setPendingTransfers((prev) => [
      ...prev,
      {
        dumpTruckId: String(unit.id),
        fromFleetId: confirmationDialog.fromFleetId,
      },
    ]);

    setConfirmationDialog({
      isOpen: false,
      unit: null,
      fromFleetInfo: null,
      fromFleetId: null,
      pendingAction: null,
    });
  }, [confirmationDialog]);

  const handleCancelTransfer = useCallback(() => {
    setConfirmationDialog({
      isOpen: false,
      unit: null,
      fromFleetInfo: null,
      fromFleetId: null,
      pendingAction: null,
    });
  }, []);

  const resetForm = useCallback(() => {
    setFleetData({
      excavator: "",
      loadingLocation: "",
      dumpingLocation: "",
      coalType: "",
      distance: 0,
      workUnit: "",
      measurementType: "Timbangan",
    });
    setDistanceText("");
    setInspectorIds([]);
    setCheckerIds([]);
    setSelectedUnits([]);
    setUnitOperators({});
    setSearchQuery("");
    setShowAllUnits(false);
    setErrors({});
    setPendingTransfers([]);
  }, []);

  const handleSave = useCallback(
    async (e) => {
      e?.preventDefault();
      setIsSaving(true);
      setErrors({});

      try {
        // ===== VALIDATION =====
        const validationErrors = {};

        // Basic required fields
        if (!fleetData.excavator) {
          validationErrors.excavator = "Excavator wajib diisi";
        }
        if (!fleetData.loadingLocation) {
          validationErrors.loadingLocation = "Loading Point wajib diisi";
        }
        if (!fleetData.dumpingLocation) {
          validationErrors.dumpingLocation = "Dumping Point wajib diisi";
        }
        if (!fleetData.measurementType) {
          validationErrors.measurementType = "Measurement Type wajib diisi";
        }

        // Units & operators validation
        if (selectedUnits.length === 0) {
          validationErrors.units = "Minimal 1 dump truck harus dipilih";
        }

        const allUnitsHaveOperators = selectedUnits.every(
          (unit) => unitOperators[unit.id],
        );
        if (!allUnitsHaveOperators) {
          validationErrors.operators =
            "Semua dump truck harus memiliki operator";
        }

        // Inspector validation
        if (!inspectorIds || inspectorIds.length === 0) {
          validationErrors.inspectors = "Minimal 1 inspector wajib dipilih";
        }

        // ✅ Split mode validation
        if (isSplitMode && fleetsUniverse.length > 0) {
          const splitValidation = validateSplitConfiguration(selectedUnits);
          if (!splitValidation.valid) {
            validationErrors.split = splitValidation.error;
            showToast.error(splitValidation.error);
          }

          // Validate each fleet in universe
          fleetsUniverse.forEach((fleet, index) => {
            const fleetNum = index + 2;

            if (!fleet.dumpingLocation) {
              validationErrors[`fleet${fleetNum}_dumping`] =
                `Fleet ${fleetNum} harus memiliki dumping location`;
            }

            if (!fleet.measurementType) {
              validationErrors[`fleet${fleetNum}_measurement`] =
                `Fleet ${fleetNum} harus memiliki measurement type`;
            }

            if (!fleet.selectedUnits || fleet.selectedUnits.length === 0) {
              validationErrors[`fleet${fleetNum}_units`] =
                `Fleet ${fleetNum} harus memiliki minimal 1 dump truck`;
            }

            if (!fleet.inspectorIds || fleet.inspectorIds.length === 0) {
              validationErrors[`fleet${fleetNum}_inspectors`] =
                `Fleet ${fleetNum} harus memiliki minimal 1 inspector`;
            }

            // ✅ Check all units have operators - WITH SAFETY
            if (fleet.selectedUnits && fleet.selectedUnits.length > 0) {
              const validUnits = fleet.selectedUnits.filter((unit) => {
                if (!unit || !unit.id) {
                  console.warn(`⚠️ Invalid unit in Fleet ${fleetNum}:`, unit);
                  return false;
                }
                return true;
              });

              if (validUnits.length < fleet.selectedUnits.length) {
                const invalidCount =
                  fleet.selectedUnits.length - validUnits.length;
                console.error(
                  `❌ Fleet ${fleetNum} has ${invalidCount} invalid units`,
                );
                validationErrors[`fleet${fleetNum}_units`] =
                  `Fleet ${fleetNum}: ${invalidCount} dump truck tidak valid`;
              }

              const allHaveOps = validUnits.every(
                (unit) => fleet.unitOperators && fleet.unitOperators[unit.id],
              );

              if (!allHaveOps) {
                const missingOps = validUnits.filter(
                  (unit) =>
                    !fleet.unitOperators || !fleet.unitOperators[unit.id],
                );
                console.warn(
                  `⚠️ Fleet ${fleetNum} units missing operators:`,
                  missingOps,
                );
                validationErrors[`fleet${fleetNum}_operators`] =
                  `Fleet ${fleetNum}: Semua dump truck harus memiliki operator`;
              }
            }
          });
        }

        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          setIsSaving(false);
          return;
        }

        let payload;
        let saveMode;

        if (isSplitMode && fleetsUniverse.length > 0) {
          // ✅ BULK MODE
          saveMode = "bulk";

          const unitsWithoutOperators = selectedUnits.filter(
            (unit) => !unitOperators[unit.id],
          );

          if (unitsWithoutOperators.length > 0) {
            const unitNames = unitsWithoutOperators
              .map((u) => u.hull_no || u.id)
              .join(", ");
            throw new Error(
              `Dump truck berikut belum memiliki operator: ${unitNames}`,
            );
          }

          const primaryFleetData = {
            id: fleetsToEdit[0]?.id, // ✅ ADD THIS LINE
            excavatorId: fleetData.excavator,
            loadingLocationId: fleetData.loadingLocation,
            dumpingLocationId: fleetData.dumpingLocation,
            coalTypeId: fleetData.coalType || null,
            workUnitId: fleetData.workUnit || null,
            distance: parseFloat(distanceText) || 0,
            measurementType: fleetData.measurementType,
            checkerIds: checkerIds,
            inspectorIds: inspectorIds,
            weightBridgeId: fleetData.weightBridge || null,
            createdByUserId: user?.id,
            pairDtOp: selectedUnits.map((unit) => ({
              truckId: String(unit.id),
              operatorId: String(unitOperators[unit.id]),
            })),
            selectedUnits: selectedUnits,
          };

          // ✅ FIX: Pass fleetsToEdit for edit mode to include IDs
          // ✅ NEW: Pass availableDumptruckSettings for cross-fleet transfer detection
          payload = prepareBulkPayload(
            primaryFleetData,
            isEdit ? fleetsToEdit : null,
            availableDumptruckSettings || [], // ✅ NEW: For cross-fleet transfer detection
          );

          // ✅ Validate bulk fleets
          const bulkValidation = validateBulkFleetDumpTrucks(payload);
          if (!bulkValidation.valid) {
            setErrors({ submit: bulkValidation.error });
            showToast.error(bulkValidation.error);
            setIsSaving(false);
            return;
          }
        } else {
          // ✅ SINGLE FLEET MODE
          saveMode = "single";

          const unitsWithoutOperators = selectedUnits.filter(
            (unit) => !unitOperators[unit.id],
          );

          if (unitsWithoutOperators.length > 0) {
            const unitNames = unitsWithoutOperators
              .map((u) => u.hull_no || u.id)
              .join(", ");
            throw new Error(
              `Dump truck berikut belum memiliki operator: ${unitNames}`,
            );
          }

          // ✅ NEW: Detect cross-fleet transfers for single fleet - NOW SUPPORTS EDIT MODE
          const detectSingleFleetTransfers = () => {
            if (
              !availableDumptruckSettings ||
              availableDumptruckSettings.length === 0
            ) {
              return [];
            }

            const transferMap = new Map(); // fleetId -> [truckIds]

            if (!selectedUnits || selectedUnits.length === 0) {
              return [];
            }

            selectedUnits.forEach((unit) => {
              const truckId = String(unit.id);

              // Check if this truck exists in any existing fleet
              availableDumptruckSettings.forEach((existingFleet, fleetIdx) => {
                // ✅ Skip if this is the fleet being edited (self-transfer)
                if (
                  isEdit &&
                  fleetsToEdit?.some(
                    (f) => String(f.id) === String(existingFleet.id),
                  )
                ) {
                  return;
                }

                const isInExistingFleet = (existingFleet.units || []).some(
                  (u) => String(u.dumpTruckId) === truckId,
                );

                if (isInExistingFleet) {
                  // If it's in another fleet, add to transfer map
                  const fleetId = existingFleet.id;
                  if (!transferMap.has(fleetId)) {
                    transferMap.set(fleetId, []);
                  }
                  transferMap.get(fleetId).push(parseInt(truckId));
                }
              });
            });

            // Convert map to array format { fleetId, truckIds: [] }
            const transfers = [];
            transferMap.forEach((truckIds, fleetId) => {
              transfers.push({
                fleetId,
                truckIds,
              });
            });

            return transfers;
          };

          const crossFleetTransfers = detectSingleFleetTransfers();

          payload = {
            excavatorId: fleetData.excavator,
            loadingLocationId: fleetData.loadingLocation,
            dumpingLocationId: fleetData.dumpingLocation,
            coalTypeId: fleetData.coalType || null,
            workUnitId: fleetData.workUnit || null,
            distance: parseFloat(distanceText) || 0,
            measurementType: fleetData.measurementType,
            checkerIds: checkerIds,
            inspectorIds: inspectorIds,
            weightBridgeId: fleetData.weightBridge || null,
            createdByUserId: user?.id,
            isSplit: false,
            pairDtOp: selectedUnits.map((unit) => ({
              truckId: String(unit.id),
              operatorId: String(unitOperators[unit.id]),
            })),
          };

          // ✅ Add transfer metadata if detected
          if (crossFleetTransfers.length > 0) {
            payload.isTransfer = true;
            payload.moveFromFleets = crossFleetTransfers;
          }
        }

        // ===== SAVE =====
        let result;

        // ✅ FIX: Improved edit/create detection
        if (isEdit) {
          // ✅ EDIT MODE (single or bulk)
          if (!fleetsToEdit || fleetsToEdit.length === 0) {
            throw new Error("Cannot edit: No fleet configuration found");
          }

          if (isSplitMode && fleetsUniverse.length > 0) {
            // Bulk edit - payload is array with IDs already
            result = await handleSaveFleet(payload, null);
          } else {
            // Single edit - pass editConfig
            const editConfig = isEditingMergedGroup
              ? { ids: fleetsToEdit.map((f) => f.id) }
              : { id: fleetsToEdit[0].id };

            result = await handleSaveFleet(payload, editConfig);
          }
        } else {
          result = await handleSaveFleet(payload, null);
        }

        if (result && result.success) {
          showToast.success(
            saveMode === "bulk"
              ? `Berhasil menyimpan ${payload.length} fleet`
              : "Fleet berhasil disimpan",
          );

          resetForm();
          resetSplitMode();

          if (onSave) {
            try {
              await onSave();
            } catch (onSaveError) {
              console.error("❌ Error in onSave callback:", onSaveError);
              throw onSaveError;
            }
          }

          onClose();
        } else {
          throw new Error(result?.error || "Gagal menyimpan fleet");
        }
      } catch (error) {
        console.error("❌ Save error:", error);
        setErrors({ submit: error.message });
        showToast.error(error.message || "Gagal menyimpan fleet");
      } finally {
        setIsSaving(false);
      }
    },
    [
      fleetData,
      selectedUnits,
      unitOperators,
      distanceText,
      checkerIds,
      inspectorIds,
      isSplitMode,
      fleetsUniverse,
      validateSplitConfiguration,
      prepareBulkPayload,
      isEdit,
      isEditingMergedGroup,
      fleetsToEdit,
      handleSaveFleet,
      user,
      allUnitsHaveOperators,
      pendingTransfers,
      resetSplitMode,
      onSave,
      onClose,
      resetForm,
    ],
  );

  // ✅ Can save validation
  const canSave = useMemo(() => {
    if (
      !fleetData.excavator ||
      !fleetData.loadingLocation ||
      !fleetData.dumpingLocation ||
      !fleetData.measurementType
    ) {
      return false;
    }

    if (selectedUnits.length === 0 || !allUnitsHaveOperators) {
      return false;
    }

    if (!inspectorIds || inspectorIds.length === 0) {
      return false;
    }

    if (isSplitMode && fleetsUniverse.length > 0) {
      const allValid = fleetsUniverse.every((fleet) => {
        const hasUnits = fleet.selectedUnits && fleet.selectedUnits.length > 0;
        const hasOperators = fleet.selectedUnits?.every((unit) => {
          if (!unit || !unit.id) return false;
          return fleet.unitOperators && fleet.unitOperators[unit.id];
        });
        const hasInspectors =
          fleet.inspectorIds && fleet.inspectorIds.length > 0;
        const hasDumping = !!fleet.dumpingLocation;
        const hasMeasurement = !!fleet.measurementType;

        return (
          hasUnits &&
          hasOperators &&
          hasInspectors &&
          hasDumping &&
          hasMeasurement
        );
      });

      if (!allValid) {
        return false;
      }
    }

    return true;
  }, [
    fleetData,
    selectedUnits,
    allUnitsHaveOperators,
    inspectorIds,
    isSplitMode,
    fleetsUniverse,
  ]);

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

  const excavatorItems = useMemo(
    () =>
      masters?.excavators?.map((e) => ({
        value: String(e.id),
        label: e.hull_no || e.name || `Excavator #${e.id}`,
        hint: [e.company, e.workUnit].filter(Boolean).join(" • "),
      })) || [],
    [masters?.excavators],
  );

  const loadLocItems = useMemo(
    () =>
      masters?.loadingLocations?.map((l) => ({
        value: String(l.id),
        label: l.name,
      })) || [],
    [masters?.loadingLocations],
  );

  const dumpLocItems = useMemo(
    () =>
      masters?.dumpingLocations?.map((l) => ({
        value: String(l.id),
        label: l.name,
      })) || [],
    [masters?.dumpingLocations],
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

  const coalTypeItems = useMemo(
    () =>
      masters?.coalTypes?.map((c) => ({
        value: String(c.id),
        label: c.name,
      })) || [],
    [masters?.coalTypes],
  );

  const checkerItems = useMemo(() => {
    const measurementType = fleetData.measurementType || fleetType;
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
  }, [userItems, fleetData.measurementType, fleetType]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <ModalHeader
          title={
            isEdit
              ? isEditingMergedGroup
                ? `Edit ${fleetsToEdit.length} Fleet (Merged)`
                : "Edit Fleet"
              : "Tambah Fleet Baru"
          }
          onClose={onClose}
          disabled={isSaving}
        />

        {mastersLoading  ? (
          <LoadingOverlay isVisible={true} message="Memuat data master..." />
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <FleetWorkUnitMeasurementSection
              workUnitItems={workUnitItems}
              fleetData={fleetData}
              setFleetData={setFleetData}
              errors={errors}
              isSaving={isSaving}
              measurementTypeOptions={MEASUREMENT_TYPE_OPTIONS}
            />

            <FleetExcavatorLocationSection
              excaItems={excavatorItems}
              loadLocItems={loadLocItems}
              dumpLocItems={dumpLocItems}
              fleetData={fleetData}
              setFleetData={setFleetData}
              errors={errors}
              isSaving={isSaving}
              handleExcavatorChange={handleExcavatorChange}
            />

            <FleetCoalDistanceSection
              coalTypeItems={coalTypeItems}
              fleetData={fleetData}
              setFleetData={setFleetData}
              distanceText={distanceText}
              setDistanceText={setDistanceText}
              errors={errors}
              isSaving={isSaving}
            />

            <FleetInspectorCheckerSection
              inspectorItems={inspectorItems}
              checkerItems={checkerItems}
              inspectorIds={inspectorIds}
              checkerIds={checkerIds}
              handleInspectorChange={handleInspectorChange}
              handleCheckerChange={handleCheckerChange}
              errors={errors}
              isSaving={isSaving}
            />

            <FleetUnitSelectionSection
              fleetData={fleetData}
              errors={errors}
              isSaving={isSaving}
              isLoadingFilteredUnits={isLoadingFilteredUnits}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showAllUnits={showAllUnits}
              setShowAllUnits={setShowAllUnits}
              filteredUnits={filteredUnits}
              selectedUnits={selectedUnits}
              selectedUnitsList={selectedUnitsList}
              unselectedUnitsList={unselectedUnitsList}
              pendingTransfers={pendingTransfers}
              isEdit={isEdit}
              editingConfig={editingConfig}
              usedDumptrucksMap={usedDumptrucksMap}
              unitOperators={unitOperators}
              masters={masters}
              getOperatorOptionsForUnit={getOperatorOptionsForUnit}
              getAvailableOperatorCount={getAvailableOperatorCount}
              handleOperatorChange={handleOperatorChange}
              handleUnitToggle={handleUnitToggle}
              isSplitMode={isSplitMode}
              setSelectedUnits={setSelectedUnits}
              setUnitOperators={setUnitOperators}
            />

            {errors?.submit && (
              <Alert
                variant="destructive"
                className="dark:bg-red-900/20 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4 dark:text-red-400" />
                <AlertDescription className="dark:text-red-300">
                  {errors?.submit}
                </AlertDescription>
              </Alert>
            )}

            {/* ✅ Split Fleet Controls - Simplified for Mining Operations */}
            <div className="space-y-4 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              {/* Header with Add Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      Mode Split Fleet
                    </h3>
                    {fleetsUniverse.length > 0 && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Total: {fleetsUniverse.length + 1} fleet aktif
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    const newFleetId = addFleetToUniverse();
                    updateFleetInUniverse(newFleetId, {
                      inspectorIds: inspectorIds || [],
                      measurementType: "Timbangan",
                    });
                  }}
                  disabled={isSaving || fleetsUniverse.length >= 3}
                  className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Fleet
                </Button>
              </div>

              {/* Fleet Tabs - Larger Click Areas */}
              {fleetsUniverse.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Fleet:
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {fleetsUniverse.map((fleet) => {
                      const fleetNum = getFleetNumber(fleet.id);
                      const isActive = fleet.id === activeFleetId;

                      return (
                        <div
                          key={fleet.id}
                          className={`inline-flex items-stretch rounded-lg border-2 overflow-hidden border-none gap-2 transition-all ${
                            isActive
                              ? "border-blue-500 dark:border-blue-400 shadow-md"
                              : "border-gray-300 dark:border-gray-600 shadow-sm hover:shadow"
                          }`}
                        >
                          {/* Fleet Select Button - Larger */}
                          <Button
                            type="button"
                            className={`px-6 py-3 text-base font-semibold transition-colors min-w-[120px] ${
                              isActive
                                ? "bg-blue-600 dark:bg-blue-600 text-white"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                            onClick={() => setActiveUniverseFleet(fleet.id)}
                            disabled={isSaving}
                          >
                            Fleet {fleetNum}
                          </Button>

                          {/* Delete Button - Separated */}
                          <Button
                            type="button"
                            className={`px-4 border-l transition-colors ${
                              isActive
                                ? "bg-blue-600 dark:bg-blue-600 border-blue-700 dark:border-blue-500 text-white hover:bg-red-600 dark:hover:bg-red-600"
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            } disabled:opacity-50 disabled:cursor-not-allowed border-none`}
                            onClick={() => removeFleetFromUniverse(fleet.id)}
                            disabled={isSaving}
                            title={`Hapus Fleet ${fleetNum}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* ✅ Split Fleet Settings Section */}
            {isSplitMode && activeFleetId && (
              <FleetSplitSettingsSection
                isSplitMode={isSplitMode}
                isEdit={isEdit}
                primaryFleetInspectorIds={inspectorIds}
                primaryFleetCheckerIds={checkerIds}
                dumpLocItems={dumpLocItems}
                checkerItems={checkerItems}
                inspectorItems={inspectorItems}
                masters={masters}
                fleetsUniverse={fleetsUniverse}
                activeFleetId={activeFleetId}
                updateFleetInUniverse={updateFleetInUniverse}
                setActiveUniverseFleet={setActiveUniverseFleet}
                getFleetNumber={getFleetNumber}
                filteredUnitsForUniverse={filteredUnitsForActiveFleet}
                usedDumptrucksMap={usedDumptrucksMap}
                getOperatorOptionsForUnit={getOperatorOptionsForUnitInUniverse}
                primarySelectedUnits={selectedUnits}
                primaryUnitOperators={unitOperators}
                setPrimarySelectedUnits={setSelectedUnits}
                setPrimaryUnitOperators={setUnitOperators}
                errors={errors}
                isSaving={isSaving}
                setErrors={setErrors}
                showAllUnits={showAllUnits}
                setShowAllUnits={setShowAllUnits}
              />
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700 dark:text-neutral-50">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSaving}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !canSave}
                className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : isEdit ? (
                  isEditingMergedGroup ? (
                    `Update ${fleetsToEdit.length} Fleet`
                  ) : (
                    "Update Fleet"
                  )
                ) : isSplitMode && fleetsUniverse.length > 0 ? (
                  `Simpan ${fleetsUniverse.length + 1} Fleet`
                ) : (
                  "Simpan Fleet"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={handleCancelTransfer}
        onConfirm={handleConfirmTransfer}
        unit={confirmationDialog.unit}
        fromFleetInfo={confirmationDialog.fromFleetInfo}
        isLoading={false}
      />

      <LoadingOverlay isVisible={isSaving} message="Menyimpan..." />
    </div>
  );
};

export default FleetModal;
