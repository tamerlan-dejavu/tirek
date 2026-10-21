"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { useAction } from "@/lib/api/hooks";
import type { WorkOrder } from "@/lib/api/types";

/**
 * Management decision by ОСИ (ТЗ 5.8, 5.10): agree / reject / postpone with a reason.
 * Technical approval ≠ financial or legal authorisation of the works.
 */
export function WorkOrderDecision({ workOrder }: { workOrder: WorkOrder }) {
  const [reason, setReason] = useState("");
  const transition = useAction<{ status: string; reason: string }>(
    `work-orders/${workOrder.id}/transition/`,
    [[`work-orders/?building=${workOrder.building}`]],
  );
  if (!["proposed", "postponed"].includes(workOrder.status)) return null;

  return (
    <div className="mt-2 space-y-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина (обязательна при отклонении или переносе)"
        aria-label="Причина"
        className="min-h-9 w-full rounded-sm border border-line px-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => transition.mutate({ status: "agreed", reason })}>Согласовать</Button>
        <Button variant="secondary" disabled={!reason.trim()} onClick={() => transition.mutate({ status: "postponed", reason })}>
          Отложить
        </Button>
        <Button variant="danger" disabled={!reason.trim()} onClick={() => transition.mutate({ status: "rejected", reason })}>
          Отклонить
        </Button>
      </div>
      {transition.error ? <ErrorState error={transition.error} /> : null}
    </div>
  );
}
