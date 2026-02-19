export const formatOrderNumber = (id: number) => `ORD-${String(id).padStart(6, '0')}`;

export const parseOrderNumber = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  const match = /^ORD-(\d+)$/.exec(trimmed);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
};
