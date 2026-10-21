import clsx from "clsx";
import Link from "next/link";

import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import type { ActivityItem, WorkOrder } from "@/lib/api/types";
import { DEFECT_STATUS, daysFrom, formatDateTime, OPEN_WORK, PRIORITY, WORK_ORDER_STATUS } from "@/lib/status";

const MONTH = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const DAY = new Intl.DateTimeFormat("ru-RU", { day: "2-digit" });
const WEEKDAY = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });

/**
 * Maintenance timeline: work grouped by month on a vertical axis. Overdue items stay at the
 * top in their own group, so nothing late disappears into the past.
 */
export function MaintenanceTimeline({ items, limit }: { items: WorkOrder[]; limit?: number }) {
  const dated = items.filter((w) => w.planned_date ?? w.recommended_date);
  const overdue = dated.filter((w) => OPEN_WORK.includes(w.status) && (daysFrom(w.planned_date) ?? 1) < 0);
  const upcoming = dated.filter((w) => !overdue.includes(w));
  const undated = items.filter((w) => !w.planned_date && !w.recommended_date);

  const groups = new Map<string, WorkOrder[]>();
  for (const w of upcoming.slice(0, limit)) {
    const d = new Date(w.planned_date ?? w.recommended_date!);
    const key = MONTH.format(d);
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }

  return (
    <div className="space-y-5">
      {overdue.length > 0 && <Group title="Просрочено" tone="critical" items={overdue} />}
      {[...groups].map(([title, list]) => (
        <Group key={title} title={title} items={list} />
      ))}
      {undated.length > 0 && <Group title="Без срока — ожидают согласования" items={undated} />}
    </div>
  );
}

function Group({ title, items, tone }: { title: string; items: WorkOrder[]; tone?: "critical" }) {
  return (
    <section>
      <h3 className={clsx("label-tech mb-2 flex items-center gap-2", tone === "critical" && "!text-critical-ink")}>
        {title}
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono">{items.length}</span>
      </h3>
      <ol className="relative space-y-1 border-l border-line pl-4">
        {items.map((w) => {
          const date = w.planned_date ?? w.recommended_date;
          const late = tone === "critical";
          return (
            <li key={w.id} className="relative">
              <span
                aria-hidden
                className={clsx(
                  "absolute top-3.5 -left-[21px] size-2.5 rounded-full border-2 border-surface",
                  late ? "bg-critical" : w.priority === "urgent" ? "bg-warning" : "bg-steel-2",
                )}
              />
              <Link href={`/work-orders?focus=${w.id}`} className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-canvas">
                <div className="w-10 shrink-0 text-center leading-none">
                  {date ? (
                    <>
                      <div className={clsx("font-mono text-lg tabular", late ? "text-critical-ink" : "text-ink")}>
                        {DAY.format(new Date(date))}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted uppercase">{WEEKDAY.format(new Date(date))}</div>
                    </>
                  ) : (
                    <div className="font-mono text-faint">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-ink">{w.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <span className="truncate">{w.building_address}</span>
                    {w.priority !== "normal" && <span>· {PRIORITY[w.priority].label.toLowerCase()} приоритет</span>}
                  </div>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  <StatusBadge {...WORK_ORDER_STATUS[w.status]} />
                  {w.risk_category && <RiskBadge category={w.risk_category} size="sm" />}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const STATUS_LABEL: Record<string, string> = {
  ...Object.fromEntries(Object.entries(DEFECT_STATUS).map(([k, v]) => [k, v.label])),
  ...Object.fromEntries(Object.entries(WORK_ORDER_STATUS).map(([k, v]) => [k, v.label])),
};

/** Chronological operational history: who moved what, when. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3 text-sm">
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal" />
          <div className="min-w-0">
            <div className="text-ink">
              <Link href={a.kind === "defect" ? `/defects/${a.object_id}` : `/work-orders?focus=${a.object_id}`} className="font-mono text-[12.5px] text-teal-strong hover:underline">
                {a.object_number}
              </Link>{" "}
              → <span className="font-medium">{STATUS_LABEL[a.to_status] ?? a.to_status}</span>
            </div>
            <div className="truncate text-xs text-muted">{a.title}</div>
            <div className="mt-0.5 font-mono text-[11px] text-faint">
              {formatDateTime(a.at)} · {a.actor}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
