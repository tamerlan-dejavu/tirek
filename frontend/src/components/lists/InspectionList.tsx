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
  const params = new URLSearchParams();
  if (buildingId) params.set("building", buildingId);
  if (status) params.set("status", status);
  const query = useApi<Paginated<Inspection>>(`inspections/?${params}`);

  return (
    <QueryState query={query} empty={(d) => d.results.length === 0}>
      {(data) => (
        <Table
          rows={data.results}
          onRowClick={(r) => router.push(`/inspections/${r.id}`)}
          columns={[
            { key: "number", header: "№", render: (r) => <span className="font-mono">{r.number}</span> },
            ...(buildingId ? [] : [{ key: "addr", header: "Дом", render: (r: Inspection) => r.building_address }]),
            { key: "assignee", header: "Исполнитель", render: (r) => r.assignee_name },
            { key: "planned", header: "План", render: (r) => <span className="font-mono tabular">{formatDate(r.planned_date)}</span> },
            { key: "status", header: "Статус", render: (r) => <StatusBadge label={INSPECTION_STATUS[r.status]} /> },
            {
              key: "pub",
              header: "Для ОСИ",
              render: (r) => (r.is_published ? <ApprovalTag approved /> : <span className="text-ink-muted">не опубликовано</span>),
            },
          ]}
        />
      )}
    </QueryState>
  );
}
