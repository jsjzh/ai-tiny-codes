import Table from "cli-table3";

export const TABLE_STYLE: Table.TableConstructorOptions["style"] = {
  head: ["bold", "cyan"],
  border: ["gray"],
};

/**
 * 注意：colAligns 为 undefined 时不能显式传，否则 cli-table3 会崩，所以按需注入。
 */
export function newTable(head?: string[], colAligns?: string[]): Table.Table {
  const options: Table.TableConstructorOptions = { style: TABLE_STYLE };
  if (head) options.head = head;
  if (colAligns) options.colAligns = colAligns as Table.HorizontalAlignment[];
  return new Table(options);
}

export function printSection(title: string, table: Table.Table): void {
  console.log("");
  console.log(`■ ${title}`);
  console.log(table.toString());
}
