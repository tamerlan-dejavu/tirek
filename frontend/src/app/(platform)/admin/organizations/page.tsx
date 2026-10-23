"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import { api, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Role } from "@/lib/api/types";

interface Org { id: string; type: "provider" | "customer"; name: string; bin: string; is_active: boolean }
interface Member { id: string; user_email: string; user_full_name: string; role: Role; is_active: boolean }

const ROLE_LABEL: Record<Role, string> = {
  provider_admin: "Администратор поставщика",
  field_specialist: "Полевой специалист",
  reviewing_engineer: "Проверяющий инженер",
  production_planner: "ПТО / производственный блок",
  dispatcher: "Диспетчер",
  osi_representative: "Представитель ОСИ",
  resident: "Житель",
};

export default function OrganizationsPage() {
  const orgs = useApi<Paginated<Org>>("organizations/");
  const [selected, setSelected] = useState<Org | null>(null);
  const members = useApi<Member[]>(selected ? `organizations/${selected.id}/members/` : null);
  const [error, setError] = useState<unknown>(null);

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(`organizations/${selected!.id}/invite/`, {
        method: "POST",
        body: { email: f.get("email"), full_name: f.get("full_name"), role: f.get("role") },
      });
      members.refetch();
      e.currentTarget.reset();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <PageHeader title="Организации и пользователи" subtitle="Изменения ролей и доступа фиксируются в журнале аудита" />
      <div className="grid gap-6 lg:grid-cols-2">
        <QueryState query={orgs}>
          {(data) => (
            <Table
              rows={data.results}
              onRowClick={setSelected}
              columns={[
                { key: "name", header: "Организация", render: (o) => o.name },
                { key: "type", header: "Тип", render: (o) => (o.type === "provider" ? "Поставщик" : "Заказчик") },
                { key: "bin", header: "БИН", render: (o) => <span className="font-mono">{o.bin || "—"}</span> },
              ]}
            />
          )}
        </QueryState>
        {selected && (
          <Card title={selected.name}>
            <QueryState query={members}>
              {(list) => (
                <ul className="mb-4 divide-y divide-line text-sm">
                  {list.map((m) => (
                    <li key={m.id} className="flex justify-between py-1.5">
                      <span>{m.user_full_name || m.user_email}</span>
                      <span className="text-muted">{ROLE_LABEL[m.role]}{!m.is_active && " · отключён"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </QueryState>
            <form onSubmit={invite} className="space-y-2">
              <input name="email" type="email" required placeholder="email" aria-label="Email" className="min-h-9 w-full rounded-sm border border-line px-2 text-sm" />
              <input name="full_name" placeholder="ФИО" aria-label="ФИО" className="min-h-9 w-full rounded-sm border border-line px-2 text-sm" />
              <select name="role" aria-label="Роль" className="min-h-9 w-full rounded-sm border border-line px-2 text-sm">
                {(selected.type === "provider"
                  ? (["field_specialist", "reviewing_engineer", "production_planner", "dispatcher", "provider_admin"] as Role[])
                  : (["osi_representative", "resident"] as Role[])
                ).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
              {error ? <ErrorState error={error} /> : null}
              <Button type="submit">Пригласить</Button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
