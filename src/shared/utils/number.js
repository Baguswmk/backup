export const formatWeight = (value, decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "0.00";
  return num.toFixed(decimals);
};

export const formatWeightDisplay = (value, unit = "ton", decimals = 2) => {
  return `${formatWeight(value, decimals)} ${unit}`;
};

export const safeParseFloat = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const formatNumber = (value) => {
  const num = safeParseFloat(value);
  return num.toLocaleString("id-ID");
};

export const formatPercentage = (value, decimals = 1) => {
  const num = safeParseFloat(value);
  return `${num.toFixed(decimals)}%`;
};

export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};
