/**
 * Legacy inventory data cleanup. Only trim a size/length at the END
 * of a model name when it exactly matches its explicit size column.
 * Model numbers in the middle ("Super 8", "Stance 102") are preserved.
 */
export function normalizeLegacyInventoryCode(code: string): string {
  const match = /^TRLEG26-([0-9]{4})$/.exec(code);
  return match ? match[1] : code;
}

export function normalizeEquipmentModelName(name: string, size: string): string {
  const suffix = /^(.*?)\s+(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?[wW]?)(?:\s*(?:см|cm))?\s*$/i.exec(name.trim());
  if (!suffix) return name;
  const model = suffix[1].trim();
  const number = suffix[2].replace(/\s+/g, "").replace(/,/g, ".").toLowerCase();
  const sizeValue = size.trim()
    .replace(/\s*(?:см|cm)\s*$/i, "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .toLowerCase();
  // Small numbers can be model identifiers (e.g., "Super 8"). Avoid
  // ambiguous trailing punctuation, ranges, or empty model names.
  const firstNumber = Number.parseInt(number, 10);
  if (!model || /[-/.,]$/.test(model) || firstNumber < 20 || !Number.isFinite(firstNumber)) {
    return name;
  }
  return number === sizeValue ? model : name;
}
