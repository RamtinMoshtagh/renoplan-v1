export function nok(n: number | string | null | undefined) {
  const num = Number(n ?? 0);
  return num.toLocaleString('no-NO', { minimumFractionDigits: 0 });
}
