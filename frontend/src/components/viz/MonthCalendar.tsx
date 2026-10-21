"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { WorkOrder } from "@/lib/api/types";
import { OPEN_WORK } from "@/lib/status";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const TITLE = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Month grid with planned work. Overdue = open work with a past planned date. */
export function MonthCalendar({ items, onSelect }: { items: WorkOrder[]; onSelect?: (w: WorkOrder) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const todayIso = iso(new Date());
  const start = new Date(cursor);
  start.setDate(1 - ((cursor.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const byDay = new Map<string, WorkOrder[]>();
  for (const w of items) {
    const key = (w.planned_date ?? w.recommended_date)?.slice(0, 10);
    if (key) byDay.set(key, [...(byDay.get(key) ?? []), w]);
  }

  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">{TITLE.format(cursor)}</h3>
        <div className="flex gap-1">
          <button onClick={() => shift(-1)} className="grid size-8 place-items-center rounded-md border border-line hover:bg-mist" aria-label="Предыдущий месяц">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="h-8 rounded-md border border-line px-2.5 text-[13px] hover:bg-mist">
            Сегодня
          </button>
          <button onClick={() => shift(1)} className="grid size-8 place-items-center rounded-md border border-line hover:bg-mist" aria-label="Следующий месяц">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-md border border-line bg-line" style={{ gap: 1 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="label-tech bg-canvas px-2 py-1.5">{d}</div>
        ))}
        {days.map((d) => {
          const key = iso(d);
          const list = byDay.get(key) ?? [];
          const inMonth = d.getMonth() === cursor.getMonth();
          return (
            <div key={key} className={clsx("min-h-24 bg-surface p-1.5", !inMonth && "bg-canvas/70")}>
              <div
                className={clsx(
                  "mb-1 inline-grid size-6 place-items-center rounded-full font-mono text-[11px] tabular",
                  key === todayIso ? "bg-teal-strong text-white" : inMonth ? "text-ink" : "text-faint",
                )}
              >
                {d.getDate()}
              </div>
              <ul className="space-y-1">
                {list.slice(0, 3).map((w) => {
                  const overdue = OPEN_WORK.includes(w.status) && key < todayIso && !!w.planned_date;
                  const done = ["done", "verified", "closed"].includes(w.status);
                  return (
                    <li key={w.id}>
                      <button
                        onClick={() => onSelect?.(w)}
                        title={`${w.number} · ${w.title}`}
                        className={clsx(
                          "block w-full truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-[11px]",
                          overdue ? "border-critical bg-critical-soft text-critical-ink" : done ? "border-healthy bg-healthy-soft text-healthy-ink line-through decoration-healthy/40" : w.planned_date ? "border-steel bg-mist text-ink" : "border-dashed border-line-strong text-muted",
                        )}
                      >
                        {w.title}
                      </button>
                    </li>
                  );
                })}
                {list.length > 3 && <li className="px-1.5 text-[10px] text-muted">ещё {list.length - 3}</li>}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-1 bg-steel" /> плановая дата</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-1 border-l-2 border-dashed border-line-strong" /> рекомендованная дата</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-1 bg-critical" /> просрочено</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-1 bg-healthy" /> выполнено</span>
      </div>
    </div>
  );
}
