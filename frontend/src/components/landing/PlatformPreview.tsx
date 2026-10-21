"use client";

import { DemoMark, RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { BuildingElevation } from "@/components/viz/BuildingElevation";
import type { Defect } from "@/lib/api/types";
import { DEFECT_STATUS } from "@/lib/status";

/** Real platform components rendered with clearly labelled demo data — no fabricated findings. */
const base = {
  building: "demo",
  building_address: "Демонстрационный объект",
  element: "e",
  inspection: null,
  inspection_number: "INS-ДЕМО",
  author_name: null,
  description: "",
  recommendations: "",
  closure_basis: "",
  created_at: "",
  updated_at: "",
  answer: null,
};

const DEMO: Defect[] = [
  { ...base, id: "1", number: "DEF-ДЕМО-01", element_path: ["Подъезд №2", "Кровля"], element_type: "roof", element_group: "structural", location: "над кв. 34", defect_type: "Протечка кровли", detected_on: "2026-08-12", preliminary_severity: "R2", approved_risk: "R2", status: "planned" },
  { ...base, id: "2", number: "DEF-ДЕМО-02", element_path: ["Подъезд №3", "Фасад"], element_type: "facade", element_group: "structural", location: "ось Б, 4–6 эт.", defect_type: "Раскрытие межпанельного шва", detected_on: "2026-08-12", preliminary_severity: "R3", approved_risk: "R3", status: "confirmed" },
  { ...base, id: "3", number: "DEF-ДЕМО-03", element_path: ["Система отопления"], element_type: "heating", element_group: "engineering", location: "узел ввода", defect_type: "Коррозия трубопровода", detected_on: "2026-08-12", preliminary_severity: "R2", approved_risk: "R1", status: "fixing" },
  { ...base, id: "4", number: "DEF-ДЕМО-04", element_path: ["Подъезд №1", "Подвал"], element_type: "basement", element_group: "structural", location: "приямок", defect_type: "Подтопление подвала", detected_on: "2026-08-14", preliminary_severity: "R3", approved_risk: null, status: "in_review" },
] as Defect[];

export function PlatformPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-canvas text-ink shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="label-tech">02 · Объект · схема и дефекты</span>
        </div>
        <DemoMark />
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[1.3fr_1fr]">
        <BuildingElevation floors={9} entrances={4} defects={DEMO} hrefFor={() => "#platform"} />
        <div className="hidden space-y-2 lg:block">
          {DEMO.map((d) => (
            <div key={d.id} className="rounded-md border border-line bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-muted">{d.number}</span>
                <StatusBadge {...DEFECT_STATUS[d.status]} />
              </div>
              <div className="mt-1 text-sm font-medium">{d.defect_type}</div>
              <div className="mt-2">
                {d.approved_risk ? <RiskBadge category={d.approved_risk} /> : <RiskBadge category={d.preliminary_severity} preliminary />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
