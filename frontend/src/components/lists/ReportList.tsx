"use client";

import { StatusBadge } from "@/components/ui/Badge";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import { API_BASE, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import { formatDate } from "@/lib/status";

interface Report {
  id: string;
  inspection_number: string;
  version: number;
  status: "pending" | "generating" | "ready" | "failed";
  sha256: string;
  generated_at: string | null;
  published_at: string | null;
}

const STATUS = { pending: "В очереди", generating: "Формируется…", ready: "Готов", failed: "Ошибка" };

export function ReportList({ buildingId }: { buildingId?: string }) {
  const query = useApi<Paginated<Report>>(`reports/${buildingId ? `?building=${buildingId}` : ""}`);
  return (
    <QueryState query={query} empty={(d) => d.results.length === 0}>
      {(data) => (
        <Table
          rows={data.results}
          columns={[
            { key: "n", header: "Обследование", render: (r) => <span className="font-mono">{r.inspection_number}</span> },
            { key: "v", header: "Версия", render: (r) => <span className="font-mono">v{r.version}</span> },
            { key: "s", header: "Статус", render: (r) => <StatusBadge label={STATUS[r.status]} /> },
            { key: "d", header: "Сформирован", render: (r) => <span className="font-mono">{formatDate(r.generated_at)}</span> },
            { key: "p", header: "Для ОСИ", render: (r) => (r.published_at ? formatDate(r.published_at) : "—") },
            {
              key: "h",
              header: "Контрольная сумма",
              render: (r) => <span className="font-mono text-xs text-ink-muted" title={r.sha256}>{r.sha256.slice(0, 12)}</span>,
            },
            {
              key: "dl",
              header: "",
              render: (r) => r.status === "ready" ? <a className="text-accent" href={`${API_BASE}/v1/reports/${r.id}/download/`}>PDF</a> : null,
            },
          ]}
        />
      )}
    </QueryState>
  );
}
