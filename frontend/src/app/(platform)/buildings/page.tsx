"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building } from "@/lib/api/types";
import { orUnknown } from "@/lib/status";

export default function BuildingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const query = useApi<Paginated<Building>>(`buildings/?search=${encodeURIComponent(search)}`);

  return (
    <>
      <PageHeader title="Дома" subtitle="Реестр объектов вашей организации" />
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Адрес или идентификатор"
        aria-label="Поиск домов"
        className="mb-3 min-h-9 w-full max-w-md rounded-sm border border-line bg-surface px-3 text-sm"
      />
      <QueryState query={query} empty={(d) => d.results.length === 0}>
        {(data) => (
          <Table
            rows={data.results}
            onRowClick={(b) => router.push(`/buildings/${b.id}`)}
            columns={[
              { key: "code", header: "ID", render: (b) => <span className="font-mono">{b.internal_code}</span> },
              { key: "addr", header: "Адрес", render: (b) => b.address },
              { key: "year", header: "Год", render: (b) => <span className="font-mono tabular">{orUnknown(b.year_built)}</span> },
              { key: "floors", header: "Этажей", render: (b) => <span className="font-mono tabular">{orUnknown(b.floors)}</span> },
              { key: "pass", header: "Паспорт", render: (b) => <span className="font-mono tabular">{b.completeness}%</span> },
            ]}
          />
        )}
      </QueryState>
    </>
  );
}
