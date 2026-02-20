import { useState, useCallback, useMemo } from "react";

export const useWorkUnitFilter = (data = []) => {
  const [selectedWorkUnit, setSelectedWorkUnit] = useState(null);

  // Derive unique pic_work_unit options langsung dari data
  const workUnitOptions = useMemo(() => {
    const unique = [
      ...new Set(data.map((item) => item.pic_work_unit).filter(Boolean)),
    ];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [data]);

  const onWorkUnitChange = useCallback((value) => {
    setSelectedWorkUnit(value || null);
  }, []);

  const onClearWorkUnitFilter = useCallback(() => {
    setSelectedWorkUnit(null);
  }, []);

  const filteredData = useMemo(() => {
    if (!selectedWorkUnit) return data;
    return data.filter((item) => item.pic_work_unit === selectedWorkUnit);
  }, [data, selectedWorkUnit]);

  const hasWorkUnitFilter = Boolean(selectedWorkUnit);

  return {
    selectedWorkUnit,
    onWorkUnitChange,
    onClearWorkUnitFilter,
    filteredData,
    hasWorkUnitFilter,
    workUnitOptions,
  };
};