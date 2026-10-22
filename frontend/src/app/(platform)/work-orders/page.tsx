"use client";

import { CalendarDays, ChartGantt, Rows3 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useWorkOrders, WorkOrderTable } from "@/components/lists/WorkOrderList";
import { Card, PageHeader, Stat } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Chip, Segmented } from "@/components/ui/Tabs";
import { MonthCalendar } from "@/components/viz/MonthCalendar";
import { MaintenanceTimeline } from "@/components/viz/Timeline";
import { WorkOrderPanel } from "@/components/workorders/WorkOrderPanel";
import { useMe } from "@/lib/api/hooks";
import type { WorkOrder } from "@/lib/api/types";
import { can } from "@/lib/permissions";
import { daysFrom, OPEN_WORK } from "@/lib/status";

type View = "timeline" | "table" | "calendar";
type Scope = "open" | "overdue" | "done" | "all";

const SCOPES: Record<Scope, (w: WorkOrder) => boolean> = {
  open: (w) => OPEN_WORK.includes(w.status),
  overdue: (w) => OPEN_WORK.includes(w.status) && (daysFrom(w.planned_date) ?? 1) < 0,
  done: (w) => ["done", "verified", "closed"].includes(w.status),
  all: () => true,
};

export default function MaintenancePage() {
  return (
    <Suspense>
      <Maintenance />
    </Suspense>
  );
}

function Maintenance() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: me } = useMe();
  const [view, setView] = useState<View>("timeline");
  const [scope, setScope] = useState<Scope>("open");
  const query = useWorkOrders();
  const all = query.data?.results ?? [];
  const rows = all.filter(SCOPES[scope]);
  // ?focus=<id> opens the planning panel (links from the timeline and dashboard)
  const focusId = params.get("focus");
  const selected = all.find((w) => w.id === focusId) ?? null;
  const open = (w: WorkOrder) => router.push(`/work-orders?focus=${w.id}`, { scroll: false });
  const close = () => router.push("/work-orders", { scroll: false });
  const isPto = can.planProduction(me) && !can.review(me);

  return (
    <>
      <PageHeader
        code={isPto ? "ПТО · план производства работ" : "06 · Обслуживание · план мероприятий"}
        title={isPto ? "План производства работ" : "Обслуживание"}
        subtitle={
          isPto
            ? "Календарь, исполнители и ресурсы по согласованным мероприятиям. Нажмите на мероприятие, чтобы спланировать его."
            : "Инженер рекомендует и задаёт приоритет, ОСИ согласовывает, ПТО планирует, исполнитель отмечает выполнение, инженер проверяет результат."
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="В работе и в плане" value={all.filter(SCOPES.open).length} definition="Предложено, согласовано, запланировано, в работе, отложено" />
        <Stat label="Просрочено" tone="critical" value={all.filter(SCOPES.overdue).length} definition="Плановая дата прошла, работа не выполнена" />
        <Stat label="Ждут решения ОСИ" tone="warning" value={all.filter((w) => w.status === "proposed").length} definition="Рекомендации без управленческого согласования" />
        <Stat label="Выполнено" tone="healthy" value={all.filter(SCOPES.done).length} definition="Выполнено, проверено или закрыто" />
      </div>

      <Card
        flush
        title={
          <span className="flex flex-wrap gap-1.5">
            {(
              [
                ["open", "Активные"],
                ["overdue", "Просроченные"],
                ["done", "Выполненные"],
                ["all", "Все"],
              ] as [Scope, string][]
            ).map(([v, l]) => (
              <Chip key={v} active={scope === v} onClick={() => setScope(v)}>
                {l}
              </Chip>
            ))}
          </span>
        }
        actions={
          <Segmented<View>
            label="Представление"
            value={view}
            onChange={setView}
            options={[
              { value: "timeline", label: <><ChartGantt className="size-3.5" /> Таймлайн</> },
              { value: "table", label: <><Rows3 className="size-3.5" /> Таблица</> },
              { value: "calendar", label: <><CalendarDays className="size-3.5" /> Календарь</> },
            ]}
          />
        }
      >
        <QueryState query={query} empty={() => rows.length === 0 && view !== "calendar"} emptyTitle="Мероприятий в этой выборке нет">
          {() =>
            view === "table" ? (
              <WorkOrderTable rows={rows} showBuilding onRowClick={open} />
            ) : view === "calendar" ? (
              <div className="p-4">
                <MonthCalendar items={rows} onSelect={open} />
              </div>
            ) : (
              <div className="p-4">
                <MaintenanceTimeline items={rows} />
              </div>
            )
          }
        </QueryState>
      </Card>
      {selected && <WorkOrderPanel key={selected.id} wo={selected} onClose={close} onChanged={() => query.refetch()} />}
      <p className="mt-4 text-xs text-muted">Техническое утверждение рекомендации не означает финансового согласования или юридического разрешения на работы.</p>
    </>
  );
}
