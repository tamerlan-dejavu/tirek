"use client";

import { useRouter } from "next/navigation";

import { ApprovalTag, StatusBadge } from "@/components/ui/Badge";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Inspection } from "@/lib/api/types";
import { formatDate, INSPECTION_STATUS } from "@/lib/status";

export function InspectionList({ buildingId, status }: { buildingId?: string; status?: string }) {
  const router = useRouter();
  const params = new URLSearchParams({ ordering: "-created_at" });
  if (buildingId) params.set("building", buildingId);
  if (status) params.set("status", status);
  const query = useApi<Paginated<Inspection>>(`inspections/?${params}`);

  return (
    <QueryState
      query={query}
      empty={(d) => d.results.length === 0}
      emptyTitle={status === "submitted" ? "Нет обследований, ожидающих проверки" : "Обследований пока нет"}
    >
      {(data) => (
        <Table
          caption="Обследования"
          rows={data.results}
          onRowClick={(r) => router.push(`/inspections/${r.id}`)}
          columns={[
            {
              key: "number",
              primary: true,
              header: "№",
              render: (r) => (
                <span className="font-mono text-[13px]">
                  {r.number}
                  {r.version > 1 && <span className="text-muted"> · v{r.version}</span>}
                </span>
              ),
            },
            ...(buildingId ? [] : [{ key: "addr", header: "Дом", render: (r: Inspection) => r.building_address }]),
            { key: "assignee", header: "Исполнитель", hideOnMobile: true, render: (r) => <span className="text-[13px]">{r.assignee_name}</span> },
            {
              key: "planned",
              header: "План",
              hideOnMobile: true,
              render: (r) => <span className="font-mono text-[13px] tabular text-muted">{formatDate(r.planned_date)}</span>,
            },
            { key: "status", header: "Статус", render: (r) => <StatusBadge {...INSPECTION_STATUS[r.status]} /> },
            {
              key: "pub",
              header: "Для ОСИ",
              hideOnMobile: true,
              render: (r) => (r.is_published ? <ApprovalTag approved>Опубликовано</ApprovalTag> : <span className="text-[13px] text-muted">—</span>),
            },
          ]}
        />
      )}
    </QueryState>
  );
}
