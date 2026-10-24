import clsx from "clsx";
import type { KeyboardEvent, ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide on narrow screens; the primary columns stay. */
  hideOnMobile?: boolean;
  /** Main field: on phones it heads the row card, without a label. */
  primary?: boolean;
  align?: "left" | "right";
}

/**
 * Dense, readable data table. Rows are keyboard-activatable when clickable.
 * Below md every row becomes a card (primary field on top, the rest as labelled values),
 * so nothing is cut off on a phone. Wrap in a Card with `flush` for the drawing-sheet frame.
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
  const primary = columns.find((c) => c.primary);
  const details = columns.filter((c) => !c.primary && !c.hideOnMobile);
  const activate = (row: T) =>
    onRowClick
      ? { tabIndex: 0, onClick: () => onRowClick(row), onKeyDown: (e: KeyboardEvent) => e.key === "Enter" && onRowClick(row) }
      : {};

  return (
    <>
      <ul aria-label={caption} className="divide-y divide-line md:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            {...activate(row)}
            className={clsx("px-4 py-3.5 text-sm", onRowClick && "cursor-pointer active:bg-mist/60 focus-visible:bg-mist", rowClassName?.(row))}
          >
            {primary && <div className="min-w-0 text-ink">{primary.render(row)}</div>}
            {details.length > 0 && (
              <dl className={clsx("flex flex-wrap items-center gap-x-4 gap-y-2", primary && "mt-2")}>
                {details.map((c) => (
                  <div key={c.key} className="flex min-w-0 items-center gap-1.5">
                    {c.header ? <dt className="label-tech shrink-0">{c.header}</dt> : null}
                    <dd className="min-w-0">{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
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
    </>
  );
}
