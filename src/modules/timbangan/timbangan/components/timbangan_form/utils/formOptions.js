export const getFormOptions = (masters, dtIndex) => {
  // Loading locations
  const loadingLocationOptions = (masters.loadingLocations || []).map((loc) => ({
    value: loc.name,
    label: loc.name,
    hint: loc.type,
  }));

  // Dumping locations
  const dumpingLocationOptions = (masters.dumpingLocations || []).map((loc) => ({
    value: loc.name,
    label: loc.name,
    hint: loc.type,
  }));

  // Dump trucks
  const dumptruckOptions = (masters.dumpTruck || []).map((dt) => ({
    value: dt.hull_no || dt.hullNo,
    label: dt.hull_no || dt.hullNo,
    hint: `${dt.company || dt.contractor || "-"}`,
  }));

  // Excavators
  const excavatorOptions = (masters.excavators || []).map((ex) => ({
    value: ex.hull_no || ex.name,
    label: ex.hull_no || ex.name,
    hint: ex.company || "-",
  }));

  // Shifts
  const shiftOptions = (masters.shifts || []).map((s) => ({
    value: s.name,
    label: s.name,
    hint: s.hours,
  }));

  // Coal types
  const coalTypeOptions = (masters.coalTypes || []).map((ct) => ({
    value: ct.name,
    label: ct.name,
    hint: "",
  }));

  // Work units
  const workUnitOptions = (masters.workUnits || []).map((wu) => ({
    value: wu.subsatker,
    label: wu.subsatker,
    hint: wu.satker,
  }));

  // Hull numbers from dtIndex
  const hullNoOptions = Object.values(dtIndex)
    .filter((data) => !data.isHidden)
    .map((data) => ({
      value: data.hull_no,
      label: data.hull_no,
          hint: `${data.excavator} | ${data.operator_name || "No Operator"}`,
      __data: data,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  
  return {
    loadingLocationOptions,
    dumpingLocationOptions,
    dumptruckOptions,
    excavatorOptions,
    shiftOptions,
    coalTypeOptions,
    workUnitOptions,
    hullNoOptions,
  };
};