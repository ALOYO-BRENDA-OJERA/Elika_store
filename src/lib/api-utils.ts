export const coerceNumber = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export const parseStringArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      return value
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [] as string[];
};

export const parseJsonStringArrayPreserveEmpty = (value: unknown) => {
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v.trim() : ''));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => (typeof v === 'string' ? v.trim() : ''));
    } catch {
      return value.split(/\r?\n/g).map((s) => s.trim());
    }
  }
  return [] as string[];
};

export const jsonResponse = (data: unknown, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
