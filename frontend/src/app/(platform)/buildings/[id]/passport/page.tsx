"use client";

import { use } from "react";

import { Card } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import type { Building } from "@/lib/api/types";
import { formatDate, orUnknown } from "@/lib/status";

const FIELDS: [keyof Building, string][] = [
  ["internal_code", "Внутренний идентификатор"],
  ["name", "Наименование"],
  ["address", "Адрес"],
  ["year_built", "Год постройки"],
  ["floors", "Этажность"],
  ["entrances", "Подъездов"],
  ["apartments", "Квартир"],
  ["total_area_m2", "Общая площадь, м²"],
  ["structural_scheme", "Конструктивная схема"],
];

/** Digital passport (ТЗ 5.3): source and date for every significant value. */
export default function PassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useApi<Building>(`buildings/${id}/`);
  return (
    <QueryState query={query}>
      {(b) => (
        <Card title="Цифровой паспорт">
          <dl className="divide-y divide-line text-sm">
            {FIELDS.map(([key, label]) => {
              const source = b.field_sources[key as string];
              return (
                <div key={key} className="grid gap-1 py-2 md:grid-cols-[260px_1fr_auto]">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-mono tabular">{orUnknown(b[key])}</dd>
                  <dd className="text-xs text-muted">
                    {source ? `${source.source || "источник не указан"} · ${formatDate(source.recorded_at)}` : ""}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Card>
      )}
    </QueryState>
  );
}
