"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import type { WorkOrderStatus } from "@/lib/api/types";
import { MONTHS_SHORT, PERIODICITY, WORK_ORDER_STATUS, WORK_TYPE } from "@/lib/status";

interface Cell {
  id: string;
  number: string;
  status: WorkOrderStatus;
  date: string;
}
interface Row {
  key: string;
  building_code: string;
  title: string;
  element: string;
  kind: "reactive" | "preventive";
  work_type: string;
  periodicity: string;
  priority: string;
  months: Record<string, Cell[]>;
}

const DONE: WorkOrderStatus[] = ["done", "verified", "closed"];

/** Annual ППР schedule (spec §10): works × 12 months; a mark per planned occurrence. */
export function AnnualPlan({
  year,
  onYear,
  building,
  onSelect,
}: {
  year: number;
  onYear: (y: number) => void;
  building?: string;
  onSelect: (id: string) => void;
}) {
  const params = new URLSearchParams({ year: String(year) });
  if (building) params.set("building", building);
  const query = useApi<{ year: number; rows: Row[] }>(`work-orders/annual-plan/?${params}`);
  const now = new Date();
  const thisMonth = now.getFullYear() === year ? now.getMonth() + 1 : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onYear(year - 1)}
            aria-label="Предыдущий год"
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="w-24 text-center font-mono text-sm">ППР {year}</span>
          <button
            onClick={() => onYear(year + 1)}
            aria-label="Следующий год"
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-accent" /> профилактика
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-warning" /> устранение дефекта
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-healthy" /> выполнено
          </span>
        </div>
      </div>
      <QueryState
        query={query}
        empty={(d) => d.rows.length === 0}
        emptyTitle="В этом году работ нет"
        emptyText="Сформируйте предварительный план по данным обследования и паспорта дома."
      >
        {(d) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <caption className="sr-only">Годовой график ППР {year}</caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="label-tech px-4 py-2.5 font-normal">
                    Работа
                  </th>
                  {MONTHS_SHORT.map((m, i) => (
                    <th
                      key={m}
                      scope="col"
                      className={clsx(
                        "label-tech w-12 px-1 py-2.5 text-center font-normal",
                        i + 1 === thisMonth && "!text-accent-strong",
                      )}
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.key} className="border-b border-line last:border-0">
                    <th scope="row" className="max-w-[320px] px-4 py-2.5 text-left font-normal">
                      <div className="truncate text-ink" title={r.title}>
                        {r.title}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {[
                          !building && r.building_code,
                          r.element,
                          r.work_type && WORK_TYPE[r.work_type],
                          r.periodicity !== "once" && PERIODICITY[r.periodicity],
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </th>
                    {MONTHS_SHORT.map((m, i) => {
                      const cells = r.months[String(i + 1)] ?? [];
                      return (
                        <td
                          key={m}
                          className={clsx(
                            "px-1 py-2.5 text-center",
                            i + 1 === thisMonth && "bg-accent-soft/40",
                          )}
                        >
                          <div className="flex justify-center gap-0.5">
                            {cells.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => onSelect(c.id)}
                                title={`${c.number} · ${c.date} · ${WORK_ORDER_STATUS[c.status].label}`}
                                aria-label={`${c.number}, ${WORK_ORDER_STATUS[c.status].label}`}
                                className={clsx(
                                  "size-4 rounded-sm transition-transform hover:scale-125",
                                  DONE.includes(c.status)
                                    ? "bg-healthy"
                                    : r.kind === "preventive"
                                      ? "bg-accent"
                                      : "bg-warning",
                                  c.status === "proposed" && "opacity-50",
                                )}
                              />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-[11px] text-faint">
              Бледная отметка — предложено, ждёт согласования ОСИ. Периодичность и состав работ —
              типовой регламент, требует утверждения.
            </p>
          </div>
        )}
      </QueryState>
    </div>
  );
}
