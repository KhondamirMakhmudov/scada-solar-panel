import type { ReactNode } from "react";

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row, index: number) => ReactNode;
  /** Числовые столбцы выравниваются вправо и набираются моноширинно */
  numeric?: boolean;
  width?: string;
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  /** Максимальная высота области прокрутки; шапка при этом залипает */
  maxHeight?: string;
  onRowClick?: (row: Row, index: number) => void;
  empty?: ReactNode;
}

/**
 * Таблица данных с залипающей шапкой.
 *
 * Прокрутка живёт внутри таблицы, а не на странице: архив и списки тегов
 * отдают тысячи строк, и при прокрутке страницей заголовки столбцов уходят
 * вверх — на середине выборки уже не понять, что за колонка перед тобой.
 *
 * Горизонтальная прокрутка тоже своя, чтобы широкая таблица не растягивала
 * страницу и не ломала раскладку соседних панелей.
 */
function DataTable<Row>({
  columns,
  rows,
  rowKey,
  maxHeight = "28rem",
  onRowClick,
  empty,
}: DataTableProps<Row>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full border-collapse text-[12px]">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={`bg-surface-1 border-b border-surface-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280] whitespace-nowrap ${
                  column.numeric ? "text-right" : "text-left"
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              className={`border-b border-surface-border/60 last:border-b-0 ${
                onRowClick ? "cursor-pointer hover:bg-surface-3/50" : "hover:bg-surface-3/30"
              } transition-colors`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-1.5 text-[#bfc7d4] ${
                    column.numeric ? "text-right font-mono tabular-nums" : "text-left"
                  }`}
                >
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
