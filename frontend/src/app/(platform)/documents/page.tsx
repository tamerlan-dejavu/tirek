"use client";

import { Download, FileText } from "lucide-react";

import { ApprovalTag } from "@/components/ui/Badge";
import { Card, PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import { API_BASE, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import { formatDate } from "@/lib/status";

interface Doc {
  id: string;
  building: string;
  file: string;
  kind: string;
  title: string;
  document_date: string | null;
  is_published: boolean;
}

const KIND: Record<string, string> = {
  tech_passport: "Технический паспорт",
  project: "Проектная документация",
  act: "Акт",
  plan: "План / разрез",
  other: "Прочее",
};

export default function DocumentsPage() {
  const query = useApi<Paginated<Doc>>("building-documents/");
  return (
    <>
      <PageHeader
        code="08 · Документы"
        title="Документы"
        subtitle="Техническая документация объектов. Файлы хранятся приватно и выдаются только после проверки прав."
      />
      <Card flush>
        <QueryState
          query={query}
          empty={(d) => d.results.length === 0}
          emptyTitle="Документы не загружены"
          emptyText="Технические паспорта, акты и планы загружаются в карточке здания."
        >
          {(d) => (
            <Table
              caption="Документы"
              rows={d.results}
              columns={[
                {
                  key: "t",
                  header: "Документ",
                  render: (r) => (
                    <span className="flex items-center gap-2">
                      <FileText aria-hidden className="size-4 text-faint" />
                      {r.title}
                    </span>
                  ),
                },
                { key: "k", header: "Тип", render: (r) => <span className="text-[13px] text-muted">{KIND[r.kind] ?? r.kind}</span> },
                { key: "d", header: "Дата", hideOnMobile: true, render: (r) => <span className="font-mono text-[13px]">{formatDate(r.document_date)}</span> },
                { key: "p", header: "Доступ ОСИ", hideOnMobile: true, render: (r) => (r.is_published ? <ApprovalTag approved>Открыт</ApprovalTag> : <span className="text-muted">—</span>) },
                {
                  key: "dl",
                  header: <span className="sr-only">Скачать</span>,
                  align: "right",
                  render: (r) => (
                    <a className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-strong hover:underline" href={`${API_BASE}/v1/files/${r.file}/download/`}>
                      <Download aria-hidden className="size-3.5" /> Скачать
                    </a>
                  ),
                },
              ]}
            />
          )}
        </QueryState>
      </Card>
    </>
  );
}
