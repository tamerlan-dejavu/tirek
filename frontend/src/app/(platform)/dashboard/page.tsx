"use client";

import { Card, PageHeader, Stat } from "@/components/ui/Card";
import { InspectionList } from "@/components/lists/InspectionList";
import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import type { Dashboard } from "@/lib/api/types";

export default function DashboardPage() {
  const query = useApi<Dashboard>("analytics/dashboard/");
  return (
    <>
      <PageHeader title="Главная" subtitle="Показатели по доступным вам домам" />
      <QueryState query={query}>
        {(d) => (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Домов" value={d.buildings} />
            <Stat label="Обследований" value={d.inspections_total} />
            <Stat label="Ожидают проверки" value={d.inspections_awaiting_review} />
            <Stat label="Открытых дефектов" value={d.defects_open} />
            <Stat label="Дефекты R1" value={d.defects_r1} tone="text-risk-r1" />
            <Stat label="Дефекты R2" value={d.defects_r2} tone="text-risk-r2" />
            <Stat label="Срок ≤ 14 дней" value={d.work_orders_due_soon} />
            <Stat label="Просрочено" value={d.work_orders_overdue} tone="text-risk-r1" />
          </div>
        )}
      </QueryState>
      <Card title="Ожидают проверки" className="mt-6">
        <InspectionList status="submitted" />
      </Card>
    </>
  );
}
