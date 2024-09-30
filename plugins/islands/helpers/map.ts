export function getOrCreate<TKey, TValue>(
  map: Map<TKey, TValue>,
  key: TKey,
  create: () => TValue,
) {
  if (map.has(key)) {
    return map.get(key)!;
  }
  const obj = create();
  map.set(key, obj);
  return obj;
}
