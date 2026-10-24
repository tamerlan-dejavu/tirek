"use client";

import clsx from "clsx";
import { Plus, Siren } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader, Stat } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Chip } from "@/components/ui/Tabs";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";
import type { ServiceRequest } from "@/lib/api/types";
import { can } from "@/lib/permissions";
import {
  age,
  daysFrom,
  formatDate,
  OPEN_REQUEST,
  REQUEST_PRIORITY,
  REQUEST_PRIORITY_ORDER,
  REQUEST_STATUS,
} from "@/lib/status";

type Scope = "open" | "mine" | "new" | "check" | "emergency" | "overdue" | "all";

const OPEN = OPEN_REQUEST;
const SCOPES: Record<Scope, (r: ServiceRequest, me?: string) => boolean> = {
  open: (r) => OPEN.includes(r.status),
  mine: (r, me) => r.assignee === me && ["assigned", "in_progress"].includes(r.status),
  new: (r) => r.status === "new",
  check: (r) => r.status === "done" || r.status === "verified",
  emergency: (r) => r.is_emergency && OPEN.includes(r.status),
  overdue: (r) => OPEN.includes(r.status) && (daysFrom(r.due_date) ?? 1) < 0,
  all: () => true,
};

/** Dispatcher queue: triage, distribution, deadlines, emergencies. */
export default function RequestsPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const isDispatcher = can.dispatch(me);
  const [picked, setScope] = useState<Scope | null>(null);
  const query = useApi<Paginated<ServiceRequest>>(
    "service-requests/?page_size=200&ordering=-created_at",
  );
  const all = query.data?.results ?? [];
  const myTasks = all.filter((r) => SCOPES.mine(r, me?.id)).length;
  // Executors land on their own tasks; the dispatcher on the whole queue
  const scope: Scope = picked ?? (!isDispatcher && myTasks ? "mine" : "open");
  // Unconfirmed emergencies first, then by priority, then the oldest
  const rows = all
    .filter((r) => SCOPES[scope](r, me?.id))
    .sort(
      (a, b) =>
        Number(b.is_emergency && !b.emergency_confirmed_at) -
          Number(a.is_emergency && !a.emergency_confirmed_at) ||
        REQUEST_PRIORITY_ORDER[a.priority] - REQUEST_PRIORITY_ORDER[b.priority],
    );

  return (
    <>
      <PageHeader
        code={isDispatcher ? "Диспетчерская" : "Заявки"}
        title="Заявки"
        subtitle="Новая → принята → назначена → выполняется → выполнена → проверена → закрыта. Диспетчер распределяет, исполнитель прикладывает фото результата, инженер или диспетчер проверяет."
        actions={
          (isDispatcher || can.inspect(me) || can.agreeWork(me)) && (
            <ButtonLink href="/requests/new" size="sm" icon={<Plus className="size-3.5" />}>
              Зарегистрировать заявку
            </ButtonLink>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Новые"
          value={all.filter((r) => SCOPES.new(r)).length}
          tone="warning"
          definition="Ещё не приняты диспетчером"
        />
        <Stat
          label="Аварийные"
          value={all.filter((r) => SCOPES.emergency(r)).length}
          tone="critical"
          definition="Житель отметил аварию; открыты"
        />
        <Stat
          label="Ждут проверки"
          value={all.filter((r) => r.status === "done").length}
          tone="warning"
          definition="Исполнитель отметил выполнение"
        />
        <Stat
          label="Просрочены"
          value={all.filter((r) => SCOPES.overdue(r)).length}
          tone="critical"
          definition="Срок исполнения прошёл"
        />
      </div>

      <Card
        flush
        title={
          <span className="flex flex-wrap gap-1.5">
            {(
              [
                ["open", "Открытые"],
                ...(myTasks ? ([["mine", `Мои задачи · ${myTasks}`]] as [Scope, string][]) : []),
                ["new", "Новые"],
                ["check", "На проверке"],
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
        <QueryState
          query={query}
          empty={() => rows.length === 0}
          emptyTitle="Заявок в этой выборке нет"
        >
          {() => (
            <Table
              caption="Заявки жителей"
              rows={rows}
              onRowClick={(r) => router.push(`/requests/${r.id}`)}
              rowClassName={(r) =>
                r.is_emergency && OPEN.includes(r.status) ? "bg-critical-soft/40" : undefined
              }
              columns={[
                {
                  key: "n",
                  header: "№",
                  render: (r) => (
                    <span className="flex items-center gap-2">
                      {r.is_emergency && (
                        <Siren className="size-4 text-critical-ink" aria-label="Авария" />
                      )}
                      <span className="font-mono text-[13px] text-muted">{r.number}</span>
                    </span>
                  ),
                },
                {
                  key: "what",
                  primary: true,
                  header: "Проблема · место",
                  render: (r) => (
                    <div className="min-w-[220px]">
                      <div className="text-ink">{r.category_label}</div>
                      <div className="truncate text-xs text-muted">
                        {r.source !== "resident" && `${r.source_label} · `}
                        {r.building_address}
                        {r.entrance ? ` · подъезд ${r.entrance}` : ""}
                        {r.floor !== null ? ` · этаж ${r.floor}` : ""}
                        {r.apartment ? ` · кв. ${r.apartment}` : ""}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "prio",
                  header: "Приоритет",
                  hideOnMobile: true,
                  render: (r) => (
                    <span
                      className={clsx(
                        "text-[13px]",
                        r.priority === "urgent" && "font-medium text-critical-ink",
                        r.priority === "high" && "text-warning-ink",
                        r.priority === "low" && "text-muted",
                      )}
                    >
                      {REQUEST_PRIORITY[r.priority].label}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Статус",
                  render: (r) => <StatusBadge {...REQUEST_STATUS[r.status]} />,
                },
                {
                  key: "who",
                  header: "Ответственный",
                  hideOnMobile: true,
                  render: (r) => (
                    <span className="text-[13px] text-muted">
                      {r.assignee_name ?? "не назначен"}
                    </span>
                  ),
                },
                {
                  key: "due",
                  header: "Срок",
                  hideOnMobile: true,
                  render: (r) => {
                    const late = OPEN.includes(r.status) && (daysFrom(r.due_date) ?? 1) < 0;
                    return (
                      <span
                        className={clsx(
                          "font-mono text-[13px]",
                          late ? "text-critical-ink" : "text-muted",
                        )}
                      >
                        {formatDate(r.due_date)}
                      </span>
                    );
                  },
                },
                {
                  key: "age",
                  header: "Ожидает",
                  align: "right",
                  render: (r) => (
                    <span className="font-mono text-[13px] text-muted">
                      {OPEN.includes(r.status) ? age(r.created_at) : "—"}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </QueryState>
      </Card>
    </>
  );
}
