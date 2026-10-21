"use client";

import Link from "next/link";

import { RiskBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import type { Building, PortalSummary, RiskCategory } from "@/lib/api/types";
import { formatDate } from "@/lib/status";

export default function OsiHome() {
  const query = useApi<(Building & { summary: PortalSummary })[]>("portal/buildings/");
  return (
    <>
      <PageHeader title="Мои дома" subtitle="Только утверждённые и опубликованные сведения" />
      <QueryState query={query} empty={(d) => d.length === 0}>
        {(rows) => (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((b) => (
              <Link key={b.id} href={`/osi/buildings/${b.id}`} className="block rounded-sm border border-line bg-surface p-4 hover:border-accent">
                <div className="font-medium">{b.address}</div>
                <div className="mt-1 text-xs text-ink-muted">
                  Последнее обследование: {b.summary.last_inspection ? formatDate(b.summary.last_inspection.approved_at) : "нет опубликованных"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["R1", "R2", "R3", "R4"] as RiskCategory[]).map((r) => (
                    <span key={r} className="flex items-center gap-1 text-sm">
                      <RiskBadge category={r} /> <span className="font-mono">{b.summary.open_defects_by_risk[r]}</span>
                    </span>
                  ))}
                </div>
                {b.summary.awaiting_decision > 0 && (
                  <div className="mt-3 text-sm text-accent">Ожидают вашего решения: {b.summary.awaiting_decision}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </QueryState>
    </>
  );
}
