"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Defect } from "@/lib/api/types";
import { DEFECT_STATUS, formatDate } from "@/lib/status";

export function DefectList({ buildingId, inspectionId, basePath = "/defects" }: {
  buildingId?: string;
  inspectionId?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("");
  const [openOnly, setOpenOnly] = useState(true);

  const params = new URLSearchParams();
  if (buildingId) params.set("building", buildingId);
  if (inspectionId) params.set("inspection", inspectionId);
  if (search) params.set("search", search);
  if (risk) params.set("risk", risk);
  if (openOnly) params.set("is_open", "true");
  const query = useApi<Paginated<Defect>>(`defects/?${params}`);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Номер, адрес, описание…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-9 flex-1 rounded-sm border border-line bg-surface px-3 text-sm"
          aria-label="Поиск дефектов"
        />
        <select value={risk} onChange={(e) => setRisk(e.target.value)} className="min-h-9 rounded-sm border border-line bg-surface px-2 text-sm" aria-label="Категория риска">
          <option value="">Все категории</option>
          {["R1", "R2", "R3", "R4"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Только открытые
        </label>
      </div>
      <QueryState query={query} empty={(d) => d.results.length === 0}>
        {(data) => (
          <Table
            rows={data.results}
            onRowClick={(r) => router.push(`${basePath}/${r.id}`)}
            columns={[
              { key: "number", header: "№", render: (r) => <span className="font-mono">{r.number}</span> },
              { key: "risk", header: "Риск", render: (r) => r.approved_risk ? <RiskBadge category={r.approved_risk} /> : <RiskBadge category={r.preliminary_severity} preliminary /> },
              { key: "type", header: "Дефект", render: (r) => r.defect_type },
              { key: "where", header: "Место", render: (r) => <span className="text-ink-muted">{r.element_path.join(" → ")}</span> },
              ...(buildingId ? [] : [{ key: "addr", header: "Дом", render: (r: Defect) => r.building_address }]),
              { key: "date", header: "Обнаружен", render: (r) => <span className="font-mono tabular">{formatDate(r.detected_on)}</span> },
              { key: "status", header: "Статус", render: (r) => <StatusBadge label={DEFECT_STATUS[r.status]} /> },
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
