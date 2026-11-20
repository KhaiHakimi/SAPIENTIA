import 'server-only';
import PDFDocument from 'pdfkit';
import type { ReportDocument, ReportFact, ReportTable, ReportValue } from '../interfaces/report-document.interface';

/**
 * The monthly report as an A4 PDF (pdfkit). Uses the built-in Helvetica, so no font file ships with the app; it covers the
 * Latin characters Malay and English need. Anything it cannot draw (a name in another script) becomes "?" rather than a
 * wrong glyph: a known limit, noted in the README.
 */

const MARGIN = 50;
const GAP = 6;
const CELL_PADDING = 4;
const COLOURS = { text: '#1f2933', muted: '#52606d', rule: '#cbd2d9', band: '#eef2f6', accent: '#334e68' };
const FONT = { regular: 'Helvetica', bold: 'Helvetica-Bold' };
const SIZE = { title: 16, heading: 12, body: 9.5, small: 8 };

type Pdf = PDFKit.PDFDocument;

/** Characters Helvetica's WinAnsi encoding can draw: Latin-1 and the usual typographic marks. */
const NOT_WIN_ANSI = /[^\n\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/gu;
const printable = (value: ReportValue): string => String(value).replace(NOT_WIN_ANSI, '?');

function collect(pdf: Pdf): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
    pdf.on('error', reject);
  });
}

const contentWidth = (pdf: Pdf) => pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
const bottom = (pdf: Pdf) => pdf.page.height - pdf.page.margins.bottom;

/** Starts a new page when the next `height` points would not fit. */
function ensureRoom(pdf: Pdf, height: number): boolean {
  if (pdf.y + height <= bottom(pdf)) return false;
  pdf.addPage();
  return true;
}

function drawParagraph(pdf: Pdf, text: string, options: { font?: string; size?: number; colour?: string } = {}) {
  pdf.font(options.font ?? FONT.regular).fontSize(options.size ?? SIZE.body).fillColor(options.colour ?? COLOURS.text);
  const value = printable(text);
  ensureRoom(pdf, pdf.heightOfString(value, { width: contentWidth(pdf) }));
  pdf.text(value, pdf.page.margins.left, pdf.y, { width: contentWidth(pdf) });
}

/** Label on the left, value on the right, a hairline under each pair. */
function drawFacts(pdf: Pdf, facts: readonly ReportFact[]) {
  const left = pdf.page.margins.left;
  const width = contentWidth(pdf);
  const valueWidth = width * 0.3;
  const labelWidth = width - valueWidth - GAP;
  pdf.font(FONT.regular).fontSize(SIZE.body);
  for (const fact of facts) {
    const label = printable(fact.label);
    const value = printable(fact.value);
    const height = Math.max(pdf.heightOfString(label, { width: labelWidth }), pdf.heightOfString(value, { width: valueWidth }))
      + CELL_PADDING * 2;
    ensureRoom(pdf, height);
    const top = pdf.y;
    pdf.fillColor(COLOURS.text).font(FONT.regular).text(label, left, top + CELL_PADDING, { width: labelWidth });
    pdf.font(FONT.bold).text(value, left + labelWidth + GAP, top + CELL_PADDING, { width: valueWidth, align: 'right' });
    pdf.moveTo(left, top + height).lineTo(left + width, top + height).lineWidth(0.5).strokeColor(COLOURS.rule).stroke();
    pdf.y = top + height;
  }
  pdf.font(FONT.regular);
}

interface ColumnLayout {
  widths: number[];
  /** Columns holding only numbers: narrow, and right-aligned, header included. */
  numeric: boolean[];
}

/** Number columns are as narrow as their header allows; the text columns share the rest. */
function columnLayout(pdf: Pdf, table: ReportTable): ColumnLayout {
  const width = contentWidth(pdf);
  pdf.font(FONT.bold).fontSize(SIZE.body);
  const { numeric } = table;
  const narrow = table.columns.map((column, index) =>
    numeric[index] ? Math.max(60, Math.min(width / 4, pdf.widthOfString(printable(column)) + CELL_PADDING * 2 + 2)) : 0);
  const textColumns = numeric.filter((isNumber) => !isNumber).length;
  const rest = width - narrow.reduce((total, value) => total + value, 0);
  return { widths: narrow.map((value, index) => (numeric[index] ? value : rest / Math.max(1, textColumns))), numeric };
}

function rowHeight(pdf: Pdf, cells: readonly ReportValue[], layout: ColumnLayout, header: boolean): number {
  pdf.font(header ? FONT.bold : FONT.regular).fontSize(SIZE.body);
  const heights = cells.map((cell, index) => pdf.heightOfString(printable(cell), { width: layout.widths[index] - CELL_PADDING * 2 }));
  return Math.max(...heights) + CELL_PADDING * 2;
}

function drawRow(pdf: Pdf, cells: readonly ReportValue[], layout: ColumnLayout, header: boolean): void {
  const left = pdf.page.margins.left;
  const height = rowHeight(pdf, cells, layout, header);
  const top = pdf.y;
  const total = layout.widths.reduce((sum, value) => sum + value, 0);
  if (header) pdf.rect(left, top, total, height).fill(COLOURS.band);
  let x = left;
  cells.forEach((cell, index) => {
    pdf.fillColor(COLOURS.text).text(printable(cell), x + CELL_PADDING, top + CELL_PADDING, {
      width: layout.widths[index] - CELL_PADDING * 2,
      align: layout.numeric[index] ? 'right' : 'left',
    });
    x += layout.widths[index];
  });
  pdf.moveTo(left, top + height).lineTo(left + total, top + height).lineWidth(0.5).strokeColor(COLOURS.rule).stroke();
  pdf.y = top + height;
}

/** A table whose header row is drawn again at the top of each page it runs onto. */
function drawTable(pdf: Pdf, table: ReportTable) {
  if (table.rows.length === 0) {
    drawParagraph(pdf, table.empty, { colour: COLOURS.muted });
    return;
  }
  const layout = columnLayout(pdf, table);
  ensureRoom(pdf, rowHeight(pdf, table.columns, layout, true) + rowHeight(pdf, table.rows[0], layout, false));
  drawRow(pdf, table.columns, layout, true);
  for (const row of table.rows) {
    if (ensureRoom(pdf, rowHeight(pdf, row, layout, false))) drawRow(pdf, table.columns, layout, true);
    drawRow(pdf, row, layout, false);
  }
}

/** "1 / 3" at the foot of every page, drawn once the page count is known. */
function numberPages(pdf: Pdf) {
  const range = pdf.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    pdf.switchToPage(index);
    const marginBottom = pdf.page.margins.bottom;
    // Writing inside the bottom margin would otherwise start a new page.
    pdf.page.margins.bottom = 0;
    pdf.font(FONT.regular).fontSize(SIZE.small).fillColor(COLOURS.muted)
      .text(`${index + 1} / ${range.count}`, pdf.page.margins.left, pdf.page.height - marginBottom / 2, { width: contentWidth(pdf), align: 'center' });
    pdf.page.margins.bottom = marginBottom;
  }
}

export async function renderReportPdf(document: ReportDocument): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: { Title: printable(document.title), Producer: 'Sapientia', Creator: 'Sapientia' },
  });
  const done = collect(pdf);

  drawParagraph(pdf, document.title, { font: FONT.bold, size: SIZE.title, colour: COLOURS.accent });
  pdf.moveDown(0.4);
  for (const line of document.heading) drawParagraph(pdf, line, { size: SIZE.small, colour: COLOURS.muted });

  for (const section of document.sections) {
    pdf.moveDown(1);
    // Keep a heading with at least a few lines of what follows it.
    ensureRoom(pdf, 60);
    drawParagraph(pdf, section.title, { font: FONT.bold, size: SIZE.heading, colour: COLOURS.accent });
    pdf.moveDown(0.2);
    for (const note of section.notes) drawParagraph(pdf, note, { size: SIZE.small, colour: COLOURS.muted });
    if (section.notes.length > 0) pdf.moveDown(0.3);
    if (section.facts.length > 0) drawFacts(pdf, section.facts);
    if (section.table) {
      if (section.facts.length > 0) pdf.moveDown(0.5);
      drawTable(pdf, section.table);
    }
  }

  numberPages(pdf);
  pdf.end();
  return done;
}
