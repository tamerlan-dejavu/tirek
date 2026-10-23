"use client";

import clsx from "clsx";

import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { WorkOrder } from "@/lib/api/types";
import {
  daysFrom,
  formatDate,
  OPEN_WORK,
  PERIODICITY,
  PRIORITY,
  relativeDue,
  WORK_ORDER_STATUS,
  WORK_TYPE,
} from "@/lib/status";

export function useWorkOrders(buildingId?: string, extraParams?: Record<string, string>) {
  const params = new URLSearchParams({
    ordering: "planned_date",
    page_size: "200",
    ...extraParams,
  });
  if (buildingId) params.set("building", buildingId);
  return useApi<Paginated<WorkOrder>>(`work-orders/?${params}`);
}

export function DueDate({ wo }: { wo: WorkOrder }) {
  const date = wo.planned_date ?? wo.recommended_date;
  const d = daysFrom(wo.planned_date);
  const overdue = d !== null && d < 0 && OPEN_WORK.includes(wo.status);
  return (
    <div className="leading-tight">
      <div
        className={clsx(
          "font-mono text-[13px] tabular",
          overdue ? "text-critical-ink" : "text-ink",
        )}
      >
        {formatDate(date)}
      </div>
      <div className={clsx("text-[11px]", overdue ? "text-critical-ink" : "text-muted")}>
        {wo.planned_date
          ? OPEN_WORK.includes(wo.status)
            ? relativeDue(wo.planned_date)
            : "плановая дата"
          : wo.recommended_date
            ? "рекомендовано"
            : "срок не назначен"}
      </div>
    </div>
  );
}

/** Priority, deadline, basis, author and status visible without opening the record (ТЗ 5.10, 11.4). */
export function WorkOrderTable({
  rows,
  showBuilding,
  onRowClick,
}: {
  rows: WorkOrder[];
  showBuilding?: boolean;
  onRowClick?: (w: WorkOrder) => void;
}) {
  return (
    <Table
      caption="Мероприятия"
      rows={rows}
      onRowClick={onRowClick}
      columns={[
        {
          key: "n",
          header: "№",
          render: (r) => <span className="font-mono text-[13px] text-muted">{r.number}</span>,
        },
        {
          key: "title",
          header: "Мероприятие",
          render: (r) => (
            <div className="min-w-[200px]">
              <div className="text-ink">{r.title}</div>
              <div className="text-xs text-muted">
                {[
                  r.work_type && WORK_TYPE[r.work_type],
                  r.periodicity !== "once" && PERIODICITY[r.periodicity],
                  r.element_name,
                  showBuilding && r.building_address,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          ),
        },
        {
          key: "basis",
          header: "Основание",
          hideOnMobile: true,
          render: (r) =>
            r.defect_number ? (
              <span className="flex items-center gap-2">
                <span className="font-mono text-[13px] text-muted">{r.defect_number}</span>
                {r.risk_category && <RiskBadge category={r.risk_category} size="sm" />}
              </span>
            ) : r.kind === "preventive" ? (
              <span className="text-[13px] text-muted">Регламент ППР</span>
            ) : (
              <span className="text-muted">—</span>
            ),
        },
        {
          key: "prio",
          header: "Приоритет",
          hideOnMobile: true,
          render: (r) => (
            <span
              className={clsx(
                "text-[13px]",
                r.priority === "urgent" && "font-medium text-critical-ink",
                r.priority === "high" && "text-warning-ink",
              )}
            >
              {PRIORITY[r.priority].label}
            </span>
          ),
        },
        { key: "date", header: "Срок", render: (r) => <DueDate wo={r} /> },
        {
          key: "who",
          header: "Ответственный",
          hideOnMobile: true,
          render: (r) => (
            <span className="text-[13px]">
              {r.responsible_display ??
                (r.responsible_name || <span className="text-muted">не назначен</span>)}
            </span>
          ),
        },
        {
          key: "status",
          header: "Статус",
          render: (r) => <StatusBadge {...WORK_ORDER_STATUS[r.status]} />,
        },
        {
          key: "author",
          header: "Рекомендовал",
          hideOnMobile: true,
          render: (r) => <span className="text-[13px] text-muted">{r.author_name ?? "—"}</span>,
        },
      ]}
    />
  );
}

export function WorkOrderList({
  buildingId,
  extraParams,
}: {
  buildingId?: string;
  extraParams?: Record<string, string>;
}) {
  const query = useWorkOrders(buildingId, extraParams);
  return (
    <QueryState query={query} empty={(d) => d.results.length === 0} emptyTitle="Мероприятий нет">
      {(data) => <WorkOrderTable rows={data.results} showBuilding={!buildingId} />}
    </QueryState>
  );
}
