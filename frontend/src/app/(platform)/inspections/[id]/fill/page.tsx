"use client";

import { useRouter } from "next/navigation";
import { use } from "react";

import { ChecklistItemCard } from "@/components/inspections/ChecklistItemCard";
import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import type { ChecklistItem, Inspection, InspectionAnswer } from "@/lib/api/types";

interface Version {
  id: string;
  items: ChecklistItem[];
}

/** Mobile checklist for the field specialist (UC-03, ТЗ 11.7). Requires internet in MVP. */
export default function FillInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const inspection = useApi<Inspection>(`inspections/${id}/`);
  const version = useApi<Version>(
    inspection.data ? `checklist-versions/${inspection.data.template_version}/` : null,
  );
  const answers = useApi<InspectionAnswer[]>(`inspection-answers/?inspection=${id}`);

  return (
    <QueryState query={inspection}>
      {(i) => (
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-1 text-lg font-semibold">{i.number}</h1>
          <p className="mb-4 text-sm text-ink-muted">{i.building_address}</p>
          <QueryState query={version}>
            {(v) => {
              const byItem = new Map(answers.data?.map((a) => [a.item, a]));
              const groups = Map.groupBy(v.items, (it) => it.element_type ?? "Общее");
              return (
                <div className="space-y-6">
                  {[...groups].map(([group, items]) => (
                    <section key={group}>
                      <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">{group}</h2>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <ChecklistItemCard
                            key={item.id}
                            inspectionId={id}
                            buildingId={i.building}
                            item={item}
                            answer={byItem.get(item.id)}
                            onCreateDefect={(answerId) =>
                              router.push(`/defects/new?inspection=${id}&answer=${answerId}&building=${i.building}`)
                            }
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              );
            }}
          </QueryState>
        </div>
      )}
    </QueryState>
  );
}
