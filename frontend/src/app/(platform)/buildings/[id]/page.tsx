"use client";

import Link from "next/link";
import { use } from "react";

import { useWorkOrders } from "@/components/lists/WorkOrderList";
import { Card, Stat } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { BuildingElevation } from "@/components/viz/BuildingElevation";
import { BarList } from "@/components/viz/Charts";
import { MaintenanceTimeline } from "@/components/viz/Timeline";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Breakdown, Building, Defect } from "@/lib/api/types";
import { OPEN_WORK, RISK } from "@/lib/status";

const RISK_COLORS = { R1: "var(--color-r1)", R2: "var(--color-r2)", R3: "var(--color-r3)", R4: "var(--color-r4)" };

/** Overview — built from approved data; preliminary findings are marked as such (ТЗ 11.4). */
export default function BuildingOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const building = useApi<Building>(`buildings/${id}/`);
  const defects = useApi<Paginated<Defect>>(`defects/?building=${id}&is_open=true&page_size=200`);
  const breakdown = useApi<Breakdown>(`analytics/breakdown/?building=${id}`);
  const work = useWorkOrders(id);
  const open = defects.data?.results ?? [];
  const activeWork = work.data?.results.filter((w) => OPEN_WORK.includes(w.status)) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Открытые дефекты" value={defects.data?.count ?? "—"} definition="Все, кроме закрытых и отклонённых" />
        <Stat label="R1 · критические" tone="critical" value={open.filter((d) => d.approved_risk === "R1").length} definition="Утверждённая категория R1" />
        <Stat label="Без утв. оценки" tone="warning" value={open.filter((d) => !d.approved_risk).length} definition="Предварительные наблюдения на проверке" />
        <Stat label="Работы в плане" value={activeWork.length} definition="Предложено, согласовано, в работе" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card
          index="A"
          title="Схема объекта · открытые дефекты"
          actions={
            <Link href={`/buildings/${id}/defects`} className="text-[13px] text-teal-strong hover:underline">
              Все дефекты
            </Link>
          }
        >
          <QueryState query={building}>
            {(b) => (
              <QueryState query={defects}>
                {(d) => <BuildingElevation floors={b.floors} entrances={b.entrances} defects={d.results} />}
              </QueryState>
            )}
          </QueryState>
        </Card>

        <div className="space-y-6">
          <Card index="B" title="Распределение по риску">
            <QueryState query={breakdown}>
              {(bd) => (
                <BarList
                  data={[
                    ...(["R1", "R2", "R3", "R4"] as const).map((r) => ({ key: r, label: RISK[r].label, value: bd.open_by_risk[r] ?? 0, color: RISK_COLORS[r] })),
                    { key: "u", label: "Не оценены (предварительно)", value: bd.open_by_risk.unassessed ?? 0, color: "var(--color-line-strong)" },
                  ]}
                />
              )}
            </QueryState>
          </Card>
          <Card index="C" title="Плановые работы">
            <QueryState query={work} empty={() => activeWork.length === 0} emptyTitle="Активных мероприятий нет">
              {() => <MaintenanceTimeline items={activeWork} limit={4} />}
            </QueryState>
          </Card>
        </div>
      </div>
    </div>
  );
}
