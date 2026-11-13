import 'server-only';
import writeXlsxFile, { type Cell, type Row, type Sheet } from 'write-excel-file/node';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { REPORTS_MESSAGES } from '../i18n/reports.messages';
import type { ReportDocument, ReportSection, ReportTable, ReportValue } from '../interfaces/report-document.interface';

/**
 * The monthly report as an Excel workbook (write-excel-file). The summary sheet has every section's figures; the three
 * lists that can run long (subjects, urgent sends, shared hours) each get a sheet of their own so they can be sorted and
 * filtered. Counts stay numbers so Excel can add them up.
 *
 * Text is always written with type String, never derived, so a reason or a name starting with "=" can never become a formula
 * (OWASP: spreadsheet formula injection).
 */

type SheetId = 'subjects' | 'overrides' | 'sharedHours';
const OWN_SHEET: ReadonlySet<ReportSection['id']> = new Set<SheetId>(['subjects', 'overrides', 'sharedHours']);

const cell = (value: ReportValue, style: { bold?: boolean; italic?: boolean; wrap?: boolean } = {}): Cell => ({
  value,
  type: typeof value === 'number' ? Number : String,
  ...(style.bold ? { fontWeight: 'bold' as const } : {}),
  ...(style.italic ? { fontStyle: 'italic' as const } : {}),
  ...(style.wrap ? { wrap: true } : {}),
});

const tableRows = (table: ReportTable): Row[] => [
  table.columns.map((column) => cell(column, { bold: true })),
  ...(table.rows.length > 0 ? table.rows.map((row) => row.map((value) => cell(value, { wrap: typeof value === 'string' }))) : [[cell(table.empty, { italic: true })]]),
];

const notesRows = (notes: readonly string[]): Row[] => notes.map((note) => [cell(note, { italic: true })]);

function summarySheet(document: ReportDocument, name: string): Sheet<Buffer> {
  const data: Row[] = [[cell(document.title, { bold: true })], ...document.heading.map((line) => [cell(line)])];
  for (const section of document.sections) {
    data.push([], [cell(section.title, { bold: true })]);
    if (!OWN_SHEET.has(section.id)) data.push(...notesRows(section.notes));
    data.push(...section.facts.map((fact) => [cell(fact.label), cell(fact.value)]));
    if (section.table && !OWN_SHEET.has(section.id)) data.push(...tableRows(section.table));
  }
  return { sheet: name, data, columns: [{ width: 58 }, { width: 22 }] };
}

function listSheet(section: ReportSection, name: string): Sheet<Buffer> {
  const table = section.table as ReportTable;
  const data: Row[] = [[cell(section.title, { bold: true })], ...notesRows(section.notes), [], ...tableRows(table)];
  return { sheet: name, data, columns: table.numeric.map((isNumber) => ({ width: isNumber ? 16 : 40 })) };
}

export async function renderReportXlsx(document: ReportDocument, lang: Lang): Promise<Uint8Array<ArrayBuffer>> {
  const names = REPORTS_MESSAGES[lang].sheets;
  const sheets: Sheet<Buffer>[] = [summarySheet(document, names.summary)];
  for (const section of document.sections) {
    if (OWN_SHEET.has(section.id) && section.table) sheets.push(listSheet(section, names[section.id as SheetId]));
  }
  return new Uint8Array(await writeXlsxFile(sheets).toBuffer());
}
