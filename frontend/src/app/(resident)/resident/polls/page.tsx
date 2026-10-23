"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import type { Paginated } from "@/lib/api/client";
import { useAction, useApi } from "@/lib/api/hooks";
import type { Poll } from "@/lib/api/types";
import { formatDate } from "@/lib/status";

function PollCard({ poll }: { poll: Poll }) {
  const [choice, setChoice] = useState<number | null>(null);
  const vote = useAction<{ option: number }>(`polls/${poll.id}/vote/`, [["polls/"]]);
  const voted = poll.my_vote !== null;
  const total = Math.max(1, poll.options.reduce((s, o) => s + (o.votes ?? 0), 0));

  return (
    <Card>
      <h2 className="text-lg leading-snug font-semibold">{poll.question}</h2>
      {poll.description && <p className="mt-1 text-sm text-muted">{poll.description}</p>}
      <p className="mt-1 font-mono text-[11px] text-faint">
        {poll.closes_at ? `до ${formatDate(poll.closes_at)}` : "без срока"} · ответов: {poll.total_votes}
      </p>

      <ul className="mt-5 space-y-2" role={voted ? undefined : "radiogroup"} aria-label={poll.question}>
        {poll.options.map((o) => {
          const mine = poll.my_vote === o.id;
          const pct = o.votes !== null ? Math.round(((o.votes ?? 0) / total) * 100) : null;
          return (
            <li key={o.id}>
              {voted ? (
                <div className={clsx("relative overflow-hidden rounded-md border px-3 py-3", mine ? "border-accent" : "border-line")}>
                  <div className="absolute inset-y-0 left-0 bg-accent-soft" style={{ width: `${pct ?? 0}%` }} aria-hidden />
                  <div className="relative flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      {mine && <Check className="size-4 text-accent" aria-label="Ваш ответ" />}
                      {o.text}
                    </span>
                    <span className="font-mono text-muted">{pct}%</span>
                  </div>
                </div>
              ) : (
                <button
                  role="radio"
                  aria-checked={choice === o.id}
                  onClick={() => setChoice(o.id)}
                  className={clsx(
                    "flex min-h-12 w-full items-center gap-3 rounded-md border px-3 text-left text-[15px] transition-colors",
                    choice === o.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className={clsx("size-4 shrink-0 rounded-full border", choice === o.id ? "border-[5px] border-accent" : "border-line-strong")} />
                  {o.text}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!voted && (
        <Button className="mt-4" disabled={choice === null || vote.isPending} onClick={() => choice !== null && vote.mutate({ option: choice })}>
          Ответить
        </Button>
      )}
      {vote.error ? (
        <div className="mt-3">
          <ErrorState error={vote.error} />
        </div>
      ) : null}
    </Card>
  );
}

export default function PollsPage() {
  const query = useApi<Paginated<Poll>>("polls/");
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="label-tech mb-2">Опросы</div>
        <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] leading-tight font-bold tracking-[-0.03em]">Мнение жителей</h1>
        <p className="mt-2 text-sm text-muted">
          Консультативные опросы ОСИ. Не являются юридически значимым голосованием собственников. Результаты видны после ответа.
        </p>
      </div>
      <QueryState query={query} empty={(d) => d.results.length === 0} emptyTitle="Активных опросов нет">
        {(d) => (
          <div className="space-y-4">
            {d.results.map((p) => (
              <PollCard key={p.id} poll={p} />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
