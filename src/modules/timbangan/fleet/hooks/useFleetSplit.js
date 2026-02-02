import { useState } from "react";

/**
 * Custom hook untuk mengelola split fleet mode
 */
export const useFleetSplit = () => {
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [fleet2Data, setFleet2Data] = useState({
    dumpingLocation: "",
    measurementType: "",
    distance: 0,
  });
  const [fleet2DistanceText, setFleet2DistanceText] = useState("");
  const [fleet2CheckerIds, setFleet2CheckerIds] = useState([]);
  const [fleet2InspectorIds, setFleet2InspectorIds] = useState([]);
  const [fleet2SelectedUnits, setFleet2SelectedUnits] = useState([]);
  const [fleet2UnitOperators, setFleet2UnitOperators] = useState({});

  const resetSplitMode = () => {
    setIsSplitMode(false);
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
  };

  return {
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
  };
};
