export function normalizeDecimalInput(value: string): string | undefined {
  const s = value.trim().replace(/\s+/g, '');
  if (s === '') return undefined;
  if (!/^\d[\d.,]*$/.test(s)) return undefined;

  let t = s;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  const lastSep = Math.max(lastComma, lastDot);
  if (lastSep !== -1) {
    const sep = t.charAt(lastSep);
    const decimals = t.length - lastSep - 1;
    const isSingleGrouping = decimals === 3 && t.indexOf(sep) === lastSep;
    if (isSingleGrouping) {
      t = t.replace(/[.,]/g, '');
    } else {
      const intPart = t.slice(0, lastSep).replace(/[.,]/g, '');
      const fracPart = t.slice(lastSep + 1).replace(/[.,]/g, '');
      t = `${intPart}.${fracPart}`;
    }
  }

  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  const canonical = String(n);
  return /^\d+(\.\d{1,4})?$/.test(canonical) ? canonical : undefined;
}

export function isValidDecimalInput(value: string): boolean {
  const s = value.trim();
  return s === '' || normalizeDecimalInput(s) !== undefined;
}
