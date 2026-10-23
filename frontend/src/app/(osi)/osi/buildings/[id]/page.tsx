"use client";

import { use } from "react";

import { DueDate, useWorkOrders } from "@/components/lists/WorkOrderList";
import { ReportList } from "@/components/lists/ReportList";
import { WorkOrderDecision } from "@/components/osi/WorkOrderDecision";
import { ApprovalTag, RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { Card, PageHeader, Stat } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { BuildingElevation } from "@/components/viz/BuildingElevation";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building, Defect, PortalSummary } from "@/lib/api/types";
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
  const defects = useApi<Paginated<Defect>>(`defects/?building=${id}&is_open=true&page_size=200`);
  const work = useWorkOrders(id);

  return (
    <QueryState query={overview}>
      {({ building: b, summary: s, inspections }) => (
        <>
          <PageHeader
            code={`Кабинет ОСИ · ${b.internal_code}`}
            title={b.address}
            subtitle={`${orUnknown(b.year_built)} г. постройки · ${orUnknown(b.floors)} этажей · ${orUnknown(b.entrances)} подъезда · ${orUnknown(b.apartments)} квартир`}
          />

          <p className="mb-6 border-l-2 border-accent pl-4 text-[15px] text-ink">
            «Мы не заменяем ОСИ — мы становимся его техническим партнёром». <span className="text-muted">Инженерные выводы ниже утверждены ответственным инженером; решения о работах принимает ОСИ.</span>
          </p>

          <section aria-label="Техническое состояние" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Открытые дефекты" value={s.open_defects} definition="Подтверждённые инженером, не закрытые" />
            <Stat label="R1 · критические" value={s.open_defects_by_risk.R1} tone="critical" definition="Требуют первоочередных мер" />
            <Stat label="Ждут вашего решения" value={s.awaiting_decision} tone="warning" definition="Рекомендованные мероприятия" />
            <Stat label="Просрочено работ" value={s.overdue_work_orders} tone="critical" definition="Плановая дата прошла" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Card index="A" title="Схема дома · подтверждённые дефекты">
              <QueryState query={defects}>
                {(d) => <BuildingElevation floors={b.floors} entrances={b.entrances} defects={d.results} hrefFor={(x) => `/osi/defects/${x.id}`} />}
              </QueryState>
            </Card>

            <div className="space-y-6">
              <Card index="B" title="Рекомендации и работы">
                <QueryState query={work} empty={(d) => d.results.length === 0} emptyTitle="Рекомендаций нет">
                  {(d) => (
                    <ul className="divide-y divide-line">
                      {d.results.map((w) => (
                        <li key={w.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink">{w.title}</div>
                              {/* author, date, basis and status for every recommendation (ТЗ 5.10) */}
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                                <span>{w.author_name}</span>
                                <span>· {formatDate(w.created_at)}</span>
                                {w.defect_number && (
                                  <span>
                                    · основание <span className="font-mono">{w.defect_number}</span>
                                  </span>
                                )}
                                {w.risk_category && <RiskBadge category={w.risk_category} size="sm" />}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <StatusBadge {...WORK_ORDER_STATUS[w.status]} />
                              <DueDate wo={w} />
                            </div>
                          </div>
                          <WorkOrderDecision workOrder={w} />
                        </li>
                      ))}
                    </ul>
                  )}
                </QueryState>
              </Card>

              <Card index="C" title="История обследований">
                <ul className="divide-y divide-line">
                  {inspections.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2 text-sm first:pt-0">
                      <span className="font-mono">
                        {i.number}
                        {i.version > 1 && <span className="text-muted"> · v{i.version}</span>}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-muted">{formatDate(i.approved_at)}</span>
                        <ApprovalTag approved />
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <Card index="D" title="Отчёты" flush className="mt-6">
            <ReportList buildingId={id} audience="osi" />
          </Card>
        </>
      )}
    </QueryState>
  );
}
