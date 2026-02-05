import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Settings, Truck, User, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { showToast } from "@/shared/utils/toast";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import ModalHeader from "@/shared/components/ModalHeader";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { VALIDATION_MESSAGES } from "@/modules/timbangan/fleet/constant/fleetConstants";
import {
  createUsedDumptrucksMap,
  filterAvailableDumptrucks,
  checkDumptruckUsage,
} from "@/modules/timbangan/fleet/utils/FleetDumptruckHelper";
import ConfirmationDialog from "@/modules/timbangan/fleet/components/ConfirmationDialog";
import { useFleetSplit } from "@/modules/timbangan/fleet/hooks/useFleetSplit";
import { useFleetWithTransfer } from "@/modules/timbangan/fleet/hooks/useFleetWithTransfer";
import { fleetSplitService } from "@/modules/timbangan/fleet/services/fleetSplitService";
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
const canMoveFromFleet2ToFleet1 = (fleet2SelectedUnits, unitToMove) => {
  if (fleet2SelectedUnits.length <= 1) {
    return {
      allowed: false,
      reason:
        "Fleet 2 harus memiliki minimal 1 dump truck. Gunakan tombol 'Gabungkan ke Fleet 1' jika ingin menggabungkan semua fleet.",
    };
  }
  return { allowed: true };
};
const FleetModal = ({
  isOpen,
  onClose,
  editingConfig = null,
  onSave,
  fleetType = "Timbangan",
  availableDumptruckSettings = [],
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

  const { masters, mastersLoading, deleteConfig } = useFleet(
    user ? { user } : null,
    null,
  );
  const { data: masterUnits, isLoading: masterUnitsLoading } =
    useMasterData("units");

  const {
    isSplitMode,
    setIsSplitMode,
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
    resetSplitMode,
  } = useFleetSplit();

  const { handleSaveFleet, isSaving: isSavingTransfer } =
    useFleetWithTransfer(user);

  const permissions = useFleetPermissions();

  const [fleetData, setFleetData] = useState({
    excavator: "",
    loadingLocation: "",
    dumpingLocation: "",
    coalType: "",
    distance: 0,
    workUnit: "",
    measurementType: "",
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

  const [showAllUnits2, setShowAllUnits2] = useState(false);
  const [searchQuery2, setSearchQuery2] = useState("");
  const usedDumptrucksMap = useMemo(() => {
    return createUsedDumptrucksMap(availableDumptruckSettings);
  }, [availableDumptruckSettings]);

  // Bug Fix 3: Handler untuk sync inspector/checker dari Fleet 1 ke Fleet 2
  const handleInspectorChange = useCallback(
    (newInspectorIds) => {
      setInspectorIds(newInspectorIds);
      // Jika split mode aktif, sync ke Fleet 2
      if (isSplitMode) {
        setFleet2InspectorIds(newInspectorIds);
      }
    },
    [isSplitMode, setFleet2InspectorIds],
  );

  const handleCheckerChange = useCallback(
    (newCheckerId) => {
      // SearchableSelect mengirim single value, simpan sebagai array dengan max 1 item
      // Jika value kosong/null, set array kosong
      if (!newCheckerId) {
        setCheckerIds([]);
        if (isSplitMode) {
          setFleet2CheckerIds([]);
        }
        return;
      }
      
      // Replace dengan checker yang baru dipilih (max 1 checker)
      const updated = [newCheckerId];
      setCheckerIds(updated);
      
      // Jika split mode aktif, sync ke Fleet 2
      if (isSplitMode) {
        setFleet2CheckerIds(updated);
      }
    },
    [isSplitMode, setFleet2CheckerIds],
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

  const filterUnitsByExcavator = useCallback(
    async (excavatorId) => {
      try {
        const excavator = masters?.excavators?.find(
          (e) => String(e.id) === String(excavatorId),
        );

        if (!excavator || !excavator.companyId) {
          return [];
        }

        const filtered = masterUnits.filter(
          (unit) =>
            unit.type === "DUMP_TRUCK" &&
            String(unit.companyId) === String(excavator.companyId),
        );

        return filtered;
      } catch (error) {
        console.error("Failed to filter units:", error);
        return [];
      }
    },
    [masters?.excavators, masterUnits],
  );

  useEffect(() => {
    if (!isOpen) return;

    const initializeModalData = async () => {
      if (fleetsToEdit.length > 0) {
        const firstFleet = fleetsToEdit[0];

        const initialData = {
          excavator: firstFleet.excavatorId || "",
          loadingLocation: firstFleet.loadingLocationId || "",
          dumpingLocation: firstFleet.dumpingLocationId || "",
          coalType: firstFleet.coalTypeId || "",
          distance: firstFleet.distance ?? 0,
          workUnit: firstFleet.workUnitId || "",
          measurementType: firstFleet.measurementType || fleetType,
        };

        setFleetData(initialData);
        setDistanceText(
          firstFleet.distance != null && firstFleet.distance !== ""
            ? String(firstFleet.distance)
            : "",
        );

        let inspectorIdsToSet = [];
        if (
          Array.isArray(firstFleet.inspectorIds) &&
          firstFleet.inspectorIds.length > 0
        ) {
          inspectorIdsToSet = firstFleet.inspectorIds.map(String);
        } else if (
          Array.isArray(firstFleet.inspectors) &&
          firstFleet.inspectors.length > 0
        ) {
          inspectorIdsToSet = firstFleet.inspectors
            .map((i) => String(i.id))
            .filter(Boolean);
        } else if (firstFleet.inspectorId) {
          inspectorIdsToSet = [String(firstFleet.inspectorId)];
        }
        setInspectorIds(inspectorIdsToSet);

        let checkerIdsToSet = [];
        if (
          Array.isArray(firstFleet.checkerIds) &&
          firstFleet.checkerIds.length > 0
        ) {
          checkerIdsToSet = firstFleet.checkerIds.map(String);
        } else if (
          Array.isArray(firstFleet.checkers) &&
          firstFleet.checkers.length > 0
        ) {
          checkerIdsToSet = firstFleet.checkers
            .map((c) => String(c.id))
            .filter(Boolean);
        } else if (firstFleet.checkerId) {
          checkerIdsToSet = [String(firstFleet.checkerId)];
        }
        setCheckerIds(checkerIdsToSet);

        if (firstFleet.units) {
          const existingUnits = firstFleet.units.map((unit) => ({
            id: String(unit.id || unit.dumpTruckId),
            hull_no: unit.hull_no || "-",
            company: unit.company || "-",
            workUnit: unit.workUnit || "-",
            type: "DUMP_TRUCK",
            companyId: unit.companyId,
            workUnitId: unit.workUnitId,
          }));

          setSelectedUnits(existingUnits);

          const initialOperators = {};
          firstFleet.units.forEach((unit) => {
            const unitId = String(unit.id || unit.dumpTruckId);
            if (unit.operatorId) {
              initialOperators[unitId] = String(unit.operatorId);
            }
          });
          setUnitOperators(initialOperators);
        }

        if (isEditingMergedGroup && fleetsToEdit.length > 1) {
          setIsSplitMode(true);

          const secondFleet = fleetsToEdit[1];

          const fleet2InitialData = {
            dumpingLocation: secondFleet.dumpingLocationId || "",
            measurementType: secondFleet.measurementType || fleetType,
            distance: secondFleet.distance ?? 0,
          };

          setFleet2Data(fleet2InitialData);
          setFleet2DistanceText(
            secondFleet.distance != null && secondFleet.distance !== ""
              ? String(secondFleet.distance)
              : "",
          );

          let fleet2InspectorIdsToSet = [];
          if (
            Array.isArray(secondFleet.inspectorIds) &&
            secondFleet.inspectorIds.length > 0
          ) {
            fleet2InspectorIdsToSet = secondFleet.inspectorIds.map(String);
          } else if (
            Array.isArray(secondFleet.inspectors) &&
            secondFleet.inspectors.length > 0
          ) {
            fleet2InspectorIdsToSet = secondFleet.inspectors
              .map((i) => String(i.id))
              .filter(Boolean);
          } else if (secondFleet.inspectorId) {
            fleet2InspectorIdsToSet = [String(secondFleet.inspectorId)];
          }
          setFleet2InspectorIds(fleet2InspectorIdsToSet);

          let fleet2CheckerIdsToSet = [];
          if (
            Array.isArray(secondFleet.checkerIds) &&
            secondFleet.checkerIds.length > 0
          ) {
            fleet2CheckerIdsToSet = secondFleet.checkerIds.map(String);
          } else if (
            Array.isArray(secondFleet.checkers) &&
            secondFleet.checkers.length > 0
          ) {
            fleet2CheckerIdsToSet = secondFleet.checkers
              .map((c) => String(c.id))
              .filter(Boolean);
          } else if (secondFleet.checkerId) {
            fleet2CheckerIdsToSet = [String(secondFleet.checkerId)];
          }
          setFleet2CheckerIds(fleet2CheckerIdsToSet);

          if (secondFleet.units) {
            const fleet2ExistingUnits = secondFleet.units.map((unit) => ({
              id: String(unit.id || unit.dumpTruckId),
              hull_no: unit.hull_no || "-",
              company: unit.company || "-",
              workUnit: unit.workUnit || "-",
              type: "DUMP_TRUCK",
              companyId: unit.companyId,
              workUnitId: unit.workUnitId,
            }));

            setFleet2SelectedUnits(fleet2ExistingUnits);

            const fleet2InitialOperators = {};
            secondFleet.units.forEach((unit) => {
              const unitId = String(unit.id || unit.dumpTruckId);
              if (unit.operatorId) {
                fleet2InitialOperators[unitId] = String(unit.operatorId);
              }
            });
            setFleet2UnitOperators(fleet2InitialOperators);
          }
        }

        if (firstFleet.excavatorId) {
          setIsLoadingFilteredUnits(true);
          try {
            const filtered = await filterUnitsByExcavator(
              String(firstFleet.excavatorId),
            );
            setFleetFilteredUnits(filtered);
          } catch (error) {
            console.error("❌ Failed to load filtered units:", error);
            setFleetFilteredUnits([]);
          } finally {
            setIsLoadingFilteredUnits(false);
          }
        }
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
        };

        setFleetData(newData);
        setDistanceText("");
        setInspectorIds([]);
        setCheckerIds([]);
        setSelectedUnits([]);
        setUnitOperators({});
        setFleetFilteredUnits([]);
        setPendingTransfers([]);
      }

      setSearchQuery("");
      setShowAllUnits(false);
      setErrors({});
    };

    initializeModalData();
  }, [
    isOpen,
    fleetsToEdit,
    isEditingMergedGroup,
    filterUnitsByExcavator,
    fleetType,
  ]);

  const allFleet2UnitsHaveOperators = useMemo(() => {
    if (!isSplitMode || fleet2SelectedUnits.length === 0) return true;
    return fleet2SelectedUnits.every((unit) => fleet2UnitOperators[unit.id]);
  }, [isSplitMode, fleet2SelectedUnits, fleet2UnitOperators]);

  const selectedOperatorIds = useMemo(() => {
    return Object.values(unitOperators).filter(Boolean);
  }, [unitOperators]);

  const handleExcavatorChange = useCallback(
    async (excavatorId) => {
      setFleetData((p) => ({ ...p, excavator: excavatorId || "" }));

      if (!isEdit) {
        setSelectedUnits([]);
        setUnitOperators({});
        setPendingTransfers([]);
      }

      setErrors((prev) => {
        const e = { ...prev };
        delete e.excavator;
        return e;
      });

      if (excavatorId) {
        setIsLoadingFilteredUnits(true);
        try {
          const filtered = await filterUnitsByExcavator(String(excavatorId));
          setFleetFilteredUnits(filtered);

          if (filtered.length === 0) {
            setErrors((prev) => ({
              ...prev,
              units: "Tidak ada dump truck tersedia untuk excavator ini",
            }));
          }
        } catch (error) {
          console.error("Failed to load filtered units:", error);
          setErrors((prev) => ({
            ...prev,
            units: "Gagal memuat dump truck",
          }));
          setFleetFilteredUnits([]);
        } finally {
          setIsLoadingFilteredUnits(false);
        }
      } else {
        setFleetFilteredUnits([]);
      }
    },
    [filterUnitsByExcavator, isEdit],
  );

  const filteredUnits = useMemo(() => {
    let units = [];

    if (showAllUnits) {
      units = masterUnits.filter((u) => u.type === "DUMP_TRUCK");
    } else {
      units = [...fleetFilteredUnits];
    }

    if (isEdit && fleetsToEdit.length > 0) {
      fleetsToEdit.forEach((fleet) => {
        if (fleet.units) {
          fleet.units.forEach((existingUnit) => {
            const unitId = String(existingUnit.id || existingUnit.dumpTruckId);
            const alreadyInList = units.some((u) => String(u.id) === unitId);

            if (!alreadyInList) {
              units.push({
                id: unitId,
                hull_no: existingUnit.hull_no,
                company: existingUnit.company,
                workUnit: existingUnit.workUnit,
                type: "DUMP_TRUCK",
                companyId: existingUnit.companyId,
                workUnitId: existingUnit.workUnitId,
              });
            }
          });
        }
      });
    }

    units = filterAvailableDumptrucks(
      units,
      usedDumptrucksMap,
      isEdit ? fleetsToEdit.map((f) => f.id) : null,
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      units = units.filter(
        (u) =>
          u.hull_no?.toLowerCase().includes(q) ||
          u.company?.toLowerCase().includes(q) ||
          u.workUnit?.toLowerCase().includes(q),
      );
    }

    return units;
  }, [
    fleetFilteredUnits,
    masterUnits,
    searchQuery,
    fleetsToEdit,
    isEdit,
    showAllUnits,
    usedDumptrucksMap,
  ]);

  const filteredUnitsForFleet2 = useMemo(() => {
    let units = [];

    if (showAllUnits2) {
      units = masterUnits.filter((u) => u.type === "DUMP_TRUCK");
    } else {
      units = [...fleetFilteredUnits];
    }

    units = units.filter((unit) => {
      const inFleet1 = selectedUnits.some(
        (u) => String(u.id) === String(unit.id),
      );
      const inFleet2 = fleet2SelectedUnits.some(
        (u) => String(u.id) === String(unit.id),
      );
      return !inFleet1 && !inFleet2;
    });

    if (searchQuery2) {
      const q = searchQuery2.toLowerCase();
      units = units.filter(
        (u) =>
          u.hull_no?.toLowerCase().includes(q) ||
          u.company?.toLowerCase().includes(q) ||
          u.workUnit?.toLowerCase().includes(q),
      );
    }

    return units;
  }, [
    fleetFilteredUnits,
    masterUnits,
    showAllUnits2,
    searchQuery2,
    selectedUnits,
    fleet2SelectedUnits,
  ]);

  const { selectedUnitsList, unselectedUnitsList } = useMemo(() => {
    const selected = [];
    const unselected = [];

    filteredUnits.forEach((unit) => {
      const isSelected = selectedUnits.some(
        (u) => String(u.id) === String(unit.id),
      );
      const hasOperator = unitOperators[unit.id];

      if (isSelected && hasOperator) {
        selected.push(unit);
      } else {
        unselected.push(unit);
      }
    });

    return {
      selectedUnitsList: selected,
      unselectedUnitsList: unselected,
    };
  }, [filteredUnits, selectedUnits, unitOperators]);

  const allUnitsHaveOperators = useMemo(() => {
    if (selectedUnits.length === 0) return false;
    return selectedUnits.every((unit) => unitOperators[unit.id]);
  }, [selectedUnits, unitOperators]);

  const validate = useCallback(() => {
    const e = {};

    if (!fleetData.excavator) e.excavator = "Pilih excavator";
    if (!fleetData.loadingLocation) e.loadingLocation = "Pilih lokasi loading";
    if (!fleetData.dumpingLocation) e.dumpingLocation = "Pilih lokasi dumping";
    if (!fleetData.coalType) e.coalType = "Pilih coal type";
    if (!fleetData.workUnit) e.workUnit = "Pilih work unit";
    if (!fleetData.measurementType)
      e.measurementType = "Pilih measurement type";

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

    if (!inspectorIds || inspectorIds.length === 0) {
      e.inspector = "Pilih minimal 1 inspector";
    }

    if (!checkerIds || checkerIds.length === 0) {
      e.checker = "Pilih minimal 1 checker";
    }

    selectedUnits.forEach((unit) => {
      if (!unitOperators[unit.id]) {
        e[`operator_${unit.id}`] = VALIDATION_MESSAGES.REQUIRED_OPERATOR;
        e.operators = VALIDATION_MESSAGES.ALL_OPERATORS_REQUIRED;
      }
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [
    fleetData,
    distanceText,
    inspectorIds,
    checkerIds,
    selectedUnits,
    unitOperators,
  ]);

  // Bug Fix 5: Validasi lengkap untuk Fleet 2
  const validateFleet2 = useCallback(() => {
    const e = {};

    // Validasi dumping location (REQUIRED)
    if (!fleet2Data.dumpingLocation) {
      e.fleet2DumpingLocation = "Pilih dumping location untuk Fleet 2";
    }

    // Validasi measurement type (REQUIRED)
    if (!fleet2Data.measurementType && !fleetData.measurementType) {
      e.fleet2MeasurementType = "Pilih measurement type untuk Fleet 2";
    }

    // Validasi distance (REQUIRED)
    const cleaned = (fleet2DistanceText || "").trim().replace(",", ".");
    const distNum =
      cleaned === ""
        ? 0
        : Number.isFinite(parseFloat(cleaned))
          ? parseFloat(cleaned)
          : NaN;
    if (!Number.isFinite(distNum) || distNum < 0) {
      e.fleet2Distance = "Distance Fleet 2 harus angka valid (≥ 0)";
    }

    // Validasi checker (REQUIRED)
    if (!fleet2CheckerIds || fleet2CheckerIds.length === 0) {
      e.fleet2Checker = "Pilih minimal 1 checker untuk Fleet 2";
    }

    // Validasi inspector (conditional - hanya jika berbeda company)
    const companies = new Set();
    fleet2SelectedUnits.forEach((unit) => {
      if (unit.companyId) companies.add(String(unit.companyId));
    });
    if (companies.size > 1) {
      if (!fleet2InspectorIds || fleet2InspectorIds.length === 0) {
        e.fleet2Inspector =
          "Pilih minimal 1 inspector untuk Fleet 2 (ada lebih dari 1 company)";
      }
    }

    // Validasi dump truck dan operator (REQUIRED)
    if (fleet2SelectedUnits.length === 0) {
      e.fleet2Units = "Pilih minimal 1 dump truck untuk Fleet 2";
    }

    fleet2SelectedUnits.forEach((unit) => {
      if (!fleet2UnitOperators[unit.id]) {
        e[`fleet2_operator_${unit.id}`] = "Pilih operator untuk dump truck ini";
        e.fleet2Operators =
          "Semua dump truck di Fleet 2 harus memiliki operator";
      }
    });

    return {
      errors: e,
      isValid: Object.keys(e).length === 0,
    };
  }, [
    fleet2Data,
    fleet2DistanceText,
    fleet2CheckerIds,
    fleet2InspectorIds,
    fleet2SelectedUnits,
    fleet2UnitOperators,
    fleetData.measurementType,
  ]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      showToast.error("Mohon lengkapi semua field yang wajib diisi");
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const dist = distanceText.trim() ? parseInt(distanceText, 10) : 0;

      if (isSplitMode) {
        if (fleet2SelectedUnits.length === 0) {
          showToast.info(
            "Fleet 2 tidak memiliki dump truck. Melanjutkan penyimpanan dengan 1 fleet saja.",
            { duration: 4000 },
          );

          if (isEdit && isEditingMergedGroup && fleetsToEdit.length > 1) {
            try {
              await deleteConfig(fleetsToEdit[1].id);

            } catch (error) {
              console.error("❌ Error deleting fleet 2:", error);
            }
          }

          setIsSplitMode(false);
          resetSplitMode();
        } else {
          // Bug Fix 5: Gunakan validateFleet2 untuk validasi lengkap
          const fleet2Validation = validateFleet2();

          if (!fleet2Validation.isValid) {
            // Set errors untuk ditampilkan di UI
            setErrors((prev) => ({
              ...prev,
              ...fleet2Validation.errors,
            }));

            // Tampilkan error pertama sebagai toast
            const firstError = Object.values(fleet2Validation.errors)[0];
            showToast.error(`Fleet 2: ${firstError}`);
            setIsSaving(false);
            return;
          }

          const dist2 = fleet2DistanceText.trim()
            ? parseInt(fleet2DistanceText, 10)
            : 0;

          const splitPayload = {
            excavatorId: Number(fleetData.excavator),
            loadingLocationId: Number(fleetData.loadingLocation),
            coalTypeId: Number(fleetData.coalType) || null,
            workUnitId: Number(fleetData.workUnit),
            measurement_type: fleetData.measurementType || fleetType,
            checkerIds: checkerIds.map(Number),
            inspectorIds: inspectorIds.map(Number),
            createdByUserId: user?.id ? Number(user.id) : null,
            isSplit: true, // Bug Fix 4: Tandai bahwa ini adalah split fleet

            splits: [
              {
                dumpingLocationId: Number(fleetData.dumpingLocation),
                distance: dist,
                pairDtOp: selectedUnits.map((unit) => ({
                  truckId: Number(unit.id),
                  operatorId: Number(unitOperators[unit.id]),
                })),
              },
              {
                dumpingLocationId: Number(fleet2Data.dumpingLocation),
                distance: dist2,
                pairDtOp: fleet2SelectedUnits.map((unit) => ({
                  truckId: Number(unit.id),
                  operatorId: Number(fleet2UnitOperators[unit.id]),
                })),
              },
            ],
          };

          if (isEdit && isEditingMergedGroup && fleetsToEdit.length > 1) {
            const payload1 = {
              excavatorId: Number(fleetData.excavator),
              loadingLocationId: Number(fleetData.loadingLocation),
              dumpingLocationId: Number(fleetData.dumpingLocation),
              coalTypeId: Number(fleetData.coalType) || null,
              distance: dist,
              workUnitId: Number(fleetData.workUnit),
              measurementType: fleetData.measurementType || fleetType,
              inspectorIds: inspectorIds.map(Number),
              checkerIds: checkerIds.map(Number),
              pairDtOp: selectedUnits.map((unit) => ({
                truckId: Number(unit.id),
                operatorId: Number(unitOperators[unit.id]),
              })),
              moveFromFleets: pendingTransfers.map((t) => ({
                fromFleetId: t.fromFleetId,
                dumpTruckId: t.dumpTruckId,
              })),
              isSplit: true,
            };

            const payload2 = {
              excavatorId: Number(fleetData.excavator),
              loadingLocationId: Number(fleetData.loadingLocation),
              dumpingLocationId: Number(fleet2Data.dumpingLocation),
              coalTypeId: Number(fleetData.coalType) || null,
              distance: dist2,
              workUnitId: Number(fleetData.workUnit),
              measurementType: fleet2Data.measurementType || fleetType,
              inspectorIds: fleet2InspectorIds.map(Number),
              checkerIds: fleet2CheckerIds.map(Number),
              pairDtOp: fleet2SelectedUnits.map((unit) => ({
                truckId: Number(unit.id),
                operatorId: Number(fleet2UnitOperators[unit.id]),
              })),
              isSplit: true, // Bug Fix 4: Tandai bahwa ini adalah split fleet
            };

            const result1 = await handleSaveFleet(payload1, {
              id: fleetsToEdit[0].id,
            });
            const result2 = await handleSaveFleet(payload2, {
              id: fleetsToEdit[1].id,
            });

            if (result1.success && result2.success) {
              showToast.success("Berhasil update 2 fleet configurations");
              resetSplitMode();
              setPendingTransfers([]);
              onClose();
            } else {
              throw new Error("Gagal update salah satu fleet");
            }
          } else if (isEdit && fleetsToEdit.length === 1) {
            // Bug Fix: Edit existing fleet + add split (create Fleet 2)
            // Update Fleet 1, Create Fleet 2
            const payload1 = {
              excavatorId: Number(fleetData.excavator),
              loadingLocationId: Number(fleetData.loadingLocation),
              dumpingLocationId: Number(fleetData.dumpingLocation),
              coalTypeId: Number(fleetData.coalType) || null,
              distance: dist,
              workUnitId: Number(fleetData.workUnit),
              measurementType: fleetData.measurementType || fleetType,
              inspectorIds: inspectorIds.map(Number),
              checkerIds: checkerIds.map(Number),
              pairDtOp: selectedUnits.map((unit) => ({
                truckId: Number(unit.id),
                operatorId: Number(unitOperators[unit.id]),
              })),
              moveFromFleets: pendingTransfers.map((t) => ({
                fromFleetId: t.fromFleetId,
                dumpTruckId: t.dumpTruckId,
              })),
              isSplit: true, // Bug Fix 4: Tandai bahwa ini adalah split fleet
            };

            const payload2 = {
              excavatorId: Number(fleetData.excavator),
              loadingLocationId: Number(fleetData.loadingLocation),
              dumpingLocationId: Number(fleet2Data.dumpingLocation),
              coalTypeId: Number(fleetData.coalType) || null,
              distance: dist2,
              workUnitId: Number(fleetData.workUnit),
              measurementType: fleet2Data.measurementType || fleetType,
              inspectorIds: fleet2InspectorIds.map(Number),
              checkerIds: fleet2CheckerIds.map(Number),
              pairDtOp: fleet2SelectedUnits.map((unit) => ({
                truckId: Number(unit.id),
                operatorId: Number(fleet2UnitOperators[unit.id]),
              })),
              createdByUserId: user?.id ? Number(user.id) : null,
              isSplit: true, // Bug Fix 4: Tandai bahwa ini adalah split fleet
            };

            // Update existing Fleet 1
            const result1 = await handleSaveFleet(payload1, {
              id: fleetsToEdit[0].id,
            });

            // Create new Fleet 2
            const result2 = await handleSaveFleet(payload2, null);

            if (result1.success && result2.success) {
              showToast.success("Berhasil update fleet dan membuat fleet baru");
              resetSplitMode();
              setPendingTransfers([]);
              onClose();
            } else {
              throw new Error("Gagal update/create fleet");
            }
          } else {
            // Create new split fleets
            const result =
              await fleetSplitService.createSplitFleets(splitPayload);

            if (result.success) {
              showToast.success(`Berhasil membuat ${result.data.length} fleet`);
              resetSplitMode();
              onClose();
            } else {
              throw new Error(result.message || "Gagal membuat split fleet");
            }
          }

          setIsSaving(false);
          return;
        }
      }

      const basePayload = {
        excavatorId: Number(fleetData.excavator),
        loadingLocationId: Number(fleetData.loadingLocation),
        dumpingLocationId: Number(fleetData.dumpingLocation),
        coalTypeId: Number(fleetData.coalType) || null,
        distance: dist,
        workUnitId: Number(fleetData.workUnit),
        measurementType: fleetData.measurementType || fleetType,
        inspectorIds: inspectorIds.map(Number),
        checkerIds: checkerIds.map(Number),
        pairDtOp: selectedUnits.map((unit) => ({
          truckId: Number(unit.id),
          operatorId: Number(unitOperators[unit.id]),
        })),
        createdByUserId: user?.id ? Number(user.id) : null,
        isSplit: false, // Bug Fix 4: Tandai bahwa ini bukan split fleet
      };

      if (pendingTransfers.length > 0) {
        basePayload.moveFromFleets = pendingTransfers.map((t) => ({
          fromFleetId: t.fromFleetId,
          dumpTruckId: t.dumpTruckId,
        }));
      }

      const editConfig = isEdit
        ? isEditingMergedGroup
          ? { ids: fleetsToEdit.map((f) => f.id) }
          : { id: fleetsToEdit[0].id }
        : null;

      const result = await handleSaveFleet(basePayload, editConfig);

      if (result.success) {
        const message = isEditingMergedGroup
          ? `Berhasil update ${fleetsToEdit.length} fleet configurations`
          : isEdit
            ? "Berhasil update fleet configuration"
            : "Berhasil membuat fleet configuration";

        showToast.success(message);
        setPendingTransfers([]);
        onClose();
      } else {
        throw new Error(result.error || "Gagal menyimpan fleet");
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
        setTimeout(() => onClose(), 1000);
      } else if (isValidation) {
        setErrors((p) => ({
          ...p,
          submit: err?.message || "Validasi gagal. Periksa input Anda.",
        }));
        showToast.error(err?.message || "Validasi gagal");
      } else {
        const errorMsg = err?.message || "Gagal menyimpan data";
        setErrors((p) => ({ ...p, submit: errorMsg }));
        showToast.error(errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    validate,
    validateFleet2,
    distanceText,
    fleetData,
    inspectorIds,
    checkerIds,
    selectedUnits,
    unitOperators,
    onClose,
    isSplitMode,
    fleet2Data,
    fleet2DistanceText,
    fleet2CheckerIds,
    fleet2InspectorIds,
    fleet2SelectedUnits,
    fleet2UnitOperators,
    isEdit,
    isEditingMergedGroup,
    fleetsToEdit,
    fleetType,
    user,
    handleSaveFleet,
    pendingTransfers,
    resetSplitMode,
    deleteConfig,
    allFleet2UnitsHaveOperators,
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

  const operatorOptions = useMemo(
    () =>
      (masters?.operators || []).map((op) => ({
        value: String(op.id),
        label: op.name,
        hint: op.company || "-",
      })),
    [masters?.operators],
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

  const getOperatorOptionsForUnit = useCallback(
    (unit) => {
      if (!unit?.companyId) {
        return operatorOptions;
      }

      const currentOperatorId = unitOperators[unit.id];

      return operatorOptions.filter((op) => {
        const operatorDetail = masters?.operators?.find(
          (o) => String(o.id) === String(op.value),
        );

        const companyMatch =
          operatorDetail &&
          String(operatorDetail.companyId) === String(unit.companyId);

        const isSelectedByOther =
          selectedOperatorIds.includes(op.value) &&
          op.value !== currentOperatorId;

        return companyMatch && !isSelectedByOther;
      });
    },
    [operatorOptions, masters?.operators, unitOperators, selectedOperatorIds],
  );

  const getAvailableOperatorCount = useCallback(
    (unit) => {
      return getOperatorOptionsForUnit(unit).length;
    },
    [getOperatorOptionsForUnit],
  );

  const handleUnitToggle = useCallback(
    (unit) => {
      const isCurrentlySelected = selectedUnits.some(
        (u) => String(u.id) === String(unit.id),
      );

      if (isCurrentlySelected) {
        setSelectedUnits((prev) =>
          prev.filter((u) => String(u.id) !== String(unit.id)),
        );
        setUnitOperators((prev) => {
          const newOperators = { ...prev };
          delete newOperators[unit.id];
          return newOperators;
        });

        setPendingTransfers((prev) =>
          prev.filter((t) => String(t.dumpTruckId) !== String(unit.id)),
        );

        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`operator_${unit.id}`];
          return newErrors;
        });
      } else {
        const usage = checkDumptruckUsage(
          unit.id,
          usedDumptrucksMap,
          isEdit ? editingConfig?.id : null,
        );

        if (usage.isUsed) {
          setConfirmationDialog({
            isOpen: true,
            unit: unit,
            fromFleetInfo: usage.fleetInfo,
            fromFleetId: usage.fleetId,
            pendingAction: "toggle",
          });
        } else {
          setSelectedUnits((prev) => [...prev, unit]);
        }
      }
    },
    [selectedUnits, usedDumptrucksMap, isEdit, editingConfig],
  );

  const handleConfirmTransfer = useCallback(() => {
    const { unit, fromFleetId } = confirmationDialog;

    setSelectedUnits((prev) => [...prev, unit]);

    setPendingTransfers((prev) => [
      ...prev,
      {
        dumpTruckId: String(unit.id),
        fromFleetId: fromFleetId,
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

  const handleOperatorChange = useCallback((unitId, operatorId) => {
    setUnitOperators((prev) => {
      const newOps = { ...prev };

      if (operatorId) {
        newOps[unitId] = operatorId;
      } else {
        delete newOps[unitId];
      }

      return newOps;
    });

    if (operatorId) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`operator_${unitId}`];
        return newErrors;
      });
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title={
            isEdit
              ? isEditingMergedGroup
                ? `Edit ${fleetsToEdit.length} Split Fleet Configurations`
                : "Edit Fleet Configuration"
              : "Tambah Fleet Configuration"
          }
          icon={Settings}
          onClose={onClose}
        />

        {(mastersLoading || masterUnitsLoading) && (
          <LoadingOverlay isVisible={true} message="Loading master data..." />
        )}

        {!mastersLoading && !masterUnitsLoading && (
          <div className="p-6 space-y-6">
            <FleetWorkUnitMeasurementSection
              workUnitItems={workUnitItems}
              fleetData={fleetData}
              setFleetData={setFleetData}
              errors={errors}
              isSaving={isSaving}
              isEdit={isEdit}
              setCheckerIds={setCheckerIds}
            />

            <FleetExcavatorLocationSection
              excaItems={excaItems}
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
              // Props tambahan untuk split mode
              isSplitMode={isSplitMode}
              setFleet2SelectedUnits={setFleet2SelectedUnits}
              setFleet2UnitOperators={setFleet2UnitOperators}
              setSelectedUnits={setSelectedUnits}
              setUnitOperators={setUnitOperators}
            />

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

            <FleetSplitSettingsSection
              isSplitMode={isSplitMode}
              setIsSplitMode={setIsSplitMode}
              isEdit={isEdit}
              inspectorIds={inspectorIds}
              checkerIds={checkerIds}
              dumpLocItems={dumpLocItems}
              checkerItems={checkerItems}
              inspectorItems={inspectorItems}
              fleetData={fleetData}
              fleet2Data={fleet2Data}
              setFleet2Data={setFleet2Data}
              fleet2DistanceText={fleet2DistanceText}
              setFleet2DistanceText={setFleet2DistanceText}
              fleet2CheckerIds={fleet2CheckerIds}
              setFleet2CheckerIds={setFleet2CheckerIds}
              fleet2InspectorIds={fleet2InspectorIds}
              setFleet2InspectorIds={setFleet2InspectorIds}
              fleet2SelectedUnits={fleet2SelectedUnits}
              setFleet2SelectedUnits={setFleet2SelectedUnits}
              fleet2UnitOperators={fleet2UnitOperators}
              setFleet2UnitOperators={setFleet2UnitOperators}
              selectedUnits={selectedUnits}
              setSelectedUnits={setSelectedUnits}
              unitOperators={unitOperators}
              setUnitOperators={setUnitOperators}
              filteredUnitsForFleet2={filteredUnitsForFleet2}
              usedDumptrucksMap={usedDumptrucksMap}
              masters={masters}
              errors={errors}
              isSaving={isSaving}
              searchQuery2={searchQuery2}
              setSearchQuery2={setSearchQuery2}
              showAllUnits2={showAllUnits2}
              setShowAllUnits2={setShowAllUnits2}
              canMoveFromFleet2ToFleet1={canMoveFromFleet2ToFleet1}
              getOperatorOptionsForUnit={getOperatorOptionsForUnit}
              setErrors={setErrors}
            />

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
                disabled={
                  isSaving ||
                  !allUnitsHaveOperators ||
                  selectedUnits.length === 0 ||
                  (isSplitMode &&
                    fleet2SelectedUnits.length > 0 &&
                    (!allFleet2UnitsHaveOperators ||
                      !fleet2Data.dumpingLocation))
                }
                className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:text-gray-200 dark:hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : isEdit ? (
                  "Update Konfigurasi"
                ) : (
                  "Simpan"
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