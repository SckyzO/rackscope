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
  if (!/^\d+$/.test(middle)) return false;

  const minLen = Math.min(startStr.length, endStr.length);
  const maxLen = Math.max(startStr.length, endStr.length);
  if (middle.length < minLen || middle.length > maxLen) return false;

  const value = Number.parseInt(middle, 10);
  return value >= Math.min(start, end) && value <= Math.max(start, end);
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
