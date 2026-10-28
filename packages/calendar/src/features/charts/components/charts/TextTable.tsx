import type { TextChartData } from "../../lib/chartData";

type TextTableProps = {
  data: TextChartData;
  title: string;
};

export function TextTable({ data, title }: TextTableProps) {
  if (data.total === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center border border-dashed border-rule bg-paper text-xs text-muted-foreground">
        区间内暂无数据
      </div>
    );
  }

  return (
    <div
      className="min-h-0 flex-1 overflow-auto border border-rule bg-sheet"
      role="region"
      aria-label={`${title} 数据表`}
    >
      <table className="w-full table-fixed border-collapse text-xs">
        <thead className="sticky top-0 bg-paper">
          <tr className="border-b border-rule text-left text-muted-foreground">
            <th className="w-40 px-3 py-2 font-medium">日期</th>
            <th className="px-3 py-2 font-medium">值</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr
              key={row.date}
              className="border-b border-rule/60 last:border-b-0"
            >
              <td className="whitespace-nowrap px-3 py-2 font-mono">
                {row.date}
              </td>
              <td className="px-3 py-2">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
