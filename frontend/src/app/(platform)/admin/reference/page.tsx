"use client";

import { StatusBadge } from "@/components/ui/Badge";
import { Card, PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import { ELEMENT_GROUP, formatDate } from "@/lib/status";

interface ElementType {
  code: string;
  group: string;
  name: string;
  sort_order: number;
}
interface Template {
  id: string;
  name: string;
  inspection_type: string;
  is_active: boolean;
  latest_published_version: string | null;
  created_at: string;
}

/** Administrator reference data: element classifier (ТЗ 5.4) and checklist templates (ТЗ 5.5). */
export default function ReferencePage() {
  const types = useApi<ElementType[]>("element-types/");
  const templates = useApi<Paginated<Template>>("checklist-templates/");

  return (
    <>
      <PageHeader
        code="Управление · справочники"
        title="Справочники"
        subtitle="Классификатор элементов здания и шаблоны чек-листов. Опубликованная версия чек-листа не меняется — правки выпускаются новой версией."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card index="A" title="Классификатор элементов здания" flush>
          <QueryState query={types} empty={(d) => d.length === 0}>
            {(rows) => (
              <Table
                caption="Типы элементов"
                rows={rows.map((r) => ({ ...r, id: r.code }))}
                columns={[
                  { key: "code", header: "Код", render: (r) => <span className="font-mono text-[13px] text-muted">{r.code}</span> },
                  { key: "name", header: "Элемент", render: (r) => r.name },
                  { key: "group", header: "Группа", render: (r) => <span className="text-[13px] text-muted">{ELEMENT_GROUP[r.group] ?? r.group}</span> },
                ]}
              />
            )}
          </QueryState>
        </Card>
        <Card index="B" title="Шаблоны чек-листов" flush>
          <QueryState query={templates} empty={(d) => d.results.length === 0} emptyTitle="Шаблонов нет">
            {(d) => (
              <Table
                caption="Шаблоны чек-листов"
                rows={d.results}
                columns={[
                  { key: "n", header: "Шаблон", render: (t) => t.name },
                  {
                    key: "v",
                    header: "Опубликованная версия",
                    render: (t) => (t.latest_published_version ? <StatusBadge label="Опубликована" tone="healthy" /> : <StatusBadge label="Только черновик" tone="warning" />),
                  },
                  { key: "c", header: "Создан", hideOnMobile: true, render: (t) => <span className="font-mono text-[13px] text-muted">{formatDate(t.created_at)}</span> },
                ]}
              />
            )}
          </QueryState>
        </Card>
      </div>
    </>
  );
}
