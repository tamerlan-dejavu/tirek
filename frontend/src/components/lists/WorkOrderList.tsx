"use client";

import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { WorkOrder } from "@/lib/api/types";
import { formatDate, WORK_ORDER_STATUS } from "@/lib/status";

const PRIORITY = { urgent: "Срочно", high: "Высокий", normal: "Обычный", low: "Низкий" } as const;

/** Priority, deadline, author and basis visible without opening the item (ТЗ 5.10, 11.4). */
export function WorkOrderList({ buildingId, extraParams }: { buildingId?: string; extraParams?: Record<string, string> }) {
  const params = new URLSearchParams(extraParams);
  if (buildingId) params.set("building", buildingId);
  const query = useApi<Paginated<WorkOrder>>(`work-orders/?${params}`);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <QueryState query={query} empty={(d) => d.results.length === 0}>
      {(data) => (
        <Table
          rows={data.results}
          columns={[
            { key: "n", header: "№", render: (r) => <span className="font-mono">{r.number}</span> },
            { key: "title", header: "Мероприятие", render: (r) => r.title },
            { key: "basis", header: "Основание", render: (r) => r.defect_number ? (
              <span className="flex items-center gap-2"><span className="font-mono">{r.defect_number}</span>{r.risk_category && <RiskBadge category={r.risk_category} />}</span>
            ) : "—" },
            { key: "prio", header: "Приоритет", render: (r) => PRIORITY[r.priority] },
            {
              key: "date",
              header: "Срок",
              render: (r) => (
                <span className={`font-mono tabular ${r.planned_date && r.planned_date < today ? "text-risk-r1" : ""}`}>
                  {formatDate(r.planned_date ?? r.recommended_date)}
                  {r.planned_date && r.planned_date < today && " · просрочено"}
                </span>
              ),
            },
            { key: "author", header: "Автор", render: (r) => <span className="text-ink-muted">{r.author_name ?? "—"}</span> },
            { key: "status", header: "Статус", render: (r) => <StatusBadge label={WORK_ORDER_STATUS[r.status]} /> },
          ]}
        />
      )}
    </QueryState>
  );
}
