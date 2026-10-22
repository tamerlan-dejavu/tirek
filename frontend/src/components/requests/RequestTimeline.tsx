"use client";

import clsx from "clsx";
import { Check } from "lucide-react";

import { useApi } from "@/lib/api/hooks";
import type { RequestStatus } from "@/lib/api/types";
import { formatDateTime, REQUEST_FLOW, REQUEST_STATUS } from "@/lib/status";

interface Event {
  id: string;
  to_status: RequestStatus;
  actor_name: string;
  comment: string;
  created_at: string;
}

/** Status progress line + event history; shared by the dispatcher and the resident. */
export function RequestProgress({ status }: { status: RequestStatus }) {
  const idx = status === "rejected" ? 0 : REQUEST_FLOW.indexOf(status as (typeof REQUEST_FLOW)[number]);
  return (
    <ol className="flex items-start" aria-label="Ход заявки">
      {REQUEST_FLOW.map((s, i) => {
        const done = i < idx || (status === "resolved" && i === idx);
        const current = i === idx && status !== "resolved";
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? "step" : undefined}>
            {i > 0 && <span aria-hidden className={clsx("absolute top-[9px] right-1/2 h-px w-full", i <= idx ? "bg-accent" : "bg-line")} />}
            <span
              className={clsx(
                "relative z-10 grid size-[18px] place-items-center rounded-full border",
                done && "border-accent bg-accent text-white",
                current && "border-accent bg-surface ring-4 ring-accent/15",
                !done && !current && "border-line-strong bg-surface",
              )}
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : current ? <span className="size-1.5 rounded-full bg-accent" /> : null}
            </span>
            <span className={clsx("mt-1.5 text-[11px] leading-tight", current ? "font-medium text-ink" : "text-muted")}>{REQUEST_STATUS[s].label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RequestHistory({ requestId, createdAt }: { requestId: string; createdAt: string }) {
  const events = useApi<Event[]>(`service-requests/${requestId}/events/`);
  return (
    <ol className="relative space-y-4 border-l border-line pl-4">
      <li className="relative">
        <span aria-hidden className="absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-surface bg-steel" />
        <div className="text-sm text-ink">Заявка подана</div>
        <div className="font-mono text-[11px] text-faint">{formatDateTime(createdAt)}</div>
      </li>
      {(events.data ?? []).map((e) => (
        <li key={e.id} className="relative">
          <span aria-hidden className="absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-surface bg-accent" />
          <div className="text-sm text-ink">{REQUEST_STATUS[e.to_status].label}</div>
          {e.comment && <div className="text-[13px] text-muted">{e.comment}</div>}
          <div className="mt-0.5 font-mono text-[11px] text-faint">
            {formatDateTime(e.created_at)} · {e.actor_name}
          </div>
        </li>
      ))}
    </ol>
  );
}
