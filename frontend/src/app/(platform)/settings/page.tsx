"use client";

import { MfaCard } from "@/components/auth/MfaCard";
import { ROLE_LABEL } from "@/components/layout/Sidebar";
import { ThemeCard } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { useAction, useApi, useMe } from "@/lib/api/hooks";
import { formatDate } from "@/lib/status";

interface Session { id: string; ip_address: string | null; user_agent: string; last_seen_at: string; is_current: boolean }
interface Notification { id: string; title: string; body: string; read_at: string | null; created_at: string }

export default function SettingsPage() {
  const me = useMe();
  const sessions = useApi<Session[]>("auth/sessions/");
  const notifications = useApi<{ results: Notification[] }>("notifications/");
  const revoke = useAction("auth/sessions/revoke-others/", [["auth/sessions/"]]);

  return (
    <>
      <PageHeader title="Настройки" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Профиль">
          <QueryState query={me}>
            {(u) => (
              <dl className="text-sm">
                <dt className="text-muted">Email</dt><dd className="mb-2">{u.email}</dd>
                <dt className="text-muted">Роли</dt>
                <dd>{u.memberships.map((m) => <div key={m.id}>{m.organization_name} · {ROLE_LABEL[m.role] ?? m.role}</div>)}</dd>
              </dl>
            )}
          </QueryState>
        </Card>
        {me.data && <MfaCard me={me.data} />}
        <ThemeCard />
        <Card title="Активные сессии" actions={<Button variant="secondary" onClick={() => revoke.mutate(undefined)}>Завершить остальные</Button>}>
          <QueryState query={sessions}>
            {(list) => (
              <ul className="divide-y divide-line text-sm">
                {list.map((s) => (
                  <li key={s.id} className="py-1.5">
                    <div className="truncate">{s.user_agent || "неизвестное устройство"}</div>
                    <div className="text-xs text-muted">{s.ip_address} · {formatDate(s.last_seen_at)}{s.is_current && " · текущая"}</div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>
        <Card title="Уведомления" className="lg:col-span-2">
          <div id="notifications" />
          <QueryState query={notifications} empty={(d) => d.results.length === 0}>
            {(d) => (
              <ul className="divide-y divide-line text-sm">
                {d.results.map((n) => (
                  <li key={n.id} className={n.read_at ? "py-2 text-muted" : "py-2"}>
                    <b>{n.title}</b> · {formatDate(n.created_at)}<div>{n.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>
      </div>
    </>
  );
}
