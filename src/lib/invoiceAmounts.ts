type Line = { quantity: number; price: number; vat_percentage: number; subtotal?: number | null };

// Decimal arithmetic matches PostgreSQL NUMERIC, including half-cent rounding.
function decimal(value: number): [bigint, bigint] {
  if (!Number.isFinite(value)) throw new Error('Ongeldig bedrag');
  const [mantissa, exponentText = '0'] = String(value).toLowerCase().split('e');
  const negative = mantissa.startsWith('-');
  const [whole, fraction = ''] = mantissa.replace(/^-/, '').split('.');
  let numerator = BigInt(whole + fraction) * (negative ? -1n : 1n);
  const places = fraction.length - Number(exponentText);
  if (places < 0) numerator *= 10n ** BigInt(-places);
  return [numerator, 10n ** BigInt(Math.max(0, places))];
}
const roundDivide = (n: bigint, d: bigint) => n < 0 ? -((-n + d / 2n) / d) : (n + d / 2n) / d;
function cents(value: number) { const [n, d] = decimal(value); return roundDivide(n * 100n, d); }

export function invoiceLineAmounts(item: Line) {
  try {
    const [q, qs] = decimal(item.quantity), [p, ps] = decimal(item.price), [v, vs] = decimal(item.vat_percentage);
    const net = item.subtotal != null && Number.isFinite(Number(item.subtotal)) ? cents(Number(item.subtotal)) : roundDivide(q * p * 100n, qs * ps);
    const vat = roundDivide(net * v, vs * 100n);
    return { subtotal: Number(net) / 100, vat_total: Number(vat) / 100, total: Number(net + vat) / 100 };
  } catch { return { subtotal: NaN, vat_total: NaN, total: NaN }; }
}
export function invoiceTotals(items: Line[]) {
  try {
    let net = 0n, vat = 0n;
    for (const item of items) { const line = invoiceLineAmounts(item); net += cents(line.subtotal); vat += cents(line.vat_total); }
    return { subtotal: Number(net) / 100, vat_total: Number(vat) / 100, total: Number(net + vat) / 100 };
  } catch { return { subtotal: NaN, vat_total: NaN, total: NaN }; }
}
