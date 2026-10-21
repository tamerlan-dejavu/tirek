"use client";

import { useState } from "react";

import { WorkOrderList } from "@/components/lists/WorkOrderList";
import { PageHeader } from "@/components/ui/Card";

export default function WorkOrdersPage() {
  const [overdue, setOverdue] = useState(false);
  return (
    <>
      <PageHeader
        title="План работ"
        subtitle="Инженер рекомендует, ОСИ согласовывает, исполнитель отмечает выполнение, инженер проверяет"
        actions={
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Только просроченные
          </label>
        }
      />
      <WorkOrderList extraParams={overdue ? { overdue: "true" } : undefined} />
    </>
  );
}
