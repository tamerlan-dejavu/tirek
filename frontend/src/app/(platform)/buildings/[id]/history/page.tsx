"use client";

import { use } from "react";

import { Card } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import { formatDate } from "@/lib/status";

interface HistoryRow {
  history_id: number;
  history_date: string;
  history_type: "+" | "~" | "-";
  history_user: string | null;
  changes: Record<string, { from: string; to: string }>;
}

/** History is preserved, not overwritten (ТЗ 2.3). */
export default function BuildingHistory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useApi<HistoryRow[]>(`buildings/${id}/history/`);
  return (
    <Card title="История изменений паспорта">
      <QueryState query={query} empty={(d) => d.length === 0}>
        {(rows) => (
          <ol className="space-y-3 text-sm">
            {rows.map((r) => (
              <li key={r.history_id} className="border-l-2 border-line pl-3">
                <div className="text-xs text-ink-muted">
                  <span className="font-mono">{formatDate(r.history_date)}</span> · {r.history_user ?? "система"}
                  {r.history_type === "+" && " · создание"}
                </div>
                {Object.entries(r.changes).map(([field, c]) => (
                  <div key={field}>
                    <span className="text-ink-muted">{field}:</span> <s>{c.from}</s> → <b>{c.to}</b>
                  </div>
                ))}
              </li>
            ))}
          </ol>
        )}
      </QueryState>
    </Card>
  );
}
