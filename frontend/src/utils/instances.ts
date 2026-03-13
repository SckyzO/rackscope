export type InstanceInput = string | string[] | Record<number, string> | undefined | null;

const parseRange = (pattern: string) => {
  const match = pattern.match(/^(.*)\[(\d+)-(\d+)\]$/);
  if (!match) return null;
  const [, prefix, startStr, endStr] = match;
  const start = Number.parseInt(startStr, 10);
  const end = Number.parseInt(endStr, 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { prefix, start, end, width: Math.max(startStr.length, endStr.length) };
};

export const expandInstanceList = (instance?: InstanceInput): string[] => {
  if (!instance) return [];
  if (Array.isArray(instance)) {
    return instance.filter((value): value is string => typeof value === 'string');
  }
  if (typeof instance === 'string') {
    const parsed = parseRange(instance);
    if (!parsed) return [instance];
    const { prefix, start, end, width } = parsed;
    const result: string[] = [];
    const rangeMin = Math.min(start, end);
    const rangeMax = Math.max(start, end);
    for (let value = rangeMin; value <= rangeMax; value += 1) {
      result.push(`${prefix}${String(value).padStart(width, '0')}`);
    }
    return result;
  }
  const entries = Object.entries(instance)
    .map(([key, value]) => ({ key, value }))
    .filter((entry): entry is { key: string; value: string } => typeof entry.value === 'string')
    .sort((a, b) => Number.parseInt(a.key, 10) - Number.parseInt(b.key, 10));
  return entries.map((entry) => entry.value);
};

export const expandInstanceMap = (instance?: InstanceInput): Record<number, string> => {
  if (!instance) return {};
  if (Array.isArray(instance)) {
    return instance.reduce<Record<number, string>>((acc, value, index) => {
      if (typeof value === 'string') {
        acc[index + 1] = value;
      }
      return acc;
    }, {});
  }
  if (typeof instance === 'string') {
    const parsed = parseRange(instance);
    if (!parsed) return { 1: instance };
    const { prefix, start, end, width } = parsed;
    const result: Record<number, string> = {};
    const rangeMin = Math.min(start, end);
    const rangeMax = Math.max(start, end);
    let slot = 1;
    for (let value = rangeMin; value <= rangeMax; value += 1) {
      result[slot] = `${prefix}${String(value).padStart(width, '0')}`;
      slot += 1;
    }
    return result;
  }
  return Object.entries(instance).reduce<Record<number, string>>((acc, [key, value]) => {
    if (typeof value === 'string') {
      const slot = Number.parseInt(key, 10);
      acc[Number.isNaN(slot) ? Object.keys(acc).length + 1 : slot] = value;
    }
    return acc;
  }, {});
};
