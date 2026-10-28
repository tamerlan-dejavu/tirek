"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import type { Defect } from "@/lib/api/types";
import { PRIORITY, WORK_TYPE } from "@/lib/status";

const input = "mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";

/** AC-12, UC-06: the engineer turns a confirmed defect into a work order (status «Предложено»). */
export function CreateWorkOrder({ defect }: { defect: Defect }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("work-orders/", {
        method: "POST",
        body: {
          building: defect.building,
          defect: defect.id,
          element: defect.element,
          kind: "reactive",
          title: f.get("title"),
          description: f.get("description"),
          work_type: f.get("work_type"),
          priority: f.get("priority"),
          recommended_date: f.get("recommended_date") || null,
        },
      });
      await qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("work-orders/") });
      setOpen(false);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  if (!open)
    return (
      <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>
        Создать мероприятие
      </Button>
    );

  const priority = ({ urgent: "urgent", high: "high", normal: "normal", low: "low" } as const)[defect.priority || "normal"];
  return (
    <form onSubmit={submit} className="border-b border-line p-4 sm:p-5">
      {error ? (
        <div className="mb-3">
          <ErrorState error={error} />
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">Мероприятие</span>
          <input name="title" required defaultValue={`Устранение: ${defect.defect_type}`} className={input} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">Описание работ</span>
          <textarea name="description" defaultValue={defect.recommendations} className="mt-1 min-h-20 w-full rounded-md border border-line bg-surface p-3 text-sm focus:border-accent focus:outline-none" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Вид работ</span>
          <select name="work_type" defaultValue="repair" className={input}>
            {Object.entries(WORK_TYPE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Приоритет</span>
          <select name="priority" defaultValue={priority} className={input}>
            {Object.entries(PRIORITY).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Рекомендуемая дата</span>
          <input name="recommended_date" type="date" className={`${input} font-mono`} />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Создание…" : "Создать (предложено)"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Отмена
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-faint">Дальше: ОСИ согласует, ПТО назначает дату и исполнителя.</p>
    </form>
  );
}
