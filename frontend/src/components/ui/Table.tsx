import clsx from "clsx";
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide on narrow screens; the primary columns stay. */
  hideOnMobile?: boolean;
  align?: "left" | "right";
}

/**
 * Dense, readable data table. Rows are keyboard-activatable when clickable.
 * Wrap in a Card with `flush` for the drawing-sheet frame.
 */
export function Table<T extends { id: string }>({
  rows,
  columns,
  onRowClick,
  caption,
  rowClassName,
}: {
  rows: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  caption?: string;
  rowClassName?: (row: T) => string | undefined;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={clsx(
                  "label-tech px-3 py-2.5 font-normal whitespace-nowrap first:pl-5 last:pr-5 md:first:pl-6 md:last:pr-6",
                  c.align === "right" ? "text-right" : "text-left",
                  c.hideOnMobile && "hidden md:table-cell",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row) : undefined}
              className={clsx(
                "border-b border-line last:border-0",
                onRowClick && "cursor-pointer transition-colors duration-[var(--duration-fast)] hover:bg-mist/60 focus-visible:bg-mist",
                rowClassName?.(row),
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx(
                    "px-3 py-3 align-middle first:pl-5 last:pr-5 md:first:pl-6 md:last:pr-6 [&_.font-mono]:whitespace-nowrap",
                    c.align === "right" && "text-right",
                    c.hideOnMobile && "hidden md:table-cell",
                    c.className,
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
