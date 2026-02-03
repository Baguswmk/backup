import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Settings,
  Truck,
  User,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { showToast } from "@/shared/utils/toast";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { useFleetPermissions } from "@/shared/permissions/usePermissions";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import SearchableSelect from "@/shared/components/SearchableSelect";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";
import ModalHeader from "@/shared/components/ModalHeader";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { InfoCard } from "@/shared/components/InfoCard";
import {
  SEARCH_PLACEHOLDERS,
  CARD_TITLES,
  VALIDATION_MESSAGES,
} from "@/modules/timbangan/fleet/constant/fleetConstants";
import {
  createUsedDumptrucksMap,
  filterAvailableDumptrucks,
  checkDumptruckUsage,
  getDumptruckStatus,
} from "@/modules/timbangan/fleet/utils/FleetDumptruckHelper";
import ConfirmationDialog from "@/modules/timbangan/fleet/components/ConfirmationDialog";
import { useFleetSplit } from "@/modules/timbangan/fleet/hooks/useFleetSplit";
import { useFleetWithTransfer } from "@/modules/timbangan/fleet/hooks/useFleetWithTransfer";
import { fleetSplitService } from "@/modules/timbangan/fleet/services/fleetSplitService";
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
  }, [
    fleetData,
    distanceText,
    inspectorIds,
    checkerIds,
    selectedUnits,
    unitOperators,
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
              const deleteResult = await deleteConfig(fleetsToEdit[1].id);

              if (deleteResult && deleteResult.success) {
                console.log("✅ Fleet 2 berhasil dihapus via deleteConfig");
              } else {
                console.warn("⚠️ Gagal menghapus Fleet 2, tetap dilanjutkan");
              }
            } catch (error) {
              console.error("❌ Error deleting fleet 2:", error);
            }
          }

          setIsSplitMode(false);
          resetSplitMode();
        } else {
          if (!fleet2Data.dumpingLocation) {
            showToast.error("Fleet 2: Pilih dumping location");
            setIsSaving(false);
            return;
          }

          if (!allFleet2UnitsHaveOperators) {
            const unitsWithoutOp = fleet2SelectedUnits.filter(
              (unit) => !fleet2UnitOperators[unit.id],
            );
            showToast.error(
              `Fleet 2: ${unitsWithoutOp.length} dump truck belum memiliki operator`,
            );
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
          } else {
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
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.workUnit}
                  </p>
                )}
              </div>

              <div className="md:col-span-1 space-y-2">
                <Label className="dark:text-gray-300">Measurement Type *</Label>
                <SearchableSelect
                  items={MEASUREMENT_TYPE_OPTIONS}
                  value={fleetData.measurementType}
                  onChange={(val) => {
                    setFleetData((p) => ({ ...p, measurementType: val || "" }));
                    if (!isEdit) {
                      setCheckerIds([]);
                    }
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
              title="Excavator & Lokasi"
              variant="default"
              className="border-none"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Excavator *</Label>
                <SearchableSelect
                  items={excaItems}
                  value={fleetData.excavator}
                  onChange={handleExcavatorChange}
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
                  value={fleetData.loadingLocation}
                  onChange={(val) =>
                    setFleetData((p) => ({ ...p, loadingLocation: val || "" }))
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

              <div className="md:col-span-2 space-y-2">
                <Label className="dark:text-gray-300">Dumping Location *</Label>
                <SearchableSelect
                  items={dumpLocItems}
                  value={fleetData.dumpingLocation}
                  onChange={(val) =>
                    setFleetData((p) => ({ ...p, dumpingLocation: val || "" }))
                  }
                  placeholder="Pilih lokasi dumping"
                  emptyText="Lokasi dumping tidak ditemukan"
                  error={!!errors.dumpingLocation}
                  disabled={isSaving}
                />
                {errors.dumpingLocation && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.dumpingLocation}
                  </p>
                )}
              </div>
            </InfoCard>

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
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.coalType}
                  </p>
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
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.distance}
                  </p>
                )}
              </div>
            </InfoCard>

            <InfoCard
              title="Inspector & Checker"
              variant="primary"
              className="border-none"
            >
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Inspector *</Label>
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
            </InfoCard>

            {fleetData.excavator && (
              <InfoCard
                title={CARD_TITLES.UNITS}
                icon={Truck}
                variant="primary"
                className="border-none"
              >
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="dark:text-gray-300">
                      Pilih Dump Truck *
                    </Label>
                    <Input
                      placeholder={SEARCH_PLACEHOLDERS.UNIT}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-xs border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      disabled={isSaving || isLoadingFilteredUnits}
                    />
                  </div>

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
                      <Label className  ="text-sm font-medium cursor-pointer dark:text-gray-300">
                        Tampilkan semua mitra
                      </Label>
                    </div>
                  )}

                  {isSplitMode && fleet2SelectedUnits.length > 0 && (
                    <div className="mb-4">
                      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-sm dark:text-blue-300">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span>
                              Ingin menggabungkan {fleet2SelectedUnits.length}{" "}
                              dump truck ke Fleet 1?
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const confirmMsg =
                                  `Gabungkan ${fleet2SelectedUnits.length} dump truck dari Fleet 2 ke Fleet 1?\n\n` +
                                  `Fleet 2 akan dihapus setelah penggabungan.`;

                                if (window.confirm(confirmMsg)) {
                                  const fleet2Units = [...fleet2SelectedUnits];
                                  const fleet2Operators = {
                                    ...fleet2UnitOperators,
                                  };

                                  setSelectedUnits((prev) => [
                                    ...prev,
                                    ...fleet2Units,
                                  ]);
                                  setUnitOperators((prev) => ({
                                    ...prev,
                                    ...fleet2Operators,
                                  }));

                                  setFleet2SelectedUnits([]);
                                  setFleet2UnitOperators({});
                                  setFleet2Data({
                                    dumpingLocation: "",
                                    measurementType: "",
                                  });
                                  setFleet2DistanceText("");

                                  setIsSplitMode(false);

                                  showToast.success(
                                    `${fleet2Units.length} dump truck berhasil digabungkan ke Fleet 1`,
                                  );
                                }
                              }}
                              className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-600 dark:hover:bg-orange-700 border-none"
                            >
                              <ArrowLeft className="w-4 h-4 mr-1" />
                              Gabungkan ke Fleet 1
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* ✅ UPDATED: Selected units on top, available units below */}
                  {!isLoadingFilteredUnits && filteredUnits.length > 0 && (
                    <div className="rounded-lg max-h-96 overflow-y-auto">
                      {/* Selected Units Section */}
                      {selectedUnitsList.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-t-lg border-b-2 border-blue-300 dark:border-blue-700">
                            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                              Dump Truck Terpilih ({selectedUnitsList.length})
                            </span>
                          </div>
                          {selectedUnitsList.map((unit) => {
                            const hasOperatorError =
                              errors[`operator_${unit.id}`];

                            const currentExcavator = masters?.excavators?.find(
                              (e) =>
                                String(e.id) === String(fleetData.excavator),
                            );
                            const isDifferentCompany =
                              isEdit &&
                              currentExcavator &&
                              String(unit.companyId) !==
                                String(currentExcavator.companyId);

                            const isPendingTransfer = pendingTransfers.some(
                              (t) => String(t.dumpTruckId) === String(unit.id),
                            );

                            return (
                              <div
                                key={unit.id}
                                className={`p-3 transition-colors ${
                                  isDifferentCompany
                                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500"
                                    : "bg-blue-50 dark:bg-blue-900/20"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="pt-1">
                                    <Checkbox
                                      checked={true}
                                      onCheckedChange={() =>
                                        handleUnitToggle(unit)
                                      }
                                      disabled={isSaving}
                                      className="dark:text-gray-200"
                                    />
                                  </div>
                                  <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1" />
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div
                                        className="cursor-pointer flex-1"
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
                                          {isDifferentCompany && (
                                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                                              ⚠️ Beda Company
                                            </span>
                                          )}
                                          {isPendingTransfer && (
                                            <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded">
                                              🔄 Akan Dipindahkan
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {unit.company} • {unit.workUnit}
                                        </p>
                                      </div>
                                    </div>

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
                                        items={getOperatorOptionsForUnit(unit)}
                                        value={unitOperators[unit.id] || ""}
                                        onChange={(operatorId) =>
                                          handleOperatorChange(
                                            unit.id,
                                            operatorId,
                                          )
                                        }
                                        placeholder="Pilih operator"
                                        emptyText={
                                          getAvailableOperatorCount(unit) === 0
                                            ? `Semua operator ${unit.company} sudah dipilih`
                                            : `Tidak ada operator untuk ${unit.company || "company ini"}`
                                        }
                                        disabled={
                                          isSaving ||
                                          getAvailableOperatorCount(unit) === 0
                                        }
                                        error={!!hasOperatorError}
                                      />

                                      {getAvailableOperatorCount(unit) > 0 &&
                                        !unitOperators[unit.id] && (
                                          <p className="text-xs text-blue-600 dark:text-blue-400">
                                            {getAvailableOperatorCount(unit)}{" "}
                                            operator tersedia
                                          </p>
                                        )}

                                      {getAvailableOperatorCount(unit) === 0 &&
                                        !unitOperators[unit.id] && (
                                          <p className="text-xs text-orange-600 dark:text-orange-400">
                                            ⚠️ Semua operator sudah dipilih di
                                            DT lain
                                          </p>
                                        )}

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

                      {/* Available Units Section */}
                      {unselectedUnitsList.length > 0 && (
                        <div>
                          {selectedUnitsList.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-t-lg border-b border-gray-300 dark:border-gray-600">
                              <Truck className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Dump Truck Tersedia (
                                {unselectedUnitsList.length})
                              </span>
                            </div>
                          )}
                          {unselectedUnitsList.map((unit) => {
                            const isSelected = selectedUnits.some(
                              (u) => String(u.id) === String(unit.id),
                            );
                            const hasOperatorError =
                              errors[`operator_${unit.id}`];

                            const dtStatus = getDumptruckStatus(
                              unit.id,
                              selectedUnits,
                              usedDumptrucksMap,
                              isEdit ? editingConfig?.id : null,
                            );
                            const isUsedInOtherFleet =
                              dtStatus === "used-other";

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
                                      onCheckedChange={() =>
                                        handleUnitToggle(unit)
                                      }
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

                                    {/* Show operator selector if unit is checked */}
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
                                          items={getOperatorOptionsForUnit(
                                            unit,
                                          )}
                                          value={unitOperators[unit.id] || ""}
                                          onChange={(operatorId) =>
                                            handleOperatorChange(
                                              unit.id,
                                              operatorId,
                                            )
                                          }
                                          placeholder="Pilih operator"
                                          emptyText={
                                            getAvailableOperatorCount(unit) ===
                                            0
                                              ? `Semua operator ${unit.company} sudah dipilih`
                                              : `Tidak ada operator untuk ${unit.company || "company ini"}`
                                          }
                                          disabled={
                                            isSaving ||
                                            getAvailableOperatorCount(unit) ===
                                              0
                                          }
                                          error={!!hasOperatorError}
                                        />

                                        {getAvailableOperatorCount(unit) > 0 &&
                                          !unitOperators[unit.id] && (
                                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                              {getAvailableOperatorCount(unit)}{" "}
                                              operator tersedia
                                            </p>
                                          )}

                                        {getAvailableOperatorCount(unit) ===
                                          0 &&
                                          !unitOperators[unit.id] && (
                                            <p className="text-xs text-orange-600 dark:text-orange-400">
                                              ⚠️ Semua operator sudah dipilih di
                                              DT lain
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
            )}

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

            {/* Split Mode Toggle - tampil di create dan edit mode */}
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

            {/* Form untuk Fleet 2 - tampil saat split mode aktif (create atau edit) */}
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
                          setFleet2DistanceText(
                            e.target.value.replace(",", "."),
                          )
                        }
                        onBlur={() => {
                          const v = fleet2DistanceText.trim();
                          if (v === "") {
                            setFleet2DistanceText("0");
                            return;
                          }
                          const n = Number(v);
                          if (Number.isFinite(n))
                            setFleet2DistanceText(String(n));
                        }}
                        placeholder="Masukkan jarak dalam meter"
                        disabled={isSaving}
                        className="border-none dark:text-gray-300"
                      />
                      {errors.fleet2Distance && (
                        <p className="text-sm text-red-500 dark:text-red-400">
                          {errors.fleet2Distance}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="dark:text-gray-300">
                        Checker Fleet 2 *
                      </Label>
                      <MultiSearchableSelect
                        items={checkerItems}
                        values={fleet2CheckerIds}
                        onChange={setFleet2CheckerIds}
                        placeholder="Pilih checker untuk fleet 2"
                        emptyText="Checker tidak ditemukan"
                        error={!!errors.fleet2Checker}
                        disabled={isSaving}
                      />
                      {errors.fleet2Checker && (
                        <p className="text-sm text-red-500 dark:text-red-400">
                          {errors.fleet2Checker}
                        </p>
                      )}
                      {fleet2CheckerIds.length > 0 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {fleet2CheckerIds.length} checker dipilih
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Inspector Fleet 2 - hanya tampil jika ada lebih dari 1 company */}
                  {(() => {
                    const companies = new Set();
                    fleet2SelectedUnits.forEach((unit) => {
                      if (unit.companyId) companies.add(String(unit.companyId));
                    });
                    return companies.size > 1;
                  })() && (
                    <div className="space-y-2">
                      <Label className="dark:text-gray-300">
                        Inspector Fleet 2 *
                      </Label>
                      <MultiSearchableSelect
                        items={inspectorItems}
                        values={fleet2InspectorIds}
                        onChange={setFleet2InspectorIds}
                        placeholder="Pilih inspector untuk fleet 2"
                        emptyText="Inspector tidak ditemukan"
                        error={!!errors.fleet2Inspector}
                        disabled={isSaving}
                      />
                      {errors.fleet2Inspector && (
                        <p className="text-sm text-red-500 dark:text-red-400">
                          {errors.fleet2Inspector}
                        </p>
                      )}
                      {fleet2InspectorIds.length > 0 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {fleet2InspectorIds.length} inspector dipilih
                        </p>
                      )}
                    </div>
                  )}

                  {/* Dump Truck Selection untuk Fleet 2 */}
                  {fleetData.excavator && (
                    <div className="space-y-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between">
                        <Label className="dark:text-gray-300">
                          Pilih Dump Truck Fleet 2 *
                        </Label>
                      </div>

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

                      {/* Search + Tampilkan semua mitra — Fleet 2 punya control sendiri */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder={SEARCH_PLACEHOLDERS.UNIT}
                            value={searchQuery2}
                            onChange={(e) => setSearchQuery2(e.target.value)}
                            className="max-w-xs border-none cursor-pointer hover:bg-gray-200 focus:bg-gray-200 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-gray-200"
                            disabled={isSaving}
                          />
                        </div>
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
                      </div>

                      {/* Tombol Transfer All dari Fleet 1 ke Fleet 2 */}
                      {selectedUnits.length > 0 && (
                        <div className="p-3 bg-linear-to-r from-blue-50 to-yellow-50 dark:from-blue-900/20 dark:to-yellow-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                  Transfer Dump Truck dari Fleet 1
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {selectedUnits.length} dump truck tersedia di
                                  Fleet 1
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (isSaving) return;

                                const unitsToTransfer = selectedUnits.filter(
                                  (unit) => {
                                    const alreadyInFleet2 =
                                      fleet2SelectedUnits.some(
                                        (u) => String(u.id) === String(unit.id),
                                      );
                                    return !alreadyInFleet2;
                                  },
                                );

                                if (unitsToTransfer.length === 0) {
                                  showToast.info(
                                    "Semua dump truck Fleet 1 sudah ada di Fleet 2",
                                  );
                                  return;
                                }

                                setFleet2SelectedUnits((prev) => [
                                  ...prev,
                                  ...unitsToTransfer,
                                ]);

                                setSelectedUnits([]);
                                setUnitOperators({});

                                showToast.success(
                                  `${unitsToTransfer.length} dump truck dipindahkan ke Fleet 2`,
                                );
                              }}
                              disabled={isSaving || selectedUnits.length === 0}
                              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                            >
                              <ArrowLeft />
                              Gabungkan ke Fleet 2
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* DT yang dipilih di Fleet 2 */}
                      {fleet2SelectedUnits.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-t-lg border-b-2 border-blue-300 dark:border-blue-700">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                                Dump Truck Fleet 2 Terpilih (
                                {fleet2SelectedUnits.length})
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto bg-blue-50 dark:bg-blue-900/10 p-3 rounded-b-lg">
                            {fleet2SelectedUnits.map((unit) => {
                              const hasOperatorError =
                                errors[`fleet2_operator_${unit.id}`];
                              return (
                                <div
                                  key={unit.id}
                                  className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-800"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="pt-1">
                                      <Checkbox
                                        checked={true}
                                        onCheckedChange={() => {
                                          if (isSaving) return;

                                          const moveCheck =
                                            canMoveFromFleet2ToFleet1(
                                              fleet2SelectedUnits,
                                              unit,
                                            );

                                          if (!moveCheck.allowed) {
                                            showToast.warning(
                                              moveCheck.reason,
                                              { duration: 5000 },
                                            );
                                            return;
                                          }

                                          setFleet2SelectedUnits((prev) =>
                                            prev.filter(
                                              (u) =>
                                                String(u.id) !==
                                                String(unit.id),
                                            ),
                                          );
                                          setFleet2UnitOperators((prev) => {
                                            const newOperators = { ...prev };
                                            delete newOperators[unit.id];
                                            return newOperators;
                                          });

                                          showToast.success(
                                            `${unit.hull_no} dihapus dari Fleet 2`,
                                          );
                                        }}
                                        disabled={isSaving}
                                        className="dark:text-gray-200"
                                      />
                                    </div>
                                    <Truck className="w-4 h-4 mt-1 text-yellow-600 dark:text-yellow-400" />
                                    <div className="flex-1 space-y-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium text-sm dark:text-gray-200">
                                            {unit.hull_no}
                                          </p>
                                          {!fleet2UnitOperators[unit.id] && (
                                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                                              ⚠️ Pilih Operator
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {unit.company} • {unit.workUnit}
                                        </p>
                                      </div>

                                      {/* Operator selector */}
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
                                          items={getOperatorOptionsForUnit(
                                            unit,
                                          ).filter((op) => {
                                            const isSelectedInFleet1 =
                                              Object.values(
                                                unitOperators,
                                              ).includes(op.value);
                                            const isSelectedInFleet2Other =
                                              Object.entries(
                                                fleet2UnitOperators,
                                              )
                                                .filter(
                                                  ([key]) =>
                                                    String(key) !==
                                                    String(unit.id),
                                                )
                                                .map(([, val]) => val)
                                                .includes(op.value);
                                            return (
                                              !isSelectedInFleet1 &&
                                              !isSelectedInFleet2Other
                                            );
                                          })}
                                          value={
                                            fleet2UnitOperators[unit.id] || ""
                                          }
                                          onChange={(operatorId) => {
                                            setFleet2UnitOperators((prev) => {
                                              const newOps = { ...prev };
                                              if (operatorId) {
                                                newOps[unit.id] = operatorId;
                                              } else {
                                                delete newOps[unit.id];
                                              }
                                              return newOps;
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
                                          emptyText="Semua operator sudah dipilih"
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
                        </div>
                      )}

                      {/* DT dari Fleet 1 — klik untuk pindahkan ke Fleet 2 */}
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
                                          (u) =>
                                            String(u.id) !== String(unit.id),
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

                      {/* DT Tersedia — pool independen Fleet 2 */}
                      {filteredUnitsForFleet2.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Dump Truck Tersedia (
                              {filteredUnitsForFleet2.length})
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
                              const isUsedInOtherFleet =
                                dtStatus === "used-other";

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

                      {/* Empty state: tidak ada DT tersedia */}
                      {filteredUnitsForFleet2.length === 0 &&
                        fleet2SelectedUnits.length === 0 &&
                        selectedUnits.length === 0 && (
                          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <AlertDescription className="text-sm dark:text-yellow-300">
                              Tidak ada dump truck tersedia. Coba aktifkan{" "}
                              <strong>"Tampilkan semua mitra"</strong> untuk
                              melihat semua dump truck.
                            </AlertDescription>
                          </Alert>
                        )}
                    </div>
                  )}
                </div>
              </div>
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
