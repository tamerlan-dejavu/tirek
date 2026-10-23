"use client";

import { ArrowRight, Building2, ClipboardCheck, Hourglass, OctagonAlert, TriangleAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useWorkOrders } from "@/components/lists/WorkOrderList";
import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { Card, PageHeader, Stat } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import { BarList, StackedBar } from "@/components/viz/Charts";
import { ActivityFeed, MaintenanceTimeline } from "@/components/viz/Timeline";
import type { Paginated } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";
import type { ActivityItem, Breakdown, Dashboard, Defect } from "@/lib/api/types";
import { DEFECT_STATUS, ELEMENT_GROUP, formatDateTime, OPEN_WORK, RISK } from "@/lib/status";

const RISK_COLORS = { R1: "var(--color-r1)", R2: "var(--color-r2)", R3: "var(--color-r3)", R4: "var(--color-r4)" };

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const stats = useApi<Dashboard>("analytics/dashboard/");
  const breakdown = useApi<Breakdown>("analytics/breakdown/");
  const priority = useApi<Paginated<Defect>>("defects/?is_open=true&ordering=risk_order&page_size=7");
  const work = useWorkOrders();
  const activity = useApi<ActivityItem[]>("analytics/activity/?limit=8");
  const s = stats.data;

  return (
    <>
      <PageHeader
        code="01 · Обзор · портфель объектов"
        title="Техническая обстановка"
        subtitle={
          s ? (
            <>
              {s.buildings} {s.buildings === 1 ? "дом" : "домов"} в обслуживании · данные на{" "}
              <span className="font-mono">{formatDateTime(s.generated_at)}</span>
            </>
          ) : (
            "Загрузка сводки…"
          )
        }
        actions={
          <Link href="/inspections" className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium hover:bg-canvas">
            Обследования <ArrowRight className="size-4" />
          </Link>
        }
      />

      {/* Metrics — plain counts with definitions, no composite scores */}
      <section aria-label="Ключевые показатели" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Дома" value={s?.buildings ?? "—"} icon={<Building2 className="size-4" />} definition="С действующим договором технического сопровождения" href="/buildings" />
        <Stat label="Открытые дефекты" value={s?.defects_open ?? "—"} icon={<TriangleAlert className="size-4" />} definition="Все статусы, кроме «Закрыт» и «Отклонён»" href="/defects" />
        <Stat label="Критические R1" value={s?.defects_r1 ?? "—"} tone="critical" icon={<OctagonAlert className="size-4" />} definition="Открытые, категория R1 утверждена инженером" href="/defects" />
        <Stat label="Просрочено работ" value={s?.work_orders_overdue ?? "—"} tone="critical" icon={<Wrench className="size-4" />} definition="Плановая дата прошла, работа не выполнена" href="/work-orders" />
        <Stat label="Обследования в плане" value={s?.inspections_scheduled ?? "—"} icon={<ClipboardCheck className="size-4" />} definition="Черновики с плановой датой с сегодняшнего дня" href="/inspections" />
        <Stat label="Ждут проверки" value={s ? s.defects_pending_verification + s.inspections_awaiting_review : "—"} tone="warning" icon={<Hourglass className="size-4" />} definition="Дефекты и обследования на проверке инженера" href="/inspections" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card
          index="02"
          title="Требуют внимания"
          flush
          actions={
            <Link href="/defects" className="text-[13px] text-accent-strong hover:underline">
              Реестр дефектов
            </Link>
          }
        >
          <QueryState query={priority} empty={(d) => d.results.length === 0} emptyTitle="Открытых дефектов нет">
            {(d) => (
              <Table
                caption="Открытые дефекты по убыванию риска"
                rows={d.results}
                onRowClick={(r) => router.push(`/defects/${r.id}`)}
                columns={[
                  {
                    key: "risk",
                    header: "Риск",
                    render: (r) => (r.approved_risk ? <RiskBadge category={r.approved_risk} size="sm" /> : <RiskBadge category={r.preliminary_severity} preliminary size="sm" />),
                  },
                  {
                    key: "what",
                    header: "Дефект · место",
                    render: (r) => (
                      <div className="min-w-[180px]">
                        <div className="text-ink">{r.defect_type}</div>
                        <div className="truncate text-xs text-muted">
                          <span className="font-mono text-faint">{r.number}</span> · {r.building_address} · {r.location || r.element_path.join(" → ")}
                        </div>
                      </div>
                    ),
                  },
                  { key: "status", header: "Статус", render: (r) => <StatusBadge {...DEFECT_STATUS[r.status]} /> },
                ]}
              />
            )}
          </QueryState>
        </Card>

        <Card
          index="03"
          title="Плановые работы"
          actions={
            <Link href="/work-orders" className="text-[13px] text-accent-strong hover:underline">
              План
            </Link>
          }
        >
          <QueryState
            query={work}
            empty={(d) => !d.results.some((w) => OPEN_WORK.includes(w.status))}
            emptyTitle="Активных мероприятий нет"
          >
            {(d) => <MaintenanceTimeline items={d.results.filter((w) => OPEN_WORK.includes(w.status))} limit={5} />}
          </QueryState>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card index="04" title="Открытые дефекты по риску">
          <QueryState query={breakdown}>
            {(b) => (
              <StackedBar
                label="Открытые дефекты по категории риска"
                data={[
                  ...(["R1", "R2", "R3", "R4"] as const).map((r) => ({ key: r, label: RISK[r].label, value: b.open_by_risk[r] ?? 0, color: RISK_COLORS[r] })),
                  { key: "u", label: "Не оценены", value: b.open_by_risk.unassessed ?? 0 },
                ]}
              />
            )}
          </QueryState>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            Категории R1–R4 присваивает проверяющий инженер. «Не оценены» — предварительные наблюдения без утверждённой оценки.
          </p>
        </Card>
        <Card index="05" title="По системам здания">
          <QueryState query={breakdown}>
            {(b) => (
              <BarList
                unit=" шт."
                data={Object.entries(b.open_by_element_type)
                  .sort((a, c) => c[1] - a[1])
                  .slice(0, 6)
                  .map(([k, v]) => ({ key: k, label: k, value: v }))}
              />
            )}
          </QueryState>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            Группы: {Object.values(ELEMENT_GROUP).slice(0, 3).join(" · ").toLowerCase()}.
          </p>
        </Card>
        <Card index="06" title="Последние изменения">
          <QueryState query={activity} empty={(d) => d.length === 0} emptyTitle="Изменений пока нет">
            {(items) => <ActivityFeed items={items} />}
          </QueryState>
        </Card>
      </div>

      {me && (
        <p className="mt-8 text-center font-mono text-[11px] tracking-wide text-faint uppercase">
          Tirek поддерживает инженерные решения, но не заменяет ответственных специалистов
        </p>
      )}
    </>
  );
}
