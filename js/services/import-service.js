/** Safe import pipeline for system inventory files. */
import { normalizeName } from '../utils/formatting.js';

const asNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeSystemItems(items) {
  if (!Array.isArray(items)) throw new TypeError('Items must be an array');
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const name = String(item?.name ?? '').trim();
    if (!name) continue;
    const normalizedName = normalizeName(name);
    const barcode = String(item?.barcode ?? '').trim();
    const key = barcode ? `barcode:${barcode}` : `name:${normalizedName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      name,
      normalized_name: normalizedName,
      system_qty: asNumber(item?.systemQty),
      unit_price: asNumber(item?.unitPrice),
      barcode,
      category: String(item?.category ?? '').trim()
    });
  }
  return result;
}

export function chunk(items, size = 500) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
