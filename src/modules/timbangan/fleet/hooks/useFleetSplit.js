import { useState, useEffect, useCallback } from "react";

/**
 * ✅ REFACTORED: Universal fleet management hook
 * - Manages multiple secondary fleets via fleetsUniverse
 * - No more fleet2Data legacy code
 */
export const useFleetSplit = () => {
  const [isSplitMode, setIsSplitMode] = useState(false);

  // ✅ Universe: array of fleet objects for secondary fleets
  const [fleetsUniverse, setFleetsUniverse] = useState([]);

  // ✅ Active fleet id within universe
  const [activeFleetId, setActiveFleetId] = useState(null);

  // ✅ Helper: Create empty fleet structure
  const createEmptyFleet = useCallback(
    () => ({
      id: `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      dumpingLocation: "",
      measurementType: "",
      distance: 0,
      workUnit: "",
      coalType: "",
      weightBridge: "",
      checkerIds: [],
      inspectorIds: [],
      selectedUnits: [],
      unitOperators: {},
    }),
    [],
  );

  // ✅ Add new fleet to universe - NOW RETURNS THE FLEET ID
  const addFleetToUniverse = useCallback(
    (initial = null) => {
      const newFleet = initial || createEmptyFleet();

      setFleetsUniverse((prev) => {
        const next = [...prev, newFleet];
        return next;
      });

      // Auto-activate the new fleet
      setActiveFleetId(newFleet.id);
      setIsSplitMode(true);

      // 🔥 FIX: Return the fleet ID so caller can use it
      return newFleet.id;
    },
    [createEmptyFleet],
  );

  // ✅ Update specific fleet in universe
  const updateFleetInUniverse = useCallback((fleetId, patch) => {
    setFleetsUniverse((prev) =>
      prev.map((f) => (f.id === fleetId ? { ...f, ...patch } : f)),
    );
  }, []);

  // ✅ Remove fleet from universe
  const removeFleetFromUniverse = useCallback(
    (fleetId) => {
      setFleetsUniverse((prev) => {
        const next = prev.filter((f) => f.id !== fleetId);

        // If removed fleet was active, switch to first available
        if (activeFleetId === fleetId) {
          setActiveFleetId(next.length > 0 ? next[0].id : null);
        }

        // If no more fleets, turn off split mode
        if (next.length === 0) {
          setIsSplitMode(false);
        }

        return next;
      });
    },
    [activeFleetId],
  );

  // ✅ Set active fleet for editing
  const setActiveUniverseFleet = useCallback((fleetId) => {
    setActiveFleetId(fleetId);
  }, []);

  // ✅ Reset split mode completely
  const resetSplitMode = useCallback(() => {
    setIsSplitMode(false);
    setFleetsUniverse([]);
    setActiveFleetId(null);
  }, []);

  // ✅ Auto-select first fleet when universe changes
  useEffect(() => {
    if (fleetsUniverse.length === 0) {
      setActiveFleetId(null);
      return;
    }

    // If active fleet doesn't exist anymore, pick first
    const activeExists = fleetsUniverse.some((f) => f.id === activeFleetId);
    if (!activeExists) {
      setActiveFleetId(fleetsUniverse[0].id);
    }
  }, [fleetsUniverse, activeFleetId]);

  /**
   * ✅ Validate split configuration before save
   * @param {Array} primarySelectedUnits - Selected units from primary fleet (Fleet 1)
   * @returns {Object} { valid: boolean, error?: string }
   */
  const validateSplitConfiguration = useCallback(
    (primarySelectedUnits = []) => {
      if (fleetsUniverse.length === 0) {
        return { valid: true }; // Not in split mode
      }

      // Rule 1: Max 3 secondary fleets (total 4 including primary)
      if (fleetsUniverse.length > 3) {
        return {
          valid: false,
          error: "Mode split maksimal 3 fleet tambahan (total 4 fleet)",
        };
      }

      // Rule 2: Min 1 secondary fleet when in split mode
      if (fleetsUniverse.length < 1) {
        return {
          valid: false,
          error: "Mode split memerlukan minimal 1 fleet tambahan",
        };
      }

      // Rule 3: All fleets must have inspector
      const allHaveInspectors = fleetsUniverse.every(
        (f) => f.inspectorIds && f.inspectorIds.length > 0,
      );

      if (!allHaveInspectors) {
        return {
          valid: false,
          error: "Setiap fleet wajib memiliki minimal 1 inspector",
        };
      }

      // Rule 4: All fleets must have dumping location
      const allHaveDumping = fleetsUniverse.every((f) => f.dumpingLocation);

      if (!allHaveDumping) {
        return {
          valid: false,
          error: "Setiap fleet wajib memiliki dumping location",
        };
      }

      // Rule 5: All fleets must have measurement type
      const allHaveMeasurement = fleetsUniverse.every((f) => f.measurementType);

      if (!allHaveMeasurement) {
        return {
          valid: false,
          error: "Setiap fleet wajib memiliki measurement type",
        };
      }

      // Rule 6: All fleets must have at least 1 dump truck
      const allHaveUnits = fleetsUniverse.every(
        (f) => f.selectedUnits && f.selectedUnits.length > 0,
      );

      if (!allHaveUnits) {
        return {
          valid: false,
          error: "Setiap fleet wajib memiliki minimal 1 dump truck",
        };
      }

      // Rule 7: All dump trucks must have operators
      const allUnitsHaveOperators = fleetsUniverse.every((fleet) =>
        fleet.selectedUnits?.every(
          (unit) => fleet.unitOperators && fleet.unitOperators[unit.id],
        ),
      );

      if (!allUnitsHaveOperators) {
        return {
          valid: false,
          error: "Semua dump truck harus memiliki operator",
        };
      }

      // ✅ NEW Rule 8: No duplicate dump trucks across fleets
      const truckUsageMap = new Map(); // truckId -> array of fleet labels

      // Collect trucks from primary fleet (Fleet 1)
      primarySelectedUnits.forEach((unit) => {
        const truckId = String(unit.id);
        if (!truckUsageMap.has(truckId)) {
          truckUsageMap.set(truckId, []);
        }
        truckUsageMap.get(truckId).push("Fleet 1");
      });

      // Collect trucks from secondary fleets
      fleetsUniverse.forEach((fleet, index) => {
        const fleetLabel = `Fleet ${index + 2}`;
        (fleet.selectedUnits || []).forEach((unit) => {
          const truckId = String(unit.id);
          if (!truckUsageMap.has(truckId)) {
            truckUsageMap.set(truckId, []);
          }
          truckUsageMap.get(truckId).push(fleetLabel);
        });
      });

      // Find duplicates
      const duplicates = [];
      for (const [truckId, fleetLabels] of truckUsageMap) {
        if (fleetLabels.length > 1) {
          // Get truck hull number for better error message
          const truck =
            primarySelectedUnits.find((u) => String(u.id) === truckId) ||
            fleetsUniverse
              .flatMap((f) => f.selectedUnits || [])
              .find((u) => String(u.id) === truckId);

          duplicates.push({
            id: truckId,
            hullNo: truck?.hull_no || `DT #${truckId}`,
            fleets: fleetLabels,
          });
        }
      }

      if (duplicates.length > 0) {
        const errorMessages = duplicates.map(
          (dup) => `${dup.hullNo} digunakan di: ${dup.fleets.join(", ")}`,
        );

        return {
          valid: false,
          error: `Dump truck tidak boleh digunakan di multiple fleet:\n${errorMessages.join("\n")}`,
        };
      }

      return { valid: true };
    },
    [fleetsUniverse],
  );

  const prepareBulkPayload = useCallback(
    (primaryFleet, editingFleets = null, allExistingFleets = []) => {
      const fleets = [];
      const isEditMode =
        editingFleets &&
        Array.isArray(editingFleets) &&
        editingFleets.length > 0;


      // ✅ Helper: Detect truck transfers (which trucks moved from which fleet)
      const detectTruckTransfers = (currentTrucks, currentFleetId) => {
        if (!isEditMode || !currentTrucks || currentTrucks.length === 0) {
          return [];
        }

        const transferMap = new Map(); // sourceFleetId -> [truckIds]

        currentTrucks.forEach((truck) => {
          const truckId = truck.id;

          // Find which original fleet had this truck
          let sourceFleetId = null;

          editingFleets.forEach((originalFleet, idx) => {
            const originalDumpTrucks = originalFleet.dumpTrucks || [];
            const hadThisTruck = originalDumpTrucks.some(
              (dt) => String(dt.dump_truck_id) === String(truckId),
            );

            if (hadThisTruck) {
              sourceFleetId = originalFleet.id;
            }
          });

          // If truck was in a different fleet originally, it's a transfer
          if (
            sourceFleetId &&
            String(sourceFleetId) !== String(currentFleetId)
          ) {
            if (!transferMap.has(sourceFleetId)) {
              transferMap.set(sourceFleetId, []);
            }
            transferMap.get(sourceFleetId).push(truckId);
          }
        });

        // Convert map to moveFromFleets format
        const moveFromFleets = [];
        for (const [sourceFleetId, truckIds] of transferMap) {
          moveFromFleets.push({
            fleetId: parseInt(sourceFleetId),
            truckIds: truckIds.map((id) => parseInt(id)),
          });
        }

        return moveFromFleets;
      };

      // ✅ NEW Helper: Detect cross-fleet transfers from ALL existing fleets (for CREATE mode)
      const detectCrossFleetTransfers = (currentTrucks) => {
        if (
          !allExistingFleets ||
          allExistingFleets.length === 0 ||
          !currentTrucks ||
          currentTrucks.length === 0
        ) {
          return []; // No existing fleets to check
        }

        const transferMap = new Map(); // source fleet ID -> array of truck IDs

        currentTrucks.forEach((truck) => {
          const truckId = String(truck.id);

          // Find if this truck exists in ANY existing fleet
          allExistingFleets.forEach((existingFleet) => {
            const isInExistingFleet = (existingFleet.units || []).some(
              (u) => String(u.dump_truck_id) === truckId,
            );

            if (isInExistingFleet) {
              // Skip if this fleet is being edited (already handled by detectTruckTransfers)
              const isBeingEdited = editingFleets?.some(
                (ef) => ef.id === existingFleet.id,
              );

              if (!isBeingEdited) {
                // Truck needs to be transferred from this fleet
                if (!transferMap.has(existingFleet.id)) {
                  transferMap.set(existingFleet.id, []);
                }
                transferMap.get(existingFleet.id).push(truckId);

              }
            }
          });
        });

        // Convert to moveFromFleets format
        const moveFromFleets = [];
        for (const [sourceFleetId, truckIds] of transferMap) {
          moveFromFleets.push({
            fleetId: parseInt(sourceFleetId),
            truckIds: truckIds.map((id) => parseInt(id)),
          });
        }

        return moveFromFleets;
      };

      // PRIMARY FLEET
      const primaryPayload = {
        excavatorId: primaryFleet.excavatorId,
        loadingLocationId: primaryFleet.loadingLocationId,
        dumpingLocationId: primaryFleet.dumpingLocationId,
        coalTypeId: primaryFleet.coalTypeId,
        workUnitId: primaryFleet.workUnitId,
        distance: primaryFleet.distance || 0,
        measurementType: primaryFleet.measurementType,
        checkerIds: primaryFleet.checkerIds || [],
        inspectorIds: primaryFleet.inspectorIds || [],
        weightBridgeId: primaryFleet.weightBridgeId || null,
        createdByUserId: primaryFleet.createdByUserId,
        pairDtOp: primaryFleet.pairDtOp || [],
        selectedUnits: primaryFleet.selectedUnits || [],
      };

      // ✅ ROBUST ID DETECTION
      let primaryFleetId = null;
      if (isEditMode) {
        const firstFleet = editingFleets[0];
        const fleetId =
          editingFleets[0]?.id ||
          primaryFleet.id ||
          editingFleets[0]?.settingFleetId;

        if (fleetId) {
          primaryPayload.id = fleetId;
          primaryFleetId = fleetId;
        } else {
          console.error("❌ PRIMARY fleet ID MISSING!", { firstFleet });
        }
      }

      // ✅ NEW: Detect transfers for primary fleet
      if (isEditMode && primaryFleetId) {
        const moveFromFleets = detectTruckTransfers(
          primaryFleet.selectedUnits || [],
          primaryFleetId,
        );

        if (moveFromFleets.length > 0) {
          primaryPayload.isTransfer = true;
          primaryPayload.moveFromFleets = moveFromFleets;
        }
      }

      // ✅ NEW: Detect cross-fleet transfers for CREATE mode
      if (!isEditMode) {
        const moveFromFleets = detectCrossFleetTransfers(
          primaryFleet.selectedUnits || [],
        );

        if (moveFromFleets.length > 0) {
          primaryPayload.isTransfer = true;
          primaryPayload.moveFromFleets = moveFromFleets;
        }
      }

      fleets.push(primaryPayload);

      // SECONDARY FLEETS
      fleetsUniverse.forEach((fleet, index) => {
        const allPairs = Object.entries(fleet.unitOperators || {}).map(
          ([truckId, operatorId]) => ({ truckId, operatorId }),
        );

        const validPairs = allPairs.filter(
          (pair) => pair.truckId && pair.operatorId,
        );

        const secondaryPayload = {
          excavatorId: primaryFleet.excavatorId,
          loadingLocationId: primaryFleet.loadingLocationId,
          dumpingLocationId: fleet.dumpingLocation,
          coalTypeId: primaryFleet.coalTypeId,
          workUnitId: primaryFleet.workUnitId,
          distance: fleet.distance || 0,
          measurementType: fleet.measurementType,
          checkerIds: fleet.checkerIds || primaryFleet.checkerIds || [],
          inspectorIds: fleet.inspectorIds || [],
          weightBridgeId: primaryFleet.weightBridgeId || null,
          createdByUserId: primaryFleet.createdByUserId,
          pairDtOp: validPairs,
          selectedUnits: fleet.selectedUnits || [],
        };

        // ✅ CRITICAL: Check if this secondary fleet exists
        let secondaryFleetId = null;
        if (isEditMode) {
          const correspondingEditIndex = index + 1;
          const correspondingFleet = editingFleets[correspondingEditIndex];

          if (correspondingFleet) {
            const fleetId =
              correspondingFleet.id ||
              correspondingFleet.settingFleetId ||
              correspondingFleet.fleetId;

            if (fleetId) {
              secondaryPayload.id = fleetId;
              secondaryFleetId = fleetId;
            }
          } 
        }

        // ✅ NEW: Detect transfers for secondary fleet
        if (isEditMode && secondaryFleetId) {
          const moveFromFleets = detectTruckTransfers(
            fleet.selectedUnits || [],
            secondaryFleetId,
          );

          if (moveFromFleets.length > 0) {
            secondaryPayload.isTransfer = true;
            secondaryPayload.moveFromFleets = moveFromFleets;
          }
        }

        // ✅ NEW: Detect cross-fleet transfers for CREATE mode
        if (!isEditMode) {
          const moveFromFleets = detectCrossFleetTransfers(
            fleet.selectedUnits || [],
          );

          if (moveFromFleets.length > 0) {
            secondaryPayload.isTransfer = true;
            secondaryPayload.moveFromFleets = moveFromFleets;
          }
        }

        fleets.push(secondaryPayload);
      });

      return fleets;
    },
    [fleetsUniverse],
  );

  /**
   * ✅ Get active fleet object
   * @returns {Object|null} Active fleet or null
   */
  const getActiveFleet = useCallback(() => {
    if (!activeFleetId) return null;
    return fleetsUniverse.find((f) => f.id === activeFleetId) || null;
  }, [activeFleetId, fleetsUniverse]);

  /**
   * ✅ Get fleet label (Fleet 2, Fleet 3, etc.)
   * @param {string} fleetId - Fleet ID
   * @returns {number} Fleet number (2, 3, 4...)
   */
  const getFleetNumber = useCallback(
    (fleetId) => {
      const index = fleetsUniverse.findIndex((f) => f.id === fleetId);
      return index >= 0 ? index + 2 : 0; // Fleet 2, Fleet 3, Fleet 4...
    },
    [fleetsUniverse],
  );

  return {
    // ✅ Split mode state
    isSplitMode,
    setIsSplitMode,

    // ✅ Universe management
    fleetsUniverse,
    addFleetToUniverse,
    updateFleetInUniverse,
    removeFleetFromUniverse,
    resetSplitMode,

    // ✅ Active fleet
    activeFleetId,
    setActiveUniverseFleet,
    getActiveFleet,

    // ✅ Utilities
    getFleetNumber,

    // ✅ Validation & preparation
    validateSplitConfiguration,
    prepareBulkPayload,
  };
};

export default useFleetSplit;
