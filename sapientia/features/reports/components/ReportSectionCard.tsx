import { TableScroll } from '@/shared/components/TableScroll';
import calm from '@/shared/calm/Calm.module.css';
import type { ReportSection } from '../interfaces/report-document.interface';
import styles from '../styles/Reports.module.css';

/** One section of the monthly report: its notes, its figures as label and value, and its table. */
export function ReportSectionCard({ section }: { section: ReportSection }) {
  const titleId = `report-${section.id}-title`;
  const numeric = section.table?.numeric ?? [];

  return (
    <section className={calm.card} aria-labelledby={titleId}>
      <h2 id={titleId}>{section.title}</h2>
      {section.notes.length > 0 && (
        <div className={styles.notes}>
          {section.notes.map((note) => <p key={note}>{note}</p>)}
        </div>
      )}
      {section.facts.length > 0 && (
        <TableScroll labelledBy={titleId}>
          <table className={`${calm.table} ${styles.facts}`}>
            <tbody>
              {section.facts.map((fact) => (
                <tr key={fact.label}>
                  <th scope="row">{fact.label}</th>
                  <td className={styles.number}>{fact.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
      {section.table && (section.table.rows.length === 0 ? (
        <p className={calm.muted}>{section.table.empty}</p>
      ) : (
        <TableScroll labelledBy={titleId}>
          <table className={calm.table} aria-labelledby={titleId}>
            <thead>
              <tr>
                {section.table.columns.map((column, index) => (
                  <th key={column} scope="col" className={numeric[index] ? styles.number : undefined}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, rowIndex) => (
                // Rows have no id of their own (an urgent-send list may repeat a date and reason), so the position keys them.
                <tr key={rowIndex}>
                  {row.map((value, index) => (
                    <td key={section.table?.columns[index]} className={numeric[index] ? styles.number : undefined}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      ))}
    </section>
  );
}
