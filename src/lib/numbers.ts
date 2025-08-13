// src/lib/numbers.ts
/** Deterministic formatter: 1234567 -> "1 234 567" */
export function nok(value: number | null | undefined) {
  const n = Math.round(Number(value ?? 0));
  const sign = n < 0 ? '-' : '';
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${s}`;
}
