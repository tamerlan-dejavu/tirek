"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { RiskBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import type { Building, PortalSummary, RiskCategory } from "@/lib/api/types";
import { formatDate, orUnknown } from "@/lib/status";

export default function OsiHome() {
  const query = useApi<(Building & { summary: PortalSummary })[]>("portal/buildings/");
  return (
    <>
      <PageHeader
        code="Кабинет ОСИ"
        title="Мои дома"
        subtitle="Здесь только утверждённые инженером и опубликованные сведения. Управленческие решения по работам принимает ОСИ."
      />
      <QueryState query={query} empty={(d) => d.length === 0} emptyTitle="Нет домов с опубликованными данными">
        {(rows) => (
          <ul className="grid gap-4 lg:grid-cols-2">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/osi/buildings/${b.id}`} className="registration group block rounded-lg border border-line bg-surface transition-colors hover:border-teal/70">
                  <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-muted">{b.internal_code}</div>
                      <div className="truncate text-lg font-semibold tracking-tight group-hover:text-teal-strong">{b.address}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {orUnknown(b.year_built)} г. · {orUnknown(b.floors)} эт. · {orUnknown(b.entrances)} подъезда
                      </div>
                    </div>
                    <ArrowRight className="mt-1 size-5 text-faint group-hover:text-teal-strong" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
                    {(["R1", "R2", "R3", "R4"] as RiskCategory[]).map((r) => (
                      <div key={r}>
                        <RiskBadge category={r} size="sm" />
                        <div className="mt-1.5 font-mono text-2xl tabular">{b.summary.open_defects_by_risk[r]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line bg-canvas/60 px-5 py-3 text-[13px]">
                    <span className="text-muted">
                      Последнее обследование: <span className="font-mono text-ink">{b.summary.last_inspection ? formatDate(b.summary.last_inspection.approved_at) : "—"}</span>
                    </span>
                    {b.summary.awaiting_decision > 0 && (
                      <span className="font-medium text-teal-strong">Ждут вашего решения: {b.summary.awaiting_decision}</span>
                    )}
                    {b.summary.overdue_work_orders > 0 && <span className="text-critical-ink">Просрочено работ: {b.summary.overdue_work_orders}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}
