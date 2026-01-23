export const buildCacheKey = (prefix, params = {}) => {
  const parts = [prefix];

  const sortedKeys = Object.keys(params).sort();

  for (const key of sortedKeys) {
    const value = params[key];

    if (value === null || value === undefined) {
      continue;
    }

    let serialized;
    if (typeof value === "object") {
      serialized = JSON.stringify(value).replace(/"/g, "");
    } else {
      serialized = String(value);
    }

    parts.push(`${key}:${serialized}`);
  }

  return parts.join("_");
};

export const buildDateRangeCacheKey = (
  prefix,
  dateRange,
  additionalParams = {},
) => {
  const today = new Date().toISOString().split("T")[0];

  let dateKey;
  if (!dateRange || (!dateRange.from && !dateRange.to)) {
    dateKey = "all";
  } else if (dateRange.from && dateRange.to) {
    const isToday = dateRange.from === today && dateRange.to === today;
    dateKey = isToday ? "today" : `${dateRange.from}_${dateRange.to}`;
  } else if (dateRange.from) {
    dateKey = `from_${dateRange.from}`;
  } else if (dateRange.to) {
    dateKey = `to_${dateRange.to}`;
  }

  return buildCacheKey(prefix, {
    date: dateKey,
    ...additionalParams,
  });
};

export const buildUserCacheKey = (prefix, userId, additionalParams = {}) => {
  return buildCacheKey(prefix, {
    userId: userId || "nouser",
    ...additionalParams,
  });
};

export const parseCacheKey = (cacheKey) => {
  const parts = cacheKey.split("_");
  const prefix = parts[0];
  const params = {};

  for (let i = 1; i < parts.length; i++) {
    const [key, ...valueParts] = parts[i].split(":");
    if (key && valueParts.length > 0) {
      params[key] = valueParts.join(":");
    }
  }

  return { prefix, params };
};
