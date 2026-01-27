export const SHIFT_CONFIG = {
  "Shift 1": {
    start: 22,
    end: 6,
    label: "Shift 1 (22:00-06:00)",
    crossesMidnight: true,
  },
  "Shift 2": {
    start: 6,
    end: 14,
    label: "Shift 2 (06:00-14:00)",
    crossesMidnight: false,
  },
  "Shift 3": {
    start: 14,
    end: 22,
    label: "Shift 3 (14:00-22:00)",
    crossesMidnight: false,
  },
};

export const getCurrentShift = () => {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 22 || currentHour < 6) {
    return "Shift 1";
  } else if (currentHour >= 6 && currentHour < 14) {
    return "Shift 2";
  } else if (currentHour >= 14 && currentHour < 22) {
    return "Shift 3";
  } else {
    return "All"
  }
};

export const getShiftOptions = (includeAll = false) => {
  const options = [
    { value: "Shift 1", label: "Shift 1 (22:00-06:00)" },
    { value: "Shift 2", label: "Shift 2 (06:00-14:00)" },
    { value: "Shift 3", label: "Shift 3 (14:00-22:00)" },
  ];

  if (includeAll) {
    return [{ value: "All", label: "Semua Shift" }, ...options];
  }

  return options;
};

export const getShiftLabel = (shift) => {
  if (!shift) return "Shift tidak diketahui";

  if (shift === "All") {
    return "Semua Shift";
  }

  const config = SHIFT_CONFIG[shift];
  if (config) {
    return config.label;
  }

  return shift;
};

export const isTimeInShift = (time, shiftName) => {
  const date = time instanceof Date ? time : new Date(time);
  const hour = date.getHours();

  const config = SHIFT_CONFIG[shiftName];
  if (!config) return false;

  if (config.crossesMidnight) {
    return hour >= config.start || hour < config.end;
  } else {
    return hour >= config.start && hour < config.end;
  }
};

export const getShiftFromHour = (hour) => {
  if (hour >= 22 || hour < 6) {
    return "Shift 1";
  } else if (hour >= 6 && hour < 14) {
    return "Shift 2";
  } else {
    return "Shift 3";
  }
};

export const isValidShift = (shift) => {
  return shift === "All" || Object.keys(SHIFT_CONFIG).includes(shift);
};

export const getShiftTimeRange = (shiftName) => {
  const config = SHIFT_CONFIG[shiftName];
  if (!config) return "-";

  const startTime = `${String(config.start).padStart(2, "0")}:00`;
  const endTime = `${String(config.end).padStart(2, "0")}:00`;

  return `${startTime} - ${endTime}`;
};

export default {
  SHIFT_CONFIG,
  getCurrentShift,
  getShiftOptions,
  getShiftLabel,
  isTimeInShift,
  getShiftFromHour,
  isValidShift,
  getShiftTimeRange,
};
