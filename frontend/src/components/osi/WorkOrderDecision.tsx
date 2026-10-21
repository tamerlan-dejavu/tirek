"use client";

import { Check, Clock, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { useAction } from "@/lib/api/hooks";
import type { WorkOrder } from "@/lib/api/types";

/**
 * Management decision by ОСИ (ТЗ 5.8, 5.10): agree / postpone / reject with a reason.
 * Technical approval ≠ financial or legal authorisation of the works.
 */
export function WorkOrderDecision({ workOrder }: { workOrder: WorkOrder }) {
  const [reason, setReason] = useState("");
  const transition = useAction<{ status: string; reason: string }>(`work-orders/${workOrder.id}/transition/`, [
    [`work-orders/?building=${workOrder.building}`],
  ]);
  if (!["proposed", "postponed"].includes(workOrder.status)) return null;

  return (
    <div className="mt-3 rounded-md border border-accent/40 bg-accent-soft/40 p-3">
      <div className="label-tech mb-2 !text-accent-strong">Требуется решение ОСИ</div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина — обязательна при переносе или отклонении"
        aria-label="Причина решения"
        className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm focus:border-accent focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" icon={<Check className="size-3.5" />} onClick={() => transition.mutate({ status: "agreed", reason })}>
          Согласовать
        </Button>
        <Button size="sm" variant="secondary" icon={<Clock className="size-3.5" />} disabled={!reason.trim()} onClick={() => transition.mutate({ status: "postponed", reason })}>
          Отложить
        </Button>
        <Button size="sm" variant="danger" icon={<X className="size-3.5" />} disabled={!reason.trim()} onClick={() => transition.mutate({ status: "rejected", reason })}>
          Отклонить
        </Button>
      </div>
      {transition.error ? (
        <div className="mt-2">
          <ErrorState error={transition.error} />
        </div>
      ) : null}
    </div>
  );
}
