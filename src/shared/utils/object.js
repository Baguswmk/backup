export const getFirstTruthyValue = (obj, ...keys) => {
  if (!obj) return "-";

  for (const key of keys) {
    const value = obj[key];
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return "-";
};
