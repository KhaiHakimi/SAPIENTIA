/** Which rows of one table can no longer be used: `where` is SQL over the table's columns, with `params` as $1, $2... */
export interface ExpiryRule {
  table: string;
  where: string;
  params: unknown[];
}
