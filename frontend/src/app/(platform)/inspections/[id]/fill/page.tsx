"use client";

import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useMemo, useState } from "react";

import { ChecklistItemCard } from "@/components/inspections/ChecklistItemCard";
import { Button } from "@/components/ui/Button";
import { ErrorState, QueryState } from "@/components/ui/States";
import { useAction, useApi } from "@/lib/api/hooks";
import type { ChecklistItem, Inspection, InspectionAnswer } from "@/lib/api/types";

interface Version {
  id: string;
  items: ChecklistItem[];
}

/**
 * Field checklist (UC-03, ТЗ 11.7), designed phone-first:
 * sticky progress, section jump list, large targets, server-side autosave.
 * Requires a network connection in MVP — offline sync is out of scope (ТЗ 3.2).
 */
export default function FillInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const inspection = useApi<Inspection>(`inspections/${id}/`);
  const version = useApi<Version>(inspection.data ? `checklist-versions/${inspection.data.template_version}/` : null);
  const answers = useApi<InspectionAnswer[]>(`inspection-answers/?inspection=${id}`);
  const types = useApi<{ code: string; name: string }[]>("element-types/");
  const submit = useAction(`inspections/${id}/submit/`, [[`inspections/${id}/`]]);

  const [filled, setFilled] = useState<Record<string, boolean>>({});
  const onFilledChange = useCallback((itemId: string, f: boolean) => setFilled((s) => (s[itemId] === f ? s : { ...s, [itemId]: f })), []);

  const typeName = useMemo(() => Object.fromEntries((types.data ?? []).map((t) => [t.code, t.name])), [types.data]);
  const items = useMemo(() => version.data?.items ?? [], [version.data]);
  const groups = useMemo(() => Map.groupBy(items, (it) => it.element_type ?? "general"), [items]);
  const done = items.filter((i) => filled[i.id]).length;
  const requiredLeft = items.filter((i) => i.is_required && !filled[i.id]).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <QueryState query={inspection}>
      {(insp) => (
        <div className="mx-auto max-w-2xl pb-28">
          {/* sticky progress header */}
          <div className="sticky top-14 z-10 -mx-4 mb-4 border-b border-line bg-canvas/95 px-4 pt-3 pb-3 backdrop-blur md:-mx-6 md:px-6">
            <div className="flex items-center gap-3">
              <Link href={`/inspections/${id}`} className="grid size-9 place-items-center rounded-md border border-line bg-surface" aria-label="К обследованию">
                <ArrowLeft className="size-4" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[13px] font-medium">{insp.number}</div>
                <div className="truncate text-xs text-muted">{insp.building_address}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm tabular">
                  {done}/{items.length}
                </div>
                <div className={requiredLeft ? "text-[11px] text-warning-ink" : "text-[11px] text-healthy-ink"}>
                  {requiredLeft ? `обязательных: ${requiredLeft}` : "все обязательные"}
                </div>
              </div>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Заполнение чек-листа">
              <div className="h-full bg-accent transition-[width] duration-[var(--duration-base)]" style={{ width: `${pct}%` }} />
            </div>
            <nav aria-label="Разделы чек-листа" className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
              {[...groups].map(([g, list]) => {
                const left = list.filter((i) => !filled[i.id]).length;
                return (
                  <a key={g} href={`#item-${list[0].id}`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[12.5px] transition-colors hover:border-line-strong">
                    {typeName[g] ?? "Общее"}
                    <span className={left ? "font-mono text-[11px] text-muted" : "font-mono text-[11px] text-healthy-ink"}>{left ? left : "✓"}</span>
                  </a>
                );
              })}
            </nav>
          </div>

          <QueryState query={version} skeletonRows={6}>
            {() => {
              const byItem = new Map(answers.data?.map((a) => [a.item, a]));
              let n = 0;
              return (
                <div className="space-y-6">
                  {[...groups].map(([g, list]) => (
                    <section key={g} aria-labelledby={`sec-${g}`}>
                      <h2 id={`sec-${g}`} className="label-tech mb-2 flex items-center gap-2">
                        {typeName[g] ?? "Общее"}
                        <span className="h-px flex-1 bg-line" />
                      </h2>
                      <div className="space-y-3">
                        {list.map((item) => (
                          <ChecklistItemCard
                            key={item.id}
                            index={++n}
                            inspectionId={id}
                            buildingId={insp.building}
                            item={item}
                            answer={byItem.get(item.id)}
                            onFilledChange={onFilledChange}
                            onCreateDefect={(answerId) => router.push(`/defects/new?inspection=${id}&answer=${answerId}&building=${insp.building}`)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              );
            }}
          </QueryState>

          {/* bottom action bar — thumb reach on phones */}
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:left-[248px]">
            <div className="mx-auto flex max-w-2xl items-center gap-3">
              {submit.error ? (
                <div className="min-w-0 flex-1 text-xs">
                  <ErrorState error={submit.error} />
                </div>
              ) : (
                <p className="min-w-0 flex-1 text-xs text-muted">Ответы сохраняются на сервере автоматически. Нужен интернет.</p>
              )}
              <Button size="lg" icon={<Send className="size-4" />} disabled={requiredLeft > 0 || submit.isPending} onClick={() => submit.mutate(undefined, { onSuccess: () => router.push(`/inspections/${id}`) })}>
                На проверку
              </Button>
            </div>
          </div>
        </div>
      )}
    </QueryState>
  );
}
