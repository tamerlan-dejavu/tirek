"use client";

import { ArrowRight, MessageSquarePlus, Vote } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Empty, QueryState } from "@/components/ui/States";
import type { Paginated } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";
import type { Poll, ServiceRequest, WorkOrderStatus } from "@/lib/api/types";
import { formatDate, REQUEST_STATUS, WORK_ORDER_STATUS } from "@/lib/status";

interface Overview {
  id: string;
  address: string;
  internal_code: string;
  open_requests: number;
  works: { id: string; title: string; status: WorkOrderStatus; status_label: string; planned_date: string | null; completed_at: string | null }[];
}

export default function ResidentHome() {
  const { data: me } = useMe();
  const overview = useApi<Overview[]>("resident/overview/");
  const requests = useApi<Paginated<ServiceRequest>>("service-requests/?ordering=-created_at");
  const polls = useApi<Paginated<Poll>>("polls/");
  const home = overview.data?.[0];
  const pendingPolls = polls.data?.results.filter((p) => p.my_vote === null) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="label-tech mb-2">Мой дом</div>
        <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] leading-tight font-bold tracking-[-0.03em]">
          {home ? home.address : "Здравствуйте"}
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          {me?.full_name ? `${me.full_name}. ` : ""}Здесь можно сообщить о проблеме в доме и следить, как её решают.
        </p>
      </div>

      <Link
        href="/resident/new"
        className="group mb-8 flex items-center gap-4 rounded-lg border border-accent/40 bg-accent-soft p-5 transition-colors hover:border-accent"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-md bg-accent text-white">
          <MessageSquarePlus className="size-6" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-semibold">Сообщить о проблеме</span>
          <span className="block text-sm text-muted">Протечка, лифт, свет в подъезде — с фото или видео</span>
        </span>
        <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>

      <div className="space-y-6">
        <Card title="Мои заявки" flush>
          <QueryState
            query={requests}
            empty={(d) => d.results.length === 0}
            emptyTitle="Заявок пока нет"
            emptyText="Когда вы сообщите о проблеме, её статус появится здесь."
          >
            {(d) => (
              <ul className="divide-y divide-line">
                {d.results.map((r) => (
                  <li key={r.id}>
                    <Link href={`/resident/requests/${r.id}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-mist/40 md:px-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-faint">{r.number}</span>
                          <span className="text-xs text-faint">· {formatDate(r.created_at)}</span>
                        </div>
                        <div className="mt-0.5 font-medium text-ink">{r.category_label}</div>
                        <div className="truncate text-sm text-muted">{r.description}</div>
                      </div>
                      <StatusBadge {...REQUEST_STATUS[r.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>

        {pendingPolls.length > 0 && (
          <Link href="/resident/polls" className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong">
            <Vote className="size-5 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Опросы жителей: {pendingPolls.length}</span>
              <span className="block truncate text-sm text-muted">{pendingPolls[0].question}</span>
            </span>
            <ArrowRight className="size-4 text-muted" aria-hidden />
          </Link>
        )}

        <Card title="Работы в доме">
          <QueryState query={overview}>
            {(rows) =>
              rows[0]?.works.length ? (
                <ul className="space-y-3">
                  {rows[0].works.map((w) => (
                    <li key={w.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[15px] text-ink">{w.title}</div>
                        <div className="text-xs text-muted">
                          {w.completed_at ? `выполнено ${formatDate(w.completed_at)}` : w.planned_date ? `план: ${formatDate(w.planned_date)}` : "срок уточняется"}
                        </div>
                      </div>
                      <StatusBadge {...WORK_ORDER_STATUS[w.status]} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="Согласованных работ пока нет" />
              )
            }
          </QueryState>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            Показаны работы, согласованные ОСИ. Технические отчёты доступны правлению ОСИ.
          </p>
        </Card>
      </div>

      <div className="mt-8 md:hidden">
        <ButtonLink href="/resident/new" size="lg" className="w-full" icon={<MessageSquarePlus className="size-4" />}>
          Сообщить о проблеме
        </ButtonLink>
      </div>
    </div>
  );
}
