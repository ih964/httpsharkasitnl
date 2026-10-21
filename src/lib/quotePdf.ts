import { jsPDF } from 'jspdf';
import { euro, nlDate, type Quote } from './quotes.js';

/** Uses the immutable saved snapshots and server-calculated line amounts. */
export function buildQuotePdf(q: Quote, logo?: Uint8Array) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  // Stable bytes let a retried e-mail use exactly the same attachment.
  doc.setCreationDate(new Date(`${q.quote_date}T12:00:00Z`));
  doc.setFileId(q.id.replace(/-/g, '').toUpperCase());
  const left = 16, right = 194, bottom = 271;
  let y = 20;
  const text = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const line = (value: string, x = left, width = right - left, size = 10) => {
    doc.setFontSize(size);
    for (const row of doc.splitTextToSize(text(value), width) as string[]) {
      if (y + 5 > bottom) nextPage();
      doc.text(row, x, y); y += size * 0.43 + 1;
    }
  };
  function nextPage() {
    doc.addPage(); y = 19;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 45, 65);
    doc.text(`${q.quote_number} - vervolg`, left, y); y += 9;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(35, 35, 35);
  }
  const room = (height: number) => { if (y + height > bottom) nextPage(); };
  const tableHead = () => {
    room(13); doc.setFillColor(26, 46, 68); doc.rect(left, y - 5, right - left, 9, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text('Omschrijving', left + 2, y + 1); doc.text('Aantal', 121, y + 1, { align: 'right' });
    doc.text('Prijs excl.', 146, y + 1, { align: 'right' }); doc.text('Btw', 160, y + 1, { align: 'right' });
    doc.text('Bedrag excl.', 192, y + 1, { align: 'right' });
    y += 12; doc.setTextColor(35); doc.setFont('helvetica', 'normal');
  };
  doc.setProperties({ title: `Offerte ${q.quote_number}`, subject: q.title, author: q.company_snapshot.company_name || 'Harkas IT' });
  if (logo) {
    try {
      const props = doc.getImageProperties(logo);
      const w = Math.min(48, 16 * props.width / props.height), h = w * props.height / props.width;
      doc.addImage(logo, 'PNG', left, 13, w, h);
    } catch { /* Text branding remains available when the image cannot be decoded. */ }
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(26, 46, 68);
  doc.text('OFFERTE', right, 23, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(q.quote_number, right, 31, { align: 'right' });
  doc.setDrawColor(220); doc.line(left, 38, right, 38); y = 46;
  const c = q.company_snapshot, customer = q.customer_snapshot;
  doc.setTextColor(35); doc.setFont('helvetica', 'bold'); line(c.company_name || 'Harkas IT');
  doc.setFont('helvetica', 'normal');
  for (const v of [c.address, c.email || 'info@harkasit.nl', c.kvk ? `KvK ${c.kvk}` : '', c.vat_number ? `Btw ${c.vat_number}` : '']) if (v) line(v, left, 90, 9);
  y += 5; doc.setFont('helvetica', 'bold'); line('AAN'); doc.setFont('helvetica', 'normal');
  for (const v of [customer.company_name, customer.name, customer.address, [customer.postal_code, customer.city].filter(Boolean).join(' '), customer.email]) if (v) line(v, left, 155, 10);
  y += 4;
  line(`Offertedatum: ${nlDate(q.quote_date)}    Geldig tot: ${nlDate(q.valid_until)}`, left, 178, 9);
  if (q.reference) line(`Referentie: ${q.reference}`, left, 178, 9);
  y += 3; doc.setFont('helvetica', 'bold'); line(q.title, left, 178, 13); doc.setFont('helvetica', 'normal'); y += 4;
  if (q.discount_percentage > 0) line(`Korting: ${q.discount_percentage}% verwerkt in de regelbedragen. Prijzen per stuk zijn vóór korting.`, left, 178, 9);
  tableHead();
  for (const item of q.items) {
    doc.setFontSize(9);
    const rows = doc.splitTextToSize(text(item.description), 82) as string[];
    if (y + Math.min(rows.length * 4.5 + 5, 35) > bottom) { nextPage(); tableHead(); }
    let first = true;
    for (const row of rows) {
      if (y + 5 > bottom) { nextPage(); tableHead(); }
      doc.setFontSize(9); doc.text(row, left + 2, y);
      if (first) {
        doc.setFontSize(8);
        doc.text(String(item.quantity).replace('.', ','), 121, y, { align: 'right' });
        doc.text(euro(item.price), 146, y, { align: 'right' });
        doc.text(`${item.vat_percentage}%`, 160, y, { align: 'right' });
        doc.text(euro(Number(item.subtotal)), 192, y, { align: 'right' }); first = false;
      }
      y += 4.5;
    }
    y += 3; doc.setDrawColor(230); doc.line(left, y - 1, right, y - 1);
  }
  const rates = new Map<number, number>();
  q.items.forEach(i => rates.set(i.vat_percentage, (rates.get(i.vat_percentage) || 0) + Math.round(Number(i.vat_total) * 100)));
  room(28 + rates.size * 7); y += 6;
  const totalRow = (label: string, amount: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 10);
    doc.text(label, 105, y); doc.text(euro(amount), right, y, { align: 'right' }); y += 7;
  };
  totalRow('Subtotaal excl. btw', Number(q.subtotal));
  [...rates.entries()].sort((a, b) => b[0] - a[0]).forEach(([rate, cents]) => totalRow(`Btw ${rate}%`, cents / 100));
  totalRow('Totaal incl. btw', Number(q.total), true); y += 8;
  for (const [title, body] of [['Opmerkingen', q.notes], ['Voorwaarden', q.terms]]) {
    if (!body) continue;
    room(20); doc.setFont('helvetica', 'bold'); line(title); doc.setFont('helvetica', 'normal'); line(body, left, 178, 9); y += 6;
  }
  room(15); doc.setFont('helvetica', 'normal'); line('Dit document is een offerte, geen factuur. Vermeld het offertenummer bij uw akkoord.', left, 178, 9);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor(220); doc.line(left, 279, right, 279);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100);
    doc.text(`${q.quote_number} | ${c.company_name || 'Harkas IT'}`, left, 285);
    doc.text(`${page} / ${pages}`, right, 285, { align: 'right' });
  }
  return doc;
}
