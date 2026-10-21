"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { BuildingElement, Defect } from "@/lib/api/types";

/** Defect created right from a failed checklist item (ТЗ 5.5). */
function NewDefectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const building = params.get("building") ?? "";
  const elements = useApi<BuildingElement[]>(building ? `building-elements/?building=${building}` : null);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api<Defect>("defects/", {
        method: "POST",
        body: {
          building,
          inspection: params.get("inspection"),
          answer: params.get("answer"),
          element: f.get("element"),
          location: f.get("location"),
          defect_type: f.get("defect_type"),
          description: f.get("description"),
          preliminary_severity: f.get("preliminary_severity"),
        },
      });
      router.back();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <PageHeader title="Новый дефект" />
      {error ? <ErrorState error={error} /> : null}
      <Card>
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Элемент здания
            <select name="element" required className="mt-1 min-h-12 w-full rounded-sm border border-line px-2">
              {elements.data?.map((el) => <option key={el.id} value={el.id}>{el.path.join(" → ")}</option>)}
            </select>
          </label>
          <Field label="Место" name="location" placeholder="напр. над кв. 36, у вентшахты" />
          <Field label="Тип дефекта" name="defect_type" required />
          <label className="block text-sm font-medium">
            Описание
            <textarea name="description" required className="mt-1 min-h-28 w-full rounded-sm border border-line p-2" />
          </label>
          <label className="block text-sm font-medium">
            Предварительная серьёзность
            <select name="preliminary_severity" className="mt-1 min-h-12 w-full rounded-sm border border-line px-2">
              <option value="">не указана</option>
              {["R1", "R2", "R3", "R4"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted">
              Это не утверждённая оценка — категорию риска подтверждает проверяющий инженер.
            </span>
          </label>
        </div>
      </Card>
      <Button type="submit" size="lg" className="w-full">Сохранить дефект</Button>
    </form>
  );
}

export default function NewDefectPage() {
  return (
    <Suspense>
      <NewDefectForm />
    </Suspense>
  );
}
