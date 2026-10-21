"use client";

import { use, type ReactNode } from "react";

import { BuildingTabs } from "@/components/buildings/BuildingTabs";
import { ApprovalTag } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building, Inspection } from "@/lib/api/types";
import { formatDate, orUnknown } from "@/lib/status";

const SCHEME: Record<string, string> = {
  unknown: "неизвестно",
  panel: "панельная",
  brick: "кирпичная",
  monolithic: "монолитная",
  frame: "каркасная",
  block: "блочная",
  mixed: "смешанная",
};

export default function BuildingLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: b } = useApi<Building>(`buildings/${id}/`);
  const lastApproved = useApi<Paginated<Inspection>>(`inspections/?building=${id}&status=approved&ordering=-approved_at&page_size=1`);
  const last = lastApproved.data?.results[0];

  return (
    <>
      <header className="registration mb-6 rounded-lg border border-line bg-surface">
        <div className="grid-blueprint-light flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5">
          <div className="min-w-0">
            <div className="label-tech mb-1.5">02 · Технический паспорт объекта</div>
            {b ? (
              <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em] md:text-[26px]">{b.address}</h1>
            ) : (
              <Skeleton className="h-8 w-72" />
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="font-mono text-ink">{b?.internal_code}</span>
              <span>{b?.city}</span>
              {b?.name && <span>· {b.name}</span>}
            </div>
          </div>
          {b && (
            <div className="w-full max-w-[220px]">
              <div className="flex items-baseline justify-between">
                <span className="label-tech">Заполненность паспорта</span>
                <span className="font-mono text-sm tabular">{b.completeness}%</span>
              </div>
              <div className="mt-1.5 flex gap-[3px]" aria-hidden>
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className={i < Math.round(b.completeness / 10) ? "h-1.5 flex-1 rounded-[1px] bg-teal" : "h-1.5 flex-1 rounded-[1px] bg-mist"} />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">«Неизвестно» не считается заполненным</p>
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Год постройки" mono>{orUnknown(b?.year_built)}</Field>
          <Field label="Этажность" mono>{orUnknown(b?.floors)}</Field>
          <Field label="Подъезды" mono>{orUnknown(b?.entrances)}</Field>
          <Field label="Квартиры" mono>{orUnknown(b?.apartments)}</Field>
          <Field label="Конструктивная схема">{b ? SCHEME[b.structural_scheme] ?? b.structural_scheme : "—"}</Field>
          <Field label="Последнее утв. обследование">
            {last ? (
              <span className="inline-flex items-center gap-2">
                <span className="font-mono">{formatDate(last.approved_at)}</span>
                <ApprovalTag approved>{last.number}</ApprovalTag>
              </span>
            ) : (
              <span className="text-muted">нет</span>
            )}
          </Field>
        </dl>
        <div className="px-5">
          <BuildingTabs id={id} />
        </div>
      </header>
      {children}
    </>
  );
}
