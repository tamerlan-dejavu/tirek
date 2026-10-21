import clsx from "clsx";
import { Check } from "lucide-react";

import type { DefectStatus } from "@/lib/api/types";
import { DEFECT_FLOW, DEFECT_STATUS } from "@/lib/status";

/** Defect lifecycle as a measured line: done ▸ current ▸ upcoming. Side states shown explicitly. */
export function LifecycleStepper({ status }: { status: DefectStatus }) {
  const side = status === "rejected" || status === "needs_clarification";
  const idx = side ? DEFECT_FLOW.indexOf("in_review") : DEFECT_FLOW.indexOf(status);

  return (
    <div>
      <ol className="flex items-start" aria-label="Жизненный цикл дефекта">
        {DEFECT_FLOW.map((s, i) => {
          const done = i < idx || (status === "closed" && i === idx);
          const current = i === idx && status !== "closed";
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? "step" : undefined}>
              {i > 0 && (
                <span aria-hidden className={clsx("absolute top-[9px] right-1/2 h-px w-full", i <= idx ? "bg-accent" : "bg-line")} />
              )}
              <span
                className={clsx(
                  "relative z-10 grid size-[18px] place-items-center rounded-full border text-[9px]",
                  done && "border-accent bg-accent text-white",
                  current && "border-accent bg-surface ring-4 ring-accent/15",
                  !done && !current && "border-line-strong bg-surface",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : current ? <span className="size-1.5 rounded-full bg-accent" /> : null}
              </span>
              <span className={clsx("mt-1.5 hidden px-1 text-[11px] leading-tight md:block", current ? "font-medium text-ink" : "text-muted")}>
                {DEFECT_STATUS[s].label}
              </span>
            </li>
          );
        })}
      </ol>
      {side && (
        <p className={clsx("mt-3 rounded-md px-3 py-2 text-[13px]", status === "rejected" ? "bg-mist text-ink" : "bg-warning-soft text-warning-ink")}>
          Ответвление процесса: <b>{DEFECT_STATUS[status].label}</b>
          {status === "needs_clarification" ? " — специалист дополняет данные и отправляет повторно." : " — запись сохраняется в истории с обоснованием."}
        </p>
      )}
    </div>
  );
}
