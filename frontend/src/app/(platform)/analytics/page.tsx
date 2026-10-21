"use client";

import { Card, PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { BarList, MonthlyColumns, StackedBar } from "@/components/viz/Charts";
import { useApi } from "@/lib/api/hooks";
import type { Breakdown, DefectStatus, WorkOrderStatus } from "@/lib/api/types";
import { DEFECT_STATUS, ELEMENT_GROUP, RISK, WORK_ORDER_STATUS } from "@/lib/status";

const RISK_COLORS = { R1: "var(--color-r1)", R2: "var(--color-r2)", R3: "var(--color-r3)", R4: "var(--color-r4)" };

/** Engineering analytics: each chart answers one operational question, with unit and period. */
export default function AnalyticsPage() {
  const query = useApi<Breakdown>("analytics/breakdown/");

  return (
    <>
      <PageHeader
        code="06 · Аналитика"
        title="Аналитика технического состояния"
        subtitle="Только подсчёты по зафиксированным записям. Сводных «индексов состояния» нет — для них не утверждена методика."
      />
      <QueryState query={query}>
        {(b) => (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card index="A" title="Как меняется поток дефектов?" className="lg:col-span-2">
              <MonthlyColumns data={b.monthly} />
              <p className="mt-3 text-xs text-muted">Выявлено — по дате обнаружения; закрыто — по дате закрытия с подтверждённым основанием. Отклонённые как ошибочные не учитываются.</p>
            </Card>

            <Card index="B" title="Насколько серьёзны открытые дефекты?">
              <StackedBar
                label="Открытые дефекты по риску"
                data={[
                  ...(["R1", "R2", "R3", "R4"] as const).map((r) => ({ key: r, label: RISK[r].label, value: b.open_by_risk[r] ?? 0, color: RISK_COLORS[r] })),
                  { key: "u", label: "Не оценены", value: b.open_by_risk.unassessed ?? 0 },
                ]}
              />
              <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                «Не оценены» — наблюдения без утверждённой инженером категории; их нельзя трактовать как низкий риск.
              </p>
            </Card>

            <Card index="C" title="В каких системах дефекты?">
              <BarList
                unit=" шт."
                data={Object.entries(b.open_by_element_type)
                  .sort((x, y) => y[1] - x[1])
                  .map(([k, v]) => ({ key: k, label: k, value: v }))}
              />
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                {Object.entries(b.open_by_group).map(([g, v]) => (
                  <span key={g}>
                    {ELEMENT_GROUP[g] ?? g}: <span className="font-mono text-ink">{v}</span>
                  </span>
                ))}
              </div>
            </Card>

            <Card index="D" title="Где дефекты в процессе?">
              <BarList
                data={(Object.entries(b.by_status) as [DefectStatus, number][]).map(([s, v]) => ({
                  key: s,
                  label: DEFECT_STATUS[s].label,
                  value: v,
                  color: s === "closed" ? "var(--color-healthy)" : "var(--color-steel)",
                }))}
              />
            </Card>

            <Card index="E" title="Как исполняются мероприятия?">
              <BarList
                data={(Object.entries(b.work_orders_by_status) as [WorkOrderStatus, number][]).map(([s, v]) => ({
                  key: s,
                  label: WORK_ORDER_STATUS[s].label,
                  value: v,
                  color: ["done", "verified", "closed"].includes(s) ? "var(--color-healthy)" : s === "postponed" ? "var(--color-warning)" : "var(--color-steel)",
                }))}
              />
            </Card>
          </div>
        )}
      </QueryState>
    </>
  );
}
