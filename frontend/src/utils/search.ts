export const normalizeQuery = (value: string): string => value.trim().toLowerCase();

export const matchesText = (value: string | undefined, query: string): boolean => {
  if (!query) return false;
  return (value || '').toLowerCase().includes(query);
};

const parseRangePattern = (pattern: string) => {
  const match = pattern.match(/^(.*)\[(\d+)-(\d+)\](.*)$/);
  if (!match) return null;
  const [, prefix, startStr, endStr, suffix] = match;
  const start = Number.parseInt(startStr, 10);
  const end = Number.parseInt(endStr, 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { prefix, startStr, endStr, start, end, suffix };
};

export const matchesInstancePattern = (query: string, pattern: string): boolean => {
  if (!query) return false;
  const normalizedPattern = pattern.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const parsed = parseRangePattern(normalizedPattern);
  if (!parsed) {
    return normalizedPattern.includes(normalizedQuery);
  }

  const { prefix, suffix, start, end, startStr, endStr } = parsed;
  if (!normalizedQuery.startsWith(prefix) || !normalizedQuery.endsWith(suffix)) {
    return false;
  }
  const middle = normalizedQuery.slice(prefix.length, normalizedQuery.length - suffix.length);
  if (middle && !/^\d+$/.test(middle)) return false;

  const minLen = Math.min(startStr.length, endStr.length);
  const maxLen = Math.max(startStr.length, endStr.length);
  if (middle.length > maxLen) return false;

  const rangeMin = Math.min(start, end);
  const rangeMax = Math.max(start, end);

  if (middle.length < minLen) {
    if (!middle) return true;
    const width = maxLen;
    const minStr = middle + '0'.repeat(Math.max(0, width - middle.length));
    const maxStr = middle + '9'.repeat(Math.max(0, width - middle.length));
    const prefixMin = Number.parseInt(minStr, 10);
    const prefixMax = Number.parseInt(maxStr, 10);
    return prefixMax >= rangeMin && prefixMin <= rangeMax;
  }

  const value = Number.parseInt(middle, 10);
  return value >= rangeMin && value <= rangeMax;
};

export const matchesInstanceValue = (query: string, instance: unknown): boolean => {
  if (!query) return false;
  if (typeof instance === 'string') {
    return matchesInstancePattern(query, instance);
  }
  if (instance && typeof instance === 'object') {
    return Object.values(instance as Record<string, unknown>).some((value) => {
      if (typeof value === 'string') {
        return matchesInstancePattern(query, value);
      }
      return matchesText(String(value), query);
    });
  }
  return false;
};

export const expandInstanceMatches = (query: string, instance: unknown, limit = 50): string[] => {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery || limit <= 0) return [];
  const results: string[] = [];

  const pushIfMatch = (value: string) => {
    const normalizedValue = value.toLowerCase();
    if (normalizedValue.includes(normalizedQuery)) {
      results.push(value);
    }
  };

  const expandPattern = (pattern: string) => {
    if (results.length >= limit) return;
    const parsed = parseRangePattern(pattern);
    if (!parsed) {
      pushIfMatch(pattern);
      return;
    }
    const { prefix, suffix, start, end, startStr, endStr } = parsed;
    const width = Math.max(startStr.length, endStr.length);
    const rangeMin = Math.min(start, end);
    const rangeMax = Math.max(start, end);

    for (let value = rangeMin; value <= rangeMax; value += 1) {
      if (results.length >= limit) return;
      const num = String(value).padStart(width, '0');
      const candidate = `${prefix}${num}${suffix}`;
      pushIfMatch(candidate);
    }
  };

  if (typeof instance === 'string') {
    expandPattern(instance);
  } else if (instance && typeof instance === 'object') {
    for (const value of Object.values(instance as Record<string, unknown>)) {
      if (results.length >= limit) break;
      if (typeof value === 'string') {
        expandPattern(value);
      } else if (
        value !== null &&
        value !== undefined &&
        (typeof value === 'number' || typeof value === 'boolean')
      ) {
        pushIfMatch(String(value));
      }
    }
  }

  return results.slice(0, limit);
};
