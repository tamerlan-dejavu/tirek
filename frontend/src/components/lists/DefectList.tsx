"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ApprovalTag, RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { QueryState } from "@/components/ui/States";
import { Chip } from "@/components/ui/Tabs";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Defect, RiskCategory } from "@/lib/api/types";
import { DEFECT_STATUS, formatDate, RISK_ORDER } from "@/lib/status";

/**
 * Defect register. Severity and workflow status are separate columns, never merged.
 * Filters: text search, severity chips, open/all.
 */
export function DefectList(props: DefectListProps) {
  return (
    <Suspense>
      <DefectListInner {...props} />
    </Suspense>
  );
}

interface DefectListProps {
  buildingId?: string;
  inspectionId?: string;
  basePath?: string;
  compact?: boolean;
  showFilters?: boolean;
}

function DefectListInner({
  buildingId,
  inspectionId,
  basePath = "/defects",
  compact = false,
  showFilters = true,
}: DefectListProps) {
  const router = useRouter();
  const urlQuery = useSearchParams().get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const [risks, setRisks] = useState<RiskCategory[]>([]);
  const [openOnly, setOpenOnly] = useState(true);

  const params = new URLSearchParams({ ordering: "risk_order" });
  if (buildingId) params.set("building", buildingId);
  if (inspectionId) params.set("inspection", inspectionId);
  if (search) params.set("search", search);
  risks.forEach((r) => params.append("risk", r));
  if (openOnly) params.set("is_open", "true");
  const query = useApi<Paginated<Defect>>(`defects/?${params}`);

  const toggleRisk = (r: RiskCategory) => setRisks((v) => (v.includes(r) ? v.filter((x) => x !== r) : [...v, r]));

  return (
    <div>
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <label className="flex h-8 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2.5 focus-within:border-teal">
            <Search aria-hidden className="size-4 text-faint" />
            <input
              type="search"
              placeholder="Номер, адрес, описание…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
              aria-label="Поиск дефектов"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Категория риска">
            {RISK_ORDER.map((r) => (
              <Chip key={r} active={risks.includes(r)} onClick={() => toggleRisk(r)}>
                <span className="font-mono">{r}</span>
              </Chip>
            ))}
          </div>
          <Chip active={openOnly} onClick={() => setOpenOnly((v) => !v)}>
            Только открытые
          </Chip>
          {query.data && <span className="ml-auto font-mono text-xs text-muted tabular">{query.data.count} зап.</span>}
        </div>
      )}
      <QueryState
        query={query}
        empty={(d) => d.results.length === 0}
        emptyTitle={search || risks.length ? "Ничего не найдено" : "Открытых дефектов нет"}
        emptyText={search || risks.length ? "Измените условия поиска или фильтры." : undefined}
      >
        {(data) => (
          <Table
            caption="Реестр дефектов"
            rows={data.results}
            onRowClick={(r) => router.push(`${basePath}/${r.id}`)}
            columns={[
              {
                key: "number",
                header: "№",
                render: (r) => <span className="font-mono text-[13px] text-muted">{r.number}</span>,
              },
              {
                key: "risk",
                header: "Риск",
                render: (r) =>
                  r.approved_risk ? (
                    <RiskBadge category={r.approved_risk} size={compact ? "sm" : "md"} />
                  ) : (
                    <RiskBadge category={r.preliminary_severity} preliminary size={compact ? "sm" : "md"} />
                  ),
              },
              {
                key: "type",
                header: "Дефект и место",
                render: (r) => (
                  <div className="min-w-[200px]">
                    <div className="text-ink">{r.defect_type}</div>
                    <div className="truncate text-xs text-muted">
                      {r.element_path.join(" → ")}
                      {r.location && ` · ${r.location}`}
                    </div>
                  </div>
                ),
              },
              ...(buildingId
                ? []
                : [{ key: "addr", header: "Дом", hideOnMobile: true, render: (r: Defect) => <span className="text-[13px]">{r.building_address}</span> }]),
              {
                key: "status",
                header: "Статус",
                render: (r) => <StatusBadge {...DEFECT_STATUS[r.status]} />,
              },
              ...(compact
                ? []
                : [
                    {
                      key: "appr",
                      header: "Оценка",
                      hideOnMobile: true,
                      render: (r: Defect) => <ApprovalTag approved={!!r.approved_risk} />,
                    },
                    {
                      key: "date",
                      header: "Обнаружен",
                      hideOnMobile: true,
                      align: "right" as const,
                      render: (r: Defect) => <span className="font-mono text-[13px] tabular text-muted">{formatDate(r.detected_on)}</span>,
                    },
                  ]),
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
