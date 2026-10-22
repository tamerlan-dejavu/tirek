"use client";

import clsx from "clsx";
import { Siren } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { StatusBadge } from "@/components/ui/Badge";
import { Card, PageHeader, Stat } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Chip } from "@/components/ui/Tabs";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";
import type { ServiceRequest } from "@/lib/api/types";
import { can } from "@/lib/permissions";
import { age, daysFrom, formatDate, REQUEST_STATUS } from "@/lib/status";

type Scope = "open" | "new" | "emergency" | "overdue" | "all";

const OPEN = ["new", "accepted", "in_progress"];
const SCOPES: Record<Scope, (r: ServiceRequest) => boolean> = {
  open: (r) => OPEN.includes(r.status),
  new: (r) => r.status === "new",
  emergency: (r) => r.is_emergency && OPEN.includes(r.status),
  overdue: (r) => OPEN.includes(r.status) && (daysFrom(r.due_date) ?? 1) < 0,
  all: () => true,
};

/** Dispatcher queue: triage, distribution, deadlines, emergencies. */
export default function RequestsPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const [scope, setScope] = useState<Scope>("open");
  const query = useApi<Paginated<ServiceRequest>>("service-requests/?page_size=200&ordering=-created_at");
  const all = query.data?.results ?? [];
  // Emergencies first, then the oldest unresolved
  const rows = all
    .filter(SCOPES[scope])
    .sort((a, b) => Number(b.is_emergency && !b.emergency_confirmed_at) - Number(a.is_emergency && !a.emergency_confirmed_at));

  return (
    <>
      <PageHeader
        code={can.dispatch(me) ? "Диспетчерская" : "Заявки жителей"}
        title="Заявки жителей"
        subtitle="Заявка — это сигнал жителя. Диспетчер принимает её, назначает исполнителя и срок; технические выводы делает инженер."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Новые" value={all.filter(SCOPES.new).length} tone="warning" definition="Ещё не приняты диспетчером" />
        <Stat label="Аварийные" value={all.filter(SCOPES.emergency).length} tone="critical" definition="Житель отметил аварию; открыты" />
        <Stat label="В работе" value={all.filter((r) => r.status === "in_progress").length} definition="Назначен исполнитель" />
        <Stat label="Просрочены" value={all.filter(SCOPES.overdue).length} tone="critical" definition="Срок исполнения прошёл" />
      </div>

      <Card
        flush
        title={
          <span className="flex flex-wrap gap-1.5">
            {(
              [
                ["open", "Открытые"],
                ["new", "Новые"],
                ["emergency", "Аварийные"],
                ["overdue", "Просроченные"],
                ["all", "Все"],
              ] as [Scope, string][]
            ).map(([v, l]) => (
              <Chip key={v} active={scope === v} onClick={() => setScope(v)}>
                {l}
              </Chip>
            ))}
          </span>
        }
      >
        <QueryState query={query} empty={() => rows.length === 0} emptyTitle="Заявок в этой выборке нет">
          {() => (
            <Table
              caption="Заявки жителей"
              rows={rows}
              onRowClick={(r) => router.push(`/requests/${r.id}`)}
              rowClassName={(r) => (r.is_emergency && OPEN.includes(r.status) ? "bg-critical-soft/40" : undefined)}
              columns={[
                {
                  key: "n",
                  header: "№",
                  render: (r) => (
                    <span className="flex items-center gap-2">
                      {r.is_emergency && <Siren className="size-4 text-critical-ink" aria-label="Авария" />}
                      <span className="font-mono text-[13px] text-muted">{r.number}</span>
                    </span>
                  ),
                },
                {
                  key: "what",
                  header: "Проблема · место",
                  render: (r) => (
                    <div className="min-w-[220px]">
                      <div className="text-ink">{r.category_label}</div>
                      <div className="truncate text-xs text-muted">
                        {r.building_address}
                        {r.entrance ? ` · подъезд ${r.entrance}` : ""}
                        {r.floor !== null ? ` · этаж ${r.floor}` : ""}
                        {r.apartment ? ` · кв. ${r.apartment}` : ""}
                      </div>
                    </div>
                  ),
                },
                { key: "status", header: "Статус", render: (r) => <StatusBadge {...REQUEST_STATUS[r.status]} /> },
                {
                  key: "who",
                  header: "Исполнитель",
                  hideOnMobile: true,
                  render: (r) => <span className="text-[13px] text-muted">{r.assignee_name ?? "не назначен"}</span>,
                },
                {
                  key: "due",
                  header: "Срок",
                  hideOnMobile: true,
                  render: (r) => {
                    const late = OPEN.includes(r.status) && (daysFrom(r.due_date) ?? 1) < 0;
                    return <span className={clsx("font-mono text-[13px]", late ? "text-critical-ink" : "text-muted")}>{formatDate(r.due_date)}</span>;
                  },
                },
                {
                  key: "age",
                  header: "Ожидает",
                  align: "right",
                  render: (r) => <span className="font-mono text-[13px] text-muted">{OPEN.includes(r.status) ? age(r.created_at) : "—"}</span>,
                },
              ]}
            />
          )}
        </QueryState>
      </Card>
    </>
  );
}
