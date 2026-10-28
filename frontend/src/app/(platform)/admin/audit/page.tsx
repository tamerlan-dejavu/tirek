"use client";

import { useState } from "react";

import { Card, PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building } from "@/lib/api/types";
import { formatDateTime } from "@/lib/status";

interface AuditEvent {
  id: string;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
  building: string | null;
  building_address: string | null;
  action: string;
  action_label: string;
  object_type: string;
  object_id: string;
  changes: Record<string, unknown>;
}

/* Mirrors backend audit/models.py AuditAction */
const ACTIONS: [string, string][] = [
  ["auth.login", "Вход"],
  ["auth.login_failed", "Неуспешный вход"],
  ["auth.session_revoked", "Отзыв сессии"],
  ["user.blocked", "Блокировка пользователя"],
  ["user.invited", "Приглашение пользователя"],
  ["membership.changed", "Изменение роли"],
  ["building_link.changed", "Изменение доступа к зданию"],
  ["building.changed", "Изменение паспорта"],
  ["inspection.status", "Статус обследования"],
  ["inspection.approved", "Утверждение обследования"],
  ["defect.status", "Статус дефекта"],
  ["risk.assessed", "Оценка риска"],
  ["work_order.status", "Статус мероприятия"],
  ["publication", "Публикация для заказчика"],
  ["report.generated", "Генерация отчёта"],
  ["notification.urgent", "Срочное уведомление"],
  ["service_request.status", "Статус заявки"],
  ["service_request.emergency", "Подтверждена авария"],
];

/** «from → to» pairs and plain values of a change record, one line each. */
function Changes({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value ?? {}).filter(([, v]) => v !== null && v !== "");
  if (!entries.length) return <span className="text-faint">—</span>;
  return (
    <ul className="space-y-0.5 text-[12px] leading-snug">
      {entries.slice(0, 6).map(([k, v]) => {
        const pair = v && typeof v === "object" && "from" in v && "to" in v ? (v as { from: unknown; to: unknown }) : null;
        return (
          <li key={k}>
            <span className="font-mono text-muted">{k}</span>{" "}
            {pair ? (
              <>
                <span className="text-faint line-through">{String(pair.from ?? "—")}</span> → <span className="text-ink">{String(pair.to ?? "—")}</span>
              </>
            ) : (
              <span className="text-ink">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const input = "h-9 rounded-md border border-line bg-surface px-2.5 text-sm focus:border-accent focus:outline-none";

/** AC-18, ТЗ 9.6: who, when, which object, which action, what changed. Read-only, append-only. */
export default function AuditPage() {
  const [action, setAction] = useState("");
  const [building, setBuilding] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), page_size: "50" });
  if (action) params.set("action", action);
  if (building) params.set("building", building);
  if (since) params.set("since", since);
  if (until) params.set("until", until);
  const query = useApi<Paginated<AuditEvent>>(`audit-events/?${params}`);
  const buildings = useApi<Paginated<Building>>("buildings/?page_size=200");
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        code="Управление · журнал аудита"
        title="Журнал аудита"
        subtitle="Входы, изменения ролей и доступа, утверждения, оценки риска, публикации и смены статусов. Записи нельзя изменить или удалить."
      />
      <Card
        flush
        title={
          <span className="flex flex-wrap gap-2">
            <select value={action} onChange={(e) => reset(setAction)(e.target.value)} aria-label="Действие" className={input}>
              <option value="">Все действия</option>
              {ACTIONS.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select value={building} onChange={(e) => reset(setBuilding)(e.target.value)} aria-label="Здание" className={input}>
              <option value="">Все здания</option>
              {buildings.data?.results.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.internal_code} · {b.address}
                </option>
              ))}
            </select>
            <input type="date" value={since} onChange={(e) => reset(setSince)(e.target.value)} aria-label="С даты" className={`${input} font-mono`} />
            <input type="date" value={until} onChange={(e) => reset(setUntil)(e.target.value)} aria-label="По дату" className={`${input} font-mono`} />
          </span>
        }
      >
        <QueryState query={query} empty={(d) => d.results.length === 0} emptyTitle="Записей нет">
          {(d) => (
            <>
              <Table
                caption="Журнал аудита"
                rows={d.results}
                columns={[
                  { key: "t", header: "Время", render: (r) => <span className="font-mono text-[13px] whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</span> },
                  {
                    key: "a",
                    primary: true,
                    header: "Действие",
                    render: (r) => (
                      <div className="min-w-[180px]">
                        <div className="text-ink">{r.action_label}</div>
                        <div className="text-xs text-muted">{r.building_address ?? r.object_type}</div>
                      </div>
                    ),
                  },
                  { key: "u", header: "Пользователь", render: (r) => <span className="text-[13px]">{r.actor_name ?? r.actor_email ?? "система"}</span> },
                  { key: "c", header: "Изменения", render: (r) => <Changes value={r.changes} /> },
                ]}
              />
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm sm:px-5">
                <span className="text-muted">Всего: {d.count}</span>
                <span className="flex gap-2">
                  <button disabled={!d.previous} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-line px-3 py-1 disabled:opacity-40">
                    Назад
                  </button>
                  <button disabled={!d.next} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-line px-3 py-1 disabled:opacity-40">
                    Дальше
                  </button>
                </span>
              </div>
            </>
          )}
        </QueryState>
      </Card>
    </>
  );
}
