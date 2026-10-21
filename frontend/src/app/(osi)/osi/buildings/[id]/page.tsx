"use client";

import { use } from "react";

import { DefectList } from "@/components/lists/DefectList";
import { ReportList } from "@/components/lists/ReportList";
import { WorkOrderDecision } from "@/components/osi/WorkOrderDecision";
import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { Card, PageHeader, Stat } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building, PortalSummary, WorkOrder } from "@/lib/api/types";
import { formatDate, orUnknown, WORK_ORDER_STATUS } from "@/lib/status";

interface Overview {
  building: Building;
  summary: PortalSummary;
  inspections: { id: string; number: string; version: number; approved_at: string }[];
}

/** Техническое состояние · Дефекты · Рекомендации и работы · Отчёты (ТЗ 12). */
export default function OsiBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const overview = useApi<Overview>(`portal/buildings/${id}/`);
  const work = useApi<Paginated<WorkOrder>>(`work-orders/?building=${id}`);

  return (
    <QueryState query={overview}>
      {({ building: b, summary: s, inspections }) => (
        <>
          <PageHeader
            title={b.address}
            subtitle={`${orUnknown(b.year_built)} г. · ${orUnknown(b.floors)} эт. · ${orUnknown(b.entrances)} подъездов`}
          />
          <section aria-label="Техническое состояние" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Открытых дефектов" value={s.open_defects} />
            <Stat label="R1 · критических" value={s.open_defects_by_risk.R1} tone="text-risk-r1" />
            <Stat label="Мероприятий в работе" value={s.active_work_orders} />
            <Stat label="Просрочено" value={s.overdue_work_orders} tone="text-risk-r1" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Рекомендации и работы">
              <QueryState query={work} empty={(d) => d.results.length === 0}>
                {(d) => (
                  <ul className="divide-y divide-line">
                    {d.results.map((w) => (
                      <li key={w.id} className="py-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{w.title}</span>
                          <StatusBadge label={WORK_ORDER_STATUS[w.status]} />
                        </div>
                        {/* Author, date, basis and status for every recommendation (ТЗ 5.10) */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          <span>{w.author_name}</span>·<span>{formatDate(w.created_at)}</span>
                          {w.defect_number && <>· основание <span className="font-mono">{w.defect_number}</span></>}
                          {w.risk_category && <RiskBadge category={w.risk_category} />}
                          · срок {formatDate(w.planned_date ?? w.recommended_date)}
                        </div>
                        <WorkOrderDecision workOrder={w} />
                      </li>
                    ))}
                  </ul>
                )}
              </QueryState>
            </Card>

            <div className="space-y-6">
              <Card title="История обследований">
                <ul className="text-sm">
                  {inspections.map((i) => (
                    <li key={i.id} className="flex justify-between border-b border-line py-1.5 last:border-0">
                      <span className="font-mono">{i.number} v{i.version}</span>
                      <span className="text-ink-muted">{formatDate(i.approved_at)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Отчёты">
                <ReportList buildingId={id} />
              </Card>
            </div>
          </div>

          <Card title="Дефекты" className="mt-6">
            <DefectList buildingId={id} basePath="/osi/defects" />
          </Card>
        </>
      )}
    </QueryState>
  );
}
