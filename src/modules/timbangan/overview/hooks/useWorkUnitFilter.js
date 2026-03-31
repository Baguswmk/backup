import { useState, useCallback, useMemo } from "react";

// Filter out values that look like numeric IDs (e.g. "2", "3")
const isValidWorkUnitName = (val) =>
  typeof val === "string" && val.trim() !== "" && !/^\d+$/.test(val.trim());

export const useWorkUnitFilter = (data = []) => {
  const [selectedWorkUnits, setSelectedWorkUnits] = useState([]);

  // Derive unique pic_work_unit options langsung dari data
  // Filter out null, empty, and purely-numeric values (backend ID artifacts)
  const workUnitOptions = useMemo(() => {
    const unique = [
      ...new Set(
        data
          .map((item) => item.pic_work_unit)
          .filter(isValidWorkUnitName)
      ),
    ];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [data]);

  const onWorkUnitsChange = useCallback((values) => {
    setSelectedWorkUnits(values || []);
  }, []);

  const onClearWorkUnitFilter = useCallback(() => {
    setSelectedWorkUnits([]);
  }, []);

  const filteredData = useMemo(() => {
    if (!selectedWorkUnits || selectedWorkUnits.length === 0) return data;
    return data.filter((item) =>
      selectedWorkUnits.includes(item.pic_work_unit)
    );
  }, [data, selectedWorkUnits]);

  const hasWorkUnitFilter = selectedWorkUnits.length > 0;

  return {
    selectedWorkUnits,
    onWorkUnitsChange,
    onClearWorkUnitFilter,
    filteredData,
    hasWorkUnitFilter,
    workUnitOptions,
  };
};
