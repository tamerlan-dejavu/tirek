"use client";

import { use } from "react";

import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import { API_BASE, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import { formatDate } from "@/lib/status";

interface Doc {
  id: string;
  file: string;
  kind: string;
  title: string;
  document_date: string | null;
  is_published: boolean;
}

export default function BuildingDocuments({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useApi<Paginated<Doc>>(`building-documents/?building=${id}`);
  return (
    <QueryState query={query} empty={(d) => d.results.length === 0}>
      {(data) => (
        <Table
          rows={data.results}
          columns={[
            { key: "title", header: "Документ", render: (d) => d.title },
            { key: "date", header: "Дата", render: (d) => <span className="font-mono">{formatDate(d.document_date)}</span> },
            { key: "pub", header: "Доступ ОСИ", render: (d) => (d.is_published ? "да" : "нет") },
            {
              key: "dl",
              header: "",
              // Signed, short-lived URL issued only after a server-side access check (ТЗ 5.9)
              render: (d) => <a className="text-accent-strong" href={`${API_BASE}/v1/files/${d.file}/download/`}>Скачать</a>,
            },
          ]}
        />
      )}
    </QueryState>
  );
}
