"use client";

import { Download } from "lucide-react";

import { ApprovalTag, StatusBadge } from "@/components/ui/Badge";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import { API_BASE, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Tone } from "@/lib/status";
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

const STATUS: Record<Report["status"], { label: string; tone: Tone }> = {
  pending: { label: "В очереди", tone: "neutral" },
  generating: { label: "Формируется…", tone: "info" },
  ready: { label: "Готов", tone: "healthy" },
  failed: { label: "Ошибка генерации", tone: "critical" },
};

export function ReportList({ buildingId, audience = "provider" }: { buildingId?: string; audience?: "provider" | "osi" }) {
  const query = useApi<Paginated<Report>>(`reports/${buildingId ? `?building=${buildingId}` : ""}`);
  return (
    <QueryState
      query={query}
      empty={(d) => d.results.length === 0}
      emptyTitle="Отчётов пока нет"
      emptyText={
        audience === "osi"
          ? "Отчёты появятся здесь после публикации инженерной организацией."
          : "PDF формируется из утверждённого обследования на его странице."
      }
    >
      {(data) => (
        <Table
          caption="Отчёты"
          rows={data.results}
          columns={[
            {
              key: "n",
              primary: true,
              header: "Обследование",
              render: (r) => (
                <span className="font-mono text-[13px]">
                  {r.inspection_number} <span className="text-muted">· v{r.version}</span>
                </span>
              ),
            },
            { key: "s", header: "Статус", render: (r) => <StatusBadge {...STATUS[r.status]} /> },
            { key: "d", header: "Сформирован", hideOnMobile: true, render: (r) => <span className="font-mono text-[13px] text-muted">{formatDate(r.generated_at)}</span> },
            {
              key: "p",
              header: "Для ОСИ",
              hideOnMobile: true,
              render: (r) => (r.published_at ? <ApprovalTag approved>Опубликован</ApprovalTag> : <span className="text-muted">—</span>),
            },
            {
              key: "h",
              header: "SHA-256",
              hideOnMobile: true,
              render: (r) => (
                <span className="font-mono text-[11px] text-faint" title={r.sha256}>
                  {r.sha256 ? `${r.sha256.slice(0, 10)}…` : "—"}
                </span>
              ),
            },
            {
              key: "dl",
              header: <span className="sr-only">Скачать</span>,
              align: "right",
              render: (r) =>
                r.status === "ready" ? (
                  <a className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-strong hover:underline" href={`${API_BASE}/v1/reports/${r.id}/download/`}>
                    <Download aria-hidden className="size-3.5" /> PDF
                  </a>
                ) : null,
            },
          ]}
        />
      )}
    </QueryState>
  );
}
