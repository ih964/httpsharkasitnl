import { jsPDF } from "jspdf";
import {
  buildAssessmentQuoteDocument,
  type AssessmentQuoteDocument,
  type AssessmentQuoteDocumentInput,
} from "./assessmentQuoteDocument";

const currency = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const quantity = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 2,
});

const formatDate = (value: string | null): string => {
  if (!value) return "Niet ingevuld";
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(new Date(`${value}T00:00:00`));
};

const buildPdf = (model: AssessmentQuoteDocument): jsPDF => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - 18;
  const contentWidth = right - left;
  let y = 18;

  const addBrandHeader = () => {
    doc.setTextColor(24, 24, 27);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("HARKAS IT", left, y);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("info@harkasit.nl  |  085 124 9091  |  KvK 84795085", left, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("CONCEPTOFFERTE", right, y, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Niet definitief en niet automatisch verstuurd", right, y + 6, { align: "right" });

    doc.setDrawColor(210, 210, 215);
    doc.line(left, y + 11, right, y + 11);
    y += 20;
  };

  const addPage = () => {
    doc.addPage();
    y = 18;
    addBrandHeader();
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 22) addPage();
  };

  const addTableHeader = () => {
    ensureSpace(12);
    doc.setFillColor(244, 244, 245);
    doc.roundedRect(left, y, contentWidth, 9, 1, 1, "F");
    doc.setTextColor(63, 63, 70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Omschrijving", left + 3, y + 5.8);
    doc.text("Aantal", 113, y + 5.8, { align: "right" });
    doc.text("Prijs", 143, y + 5.8, { align: "right" });
    doc.text("Btw", 163, y + 5.8, { align: "right" });
    doc.text("Totaal", right - 3, y + 5.8, { align: "right" });
    y += 11;
  };

  addBrandHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(model.title, contentWidth) as string[];
  doc.text(titleLines, left, y);
  y += titleLines.length * 7 + 4;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(82, 82, 91);
  doc.text(`Datum: ${new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(new Date())}`, left, y);
  doc.text(`Geldig tot: ${formatDate(model.validUntil)}`, right, y, { align: "right" });
  y += 10;

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(left, y, contentWidth, 25, 2, 2, "F");
  doc.setTextColor(24, 24, 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Voor", left + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(model.companyName, left + 4, y + 12);
  doc.text(model.contactName, left + 4, y + 17);
  doc.text(model.email, left + 4, y + 22);
  y += 33;

  if (model.introduction) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(63, 63, 70);
    const introLines = doc.splitTextToSize(model.introduction, contentWidth) as string[];
    ensureSpace(introLines.length * 5 + 8);
    doc.text(introLines, left, y);
    y += introLines.length * 5 + 8;
  }

  addTableHeader();

  for (const line of model.lines) {
    const descriptionLines = doc.splitTextToSize(line.description, 86) as string[];
    const rowHeight = Math.max(10, descriptionLines.length * 4.5 + 4);
    if (y + rowHeight > pageHeight - 28) {
      addPage();
      addTableHeader();
    }

    doc.setDrawColor(228, 228, 231);
    doc.line(left, y + rowHeight, right, y + rowHeight);
    doc.setTextColor(39, 39, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(descriptionLines, left + 3, y + 5);
    doc.text(quantity.format(line.quantity), 113, y + 5, { align: "right" });
    doc.text(currency.format(line.unitPrice), 143, y + 5, { align: "right" });
    doc.text(`${line.vatPercentage}%`, 163, y + 5, { align: "right" });
    doc.text(currency.format(line.lineSubtotal), right - 3, y + 5, { align: "right" });
    y += rowHeight;
  }

  y += 7;
  ensureSpace(34);
  const totalsX = 125;
  doc.setFontSize(9);
  doc.setTextColor(63, 63, 70);
  doc.text("Subtotaal", totalsX, y);
  doc.text(currency.format(model.subtotal), right, y, { align: "right" });
  y += 6;
  doc.text("Btw", totalsX, y);
  doc.text(currency.format(model.vatTotal), right, y, { align: "right" });
  y += 5;
  doc.setDrawColor(161, 161, 170);
  doc.line(totalsX, y, right, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("Totaal incl. btw", totalsX, y);
  doc.text(currency.format(model.total), right, y, { align: "right" });
  y += 12;

  if (model.notes) {
    ensureSpace(22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Toelichting", left, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(82, 82, 91);
    const noteLines = doc.splitTextToSize(model.notes, contentWidth) as string[];
    doc.text(noteLines, left, y);
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(228, 228, 231);
    doc.line(left, pageHeight - 15, right, pageHeight - 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text("Conceptofferte — controleer scope, prijzen en voorwaarden vóór verzending.", left, pageHeight - 9);
    doc.text(`Pagina ${page} van ${pageCount}`, right, pageHeight - 9, { align: "right" });
  }

  return doc;
};

const preparePdf = (input: AssessmentQuoteDocumentInput) => {
  const result = buildAssessmentQuoteDocument(input);
  if (!result.valid || !result.document) {
    throw new Error(result.errors[0] ?? "De conceptofferte kan niet als PDF worden opgebouwd.");
  }

  return {
    doc: buildPdf(result.document),
    filename: result.document.filename,
  };
};

export const downloadAssessmentQuotePdf = (input: AssessmentQuoteDocumentInput): void => {
  const { doc, filename } = preparePdf(input);
  doc.save(filename);
};

export const previewAssessmentQuotePdf = (input: AssessmentQuoteDocumentInput): void => {
  const { doc } = preparePdf(input);
  const url = URL.createObjectURL(doc.output("blob"));
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

  if (!opened) throw new Error("De browser blokkeerde de PDF-preview. Sta pop-ups toe en probeer opnieuw.");
};
