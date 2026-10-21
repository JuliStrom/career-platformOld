/** Empty placeholder workplace rows are empty; a deliberate false/zero is an existing value. */
export function isEmptyProfileValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.every(isEmptyProfileValue);
  if (typeof value === 'object')
    return Object.values(value).every(isEmptyProfileValue);
  return false;
}

export function canPrefillProfileField(
  value: unknown,
  current: unknown,
  saved: unknown,
  dirty: boolean,
  defaultSelection = false
): boolean {
  return (
    !dirty &&
    !isEmptyProfileValue(value) &&
    isEmptyProfileValue(saved) &&
    (isEmptyProfileValue(current) || defaultSelection)
  );
}
