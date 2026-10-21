"use client";

import { use, useState } from "react";

import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import { useAction, useApi, useMe } from "@/lib/api/hooks";
import type { Defect, RiskCategory } from "@/lib/api/types";
import { can } from "@/lib/permissions";
import { DEFECT_STATUS, formatDate } from "@/lib/status";

interface Observation { id: string; observed_on: string; description: string; trend: string }
interface Event { id: string; to_status: Defect["status"]; actor_name: string; comment: string; created_at: string }
interface Risk {
  id: string;
  category: RiskCategory;
  justification: string;
  hazard_description: string;
  engineer_name: string;
  version: number;
  created_at: string;
}

export default function DefectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  const defect = useApi<Defect>(`defects/${id}/`);
  const observations = useApi<Observation[]>(`defects/${id}/observations/`);
  const events = useApi<Event[]>(`defects/${id}/events/`);
  const risks = useApi<{ results: Risk[] }>(`risk-assessments/?defect=${id}`);
  const assess = useAction<Record<string, string>>("risk-assessments/", [[`defects/${id}/`], [`risk-assessments/?defect=${id}`]]);
  const [form, setForm] = useState({ category: "R3", hazard_description: "", justification: "", recommended_actions: "" });

  return (
    <QueryState query={defect}>
      {(d) => (
        <>
          <PageHeader
            title={`${d.number} · ${d.defect_type}`}
            subtitle={<>{d.building_address} · {d.element_path.join(" → ")} {d.location && `· ${d.location}`}</>}
            actions={
              <>
                {d.approved_risk ? <RiskBadge category={d.approved_risk} /> : <RiskBadge category={d.preliminary_severity} preliminary />}
                <StatusBadge label={DEFECT_STATUS[d.status]} />
              </>
            }
          />
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <Card title="Описание"><p className="whitespace-pre-line text-sm">{d.description}</p></Card>

              <Card title="Оценка риска (история пересмотров)">
                {risks.data?.results.length ? (
                  <ol className="space-y-3 text-sm">
                    {risks.data.results.map((r) => (
                      <li key={r.id}>
                        <div className="flex items-center gap-2"><RiskBadge category={r.category} /><span className="text-ink-muted">v{r.version} · {r.engineer_name} · {formatDate(r.created_at)}</span></div>
                        <p className="mt-1"><b>Опасность:</b> {r.hazard_description}</p>
                        <p><b>Обоснование:</b> {r.justification}</p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-ink-muted">Риск ещё не подтверждён инженером.</p>}

                {can.review(me) && d.status === "in_review" && (
                  <form
                    className="mt-4 space-y-2 border-t border-line pt-4"
                    onSubmit={(e) => { e.preventDefault(); assess.mutate({ defect: id, ...form }); }}
                  >
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="min-h-9 rounded-sm border border-line px-2 text-sm" aria-label="Категория">
                      {["R1", "R2", "R3", "R4"].map((r) => <option key={r}>{r}</option>)}
                    </select>
                    {(["hazard_description", "justification", "recommended_actions"] as const).map((k) => (
                      <textarea key={k} required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                        placeholder={{ hazard_description: "Описание опасности", justification: "Обоснование", recommended_actions: "Рекомендуемые действия" }[k]}
                        className="min-h-16 w-full rounded-sm border border-line p-2 text-sm" />
                    ))}
                    {assess.error ? <ErrorState error={assess.error} /> : null}
                    <Button type="submit">Подтвердить дефект и риск</Button>
                  </form>
                )}
              </Card>

              <Card title="Повторные наблюдения">
                <QueryState query={observations} empty={(o) => o.length === 0}>
                  {(obs) => (
                    <ol className="space-y-2 text-sm">
                      {obs.map((o) => <li key={o.id}><span className="font-mono">{formatDate(o.observed_on)}</span> · {o.description}</li>)}
                    </ol>
                  )}
                </QueryState>
              </Card>
            </div>

            <Card title="История">
              <QueryState query={events} empty={(e) => e.length === 0}>
                {(evs) => (
                  <ol className="space-y-2 text-sm">
                    {evs.map((e) => (
                      <li key={e.id} className="border-l-2 border-line pl-2">
                        <div className="text-xs text-ink-muted">{formatDate(e.created_at)} · {e.actor_name}</div>
                        {DEFECT_STATUS[e.to_status]}{e.comment && <div className="text-ink-muted">{e.comment}</div>}
                      </li>
                    ))}
                  </ol>
                )}
              </QueryState>
            </Card>
          </div>
        </>
      )}
    </QueryState>
  );
}
